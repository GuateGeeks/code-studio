import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadWorkspace, saveWorkspace, workspaceToIR, toScratchProject} from '../../spikes/block-program.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/repeat-move.blocks.json', import.meta.url), 'utf8'));
function translate() {
  const workspace = loadWorkspace(fixture);
  try { return toScratchProject(workspaceToIR(workspace)); }
  finally { workspace.dispose(); }
}

test('GG-BLOCK-001: Blockly round-trip preserves IR and source IDs', () => {
  const workspace = loadWorkspace(fixture);
  let restored;
  try {
    const ir = workspaceToIR(workspace);
    assert.deepEqual(ir.scripts[0].body, [{kind: 'repeat', count: 3, sourceBlockId: 'repeat', body: [{kind: 'move', steps: 5, sourceBlockId: 'move'}]}]);
    restored = loadWorkspace(JSON.parse(JSON.stringify(saveWorkspace(workspace))));
    assert.deepEqual(workspaceToIR(restored), ir);
    assert.deepEqual(toScratchProject(ir).sourceMap, {start: 'start', repeat: 'repeat', move: 'move'});
  } finally { workspace.dispose(); restored?.dispose(); }
});

test('GG-BLOCK-002: unsupported blocks fail with type and source ID', () => {
  const workspace = loadWorkspace({blocks: {languageVersion: 0, blocks: [{type: 'text', id: 'unsupported', fields: {TEXT: 'hello'}}]}});
  try { assert.throws(() => workspaceToIR(workspace), /text.*unsupported/); }
  finally { workspace.dispose(); }
});

test('GG-SCRATCH-001: local Xcratch VM runs translated Blockly without GUI', async () => {
  const {project} = translate();
  const authoringSnapshot = structuredClone(project);
  const vm = await createScratchSession(project);
  try {
    vm.greenFlag();
    for (let i = 0; i < 12; i++) vm.runtime._step();
    assert.equal(vm.runtime.getSpriteTargetByName('hero').x, 15);
    assert.deepEqual(project, authoringSnapshot);
    const serialized = JSON.parse(vm.toJSON());
    const sprite = serialized.targets.find(target => !target.isStage);
    assert.equal(sprite.blocks.repeat.opcode, 'control_repeat');
    assert.equal(sprite.x, 15);
    const reopened = await createScratchSession(serialized);
    try { assert.equal(reopened.runtime.getSpriteTargetByName('hero').x, 15); }
    finally { reopened.quit(); }
  } finally { vm.quit(); }
});

test('GG-SCRATCH-002: stopAll prevents subsequent movement in real VM', async () => {
  const {project} = translate();
  const blocks = project.targets[1].blocks;
  blocks.repeat.opcode = 'control_forever';
  delete blocks.repeat.inputs.TIMES;
  const vm = await createScratchSession(project);
  try {
    vm.greenFlag();
    vm.runtime._step();
    assert.ok(vm.runtime.getSpriteTargetByName('hero').x > 0);
    vm.stopAll();
    const stoppedX = vm.runtime.getSpriteTargetByName('hero').x;
    for (let i = 0; i < 8; i++) vm.runtime._step();
    assert.equal(vm.runtime.getSpriteTargetByName('hero').x, stoppedX);
    assert.equal(vm.runtime.threads.length, 0);
  } finally { vm.quit(); }
});

test('GG-SCRATCH-003: external extension is rejected before VM project loading', async () => {
  const {project} = translate();
  project.targets[0].extensionURLs = [['unreviewed', 'https://example.invalid/extension.js']];
  await assert.rejects(createScratchSession(project), /External extension URLs/);
});
