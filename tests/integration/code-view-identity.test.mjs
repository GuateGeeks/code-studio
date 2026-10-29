import test from 'node:test';
import assert from 'node:assert/strict';
import {codeViewMutationCases, allNodes} from '../fixtures/code-view-mutations.mjs';
import {parseCanonicalCodeView} from '../../src/targets/text/code-views-feasibility.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
import {workspaceFromIR, captureNumericInputIdentity} from '../../src/editor/workspace-from-ir.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';

const stripIDs = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'sourceBlockId' ? undefined : item));
const kinds = new Map();
for (const fixture of codeViewMutationCases()) {
  if (!kinds.has(fixture.kind)) kinds.set(fixture.kind, []);
  kinds.get(fixture.kind).push(fixture);
}
for (const [kind, cases] of kinds) test('CV-DIFF: seeded one-line property ' + kind + ' (' + cases.length + ' cases)', () => {
  for (const fixture of cases) {
    const {previous, expected, source, metadata, sidecar, excluded, name} = fixture;
    const before = JSON.stringify(fixture), parsed = parseCanonicalCodeView(source, metadata);
    const result = reconcileCodeViewIdentity(previous, parsed, sidecar);
    assert.deepEqual(stripIDs(result.ir), stripIDs(expected), name);
    const actualNodes = allNodes(result.ir), oracleNodes = allNodes(expected);
    const previousIDs = new Set(allNodes(previous).map(node => node.sourceBlockId));
    for (let i = 0; i < actualNodes.length; i++) if (previousIDs.has(oracleNodes[i].sourceBlockId) && !excluded.includes(oracleNodes[i].sourceBlockId))
      assert.equal(actualNodes[i].sourceBlockId, oracleNodes[i].sourceBlockId, name + ': unaffected ' + oracleNodes[i].sourceBlockId);
    const missingGlobalDeclaration = (expected.variables ?? []).some(variable => variable.scope === 'global' &&
      !oracleNodes.some(node => node.kind === 'setVariable' && node.variableId === variable.id));
    if (missingGlobalDeclaration) {
      assert.throws(() => workspaceFromIR(result.ir, result), /roundtrip exacto/, name);
      assert.equal(JSON.stringify(fixture), before);
      continue;
    }
    const restored = loadWorkspace(workspaceFromIR(result.ir, result));
    try {
      assert.deepEqual(stripIDs(workspaceToIR(restored)), stripIDs(expected), name);
      const actual = allNodes(result.ir), expectedNodes = allNodes(expected);
      const oldIDs = new Set(allNodes(previous).map(node => node.sourceBlockId));
      for (let i = 0; i < actual.length; i++) if (oldIDs.has(expectedNodes[i].sourceBlockId) && !excluded.includes(expectedNodes[i].sourceBlockId))
        assert.equal(actual[i].sourceBlockId, expectedNodes[i].sourceBlockId, name + ': unaffected ' + expectedNodes[i].sourceBlockId);
      const numeric = captureNumericInputIdentity(restored);
      for (const entry of result.numericInputIdentity) assert.deepEqual(numeric.find(n => n.id === entry.id), entry, name);
      for (const point of result.layout) {
        const block = restored.getBlockById(point.sourceBlockId);
        assert.deepEqual({...block.getRelativeToSurfaceXY()}, {x: point.x, y: point.y}, name);
      }
      assert.equal(JSON.stringify(fixture), before, 'immutable inputs: ' + name);
    } finally { restored.dispose(); }
  }
});
test('CV-DIFF: sidecars cannot borrow identity from another node or contain malformed positions', () => {
  const item = codeViewMutationCases()[0], candidate = parseCanonicalCodeView(item.source, item.metadata);
  for (const invalid of [null, {}, [null], [{...item.sidecar.numericInputIdentity[0], id: item.previous.scripts[0].sourceBlockId}]])
    assert.throws(() => reconcileCodeViewIdentity(item.previous, candidate, {numericInputIdentity: invalid}), /numérica/);
  assert.throws(() => reconcileCodeViewIdentity(item.previous, candidate, {layout: [{sourceBlockId: 'missing', x: 0, y: 0}]}), /eventos/);
});

test('CV-DIFF: equal neighbours keep the unchanged ID when just one value changes', () => {
  for (const index of [0, 1, 2]) {
    const previous = {version: 0, scripts: [{event: 'start', sourceBlockId: 'hat', body:
      ['a', 'b', 'c'].map(sourceBlockId => ({kind: 'move', steps: 5, sourceBlockId}))}]};
    const candidate = structuredClone(previous);
    candidate.scripts[0].body[index].steps = 9;
    for (const [i, node] of candidate.scripts[0].body.entries()) node.sourceBlockId = 'temporary-' + i;
    const result = reconcileCodeViewIdentity(previous, candidate);
    assert.deepEqual(result.ir.scripts[0].body.map(n => n.sourceBlockId), ['a', 'b', 'c']);
  }
});
test('CV-DIFF: new nodes and numeric inputs never recycle deleted or reserved identity', () => {
  const previous = {version: 0, scripts: [{event: 'start', sourceBlockId: 'gg-code-view-0', body:
    [{kind: 'move', steps: 1, sourceBlockId: 'old-move'}]}]};
  const numericInputIdentity = [{parentId: 'old-move', inputName: 'STEPS', id: 'gg-code-view-1', shadow: false}];
  const candidate = {version: 0, scripts: [{event: 'start', sourceBlockId: 'temp', body:
    [{kind: 'wait', seconds: 1, sourceBlockId: 'temporary'}]}]};
  const result = reconcileCodeViewIdentity(previous, candidate, {numericInputIdentity});
  const reserved = new Set(['old-move', 'gg-code-view-0', 'gg-code-view-1']);
  assert.equal(result.ir.scripts[0].sourceBlockId, 'gg-code-view-0');
  assert.ok(!reserved.has(result.ir.scripts[0].body[0].sourceBlockId));
  assert.ok(!reserved.has(result.numericInputIdentity[0].id));
});
