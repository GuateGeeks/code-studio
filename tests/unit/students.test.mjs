import test from 'node:test';
import assert from 'node:assert/strict';
import {addStudent} from '../../studio/students.mjs';
import {newProject} from '../../studio/project.mjs';

test('acepta un nombre y quita espacios sobrantes', () => {
  assert.deepEqual(addStudent('  Ana   María ', []), {ok: true, name: 'Ana María'});
});
test('rechaza un nombre vacío', () => {
  assert.equal(addStudent('   ', []).ok, false);
});
test('rechaza un nombre demasiado largo', () => {
  assert.equal(addStudent('a'.repeat(41), []).ok, false);
});
test('un nombre igual sin distinguir mayúsculas es el mismo estudiante', () => {
  assert.deepEqual(addStudent('ANA', ['Ana']), {ok: true, name: 'Ana'});
});
test('un proyecto nuevo nace con nombre e identidad', () => {
  const template = {config: {name: 'x', dependencies: {device: '*'}, files: ['main.ts']}, files: {'main.ts': ''}, targetVersion: '4.2.1'};
  const {header, text} = newProject(template, {name: 'Mi juego', id: 'gg-1', headerId: 'h-1', now: 1000});
  assert.equal(header.id, 'h-1');
  assert.equal(header.name, 'Mi juego');
  assert.equal(header.target, 'arcade');
  assert.equal(header.editor, 'blocksprj');
  const config = JSON.parse(text['pxt.json']);
  assert.equal(config.name, 'Mi juego');
  assert.deepEqual(config.ggProject, {id: 'gg-1', v: 1});
  assert.equal(text['main.ts'], '');
});
