import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {siteVersion, swManifest} from '../../tools/sw-manifest.mjs';
import {finishSite} from '../../tools/site.mjs';

const SITE = ['index.html', 'editor.html', 'simulator.html', 'sim-inner.html', 'pxtsim.js', 'sim.js', 'missions/atrapa-la-fruta.md', 'vs/editor.js',
  'docs/static/fondo.png', 'docs/static/gg-logo.png', 'docs/static/icons/favicon.ico', 'rtlsemantic.css', 'pxtembed.js', 'sw.js', 'sw-manifest.json'];

test('el manifiesto incluye lo que necesita el simulador y excluye docs/', () => {
  const {version, files} = swManifest(SITE, 'v1');
  assert.equal(version, 'v1');
  for (const file of ['simulator.html', 'sim-inner.html', 'pxtsim.js', 'sim.js', 'editor.html', 'index.html', 'missions/atrapa-la-fruta.md', 'vs/editor.js']) assert.ok(files.includes(file), file);
  assert.ok(!files.includes('docs/static/fondo.png'));
});
test('conserva los iconos de marca y deja fuera lo que el estudio no usa', () => {
  const {files} = swManifest(SITE, 'v1');
  for (const file of ['docs/static/gg-logo.png', 'docs/static/icons/favicon.ico']) assert.ok(files.includes(file), file);
  for (const file of ['rtlsemantic.css', 'pxtembed.js', 'sw.js', 'sw-manifest.json']) assert.ok(!files.includes(file), file);
});
test('la versión cambia con el contenido y no con el orden', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gg-sw-'));
  writeFileSync(join(dir, 'a.js'), 'uno');
  writeFileSync(join(dir, 'b.js'), 'dos');
  const antes = siteVersion(dir, ['a.js', 'b.js']);
  assert.equal(siteVersion(dir, ['b.js', 'a.js']), antes);
  writeFileSync(join(dir, 'a.js'), 'tres');
  assert.notEqual(siteVersion(dir, ['a.js', 'b.js']), antes);
});
test('el acabado sella sw.js con la versión del manifiesto, también al repetirse', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gg-sw-'));
  const site = join(dir, 'site'), studio = join(dir, 'studio');
  mkdirSync(site);
  mkdirSync(studio);
  writeFileSync(join(site, 'index.html'), '<title>x</title>');
  writeFileSync(join(site, 'target.json'), JSON.stringify({blocksprj: {config: {}, files: {}}, versions: {target: '1'}}));
  writeFileSync(join(studio, 'index.html'), 'portada');
  writeFileSync(join(studio, 'sw.js'), "const VERSION = '__GG_VERSION__';");
  finishSite(site, studio);
  const {version} = JSON.parse(readFileSync(join(site, 'sw-manifest.json'), 'utf8'));
  assert.equal(readFileSync(join(site, 'sw.js'), 'utf8'), `const VERSION = '${version}';`);
  finishSite(site, studio);
  assert.equal(JSON.parse(readFileSync(join(site, 'sw-manifest.json'), 'utf8')).version, version);
});
