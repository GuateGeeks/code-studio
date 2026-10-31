import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync, mkdirSync, writeFileSync} from 'node:fs';
import {createServer as netServer} from 'node:net';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {connect} from 'node:net';
import {createServer} from '../../tools/serve.mjs';

const root = mkdtempSync(join(tmpdir(), 'gg-site-'));
mkdirSync(join(root, 'code-studio'));
writeFileSync(join(root, 'code-studio/index.html'), 'hola');
writeFileSync(join(root, '..', 'gg-secreto.txt'), 'no');

// fetch normalizes "..", so traversal has to go out as a raw request line.
const raw = (port, path) => new Promise(resolve => {
  const s = connect(port, '127.0.0.1', () => s.write(`GET ${path} HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n`));
  let out = ''; s.on('data', d => out += d); s.on('end', () => resolve(out));
});
const withServer = async fn => {
  const server = createServer(root);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try { await fn(server.address().port); } finally { server.close(); }
};

test('sirve el sitio bajo /code-studio/', () => withServer(async port => {
  const r = await fetch(`http://127.0.0.1:${port}/code-studio/`);
  assert.equal(await r.text(), 'hola');
}));
test('la raíz redirige a /code-studio/', () => withServer(async port => {
  const r = await fetch(`http://127.0.0.1:${port}/`, {redirect: 'manual'});
  assert.equal(r.headers.get('location'), '/code-studio/');
}));
test('rechaza rutas fuera de la raíz', () => withServer(async port => {
  assert.match(await raw(port, '/../gg-secreto.txt'), /^HTTP\/1\.1 404/);
}));
test('con el puerto ocupado termina con mensaje en español', async () => {
  const busy = netServer();
  await new Promise(r => busy.listen(0, '127.0.0.1', r));
  const child = spawn(process.execPath, ['tools/serve.mjs'], {env: {...process.env, GG_PORT: busy.address().port}});
  let err = ''; child.stderr.on('data', d => err += d);
  const code = await new Promise(r => child.on('exit', r));
  busy.close();
  assert.equal(code, 1);
  assert.match(err, /ocupado/);
});
