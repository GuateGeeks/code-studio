import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import JSZip from 'jszip';
import {clickVisible, revealPanel, settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {readStarterLibraryLock} from '../../tools/resources/starter-library.mjs';
import {decodeResourceAsset} from '../../src/contracts/resources.mjs';

const lock = readStarterLibraryLock(), entry = id => lock.entries.find(item => item.id === id);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const resources = page => page.evaluate(() => studioProbe.resourceStore.capture());
const library = page => page.locator('#starter-library');
const card = (page, id) => page.locator(`#starter-library-items li[data-entry="${id}"]`);
const isLibrary = url => new URL(url).pathname.endsWith('/starter-library.json');

async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(() => studioProbe.project.ready());
}
async function openLibrary(page) {
  await revealPanel(page, library(page));
  if (!await library(page).evaluate(node => node.open)) await clickVisible(page, page.locator('#starter-library > summary'));
  await expect(page.locator('#starter-library-status')).toHaveText(`${lock.entries.length} recursos disponibles. Elige qué mostrar y añade los que quieras.`);
}
async function show(page, kind) {
  const input = page.locator(`#starter-library-filter input[value="${kind}"]`);
  await input.scrollIntoViewIfNeeded(); await input.check();
  await expect(page.locator('#starter-library-items')).toHaveAttribute('data-kind', kind);
}
async function act(page, id, name, expected) {
  await clickVisible(page, card(page, id).getByRole('button', {name}));
  await expect(page.locator('#starter-library-status')).toHaveText(expected);
  await expect(page.locator('#cancel-resource-work')).toBeHidden();
  await expect(page.locator('#resources-error')).toBeEmpty();
}
const program = {blocks: {languageVersion: 0, blocks: [{type: 'gg_when_start', id: 'lib-start', x: 24, y: 24, inputs: {DO: {block:
  {type: 'gg_assets_set_costume', id: 'lib-costume', fields: {COSTUME: 'gato'}, next: {block: {type: 'gg_assets_play_sound', id: 'lib-sound', fields: {SOUND: 'sonido-salto'}}}}}}}]}};

test('GG-LIB-004/005/006/007: library loaded on demand, prepared offline, adds costume, sound and backdrop with the network off, runs only on request and reopens portable', async ({page: online, browser, context}) => {
  test.setTimeout(300000);
  const errors = [], requests = [];
  online.on('pageerror', error => errors.push(error.message));
  online.on('request', request => requests.push(request.url()));
  await open(online);
  expect(requests.filter(isLibrary), 'la biblioteca no se descarga al arrancar').toEqual([]);
  await openLibrary(online);
  expect(requests.filter(isLibrary)).toHaveLength(1);
  // The teacher prepares this browser; the library is part of the Studio cohort.
  await clickVisible(online, online.locator('#prepare-offline'));
  await expect(online.locator('#offline-status')).toHaveText('Preparación confirmada en este navegador', {timeout: 180000});
  const prepared = await online.evaluate(() => studioProbe.offline.state().current);
  await online.close();

  // New visit with the network off: everything comes from the prepared cohort.
  await context.setOffline(true);
  const page = await context.newPage(), failed = [], served = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push(request.url()));
  page.on('response', response => { if (isLibrary(response.url())) served.push(response.fromServiceWorker()); });
  await open(page);
  expect(new URL(page.url()).pathname).toBe(prepared.releaseBase);
  await openLibrary(page);
  expect(served).toEqual([true]);
  await expect(page.locator('#starter-library-items > li')).toHaveCount(lock.counts.costume);
  await expect(card(page, 'gato').locator('img')).toHaveJSProperty('complete', true);
  expect(await card(page, 'gato').locator('img').evaluate(image => image.naturalWidth)).toBe(96);
  const before = await snapshot(page), status = await page.evaluate(() => studioProbe.state().status);
  await act(page, 'gato', 'Añadir «Gato» a los disfraces', '«Gato» se añadió a los disfraces de hero. Elígelo en el bloque «disfraz».');
  await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
  await expect(card(page, 'gato').locator('.library-state')).toHaveText('En tu proyecto');
  await expect(page.locator('#resource-list')).toHaveValue('costumes|gato');
  await act(page, 'gato', 'Añadir «Gato» a los disfraces', '«Gato» ya está en tu proyecto.');
  await expect(page.locator('#resources-status')).toHaveText('Sin cambios de recursos');
  await show(page, 'sound');
  await expect(page.locator('#starter-library-items > li')).toHaveCount(lock.counts.sound);
  await act(page, 'sonido-salto', 'Añadir «Salto» a los sonidos', '«Salto» se añadió a los sonidos de hero. Úsalo con «iniciar sonido».');
  await show(page, 'backdrop');
  await expect(page.locator('#starter-library-items > li')).toHaveCount(lock.counts.backdrop);
  await expect(page.locator('#restore-backdrop')).toBeHidden();
  await act(page, 'teatro', 'Usar de fondo «Teatro» del escenario', '«Teatro» es ahora el fondo del escenario. Se verá al ejecutar.');
  await expect(card(page, 'teatro').locator('.library-state')).toHaveText('Fondo actual');
  await expect(page.locator('#restore-backdrop')).toBeVisible();

  // Nothing ran: same session state and transport status.
  expect(await page.evaluate(() => studioProbe.state().status)).toBe(status);
  const quiet = await snapshot(page);
  expect({x: quiet.x, costume: quiet.costume, threads: quiet.threads}).toEqual({x: before.x, costume: before.costume, threads: 0});
  const stored = await resources(page);
  expect(stored.costumes.find(item => item.id === 'gato')).toEqual({id: 'gato', ownerId: 'hero', name: 'Gato', assetId: entry('gato').sha256, centerX: 48, centerY: 48, bitmapResolution: 1});
  expect(stored.sounds.find(item => item.id === 'sonido-salto')).toEqual({id: 'sonido-salto', ownerId: 'hero', name: 'Salto', assetId: entry('sonido-salto').sha256});
  // With objects the stage keeps its backdrops; the chosen one is the one it starts with (4.1).
  expect(stored.costumes.filter(item => item.ownerId === 'stage').map(item => item.name)).toEqual(['stage', 'Teatro']);
  expect(stored.costumes.find(item => item.name === 'Teatro').assetId).toBe(entry('teatro').sha256);
  expect((await page.evaluate(() => studioProbe.authoring.captureCapabilities().config['gg.sprites'])).stage.backdrop).toBe(stored.costumes.find(item => item.name === 'Teatro').id);
  for (const id of ['gato', 'sonido-salto', 'teatro']) expect(hash(decodeResourceAsset(stored.assets[entry(id).sha256]))).toBe(entry(id).sha256);

  // A learner's program uses the library resources through the gg.assets menus.
  await page.evaluate(state => studioProbe.editor.load(state), program);
  const menu = async (id, label) => {
    await page.locator(`#blockly-editor [data-id="${id}"] .blocklyDropdownText`, {hasText: label}).first().click();
    const items = (await page.locator('.blocklyDropDownDiv .blocklyMenuItem').allTextContents()).map(text => text.trim());
    await page.keyboard.press('Escape'); await expect(page.locator('.blocklyDropDownDiv .blocklyMenuItem')).toHaveCount(0);
    return items;
  };
  const options = {costume: await menu('lib-costume', 'Gato'), sound: await menu('lib-sound', 'Salto')};
  expect(options.costume).toEqual(['hero', 'hero-alt', 'Gato']);
  expect(options.sound).toEqual(['tone', 'Salto']);
  await clickVisible(page, page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).costume.name).toBe('gato');
  const theater = await snapshot(page);
  expect(theater.pixels.count, 'telón rojo del fondo Teatro visible').toBeGreaterThan(10000);
  await page.screenshot({path: artifactPath('starter-library-run-desktop.png')});

  const pending = page.waitForEvent('download');
  await clickVisible(page, page.locator('#save-project'));
  const projectPath = artifactPath('starter-library.ggproj');
  await (await pending).saveAs(projectPath);
  expect(failed, 'ninguna petición falló sin red').toEqual([]);
  await context.setOffline(false);
  const archive = await JSZip.loadAsync(await readFile(projectPath));
  expect(Object.keys(archive.files).length).toBeGreaterThan(0);

  // Fresh profile without opening the library: the project carries the media.
  const fresh = await browser.newContext();
  try {
    const reopened = await fresh.newPage(), reopenedRequests = [];
    reopened.on('request', request => reopenedRequests.push(request.url()));
    await open(reopened);
    await reopened.locator('#open-project').setInputFiles(projectPath);
    await expect(reopened.locator('#project-status')).toHaveText('Guardado en este navegador');
    expect(await resources(reopened)).toEqual(await resources(page));
    expect(await reopened.evaluate(() => studioProbe.editor.save())).toEqual(await page.evaluate(() => studioProbe.editor.save()));
    expect((await snapshot(reopened)).costume.name).toBe('hero');
    await clickVisible(reopened, reopened.locator('#run-editor'));
    await expect.poll(async () => (await settled(snapshot, reopened)).costume.name).toBe('gato');
    expect((await snapshot(reopened)).pixels.count).toBeGreaterThan(10000);
    expect(reopenedRequests.filter(isLibrary)).toEqual([]);
  } finally { await fresh.close(); }

  // Back to the catalog backdrop, explicitly.
  await clickVisible(page, page.locator('#stop-result'));
  await expect(page.locator('#run-editor')).toBeEnabled();
  await act(page, 'teatro', 'Usar de fondo «Teatro» del escenario', '«Teatro» ya está en tu proyecto.');
  await clickVisible(page, page.locator('#restore-backdrop'));
  await expect(page.locator('#starter-library-status')).toHaveText('Volviste al fondo inicial del escenario. Se verá al ejecutar.');
  await expect(page.locator('#restore-backdrop')).toBeHidden();
  await expect(card(page, 'teatro').locator('.library-state')).toHaveText('En tu proyecto');
  await clickVisible(page, page.locator('#run-editor'));
  await expect.poll(async () => (await settled(snapshot, page)).costume.name).toBe('gato');
  expect((await snapshot(page)).pixels.count).toBeLessThan(2000);
  expect(errors).toEqual([]);
  await writeFile(artifactPath('starter-library-e2e.json'), JSON.stringify({prepared: {cohort: prepared.cohort, packs: prepared.packs}, before: before.pixels, theater: theater.pixels, options, failed}, null, 2));
});

test('GG-LIB-008: keyboard only on a narrow screen chooses Sounds and adds one with visible focus', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await open(page);
  await revealPanel(page, library(page));
  const summary = page.locator('#starter-library > summary');
  await summary.scrollIntoViewIfNeeded(); await summary.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#starter-library-items > li')).toHaveCount(lock.counts.costume);
  const first = page.locator('#starter-library-filter input[value="costume"]');
  await first.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('#starter-library-filter input[value="sound"]')).toBeChecked();
  await expect(page.locator('#starter-library-filter label:has(input:focus-visible)')).toHaveText('Sonidos');
  await expect(page.locator('#starter-library-items')).toHaveAttribute('aria-label', 'Sonidos de la biblioteca');
  const add = page.getByRole('button', {name: 'Añadir «Pop» a los sonidos'});
  await add.focus(); await expect(add).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#starter-library-status')).toHaveText('«Pop» se añadió a los sonidos de hero. Úsalo con «iniciar sonido».');
  await expect(add).toBeFocused();
  expect(await add.evaluate(node => node.matches(':focus-visible') && getComputedStyle(node).outlineStyle !== 'none')).toBe(true);
  await expect(card(page, 'sonido-pop').locator('.library-state')).toHaveText('En tu proyecto');
  // Listening is a preview of the medium, not a program run; the same control stops it.
  const listen = page.getByRole('button', {name: 'Escuchar Campana'});
  await listen.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', {name: 'Detener Campana'})).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(listen).toBeFocused();
  expect((await page.evaluate(() => studioProbe.request('snapshot'))).threads).toBe(0);
  for (const control of await page.locator('#starter-library-items button').all()) {
    const box = await control.boundingBox(); expect(box.height).toBeGreaterThanOrEqual(44);
  }
  expect(await page.evaluate(() => document.scrollingElement.scrollWidth <= innerWidth)).toBe(true);
  await add.scrollIntoViewIfNeeded();
  await page.screenshot({path: artifactPath('starter-library-narrow.png')});
  // A fresh project already shows its initial backdrop: nothing to restore.
  await show(page, 'backdrop');
  await expect(page.locator('#starter-library-items > li[data-state]')).toHaveCount(0);
  await expect(page.locator('#restore-backdrop')).toBeHidden();
});

test('GG-LIB-003/008: unavailable or tampered library leaves the project untouched and can be retried', async ({page, context}) => {
  const raw = JSON.parse((await readFile(new URL('../../artifacts/browser/shell/starter-library.json', import.meta.url))).toString('utf8'));
  let mode = 'down';
  // Context routing also covers requests that pass through the Studio service worker.
  await context.route('**/starter-library.json', async route => {
    if (mode === 'down') return route.fulfill({status: 503, body: 'no disponible'});
    if (mode === 'tampered') {
      const value = structuredClone(raw), bytes = Buffer.from(value.entries[0].data, 'base64'); bytes[30] ^= 1;
      value.entries[0].data = bytes.toString('base64');
      return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(value)});
    }
    return route.continue();
  });
  await open(page);
  const before = await resources(page);
  await revealPanel(page, library(page));
  await clickVisible(page, page.locator('#starter-library > summary'));
  const status = page.locator('#starter-library-status');
  await expect(status).toContainText('No se pudo cargar la biblioteca'); await expect(status).toHaveAttribute('data-tone', 'error');
  await expect(page.locator('#retry-starter-library')).toBeVisible();
  await expect(page.locator('#starter-library-filter input[value="sound"]')).toBeDisabled();
  mode = 'tampered'; await clickVisible(page, page.locator('#retry-starter-library'));
  await expect(status).toContainText('no coincide con su SHA-256');
  mode = 'ok'; await clickVisible(page, page.locator('#retry-starter-library'));
  await expect(status).toHaveText(`${lock.entries.length} recursos disponibles. Elige qué mostrar y añade los que quieras.`);
  await expect(page.locator('#retry-starter-library')).toBeHidden();
  expect(await resources(page)).toEqual(before);
});
