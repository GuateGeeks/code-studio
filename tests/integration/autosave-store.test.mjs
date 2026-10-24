import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutosaveStore, autosaveByteLimit} from '../../src/autosave-store.mjs';

test('GG-SAVE-001: UTF-8 size and project validation fail before accessing durable storage', async () => {
  let opened = 0;
  let validated = 0;
  const store = createAutosaveStore({
    indexedDB: {open() { opened++; throw new DOMException('Denied', 'SecurityError'); }},
    validate(serialized) { validated++; if (serialized === 'forbidden project') throw new Error('Remote asset is not allowed'); }
  });
  // Character count is below the byte budget; UTF-8 bytes still exceed it.
  const oversized = 'é'.repeat(autosaveByteLimit / 2 + 1);
  await assert.rejects(store.save(oversized), error => error.code === 'invalid');
  assert.equal(validated, 0);
  await assert.rejects(store.save('forbidden project'), /Remote asset is not allowed/);
  assert.equal(validated, 1);
  assert.equal(opened, 0);
  store.close();
});

test('GG-SAVE-002: denied IndexedDB reports unavailable and never confirms a save', async () => {
  const serialized = '{"authoring":"still editable"}';
  const store = createAutosaveStore({
    indexedDB: {open() { throw new DOMException('Storage blocked', 'SecurityError'); }},
    validate: JSON.parse
  });
  const recovered = await store.load();
  assert.equal(recovered.status, 'unavailable');
  assert.match(recovered.warning, /exportar GGPROJ/);
  assert.equal(recovered.serialized, undefined);
  await assert.rejects(store.save(serialized), error => error.code === 'unavailable');
  store.close();
});

test('GG-SAVE-003: asynchronous validation preserves save order and rejection does not poison later operations', async () => {
  let finishSlow;
  const slow = new Promise(resolve => { finishSlow = resolve; });
  const events = [];
  const store = createAutosaveStore({
    indexedDB: {open() { events.push('open'); throw new DOMException('Storage blocked', 'SecurityError'); }},
    async validate(serialized) {
      events.push(`${serialized}:start`);
      if (serialized === 'slow') await slow;
      events.push(`${serialized}:end`);
    }
  });
  const first = store.save('slow');
  const second = store.save('fast');
  const outcomes = Promise.allSettled([first, second]);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events, ['slow:start']);
  finishSlow();
  assert.deepEqual((await outcomes).map(outcome => outcome.status), ['rejected', 'rejected']);
  assert.deepEqual(events, ['slow:start', 'slow:end', 'open', 'fast:start', 'fast:end', 'open']);
  assert.equal((await store.load()).status, 'unavailable');
  assert.equal(events.at(-1), 'open');
  store.close();
});
