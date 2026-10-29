import test from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../fixtures/corpus.blocks.mjs';
import {loadWorkspace, saveWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {generateApi3ProgramSource} from '../../src/generated-program-source.mjs';
import {workspaceFromIR, captureNumericInputIdentity} from '../../src/editor/workspace-from-ir.mjs';
import {parseCanonicalCodeView} from '../../src/targets/text/code-views-feasibility.mjs';

test('CV-FEAS-001: canonical JavaScript parses independently back to the exact IR of all nine 2D corpus programs', () => {
  assert.equal(Object.keys(corpus).length, 9);
  for (const [name, fixture] of Object.entries(corpus)) {
    const workspace = loadWorkspace(fixture);
    try {
      const ir = workspaceToIR(workspace), generated = generateApi3ProgramSource(ir, 'javascript');
      assert.deepEqual(parseCanonicalCodeView(generated.text, generated), ir, name);
    } finally { workspace.dispose(); }
  }
});
test('CV-FEAS-002: the canonical probe rejects unsupported syntax with a line and never evaluates source', () => {
  const source = 'globalThis.__codeViewExecuted = true;\n';
  assert.throws(() => parseCanonicalCodeView(source, {sourceMap: [['root'], []]}),
    error => error.lineNumber === 1 && /subconjunto/.test(error.message));
  assert.equal(globalThis.__codeViewExecuted, undefined);
  assert.throws(() => parseCanonicalCodeView('onStart(() => {', {sourceMap: [[]]}),
    error => error.lineNumber === 1);
});

const blockIDs = workspace => workspace.getAllBlocks(false).map(block => ({id: block.id, type: block.type, shadow: block.isShadow()}))
  .sort((a, b) => a.id.localeCompare(b.id));

test('CV-FEAS-003: the complete corpus roundtrip preserves every block ID, including numeric shadows', () => {
  for (const [name, fixture] of Object.entries(corpus)) {
    const original = loadWorkspace(fixture);
    let restored;
    try {
      const ir = workspaceToIR(original), generated = generateApi3ProgramSource(ir, 'javascript');
      const candidate = parseCanonicalCodeView(generated.text, generated);
      restored = loadWorkspace(workspaceFromIR(candidate, {numericInputIdentity: captureNumericInputIdentity(original)}));
      assert.deepEqual(blockIDs(restored), blockIDs(original), name);
    } finally { restored?.dispose(); original.dispose(); }
  }
});

test('CV-FEAS-004: changing each of the 38 numeric values uses the new value and retains every ID', () => {
  let mutations = 0;
  for (const [name, fixture] of Object.entries(corpus)) {
    const original = loadWorkspace(fixture);
    try {
      const generated = generateApi3ProgramSource(workspaceToIR(original), 'javascript');
      const numericInputIdentity = captureNumericInputIdentity(original);
      for (const entry of numericInputIdentity) {
        const edited = loadWorkspace(saveWorkspace(original));
        let restored;
        try {
          const number = edited.getBlockById(entry.id);
          number.setFieldValue(Number(number.getFieldValue('NUM')) + 1, 'NUM');
          const editedIR = workspaceToIR(edited);
          const text = generateApi3ProgramSource(editedIR, 'javascript').text;
          const candidate = parseCanonicalCodeView(text, generated);
          restored = loadWorkspace(workspaceFromIR(candidate, {numericInputIdentity}));
          assert.deepEqual(workspaceToIR(restored), editedIR, name + ':' + entry.id);
          assert.deepEqual(blockIDs(restored), blockIDs(original), name + ':' + entry.id);
          assert.equal(restored.getBlockById(entry.id).getFieldValue('NUM'), number.getFieldValue('NUM'));
          mutations++;
        } finally { restored?.dispose(); edited.dispose(); }
      }
    } finally { original.dispose(); }
  }
  assert.equal(mutations, 38);
});

test('CV-FEAS-005: numeric identity validates metadata before loading and does not mutate its inputs', () => {
  const original = loadWorkspace(corpus.events);
  try {
    const ir = workspaceToIR(original), numericInputIdentity = captureNumericInputIdentity(original);
    const before = structuredClone({ir, numericInputIdentity}), first = numericInputIdentity[0];
    const invalid = [
      null, {}, [null], [{...first, hidden: true}], [{...first, shadow: 'true'}],
      [{...first, id: ''}], [{...first, id: 'x'.repeat(129)}],
      [{...first, parentId: 'missing'}], [{...first, id: ir.scripts[0].sourceBlockId}],
      [first, {...first, id: 'different-id'}],
      [first, {...numericInputIdentity[1], id: first.id}],
      [{...first, inputName: 'DO'}], [{...first, parentId: 'start', inputName: 'DO'}],
      Array(601).fill(first)
    ];
    for (const metadata of invalid)
      assert.throws(() => workspaceFromIR(ir, {numericInputIdentity: metadata}), /identidad numérica/);
    workspaceFromIR(ir, {numericInputIdentity});
    assert.deepEqual({ir, numericInputIdentity}, before);
  } finally { original.dispose(); }
});

test('CV-FEAS-006: ordinary numeric blocks keep their kind; allocations avoid IDs reserved for later inputs', () => {
  const original = loadWorkspace(corpus.events);
  let restored, partial;
  try {
    original.getBlockById('move-key-n').setShadow(false);
    const ir = workspaceToIR(original), numericInputIdentity = captureNumericInputIdentity(original).reverse();
    restored = loadWorkspace(workspaceFromIR(ir, {numericInputIdentity}));
    assert.deepEqual(blockIDs(restored), blockIDs(original));
    assert.deepEqual(captureNumericInputIdentity(restored), captureNumericInputIdentity(original));
    partial = loadWorkspace(workspaceFromIR(ir, {numericInputIdentity: [
      {parentId: 'move-key', inputName: 'STEPS', id: 'gg-number-0', shadow: false}
    ]}));
    assert.equal(partial.getBlockById('move-key').getInputTargetBlock('STEPS').id, 'gg-number-0');
    const ids = partial.getAllBlocks(false).map(block => block.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(workspaceToIR(partial), ir);
  } finally { partial?.dispose(); restored?.dispose(); original.dispose(); }
});
