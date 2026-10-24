import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {browserConfiguration, browserPolicy, browserContentType} from '../../tools/build/browser-policy.mjs';

const directive = (policy, name) => policy.split(';').map(part => part.trim()).find(part => part.startsWith(`${name} `));

test('text origin defaults to the fourth port and supports independent configuration', () => {
  assert.equal(browserConfiguration({}).origins.languageOrigin, 'http://127.0.0.1:4176');
  const manual = browserConfiguration({GG_SHELL_PORT: '4183', GG_RUNNER_PORT: '4184', GG_SIMULATOR_PORT: '4185'});
  assert.equal(manual.origins.languageOrigin, 'http://127.0.0.1:4186');
  assert.equal(browserConfiguration({GG_LANGUAGE_PORT: '4300'}).origins.languageOrigin, 'http://127.0.0.1:4300');
});

test('browser origins reject invalid ports and shared execution origins before listening', () => {
  for (const env of [{GG_LANGUAGE_PORT: '4173'}, {GG_LANGUAGE_PORT: '0'}, {GG_LANGUAGE_PORT: '65536'},
    {GG_LANGUAGE_PORT: '4176.5'}, {GG_LANGUAGE_PORT: 'invalid'}, {GG_SHELL_PORT: '65534'}]) {
    assert.throws(() => browserConfiguration(env), /six distinct valid ports/);
  }
});

test('text glue permissions do not relax shell, 2D runner or simulator script policies', () => {
  const {origins} = browserConfiguration({});
  assert.equal(directive(browserPolicy('shell', origins), 'script-src'), "script-src 'self'");
  assert.equal(directive(browserPolicy('runner', origins), 'script-src'), "script-src 'self'");
  assert.equal(directive(browserPolicy('simulator', origins), 'script-src'), "script-src 'self' 'unsafe-eval'");
  assert.equal(directive(browserPolicy('language', origins), 'script-src'), "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'");
});

test('only shell may embed the text role, and every role keeps connections local', () => {
  const {origins} = browserConfiguration({});
  assert.equal(directive(browserPolicy('shell', origins), 'frame-src'), `frame-src ${origins.runnerOrigin} ${origins.languageOrigin} ${origins.scene3dOrigin} ${origins.webappOrigin}`);
  assert.equal(directive(browserPolicy('runner', origins), 'frame-src'), `frame-src ${origins.simulatorOrigin}`);
  const text = browserPolicy('language', origins);
  assert.equal(directive(text, 'frame-src'), "frame-src 'none'");
  assert.equal(directive(text, 'frame-ancestors'), `frame-ancestors ${origins.shellOrigin}`);
  for (const role of ['shell', 'runner', 'simulator', 'language']) {
    const policy = browserPolicy(role, origins);
    assert.equal(directive(policy, 'connect-src'), "connect-src 'self'");
    assert.equal(directive(policy, 'worker-src'), "worker-src 'self'");
    assert.equal(directive(policy, 'object-src'), "object-src 'none'");
    assert.equal(directive(policy, 'base-uri'), "base-uri 'none'");
  }
  assert.throws(() => browserPolicy('unknown', origins), /Unknown browser role/);
});

test('WASM streaming and Python stdlib ZIP use exact binary MIME types', () => {
  assert.equal(browserContentType('/vendor/quickjs/emscripten-module.wasm'), 'application/wasm');
  assert.equal(browserContentType('/vendor/pyodide/python_stdlib.zip'), 'application/zip');
  assert.equal(browserContentType('/vendor/pyodide/pyodide.mjs'), 'text/javascript; charset=utf-8');
  assert.equal(browserContentType('/config.json'), 'application/json; charset=utf-8');
  assert.equal(browserContentType('/unknown'), 'application/octet-stream');
});

test('server exposes the isolated language role and origin configuration over HTTP', {timeout: 20000}, async t => {
  const reservations = [];
  const ports = [];
  try {
    for (let index = 0; index < 6; index++) {
      const reservation = createServer();
      await new Promise((done, reject) => { reservation.once('error', reject); reservation.listen(0, '127.0.0.1', done); });
      reservations.push(reservation);
      ports.push(reservation.address().port);
    }
  } finally {
    await Promise.all(reservations.map(server => new Promise(done => server.close(done))));
  }
  const child = spawn(process.execPath, [fileURLToPath(new URL('../../tools/f0/serve-browser.mjs', import.meta.url))], {
    env: {...process.env, GG_SHELL_PORT: String(ports[0]), GG_RUNNER_PORT: String(ports[1]),
      GG_SIMULATOR_PORT: String(ports[2]), GG_LANGUAGE_PORT: String(ports[3]), GG_SCENE3D_PORT:String(ports[4]), GG_WEBAPP_PORT:String(ports[5])},
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  t.after(async () => { if (child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); await exited; } });
  const languageOrigin = `http://127.0.0.1:${ports[3]}`;
  let healthy = false;
  for (let attempt = 0; attempt < 600; attempt++) {
    if (child.exitCode !== null) assert.fail(`Server exited: ${output}`);
    try { healthy = (await fetch(`${languageOrigin}/health`)).ok; } catch {}
    if (healthy) break;
    await new Promise(done => setTimeout(done, 25));
  }
  assert.equal(healthy, true, output);
  const response = await fetch(`${languageOrigin}/health`);
  assert.deepEqual(await response.json(), {role: 'language'});
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('permissions-policy'), /camera=\(\).*microphone=\(\)/);
  assert.equal(directive(response.headers.get('content-security-policy'), 'script-src'), "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'");
  const configuration = await (await fetch(`http://127.0.0.1:${ports[0]}/config.json`)).json();
  assert.equal(configuration.languageOrigin, languageOrigin);
  const shellResponse = await fetch(`${configuration.shellOrigin}/health`);
  assert.equal(directive(shellResponse.headers.get('content-security-policy'), 'script-src'), "script-src 'self'");
  assert.equal(directive(shellResponse.headers.get('content-security-policy'), 'frame-src'), `frame-src ${configuration.runnerOrigin} ${languageOrigin} ${configuration.scene3dOrigin} ${configuration.webappOrigin}`);
});
