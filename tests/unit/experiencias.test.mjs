import test from 'node:test';
import assert from 'node:assert/strict';
import {CANAL, clearEstado, gameById, groupByArea, loadCatalog, parseEntry, parseEstado, playerUrl, recallStudent, reflectEstado, rememberStudent} from '../../studio/experiencias.mjs';

const bytes = value => new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value));
const elemento = () => ({dataset: {}});

test('el canal es el que usa la biblioteca', () => {
  assert.equal(CANAL, 'gg-experiencia');
});

test('parseEstado conserva solo campos conocidos', () => {
  assert.deepEqual(parseEstado(bytes({fase: 'aplicar', x: 1, __proto__: {y: 2}})), {fase: 'aplicar'});
  const completo = {fase: 'comprobar', serie: 'B', espera: 'eleccion', aciertos: 3, total: 5, paso: 12, avisos: 1, aprobado: false, final: false};
  assert.deepEqual(parseEstado(bytes(completo)), completo);
});

test('parseEstado rechaza JSON inválido y valores fuera de lista', () => {
  assert.equal(parseEstado(bytes('{no es json')), null);
  assert.equal(parseEstado(bytes('[1,2]')), null);
  assert.equal(parseEstado(bytes('null')), null);
  assert.equal(parseEstado(new Uint8Array([0xff, 0xfe, 0x00])), null);
  assert.equal(parseEstado('texto'), null);
  assert.deepEqual(parseEstado(bytes({fase: 'otra', serie: 'C', espera: 'x', aciertos: -1, total: 1.5, paso: '3', avisos: null, aprobado: 'si', final: 1})), {});
});

test('parseEstado acepta tildes en UTF-8 sin romper el resto', () => {
  assert.deepEqual(parseEstado(bytes('{"fase":"reflexionar","nota":"Todavía no","paso":2}')), {fase: 'reflexionar', paso: 2});
});

test('parseEstado descarta mensajes demasiado grandes', () => {
  assert.equal(parseEstado(bytes({fase: 'explorar', relleno: 'x'.repeat(5000)})), null);
});

test('reflectEstado escribe en dataset y clearEstado limpia solo lo suyo', () => {
  const el = elemento();
  el.dataset.estado = 'jugando';
  reflectEstado(el, {fase: 'aplicar', aciertos: 2, aprobado: false});
  assert.deepEqual(el.dataset, {estado: 'jugando', fase: 'aplicar', aciertos: '2', aprobado: 'false'});
  clearEstado(el);
  assert.deepEqual(el.dataset, {estado: 'jugando'});
});

test('gameById no acepta un id fuera del catálogo', () => {
  const catalogo = [{id: 'rescate-plano', titulo: 'R'}];
  assert.equal(gameById(catalogo, 'rescate-plano').titulo, 'R');
  for (const raro of ['../x', '', 'constructor', '__proto__', null, undefined, 3, ['rescate-plano']]) assert.equal(gameById(catalogo, raro), null, String(raro));
});

test('playerUrl lleva el id', () => {
  assert.equal(playerUrl('rescate-plano'), 'player.html?juego=rescate-plano');
});

const juego = (id, area) => ({id, titulo: id, area});

test('groupByArea sigue el orden del CNB, agrupa y omite las áreas sin juegos', () => {
  const grupos = groupByArea([juego('b', 'pyd'), juego('a', 'mat'), juego('c', 'l3'), juego('d', 'mat'), juego('e', 'ccss')]);
  assert.deepEqual(grupos.map(grupo => grupo.area), ['mat', 'ccss', 'l3', 'pyd']);
  assert.deepEqual(grupos[0].juegos.map(entrada => entrada.id), ['a', 'd']);
  assert.deepEqual(grupos.map(grupo => grupo.nombre), ['Matemáticas', 'Ciencias Sociales', 'Comunicación y Lenguaje L 3', 'Productividad y Desarrollo']);
});

test('groupByArea con el catálogo completo da las 9 áreas del orden fijo', () => {
  const todas = ['pyd', 'fc', 'ef', 'art', 'l3', 'l1', 'ccss', 'cnt', 'mat'].map(area => juego(area, area));
  assert.deepEqual(groupByArea(todas).map(grupo => grupo.area), ['mat', 'cnt', 'ccss', 'l1', 'l3', 'art', 'ef', 'fc', 'pyd']);
  assert.deepEqual(groupByArea(todas).map(grupo => grupo.nombre), ['Matemáticas', 'Ciencias Naturales y Tecnología', 'Ciencias Sociales', 'Comunicación y Lenguaje L 1', 'Comunicación y Lenguaje L 3', 'Expresión Artística', 'Educación Física', 'Formación Ciudadana', 'Productividad y Desarrollo']);
});

test('groupByArea no pierde un juego de un área desconocida', () => {
  assert.equal(groupByArea([juego('x', 'otra')]).flatMap(grupo => grupo.juegos).length, 1);
});

test('loadCatalog lee el catálogo y falla si la respuesta no es buena', async () => {
  const bueno = async url => ({ok: true, json: async () => [{id: url}]});
  assert.deepEqual(await loadCatalog(bueno), [{id: 'games/catalogo.json'}]);
  await assert.rejects(loadCatalog(async () => ({ok: false, status: 404})), /404/);
});

test('rememberStudent y recallStudent guardan en la clave gg-estudiante', () => {
  const guardado = {};
  const storage = {setItem: (clave, valor) => { guardado[clave] = valor; }, getItem: clave => guardado[clave] ?? null};
  rememberStudent(storage, 'Ana');
  assert.deepEqual(guardado, {'gg-estudiante': 'Ana'});
  assert.equal(recallStudent(storage, ['Ana', 'Beto']), 'Ana');
});

test('recallStudent solo devuelve un estudiante conocido', () => {
  const storage = {getItem: () => 'Ana'};
  assert.equal(recallStudent(storage, ['Beto']), null);
  assert.equal(recallStudent({getItem: () => null}, ['Beto']), null);
});

test('rememberStudent y recallStudent no lanzan si storage falla', () => {
  const roto = {setItem: () => { throw new Error('lleno'); }, getItem: () => { throw new Error('bloqueado'); }};
  assert.doesNotThrow(() => rememberStudent(roto, 'Ana'));
  assert.equal(recallStudent(roto, ['Ana']), null);
  assert.doesNotThrow(() => rememberStudent(undefined, 'Ana'));
  assert.equal(recallStudent(undefined, ['Ana']), null);
});

test('parseEntry lee ver y pantalla e ignora lo demás', () => {
  assert.deepEqual(parseEntry('?ver=rescate-plano'), {ver: 'rescate-plano'});
  assert.deepEqual(parseEntry('?pantalla=experiencias'), {pantalla: 'experiencias'});
  assert.deepEqual(parseEntry('?pantalla=otra&x=1'), {});
  assert.deepEqual(parseEntry(''), {});
  assert.deepEqual(parseEntry('?ver=../../x'), {});
  assert.deepEqual(parseEntry('?ver=A%20B'), {});
  assert.deepEqual(parseEntry('?ver=rescate-plano&pantalla=experiencias'), {ver: 'rescate-plano', pantalla: 'experiencias'});
});
