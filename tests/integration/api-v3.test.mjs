import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {corpus} from '../fixtures/corpus.blocks.mjs';
import {loadWorkspace, workspaceToIR} from '../../src/editor/block-program.mjs';
import {generateProgramSource, generateApi3ProgramSource, api3Identifier} from '../../src/generated-program-source.mjs';
import {compileApi3JavaScript} from '../../src/targets/text/api-v3.mjs';
import {createQuickJSEngine} from '../../src/targets/text/quickjs-engine.mjs';
import {createPythonEngine} from '../../src/targets/text/python-engine.mjs';
import {validateTextProgramRPC, validateTextInvocation} from '../../src/contracts/text-program.mjs';
import {validateLanguageRPC} from '../../src/contracts/language-runtime.mjs';
import {createTextDocument, validateTextDocuments} from '../../src/text-documents.mjs';

const require = createRequire(import.meta.url);
const wasmLocation = require.resolve('@jitl/quickjs-wasmfile-release-sync/wasm');
const programs = Object.fromEntries(Object.entries(corpus).map(([id, blockly]) => { const workspace = loadWorkspace(blockly, {}); try { return [id, workspaceToIR(workspace, {})]; } finally { workspace.dispose?.(); } }));
const documentId = 'text-12345678-1234-4234-8234-123456789abc';
const runtimes = {javascript: {engine: 'quickjs', version: '0.32.0'}, python: {engine: 'pyodide', version: '314.0.7'}};

// Runs a document to program.start, then invokes every handler once and
// returns the ordered RPC trace without invocation IDs.
async function trace(language, source, runtime = {}) {
  const calls = [];
  let program = null, ready;
  const started = new Promise(resolveStart => { ready = resolveStart; });
  const options = {onDiagnostic: () => {}, onProgramReady: () => ready(), rpc: async (method, args) => {
    const call = method.startsWith('program.') ? validateTextProgramRPC(method, args) : validateLanguageRPC(method, args);
    calls.push({method: call.method, args: call.args.slice(method === 'program.start' ? 0 : 1)});
    if (method === 'program.start') { program = call.args[0]; return {started: true}; }
    if (method === 'program.compare') return true;
    if (method === 'program.deleteClone') return false;
    return {accepted: true};
  }};
  const engine = language === 'javascript' ? await createQuickJSEngine({...options, wasmLocation}) : await createPythonEngine({...options, indexURL: resolve('node_modules/pyodide') + '/'});
  try {
    await engine.prepare({id: documentId, name: 'API v3', language, source, runtime: {...runtimes[language], ...runtime}});
    const execution = engine.execute(); execution.catch(() => {});
    await started;
    for (const handler of program.handlers) await engine.invoke(validateTextInvocation({invocationId: 'invoke-' + handler.id, handlerId: handler.id, targetId: 'hero', revision: 1}));
    return {program, calls};
  } finally { engine.dispose(); }
}

test('API3-001: derived code for every corpus program is readable: no GG, ctx, await or generated names', () => {
  for (const [id, ir] of Object.entries(programs)) for (const language of ['javascript', 'python']) {
    const generated = generateApi3ProgramSource(ir, language);
    for (const forbidden of [/\bGG\b/, /\bctx\b/, /\bawait\b/, /gg_/]) assert.doesNotMatch(generated.text, forbidden, `${id} ${language}`);
    assert.equal(generated.requirements.apiVersion, 3);
    assert.equal(generated.sourceMap.length, generated.text.split('\n').length, `${id} ${language} source map lines`);
    for (const model of ir.variables ?? []) assert.equal(generated.variableIds[Object.keys(generated.variableIds).find(name => generated.variableIds[name] === model.id)], model.id);
  }
  assert.equal(api3Identifier('Mi puntuación'), 'Mi_puntuacion');
  assert.equal(api3Identifier('for'), 'for_');
  assert.equal(api3Identifier('2 vidas'), 'v_2_vidas');
  const taken = new Set(['puntos']);
  assert.equal(api3Identifier('puntos', taken), 'puntos_2');
});

test('API3-002: translated JavaScript produces exactly the API1 program and call sequence for the whole corpus', {timeout: 60000}, async () => {
  for (const [id, ir] of Object.entries(programs)) {
    const api1 = await trace('javascript', generateProgramSource(ir, 'javascript').text);
    const generated = generateApi3ProgramSource(ir, 'javascript');
    const api3 = await trace('javascript', generated.text, {api: 'api3', variableIds: generated.variableIds});
    assert.deepEqual(api3.program, api1.program, `${id} program`);
    assert.deepEqual(api3.calls, api1.calls, `${id} calls`);
  }
});

test('API3-003: translated Python produces exactly the API1 program and call sequence for the whole corpus', {timeout: 240000}, async () => {
  for (const [id, ir] of Object.entries(programs)) {
    const api1 = await trace('python', generateProgramSource(ir, 'python').text);
    const generated = generateApi3ProgramSource(ir, 'python');
    const api3 = await trace('python', generated.text, {api: 'api3', variableIds: generated.variableIds});
    assert.deepEqual(api3.program, api1.program, `${id} program`);
    assert.deepEqual(api3.calls, api1.calls, `${id} calls`);
  }
});

test('API3-004: the JavaScript translator keeps line numbers and explains unsupported code at its line', () => {
  const source = 'let puntos = 0;\nonStart(() => {\n  hero.move(puntos);\n  puntos += 2;\n});\n';
  const compiled = compileApi3JavaScript(source, {variableIds: {puntos: 'gg-score'}});
  const lines = compiled.source.split('\n');
  assert.match(lines[2], /await ctx\.move\(GG\.ref\("gg-score"\)\)/);
  assert.match(lines[3], /await ctx\.changeVariable\("gg-score", 2\)/);
  assert.deepEqual(compiled.variables, [{id: 'gg-score', name: 'puntos', scope: 'local', initialValue: 0}]);
  for (const [code, message, line] of [
    ['hero.move(1);', /dentro de un evento/, 1],
    ['onStart(() => {\n  function ayuda() { hero.move(1); }\n});', /funciones propias/, 2],
    ['let puntos = 0;\nonStart(() => {\n  console.log(puntos);\n});', /Usa puntos directamente/, 3],
    ['onStart(() => {\n  hero.fly(1);\n});', /hero no tiene la acción fly/, 2],
    ['onKey(() => {});', /recibe un valor y una función/, 1],
    ['onStart(() => {\n  wait();\n});', /wait recibe 1 valor/, 2],
    ['let hero = 0;', /reservado/, 1]
  ]) assert.throws(() => compileApi3JavaScript(code), error => message.test(error.message) && error.lineNumber === line, code);
  assert.equal(compileApi3JavaScript("await GG.sprite.move('hero', 9);").translated, false, 'direct GG code passes unchanged');
});

test('API3-005: copies declare api3 and keep variable IDs in metadata only', () => {
  const copy = createTextDocument({language: 'javascript', name: 'Copia', source: 'let score = 0;\n', api: 'api3', variableIds: {score: 'gg-score'}});
  assert.deepEqual(copy.runtime, {engine: 'quickjs', version: '0.32.0', api: 'api3', variableIds: {score: 'gg-score'}});
  assert.deepEqual(validateTextDocuments([copy], copy.id).textDocuments[0], copy);
  assert.throws(() => validateTextDocuments([{...copy, runtime: {engine: 'quickjs', version: '0.32.0', variableIds: {score: 'x'}}}], null), /requiere una API/);
  assert.throws(() => validateTextDocuments([{...copy, runtime: {...copy.runtime, variableIds: {'no válido': 'x'}}}], null), /variableIds/);
});

test('API3-006: the Python translator explains unsupported code at its line and keeps direct GG code unchanged', {timeout: 120000}, async () => {
  const engine = await createPythonEngine({rpc: async () => ({accepted: true}), onDiagnostic: () => {}, indexURL: resolve('node_modules/pyodide') + '/'});
  try {
    const prepare = source => engine.prepare({id: documentId, name: 'API v3', language: 'python', source, runtime: {...runtimes.python, api: 'api3'}});
    for (const [code, message] of [
      ['hero.move(1)\n', /dentro de un evento/],
      ['@on_start\ndef inicio():\n    def ayuda():\n        hero.move(1)\n', /funciones propias/],
      ['puntos = 0\n@on_start\ndef inicio():\n    print(puntos)\n', /Usa puntos directamente/],
      ['@on_key\ndef tecla():\n    pass\n', /recibe un texto/],
      ['hero = 0\n', /reservado/]
    ]) await assert.rejects(prepare(code), error => message.test(error.message), code);
    assert.deepEqual(await prepare('x = "texto"\nprint(x)\n'), {prepared: true});
  } finally { engine.dispose(); }
});

test('API3-007: the gg.score lesson program keeps its pack variable ID and behaves like API1 in JavaScript and Python copies', {timeout: 240000}, async () => {
  const {lessonDefinitions} = await import('../../src/assets/lessons/catalog.mjs');
  const {createCapabilities} = await import('../../src/contracts/packs.mjs');
  const lesson = lessonDefinitions.find(item => item.id === 'score');
  const capabilities = createCapabilities(lesson.starter.packIds);
  const workspace = loadWorkspace(lesson.starter.blockly, {capabilities});
  let ir; try { ir = workspaceToIR(workspace, {capabilities}); } finally { workspace.dispose?.(); }
  for (const language of ['javascript', 'python']) {
    const generated = generateApi3ProgramSource(ir, language);
    const identifier = Object.keys(generated.variableIds).find(name => generated.variableIds[name] === 'gg-pack-score');
    assert.ok(identifier, `${language}: pack variable named in metadata`);
    assert.doesNotMatch(generated.text, /undefined/, language);
    const api1 = await trace(language, generateProgramSource(ir, language).text);
    const api3 = await trace(language, generated.text, {api: 'api3', variableIds: generated.variableIds});
    assert.deepEqual(api3.program, api1.program, `${language} program`);
    assert.deepEqual(api3.calls, api1.calls, `${language} calls`);
  }
});
