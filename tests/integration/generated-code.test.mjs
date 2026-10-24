import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateCode, generatedCodeLimits} from '../../src/generated-code.mjs';
import {loadWorkspace, workspaceToIR} from '../../spikes/block-program.mjs';
import {corpus, editableExample} from '../fixtures/corpus.blocks.mjs';

function irOf(state) {
  const workspace = loadWorkspace(state);
  try { return workspaceToIR(workspace); } finally { workspace.dispose(); }
}
function sourceIds(value, ids = []) {
  if (!value || typeof value !== 'object') return ids;
  if (value.sourceBlockId) ids.push(value.sourceBlockId);
  for (const child of Object.values(value)) if (typeof child === 'object') sourceIds(child, ids);
  return ids;
}

test('GG-CODE-001: complete Blockly corpus generates deterministic derived listing with every IR source ID', () => {
  const repeat = JSON.parse(readFileSync(new URL('../fixtures/repeat-move.blocks.json', import.meta.url)));
  for (const [name, state] of Object.entries({repeat, editableExample, ...corpus})) {
    const ir = irOf(state);
    const original = structuredClone(ir);
    const listing = generateCode(ir);
    assert.deepEqual(generateCode(ir), listing, name);
    assert.deepEqual(ir, original, name);
    assert.match(listing.text, /IR 2D · no ejecutable · solo lectura/);
    assert.equal(listing.text.split('\n').length, listing.sourceMap.length, name);
    assert.deepEqual(new Set(listing.sourceMap.flat()), new Set(sourceIds(ir)), name);
    assert.ok(new TextEncoder().encode(listing.text).length <= generatedCodeLimits.bytes);
    assert.doesNotMatch(listing.text, /GG\.|eval\(|new Function/);
  }
});

test('GG-CODE-001: concrete sequence, variable scopes, event semantics and comparisons remain readable', () => {
  const source = generateCode(irOf(editableExample));
  assert.match(source.text, /variable local "score" \["gg-score"\] = 0/);
  assert.match(source.text, /al iniciar\n  fijar "score" \["gg-score"\] a 1\n  repetir 3 veces\n    mover 4 pasos\n  fin repetir/);
  assert.match(source.text, /al recibir mensaje "boost"/);
  const readLine = source.text.split('\n').findIndex(line => line.includes('mover "score"'));
  assert.deepEqual(source.sourceMap[readLine], ['editable-event-move', 'editable-read']);
  const global = generateCode(irOf(corpus.globalVariables));
  assert.match(global.text, /variable global "globalScore"/);
  assert.match(global.text, /variable local "localScore"/);
  const branches = generateCode(irOf(corpus.variables));
  for (const operator of ['<', '=', '>']) assert.ok(branches.text.includes(` ${operator} `));
  const compareLine = branches.sourceMap.find(ids => ids.includes('branch-loop-compare'));
  assert.deepEqual(compareLine, ['branch-loop', 'branch-loop-compare', 'branch-loop-read']);
  assert.match(generateCode(irOf(corpus.audio)).text, /tocar sonido "tone" y esperar/);
  assert.match(generateCode(irOf(corpus.audioStop)).text, /tocar sonido "tone" sin esperar/);
});

test('GG-CODE-001: names and delimiters stay quoted on a single source line', () => {
  const name = 'score"\n<svg onload=alert(1)>\u2028';
  const ir = {version: 0, variables: [{id: 'v"\n', name, initialValue: 2}], scripts: [
    {event: 'message', message: 'go"\nfin evento\u2029', sourceBlockId: 'hat\n', body: [
      {kind: 'setVariable', variableId: 'v"\n', name, value: 3, sourceBlockId: 'set'}
    ]}
  ]};
  const listing = generateCode(ir);
  assert.equal(listing.text.split('\n').length, 7);
  assert.ok(listing.text.includes('score\\"\\n<svg onload=alert(1)>\\u2028'));
  assert.ok(listing.text.includes('go\\"\\nfin evento\\u2029'));
  assert.deepEqual(listing.sourceMap.flat(), ['hat\n', 'set', 'hat\n']);
});

test('GG-CODE-001: same validator rejects unknown operations, invalid expressions and oversized IR before generating', () => {
  const ir = irOf(editableExample);
  for (const mutate of [
    value => { value.version = 1; },
    value => { value.scripts[0].body[0].kind = 'eval'; },
    value => { value.scripts[0].body[1].count = 1001; },
    value => { value.scripts[0].body[1].body[0].steps = NaN; },
    value => { value.scripts[1].sourceBlockId = value.scripts[0].sourceBlockId; },
    value => { value.extensions = ['https://example.invalid']; }
  ]) {
    const invalid = structuredClone(ir); mutate(invalid);
    assert.throws(() => generateCode(invalid), /Invalid GG program/);
  }
  const cycle = {version: 0, scripts: []}; cycle.scripts.push(cycle);
  assert.throws(() => generateCode(cycle), /Invalid GG program/);
});

test('GG-CODE-001: listing UTF-8 budget is enforced independently after a valid IR', () => {
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 'hat', body:
    Array.from({length: 170}, (_, index) => ({kind: 'broadcastWait', message: 'x' + '\u2028'.repeat(63), sourceBlockId: `n${index}`}))
  }]};
  assert.ok(new TextEncoder().encode(JSON.stringify(ir)).length < 65536);
  assert.throws(() => generateCode(ir), /Generated IR listing exceeds/);
});

test('GG-CODE: numeric limits retain the originating statement ID', () => {
  const ir = {version: 0, scripts: [{event: 'start', sourceBlockId: 'start', body: [{kind: 'move', sourceBlockId: 'too-far', steps: 999}]}]};
  assert.throws(() => generateCode(ir), error => error.sourceBlockId === 'too-far');
});
