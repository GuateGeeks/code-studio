import test from 'node:test';
import assert from 'node:assert/strict';
import {captureCodeViewSnapshot, generateCodeViewSource, prepareCodeViewCandidate} from '../../src/editor/code-view-conversion.mjs';
import {parseJavaScriptCodeView} from '../../src/targets/text/code-view-parser.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {corpus, editableExample} from '../fixtures/corpus.blocks.mjs';

const parse = (snapshot, text) => {
  const generated = generateCodeViewSource(snapshot, 'javascript');
  return parseJavaScriptCodeView(text ?? generated.text, {capabilities: snapshot.capabilities,
    resourceView: snapshot.resourceView, variableIds: generated.variableIds, variableNames: generated.variableNames});
};
test('CV-CONVERT-001: all corpus snapshots prepare exact IR, numeric identities and root positions without mutating authoring', () => {
  for (const [name, state] of Object.entries(corpus)) {
    const snapshot = captureCodeViewSnapshot(state), before = JSON.stringify(snapshot);
    const candidate = prepareCodeViewCandidate(snapshot, parse(snapshot));
    assert.deepEqual(candidate.ir, snapshot.ir, name);
    assert.equal(JSON.stringify(snapshot), before, name);
    const restored = loadWorkspace(candidate.state);
    try {
      for (const point of snapshot.layout) assert.deepEqual({...restored.getBlockById(point.sourceBlockId).getRelativeToSurfaceXY()}, {x: point.x, y: point.y}, name);
      assert.deepEqual(restored.getAllBlocks(false).map(b => b.id).sort(),
        loadIDs(snapshot.state), name);
    } finally { restored.dispose(); }
  }
});
function loadIDs(state) {
  const w=loadWorkspace(state);try{return w.getAllBlocks(false).map(b=>b.id).sort();}finally{w.dispose();}
}
test('CV-CONVERT-002: block comments enter text and line/trailing comments return to stable block IDs', () => {
  const workspace = loadWorkspace(editableExample);
  workspace.getBlockById('editable-start').setCommentText('Evento del alumno');
  workspace.getBlockById('editable-move').setCommentText('Mover en cada vuelta\nSegunda línea');
  workspace.getBlockById('editable-move-n').setCommentText('Comentario del número');
  const state = saveWorkspace(workspace); workspace.dispose();
  const snapshot = captureCodeViewSnapshot(state), source = generateCodeViewSource(snapshot, 'javascript');
  assert.match(source.text, /\/\/ Evento del alumno/);
  assert.match(source.text, /\/\/ Mover en cada vuelta\n\s*\/\/ Segunda línea/);
  const edited = source.text.replace('hero.move(4);', 'hero.move(25); // cambio en texto');
  const candidate = prepareCodeViewCandidate(snapshot, parse(snapshot, edited));
  const result = loadWorkspace(candidate.state);
  try {
    assert.equal(result.getBlockById('editable-move-n').getFieldValue('NUM'), 25);
    assert.equal(result.getBlockById('editable-start').getCommentText(), 'Evento del alumno');
    assert.equal(result.getBlockById('editable-move').getCommentText(), 'Mover en cada vuelta\nSegunda línea\ncambio en texto');
    assert.equal(result.getBlockById('editable-move-n').getCommentText(), 'Comentario del número');
    assert.deepEqual({...result.getBlockById('editable-boost').getRelativeToSurfaceXY()}, {x: 25, y: 260});
  } finally { result.dispose(); }
});
test('CV-CONVERT-003: a forged IR, location, comment or resource never changes the prior snapshot', () => {
  const snapshot = captureCodeViewSnapshot(editableExample), parsed = parse(snapshot), before = JSON.stringify(snapshot);
  const invalid = [
    {...parsed, ir: {...parsed.ir, version: 9}},
    {...parsed, sourceLocations: []},
    {...parsed, sourceLocations: [parsed.sourceLocations[0], parsed.sourceLocations[0]]},
    {...parsed, comments: [{text: '<script>globalThis.x=1</script>', line: -1, column: 1, endLine: 1, endColumn: 10}]},
    {...parsed, sourceLocations: parsed.sourceLocations.map((item, i) => i ? item : {...item, sourceBlockId: 'forged'})}
  ];
  for (const input of invalid) { assert.throws(() => prepareCodeViewCandidate(snapshot, input)); assert.equal(JSON.stringify(snapshot), before); }
});
test('CV-CONVERT-004: pack-supplied nonzero globals retain their installed defaults, labels and reporters', () => {
  const capabilities = createCapabilities(['gg.score'], {config: {'gg.score': {variableId: 'points', label: 'Puntos de clase', initialValue: 7}}});
  const ir = {version: 0, variables: [{id: 'points', name: 'Puntos de clase', scope: 'global', initialValue: 7}], scripts: [{
    event: 'start', sourceBlockId: 'start', body: [
      {kind: 'changeVariable', variableId: 'points', name: 'Puntos de clase', value: 2, sourceBlockId: 'change'},
      {kind: 'move', steps: {kind: 'variable', variableId: 'points', name: 'Puntos de clase', sourceBlockId: 'read'}, sourceBlockId: 'move'}
    ]}]};
  const snapshot = captureCodeViewSnapshot(workspaceFromIR(ir, {capabilities}), {capabilities});
  const candidate = prepareCodeViewCandidate(snapshot, parse(snapshot));
  assert.deepEqual(candidate.ir, ir);
  const generated = generateCodeViewSource(snapshot, 'javascript');
  assert.throws(() => parse(snapshot, generated.text.replace('shared(7)', 'shared(8)')), /configuración/);
});
test('CV-CONVERT-005: custom resources are validated in both correspondence and detached reconstruction', () => {
  const resourceView = {version: 1, assets: [
    {id: 'a'.repeat(64), type: 'Image', format: 'png', bytes: 80, width: 2, height: 2},
    {id: 'b'.repeat(64), type: 'Sound', format: 'wav', bytes: 60}],
    costumes: [{id: 'custom-costume', ownerId: 'hero', name: 'Disfraz propio', assetId: 'a'.repeat(64), centerX: 1, centerY: 1, bitmapResolution: 1}],
    sounds: [{id: 'custom-sound', ownerId: 'hero', name: 'Sonido propio', assetId: 'b'.repeat(64)}]};
  const capabilities = createCapabilities(['gg.assets']);
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: [
    {kind: 'setCostume', costume: 'custom-costume', sourceBlockId: 'costume'},
    {kind: 'playSound', sound: 'custom-sound', wait: true, sourceBlockId: 'sound'}]}]};
  const snapshot = captureCodeViewSnapshot(workspaceFromIR(ir, {capabilities, resourceView}), {capabilities, resourceView});
  assert.deepEqual(prepareCodeViewCandidate(snapshot, parse(snapshot)).ir, ir);
  assert.throws(() => parse(snapshot, generateCodeViewSource(snapshot,'javascript').text.replace('custom-sound','unknown')), /bloques/);
});

test('CV-CONVERT-006: adding a root interpolates its position without moving existing events or changing script order', () => {
  const state=structuredClone(editableExample);state.blocks.blocks[0].x=900;state.blocks.blocks[0].y=500;
  state.blocks.blocks[1].x=1100;state.blocks.blocks[1].y=900;
  const snapshot=captureCodeViewSnapshot(state),source=generateCodeViewSource(snapshot,'javascript');
  const text=source.text.replace('onMessage(', 'onStart(()=>{hero.move(1)});\n\nonMessage(');
  const candidate=prepareCodeViewCandidate(snapshot,parse(snapshot,text));
  assert.equal(candidate.ir.scripts.length,3);
  const workspace=loadWorkspace(candidate.state);
  try{
    assert.deepEqual({...workspace.getBlockById('editable-start').getRelativeToSurfaceXY()},{x:900,y:500});
    assert.deepEqual({...workspace.getBlockById('editable-boost').getRelativeToSurfaceXY()},{x:1100,y:900});
    assert.deepEqual(workspaceToIR(workspace).scripts.map(s=>s.sourceBlockId),candidate.ir.scripts.map(s=>s.sourceBlockId));
  }finally{workspace.dispose();}
});

test('CV-CONVERT-007: reordering events preserves their positions and IDs while retaining the text registration order in sidecar data', () => {
  const snapshot=captureCodeViewSnapshot(editableExample);
  const reversed={...snapshot,ir:structuredClone(snapshot.ir)};reversed.ir.scripts.reverse();
  const text=generateCodeViewSource(reversed,'javascript').text;
  const candidate=prepareCodeViewCandidate(snapshot,parse(snapshot,text));
  assert.deepEqual(candidate.scriptOrder,reversed.ir.scripts.map(s=>s.sourceBlockId));
  const workspace=loadWorkspace(candidate.state);
  try{
    for(const point of snapshot.layout)assert.deepEqual({...workspace.getBlockById(point.sourceBlockId).getRelativeToSurfaceXY()},{x:point.x,y:point.y});
    assert.deepEqual(workspaceToIR(workspace,{scriptOrder:candidate.scriptOrder}),candidate.ir);
    assert.deepEqual(workspaceToIR(workspace).scripts.map(s=>s.sourceBlockId),snapshot.ir.scripts.map(s=>s.sourceBlockId),'legacy workspaces still follow visual order');
    for(const order of [[],['missing'],[candidate.scriptOrder[0],candidate.scriptOrder[0]]])
      assert.throws(()=>workspaceToIR(workspace,{scriptOrder:order}),/orden de eventos/);
    const recaptured=captureCodeViewSnapshot(candidate.state,{scriptOrder:candidate.scriptOrder});
    assert.deepEqual(recaptured.ir,candidate.ir);
  }finally{workspace.dispose();}
});
