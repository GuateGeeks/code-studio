import test from 'node:test';
import assert from 'node:assert/strict';
import {createDiagnosticConsole, diagnosticLimits} from '../../src/diagnostic-console.mjs';

const record = (overrides = {}) => ({level: 'info', code: 'GG-RUN-START', message: 'Inicio solicitado', origin: 'runner', sourceBlockId: 'hat-start', ...overrides});
const scope = () => ({sessionId: 'session-a', revision: 2, sourceIds: new Set(['hat-start', 'move'])});
const message = (seq, overrides = {}) => ({type: 'diagnostic', protocolVersion: 1, sessionId: 'session-a', revision: 2, seq, diagnostic: record(), ...overrides});

test('GG-CONSOLE-001: bounds and local truncation retain newest detached records', () => {
  const log = createDiagnosticConsole();
  const original = record({message: '<img src=x onerror=alert(1)>'});
  assert.equal(log.add(original), true);
  original.message = 'changed externally';
  const detached = log.snapshot();
  assert.equal(detached.entries[0].message, '<img src=x onerror=alert(1)>');
  detached.entries[0].message = 'changed snapshot';
  assert.notEqual(log.snapshot().entries[0].message, 'changed snapshot');
  for (let i = 0; i < 105; i++) assert.equal(log.add(record({message: String(i)})), true);
  const result = log.snapshot();
  assert.equal(result.entries.length, diagnosticLimits.entries);
  assert.equal(result.dropped, 6);
  assert.equal(result.entries[0].message, '5');
  assert.equal(result.entries.at(-1).message, '104');
  assert.equal(log.add(record({message: 'x'.repeat(2000)})), true);
  assert.equal(log.snapshot().entries.at(-1).message.length, diagnosticLimits.message);
  log.clear();
  assert.deepEqual(log.snapshot(), {entries: [], dropped: 0});
});

test('GG-CONSOLE-001: malformed metadata and oversized wire payloads are rejected without mutation', () => {
  const log = createDiagnosticConsole();
  const invalidRecords = [
    null, [], {}, record({level: 'debug'}), record({origin: 'vm'}), record({code: ''}),
    record({code: 'x'.repeat(65)}), record({message: ''}), record({message: 4}),
    record({sourceBlockId: ''}), record({sourceBlockId: 'x'.repeat(129)}),
    record({extra: 'unexpected'}), record({sourceBlockId: {id: 'hat-start'}})
  ];
  for (const diagnostic of invalidRecords) {
    assert.equal(log.add(diagnostic), false);
    assert.equal(log.accept(message(0, {diagnostic}), scope()), false);
  }
  assert.equal(log.accept(message(0, {diagnostic: record({message: 'x'.repeat(1025)})}), scope()), false);
  assert.equal(log.accept(message(0, {diagnostic: record({origin: 'shell'})}), scope()), false);
  assert.deepEqual(log.snapshot(), {entries: [], dropped: 0});
  assert.equal(log.accept(message(0), scope()), true);
});

test('GG-CONSOLE-002: session, revision, sequence and source membership gate the channel', () => {
  const log = createDiagnosticConsole();
  for (const overrides of [
    {sessionId: 'old-session'}, {revision: 1}, {revision: 3}, {protocolVersion: 2},
    {extra: 'unbounded envelope metadata'}, {seq: NaN}, {seq: 0.5}, {seq: -1}, {seq: Number.MAX_SAFE_INTEGER + 1}, {type: 'result'},
    {diagnostic: record({sourceBlockId: 'foreign-block'})}
  ]) assert.equal(log.accept(message(0, overrides), scope()), false);
  assert.equal(log.accept(message(0), {sessionId: null, revision: 2}), false);
  assert.equal(log.accept(message(0), {sessionId: 'session-a', revision: null}), false);
  assert.equal(log.accept(message(0), {...scope(), sourceIds: undefined}), false);
  assert.equal(log.accept(message(0), scope()), true);
  assert.equal(log.accept(message(0), scope()), false);
  assert.equal(log.accept(message(2), scope()), true);
  assert.equal(log.accept(message(1), scope()), false);
  assert.equal(log.snapshot().entries.length, 2);
  // Clearing the view cannot permit replay of an authenticated message.
  log.clear();
  assert.equal(log.accept(message(2), scope()), false);
  // A new revision still uses the same monotonically increasing channel.
  assert.equal(log.accept(message(3, {revision: 3}), {...scope(), revision: 3}), true);
  assert.equal(log.accept(message(4), {...scope(), revision: 3}), false);
  log.reset();
  assert.equal(log.accept(message(0, {sessionId: 'session-b'}), {...scope(), sessionId: 'session-b'}), true);
});

test('GG-CONSOLE-003: editing invalidates all source links; missing IDs remain valid unlinked diagnostics', () => {
  const log = createDiagnosticConsole();
  assert.equal(log.accept(message(0), scope()), true);
  assert.equal(log.add(record({origin: 'generation'})), true);
  log.invalidateSources();
  const entries = log.snapshot().entries;
  assert.equal(entries[0].sourceStale, true);
  assert.equal(entries[1].sourceStale, true);
  const noSource = record();
  delete noSource.sourceBlockId;
  assert.equal(log.accept(message(1, {diagnostic: noSource}), scope()), true);
  assert.equal(log.snapshot().entries.at(-1).sourceBlockId, undefined);
  assert.equal(log.accept(message(2), {...scope(), sourceIds: ['hat-start']}), true);
});

const textDocumentId = 'text-65fdfad1-cb3c-4bc9-9002-777c528a1253';
const textRecord = (overrides = {}) => ({level: 'error', code: 'TEXT_ERROR', origin: 'javascript', message: 'Source failed', sourceLocation: {documentId: textDocumentId, line: 2, column: 1}, ...overrides});

test('GG-TEXT-004: textual origins and source locations are cloned and local messages remain bounded', () => {
  const log = createDiagnosticConsole();
  const original = textRecord({message: 'x'.repeat(2000)});
  assert.equal(log.add(original), true);
  assert.equal(log.add(textRecord({origin: 'python', sourceLocation: {documentId: textDocumentId, line: 65537, column: 65537}})), true);
  assert.equal(log.add({level: 'info', code: 'PRINT', origin: 'python', message: 'Output without known line'}), true);
  original.sourceLocation.line = 99;
  const state = log.snapshot();
  assert.equal(state.entries[0].message.length, 1024);
  assert.equal(state.entries[0].sourceLocation.line, 2);
  assert.equal(state.entries[1].sourceLocation.line, 65537);
  state.entries[0].sourceLocation.documentId = 'changed';
  assert.equal(log.snapshot().entries[0].sourceLocation.documentId, textDocumentId);
  assert.equal(log.add(textRecord({sourceLocation: {documentId: textDocumentId, line: 1}})), true);
  assert.equal(Object.hasOwn(log.snapshot().entries.at(-1).sourceLocation, 'column'), false);
});

test('GG-TEXT-004: malformed locations and mixed Blockly/text attribution reject without changing console state', () => {
  const log = createDiagnosticConsole();
  for (const sourceLocation of [
    null, [], {}, {documentId: 'foreign', line: 1}, {documentId: textDocumentId},
    {documentId: textDocumentId, line: 0}, {documentId: textDocumentId, line: -1},
    {documentId: textDocumentId, line: 0.5}, {documentId: textDocumentId, line: NaN},
    {documentId: textDocumentId, line: 65538}, {documentId: textDocumentId, line: 1, column: 0},
    {documentId: textDocumentId, line: 1, column: 65538}, {documentId: textDocumentId, line: 1, column: undefined},
    {documentId: textDocumentId, line: 1, column: Infinity}, {documentId: textDocumentId, line: 1, file: 'unknown'},
    Object.create({documentId: textDocumentId, line: 1})
  ]) assert.equal(log.add(textRecord({sourceLocation})), false);
  assert.equal(log.add(textRecord({sourceBlockId: 'hat-start'})), false);
  for (const origin of ['runner', 'generation', 'shell', 'device']) assert.equal(log.add(textRecord({origin})), false);
  // Adding textual origins does not let them bypass the runner channel contract.
  assert.equal(log.accept(message(0, {diagnostic: textRecord()}), scope()), false);
  assert.deepEqual(log.snapshot(), {entries: [], dropped: 0});
});

test('GG-TEXT-004: origin-specific invalidation preserves unrelated textual and block links', () => {
  const log = createDiagnosticConsole();
  assert.equal(log.add(record()), true);
  assert.equal(log.add(record({origin: 'generation'})), true);
  assert.equal(log.add(textRecord()), true);
  assert.equal(log.add(textRecord({origin: 'python'})), true);
  log.invalidateSources('javascript');
  let entries = log.snapshot().entries;
  assert.equal(entries[0].sourceStale, undefined);
  assert.equal(entries[1].sourceStale, undefined);
  assert.equal(entries[2].sourceStale, true);
  assert.equal(entries[3].sourceStale, undefined);
  log.invalidateSources('runner');
  entries = log.snapshot().entries;
  assert.equal(entries[0].sourceStale, true);
  assert.equal(entries[1].sourceStale, undefined);
  assert.equal(entries[3].sourceStale, undefined);
  log.invalidateSources();
  assert.ok(log.snapshot().entries.every(entry => entry.sourceStale));
  log.clear();
  assert.deepEqual(log.snapshot(), {entries: [], dropped: 0});
});
