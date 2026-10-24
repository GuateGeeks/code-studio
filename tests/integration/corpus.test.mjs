import test from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../fixtures/corpus.blocks.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR, toScratchProject} from '../../spikes/block-program.mjs';

for (const [name, fixture] of Object.entries(corpus)) test(`GG-BLOCK-003: ${name} round-trip preserves all source IDs and message linkage`, () => {
  const workspace = loadWorkspace(fixture);
  let reopened;
  try {
    const ir = workspaceToIR(workspace);
    reopened = loadWorkspace(JSON.parse(JSON.stringify(saveWorkspace(workspace))));
    assert.deepEqual(workspaceToIR(reopened), ir);
    const translated = toScratchProject(ir);
    const collect = nodes => nodes.flatMap(node => [node.sourceBlockId, ...collect(node.body ?? []), ...collect(node.elseBody ?? []), ...collect([node.condition, node.left, node.right, node.value, node.steps].filter(value => value && typeof value === 'object'))]);
    for (const id of collect(ir.scripts)) assert.equal(translated.sourceMap[id], id);
    if (name === 'messages') {
      assert.deepEqual(translated.project.targets[0].broadcasts, {'gg-message:go': 'go'});
      assert.equal(translated.project.targets[1].blocks.receive.fields.BROADCAST_OPTION[1], translated.project.targets[1].blocks.send.inputs.BROADCAST_INPUT[1][2]);
    }
    if (name === 'clones') assert.equal(translated.sourceMap['create:menu'], 'create');
    if (name === 'variables') {
      assert.deepEqual(ir.variables, [{id: 'gg-score', name: 'score', initialValue: 0}]);
      assert.deepEqual(translated.project.targets[1].variables, {'gg-score': ['score', 0]});
      assert.equal(translated.project.targets[1].blocks['move-score-read'].fields.VARIABLE[1], 'gg-score');
      assert.equal(translated.project.targets[1].blocks['branch-loop'].opcode, 'control_if_else');
    }
  } finally { workspace.dispose(); reopened?.dispose(); }
});

test('GG-BLOCK-004: unsupported comparison fails with the expression source ID', () => {
  const fixture = structuredClone(corpus.variables);
  fixture.blocks.blocks[1].inputs.DO.block.next.block.inputs.IF0.block.fields.OP = 'LTE';
  const workspace = loadWorkspace(fixture);
  try { assert.throws(() => workspaceToIR(workspace), /Unsupported comparison LTE at branch-key-compare/); }
  finally { workspace.dispose(); }
});

test('GG-BLOCK-004: nonlocal sound fails before runtime loading', () => {
  const fixture = structuredClone(corpus.audio);
  fixture.blocks.blocks[0].inputs.DO.block.fields.SOUND = 'https://example.invalid/untrusted.wav';
  const workspace = loadWorkspace(fixture);
  try { assert.throws(() => workspaceToIR(workspace), /Unsupported local sound .* at play-wait/); }
  finally { workspace.dispose(); }
});

test('GG-BLOCK-003: negative wait is rejected with its source ID', () => {
  const fixture = structuredClone(corpus.events);
  fixture.blocks.blocks[0].inputs.DO.block.inputs.SECONDS.shadow.fields.NUM = -1;
  const workspace = loadWorkspace(fixture);
  try { assert.throws(() => workspaceToIR(workspace), /Invalid wait at wait-start/); }
  finally { workspace.dispose(); }
});
