import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {foreignBrand, pruneSite} from '../../tools/site.mjs';

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
