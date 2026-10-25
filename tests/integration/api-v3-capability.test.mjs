import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createQuickJSEngine} from '../../src/targets/text/quickjs-engine.mjs';
import {createPythonEngine} from '../../src/targets/text/python-engine.mjs';
import {createCapabilityProgramHost} from '../../src/runtime/capability-program.mjs';
import {createGeneratedCapabilityDocument, generateApi3CapabilitySource} from '../../src/generated-capability-source.mjs';
import {compileApi3Capability} from '../../src/targets/text/api-v3-capability.mjs';
import {resolveOperationProfile} from '../../src/contracts/operations.mjs';
import {languageProfileMetadata} from '../../src/contracts/capability-language.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';

const require = createRequire(import.meta.url), wasmLocation = require.resolve('@jitl/quickjs-wasmfile-release-sync/wasm');
const pause = () => new Promise(resolveDelay => setTimeout(resolveDelay, 1));
async function until(predicate) { const end = Date.now() + 10000; while (!predicate()) { if (Date.now() > end) assert.fail('Expected capability state not reached'); await pause(); } }
const move = (sourceBlockId, x) => ({kind: 'call', operationId: 'scene3d.move', args: {targetId: 'sphere', delta: {x, y: 0, z: 0}}, sourceBlockId});
const programs = {
  scene: {version: 1, contextId: 'scene3d', documentId: 'scene-main', variables: [{id: 'steps', name: 'Pasos', type: 'number', initialValue: 2}], scripts: [
    {event: 'start', targetId: null, sourceBlockId: 'start', body: [
      {kind: 'repeat', count: 3, sourceBlockId: 'repeat', body: [move('move', {kind: 'variable', variableId: 'steps', sourceBlockId: 'read'}), {kind: 'wait', seconds: 0, sourceBlockId: 'wait'}]},
      {kind: 'changeVariable', variableId: 'steps', value: -1, sourceBlockId: 'change'},
      {kind: 'if', condition: {kind: 'compare', operator: 'GT', left: {kind: 'variable', variableId: 'steps', sourceBlockId: 'cmp-read'}, right: 0, sourceBlockId: 'cmp'}, body: [move('then', 5)], elseBody: [move('else', 9)], sourceBlockId: 'if'},
      {kind: 'call', operationId: 'scene3d.setCamera', args: {alpha: 10, beta: 60, radius: 8, target: {x: 0, y: 1, z: 0}}, sourceBlockId: 'camera'}]},
    {event: 'key', targetId: null, key: 'space', sourceBlockId: 'key', body: [move('key-move', 1)]},
    {event: 'click', targetId: 'sphere', sourceBlockId: 'click', body: [{kind: 'setVariable', variableId: 'steps', value: 7, sourceBlockId: 'set'}, move('click-move', {kind: 'variable', variableId: 'steps', sourceBlockId: 'read2'})]}
  ]},
  form: {version: 1, contextId: 'webapp', documentId: 'app-main', variables: [{id: 'greeting', name: 'Saludo', type: 'string', initialValue: 'Hola'}, {id: 'on', name: 'activo', type: 'boolean', initialValue: true}], scripts: [
    {event: 'submit', targetId: 'form', sourceBlockId: 'submit', body: [
      {kind: 'call', operationId: 'webapp.appendItem', args: {targetId: 'list', text: {kind: 'event', path: 'values.name', sourceBlockId: 'field'}}, sourceBlockId: 'append'},
      {kind: 'call', operationId: 'webapp.setText', args: {targetId: 'title', text: {kind: 'variable', variableId: 'greeting', sourceBlockId: 'read'}}, sourceBlockId: 'title'}]},
    {event: 'input', targetId: 'name', sourceBlockId: 'input', body: [
      {kind: 'setVariable', variableId: 'greeting', value: {kind: 'event', path: 'value', sourceBlockId: 'value'}, sourceBlockId: 'set'},
      {kind: 'if', condition: {kind: 'compare', operator: 'EQ', left: {kind: 'variable', variableId: 'on', sourceBlockId: 'on-read'}, right: true, sourceBlockId: 'cmp'}, body: [{kind: 'call', operationId: 'webapp.setVisible', args: {targetId: 'list', visible: true}, sourceBlockId: 'show'}], elseBody: [], sourceBlockId: 'if'}]}
  ]}
};
const emissions = {scene: [['key', null, {key: 'space'}], ['click', 'sphere', {}]], form: [['input', 'name', {value: 'Ana'}], ['submit', 'form', {values: {name: 'Ana'}}]]};

async function run(ir, document, language) {
  const profile = resolveOperationProfile({contextId: ir.contextId, documentId: ir.documentId}), events = new Map(), calls = [], errors = [];
  let engine, ready = false;
  const host = createCapabilityProgramHost({profile, getRevision: () => 3, getScope: () => ({sessionId: 'session', revision: 3}),
    subscribeEvent: (descriptor, callback) => { events.set(descriptor.event + ':' + descriptor.targetId, callback); return () => events.delete(descriptor.event + ':' + descriptor.targetId); },
    callOperation: async (operationId, args, authority) => { calls.push({operationId, args, authority}); return null; },
    onInvocation: data => engine.invoke(data).then(result => host.complete({invocationId: data.invocationId, revision: data.revision, result}), error => { errors.push(error.message); host.complete({invocationId: data.invocationId, revision: data.revision, error: {message: error.message}}); }),
    onCancel: data => engine?.cancelInvocation(data.invocationId), onDiagnostic: () => {}});
  const options = {profile: languageProfileMetadata(profile), rpc: (method, args) => host.call(method, args), onDiagnostic: () => {}, onProgramReady: () => { ready = true; }};
  engine = language === 'javascript' ? await createQuickJSEngine({...options, wasmLocation}) : await createPythonEngine({...options, indexURL: resolve('node_modules/pyodide') + '/'});
  try {
    await engine.prepare(document);
    const execution = engine.execute(); execution.catch(() => {});
    await until(() => ready); await until(() => host.state().invocations === 0);
    const subscribed = [...events.keys()].sort();
    for (const [event, targetId, payload] of emissions[ir.contextId === 'scene3d' ? 'scene' : 'form']) { events.get(event + ':' + targetId)?.({type: event, targetId, ...payload}); await pause(); await until(() => host.state().invocations === 0); }
    return {calls, errors, subscribed};
  } finally { host.dispose(); engine.dispose(); }
}

for (const language of ['javascript', 'python']) {
  test(`API3-CAP-001: 3D and web API v3 copies behave exactly like API2 in ${language}`, {timeout: 240000}, async () => {
    for (const [name, ir] of Object.entries(programs)) {
      const api2 = await run(ir, createGeneratedCapabilityDocument(ir, language).document, language);
      const generated = generateApi3CapabilitySource(ir, language, {targets: ['sphere', 'light', 'form', 'list', 'name', 'title']});
      for (const forbidden of [/\bGG\b/, /\bctx\b/, /\bawait\b/, /gg_/]) assert.doesNotMatch(generated.text, forbidden, `${name} ${language}`);
      const document = createTextDocument({language, name: 'Copia', source: generated.text, api: 'api3', variableIds: generated.variableIds, targetIds: generated.targetIds});
      const api3 = await run(ir, document, language);
      assert.deepEqual(api3.errors, api2.errors, `${name} errors`);
      assert.deepEqual(api3.subscribed, api2.subscribed, `${name} subscriptions`);
      assert.deepEqual(api3.calls, api2.calls, `${name} calls`);
      assert.deepEqual(api2.errors, [], `${name}: no runtime errors`);
      assert.ok(api2.calls.length >= 3, `${name}: the program performed operations`);
    }
  });
}

test('API3-CAP-002: the 3D/web translator explains unsupported code at its line', () => {
  const profile = resolveOperationProfile({contextId: 'scene3d', documentId: 'scene-main'});
  const compile = source => compileApi3Capability(source, {profile, targetIds: {sphere: 'sphere'}});
  for (const [code, message, line] of [
    ['sphere.move(1, 0, 0);', /dentro de un evento/, 1],
    ['onStart(() => {\n  sphere.fly(1);\n});', /sphere no tiene la acción fly/, 2],
    ['onStart(() => {\n  sphere.move(1, 0);\n});', /recibe 3 valores/, 2],
    ['onStart(() => {\n  function ayuda() { sphere.move(1, 0, 0); }\n});', /funciones propias/, 2],
    ['sphere.onClick((event) => {\n  sphere.move(event.colour, 0, 0);\n});', /event\.value/, 2],
    ['let sphere = 1;', /ya nombra un objeto/, 1]
  ]) assert.throws(() => compile(code), error => message.test(error.message) && error.lineNumber === line, code);
  assert.equal(compile('const x = 1;').translated, false, 'plain JavaScript passes unchanged');
});
