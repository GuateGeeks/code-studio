import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {verifyArtifact} from '../../src/device-transfer/protocol.mjs';
import {createUSBTransfer, recognizeMicrobit} from '../../src/device-transfer/usb-client.mjs';

const scope = {sessionId: 'session', deviceId: 'device', deviceRevision: 2, requestId: 3};
const hex = ':40000000' + '01'.repeat(64) + '80\n:00000001FF\n';
async function artifact(variant = 'v1') {
  const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hex))), byte => byte.toString(16).padStart(2, '0')).join('');
  return {scope: {...scope}, variant, hex, sha256, compilerPackHash: 'a'.repeat(64)};
}
const device = () => ({vendorId: 0x0d28, productId: 0x0204, serialNumber: '9901000012345678'});
class FakeDAP extends EventEmitter {
  static EVENT_PROGRESS = 'progress';
  constructor(transport) { super(); this.transport = transport; this.flashed = false; }
  async connect() { await this.transport.open(); }
  async dapInfo() { return '0253\0'; }
  async flash(buffer) { this.flashed = true; await this.transport.write(buffer); this.emit('progress', 1); }
  async disconnect() { await this.transport.close(); }
}
function harness(options = {}) {
  let requests = 0, target;
  const writes = [], states = [], raw = {packetSize: 64, async open() {}, async close() {}, async read() {}, async write(data) { writes.push(data); }};
  const usb = new EventTarget();
  usb.requestDevice = async () => { requests++; return device(); };
  const client = createUSBTransfer({usb, hasGesture: () => true, timeoutMs: 100,
    createTransport: () => raw, createDAPLink: transport => (target = new FakeDAP(transport)),
    onChange: value => states.push(value), ...options});
  return {client, usb, raw, writes, states, get requests() { return requests; }, get target() { return target; }};
}
test('transfer artifact is closed, scope-bound, checksum-checked and SHA-verified', async () => {
  const value = await artifact();
  assert.deepEqual(await verifyArtifact(value), value);
  await assert.rejects(verifyArtifact({...value, hex: value.hex.replace('80\n', '81\n')}), /checksum/);
  await assert.rejects(verifyArtifact({...value, sha256: 'b'.repeat(64)}), /hash/);
  await assert.rejects(verifyArtifact({...value, compiledJS: 'bad'}), /inválido/);
  await assert.rejects(verifyArtifact({...value, scope: {...scope, source: 'bad'}}), /ámbito/);
});
test('only reviewed microbit families and DAPLink releases pass compatibility', () => {
  assert.deepEqual(recognizeMicrobit(device(), '0253\0'), {variant: 'v1', label: 'micro:bit V1.5', firmware: '0253'});
  assert.throws(() => recognizeMicrobit(device(), '0241'), /Firmware/);
  assert.throws(() => recognizeMicrobit({...device(), serialNumber: '999900001234'}, '0253'), /Firmware/);
  assert.throws(() => recognizeMicrobit({...device(), vendorId: 1}, '0253'), /Placa/);
  assert.equal(recognizeMicrobit({...device(), serialNumber: '990500001234'}, '0257').variant, 'v2');
  assert.throws(() => recognizeMicrobit({...device(), serialNumber: '990500001234'}, '0258-beta3'), /Firmware/);
});
test('preparation never opens USB; connect and transfer each require a gesture', async () => {
  const value = harness();
  await value.client.setArtifact(await artifact());
  assert.equal(value.requests, 0);
  await value.client.connect();
  assert.equal(value.requests, 1); assert.equal(value.writes.length, 0);
  assert.equal(value.client.state().status, 'connected');
  await value.client.flash();
  assert.equal(value.client.state().status, 'complete');
  assert.equal(value.writes.length, 1);
  assert.equal(new TextDecoder().decode(value.writes[0]), hex);
  value.client.dispose();
  const denied = harness({hasGesture: () => false});
  await denied.client.setArtifact(await artifact());
  await assert.rejects(denied.client.connect(), /clic/); assert.equal(denied.requests, 0);
  denied.client.dispose();
});
test('variant mismatch prevents writes and disconnects the selected transport', async () => {
  const value = harness(); let closes = 0;
  value.raw.close = async () => closes++;
  await value.client.setArtifact(await artifact('v2'));
  await assert.rejects(value.client.connect(), /variante/);
  assert.equal(value.writes.length, 0); assert.equal(closes, 1);
  assert.equal(value.client.state().status, 'error');
  value.client.dispose();
});
test('cancel while selecting prevents opening or flashing the later selected device', async () => {
  let choose, opens = 0;
  const value = harness({usb: {requestDevice: () => new Promise(resolve => { choose = resolve; })}});
  value.raw.open = async () => opens++;
  await value.client.setArtifact(await artifact());
  const pending = value.client.connect();
  value.client.cancel();
  await assert.rejects(pending, /cancelada/);
  choose(device()); await Promise.resolve();
  assert.equal(opens, 0); assert.equal(value.client.state().status, 'cancelled');
  value.client.dispose();
});
test('cancel during an accepted write prevents every subsequent transport command and stale success', async () => {
  const value = harness(); let completeWrite, writes = 0;
  value.raw.write = () => { writes++; return new Promise(resolve => { completeWrite = resolve; }); };
  await value.client.setArtifact(await artifact()); await value.client.connect();
  value.target.flash = async buffer => { await value.target.transport.write(buffer); await value.target.transport.write(buffer); };
  const pending = value.client.flash();
  await Promise.resolve(); value.client.cancel();
  await assert.rejects(pending, /cancelada/);
  completeWrite(); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(writes, 1); assert.equal(value.client.state().status, 'cancelled');
  assert.equal(value.states.some(value => value.status === 'complete'), false);
  value.client.dispose();
});
test('disconnect and timeout become bounded errors with no successful transfer', async () => {
  const value = harness();
  await value.client.setArtifact(await artifact()); await value.client.connect();
  const event = new Event('disconnect'); event.device = device();
  // The actual USBDevice identity, not merely matching metadata, is required.
  value.usb.dispatchEvent(event); assert.equal(value.client.state().status, 'connected');
  value.target.flash = () => new Promise(() => {});
  await assert.rejects(value.client.flash(), /no responde/);
  assert.equal(value.client.state().status, 'error');
  value.client.dispose();
});
test('pinned real DAPjs streams the exact HEX through guarded WebUSB-shaped transport', async () => {
  const {DAPLink} = createRequire(import.meta.url)('dapjs');
  const writes = [], packets = []; let last, closed = 0;
  const transport = {packetSize: 64, async open() {}, async close() { closed++; },
    async write(data) {
      last = new Uint8Array(ArrayBuffer.isView(data) ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data);
      packets.push([...last]);
      if (last[0] === 0x8c) writes.push(...last.slice(2, 2 + last[1]));
    },
    async read() {
      const response = new Uint8Array(64); response[0] = last[0];
      if (last[0] === 2) response[1] = 1;
      if (last[0] === 0) {
        const text = new TextEncoder().encode('0253\0'); response[1] = text.length; response.set(text, 2);
      }
      return new DataView(response.buffer);
    }};
  const client = createUSBTransfer({usb: {requestDevice: async () => device()}, hasGesture: () => true,
    createTransport: () => transport, createDAPLink: guarded => new DAPLink(guarded), timeoutMs: 1000});
  await client.setArtifact(await artifact()); await client.connect(); await client.flash();
  assert.equal(client.state().status, 'complete');
  assert.equal(new TextDecoder().decode(Uint8Array.from(writes)), hex);
  assert.equal(packets.some(value => value[0] === 0x8a), true);
  assert.equal(packets.some(value => value[0] === 0x8b), true);
  assert.ok(closed >= 1); client.dispose();
});

test('top-level opener authenticates origin, popup source and nonce before handing off an immutable artifact', async () => {
  const {openDeviceTransfer} = await import('../../src/device-transfer/opener.mjs');
  const {MessageChannel} = await import('node:worker_threads');
  const listeners = new Set(), statuses = [], received = [];
  let childPort, openedURL, closed = 0;
  const popup = {close() { closed++; }, postMessage(message, origin, ports) {
    assert.equal(origin, 'http://studio.test');
    assert.equal(message.type, 'device-transfer-connect');
    childPort = ports[0];
    childPort.onmessage = event => {
      received.push(event.data);
      if (event.data.type === 'artifact') childPort.postMessage({type: 'status', version: 1, nonce: message.nonce, status: 'ready', error: null, progress: null});
    };
    childPort.start();
  }};
  const window = {crypto, location: {origin: 'http://studio.test'}, MessageChannel,
    open(url) { openedURL = url; return popup; }, addEventListener(_, listener) { listeners.add(listener); },
    removeEventListener(_, listener) { listeners.delete(listener); }, setTimeout, clearTimeout};
  const value = await artifact();
  const handle = openDeviceTransfer({artifact: value, window, releaseBase: '/releases/' + 'a'.repeat(64) + '/', onChange: state => statuses.push(state)});
  const nonce = new URL(openedURL).searchParams.get('nonce');
  const send = event => [...listeners].forEach(listener => listener(event));
  const ready = {data: {type: 'device-transfer-ready', version: 1, nonce}, origin: 'http://studio.test', source: popup, ports: []};
  send({...ready, origin: 'http://untrusted.test'});
  send({...ready, source: {}});
  send({...ready, data: {...ready.data, nonce: crypto.randomUUID()}});
  assert.equal(childPort, undefined);
  send(ready); await handle.ready;
  assert.equal(statuses.at(-1).status, 'ready');
  assert.deepEqual(received[0].artifact, value);
  handle.close(); await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(received.at(-1).type, 'cancel'); assert.equal(closed, 1);
  assert.equal(listeners.size, 0);
  childPort.close();
});
test('blocked popup reports a recoverable error and never creates a USB client', async () => {
  const {openDeviceTransfer} = await import('../../src/device-transfer/opener.mjs');
  const states = [];
  const window = {crypto, location: {origin: 'http://studio.test'}, open() { return null; },
    removeEventListener() {}, clearTimeout() {}};
  const handle = openDeviceTransfer({artifact: await artifact(), window, onChange: state => states.push(state)});
  await assert.rejects(handle.ready, /bloqueó/);
  assert.equal(states.at(-1).status, 'error');
});

test('USB progress is monotonic and bounded to percentage changes for large firmware', async () => {
  const value = harness();
  await value.client.setArtifact(await artifact()); await value.client.connect();
  value.target.flash = async () => {
    for (let index = 0; index < 10000; index++) value.target.emit('progress', index / 10000);
    value.target.emit('progress', 1); value.target.emit('progress', 0); value.target.emit('progress', Number.NaN);
  };
  await value.client.flash();
  const progress = value.states.filter(state => state.status === 'transferring').map(state => state.progress);
  assert.ok(progress.length <= 101);
  assert.deepEqual(progress, [...progress].sort((a, b) => a - b));
  assert.equal(value.client.state().status, 'complete');
  value.client.dispose();
});
