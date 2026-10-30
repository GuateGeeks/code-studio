import test from 'node:test';
import assert from 'node:assert/strict';
import {configuredOrigins, auxiliaryServer} from '../browser/origins.mjs';

const base = (shell) => ({
  GG_SHELL_PORT: String(shell), GG_RUNNER_PORT: String(shell + 1), GG_SIMULATOR_PORT: String(shell + 2),
  GG_LANGUAGE_PORT: String(shell + 3), GG_SCENE3D_PORT: String(shell + 8), GG_WEBAPP_PORT: String(shell + 9)
});
const roles = ['SHELL', 'RUNNER', 'SIMULATOR', 'LANGUAGE', 'SCENE3D', 'WEBAPP'];
const portsOf = (env) => roles.map(role => Number(env[`GG_${role}_PORT`]));

test('ORIGINS-001 sin variables los orígenes son los de siempre', () => {
  const {origins, ports} = configuredOrigins({});
  assert.equal(origins.shellOrigin, 'http://127.0.0.1:4173');
  assert.equal(origins.runnerOrigin, 'http://127.0.0.1:4174');
  assert.equal(origins.simulatorOrigin, 'http://127.0.0.1:4175');
  assert.equal(origins.languageOrigin, 'http://127.0.0.1:4176');
  assert.equal(origins.scene3dOrigin, 'http://127.0.0.1:4181');
  assert.equal(origins.webappOrigin, 'http://127.0.0.1:4182');
  assert.deepEqual(ports, {shell: 4173, runner: 4174, simulator: 4175, language: 4176, scene3d: 4181, webapp: 4182});
});

test('ORIGINS-002 la base 5800 produce orígenes en 5800-5809', () => {
  const {origins, ports} = configuredOrigins(base(5800));
  assert.equal(origins.runnerOrigin, 'http://127.0.0.1:5801');
  assert.equal(origins.webappOrigin, 'http://127.0.0.1:5809');
  assert.equal(ports.scene3d, 5808);
});

test('ORIGINS-003 los servidores propios se desplazan 50, 60 y 70 sobre la base', () => {
  const offline = auxiliaryServer('offline', {});
  assert.equal(offline.origin, 'http://127.0.0.1:4223');
  assert.equal(offline.env.GG_WEBAPP_PORT, '4232');
  assert.equal(offline.ports.runner, 4224);
  assert.equal(auxiliaryServer('pilot', {}).origin, 'http://127.0.0.1:4233');
  assert.equal(auxiliaryServer('standalone', {}).origin, 'http://127.0.0.1:4243');
  for (const value of Object.values(offline.env)) assert.equal(typeof value, 'string');
});

test('ORIGINS-004 con base 4500 los tres bloques y la base no colisionan y caben en la centena', () => {
  const env = base(4500);
  const all = [portsOf(env), ...['offline', 'pilot', 'standalone'].map(slot => portsOf(auxiliaryServer(slot, env).env))].flat();
  assert.equal(all.length, 24);
  assert.equal(new Set(all).size, 24);
  assert.ok(all.every(port => port >= 4500 && port <= 4599));
  assert.equal(auxiliaryServer('standalone', env).origin, 'http://127.0.0.1:4570');
});

test('ORIGINS-005 un slot desconocido lanza un error', () => {
  assert.throws(() => auxiliaryServer('otro', {}), /slot/i);
});
