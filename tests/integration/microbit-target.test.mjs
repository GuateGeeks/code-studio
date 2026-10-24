import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {observeButtonBus} from '../../src/targets/microbit/simulator/button-observer.mjs';
import {validateDeviceEvent, deviceRuntimeLimits} from '../../src/contracts/device-runtime.mjs';

const scope = {sessionId: 'session-1', deviceId: 'device-1', deviceRevision: 2, requestId: 4, generation: 'generation-1', sceneRevision: 3};
function board() {
  const calls = [];
  const bus = {queue(...args) { calls.push({receiver: this, args}); return 'original-result'; }};
  return {calls, bus, buttonPairState: {aBtn: {id: 1}, bBtn: {id: 2}, abBtn: {id: 3}, props: {BUTTON_EVT_CLICK: 9}}};
}
test('device bus observer preserves PXT calls, emits closed scoped A/B/AB and restores the exact function', () => {
  const value = board(), original = value.bus.queue, events = [], input = {...scope};
  const dispose = observeButtonBus({board: value, deviceScope: input, emit: event => events.push(event), now: () => 0});
  input.deviceRevision = 99;
  assert.equal(value.bus.queue(1, 9, 42), 'original-result');
  value.bus.queue(2, 9); value.bus.queue(3, 9); value.bus.queue(4, 9); value.bus.queue(1, 8);
  assert.deepEqual(events.map(event => validateDeviceEvent(event).event.button), ['A', 'B', 'AB']);
  assert.equal(events[0].deviceScope.deviceRevision, 2);
  assert.deepEqual(events.map(event => event.seq), [1, 2, 3]);
  assert.equal(value.calls[0].receiver, value.bus);
  assert.deepEqual(value.calls[0].args, [1, 9, 42]);
  const staleQueue = value.bus.queue;
  dispose(); assert.equal(value.bus.queue, original);
  staleQueue.call(value.bus, 1, 9); assert.equal(events.length, 3);
  assert.equal(value.calls.length, 6);
});
test('device bus limits preserve all firmware events and bound the host channel', () => {
  const value = board(), events = [];
  let clock = 0;
  const dispose = observeButtonBus({board: value, deviceScope: scope, emit: event => events.push(event), now: () => clock});
  for (let index = 0; index < 40; index++) value.bus.queue(1, 9);
  assert.equal(events.length, deviceRuntimeLimits.eventsPerSecond);
  for (let index = 0; index < 1100; index++) { clock += 1000; value.bus.queue(2, 9); }
  assert.equal(events.length, deviceRuntimeLimits.eventsPerRun);
  assert.equal(value.calls.length, 1140);
  dispose();
});
test('host failure and wrong receiver never alter the original queue result', () => {
  const value = board(), events = [];
  const dispose = observeButtonBus({board: value, deviceScope: scope, emit: event => { events.push(event); throw new Error('closed'); }, now: () => 0});
  assert.equal(value.bus.queue(1, 9), 'original-result');
  assert.equal(value.bus.queue.call({}, 1, 9), 'original-result');
  assert.equal(events.length, 1);
  dispose();
});

async function compilerHarness() {
  const messages = [], compiled = [];
  class WorkerGlobalScope {}
  const self = new WorkerGlobalScope();
  self.addEventListener = () => {};
  self.postMessage = message => messages.push(JSON.parse(JSON.stringify(message)));
  const pack = {target: {id: 'microbit', versions: {}, bundledpkgs: {}}, targetConfig: {}, hexCache: {}};
  const pxt = {debug() {}, Cloud: {}, webConfig: {}, setAppTarget(value) { this.appTarget = value; }, setupSimpleCompile() {}, patchTS() {},
    SimpleHost: class { constructor(files) { this.files = files; } },
    MainPackage: class {
      constructor(host) { this.host = host; }
      async loadAsync() {}
      getTargetOptions() { return {hasHex: true}; }
      async getCompileOptionsAsync(target) { return {target, source: this.host.files['main.ts']}; }
      targetVersion() { return 'test'; }
    }};
  const context = vm.createContext({self, WorkerGlobalScope, location: {origin: 'http://runner.test'}, crypto: globalThis.crypto,
    TextEncoder, TextDecoder, Uint8Array, structuredClone, setTimeout, importScripts() {}, LZMA: {}, pxt,
    pxtc: {compile(options) { compiled.push(options); return {success: false, outfiles: {},
      diagnostics: Array.from({length: 140}, () => ({code: 123, fileName: 'main.ts', start: 4, length: 2, line: 0, column: 4, messageText: 'x'.repeat(3000)}))}; }},
    fetch: async () => ({ok: true, arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(pack)).buffer})});
  vm.runInContext(await readFile(new URL('../../src/targets/microbit/compiler-worker.js', import.meta.url), 'utf8'), context);
  const send = data => vm.runInContext('self.onmessage({data:' + JSON.stringify(data) + '})', context);
  const result = async id => {
    const end = Date.now() + 3000;
    while (!messages.some(message => message.id === id)) {
      if (Date.now() > end) throw new Error('Worker harness timeout');
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    return messages.find(message => message.id === id);
  };
  return {messages, compiled, send, result};
}
test('classic compiler preserves legacy requests and echoes immutable device identity with bounded source diagnostics', async () => {
  const worker = await compilerHarness();
  worker.send({id: 1, command: 'compile', source: 'basic.clearScreen()', native: false});
  const legacy = await worker.result(1);
  assert.equal(legacy.type, 'result');
  assert.equal(Object.hasOwn(legacy, 'deviceScope'), false);
  assert.match(legacy.result.compilerPackHash, /^[a-f0-9]{64}$/);
  const base = {sessionId: scope.sessionId, deviceId: scope.deviceId, deviceRevision: 2, requestId: 4};
  worker.send({id: 2, command: 'compile', source: 'bad', native: true, deviceScope: base});
  const scoped = await worker.result(2);
  assert.deepEqual(scoped.deviceScope, base);
  assert.equal(scoped.result.diagnostics.length, 128);
  assert.deepEqual(scoped.result.diagnostics[0], {code: 123, fileName: 'main.ts', start: 4, length: 2, line: 0, column: 4, messageText: 'x'.repeat(2048)});
  assert.equal(worker.compiled[1].target.isNative, true);
});
test('classic compiler rejects invalid scopes and UTF-8 overflow before touching PXT', async () => {
  const worker = await compilerHarness();
  const base = {sessionId: 'session', deviceId: 'device', deviceRevision: 0, requestId: 1};
  worker.send({id: 1, command: 'compile', source: 'ok', native: false, deviceScope: {...base, extra: true}});
  worker.send({id: 2, command: 'compile', source: 'á'.repeat(8193), native: false, deviceScope: base});
  worker.send({id: 3, command: 'network-probe', deviceScope: base});
  assert.equal((await worker.result(1)).type, 'error');
  assert.equal((await worker.result(2)).type, 'error');
  assert.equal((await worker.result(3)).type, 'error');
  assert.equal(worker.compiled.length, 0);
});
