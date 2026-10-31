import test from 'node:test';
import assert from 'node:assert/strict';
import {findMission, missionFilter, watchMission} from '../../studio/mission.mjs';

const proyecto = (header, name = 'x') => ({header: {name, ...header}, text: {'pxt.json': JSON.stringify({name})}});
const registro = (header, at) => ({at, project: {header}});

test('solo descarta el proyecto vacío que PXT abre antes de la misión', () => {
  const filtro = missionFilter('Misión', new Set());
  assert.equal(filtro(proyecto({id: 'vacío'})), null);
  assert.ok(filtro(proyecto({id: 'm', tutorial: {}}, 'untitled')));
  assert.equal(filtro(proyecto({id: 'vacío'})), null);
});
test('conserva un proyecto real abierto en la sesión de misión', () => {
  const real = proyecto({id: 'a'}, 'Mi juego 1');
  assert.equal(missionFilter('Misión', new Set(['a']))(real), real);
});
test('conserva un archivo arrastrado durante la misión', () => {
  const filtro = missionFilter('Misión', new Set());
  filtro(proyecto({id: 'm', tutorial: {}}, 'untitled'));
  const arrastrado = proyecto({id: 'png'}, 'De otro');
  assert.equal(filtro(arrastrado), arrastrado);
});
test('nombra la misión, sin pisar lo que el estudiante le ponga después', () => {
  const filtro = missionFilter('Misión', new Set());
  assert.equal(filtro(proyecto({id: 'm', tutorial: {}}, 'untitled')).header.name, 'Misión');
  assert.equal(filtro(proyecto({id: 'm', tutorialCompleted: {}}, 'untitled')).header.name, 'Misión');
  assert.equal(filtro(proyecto({id: 'm', tutorialCompleted: {}}, 'Fruta Loca')).header.name, 'Fruta Loca');
});
test('no renombra una misión anterior que PXT abra al arrancar', () => {
  const anterior = proyecto({id: 'vieja', tutorialCompleted: {}}, 'Fruta Loca');
  assert.equal(missionFilter('Misión', new Set(['vieja']))(anterior), anterior);
});
test('encuentra la misión más reciente, terminada o no, sin contar las eliminadas', () => {
  const records = [
    registro({id: 'a', name: 'M', tutorial: {}}, 1),
    registro({id: 'b', name: 'M', tutorialCompleted: {}}, 3),
    registro({id: 'c', name: 'M', tutorial: {}, isDeleted: true}, 4),
    registro({id: 'd', name: 'Otra', tutorial: {}}, 5),
    registro({id: 'e', name: 'M'}, 6)
  ];
  assert.equal(findMission(records, 'M').project.header.id, 'b');
  assert.equal(findMission(records, 'Nada'), undefined);
});
test('avisa si la misión no arranca a tiempo y solo una vez', async () => {
  let fallos = 0;
  const responder = watchMission({timeout: 5, onFailed: () => fallos++});
  await new Promise(resolve => setTimeout(resolve, 20));
  responder(false);
  assert.equal(fallos, 1);
});
test('una respuesta correcta cancela el aviso', async () => {
  let fallos = 0;
  watchMission({timeout: 5, onFailed: () => fallos++})(true);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(fallos, 0);
});
test('una respuesta de error avisa de inmediato', () => {
  let fallos = 0;
  watchMission({onFailed: () => fallos++})(false);
  assert.equal(fallos, 1);
});
