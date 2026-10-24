import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContextEnvelope,validateContextPayload} from '../../src/contracts/context-channel.mjs';

const sessionId = '99ba7cd9-a1f8-4b0d-a506-565f3e4455db';
const scope = {sessionId, revision: 4, lastSequence: 7};
const envelope = (patch = {}) => ({protocolVersion: 1, sessionId, revision: 4, sequence: 8, requestId: 8, command: 'call', payload: {operationId: 'webapp.snapshot', args: {}}, ...patch});

test('GG-F6-CHANNEL: every renderer command requires the scoped protocol, session and revision', () => {
  for (const command of ['prepare', 'commit', 'call', 'snapshot', 'stop']) {
    const message = envelope({command});
    assert.equal(validateContextEnvelope(message, scope), message);
  }
  for (const patch of [
    {protocolVersion: 2}, {sessionId: '77ba7cd9-a1f8-4b0d-a506-565f3e4455db'}, {sessionId: 'not-a-uuid'},
    {revision: 3}, {revision: 5}, {revision: -1}, {revision: 4.1}, {command: 'evaluate'},
    {contextId: 'scene3d'}, {origin: 'trusted'}, {source: 'parent'}, {requestId: 9}
  ]) assert.throws(() => validateContextEnvelope(envelope(patch), scope), /Invalid context channel/);
});

test('GG-F6-CHANNEL: replayed, stale and nonintegral sequences cannot acquire request authority', () => {
  for (const sequence of [7, 6, -1, 8.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, '8']) {
    assert.throws(() => validateContextEnvelope(envelope({sequence, requestId: sequence}), scope), /Invalid context channel/);
  }
  const accepted = validateContextEnvelope(envelope(), scope);
  assert.throws(() => validateContextEnvelope(accepted, {...scope, lastSequence: accepted.sequence}), /Invalid context channel/);
  assert.equal(validateContextEnvelope(envelope({sequence: 9, requestId: 9}), {...scope, lastSequence: 8}).sequence, 9);
});

test('GG-F6-CHANNEL: the byte ceiling includes the envelope and counts UTF-8 rather than string characters', () => {
  const limit = 3 * 1024 * 1024, empty = envelope({payload: ''});
  const overhead = Buffer.byteLength(JSON.stringify(empty));
  const boundary = envelope({payload: 'x'.repeat(limit - overhead)});
  assert.equal(Buffer.byteLength(JSON.stringify(boundary)), limit);
  assert.equal(validateContextEnvelope(boundary, scope), boundary);
  assert.throws(() => validateContextEnvelope(envelope({payload: boundary.payload + 'x'}), scope), /Invalid context channel/);
  const unicode = envelope({payload: '🙂'.repeat(Math.ceil(limit / 4))});
  assert.ok(JSON.stringify(unicode).length < limit);
  assert.throws(() => validateContextEnvelope(unicode, scope), /Invalid context channel/);
});

test('GG-F6-CHANNEL: malformed structures cannot masquerade as context messages', () => {
  for (const value of [null, undefined, [], 'message', 1, {}, {...envelope(), unknown: true}]) {
    assert.throws(() => validateContextEnvelope(value, scope), /Invalid context channel/);
  }
  for (const field of ['protocolVersion', 'sessionId', 'revision', 'sequence', 'requestId', 'command', 'payload']) {
    const value = envelope(); delete value[field];
    assert.throws(() => validateContextEnvelope(value, scope), /Invalid context channel/);
  }
  const cycle = {}; cycle.self = cycle;
  assert.throws(() => validateContextEnvelope(envelope({payload: cycle}), scope), TypeError);
});

test('GG-F6-CHANNEL: command payloads are closed DTOs and never add authority or source code',()=>{
 for(const command of ['commit','snapshot','stop']){assert.deepEqual(validateContextPayload(command,{}),{});assert.throws(()=>validateContextPayload(command,{source:'eval me'}));}
 assert.deepEqual(validateContextPayload('prepare',{config:{},resources:{},capabilities:null}),{config:{},resources:{},capabilities:null});
 assert.deepEqual(validateContextPayload('call',{operationId:'webapp.snapshot',args:{}}),{operationId:'webapp.snapshot',args:{}});
 for(const value of [null,[],new Date(),'source',{}, {operationId:'webapp.snapshot',args:{},principal:'gg.webapps'}])assert.throws(()=>validateContextPayload('call',value));
 for(const command of ['prepare','call','commit','snapshot','stop'])assert.throws(()=>validateContextPayload(command,new Date()));
});
