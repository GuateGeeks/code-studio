import test from 'node:test';
import assert from 'node:assert/strict';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {corpus} from '../fixtures/corpus.blocks.mjs';

function roundtrip(ir, options) {
  const state = workspaceFromIR(ir, options), workspace = loadWorkspace(state, options);
  try { return {state, ir: workspaceToIR(workspace, options), saved: saveWorkspace(workspace)}; }
  finally { workspace.dispose(); }
}
const normalize = ir => {
  const value = structuredClone(ir);
  if (value.variables?.length) value.variables = value.variables.map(item => ({...item, scope: item.scope ?? 'local'})).sort((a, b) => a.id.localeCompare(b.id));
  else delete value.variables;
  return value;
};
test('GG-SB3-004: real Blockly roundtrips the existing editable corpus with exact operations and source IDs', () => {
  for (const [name, fixture] of Object.entries(corpus)) {
    const original = loadWorkspace(fixture);
    try {
      const ir = workspaceToIR(original), before = structuredClone(ir), restored = roundtrip(ir);
      assert.deepEqual(normalize(restored.ir), normalize(ir), name);
      assert.deepEqual(ir, before, 'does not mutate caller ' + name);
      assert.deepEqual(workspaceFromIR(ir), restored.state, 'deterministic serialization ' + name);
    } finally { original.dispose(); }
  }
});

test('GG-SB3-004: empty branches/bodies and numeric shadow IDs survive real serialization without collisions', () => {
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 'gg-number-0', body: [
    {kind: 'repeat', count: 0, body: [], sourceBlockId: 'empty-repeat'},
    {kind: 'if', sourceBlockId: 'empty-if', condition: {kind: 'compare', operator: 'EQ', left: 1, right: 2, sourceBlockId: 'compare'}, body: [], elseBody: []}
  ]}, {event: 'clone', sourceBlockId: 'empty-clone', body: []}]};
  const result = roundtrip(ir);
  assert.deepEqual(result.ir, ir);
  const workspace = loadWorkspace(result.saved);
  try {
    const ids = workspace.getAllBlocks(false).map(block => block.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(workspace.getBlockById('empty-if').getInput('ELSE') !== null, true);
  } finally { workspace.dispose(); }
});

test('GG-SB3-004: installed config-bound score contributions preserve reporters, global scope and nonzero defaults', () => {
  const capabilities = createCapabilities(['gg.score'], {config: {'gg.score': {variableId: 'points', label: 'Puntos', initialValue: 7}}});
  const ir = {version: 0, variables: [{id: 'points', name: 'Puntos', scope: 'global', initialValue: 7}], scripts: [{event: 'start', sourceBlockId: 'start', body: [
    {kind: 'changeVariable', variableId: 'points', name: 'Puntos', value: 2, sourceBlockId: 'change'},
    {kind: 'move', steps: {kind: 'variable', variableId: 'points', name: 'Puntos', sourceBlockId: 'read'}, sourceBlockId: 'move'}
  ]}]};
  const result = roundtrip(ir, {capabilities});
  assert.deepEqual(result.ir, ir);
  assert.equal(result.state.variables, undefined, 'installed declarations supply their real initial values');
  const workspace = loadWorkspace(result.state, {capabilities});
  try {
    assert.equal(workspace.getBlockById('change').type, 'gg_score_change');
    assert.equal(workspace.getBlockById('read').type, 'gg_score_value');
  } finally { workspace.dispose(); }
});

const imageId = 'a'.repeat(64), soundId = 'b'.repeat(64);
const resourceView = {version: 1, assets: [
  {id: imageId, type: 'Image', format: 'png', bytes: 80, width: 2, height: 2},
  {id: soundId, type: 'Sound', format: 'wav', bytes: 60}
], costumes: [{id: 'custom-costume', ownerId: 'hero', name: 'Disfraz propio', assetId: imageId, centerX: 1, centerY: 1, bitmapResolution: 1}],
sounds: [{id: 'custom-sound', ownerId: 'hero', name: 'Sonido propio', assetId: soundId}]};
const resourcesIR = {version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: [
  {kind: 'setCostume', costume: 'custom-costume', sourceBlockId: 'costume'},
  {kind: 'playSound', sound: 'custom-sound', wait: false, sourceBlockId: 'sound'},
  {kind: 'playSound', sound: 'custom-sound', wait: true, sourceBlockId: 'sound-wait'},
  {kind: 'stopSounds', sourceBlockId: 'stop'}
]}]};
test('GG-ASSET-003/GG-SB3-004: resource IDs bind to installed workspace-local menus and inactive/foreign owners are rejected', () => {
  const capabilities = createCapabilities(['gg.assets']);
  const result = roundtrip(resourcesIR, {capabilities, resourceView});
  assert.deepEqual(result.ir, resourcesIR);
  const workspace = loadWorkspace(result.saved, {capabilities, resourceView});
  try {
    const field = workspace.getBlockById('costume').getField('COSTUME');
    assert.equal(workspace.getBlockById('costume').type, 'gg_assets_set_costume');
    assert.equal(field.getValue(), 'custom-costume');
    assert.deepEqual(field.getOptions(false), [['Disfraz propio', 'custom-costume']]);
    assert.equal(workspace.getBlockById('sound-wait').type, 'gg_assets_play_sound_wait');
  } finally { workspace.dispose(); }
  assert.throws(() => workspaceFromIR(resourcesIR, {resourceView}), /no declarado/);
  const foreign = structuredClone(resourceView); foreign.costumes[0].ownerId = 'other';
  assert.throws(() => workspaceFromIR(resourcesIR, {capabilities, resourceView: foreign}), error => error.sourceBlockId === 'costume');
});

test('GG-SB3-004: source IDs and root layout are preserved; invalid layout and reordered execution are explicit errors', () => {
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 'first', body: []}, {event: 'key', key: 'a', sourceBlockId: 'second', body: []}]};
  const layout = [{sourceBlockId: 'first', x: 75, y: 30}, {sourceBlockId: 'second', x: 170, y: 300}];
  const result = roundtrip(ir, {layout});
  assert.deepEqual(result.state.blocks.blocks.map(({id, x, y}) => ({sourceBlockId: id, x, y})), layout);
  assert.deepEqual(result.ir, ir);
  assert.deepEqual(workspaceFromIR(ir, {layout: new Map(layout.map(({sourceBlockId, ...point}) => [sourceBlockId, point]))}), result.state);
  for (const invalid of [[...layout, layout[0]], [{sourceBlockId: 'missing', x: 0, y: 0}], {first: {x: Infinity, y: 0}}, {first: {x: 0, y: 0, hidden: true}}]) assert.throws(() => workspaceFromIR(ir, {layout: invalid}), /layout/);
  assert.throws(() => workspaceFromIR(ir, {layout: {first: {x: 0, y: 300}, second: {x: 0, y: 0}}}), /orden de scripts/);
});

test('GG-SB3-004: unsupported IR and unrepresentable initialization/scope/name coercions fail without rewriting authoring', () => {
  const ir = {version: 0, variables: [{id: 'v', name: 'Variable', initialValue: 5}], scripts: []};
  const before = structuredClone(ir);
  assert.throws(() => workspaceFromIR(ir), /roundtrip exacto/); assert.deepEqual(ir, before);
  assert.throws(() => workspaceFromIR({...ir, variables: [{id: 'v', name: 'Variable', initialValue: 0, scope: 'global'}]}), /roundtrip exacto/);
  const message = {version: 0, scripts: [{event: 'message', sourceBlockId: 'message', message: ' padded ', body: []}]};
  assert.throws(() => workspaceFromIR(message), /roundtrip exacto/);
  assert.throws(() => workspaceFromIR({version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: [{kind: 'teleport', sourceBlockId: 'unknown'}]}]}), error => error.sourceBlockId === 'unknown');
});
