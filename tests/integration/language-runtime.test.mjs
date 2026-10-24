import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createQuickJSEngine} from '../../src/targets/text/quickjs-engine.mjs';
import {languageRuntimeLimits, validateLanguageDocument, validateLanguageScope, validateLanguageRPC, validateLanguageWait, createLanguageChannelGate, languageDiagnostic} from '../../src/contracts/language-runtime.mjs';

const require = createRequire(import.meta.url);
const id = 'text-12345678-1234-4234-8234-123456789abc';
const document = source => ({id, name: 'Prueba', language: 'javascript', source, runtime: {engine: 'quickjs', version: '0.32.0'}});
const scope = {runnerSessionId: 'runner-session', revision: 2, documentId: id};
const wasmLocation = require.resolve('@jitl/quickjs-wasmfile-release-sync/wasm');

test('GG-TEXT-004: language document and scope locks are strict detached data', () => {
  const input = document('console.log(1)');
  const validated = validateLanguageDocument(input);
  input.runtime.engine = 'unknown';
  assert.equal(validated.runtime.engine, 'quickjs');
  for (const value of [
    {...document(''), extra: true}, {...document(''), id: 'bad-id'}, {...document(''), name: 'bad\nname'},
    {...document(''), language: 'typescript'}, document('é'.repeat(32769)),
    {...document(''), runtime: {engine: 'quickjs', version: 'latest'}}
  ]) assert.throws(() => validateLanguageDocument(value), /GG language/);
  assert.deepEqual(validateLanguageScope(scope), scope);
  for (const value of [{...scope, revision: -1}, {...scope, revision: 1.2}, {...scope, documentId: 'other'}, {...scope, extra: true}]) assert.throws(() => validateLanguageScope(value));
});

test('GG-TEXT-004: RPC validates method, arity, primitive arguments and scene bounds', () => {
  for (const [method, args] of [
    ['scene.get', []], ['sprite.get', ['hero']], ['sprite.move', ['hero', 480]],
    ['sprite.setPosition', ['hero', {x: 240, y: -180}]], ['variables.get', ['score']],
    ['variables.set', ['score', 1000000]], ['events.emit', ['boost']]
  ]) assert.deepEqual(validateLanguageRPC(method, args), {method, args});
  for (const [method, args] of [
    ['fetch', []], ['scene.get', [1]], ['sprite.move', ['clone', 1]], ['sprite.move', ['hero', NaN]],
    ['sprite.move', ['hero', 481]], ['sprite.setPosition', ['hero', {x: 0, y: 0, url: 'remote'}]],
    ['variables.set', ['score', Infinity]], ['variables.get', ['__proto__']], ['events.emit', ['x'.repeat(65)]],
    ['variables.set', ['score', '5']]
  ]) assert.throws(() => validateLanguageRPC(method, args), /GG language/);
  assert.equal(validateLanguageWait(60), 60);
  for (const value of [-1, 61, NaN, '1']) assert.throws(() => validateLanguageWait(value));
  assert.equal(languageRuntimeLimits.pendingRPC, 64);
  assert.equal(languageRuntimeLimits.rpcBytes, 16384);
});

test('GG-TEXT-004: channel gates reject session/version/replay and out-of-order sequence', () => {
  const gate = createLanguageChannelGate({languageSessionId: 'language-a'});
  const message = seq => ({protocolVersion: 1, languageSessionId: 'language-a', seq});
  for (const value of [null, {...message(0), languageSessionId: 'old'}, {...message(0), protocolVersion: 2}, message(-1), message(0.5), message(NaN)]) assert.equal(gate.accept(value), false);
  assert.equal(gate.accept(message(0)), true);
  assert.equal(gate.accept(message(0)), false);
  assert.equal(gate.accept(message(2)), true);
  assert.equal(gate.accept(message(1)), false);
});

test('GG-TEXT-004: diagnostics map only real lines from the document interpreter filename', () => {
  const doc = document('const a = 1;\nthrow new Error("fallo");');
  const mapped = languageDiagnostic({message: '<script>x</script>', stack: 'at document.js:2:3'}, doc);
  assert.deepEqual(mapped.sourceLocation, {documentId: id, line: 2, column: 3});
  assert.equal(mapped.message, '<script>x</script>');
  assert.equal(languageDiagnostic({message: 'x'.repeat(2048), stack: 'at document.js:3:1'}, doc).message.length, 1024);
  assert.equal(languageDiagnostic({message: 'bad', stack: 'at other.js:1:1'}, doc).sourceLocation, undefined);
  const python = {...doc, language: 'python'};
  assert.equal(languageDiagnostic({message: 'bad', stack: 'File "document.py", line 2'}, python).sourceLocation.line, 2);
});

test('GG-TEXT-002/003: JavaScript syntax preflight has no effects and module top-level await uses explicit GG RPC', async () => {
  const calls = []; const logs = [];
  const engine = await createQuickJSEngine({wasmLocation, rpc: async (method, args) => { calls.push([method, args]); return {x: args[1]}; }, onDiagnostic: record => logs.push(record)});
  try {
    await engine.prepare(document('console.log("inicio");\nconst moved = await GG.sprite.move("hero", 6);\nawait GG.wait(0);\nconsole.log(moved.x);'));
    assert.deepEqual(calls, []); assert.deepEqual(logs, []);
    assert.deepEqual(await engine.execute(), {completed: true});
    assert.deepEqual(calls, [['sprite.move', ['hero', 6]]]);
    assert.deepEqual(logs.map(item => item.message), ['inicio', '6']);
  } finally { engine.dispose(); }
});

test('GG-TEXT-003: syntax and module imports fail during preparation without running a source wrapper', async () => {
  let effects = 0;
  const engine = await createQuickJSEngine({wasmLocation, rpc: async () => { effects++; }, onDiagnostic: () => { effects++; }});
  try {
    await assert.rejects(engine.prepare(document('}); console.log("escaped"); (async()=>{')));
    await assert.rejects(engine.prepare(document('import "https://example.invalid/module.js";')));
    assert.equal(effects, 0);
  } finally { engine.dispose(); }
});

test('GG-TEXT-003: QuickJS interrupts infinite source and infinite asynchronous jobs within a turn', async () => {
  for (const source of ['while (true) {}', 'await Promise.resolve(); while (true) {}', 'await GG.wait(0); while (true) {}']) {
    const engine = await createQuickJSEngine({wasmLocation, rpc: async () => null, onDiagnostic: () => {}});
    try {
      await engine.prepare(document(source));
      const started = performance.now();
      await assert.rejects(engine.execute(), /interrupt/i);
      assert.ok(performance.now() - started < 2000);
    } finally { engine.dispose(); }
  }
});

test('GG-TEXT-004: QuickJS reports a terminal source error after one hundred log records', async () => {
  const logs = [];
  const doc = document('for (let i = 0; i < 100; i++) console.log(i);\nthrow new Error("fallo final");');
  const engine = await createQuickJSEngine({wasmLocation, rpc: async () => null, onDiagnostic: record => logs.push(record)});
  try {
    await engine.prepare(doc);
    await assert.rejects(engine.execute(), error => {
      const diagnostic = languageDiagnostic(error, doc);
      assert.equal(diagnostic.message, 'fallo final');
      assert.equal(diagnostic.sourceLocation.line, 2);
      return true;
    });
    assert.equal(logs.length, 100);
  } finally { engine.dispose(); }
});

test('GG-TEXT-002/003: synchronous modules complete without disposing a borrowed namespace handle', async () => {
  const logs = [];
  const engine = await createQuickJSEngine({wasmLocation, rpc: async () => null, onDiagnostic: record => logs.push(record)});
  try {
    await engine.prepare(document('console.log(typeof window, typeof document, typeof fetch);'));
    assert.equal(logs.length, 0);
    assert.deepEqual(await engine.execute(), {completed: true});
    assert.equal(logs[0].message, 'undefined undefined undefined');
  } finally { engine.dispose(); }
});
test('GG-TEXT-003: ECMAScript2022 module syntax is checked before loading WASM', async () => {
  const logs = [];
  const engine = await createQuickJSEngine({wasmLocation: '/missing-runtime.wasm', rpc: async () => null, onDiagnostic: record => logs.push(record)});
  try {
    await assert.rejects(engine.prepare(document('const n = 1;\nconst = ;')), error => {
      assert.equal(languageDiagnostic(error, document('const n = 1;\nconst = ;')).sourceLocation.line, 2);
      assert.match(error.message, /Unexpected token/);
      return true;
    });
    await assert.rejects(engine.prepare(document('await import("./other.js");')), /imports/);
    await assert.rejects(engine.prepare(document('console.log(import.meta.url);')), /imports/);
    assert.deepEqual(logs, []);
  } finally { engine.dispose(); }
});
test('GG-TEXT-002: native top-level await Promise.resolve executes the original module unchanged', async () => {
  const logs = [];
  const engine = await createQuickJSEngine({wasmLocation, rpc: async () => null, onDiagnostic: record => logs.push(record)});
  try {
    await engine.prepare(document('await Promise.resolve(); console.log("resuelto");'));
    assert.deepEqual(logs, []);
    assert.deepEqual(await engine.execute(), {completed: true});
    assert.equal(logs[0].message, 'resuelto');
  } finally { engine.dispose(); }
});
