import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const catalogo = JSON.parse(readFileSync('games/catalogo.json', 'utf8'));
const cnb = new Set(JSON.parse(readFileSync('tests/fixtures/cnb-sexto-ids.json', 'utf8')));
const MECANICAS = ['moverse', 'ordenar', 'clasificar', 'decidir', 'leer'];

test('el fixture del CNB tiene 834 ids únicos', () => {
  assert.equal(cnb.size, 834);
});

test('hay 12 entradas con id único', () => {
  assert.equal(catalogo.length, 12);
  assert.equal(new Set(catalogo.map(juego => juego.id)).size, 12);
});

test('cada entrada trae todos sus campos', () => {
  for (const juego of catalogo) {
    for (const campo of ['id', 'titulo', 'area', 'situacion', 'mecanica', 'resultado']) assert.equal(typeof juego[campo], 'string', `${juego.id}.${campo}`);
    assert.match(juego.id, /^[a-z0-9-]+$/);
    assert.ok(MECANICAS.includes(juego.mecanica), juego.id);
    assert.ok(juego.contenidos.length > 0, juego.id);
  }
});

test('cumple las cuotas por área', () => {
  const cuenta = area => catalogo.filter(juego => juego.area === area).length;
  for (const area of ['mat', 'cnt', 'ccss']) assert.ok(cuenta(area) >= 2, area);
  assert.ok(cuenta('l1') + cuenta('l3') >= 2, 'idioma');
  for (const area of ['art', 'ef', 'fc', 'pyd']) assert.ok(cuenta(area) >= 1, area);
});

test('L 2 queda fuera', () => {
  assert.equal(catalogo.some(juego => juego.area === 'l2' || juego.contenidos.some(id => id.startsWith('l2:'))), false);
});

test('hay 25 contenidos y todos existen en el CNB', () => {
  const todos = catalogo.flatMap(juego => juego.contenidos);
  assert.equal(todos.length, 25);
  for (const id of todos) assert.ok(cnb.has(id), id);
});

test('area coincide con el prefijo de sus contenidos', () => {
  for (const juego of catalogo) for (const id of juego.contenidos) assert.equal(id.split(':')[0], juego.area, juego.id);
});

test('Rescate y Cuentas declaran que repiten Sócrates, y solo ellos', () => {
  const repiten = catalogo.filter(juego => juego.repiteSocrates === true).map(juego => juego.id);
  assert.deepEqual(repiten, ['rescate-plano', 'cuentas-mayas']);
});

test('las mecánicas cubren 1,5,8 / 2 / 4,7,10 / 3,6,11,12 / 9', () => {
  const de = mecanica => catalogo.flatMap((juego, i) => (juego.mecanica === mecanica ? [i + 1] : []));
  assert.deepEqual(de('moverse'), [1, 5, 8]);
  assert.deepEqual(de('ordenar'), [2]);
  assert.deepEqual(de('clasificar'), [4, 7, 10]);
  assert.deepEqual(de('decidir'), [3, 6, 11, 12]);
  assert.deepEqual(de('leer'), [9]);
});

test('la cobertura parcial de fc:4.3.2 está declarada', () => {
  const mediacion = catalogo.find(juego => juego.id === 'mediacion-recreo');
  assert.deepEqual(mediacion.cobertura, {'fc:4.3.2': 'parcial'});
  assert.equal(catalogo.filter(juego => juego.cobertura).length, 1);
});

test('cada entrada tiene su carpeta y su solución', () => {
  for (const {id} of catalogo) {
    for (const archivo of ['main.ts', 'pxt.json', 'solucion.json']) assert.ok(existsSync(`games/${id}/${archivo}`), `games/${id}/${archivo}`);
  }
});
