import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {checkSite, finishSite, foreignBrand, pruneSite, replaceProIcon} from '../../tools/site.mjs';

const sitio = files => {
  const dir = mkdtempSync(join(tmpdir(), 'gg-site-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(dir, name, '..'), {recursive: true});
    writeFileSync(join(dir, name), text);
  }
  return dir;
};

test('quita herramientas y documentación, y conserva el editor y sus recursos', () => {
  const dir = sitio({'index.html': 'x', 'kiosk.html': 'x', 'kiosk/a.js': 'x', 'docs/faq.html': 'x', 'docs/static/gg-logo.png': 'x', 'docs/static/logo/Microsoft.png': 'x', 'hexcache/a.hex': 'x'});
  pruneSite(dir);
  assert.equal(existsSync(join(dir, 'index.html')), true);
  assert.equal(existsSync(join(dir, 'docs/static/gg-logo.png')), true);
  for (const gone of ['kiosk.html', 'kiosk', 'docs/faq.html', 'docs/static/logo', 'hexcache']) assert.equal(existsSync(join(dir, gone)), false, gone);
});
test('resuelve los marcadores de cdn del index', () => {
  const dir = sitio({'index.html': '<link href="@cdnUrl@/blob/abc123/static/icons/favicon.ico">'});
  pruneSite(dir);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<link href="/code-studio/docs/static/icons/favicon.ico">');
});
test('quita el script de traducción en contexto de Crowdin', () => {
  const dir = sitio({'index.html': "<head><script type=\"text/javascript\">\nif (x) { _jipt.push(['project', 'makecode']); }\n</script><title>a</title></head>"});
  pruneSite(dir);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), '<head><title>a</title></head>');
});
test('detecta marcas ajenas en páginas y nombres de archivo, no en bundles', () => {
  const dir = sitio({'index.html': 'Microsoft MakeCode', 'main.js': 'MakeCode', 'docs/static/makecode.png': 'x', 'ok.html': 'hola'});
  assert.deepEqual(foreignBrand(dir).sort(), ['docs/static/makecode.png', 'index.html']);
});
test('publica la portada como index y mueve el editor', () => {
  const dir = sitio({'index.html': 'editor', 'target.json': JSON.stringify({versions: {target: '4.2.1'}, blocksprj: {config: {name: 'x'}, files: {'main.ts': ''}}})});
  const studio = sitio({'index.html': 'portada', 'studio.mjs': 'x'});
  finishSite(dir, studio);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), 'portada');
  assert.equal(readFileSync(join(dir, 'editor.html'), 'utf8'), 'editor');
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'project-template.json'), 'utf8')), {config: {name: 'x'}, files: {'main.ts': ''}, targetVersion: '4.2.1'});
});
test('repetir el acabado no pisa el editor', () => {
  const dir = sitio({'index.html': 'editor', 'target.json': JSON.stringify({versions: {target: '1'}, blocksprj: {config: {}, files: {}}})});
  const studio = sitio({'index.html': 'portada'});
  finishSite(dir, studio);
  finishSite(dir, studio);
  assert.equal(readFileSync(join(dir, 'editor.html'), 'utf8'), 'editor');
});
test('sustituye el icono de licencia comercial del simulador y no toca lo demás', () => {
  const sim = 'const a = 1;\nconst icon = `<svg viewBox="0 0 512 512"><!-- Font Awesome Pro 5.15.4 (Commercial License) --><path d="M1"/></svg>`;\nconst b = 2;';
  const limpio = replaceProIcon(sim);
  assert.doesNotMatch(limpio, /Font Awesome|M1/);
  assert.match(limpio, /^const a = 1;\nconst icon = `<svg [^`]+<\/svg>`;\nconst b = 2;$/);
  assert.equal(replaceProIcon(limpio), limpio);
});
test('retira imágenes de marcas ajenas y sustituye el favicon heredado', () => {
  const site = mkdtempSync(join(tmpdir(), 'gg-site-'));
  mkdirSync(join(site, 'images'));
  mkdirSync(join(site, 'docs/static/identity'), {recursive: true});
  mkdirSync(join(site, 'docs/static/icons'), {recursive: true});
  writeFileSync(join(site, 'images/windowsstorebag.png'), 'x');
  writeFileSync(join(site, 'images/newvisualstudiocode.png'), 'x');
  writeFileSync(join(site, 'docs/static/identity/logo.png'), 'x');
  writeFileSync(join(site, 'favicon.ico'), 'ajeno');
  writeFileSync(join(site, 'docs/static/icons/favicon.ico'), 'propio');
  pruneSite(site);
  for (const path of ['images/windowsstorebag.png', 'images/newvisualstudiocode.png', 'docs/static/identity']) assert.ok(!existsSync(join(site, path)), path);
  assert.equal(readFileSync(join(site, 'favicon.ico'), 'utf8'), 'propio');
});
test('el editor publicado solo carga scripts propios, también al repetir el acabado', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gg-site-'));
  const site = join(dir, 'site'), studio = join(dir, 'studio');
  mkdirSync(site);
  mkdirSync(studio);
  writeFileSync(join(site, 'index.html'), '<html><head><title>x</title></head></html>');
  writeFileSync(join(site, 'target.json'), JSON.stringify({blocksprj: {config: {}, files: {}}, versions: {target: '1'}}));
  writeFileSync(join(studio, 'index.html'), 'portada');
  finishSite(site, studio);
  finishSite(site, studio);
  const editor = readFileSync(join(site, 'editor.html'), 'utf8');
  assert.equal(editor.match(/Content-Security-Policy/g).length, 1);
  assert.match(editor, /<head><meta http-equiv="Content-Security-Policy" content="script-src 'self'/);
});
test('checkSite rechaza un juego del catálogo sin su .js o sin su .ts', () => {
  const completo = {'index.html': 'x', 'editor.html': 'x', 'simulator.html': 'x', 'sim-inner.html': 'x', 'pxtsim.js': 'x', 'sim.js': 'x', 'project-template.json': '{}', 'missions/atrapa-la-fruta.md': 'x', 'sw.js': 'x', 'sw-manifest.json': JSON.stringify({files: ['index.html']}), 'games/catalogo.json': JSON.stringify([{id: 'x'}])};
  assert.throws(() => checkSite(sitio(completo)), /Falta games\/x\.js/);
  assert.throws(() => checkSite(sitio({...completo, 'games/x.js': 'x'})), /Falta games\/x\.ts/);
  assert.doesNotThrow(() => checkSite(sitio({...completo, 'games/x.js': 'x', 'games/x.ts': 'x'})));
  const sinCatalogo = {...completo};
  delete sinCatalogo['games/catalogo.json'];
  assert.throws(() => checkSite(sitio(sinCatalogo)), /Falta games\/catalogo\.json/);
});
