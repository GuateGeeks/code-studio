import test from 'node:test';
import assert from 'node:assert/strict';
import {newProject, renameProject} from '../../studio/project.mjs';

const plantilla = {config: {name: '{0}', dependencies: {device: 'file:../device'}, files: ['main.blocks', 'main.ts']}, files: {'main.blocks': '<xml/>', 'main.ts': '', 'README.md': 'x'}, targetVersion: '4.2.1'};
const datos = {name: 'Mi juego 1', id: 'gg-1', headerId: 'h1', now: 100};

test('newProject sin archivos ni experiencia queda como hasta ahora', () => {
  const proyecto = newProject(plantilla, datos);
  assert.deepEqual(proyecto.text['main.blocks'], '<xml/>');
  assert.deepEqual(JSON.parse(proyecto.text['pxt.json']).ggProject, {id: 'gg-1', v: 1});
  assert.equal(proyecto.header.id, 'h1');
});

test('newProject reemplaza archivos y marca la experiencia', () => {
  const proyecto = newProject(plantilla, {...datos, experiencia: 'rescate-plano', files: {'main.ts': 'let x = 1', 'main.blocks': ''}});
  assert.equal(proyecto.text['main.ts'], 'let x = 1');
  assert.equal(proyecto.text['main.blocks'], '');
  assert.equal(proyecto.text['README.md'], 'x');
  const config = JSON.parse(proyecto.text['pxt.json']);
  assert.deepEqual(config.files, ['main.blocks', 'main.ts']);
  assert.deepEqual(config.ggProject, {id: 'gg-1', v: 1, experiencia: 'rescate-plano'});
  assert.equal(config.preferredEditor, 'blocksprj');
});

test('newProject no cambia la plantilla recibida', () => {
  newProject(plantilla, {...datos, experiencia: 'x', files: {'main.ts': 'cambio'}});
  assert.equal(plantilla.files['main.ts'], '');
});

test('renameProject conserva la marca de experiencia', () => {
  const proyecto = newProject(plantilla, {...datos, experiencia: 'rescate-plano'});
  const nuevo = renameProject(proyecto, 'Otro nombre');
  assert.equal(JSON.parse(nuevo.text['pxt.json']).ggProject.experiencia, 'rescate-plano');
  assert.equal(nuevo.header.name, 'Otro nombre');
});
