import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {validateScene2DObjects} from '../../src/contracts/scene2d-objects.mjs';
import {scene2DObjectIdentifiers, scene2DTextOwner, scene2DIdentifierBase, isScene2DTextIdentifier, validateScene2DTextOwner} from '../../src/contracts/scene2d-identifiers.mjs';
import {api3LanguageKeywords} from '../../src/contracts/api3-names.mjs';
import {generateApi3ProgramSource, generateApi3SceneSource} from '../../src/generated-program-source.mjs';
import {parseJavaScriptCodeView, pythonCodeViewVocabulary} from '../../src/targets/text/code-view-parser.mjs';
import {pythonCodeViewReader} from '../../src/targets/text/code-view-python.mjs';
import {reconcileCodeViewIdentity} from '../../src/code-view-identity.mjs';
import {compileApi3JavaScript} from '../../src/targets/text/api-v3.mjs';
import {createQuickJSEngine} from '../../src/targets/text/quickjs-engine.mjs';
import {createPythonEngine} from '../../src/targets/text/python-engine.mjs';
import {validateTextProgram, validateTextProgramRPC, validateTextInvocation} from '../../src/contracts/text-program.mjs';
import {composeScene2DProgram} from '../../src/contracts/program-contract.mjs';
import {validateLanguageRPC} from '../../src/contracts/language-runtime.mjs';
import {validateCodeViewRequest} from '../../src/contracts/code-view-conversion.mjs';
import {createTextProgram} from '../../src/adapters/scratch/text-program.mjs';
import {toScratchSceneProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createGGBindings} from '../../src/adapters/scratch/gg-bindings.mjs';
import {createScratchSession} from '../../spikes/scratch-adapter.mjs';
import {createCodeViewsState, validateCodeViews, emptyCodeView} from '../../src/code-views-state.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';
import {codeViewMutationCases} from '../fixtures/code-view-mutations.mjs';
import {createProject, parseProject} from '../../src/project-format.mjs';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {captureCodeViewSnapshot, generateCodeViewSource, prepareCodeViewCandidate} from '../../src/editor/code-view-conversion.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';

// scene2d-multi-sprite tarea 2.2 (E2, 30/10/2026): API v3 per object. Each
// sprite has a textual identifier derived from its name (R3); the synced views
// show the selected object's program with events at the top level and actions
// on its identifier, rejecting actions written for another object (R2); the
// translators map the identifier to the sprite ID through runtime.targetIds.
const require = createRequire(import.meta.url);
const wasmLocation = require.resolve('@jitl/quickjs-wasmfile-release-sync/wasm');
const hero = {id: 'hero', name: 'hero', x: 0, y: 0, direction: 90, size: 100, visible: true, costume: 'hero'};
const cesta = {...hero, id: 'cesta', name: 'Cesta', x: 120};
const config = {stage: {backdrop: 'stage'}, sprites: [hero, cesta]};
const capabilities = (() => { const value = createCapabilities(['gg.sprites']); value.config['gg.sprites'] = structuredClone(config); return value; })();
const strip = ir => JSON.parse(JSON.stringify(ir, (key, value) => key === 'sourceBlockId' ? undefined : value));
const heroOwner = scene2DTextOwner(config, 'hero'), cestaOwner = scene2DTextOwner(config, 'cesta'), stageOwner = scene2DTextOwner(config, 'stage');
const n = (kind, id, extra = {}) => ({kind, sourceBlockId: id, ...extra});
// An E1 program of one sprite: sprite actions, its click and clone events, globals and locals.
const spriteProgram = {version: 0, variables: [{id: 'v-pasos', name: 'pasos', initialValue: 0}, {id: 'v-turnos', name: 'turnos', initialValue: 0, scope: 'global'}], scripts: [
  {event: 'start', sourceBlockId: 's1', body: [n('setVariable', 'a1', {variableId: 'v-turnos', name: 'turnos', value: 0}), n('say', 'a2', {message: 'Hola'}), n('glide', 'a3', {seconds: 1, x: 10, y: -20}),
    n('changeVariable', 'a4', {variableId: 'v-pasos', name: 'pasos', value: 2}), n('move', 'a5', {steps: {kind: 'variable', variableId: 'v-pasos', name: 'pasos', sourceBlockId: 'a5v'}})]},
  {event: 'click', sourceBlockId: 's2', body: [n('createClone', 'b1'), n('broadcastWait', 'b2', {message: 'saluda'})]},
  {event: 'clone', sourceBlockId: 's3', body: [n('turnRight', 'c1', {degrees: 15}), n('deleteClone', 'c2')]},
  {event: 'message', message: 'saluda', sourceBlockId: 's4', body: [n('setCostume', 'd1', {costume: 'hero'}), n('sayFor', 'd2', {message: 'Listo', seconds: 1})]}]};
const stageProgram = {version: 0, variables: [{id: 'v-turnos', name: 'turnos', initialValue: 0, scope: 'global'}], scripts: [
  {event: 'start', sourceBlockId: 't1', body: [n('setVariable', 'e1', {variableId: 'v-turnos', name: 'turnos', value: 0}), n('wait', 'e2', {seconds: 1})]},
  {event: 'click', sourceBlockId: 't2', body: [n('broadcastWait', 'f1', {message: 'saluda'}), n('stopAll', 'f2')]}]};
const jsOptions = (owner, generated) => ({capabilities, owner, variableIds: generated.variableIds, variableNames: Object.fromEntries(Object.keys(generated.variableIds).map(name => [name, name]))});
function runPython(sources, vocabulary) {
  const script = pythonCodeViewReader + '\nimport sys\npayload=json.loads(sys.stdin.read())\nprint(json.dumps([json.loads(_cv_python_safe(s,json.dumps(payload["vocabulary"]))) for s in payload["sources"]]))\n';
  const output = spawnSync('python3', ['-c', script], {input: JSON.stringify({sources, vocabulary}), encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
  assert.equal(output.status, 0, output.stderr);
  return JSON.parse(output.stdout);
}

test('MS-026: every object has a stable JS/Python identifier derived from its name; the sprite ID never changes', () => {
  assert.deepEqual(scene2DObjectIdentifiers({stage: {backdrop: 'stage'}, sprites: [hero]}).objects.map(object => object.identifier), ['stage', 'hero']);
  const names = ['Cesta', 'Gato Rojo', 'Ñandú', '2 vidas', 'wait', 'on_start', 'stage', '猫', 'Cesta!', 'for'];
  const many = {stage: {backdrop: 'stage'}, sprites: names.slice(0, 8).map((name, index) => ({...hero, id: 'o' + index, name}))};
  const ids = scene2DObjectIdentifiers(many);
  assert.deepEqual(ids.objects.map(object => object.identifier), ['stage', 'cesta', 'gato_rojo', 'nandu', 'objeto_2_vidas', 'wait_', 'on_start_', 'stage_', 'objeto']);
  assert.equal(scene2DObjectIdentifiers({stage: {backdrop: 'stage'}, sprites: [{...hero, id: 'a', name: 'Cesta'}, {...hero, id: 'b', name: 'cesta?'}]}).identifierOf.b, 'cesta_2');
  for (const name of [...names, 'hero', 'Mi gato 🐱', '__init__', 'class', 'print', 'onStart', 'broadcastAndWait', 'i']) {
    const identifier = scene2DIdentifierBase(name);
    assert.match(identifier, /^[A-Za-z_][A-Za-z0-9_]*$/, name);
    assert.ok(!api3LanguageKeywords.has(identifier) && isScene2DTextIdentifier(identifier), name + ' → ' + identifier);
  }
  assert.equal(scene2DIdentifierBase('hero'), 'hero');
  // Deterministic, and renaming changes only the identifier: targetIds still name the same sprite ID.
  assert.deepEqual(scene2DObjectIdentifiers(config), scene2DObjectIdentifiers(structuredClone(config)));
  const renamed = scene2DObjectIdentifiers({...config, sprites: [hero, {...cesta, name: 'Canasta'}]});
  assert.deepEqual([renamed.targetIds.canasta, renamed.identifierOf.cesta], ['cesta', 'canasta']);
  assert.deepEqual(scene2DObjectIdentifiers(config).targetIds, {stage: 'stage', hero: 'hero', cesta: 'cesta'});
  assert.deepEqual(cestaOwner, {identifier: 'cesta', kind: 'sprite', targetId: 'cesta', others: {stage: 'Escenario', hero: 'hero'}});
  assert.deepEqual(validateScene2DTextOwner(structuredClone(stageOwner)), stageOwner);
  for (const bad of [{...cestaOwner, identifier: 'for'}, {...cestaOwner, kind: 'stage'}, {...cestaOwner, extra: 1}, {...stageOwner, identifier: 'escenario'}, {...cestaOwner, others: {cesta: 'Cesta'}}])
    assert.throws(() => validateScene2DTextOwner(bad), /Objeto de la vista/);
  // Names feed the identifiers: one spelling (NFC) and no invisible or control characters (deferred from Task 2).
  for (const name of ['Cesta', 'Ñandú', 'Gato Rojo']) assert.doesNotThrow(() => validateScene2DObjects({...config, sprites: [hero, {...cesta, name}]}), name);
  for (const name of ['Ñandu', 'Ces​ta', 'Cesta‮', 'Ces\u0085ta', 'Ces ta', '⁦Cesta', 'Ces\ud800ta', 'Ces­ta'])
    assert.throws(() => validateScene2DObjects({...config, sprites: [hero, {...cesta, name}]}), /nombre inválido/, JSON.stringify(name));
});

test('MS-027: the readable generator writes the selected object\'s program on its identifier; hero stays byte-identical', () => {
  for (const language of ['javascript', 'python']) {
    const plain = generateApi3ProgramSource(spriteProgram, language);
    assert.deepEqual(generateApi3ProgramSource(spriteProgram, language, {owner: heroOwner}), plain, 'hero owner = default output');
    const generated = generateApi3ProgramSource(spriteProgram, language, {owner: cestaOwner});
    assert.equal(generated.text, plain.text.replaceAll('hero.', 'cesta.'), language);
    assert.doesNotMatch(generated.text, /\bhero\./);
    // Events stay at the top level; only the sprite's own events take its identifier.
    assert.match(generated.text, language === 'javascript' ? /^onStart\(\(\) => \{$/m : /^@on_start$/m);
    assert.match(generated.text, language === 'javascript' ? /^cesta\.onClick\(\(\) => \{$/m : /^@cesta\.on_click$/m);
    const stage = generateApi3ProgramSource(stageProgram, language, {owner: stageOwner});
    assert.match(stage.text, language === 'javascript' ? /^stage\.onClick\(\(\) => \{$/m : /^@stage\.on_click$/m);
    // The stage cannot move, change costume or clone itself.
    for (const node of [n('move', 'x1', {steps: 1}), n('createClone', 'x2'), n('setCostume', 'x3', {costume: 'hero'})])
      assert.throws(() => generateApi3ProgramSource({version: 0, scripts: [{event: 'start', sourceBlockId: 'x0', body: [node]}]}, language, {owner: stageOwner}),
        error => /escenario/i.test(error.message) && error.sourceBlockId === node.sourceBlockId);
    assert.throws(() => generateApi3ProgramSource({version: 0, scripts: [{event: 'clone', sourceBlockId: 'x0', body: []}]}, language, {owner: stageOwner}), /escenario/i);
  }
  // Variables never take an object's identifier.
  const named = {version: 0, variables: [{id: 'v1', name: 'Cesta', initialValue: 0}, {id: 'v2', name: 'stage', initialValue: 0}], scripts: []};
  assert.deepEqual(Object.keys(generateApi3ProgramSource(named, 'javascript', {owner: heroOwner}).variableIds), ['Cesta', 'stage_2']);
  assert.deepEqual(Object.keys(generateApi3ProgramSource({...named, variables: [{id: 'v1', name: 'cesta', initialValue: 0}]}, 'javascript', {owner: heroOwner}).variableIds), ['cesta_2']);
  // The generator stays closed to IR v1: no generic option forwarding opens it.
  assert.throws(() => generateApi3ProgramSource({version: 1, sprites: ['hero'], scripts: []}, 'javascript', {objects: true}), /unsupported version/);
  assert.throws(() => generateApi3ProgramSource(spriteProgram, 'javascript', {owner: {...cestaOwner, identifier: 'for'}}), /Objeto de la vista/);
});

test('MS-028: per-object synced views round-trip in JavaScript and Python with the same IR and stable IDs', () => {
  // The 491 structural cases of the hero view, written and read for Cesta.
  let accepted = 0;
  const cases = codeViewMutationCases(), pythonSources = [];
  for (const item of cases) {
    const generated = generateApi3ProgramSource(item.expected, 'javascript', {owner: cestaOwner});
    assert.doesNotMatch(generated.text, /\bhero\./, item.name);
    let parsed;
    try { parsed = parseJavaScriptCodeView(generated.text, {owner: cestaOwner, variableIds: item.metadata.variableIds}); }
    catch (error) { assert.match(error.message, /shared.*asignación global/); pythonSources.push(null); continue; }
    assert.deepEqual(strip(parsed.ir), strip(item.expected), item.name);
    const reconciled = reconcileCodeViewIdentity(item.previous, parsed.ir, item.sidecar);
    assert.deepEqual(strip(reconciled.ir), strip(item.expected), item.name);
    accepted++;
    pythonSources.push(generateApi3ProgramSource(item.expected, 'python', {owner: cestaOwner}).text);
  }
  assert.equal(accepted, 489);
  const vocabulary = pythonCodeViewVocabulary({owner: cestaOwner});
  const sources = pythonSources.filter(Boolean), translated = runPython(sources, vocabulary);
  let index = 0;
  for (let i = 0; i < cases.length; i++) {
    if (!pythonSources[i]) continue;
    const result = translated[index++];
    assert.equal(result.error, undefined, cases[i].name + JSON.stringify(result.error));
    const parsed = parseJavaScriptCodeView(result.source, {owner: cestaOwner, variableIds: cases[i].metadata.variableIds});
    assert.deepEqual(strip(parsed.ir), strip(cases[i].expected), cases[i].name);
  }
  // E1 sprite program (Cesta) and the stage program, through both languages, with exact IDs after reconciliation.
  for (const [owner, ir] of [[cestaOwner, spriteProgram], [stageOwner, stageProgram], [heroOwner, spriteProgram]]) {
    const js = generateApi3ProgramSource(ir, 'javascript', {owner});
    const parsed = parseJavaScriptCodeView(js.text, jsOptions(owner, js));
    assert.deepEqual(strip(parsed.ir), strip(ir), owner.identifier);
    const reconciled = reconcileCodeViewIdentity(ir, parsed.ir);
    assert.deepEqual(reconciled.ir, ir, owner.identifier + ' IDs');
    const py = generateApi3ProgramSource(ir, 'python', {owner});
    const [result] = runPython([py.text], pythonCodeViewVocabulary({capabilities, owner}));
    assert.equal(result.error, undefined, JSON.stringify(result.error));
    assert.deepEqual(reconcileCodeViewIdentity(ir, parseJavaScriptCodeView(result.source, jsOptions(owner, py)).ir).ir, ir, owner.identifier + ' Python');
  }
});

test('MS-029: actions written for another object, or sprite actions on the stage, are rejected with their cause and line', () => {
  const reject = (source, owner, pattern, line, code) => assert.throws(() => parseJavaScriptCodeView(source, {capabilities, owner}),
    error => pattern.test(error.message) && error.lineNumber === line && error.code === code, source);
  reject('onStart(() => {\n  hero.move(1);\n  cesta.move(10);\n});', heroOwner, /«cesta\.move».*«Cesta».*cada objeto programa sus propios scripts/i, 3, 'CV_OTHER_OBJECT');
  reject('onStart(() => {\n  hero.move(1);\n});', cestaOwner, /«hero\.move».*«hero»/, 2, 'CV_OTHER_OBJECT');
  reject('\nhero.onClick(() => {\n  cesta.say("hola");\n});', cestaOwner, /«hero\.onClick».*«hero»/, 2, 'CV_OTHER_OBJECT');
  reject('onStart(() => {\n  stage.move(1);\n});', cestaOwner, /«stage\.move».*escenario/i, 2, 'CV_OTHER_OBJECT');
  reject('onStart(() => {\n\n  stage.move(1);\n});', stageOwner, /escenario.*«move»/i, 3, 'CV_STAGE');
  reject('onStart(() => {\n  createClone();\n});', stageOwner, /escenario.*«createClone»/i, 2, 'CV_STAGE');
  reject('stage.onCloneStart(() => {\n});', stageOwner, /escenario.*«onCloneStart»/i, 1, 'CV_STAGE');
  reject('let cesta = 0;\nonStart(() => {\n  cesta = 1;\n});', heroOwner, /nombre de variable nuevo/, 1, 'CV_UNSUPPORTED');
  reject('let hero = 0;', cestaOwner, /nombre de variable nuevo/, 1, 'CV_UNSUPPORTED');
  // The same text is fine on its own object.
  assert.equal(parseJavaScriptCodeView('onStart(() => {\n  cesta.move(10);\n});', {capabilities, owner: cestaOwner}).ir.scripts[0].body[0].kind, 'move');
  // Python: the same causes and lines, from the AST reader in the language origin.
  const results = runPython(['@on_start\ndef go():\n    hero.move(1)\n    cesta.move(10)', '@cesta.on_click\ndef go():\n    pass',
    '@on_start\ndef go():\n    stage.move(1)', '\n@on_start\ndef go():\n    create_clone()'], pythonCodeViewVocabulary({capabilities, owner: heroOwner}));
  assert.deepEqual(results.map(result => [result.error?.lineNumber, result.error?.code]), [[4, 'CV_OTHER_OBJECT'], [1, 'CV_OTHER_OBJECT'], [3, 'CV_OTHER_OBJECT'], [undefined, undefined]]);
  assert.match(results[0].error.message, /«cesta\.move».*«Cesta»/);
  const staged = runPython(['@on_start\ndef go():\n    stage.move(1)', '\n@on_start\ndef go():\n    create_clone()', '@stage.on_click\ndef go():\n    stop_all()'], pythonCodeViewVocabulary({capabilities, owner: stageOwner}));
  assert.deepEqual(staged.map(result => [result.error?.lineNumber, result.error?.code]), [[3, 'CV_STAGE'], [4, 'CV_STAGE'], [undefined, undefined]]);
  // The conversion request carries the owner, validated.
  assert.deepEqual(validateCodeViewRequest({language: 'javascript', source: '', owner: cestaOwner}).owner, cestaOwner);
  assert.throws(() => validateCodeViewRequest({language: 'javascript', source: '', owner: {...cestaOwner, identifier: 'GG'}}), /Objeto de la vista/);
});

// Runs a document to program.start, invokes every handler and returns the RPC trace.
const runtimes = {javascript: {engine: 'quickjs', version: '0.32.0'}, python: {engine: 'pyodide', version: '314.0.7'}};
async function trace(language, source, runtime = {}) {
  const calls = []; let program = null, ready;
  const started = new Promise(done => { ready = done; });
  const options = {onDiagnostic: () => {}, onProgramReady: () => ready(), rpc: async (method, args) => {
    const call = method.startsWith('program.') ? validateTextProgramRPC(method, args) : validateLanguageRPC(method, args);
    calls.push({method: call.method, args: call.args.slice(method === 'program.start' ? 0 : 1)});
    if (method === 'program.start') { program = call.args[0]; return {started: true}; }
    return method === 'program.compare' ? true : method === 'program.deleteClone' ? false : {accepted: true};
  }};
  const engine = language === 'javascript' ? await createQuickJSEngine({...options, wasmLocation}) : await createPythonEngine({...options, indexURL: resolve('node_modules/pyodide') + '/'});
  try {
    await engine.prepare({id: 'text-12345678-1234-4234-8234-123456789abc', name: 'Copia', language, source, runtime: {...runtimes[language], ...runtime}});
    const execution = engine.execute(); execution.catch(() => {});
    await started;
    for (const handler of program.handlers) await engine.invoke(validateTextInvocation({invocationId: 'invoke-' + handler.id, handlerId: handler.id, targetId: 'cesta', revision: 1}));
    return {program, calls};
  } finally { try { engine.dispose(); } catch { /* A failed prepare left no compiled code to release. */ } }
}

test('MS-030: the translators run the copy of one object on its sprite, through runtime.targetIds', {timeout: 240000}, async () => {
  for (const language of ['javascript', 'python']) {
    const generated = generateApi3ProgramSource(spriteProgram, language, {owner: cestaOwner});
    const document = createTextDocument({language, name: 'Copia', source: generated.text, api: 'api3', variableIds: generated.variableIds, targetIds: {cesta: 'cesta'}});
    const own = await trace(language, generated.text, document.runtime);
    const reference = await trace(language, generateApi3ProgramSource(spriteProgram, language).text, {api: 'api3', variableIds: generated.variableIds});
    // Same program and calls as hero's copy; only the object of its handlers and locals changes.
    assert.deepEqual(own.program.handlers.map(handler => handler.targetId), ['cesta', 'cesta', 'cesta', 'cesta'], language);
    assert.equal(own.program.variables.find(variable => variable.name === 'pasos').targetId, 'cesta');
    assert.equal(Object.hasOwn(own.program.variables.find(variable => variable.name === 'turnos'), 'targetId'), false, 'a global has no owner');
    assert.equal(reference.program.handlers.some(handler => Object.hasOwn(handler, 'targetId')) || reference.program.variables.some(variable => Object.hasOwn(variable, 'targetId')), false, 'hero copies keep the API1 shape');
    const plain = program => JSON.parse(JSON.stringify(program, (key, value) => key === 'targetId' ? undefined : value));
    assert.deepEqual(plain(own.program), reference.program, language);
    assert.deepEqual(own.calls.slice(1), reference.calls.slice(1), language);
    // The stage owns its click and the global actions.
    const stage = generateApi3ProgramSource(stageProgram, language, {owner: stageOwner});
    const staged = await trace(language, stage.text, {api: 'api3', variableIds: stage.variableIds, targetIds: {stage: 'stage'}});
    assert.deepEqual(staged.program.handlers.map(handler => [handler.event, handler.targetId]), [['start', 'stage'], ['click', 'stage']]);
  }
  // Actions on another object are explained at their line before anything runs.
  const js = (source, targetIds) => () => compileApi3JavaScript(source, {targetIds});
  assert.throws(js('onStart(() => {\n  hero.move(1);\n});', {cesta: 'cesta'}), error => /«hero\.move».*cesta/.test(error.message) && error.lineNumber === 2);
  assert.throws(js('onStart(() => {\n  stage.move(1);\n});', {stage: 'stage'}), error => /escenario/i.test(error.message) && error.lineNumber === 2);
  assert.throws(js('onStart(() => {\n  createClone();\n});', {stage: 'stage'}), error => /escenario/i.test(error.message) && error.lineNumber === 2);
  assert.throws(js('\nstage.onCloneStart(() => {});', {stage: 'stage'}), error => /escenario/i.test(error.message) && error.lineNumber === 2);
  assert.throws(js('let cesta = 0;', {cesta: 'cesta'}), /reservado/);
  assert.throws(js('onStart(() => {\n  cesta.move(1);\n});', {}), error => /«cesta\.move».*hero/.test(error.message) && error.lineNumber === 2);
  assert.doesNotMatch(compileApi3JavaScript('onStart(() => { hero.move(1); });').source, /object|target/);
  // A renamed hero keeps its sprite ID: other text identifier, the default object.
  assert.doesNotMatch(compileApi3JavaScript('onStart(() => { heroe.move(1); });', {targetIds: {heroe: 'hero'}}).source, /object|target/);
  // A name the document binds itself is not another object.
  assert.doesNotThrow(() => compileApi3JavaScript('const pieza = {move() {}};\nonStart(() => {\n  hero.move(1);\n  pieza.move(2);\n});'));
  for (const [source, line] of [['@on_start\ndef go():\n    hero.move(1)', 3], ['\n@on_start\ndef go():\n    create_clone()', 4]]) {
    await assert.rejects(trace('python', source, {api: 'api3', targetIds: source.includes('hero') ? {cesta: 'cesta'} : {stage: 'stage'}}),
      error => new RegExp('line ' + line).test(error.message) && /escenario|cesta/.test(error.message), source);
  }
});

test('MS-034: a copy of the project is one document where every event names its object; each script keeps its object', {timeout: 240000}, async () => {
  const heroIR = {version: 0, variables: [{id: 'v-pasos', name: 'pasos', initialValue: 0}, {id: 'v-turnos', name: 'turnos', initialValue: 0, scope: 'global'}], scripts: [
    {event: 'start', sourceBlockId: 'h1', body: [n('say', 'h2', {message: 'Hola'}), n('changeVariable', 'h3', {variableId: 'v-pasos', name: 'pasos', value: 2}), n('broadcastWait', 'h4', {message: 'saluda'}), n('changeVariable', 'h5', {variableId: 'v-turnos', name: 'turnos', value: 1})]}]};
  const cestaIR = {version: 0, variables: [{id: 'v-pasos-c', name: 'pasos', initialValue: 0}, {id: 'v-turnos', name: 'turnos', initialValue: 0, scope: 'global'}], scripts: [
    {event: 'message', message: 'saluda', sourceBlockId: 'c1', body: [n('changeVariable', 'c2', {variableId: 'v-pasos-c', name: 'pasos', value: 7}), n('show', 'c3'), n('changeVariable', 'c4', {variableId: 'v-turnos', name: 'turnos', value: 10})]},
    {event: 'click', sourceBlockId: 'c5', body: [n('turnRight', 'c6', {degrees: 15})]}]};
  const stageIR = {version: 0, variables: [{id: 'v-turnos', name: 'turnos', initialValue: 0, scope: 'global'}], scripts: [
    {event: 'message', message: 'saluda', sourceBlockId: 's1', body: [n('changeVariable', 's2', {variableId: 'v-turnos', name: 'turnos', value: 100})]}]};
  const scene = composeScene2DProgram(config, {stage: stageIR, sprites: {hero: heroIR, cesta: cestaIR}});
  for (const language of ['javascript', 'python']) {
    const generated = generateApi3SceneSource(scene, language, {config});
    assert.deepEqual(generated.targetIds, {stage: 'stage', hero: 'hero', cesta: 'cesta'});
    assert.match(generated.text, language === 'javascript' ? /^hero\.onStart\(\(\) => \{\n {2}hero\.say\("Hola"\);/m : /^@hero\.on_start\ndef al_iniciar\(\):\n( {4}global .*\n)? {4}hero\.say\("Hola"\)/m);
    assert.match(generated.text, language === 'javascript' ? /^cesta\.onMessage\("saluda", \(\) => \{/m : /^@cesta\.on_message\("saluda"\)$/m);
    assert.match(generated.text, language === 'javascript' ? /^stage\.onMessage\("saluda", \(\) => \{/m : /^@stage\.on_message\("saluda"\)$/m);
    assert.match(generated.text, /^ +cesta\.show\(\)/m);
    // The same local name in two objects becomes two variables.
    assert.deepEqual(Object.keys(generated.variableIds).sort(), ['pasos', 'pasos_2', 'turnos']);
    const document = createTextDocument({language, name: 'Proyecto', source: generated.text, api: 'api3', variableIds: generated.variableIds, targetIds: generated.targetIds});
    const {program, calls} = await trace(language, generated.text, document.runtime);
    assert.deepEqual(program.handlers.map(handler => [handler.event, handler.targetId]), [['message', 'stage'], ['start', undefined], ['message', 'cesta'], ['click', 'cesta']], language);
    assert.deepEqual(Object.fromEntries(program.variables.map(variable => [variable.id, [variable.scope, variable.targetId]])),
      {'v-pasos': ['local', undefined], 'v-pasos-c': ['local', 'cesta'], 'v-turnos': ['global', undefined]}, language);
    assert.deepEqual(calls.slice(1).map(call => call.method), ['program.changeVariable', 'program.say', 'program.changeVariable', 'program.broadcastAndWait', 'program.changeVariable', 'program.changeVariable', 'program.show', 'program.changeVariable', 'program.turnRight'], language);
  }
  // Rules of a project document: events name their object, actions stay on the event's object, locals on one object.
  const targetIds = {hero: 'hero', cesta: 'cesta', stage: 'stage'}, compile = source => () => compileApi3JavaScript(source, {targetIds});
  assert.throws(compile('\nonStart(() => {});'), error => /de quién es el evento.*hero\.onStart/.test(error.message) && error.lineNumber === 2);
  assert.throws(compile('hero.onStart(() => {\n  cesta.move(1);\n});'), error => /«cesta\.move».*«hero».*cada objeto programa/.test(error.message) && error.lineNumber === 2);
  assert.throws(compile('stage.onStart(() => {\n  stage.move(1);\n});'), error => /escenario/i.test(error.message) && error.lineNumber === 2);
  assert.throws(compile('let n = 0;\nhero.onStart(() => { n = 1; });\ncesta.onStart(() => { n = 2; });'), error => /Varios objetos usan «n».*shared/.test(error.message) && error.lineNumber === 1);
  assert.doesNotThrow(compile('let n = shared(0);\nhero.onStart(() => { n = 1; });\ncesta.onStart(() => { n = 2; });'));
  await assert.rejects(trace('python', '@on_start\ndef go():\n    pass', {api: 'api3', targetIds}), /de quién es el evento/);
  await assert.rejects(trace('python', '@hero.on_start\ndef go():\n    cesta.move(1)', {api: 'api3', targetIds}), /«cesta\.move».*«hero»/);
  await assert.rejects(trace('python', 'n = 0\n@hero.on_start\ndef a():\n    n = 1\n@cesta.on_start\ndef b():\n    n = 2', {api: 'api3', targetIds}), /Varios objetos usan «n»/);
  // Opt-in only in this route: the validator still rejects v1 elsewhere, and an unknown object is refused.
  assert.throws(() => generateApi3ProgramSource(scene, 'javascript'), /unsupported version/);
  assert.throws(() => generateApi3SceneSource(heroIR, 'javascript', {config}), /Unsupported generated program/);
  assert.throws(() => generateApi3SceneSource({version: 1, sprites: ['pez'], scripts: []}, 'javascript', {config}), /objeto desconocido/);
});

test('MS-031: the text runtime attaches a copy\'s handlers to its sprite and keeps the stage to its own actions', {timeout: 60000}, async t => {
  assert.deepEqual(validateTextProgram({variables: [{id: 'n', name: 'n', initialValue: 0, targetId: 'cesta'}], handlers: [{id: 'h', event: 'start', targetId: 'cesta'}]}).handlers[0].targetId, 'cesta');
  for (const targetId of ['', 'a b', '__proto__', 7]) assert.throws(() => validateTextProgram({variables: [], handlers: [{id: 'h', event: 'start', targetId}]}), /invalid target/);
  assert.throws(() => validateTextProgram({variables: [], handlers: [{id: 'h', event: 'clone', targetId: 'stage'}]}), /stage cannot clone/);
  assert.throws(() => validateTextProgram({variables: [{id: 'n', name: 'n', initialValue: 0, scope: 'global', targetId: 'cesta'}], handlers: []}), /variable scope/);
  const {project} = toScratchSceneProject({version: 1, sprites: ['hero', 'cesta'], scripts: []}, {scene: config});
  const vm = await createScratchSession(project);
  const invocations = [];
  const program = createTextProgram({getVM: () => vm, getRevision: () => 1, onInvocation: event => invocations.push(event)});
  t.after(() => { program.dispose(); vm.quit(); });
  const call = (method, args) => program.call('program.' + method, args, 1);
  call('start', [{variables: [{id: 'pasos', name: 'pasos', initialValue: 3, targetId: 'cesta'}], handlers: [{id: 'go', event: 'start', targetId: 'cesta'}, {id: 'also', event: 'start'}]}]);
  for (let i = 0; i < 50 && invocations.length < 2; i++) await new Promise(done => setTimeout(done, 10));
  const cestaTarget = vm.runtime.getSpriteTargetByName('cesta'), heroTarget = vm.runtime.getSpriteTargetByName('hero');
  assert.deepEqual(invocations.map(event => event.handlerId).sort(), ['also', 'go']);
  const own = invocations.find(event => event.handlerId === 'go');
  assert.deepEqual(call('move', [own.invocationId, {variableId: 'pasos'}]), {x: 123, y: 0});
  // Each handler acts on its own object; a local of another object is out of its reach.
  assert.throws(() => call('move', [invocations.find(event => event.handlerId === 'also').invocationId, {variableId: 'pasos'}]), /variable unavailable/);
  assert.deepEqual([cestaTarget.x, heroTarget.x, Object.keys(cestaTarget.variables), Object.keys(heroTarget.variables)], [123, 0, ['pasos'], []]);
  // The stage: click hat, global actions only.
  invocations.length = 0;
  call('start', [{variables: [], handlers: [{id: 'tap', event: 'start', targetId: 'stage'}]}]);
  for (let i = 0; i < 50 && !invocations.length; i++) await new Promise(done => setTimeout(done, 10));
  assert.equal(invocations.length, 1);
  assert.throws(() => call('move', [invocations[0].invocationId, 1]), /stage cannot/);
  assert.deepEqual(call('stopSounds', [invocations[0].invocationId]), {stopped: true});
  assert.throws(() => call('start', [{variables: [], handlers: [{id: 'lost', event: 'start', targetId: 'nadie'}]}]), /scene unavailable/);
  // sprite.get gives the visible name, as scene.get does (Task 4 review).
  const gg = createGGBindings(() => vm, () => [{id: 'hero', name: 'Héroe'}, {id: 'cesta', name: 'Cesta'}]);
  assert.equal(gg('sprite.get', ['hero']).name, 'Héroe');
  assert.equal(gg('scene.get', []).sprites[0].name, 'Héroe');
  assert.equal(createGGBindings(() => vm)('sprite.get', ['hero']).name, 'hero');
});

test('MS-032: codeViews keep one view state per object; switching needs the pending text applied and v1 files still read', () => {
  const point = (seed) => ({id: '00000000-0000-4000-8000-00000000000' + seed, workspace: {blocks: {languageVersion: 0, blocks: []}}, appliedHash: String(seed).repeat(64), scriptOrder: null});
  const legacy = {version: 1, activeContext: '2d', entries: [{...emptyCodeView('2d'), scriptOrder: ['h1'], restorePoint: point(1)}]};
  assert.deepEqual(validateCodeViews(legacy), legacy, 'version 1 reads unchanged');
  const state = createCodeViewsState(legacy);
  assert.equal(state.currentObject(), null);
  // Pending text blocks the switch (the UI applies it first, as when returning to Blocks).
  state.set({...state.get('2d'), language: 'javascript', source: 'onStart(() => {});', baselineSource: ''});
  assert.throws(() => state.switchObject('hero', 'cesta', {scriptOrder: ['h1']}), /texto pendiente/);
  state.set({...state.get('2d'), baselineSource: 'onStart(() => {});'});
  state.switchObject('hero', 'cesta', {scriptOrder: ['h2']});
  const switched = state.capture();
  assert.equal(switched.version, 2);
  assert.equal(switched.objectId, 'cesta');
  assert.deepEqual(switched.objects, {hero: {scriptOrder: ['h2'], restorePoint: point(1)}});
  assert.deepEqual([state.get('2d').language, state.get('2d').scriptOrder, state.get('2d').restorePoint, state.get('2d').source], ['javascript', null, null, '']);
  assert.deepEqual(validateCodeViews(switched), switched);
  // Coming back restores hero's order and Undo point, and stores Cesta's.
  state.set({...state.get('2d'), scriptOrder: ['c1'], restorePoint: point(2)});
  state.switchObject('cesta', 'hero', {scriptOrder: ['c1']});
  assert.deepEqual([state.get('2d').scriptOrder, state.get('2d').restorePoint], [['h2'], point(1)]);
  assert.deepEqual(state.capture().objects, {cesta: {scriptOrder: ['c1'], restorePoint: point(2)}});
  assert.deepEqual(state.objectView('cesta'), {scriptOrder: ['c1'], restorePoint: point(2)});
  assert.deepEqual(state.objectView('stage'), {scriptOrder: null, restorePoint: null});
  for (const bad of [{...switched, objectId: 'stage', objects: {stage: switched.objects.hero}}, {...switched, objectId: '__proto__'}, {...switched, objects: {hero: {scriptOrder: null}}},
    {...switched, version: 1}, {...legacy, objectId: 'hero'}])
    assert.throws(() => validateCodeViews(bad), /Vistas de código/, JSON.stringify(Object.keys(bad)));
});

const assets = {};
for (const name of ['stage', 'hero', 'hero-alt']) {
  const content = await readFile(new URL(`../../src/assets/${name}.svg`, import.meta.url), 'utf8');
  assets[createHash('md5').update(content).digest('hex')] = content;
}
const tone = createTone().buffer;
assets[createHash('md5').update(tone).digest('hex')] = {type: 'Sound', format: 'wav', encoding: 'base64', data: tone.toString('base64')};
const catalog = await buildProjectCatalog({assets, costumes: [], sounds: []});
const workspaceWith = (...blocks) => ({blocks: {languageVersion: 0, blocks}});
const heroBlocks = workspaceWith({type: 'gg_when_start', id: 'h-start', x: 30, y: 40, inputs: {DO: {block: {type: 'gg_move', id: 'h-move', inputs: {STEPS: {shadow: {type: 'math_number', id: 'h-steps', fields: {NUM: 10}}}}}}}});
const cestaBlocks = workspaceWith({type: 'gg_when_clicked', id: 'c-click', x: 50, y: 60, inputs: {DO: {block: {type: 'gg_say', id: 'c-say', fields: {MESSAGE: 'Hola'}}}}});

test('MS-033: per-object conversion keeps block IDs; v6 validates the views; the coordinator mounts objects without losing a workspace', async () => {
  // Real conversion on Cesta's stored workspace: its view, its identifier, the same IDs and positions.
  const snapshot = captureCodeViewSnapshot(cestaBlocks, {capabilities});
  const generated = generateCodeViewSource(snapshot, 'javascript', {owner: cestaOwner});
  assert.match(generated.text, /^cesta\.onClick\(\(\) => \{\n {2}cesta\.say\("Hola"\);/m);
  const edited = generated.text.replace('"Hola"', '"Adiós"');
  const parsed = parseJavaScriptCodeView(edited, {capabilities, owner: cestaOwner, variableIds: generated.variableIds, variableNames: generated.variableNames});
  const candidate = prepareCodeViewCandidate(snapshot, parsed);
  const top = candidate.state.blocks.blocks[0];
  assert.deepEqual([top.id, top.x, top.y, top.inputs.DO.block.id, top.inputs.DO.block.fields.MESSAGE], ['c-click', 50, 60, 'c-say', 'Adiós']);
  // A new object has an empty workspace: its view is just the header.
  const empty = captureCodeViewSnapshot({}, {capabilities});
  assert.match(generateCodeViewSource(empty, 'python', {owner: cestaOwner}).text, /^# Python de tus bloques/);
  // v6 carries views per object; v5 cannot, and every key must be a configured object.
  const views = {version: 2, activeContext: '2d', entries: [{...emptyCodeView('2d'), scriptOrder: ['c-click']}], objectId: 'cesta', objects: {hero: {scriptOrder: ['h-start'], restorePoint: null}}};
  const project = await createProject({name: 'Diálogo', scene2d: {stage: {}, sprites: {hero: heroBlocks, cesta: cestaBlocks}}, deviceSource: '', catalog, capabilities, codeViews: views});
  assert.equal(project.version, 6);
  assert.deepEqual((await parseProject(JSON.stringify(project), {catalog})).authoring.codeViews, views);
  for (const bad of [{...views, objectId: 'nadie'}, {...views, objects: {nadie: {scriptOrder: null, restorePoint: null}}}]) {
    const candidateProject = structuredClone(project); candidateProject.authoring.codeViews = bad;
    await assert.rejects(parseProject(JSON.stringify(candidateProject), {catalog}), /objeto desconocido/);
  }
  const v5 = await createProject({name: 'Antes', blockly: heroBlocks, deviceSource: '', catalog, capabilities: createCapabilities(['gg.sprites'], {versions: {'gg.sprites': '0.2.0'}}), codeViews: {version: 1, activeContext: '2d', entries: [emptyCodeView('2d')]}});
  assert.equal(v5.version, 5);
  v5.authoring.codeViews = views;
  await assert.rejects(parseProject(JSON.stringify(v5), {catalog}), /requieren GGPROJ v6/);
  // The coordinator: mounting stores the outgoing workspace, capture keeps blockly on the first sprite.
  let live = {}, order = null, failing = false;
  const editor = {
    save: () => structuredClone(live), program: () => ({version: 0, scripts: []}), resourceView: () => null,
    programOf: state => ({version: 0, scripts: []}), captureCapabilities: () => structuredClone(capabilities),
    prepare: (state, options) => { if (failing) throw new Error('workspace inválido'); return {state: structuredClone(state), scriptOrder: options.scriptOrder, capabilities: options.capabilities}; },
    commit(candidate) { live = structuredClone(candidate.state); order = candidate.scriptOrder; }
  };
  const state = createCodeViewsState();
  const authoring = createProjectAuthoring({editor, source: {value: ''}, codeViews: state, initialCapabilities: capabilities});
  const opened = await createProject({name: 'Diálogo', scene2d: {stage: {}, sprites: {hero: heroBlocks, cesta: cestaBlocks}}, deviceSource: '', catalog, capabilities});
  authoring.commit(authoring.prepare(opened));
  assert.equal(authoring.mountedObject(), 'hero');
  assert.deepEqual(live, heroBlocks);
  const notified = []; authoring.subscribe(() => notified.push('change'));
  live = workspaceWith({type: 'gg_when_start', id: 'h-new', x: 1, y: 2});
  const editedHero = structuredClone(live);
  authoring.mountObject('cesta', {scriptOrder: ['c-click']});
  assert.deepEqual([authoring.mountedObject(), live, order], ['cesta', cestaBlocks, ['c-click']]);
  assert.equal(notified.length, 1);
  const captured = authoring.capture();
  assert.deepEqual(captured.blockly, editedHero, 'blockly stays the first sprite\'s');
  assert.deepEqual(captured.scene2d, {stage: {}, sprites: {hero: editedHero, cesta: cestaBlocks}});
  const saved = await createProject({...captured, name: 'Diálogo', catalog});
  assert.deepEqual(saved.authoring.scene2d.sprites, {hero: editedHero, cesta: cestaBlocks}, 'a save from another object loses nothing');
  // A rejected object changes nothing; unknown objects are refused.
  failing = true;
  assert.throws(() => authoring.mountObject('stage'), /workspace inválido/);
  failing = false;
  assert.equal(authoring.mountedObject(), 'cesta');
  assert.deepEqual(live, cestaBlocks);
  assert.throws(() => authoring.mountObject('nadie'), /Objeto desconocido/);
  authoring.mountObject('stage');
  assert.equal(authoring.mountedObject(), 'stage');
  assert.deepEqual(authoring.capture().scene2d.sprites.cesta, cestaBlocks);
  // Reopening saved views mounts their object with its order, not the first sprite.
  authoring.commit(authoring.prepare(project));
  assert.deepEqual([authoring.mountedObject(), live, order], ['cesta', cestaBlocks, ['c-click']]);
});
