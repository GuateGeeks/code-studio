import test from 'node:test';
import assert from 'node:assert/strict';
import {loadWorkspace, saveWorkspace, workspaceToIR, toScratchProject} from '../../spikes/block-program.mjs';
import {validateProgram} from '../../spikes/program-contract.mjs';
import {createGGBindings} from '../../spikes/gg-bindings.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';

function program() {
  const workspace = loadWorkspace(editableExample);
  try { return workspaceToIR(workspace); } finally { workspace.dispose(); }
}
test('GG-BLOCK-005: editable example preserves IDs and compiles under the wire contract', () => {
  const workspace = loadWorkspace(editableExample);
  let restored;
  try {
    restored = loadWorkspace(saveWorkspace(workspace));
    const ir = workspaceToIR(workspace);
    assert.deepEqual(validateProgram(workspaceToIR(restored)), ir);
    const translated = toScratchProject(ir);
    assert.equal(translated.sourceMap['editable-read'], 'editable-read');
    assert.equal(translated.project.targets[1].blocks['editable-event-move'].inputs.STEPS[1], 'editable-read');
  } finally { workspace.dispose(); restored?.dispose(); }
});

test('GG-BLOCK-005: hostile or excessive IR is rejected before backend construction', () => {
  const cases = [
    ir => { ir.extensions = ['https://example.invalid/code.js']; },
    ir => { ir.scripts[0].body[0].kind = 'eval'; },
    ir => { ir.scripts[0].body[1].count = 1001; },
    ir => { ir.scripts[0].body[1].body[0].steps = Infinity; },
    ir => { ir.scripts[0].body[0].sourceBlockId = 'editable-start'; },
    ir => { ir.variables[0].id = '__proto__'; },
    ir => { ir.scripts[0].body[0].variableId = 'missing'; },
    ir => { ir.scripts = Array(17).fill(ir.scripts[0]); },
    ir => { ir.scripts[0].body = Array.from({length: 301}, (_, index) => ({kind: 'move', steps: 1, sourceBlockId: `step-${index}`})); },
    ir => { let body = []; for (let i = 0; i < 10; i++) body = [{kind: 'repeat', count: 1, body, sourceBlockId: `nested-${i}`}]; ir.scripts[0].body = body; },
    ir => { ir.scripts[0].body[0].name = 'x'.repeat(65536); }
  ];
  for (const corrupt of cases) { const ir = program(); corrupt(ir); assert.throws(() => toScratchProject(ir), /Invalid GG program/); }
});

test('GG-SCRATCH-011: GG uses native movement direction and returns detached DTOs', async () => {
  const {project} = toScratchProject(program());
  const vm = await createScratchSession(project);
  try {
    const gg = createGGBindings(() => vm);
    vm.runtime.getSpriteTargetByName('hero').setDirection(0);
    const moved = gg('sprite.move', ['hero', 10]);
    assert.ok(Math.abs(moved.x) < 0.00001);
    assert.equal(moved.y, 10);
    moved.y = 999;
    assert.equal(gg('sprite.get', ['hero']).y, 10);
    assert.throws(() => gg('__proto__', []), /Unsupported/);
    assert.throws(() => gg('variables.set', ['gg-score', NaN]), /Invalid/);
    assert.throws(() => gg('events.emit', ['unregistered']), /Unknown/);
  } finally { vm.quit(); }
});
