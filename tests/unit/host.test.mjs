import test from 'node:test';
import assert from 'node:assert/strict';
import {createHost} from '../../studio/host.mjs';

const memoria = (inicial = []) => {
  const records = [...inicial];
  return {records,
    list: async student => records.filter(r => r.student === student),
    put: async record => { const i = records.findIndex(r => r.key === record.key); if (i >= 0) records[i] = record; else records.push(record); }};
};
const ventana = () => { const sent = []; return {sent, postMessage: m => sent.push(m)}; };
const proyecto = (id, code = 'x') => ({header: {id}, text: {'pxt.json': '{"name":"n"}', 'main.ts': code}});
const guardar = (host, target, project) => host.handle({source: target, data: {type: 'pxthost', action: 'workspacesave', project}});

test('workspacesync solo devuelve proyectos del estudiante', async () => {
  const store = memoria([{key: 'ana/a', student: 'ana', ggId: 'g', project: proyecto('a')}, {key: 'luis/b', student: 'luis', ggId: 'h', project: proyecto('b')}]);
  const target = ventana();
  await createHost({store, student: 'ana', target}).handle({source: target, data: {type: 'pxthost', action: 'workspacesync', id: '1', response: true}});
  assert.deepEqual(target.sent[0].projects.map(p => p.header.id), ['a']);
  assert.equal(target.sent[0].success, true);
});
test('workspacesave guarda bajo el estudiante del host, aunque otro ya esté activo', async () => {
  const store = memoria();
  const ana = ventana(), luis = ventana();
  const hostAna = createHost({store, student: 'ana', target: ana});
  createHost({store, student: 'luis', target: luis});
  await guardar(hostAna, ana, proyecto('a'));
  assert.equal(store.records[0].key, 'ana/a');
  assert.equal(store.records[0].student, 'ana');
});
test('sella la identidad al guardar y la conserva en guardados siguientes', async () => {
  const store = memoria();
  const target = ventana();
  const host = createHost({store, student: 'ana', target, newId: () => 'gg-1'});
  await guardar(host, target, proyecto('a', 'uno'));
  await guardar(host, target, proyecto('a', 'dos'));
  assert.equal(store.records.length, 1);
  assert.equal(store.records[0].ggId, 'gg-1');
  assert.equal(JSON.parse(store.records[0].project.text['pxt.json']).ggProject.id, 'gg-1');
  assert.equal(store.records[0].project.text['main.ts'], 'dos');
});
test('guardados simultáneos no pierden el último ni duplican identidad', async () => {
  const store = memoria();
  const target = ventana();
  let n = 0;
  const host = createHost({store, student: 'ana', target, newId: () => `gg-${++n}`});
  await Promise.all([guardar(host, target, proyecto('a', 'uno')), guardar(host, target, proyecto('a', 'dos'))]);
  assert.equal(store.records[0].project.text['main.ts'], 'dos');
  assert.equal(n, 1);
});
test('un fallo de escritura llama a onSaveError y no lanza', async () => {
  const errores = [];
  const store = {...memoria(), put: async () => { throw new Error('lleno'); }};
  const target = ventana();
  await guardar(createHost({store, student: 'ana', target, onSaveError: e => errores.push(e.message)}), target, proyecto('a'));
  assert.deepEqual(errores, ['lleno']);
});
test('ignora mensajes de otra ventana', async () => {
  const store = memoria();
  const target = ventana();
  await createHost({store, student: 'ana', target}).handle({source: {}, data: {type: 'pxthost', action: 'workspacesave', project: proyecto('a')}});
  assert.equal(store.records.length, 0);
});
test('avisa cuando el editor termina de cargar', async () => {
  const target = ventana();
  let listo = 0;
  await createHost({store: memoria(), student: 'ana', target, onLoaded: () => listo++}).handle({source: target, data: {type: 'pxthost', action: 'workspaceloaded', id: '1', response: true}});
  assert.equal(listo, 1);
  assert.equal(target.sent[0].success, true);
});
