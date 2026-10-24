import test from 'node:test';
import assert from 'node:assert/strict';
import {createTextDocument, validateTextDocuments, textDocumentLimits, textDocumentRuntimes} from '../../src/text-documents.mjs';

test('GG-TEXT-001: independent documents fix their actual engine/version and preserve incomplete source verbatim', () => {
  const js = createTextDocument({language: 'javascript', name: 'Prueba JS', source: 'if (\n'});
  const python = createTextDocument({language: 'python', source: 'async def unfinished(\n'});
  assert.match(js.id, /^text-[0-9a-f-]{36}$/);
  assert.notEqual(js.id, python.id);
  assert.deepEqual(js.runtime, {engine: 'quickjs', version: '0.32.0'});
  assert.deepEqual(python.runtime, {engine: 'pyodide', version: '314.0.7'});
  assert.equal(python.name, 'Programa Python');
  assert.equal(js.source, 'if (\n');
  assert.equal(python.source, 'async def unfinished(\n');
  assert.equal(createTextDocument({language: 'javascript'}).source, '');
  assert.equal(createTextDocument({language: 'javascript'}).name, 'Programa JavaScript');
});

test('GG-TEXT-001: validation returns detached documents/runtime and selection without changing input', () => {
  const document = createTextDocument({language: 'javascript', name: '  Conserva nombre  ', source: '\u0000\r\n\t"😀'});
  const documents = [document];
  const original = structuredClone(documents);
  const validated = validateTextDocuments(documents, document.id);
  assert.deepEqual(validated, {textDocuments: original, selectedTextDocumentId: document.id});
  validated.textDocuments[0].source = 'other';
  validated.textDocuments[0].runtime.version = 'other';
  validated.textDocuments.push(createTextDocument({language: 'python'}));
  assert.deepEqual(documents, original);
  assert.deepEqual(textDocumentRuntimes.javascript, {engine: 'quickjs', version: '0.32.0'});
  assert.deepEqual(validateTextDocuments([], null), {textDocuments: [], selectedTextDocumentId: null});
});

test('GG-TEXT-001: UTF-8 source and document/name count boundaries are enforced', () => {
  const maxSource = '😀'.repeat(16384);
  assert.equal(new TextEncoder().encode(maxSource).length, textDocumentLimits.sourceBytes);
  const documents = Array.from({length: 8}, () => createTextDocument({language: 'python', name: 'n'.repeat(80), source: maxSource}));
  assert.equal(validateTextDocuments(documents, documents[7].id).textDocuments.length, 8);
  assert.throws(() => validateTextDocuments([...documents, createTextDocument({language: 'javascript'})], null), /lista de documentos/);
  assert.throws(() => createTextDocument({language: 'python', source: maxSource + 'a'}), /fuente textual/);
  assert.throws(() => createTextDocument({language: 'python', name: 'n'.repeat(81)}), /nombre/);
});

test('GG-TEXT-001: malformed records, runtime substitutions, unknown fields and stale selections reject atomically', () => {
  const original = createTextDocument({language: 'javascript', source: 'let x = 3;'});
  const mutations = [
    document => { document.id = 'hero'; }, document => { document.id = 'text-00000000-0000-0000-0000-000000000000'; },
    document => { document.name = ''; }, document => { document.name = ' '; },
    document => { document.name = 'name\n'; }, document => { document.name = 'name\u0085'; },
    document => { document.language = 'typescript'; }, document => { document.language = '__proto__'; },
    document => { document.source = {}; }, document => { delete document.source; },
    document => { document.runtime.engine = 'eval'; }, document => { document.runtime.version = 'latest'; },
    document => { document.runtime = {engine: 'pyodide', version: '314.0.7'}; },
    document => { document.runtime.wasm = 'https://untrusted.invalid/runtime.wasm'; },
    document => { document.compiled = 'binary.js'; }, document => { document.logs = ['runtime']; }
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(original); mutate(invalid);
    const input = [original, invalid];
    const before = structuredClone(input);
    assert.throws(() => validateTextDocuments(input, original.id), /GGPROJ textos/);
    assert.deepEqual(input, before);
  }
  assert.throws(() => validateTextDocuments([original, structuredClone(original)], null), /duplicado/);
  for (const selected of [undefined, 'text-missing', {}, 1]) assert.throws(() => validateTextDocuments([original], selected), /selección/);
  for (const value of [undefined, null, {}, Array(1), [null]]) assert.throws(() => validateTextDocuments(value, null), /GGPROJ textos/);
  const array = [original]; array.log = [];
  assert.throws(() => validateTextDocuments(array, null), /lista de documentos/);
  assert.throws(() => validateTextDocuments([Object.create(original)], null), /objeto inválido/);
  assert.throws(() => createTextDocument({language: 'ruby'}), /lenguaje/);
  assert.throws(() => createTextDocument({language: 'javascript', name: null}), /nombre/);
});
