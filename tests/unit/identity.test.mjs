import test from 'node:test';
import assert from 'node:assert/strict';
import {readId, resolveIdentity, stampIdentity} from '../../studio/identity.mjs';

const proyecto = (id, headerId = 'h') => ({header: {id: headerId}, text: {'pxt.json': JSON.stringify(id ? {name: 'x', ggProject: {id, v: 1}} : {name: 'x'})}});

test('lee el ID de pxt.json', () => {
  assert.equal(readId(proyecto('gg-1')), 'gg-1');
  assert.equal(readId(proyecto()), null);
});
test('un pxt.json ilegible no tiene ID', () => {
  assert.equal(readId({text: {'pxt.json': '{'}}), null);
});
test('sella sin cambiar el proyecto original', () => {
  const original = proyecto();
  const sellado = stampIdentity(original, 'gg-2', 'gg-1');
  assert.deepEqual(JSON.parse(sellado.text['pxt.json']).ggProject, {id: 'gg-2', v: 1, derivedFrom: 'gg-1'});
  assert.equal(readId(original), null);
});
test('un proyecto sin ID recibe uno nuevo', () => {
  assert.deepEqual(resolveIdentity(proyecto(), new Map(), () => 'gg-9'), {id: 'gg-9'});
});
test('un PNG importado con ID ya presente recibe otro y guarda el origen', () => {
  const known = new Map([['gg-1', 'header-a']]);
  assert.deepEqual(resolveIdentity(proyecto('gg-1', 'header-b'), known, () => 'gg-2'), {id: 'gg-2', derivedFrom: 'gg-1'});
});
test('el mismo header conserva su ID', () => {
  const known = new Map([['gg-1', 'header-a']]);
  assert.deepEqual(resolveIdentity(proyecto('gg-1', 'header-a'), known, () => 'x'), {id: 'gg-1'});
});
