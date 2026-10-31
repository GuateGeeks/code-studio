import {test, expect} from '@playwright/test';
import {mkdirSync, mkdtempSync, readdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createServer} from '../../tools/serve.mjs';
import {ejecutar, editorDe, entrarComo, registros} from './helpers.mjs';

const PORT = 5320;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SITE = resolve('dist/site/code-studio');

test.use({serviceWorkers: 'allow'});

const iniciar = root => new Promise(ready => {
  const server = createServer(root);
  server.listen(PORT, '127.0.0.1', () => ready(server));
});
const detener = server => new Promise(done => {
  server.close(done);
  server.closeAllConnections();
});

// A published copy where only the service worker, its manifest and one file differ.
function otraVersion() {
  const root = mkdtempSync(join(tmpdir(), 'gg-v2-'));
  const site = join(root, 'code-studio');
  mkdirSync(site);
  const propios = ['sw.js', 'sw-manifest.json', 'project-template.json'];
  for (const name of readdirSync(SITE)) if (!propios.includes(name)) symlinkSync(join(SITE, name), join(site, name));
  const manifest = JSON.parse(readFileSync(join(SITE, 'sw-manifest.json'), 'utf8'));
  writeFileSync(join(site, 'sw-manifest.json'), JSON.stringify({...manifest, version: 'nueva'}));
  writeFileSync(join(site, 'sw.js'), readFileSync(join(SITE, 'sw.js'), 'utf8').replace(manifest.version, 'nueva'));
  writeFileSync(join(site, 'project-template.json'), JSON.stringify({version: 'nueva'}));
  return root;
}

const listo = page => expect(page.locator('#offline-status')).toContainText('sin internet', {timeout: 60000});
const plantilla = page => page.evaluate(() => fetch('project-template.json').then(response => response.json()));

test('tras una visita, el estudio funciona con el servidor apagado', {tag: '@recorrido'}, async ({page}) => {
  test.setTimeout(120000);
  let server = await iniciar(resolve('dist/site'));
  try {
    await page.goto(`${ORIGIN}/code-studio/`);
    await listo(page);
    await detener(server);
    server = null;

    const fallos = [];
    page.on('requestfailed', request => { if (request.url().startsWith(ORIGIN)) fallos.push(request.url()); });
    await page.reload();
    await entrarComo(page, 'Ana', ORIGIN);
    await page.getByRole('button', {name: 'Nuevo proyecto'}).click();
    const editor = editorDe(page);
    await editor.locator('.blocklyDraggable').first().waitFor({state: 'attached', timeout: 60000});
    await ejecutar(page, editor);
    await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();

    await entrarComo(page, 'Ana', ORIGIN);
    await page.getByRole('button', {name: 'Misión: Atrapa la fruta'}).click();
    await editor.getByRole('button', {name: 'Aceptar'}).click({timeout: 60000});
    await expect(editor.locator('.blocklyTreeRow', {hasText: 'Sprites'})).toHaveCount(1);
    await editor.getByRole('button', {name: /mostrar una pista/}).last().click();
    await expect(editor.locator('.tutorial-hint, .tutorialhint, [class*=hint] svg').first()).toBeAttached({timeout: 15000});
    await page.keyboard.press('Escape');
    await editor.getByRole('button', {name: 'Ir al siguiente paso del tutorial.'}).last().click();
    await expect.poll(async () => (await registros(page, 'Ana')).length, {timeout: 20000}).toBe(2);
    expect(fallos).toEqual([]);
  } finally {
    if (server) await detener(server);
  }
});

test('una publicación nueva no mezcla archivos en una pestaña abierta', async ({page, context}) => {
  test.setTimeout(120000);
  let server = await iniciar(resolve('dist/site'));
  try {
    await page.goto(`${ORIGIN}/code-studio/`);
    await listo(page);
    await page.reload();
    await detener(server);
    server = await iniciar(otraVersion());

    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await expect.poll(() => page.evaluate(async () => {
      const {installing, waiting} = await navigator.serviceWorker.getRegistration();
      return (installing ?? waiting)?.state;
    }), {timeout: 60000}).toBe('installed');
    expect((await plantilla(page)).version).toBeUndefined();

    // Closing the last tab lets the new version take over, whole.
    await page.close();
    const nueva = await context.newPage();
    await expect.poll(async () => {
      await nueva.goto(`${ORIGIN}/code-studio/`);
      return (await plantilla(nueva)).version;
    }, {timeout: 30000}).toBe('nueva');
  } finally {
    await detener(server);
  }
});
