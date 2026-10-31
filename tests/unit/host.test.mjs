import test from 'node:test';
import assert from 'node:assert/strict';
import {createHost} from '../../studio/host.mjs';

const memoria = (inicial = []) => {
  const records = [...inicial];
  return {records,
    list: async student => records.filter(r => r.student === student),
    all: async () => records,
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
test('un guardado en curso queda con su estudiante aunque otro entre mientras tanto', async () => {
  let liberar;
  const retenido = new Promise(resolve => { liberar = resolve; });
  const store = memoria();
  const put = store.put;
  store.put = async record => { await retenido; return put(record); };
  const ana = ventana(), luis = ventana();
  const hostAna = createHost({store, student: 'ana', target: ana});
  const guardado = guardar(hostAna, ana, proyecto('a'));
  createHost({store, student: 'luis', target: luis});
  liberar();
  await guardado;
  assert.deepEqual(store.records.map(r => [r.key, r.student]), [['ana/a', 'ana']]);
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
test('flushed informa del fallo y un guardado correcto posterior lo limpia', async () => {
  const store = memoria();
  const put = store.put;
  store.put = async () => { throw new Error('lleno'); };
  const target = ventana();
  const host = createHost({store, student: 'ana', target});
  await guardar(host, target, proyecto('a'));
  assert.deepEqual(await host.flushed(), {ok: false});
  store.put = put;
  await guardar(host, target, proyecto('a'));
  assert.deepEqual(await host.flushed(), {ok: true});
});
const responder = (target, extra) => { target.postMessage = m => queueMicrotask(() => target.host.handle({source: target, data: {...m, ...extra}})); };
test('requestSave termina bien cuando el editor confirma', async () => {
  const target = ventana();
  target.host = createHost({store: memoria(), student: 'ana', target});
  responder(target, {success: true});
  assert.deepEqual(await target.host.requestSave(), {ok: true});
});
test('requestSave falla si el editor responde success false', async () => {
  const target = ventana();
  target.host = createHost({store: memoria(), student: 'ana', target});
  responder(target, {success: false});
  assert.deepEqual(await target.host.requestSave(), {ok: false});
});
test('requestSave falla si se agota el tiempo', async () => {
  const target = ventana();
  const host = createHost({store: memoria(), student: 'ana', target, saveTimeout: 5});
  assert.deepEqual(await host.requestSave(), {ok: false});
});
test('eliminar conserva el texto guardado y avisa, sin fallar', async () => {
  const store = memoria();
  const target = ventana();
  const errores = [];
  let eliminado = 0;
  const host = createHost({store, student: 'ana', target, newId: () => 'gg-1', onSaveError: e => errores.push(e), onDeleted: () => eliminado++});
  await guardar(host, target, proyecto('a', 'mi código'));
  await guardar(host, target, {header: {id: 'a', isDeleted: true}, text: {}});
  assert.deepEqual(errores, []);
  assert.equal(eliminado, 1);
  assert.equal(store.records[0].project.text['main.ts'], 'mi código');
  assert.equal(store.records[0].project.header.isDeleted, true);
});
test('un guardado parcial conserva los archivos ya guardados', async () => {
  const store = memoria();
  const target = ventana();
  const host = createHost({store, student: 'ana', target, newId: () => 'gg-1'});
  await guardar(host, target, proyecto('a', 'uno'));
  await guardar(host, target, {header: {id: 'a'}, text: {'main.ts': 'dos'}});
  assert.deepEqual(await host.flushed(), {ok: true});
  assert.equal(store.records[0].project.text['main.ts'], 'dos');
  assert.ok(store.records[0].project.text['pxt.json']);
});
const conId = (id, headerId) => ({header: {id: headerId}, text: {'pxt.json': JSON.stringify({ggProject: {id, v: 1}})}});
test('derivedFrom se conserva en guardados siguientes', async () => {
  const store = memoria([{key: 'ana/a', student: 'ana', ggId: 'gg-1', project: conId('gg-1', 'a')}]);
  const target = ventana();
  const host = createHost({store, student: 'ana', target, newId: () => 'gg-2'});
  await guardar(host, target, conId('gg-1', 'b'));
  await guardar(host, target, conId('gg-1', 'b'));
  assert.deepEqual(JSON.parse(store.records[1].project.text['pxt.json']).ggProject, {id: 'gg-2', v: 1, derivedFrom: 'gg-1'});
});
test('un PNG pasado a otro estudiante del equipo recibe un ID nuevo', async () => {
  const store = memoria([{key: 'ana/a', student: 'ana', ggId: 'gg-1', project: conId('gg-1', 'a')}]);
  const target = ventana();
  const host = createHost({store, student: 'luis', target, newId: () => 'gg-2'});
  await guardar(host, target, conId('gg-1', 'b'));
  assert.equal(store.records[1].ggId, 'gg-2');
});
test('adopt descarta lo que no pertenece a la sesión y transforma lo demás', async () => {
  const store = memoria();
  const target = ventana();
  const adopt = project => (project.header.tutorial ? {...project, header: {...project.header, name: 'Misión'}} : null);
  const host = createHost({store, student: 'ana', target, adopt});
  await guardar(host, target, proyecto('vacío'));
  await host.flushed();
  assert.equal(store.records.length, 0);
  assert.equal(host.latest(), null);
  await guardar(host, target, {...proyecto('m'), header: {id: 'm', tutorial: {}}});
  assert.equal(store.records[0].project.header.name, 'Misión');
  assert.equal(host.latest().header.name, 'Misión');
});
test('un fallo de adopt avisa como cualquier guardado fallido', async () => {
  const target = ventana();
  let avisos = 0;
  const host = createHost({store: memoria(), student: 'ana', target, onSaveError: () => avisos++, adopt: () => { throw new Error('pxt.json inválido'); }});
  await guardar(host, target, proyecto('a'));
  assert.equal(avisos, 1);
  assert.deepEqual(await host.flushed(), {ok: false});
});
