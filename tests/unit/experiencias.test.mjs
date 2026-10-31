import test from 'node:test';
import assert from 'node:assert/strict';
import {CANAL, clearEstado, gameById, parseEstado, playerUrl, reflectEstado} from '../../studio/experiencias.mjs';

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
