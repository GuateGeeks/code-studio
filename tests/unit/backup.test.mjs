import test from 'node:test';
import assert from 'node:assert/strict';
import {exportBackup, mergeRecords, parseBackup} from '../../studio/backup.mjs';

const registro = (at = 1, historia = 'h') => ({key: 'ana/a', student: 'ana', ggId: 'gg-1', at, project: {header: {id: 'a'}, text: {'main.ts': 'x', _history: historia}}});

test('la copia conserva _history', () => {
  const copia = parseBackup(exportBackup([registro()], 5));
  assert.equal(copia.ok, true);
  assert.equal(copia.records[0].project.text._history, 'h');
});
test('rechaza JSON roto', () => {
  assert.equal(parseBackup('{').ok, false);
});
test('rechaza otro formato', () => {
  assert.equal(parseBackup('{"format":"otro","records":[]}').ok, false);
});
test('rechaza registros sin proyecto', () => {
  assert.equal(parseBackup('{"format":"gg-backup","v":1,"records":[{"key":"a","student":"b"}]}').ok, false);
});
test('rechaza una versión futura', () => {
  assert.equal(parseBackup('{"format":"gg-backup","v":2,"records":[]}').ok, false);
});
test('restaurar no pisa un trabajo más reciente', () => {
  const {records, skipped} = mergeRecords([registro(9)], [registro(3)]);
  assert.deepEqual(records, []);
  assert.equal(skipped, 1);
});
test('restaurar recupera lo que falta o es más antiguo', () => {
  assert.equal(mergeRecords([], [registro(3)]).records.length, 1);
  assert.equal(mergeRecords([registro(1)], [registro(3)]).records.length, 1);
});
