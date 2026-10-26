import test from 'node:test';
import assert from 'node:assert/strict';
import {projectContentHash, deriveContinuity, validateCopyRecord} from '../../src/project-continuity.mjs';
import {createAutosaveStore} from '../../src/autosave-store.mjs';

const projectId = '12345678-1234-4123-8123-123456789abc';
const model = {
  format: 'ggproj', version: 4, project: {id: projectId, name: 'Mi viaje', revision: 4, createdAt: '2026-10-25T20:00:00.000Z', updatedAt: '2026-10-25T20:01:00.000Z'},
  authoring: {blockly: {blocks: {blocks: [{id: 'start', x: 20, inputs: {DO: {block: {id: 'move', inputs: {STEPS: {shadow: {id: 'number', fields: {NUM: 5}}}}}}}}]}}, deviceSource: 'basic.showNumber(1)',
    textDocuments: [{id: 'text', source: 'hero.move(5)'}], selectedTextDocumentId: 'text'},
  capabilities: {locks: [{id: 'gg.sprites', version: '0.1.0'}]}, resources: {assets: {image: 'pixels'}}, locks: {engine: 'one'}
};
const record = {version: 1, projectId, contentHash: 'a'.repeat(64), requestedAt: '2026-10-25T20:01:00.000Z'};

test('PC-01: content identity ignores project dates/revision and object-key order only', async () => {
  const hash = await projectContentHash(model), before = structuredClone(model);
  const other = structuredClone(model); Object.assign(other.project, {revision: 99, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z'});
  other.project = Object.fromEntries(Object.entries(other.project).reverse());
  assert.equal(await projectContentHash(other), hash);
  assert.deepEqual(model, before);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test('PC-01: name, complete authoring including numeric IDs/layout, documents, resources and locks change the hash', async () => {
  const hash = await projectContentHash(model);
  for (const mutate of [
    value => { value.project.name = 'Otro'; },
    value => { value.authoring.blockly.blocks.blocks[0].x = 21; },
    value => { value.authoring.blockly.blocks.blocks[0].inputs.DO.block.inputs.STEPS.shadow.id = 'other'; },
    value => { value.authoring.deviceSource += ' '; },
    value => { value.authoring.textDocuments[0].source += ';'; },
    value => { value.authoring.selectedTextDocumentId = null; },
    value => { value.resources.assets.image = 'new pixels'; },
    value => { value.capabilities.locks[0].version = '0.2.0'; },
    value => { value.locks.engine = 'two'; }
  ]) {
    const next = structuredClone(model); mutate(next);
    assert.notEqual(await projectContentHash(next), hash);
  }
  const next = structuredClone(model); next.authoring.textDocuments.push({id: 'second', source: 'two'});
  const ordered = await projectContentHash(next);
  next.authoring.textDocuments.reverse();
  assert.notEqual(await projectContentHash(next), ordered);
});

test('PC-01/02: local failure and portable current/previous are independent, with no false current while hashing', () => {
  const result = deriveContinuity({local: 'failed', projectId, contentHash: record.contentHash, record});
  assert.equal(result.local, 'failed'); assert.equal(result.portable, 'current');
  assert.match(result.localMessage, /Sin guardar/);
  assert.match(result.portableMessage, /solicitada.*Comprueba/);
  assert.match(result.portableSummary, /solicitada a las [0-9]{2}:[0-9]{2}$/);
  assert.equal(deriveContinuity({local: 'saving', projectId, record}).portable, 'previous');
  assert.equal(deriveContinuity({local: 'saved', projectId, record, contentHash: 'b'.repeat(64)}).reminder, true);
  assert.equal(deriveContinuity({projectId, record, contentHash: record.contentHash, persisted: false}).persisted, false);
});

test('PC-04/06: optional record rejects missing, corrupt, foreign and future schemas without claiming a copy', () => {
  for (const invalid of [null, {}, {...record, version: 2}, {...record, projectId: 'unknown'},
    {...record, contentHash: 'z'.repeat(64)}, {...record, requestedAt: 'yesterday'}, {...record, hidden: true}]) {
    assert.equal(validateCopyRecord(invalid), null);
    assert.equal(deriveContinuity({projectId, record: invalid}).portable, 'unknown');
  }
  assert.equal(validateCopyRecord(record, '00000000-0000-4000-8000-000000000000'), null);
  const detached = validateCopyRecord(record); detached.contentHash = 'b'.repeat(64);
  assert.equal(record.contentHash, 'a'.repeat(64));
});

test('PC-06: metadata validation precedes IndexedDB and an unavailable record does not poison retries', async () => {
  let opens = 0;
  const store = createAutosaveStore({indexedDB: {open() { opens++; throw new DOMException('Denied', 'SecurityError'); }}, validate: JSON.parse});
  await assert.rejects(store.saveCopyRecord({...record, version: 2}), error => error.code === 'invalid-copy-record');
  assert.equal(opens, 0);
  assert.equal((await store.loadCopyRecord(projectId)).status, 'unavailable');
  await assert.rejects(store.saveCopyRecord(record), error => error.code === 'unavailable');
  assert.equal((await store.load()).status, 'unavailable');
  assert.equal(opens, 3);
  store.close();
});
