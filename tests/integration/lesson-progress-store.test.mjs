import test from 'node:test';
import assert from 'node:assert/strict';
import {createLessonProgressStore, validateLessonProgress, lessonProgressDatabaseName} from '../../src/lesson-progress-store.mjs';

const record = () => ({version: 1, projectId: 'project-1', lessonId: 'story', lessonRevision: 1, completedStepIds: ['story-position']});
async function until(predicate) { for (let i = 0; i < 100 && !predicate(); i++) await new Promise(done => setTimeout(done, 1)); assert.ok(predicate()); }
test('GG-LESSON-001: progress accepts only known IDs/revision, excluding snapshots, source and runtime state', async () => {
  assert.equal(lessonProgressDatabaseName, 'gg-studio-lesson-progress');
  const input = record(); const result = validateLessonProgress(input); input.completedStepIds = [];
  assert.deepEqual(result.completedStepIds, ['story-position']);
  let opened = 0; const store = createLessonProgressStore({indexedDB: {open() { opened++; throw new Error('denied'); }}});
  for (const value of [{...record(), snapshot: {x: 60}}, {...record(), source: 'hello'}, {...record(), lessonRevision: 2},
    {...record(), completedStepIds: ['invented']}, {...record(), completedStepIds: Array(1)},
    {...record(), completedStepIds: ['story-position', 'story-position']}]) await assert.rejects(store.save(value));
  assert.equal(opened, 0); store.close();
});
test('GG-LESSON-001: unavailable progress storage does not pretend a save committed', async () => {
  const store = createLessonProgressStore({indexedDB: {open() { throw new DOMException('Denied', 'SecurityError'); }}});
  await assert.rejects(store.load('project-1', 'story'), /Puedes continuar/);
  await assert.rejects(store.save(record()), /Puedes continuar/); store.close();
});
test('GG-LESSON-001: an invalidated check waiting for database open never opens a write transaction', async () => {
  let request; let writes = 0; let current = true;
  const db = {objectStoreNames: {contains: () => true}, close() {}, transaction() { writes++; throw new Error('must not write'); }};
  const store = createLessonProgressStore({indexedDB: {open() { request = {}; return request; }}});
  const saving = store.save(record(), {isCurrent: () => current});
  await until(() => request); current = false; request.result = db; request.onsuccess();
  await assert.rejects(saving, /comprobación cambió/); assert.equal(writes, 0); store.close();
});
test('GG-LESSON-001: cancellation after put aborts its transaction before durable progress commits', async () => {
  let tx; let queued; let aborted = false; const durable = [];
  const db = {objectStoreNames: {contains: () => true}, close() {}, transaction() {
    tx = {objectStore() { return {put(value) { queued = structuredClone(value); return {}; }}; }, abort() { aborted = true; queueMicrotask(() => tx.onabort?.()); }}; return tx;
  }};
  const store = createLessonProgressStore({indexedDB: {open() { const request = {}; queueMicrotask(() => { request.result = db; request.onsuccess(); }); return request; }}});
  const abort = new AbortController(); const saving = store.save(record(), {signal: abort.signal});
  await until(() => queued); abort.abort();
  if (!aborted) { durable.push(queued); tx.oncomplete(); }
  await assert.rejects(saving, /comprobación cambió/); assert.deepEqual(durable, []); assert.equal(aborted, true); store.close();
});
