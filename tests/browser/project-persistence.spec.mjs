import {origins} from './origins.mjs';
import {selectContext,clickVisible,revealPanel,settled} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash, randomUUID} from 'node:crypto';
import {createProjectArchive} from '../../src/project-archive.mjs';
import {projectContentHash} from '../../src/project-continuity.mjs';
import JSZip from 'jszip';
import {corpus} from '../fixtures/corpus.blocks.mjs';

let observedPageErrors = [];
const watchedPages = new WeakSet();
function watchPageErrors(page) {
  if (watchedPages.has(page)) return;
  watchedPages.add(page);
  page.on('pageerror', error => observedPageErrors.push(error.message));
}
test.beforeEach(async ({page}) => { observedPageErrors = []; watchPageErrors(page); });
test.afterEach(() => { expect(observedPageErrors, 'Unexpected browser page errors').toEqual([]); });

const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const authoring = page => page.evaluate(() => studioProbe.editor.save());
const exported = page => page.evaluate(() => studioProbe.project.export());
const flush = page => page.evaluate(() => studioProbe.project.flush());
const saveEvidence = (name, data) => writeFile(artifactPath(`f1-${name}.json`), JSON.stringify(data, null, 2) + '\n');

async function open(page) {
  watchPageErrors(page);
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function editSteps(page, value) {
  const field = page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await selectContext(page,'2d');
  await field.dblclick();
  await page.locator('.blocklyHtmlInput').fill(String(value));
  await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText(String(value));
}
async function run(page, x) {
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
}
async function download(page) {
  const pending = page.waitForEvent('download');
  await clickVisible(page.locator('#save-project'));
  const result = await pending;
  expect(result.suggestedFilename()).toMatch(/\.ggproj$/);
  return {name: result.suggestedFilename(), bytes: await readFile(await result.path())};
}
async function importFile(page, bytes, name = 'reabrir.ggproj') {
  await page.locator('#open-project').setInputFiles({name, mimeType: 'application/zip', buffer: Buffer.from(bytes)});
  await expect(page.locator('#open-project')).toHaveValue('');
}
async function records(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('gg-studio-projects', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('snapshots', 'readonly');
      const store = tx.objectStore('snapshots');
      const result = {};
      for (const key of ['current', 'previous']) {
        const entry = store.get(key);
        entry.onsuccess = () => { result[key] = entry.result ?? null; };
      }
      tx.oncomplete = () => { db.close(); resolve(result); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function corruptRecords(page, keys) {
  await page.evaluate(keys => new Promise((resolve, reject) => {
    const request = indexedDB.open('gg-studio-projects', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('snapshots', 'readwrite');
      const store = tx.objectStore('snapshots');
      for (const key of keys) store.put({serialized: `corrupt:${key}`, savedAt: new Date().toISOString()}, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
    };
  }), keys);
}

test('GG-PROJECT-001/002/003/005/010: downloaded ZIP reopens in a clean browser context with authoring and native behavior', async ({page, browser}) => {
  await open(page);
  await editSteps(page, 6);
  await page.locator('#project-name').fill('Mi robot viajero');
  await selectContext(page,'microbit');
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill('basic.showNumber(7)');
  const original = await authoring(page);
  await run(page, 18);
  await revealAdvanced(page);
  await clickVisible(page,page.getByRole('button', {name: 'Mover +10', exact: true}));
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(28);
  const saved = await download(page);
  await writeFile(artifactPath('f1-example.ggproj'), saved.bytes);
  expect([...saved.bytes.subarray(0, 4)]).toEqual([80, 75, 3, 4]);
  const zip = await JSZip.loadAsync(saved.bytes, {checkCRC32: true});
  expect(Object.keys(zip.files)).toContain('manifest.json');
  expect(Object.keys(zip.files).some(name => name.startsWith('assets/') && name.endsWith('.svg'))).toBe(true);
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  expect(manifest.project.name).toBe('Mi robot viajero');
  // R1: a new project keeps its initial scene in its gg.sprites capabilities.
  expect(manifest.scene).toBeUndefined();
  expect(manifest.capabilities.config['gg.sprites'].initialScene.x).toBe(0);
  expect(manifest.capabilities.config['gg.sprites'].initialScene.y).toBe(0);
  const id = manifest.project.id;
  await page.close();

  const fresh = await browser.newContext({baseURL: origins.shellOrigin, viewport: {width: 390, height: 844}});
  try {
    const reopened = await fresh.newPage();
    await open(reopened);
    expect((await records(reopened)).current?.serialized ?? '').not.toContain(id);
    await importFile(reopened, saved.bytes, saved.name);
    await expect(reopened.locator('#project-name')).toHaveValue('Mi robot viajero');
    await expect(reopened.locator('#source')).toHaveValue('basic.showNumber(7)');
    expect(await authoring(reopened)).toEqual(original);
    const restored = JSON.parse(await exported(reopened));
    expect(restored.project.id).toBe(id);
    expect(restored.capabilities.config['gg.sprites'].initialScene.x).toBe(0);
    expect((await snapshot(reopened)).x).toBe(0);
    await run(reopened, 18);
    expect((await snapshot(reopened)).sourceMap['editable-move']).toBe('editable-move');
    expect(await reopened.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await reopened.screenshot({path: artifactPath('f1-project-mobile.png'), fullPage: true});
    await saveEvidence('portable', {filename: saved.name, localArtifact: artifactPath('f1-example.ggproj'), bytes: saved.bytes.length, sha256: createHash('sha256').update(saved.bytes).digest('hex'), entries: Object.keys(zip.files), projectId: id, authoringPreserved: true, sourcePreserved: true, initialX: restored.capabilities.config['gg.sprites'].initialScene.x, runtimeX: (await snapshot(reopened)).x, freshContext: true});
  } finally { await fresh.close(); }
});

test('GG-PROJECT-005/006/007: committed autosave survives page close and reopens without persisting execution state', async ({page, context}) => {
  await open(page);
  await editSteps(page, 6);
  await page.locator('#project-name').fill('Proyecto recuperable');
  await selectContext(page,'microbit');
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill('basic.showNumber(9)');
  // Wait for the real debounce/IndexedDB commit instead of forcing this save.
  await expect(page.locator('#project-status')).toContainText('Guardado en este navegador');
  await expect.poll(async () => {
    const current = (await records(page)).current;
    return current ? JSON.parse(current.serialized).project.name : '';
  }).toBe('Proyecto recuperable');
  const original = await authoring(page);
  const persisted = (await records(page)).current.serialized;
  await run(page, 18);
  await page.evaluate(() => GG.sprite.move('hero', 10));
  await page.close();
  const reopened = await context.newPage();
  await open(reopened);
  await expect(reopened.locator('#project-name')).toHaveValue('Proyecto recuperable');
  await expect(reopened.locator('#source')).toHaveValue('basic.showNumber(9)');
  await expect(reopened.locator('#recovery-notice')).toContainText(/recuper/i);
  expect(await authoring(reopened)).toEqual(original);
  expect((await snapshot(reopened)).x).toBe(0);
  await run(reopened, 18);
  await reopened.evaluate(() => GG.events.emit('boost'));
  await expect.poll(async () => (await snapshot(reopened)).x).toBe(20);
  await selectContext(reopened,'2d');
  await clickVisible(reopened.getByRole('button', {name:'Detener',exact:true}));
  await expect(reopened.locator('#run-editor')).toBeEnabled();
  expect(await authoring(reopened)).toEqual(original);
  expect(JSON.parse((await records(reopened)).current.serialized).authoring).toEqual(JSON.parse(persisted).authoring);
  await saveEvidence('autosave', {project: JSON.parse(persisted).project, authoringPreserved: true, recoveredX: 0, rerunAndMessageX: 20, finalX: (await snapshot(reopened)).x});
});

test('GG-PROJECT-003/004: invalid files and manifests fail atomically while the running scene and authoring remain valid', async ({page}) => {
  await open(page);
  await editSteps(page, 6);
  await page.locator('#project-name').fill('Conservar este proyecto');
  await selectContext(page,'microbit');
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill('basic.showNumber(3)');
  await flush(page);
  await run(page, 18);
  const before = {authoring: await authoring(page), scene: await snapshot(page), serialized: await exported(page)};
  await page.evaluate(() => { window.validBeforeFailedImport = GG; });
  const valid = JSON.parse(before.serialized);
  const variants = [
    {case: 'truncated-json', serialized: before.serialized.slice(0, -12)},
    {case: 'unsupported-version', mutate: value => { value.version = 999; }},
    {case: 'missing-resource', mutate: value => { delete value.resources.assets[Object.keys(value.resources.assets)[0]]; }},
    {case: 'foreign-resource', mutate: value => { value.resources.assets['https://example.invalid/evil.svg'] = '<svg/>'; }},
    {case: 'extensions', mutate: value => { value.extensions = ['https://example.invalid/code.js']; }},
    {case: 'oversized-workspace', mutate: value => { value.authoring.blockly.oversized = 'x'.repeat(65537); }},
    {case: 'unsupported-block', mutate: value => { value.authoring.blockly = {blocks: {languageVersion: 0, blocks: [{type: 'text', id: 'foreign-block', fields: {TEXT: 'unsupported'}}]}}; }}
  ];
  const rejected = [];
  for (const variant of variants) {
    const value = structuredClone(valid);
    variant.mutate?.(value);
    const error = await page.evaluate(serialized => studioProbe.project.open(serialized).then(() => null, error => error.message), variant.serialized ?? JSON.stringify(value));
    expect(error, variant.case).toBeTruthy();
    expect(await authoring(page), variant.case).toEqual(before.authoring);
    expect((await snapshot(page)).revision, variant.case).toBe(before.scene.revision);
    expect((await snapshot(page)).x, variant.case).toBe(18);
    await expect(page.locator('#project-name')).toHaveValue('Conservar este proyecto');
    await expect(page.locator('#source')).toHaveValue('basic.showNumber(3)');
    rejected.push({case: variant.case, error});
  }
  const portable = await download(page);
  const missingAsset = await JSZip.loadAsync(portable.bytes);
  missingAsset.remove(Object.keys(missingAsset.files).find(name => name.startsWith('assets/')));
  const futureVersion = await JSZip.loadAsync(portable.bytes);
  const futureManifest = JSON.parse(await futureVersion.file('manifest.json').async('string'));
  futureManifest.version = 999;
  futureVersion.file('manifest.json', JSON.stringify(futureManifest), {createFolders: false});
  const invalidArchives = [
    ['truncated.ggproj', Buffer.from([80, 75, 3, 4])],
    ['not-a-zip.ggproj', Buffer.from(before.serialized)],
    ['missing-asset.ggproj', await missingAsset.generateAsync({type: 'nodebuffer', compression: 'STORE'})],
    ['future-version.ggproj', await futureVersion.generateAsync({type: 'nodebuffer', compression: 'STORE'})]
  ];
  for (const [name, bytes] of invalidArchives) {
    await importFile(page, bytes, name);
    await expect(page.locator('#project-error')).not.toBeEmpty();
    expect(await authoring(page)).toEqual(before.authoring);
    expect((await snapshot(page)).revision).toBe(before.scene.revision);
  }
  await page.evaluate(() => validBeforeFailedImport.sprite.move('hero', 1));
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(19);
  await saveEvidence('atomic-rejections', {rejected, invalidArchives: invalidArchives.map(([name]) => name), authoringPreserved: true, originalSessionStillValid: true, finalX: 19});
});

test('GG-PROJECT-007: damaged current autosave falls back to the previous committed revision and does not erase corrupt records', async ({page}) => {
  await open(page);
  await editSteps(page, 6);
  await page.locator('#project-name').fill('Copia anterior válida');
  await flush(page);
  const first = JSON.parse((await records(page)).current.serialized);
  await page.locator('#project-name').fill('Última copia que será dañada');
  await flush(page);
  const saved = await records(page);
  expect(JSON.parse(saved.previous.serialized).project.name).toBe('Copia anterior válida');
  await corruptRecords(page, ['current']);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-name')).toHaveValue('Copia anterior válida');
  await expect(page.locator('#recovery-notice')).toContainText(/anterior|dañ|corrupt/i);
  expect(await authoring(page)).toEqual(first.authoring.blockly);
  await run(page, 18);
  // Recovery must not silently destroy the only valid backup with the corrupt head.
  const afterRecovery = await records(page);
  expect(JSON.parse(afterRecovery.previous.serialized).project.name).toBe('Copia anterior válida');
  await corruptRecords(page, ['current', 'previous']);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-error')).not.toBeEmpty();
  await page.waitForTimeout(600); // Beyond autosave debounce: diagnostics must not overwrite corruption.
  const damaged = await records(page);
  expect(damaged.current.serialized).toBe('corrupt:current');
  expect(damaged.previous.serialized).toBe('corrupt:previous');
  await saveEvidence('recovery', {fallbackProject: first.project.name, backupPreserved: true, corruptRecordsPreserved: true, diagnostic: await page.locator('#project-error').textContent()});
});

test('GG-PROJECT-008: unavailable storage is visible while editing, execution and portable download remain usable', async ({page}) => {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = function () { throw new DOMException('El almacenamiento está bloqueado', 'SecurityError'); };
  });
  await open(page);
  await expect(page.locator('#project-error')).not.toBeEmpty();
  await editSteps(page, 6);
  await page.locator('#project-name').fill('Trabajo sin almacenamiento');
  await run(page, 18);
  const file = await download(page);
  const zip = await JSZip.loadAsync(file.bytes);
  expect(JSON.parse(await zip.file('manifest.json').async('string')).project.name).toBe('Trabajo sin almacenamiento');
  await saveEvidence('storage-unavailable', {faultInjection: 'IDBFactory.open throws SecurityError before boot; editing, runner and ZIP download remain real', diagnostic: await page.locator('#project-error').textContent(), runtimeX: (await snapshot(page)).x, portableBytes: file.bytes.length});
});

test('GG-PROJECT-006/008: quota failure preserves the last durable revision and permits a later successful commit', async ({page}) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'snapshots' && window.__failAutosaveWrites) throw new DOMException('Cuota agotada', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await open(page);
  await page.locator('#project-name').fill('Última revisión confirmada');
  await flush(page);
  const durable = await records(page);
  await page.evaluate(() => { window.__failAutosaveWrites = true; });
  await page.locator('#project-name').fill('Edición que aún no está guardada');
  await editSteps(page, 6);
  await page.evaluate(() => studioProbe.project.flush().catch(error => error.message));
  await expect(page.locator('#project-error')).not.toBeEmpty();
  expect(await records(page)).toEqual(durable);
  const unsaved = JSON.parse(await exported(page));
  expect(unsaved.project.name).toBe('Edición que aún no está guardada');
  await run(page, 18);
  const portable = await download(page);
  expect(portable.bytes.length).toBeGreaterThan(1000);
  await page.evaluate(() => { window.__failAutosaveWrites = false; });
  await flush(page);
  await expect(page.locator('#project-status')).toContainText('Guardado en este navegador');
  const committed = JSON.parse((await records(page)).current.serialized);
  expect(committed.project.name).toBe('Edición que aún no está guardada');
  await saveEvidence('quota', {faultInjection: 'IDBObjectStore.put throws QuotaExceededError only after a real successful commit; IndexedDB transaction and later retry remain real', lastDurableName: JSON.parse(durable.current.serialized).project.name, failedWritePreservedRecords: true, unsavedExportName: unsaved.project.name, laterCommitName: committed.project.name});
});

test('GG-PROJECT-007/009: Stop and reopening preserve audio authoring without reviving old workers, sound or GG references', async ({page}) => {
  await open(page);
  await page.evaluate(state => studioProbe.editor.load(state), corpus.audio);
  await page.locator('#project-name').fill('Sonido recuperable');
  await flush(page);
  const original = await authoring(page);
  const workers = [];
  page.on('worker', worker => {
    const item = {url: worker.url(), closed: false}; workers.push(item);
    worker.on('close', () => { item.closed = true; });
  });
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  const oldFrame = page.frames().find(frame => frame.url().startsWith(origins.runnerOrigin + '/'));
  const play = () => page.frameLocator('#runner-slot iframe').getByRole('button', {name: 'Reproducir sonido', exact: true});
  await clickVisible(play());
  await expect.poll(async () => (await settled(snapshot, page)).audio.rms).toBeGreaterThan(0.01);
  await page.evaluate(() => { window.previousProjectGG = GG; return studioProbe.request('start-loop-worker'); });
  await expect.poll(() => workers.some(worker => worker.url.endsWith('/loop-worker.js') && !worker.closed)).toBe(true);
  const oldWorkers = [...workers];
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(oldFrame.isDetached()).toBe(true);
  await expect.poll(() => oldWorkers.filter(worker => !worker.closed).length).toBe(0);
  const stale = await page.evaluate(() => previousProjectGG.sprite.move('hero', 10).then(() => null, error => error.message));
  expect(stale).toContain('Stale GG');
  await page.waitForTimeout(1300); // Outlast the original WAV's waiting continuation.
  expect((await snapshot(page)).x).toBe(0);
  expect((await snapshot(page)).threads).toBe(0);
  expect(await authoring(page)).toEqual(original);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  expect(await authoring(page)).toEqual(original);
  await expect(page.locator('#project-name')).toHaveValue('Sonido recuperable');
  expect((await snapshot(page)).x).toBe(0);
  expect((await snapshot(page)).threads).toBe(0);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(play()).toBeVisible();
  await clickVisible(play());
  await expect.poll(async () => (await settled(snapshot, page)).audio.rms).toBeGreaterThan(0.01);
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(5);
  await saveEvidence('stop-reopen', {authoringPreserved: true, previousFrameDetached: true, workers, oldWorkers, replacementWorkers: workers.filter(worker => !oldWorkers.includes(worker)), staleReferenceError: stale, reopenedInitialX: 0, rerunX: 5});
});

test('GG-PROJECT-006/007/009: flush during recovery and an import superseded by Stop settle without losing valid authoring', async ({page}) => {
  await open(page);
  await editSteps(page, 6);
  await page.locator('#project-name').fill('Checkpoint antes de recuperar');
  await selectContext(page,'microbit');
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill('basic.showNumber(42)');
  await flush(page);
  const committed = (await records(page)).current.serialized;

  // Hold the catalog while the real controller exists but its recovery is pending.
  let releaseCatalog;
  const catalogGate = new Promise(resolve => { releaseCatalog = resolve; });
  await page.route('**/project-catalog.json', async route => { await catalogGate; await route.continue(); });
  await page.addInitScript(() => {
    if (window.top !== window) return;
    const timer = setInterval(() => {
      if (!window.studioProbe?.project) return;
      clearInterval(timer);
      window.__flushStartedBeforeRecovery = !studioProbe.project.state().ready;
      window.__startupFlush = studioProbe.project.flush();
    }, 0);
  });
  try {
    await page.reload();
    await page.waitForFunction(() => window.__startupFlush instanceof Promise);
    expect(await page.evaluate(() => window.__flushStartedBeforeRecovery)).toBe(true);
  } finally { releaseCatalog(); }
  await page.evaluate(() => window.__startupFlush);
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#project-name')).toHaveValue('Checkpoint antes de recuperar');
  expect(await authoring(page)).toEqual(JSON.parse(committed).authoring.blockly);
  await page.unroute('**/project-catalog.json');

  // The first runner navigation is intentionally still loading when Stop replaces it.
  const runnerUrl = new URL(await page.locator('#runner-slot > iframe').getAttribute('src'), page.url());
  expect(runnerUrl.origin).toBe(origins.runnerOrigin);
  const isRunnerNavigation = url => url.origin === runnerUrl.origin && url.pathname === runnerUrl.pathname && url.searchParams.has('session');
  await page.route(isRunnerNavigation, async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.continue().catch(() => {}); // Superseded iframe navigation may already be gone.
  });
  const candidate = JSON.parse(await exported(page));
  candidate.project.name = 'Importación conservada durante Stop';
  const navigation = page.waitForRequest(request => request.isNavigationRequest() && isRunnerNavigation(new URL(request.url())));
  const importing = page.evaluate(serialized => studioProbe.project.open(serialized).then(() => ({settled: true}), error => ({settled: true, error: error.message})), JSON.stringify(candidate));
  await navigation;
  const stopping = page.evaluate(() => studioProbe.stop().then(() => ({settled: true}), error => ({settled: true, error: error.message})));
  const outcomes = await Promise.all([importing, stopping]);
  expect(outcomes.every(outcome => outcome.settled)).toBe(true);
  expect(outcomes[0].error).toBeUndefined();
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#project-name')).toHaveValue('Importación conservada durante Stop');
  expect(await authoring(page)).toEqual(candidate.authoring.blockly);
  await flush(page);
  expect(JSON.parse((await records(page)).current.serialized).project.name).toBe('Importación conservada durante Stop');
  await run(page, 18);
  await saveEvidence('overlapping-recovery', {flushStartedBeforeRecovery: true, restoredCheckpoint: JSON.parse(committed).project.name, outcomes, savedImportedName: 'Importación conservada durante Stop', authoringPreserved: true, runtimeX: 18});
});

const stableProject = model => {
  const value = structuredClone(model);
  delete value.project.revision; delete value.project.createdAt; delete value.project.updatedAt;
  return value;
};
async function delayArchive(page) {
  await page.route('**/project-archive.mjs', async route => {
    const response = await route.fetch(), source = await response.text();
    const signature = 'export async function createProjectArchive(document, {catalog} = {}) {';
    expect(source).toContain(signature);
    await route.fulfill({response, body: source.replace(signature, signature +
      '\n if (globalThis.__failArchive) throw new Error("Empaquetado de prueba fallido"); if (globalThis.__holdArchive) { globalThis.__archiveCaptured = structuredClone(document); await new Promise(resolve => { globalThis.__releaseArchive = resolve; }); }')});
  });
}

test('SJ-01/02/03: create, edit repeat-move to x21, close, recover and open a real portable copy with all authoring intact', async ({page, context, browser}) => {
  test.setTimeout(120000);
  await open(page);
  await clickVisible(page.locator('#entry-create'));
  await expect(page.locator('#project-name')).toHaveValue('Mi primera creación');
  const seed = JSON.parse(await readFile(new URL('../fixtures/canonical/scene2d/repeat-move/project.json', import.meta.url)));
  const model = JSON.parse(await exported(page));
  model.authoring.blockly = seed.blockly; model.project.name = 'Mi recorrido 2D';
  const catalog = await page.evaluate(() => studioProbe.project.catalog());
  await importFile(page, await createProjectArchive(model, {catalog}), 'semilla-repetir.ggproj');
  await selectContext(page, '2d');
  const field = page.locator('#blockly-editor [data-id="canonical-steps"] .blocklyText');
  await field.dblclick(); await page.locator('.blocklyHtmlInput').fill('7'); await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText('7');
  await page.locator('#project-name').fill('Mi viaje de 21 pasos');
  await run(page, 21);
  await page.frameLocator('#runner-slot iframe').locator('#stage').screenshot({path: artifactPath('sj-2d-result-canvas.png')});
  await clickVisible(page.locator('#stop-result')); await expect(page.locator('#run-editor')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
  const blocks = await authoring(page);
  await clickVisible(page.locator('#copy-javascript'));
  await selectContext(page, 'text'); await page.locator('#text-source').fill('console.log("Documento independiente");');
  expect(await authoring(page)).toEqual(blocks);
  await selectContext(page, '2d');
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  const original = stableProject(JSON.parse(await exported(page)));
  const portable = await download(page);
  await page.screenshot({path: artifactPath('sj-2d-continuity.png'), fullPage: true});
  await page.close();
  const local = await context.newPage(); await open(local);
  expect(stableProject(JSON.parse(await exported(local)))).toEqual(original);
  expect((await snapshot(local)).x).toBe(0);
  await run(local, 21);
  await clickVisible(local.locator('#stop-result'));
  const fresh = await browser.newContext();
  try {
    const reopened = await fresh.newPage(); await open(reopened);
    await importFile(reopened, portable.bytes, portable.name);
    expect(stableProject(JSON.parse(await exported(reopened)))).toEqual(original);
    await expect(reopened.locator('#project-copy-status')).toHaveText('Sin registro de copia en este navegador');
    expect((await snapshot(reopened)).x).toBe(0);
    await run(reopened, 21);
    expect(await authoring(reopened)).toEqual(blocks);
  } finally { await fresh.close(); }
  await saveEvidence('sj-01-03', {seed: 'repeat-move', editedSteps: 7, runtimeX: 21, stoppedX: 0, completeAuthoring: true, numericShadows: true, independentDocument: true, sameProfileRecovery: true, portableFreshProfile: true});
});

test('SJ-04/GG-PROJECT-011: delayed archive uses one capture for bytes and filename and cannot replace a later project', async ({page}) => {
  test.setTimeout(90000);
  await delayArchive(page); await open(page);
  await page.locator('#project-name').fill('Captura A');
  await page.evaluate(() => { window.__holdArchive = true; });
  const requested = page.waitForEvent('download');
  await clickVisible(page.locator('#save-project'));
  await page.waitForFunction(() => Boolean(window.__releaseArchive));
  const captured = await page.evaluate(() => window.__archiveCaptured);
  await page.locator('#project-name').fill('Edición posterior de A');
  await editSteps(page, 8);
  const later = JSON.parse(await exported(page));
  later.project.id = randomUUID(); later.project.name = 'Proyecto B';
  const catalog = await page.evaluate(() => studioProbe.project.catalog());
  await importFile(page, await createProjectArchive(later, {catalog}), 'B.ggproj');
  const before = stableProject(JSON.parse(await exported(page)));
  await page.evaluate(() => { window.__holdArchive = false; window.__releaseArchive(); });
  const result = await requested, bytes = await readFile(await result.path());
  expect(result.suggestedFilename()).toBe('Captura A.ggproj');
  const archive = await JSZip.loadAsync(bytes);
  const manifest = JSON.parse(await archive.file('manifest.json').async('string'));
  expect(manifest.project).toEqual(captured.project);
  expect(manifest.authoring).toEqual(captured.authoring);
  expect(stableProject(JSON.parse(await exported(page)))).toEqual(before);
  await expect(page.locator('#project-name')).toHaveValue('Proyecto B');
  await expect(page.locator('#project-copy-status')).toHaveText('Sin registro de copia en este navegador');
  await expect.poll(async () => Boolean((await allLocalRecords(page))['continuity:' + captured.project.id])).toBe(true);
  await importFile(page, bytes, result.suggestedFilename());
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  expect((await snapshot(page)).x).toBe(0);
  await saveEvidence('sj-04', {singleCapture: true, capturedProject: captured.project, activeProject: before.project, bytes: bytes.length, filename: result.suggestedFilename()});
});

const continuity = page => page.evaluate(() => studioProbe.project.state().continuity);
async function allLocalRecords(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('gg-studio-projects', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('snapshots', 'readonly'), store = tx.objectStore('snapshots');
      const output = {}, cursor = store.openCursor();
      cursor.onsuccess = () => { const item = cursor.result; if (item) { output[item.key] = item.value; item.continue(); } };
      tx.oncomplete = () => { db.close(); resolve(output); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  }));
}
async function holdSnapshotTransactions(page) {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name !== 'snapshots' || key !== 'current') return put.apply(this, arguments);
      if (window.__rejectSnapshotWrites) throw new DOMException('Transacción de prueba abortada', 'AbortError');
      const result = put.apply(this, arguments);
      if (window.__holdSnapshotWrites) {
        const store = this; window.__heldSnapshotTransaction = this.transaction;
        window.__snapshotWriteHeld = true;
        const pump = () => {
          const request = store.get('__test-keep-transaction-open');
          request.onsuccess = () => { if (window.__holdSnapshotWrites) pump(); };
        };
        pump();
      }
      return result;
    };
  });
}

test('PC-01/06: copy is identified by content, survives reload and never rotates authoring snapshots', async ({page}) => {
  await open(page);
  await page.locator('#project-name').fill('Contenido confirmado');
  await flush(page);
  await expect.poll(async () => (await continuity(page)).portable).toBe('unknown');
  const snapshots = await records(page), original = JSON.parse(await exported(page));
  const portable = await download(page);
  const header = await page.locator('.app-bar').boundingBox();
  expect(header.height).toBeLessThanOrEqual(50); // Keep the desktop station's compact header.
  await page.locator('.app-bar').screenshot({path: artifactPath('pc-continuity-header.png')});
  await page.locator('#project-menu .menu-panel').screenshot({path: artifactPath('pc-copy-menu.png')});
  await expect(page.locator('#project-copy-status')).toContainText('Copia solicitada');
  await expect.poll(async () => (await continuity(page)).persisted).toBe(true);
  const saved = await allLocalRecords(page), id = original.project.id, copy = saved['continuity:' + id];
  expect(copy.contentHash).toBe(await projectContentHash(original));
  expect(await records(page)).toEqual(snapshots);
  const zip = await JSZip.loadAsync(portable.bytes), manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  expect(JSON.stringify(manifest)).not.toContain('contentHash');
  expect(Object.keys(manifest.project)).toEqual(Object.keys(original.project));
  await page.evaluate(() => { const input = document.querySelector('#project-name'); input.dispatchEvent(new Event('input', {bubbles:true})); });
  await flush(page);
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  const revision = await page.evaluate(() => studioProbe.project.state().revision);
  await exported(page); await exported(page);
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  expect(await page.evaluate(() => studioProbe.project.state().revision)).toBe(revision);
  await page.locator('#project-name').fill('Contenido posterior');
  await expect(page.locator('#project-copy-status')).toHaveText('Hay cambios desde la última solicitud de copia');
  await flush(page);
  await page.reload(); await page.waitForFunction(() => Boolean(window.studioProbe?.project)); await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-copy-status')).toHaveText('Hay cambios desde la última solicitud de copia');
  expect((await continuity(page)).record).toEqual(copy);
  await page.locator('#project-name').fill('Contenido confirmado'); await flush(page);
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  await saveEvidence('pc-01-06', {contentHash: copy.contentHash, localOnly: true, snapshotRotationIndependent: true, revisionIndependent: true, portableBytes: portable.bytes.length});
});

test('PC-02/06: failed local save stays visible beside a real copy and both failures have working UI retries', async ({page}) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value, key) {
      if (this.name === 'snapshots' && ((window.__failLocal && ['current','previous'].includes(key)) ||
          (window.__failCopyRecord && typeof key === 'string' && key.startsWith('continuity:'))))
        throw new DOMException('Cuota de prueba agotada', 'QuotaExceededError');
      return put.apply(this, arguments);
    };
  });
  await open(page); await page.locator('#project-name').fill('Último commit'); await flush(page);
  const durable = await records(page);
  await page.evaluate(() => { window.__failLocal = window.__failCopyRecord = true; });
  await page.locator('#project-name').fill('Copia fuera del navegador'); await editSteps(page, 6);
  await page.evaluate(() => studioProbe.project.flush().catch(() => {}));
  await expect(page.locator('#project-status')).toHaveText('Sin guardar en este navegador');
  await run(page, 18);
  const portable = await download(page);
  await expect(page.locator('#project-copy-status')).toContainText('Copia solicitada');
  await expect(page.locator('#project-copy-warning')).toContainText('Solo se recuerda en esta sesión');
  await expect(page.locator('#project-status')).toHaveText('Sin guardar en este navegador');
  expect(await records(page)).toEqual(durable);
  await page.evaluate(() => { window.__failLocal = false; });
  await clickVisible(page.locator('#retry-project-save'));
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  await page.evaluate(() => { window.__failCopyRecord = false; });
  await clickVisible(page.locator('#retry-copy-record'));
  await expect(page.locator('#project-copy-warning')).toBeEmpty();
  await expect(page.locator('#retry-copy-record')).toBeHidden();
  await expect.poll(async () => (await continuity(page)).persisted).toBe(true);
  const id = await page.evaluate(() => studioProbe.project.state().id);
  expect((await allLocalRecords(page))['continuity:' + id]).toEqual((await continuity(page)).record);
  await saveEvidence('pc-02', {realDownloadBytes: portable.bytes.length, localFailurePreserved: true, memoryRecord: true, realUIRetries: true});
});

test('PC-03: an edit during packaging remains newer than the copy; a packaging failure does not create a record', async ({page}) => {
  await delayArchive(page); await open(page);
  await page.locator('#project-name').fill('Antes de empaquetar');
  await flush(page);
  await page.evaluate(() => { window.__holdArchive = true; });
  const pending = page.waitForEvent('download');
  await clickVisible(page.locator('#save-project'));
  await page.waitForFunction(() => Boolean(window.__releaseArchive));
  const captured = await page.evaluate(() => window.__archiveCaptured);
  await page.locator('#project-name').fill('Después de capturar'); await editSteps(page, 8);
  const active = stableProject(JSON.parse(await exported(page)));
  await page.evaluate(() => { window.__holdArchive = false; window.__releaseArchive(); });
  const result = await pending, bytes = await readFile(await result.path());
  const zip = await JSZip.loadAsync(bytes), manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  expect(manifest.authoring).toEqual(captured.authoring);
  expect(result.suggestedFilename()).toBe('Antes de empaquetar.ggproj');
  expect(stableProject(JSON.parse(await exported(page)))).toEqual(active);
  await expect(page.locator('#project-copy-status')).toHaveText('Hay cambios desde la última solicitud de copia');
  await expect.poll(async () => (await continuity(page)).persisted).toBe(true);
  const record = (await continuity(page)).record;
  expect(record.contentHash).toBe(await projectContentHash(captured));
  await page.evaluate(() => { window.__failArchive = true; });
  await clickVisible(page.locator('#save-project'));
  await expect(page.locator('#project-error')).toContainText('Empaquetado de prueba fallido');
  expect((await continuity(page)).record).toEqual(record);
  expect(stableProject(JSON.parse(await exported(page)))).toEqual(active);
  await saveEvidence('pc-03', {oneCapture: true, postCaptureEditsKept: true, failedPackagingDoesNotRecord: true, contentHash: record.contentHash});
});

test.describe('Base reader fixture without a service-worker interception layer', () => {
  // This case checks old IndexedDB code, not offline. A worker would handle
  // the injected fixture URL before page.route and correctly return 404.
  test.use({serviceWorkers: 'block'});
test('PC-04/06: corrupt optional metadata is ignored, backups keep their own content and old readers still recover snapshots', async ({page}) => {
  await open(page);
  await page.locator('#project-name').fill('Respaldo A'); await flush(page);
  await page.locator('#project-name').fill('Current B'); await flush(page);
  await download(page); await expect.poll(async () => (await continuity(page)).persisted).toBe(true);
  const before = await records(page), id = await page.evaluate(() => studioProbe.project.state().id);
  // Execute the actual storage reader from base 1235693, not the new reader
  // with a version-1 database number. The fixture is byte-identical to HEAD's
  // autosave-store before this change and is served only by this test route.
  const legacySource = await readFile(new URL('../fixtures/legacy-autosave-store-1235693.mjs', import.meta.url), 'utf8');
  await page.route('**/legacy-autosave-store-1235693.mjs', route => route.fulfill({contentType:'text/javascript', body:legacySource}));
  const beforeLegacy = await allLocalRecords(page);
  const legacy = await page.evaluate(async () => {
    const {createAutosaveStore} = await import(new URL('./legacy-autosave-store-1235693.mjs', location.href).href);
    const store = createAutosaveStore({validate:JSON.parse});
    try { const saved = await store.load(); return {saved, repeat:await store.save(saved.serialized)}; }
    finally { store.close(); }
  });
  expect(legacy.saved.serialized).toBe(before.current.serialized);
  expect(legacy.repeat.status).toBe('unchanged');
  expect(await allLocalRecords(page)).toEqual(beforeLegacy);
  await corruptRecords(page, ['current']);
  await page.reload(); await page.waitForFunction(() => Boolean(window.studioProbe?.project)); await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-name')).toHaveValue('Respaldo A');
  await expect(page.locator('#project-copy-status')).toHaveText('Hay cambios desde la última solicitud de copia');
  expect((await records(page)).previous).toEqual(before.previous);
  const afterRecovery = await records(page);
  await page.evaluate(id => new Promise((resolve, reject) => {
    const request = indexedDB.open('gg-studio-projects', 1);
    request.onsuccess = () => { const db = request.result, tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put({version:99, contentHash:'bad'}, 'continuity:' + id);
      tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error); };
  }), id);
  await page.reload(); await page.waitForFunction(() => Boolean(window.studioProbe?.project)); await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-copy-status')).toHaveText('Sin registro de copia en este navegador');
  await expect(page.locator('#project-copy-warning')).toContainText('registro de copia no es válido');
  expect(await records(page)).toEqual(afterRecovery);
  expect((await snapshot(page)).x).toBe(0);
  await saveEvidence('pc-04-06', {backupNotCertifiedByCurrentCopy: true, corruptMetadataIgnored: true, snapshotsPreserved: true, readerDatabaseVersion: 1, readerRevision: '1235693', unchangedWritePreservedMetadata: true});
});

});

test('PC-01/SJ-11: committing A while editing B cannot announce B saved; native exit warning is removed after the real commit', async ({page}) => {
  await holdSnapshotTransactions(page); await open(page);
  await page.locator('#project-name').fill('Base durable'); await flush(page);
  await page.evaluate(() => { window.__holdSnapshotWrites = true; });
  await page.locator('#project-name').fill('Guardado lento A');
  await page.evaluate(() => { window.__slowSave = studioProbe.project.flush().then(() => { window.__stateAfterA = studioProbe.project.state(); }); });
  await page.waitForFunction(() => window.__snapshotWriteHeld);
  await expect(page.locator('#project-status')).toHaveText('Guardando…');
  expect(await page.evaluate(() => studioProbe.project.state().beforeUnloadPending)).toBe(true);
  await page.locator('#project-name').fill('Edición B');
  await page.evaluate(() => { window.__holdSnapshotWrites = false; });
  await page.evaluate(() => window.__slowSave);
  const afterA = await page.evaluate(() => window.__stateAfterA);
  expect(afterA.name).toBe('Edición B'); expect(afterA.dirty).toBe(true);
  expect(afterA.continuity.local).not.toBe('saved');
  await flush(page);
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  expect(await page.evaluate(() => studioProbe.project.state().beforeUnloadPending)).toBe(false);
  expect(await page.evaluate(() => { const event = new Event('beforeunload', {cancelable:true}); window.dispatchEvent(event); return event.defaultPrevented; })).toBe(false);
  await saveEvidence('pc-01-sj-11', {afterA, realTransactionHeld: true, finalDurable: JSON.parse((await records(page)).current.serialized).project.name});
});

test('PC-05/SJ-11: closing with an aborted pending transaction recovers only the previous confirmed authoring', async ({page, context}) => {
  await holdSnapshotTransactions(page); await open(page);
  await page.locator('#project-name').fill('Última revisión durable'); await flush(page);
  const durable = stableProject(JSON.parse(await exported(page)));
  await page.evaluate(() => { window.__holdSnapshotWrites = true; });
  await page.locator('#project-name').fill('Borrador sin confirmar');
  await page.evaluate(() => { window.__pendingSave = studioProbe.project.flush().catch(() => {}); });
  await page.waitForFunction(() => window.__snapshotWriteHeld);
  expect(await page.evaluate(() => { const event = new Event('beforeunload', {cancelable:true}); window.dispatchEvent(event); return event.defaultPrevented; })).toBe(true);
  await page.evaluate(() => { window.__rejectSnapshotWrites = true; window.__heldSnapshotTransaction.abort(); });
  await page.evaluate(() => window.__pendingSave);
  await page.close();
  const returned = await context.newPage(); await open(returned);
  await expect(returned.locator('#project-name')).toHaveValue('Última revisión durable');
  expect(stableProject(JSON.parse(await exported(returned)))).toEqual(durable);
  expect((await snapshot(returned)).x).toBe(0);
  await saveEvidence('pc-05', {realAbort: true, noForcedFlushBeforeClose: true, recoveredConfirmedOnly: true, nativeDialogGuarantee: false});
});

test('SJ-08: ten explicit audio/wait Run and Stop cycles retain authoring and reject every stale GG reference', async ({page}) => {
  test.setTimeout(180000);
  await open(page);
  await page.evaluate(state => studioProbe.editor.load(state), corpus.audioStop);
  await flush(page);
  const original = await authoring(page), cycles = [];
  for (let cycle = 0; cycle < 10; cycle++) {
    await selectContext(page, '2d'); await clickVisible(page.locator('#run-editor'));
    await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
    const play = page.frameLocator('#runner-slot iframe').getByRole('button', {name: 'Reproducir sonido', exact: true});
    await clickVisible(play);
    await expect.poll(async () => (await settled(snapshot, page)).audio.rms).toBeGreaterThan(0.01);
    await page.evaluate(() => { window.__staleCycleGG = GG; });
    await clickVisible(page.locator('#stop-result')); await expect(page.locator('#run-editor')).toBeEnabled();
    const stale = await page.evaluate(() => __staleCycleGG.sprite.move('hero', 100).then(() => null, error => error.message));
    expect(stale).toContain('Stale GG');
    expect((await snapshot(page)).x).toBe(0);
    expect(await authoring(page)).toEqual(original);
    cycles.push({cycle: cycle + 1, stale, initialX: 0});
  }
  await page.waitForTimeout(1300);
  expect((await snapshot(page)).x).toBe(0); expect((await snapshot(page)).threads).toBe(0);
  expect(await authoring(page)).toEqual(original);
  await saveEvidence('sj-08-cycles', {cycles, authoringPreserved: true, lateEffectsAbsent: true});
});

test('PC-06: optional records use database v1 and explicit local clear removes them with current/previous', async ({page}) => {
  await open(page); await page.locator('#project-name').fill('Registro separado'); await flush(page); await download(page);
  await expect.poll(async () => (await continuity(page)).persisted).toBe(true);
  const before = stableProject(JSON.parse(await exported(page))), record = (await continuity(page)).record;
  const result = await page.evaluate(async record => {
    const {createAutosaveStore} = await import(new URL('./app/autosave-store.mjs', location.href).href);
    const store = createAutosaveStore({validate: JSON.parse});
    try {
      const other = {...record, projectId: crypto.randomUUID()};
      await store.saveCopyRecord(other);
      const loaded = await store.loadCopyRecord(record.projectId);
      const durable = await store.load();
      const clearing = await store.clear();
      return {loaded, durable: JSON.parse(durable.serialized), clearing, after: await store.load(), optional: await store.loadCopyRecord(record.projectId)};
    } finally { store.close(); }
  }, record);
  expect(result.loaded.record).toEqual(record);
  expect(stableProject(result.durable)).toEqual(before);
  expect(result.clearing.status).toBe('cleared'); expect(result.after.status).toBe('empty');
  expect(result.optional.status).toBe('missing');
  expect(await allLocalRecords(page)).toEqual({});
  expect(stableProject(JSON.parse(await exported(page)))).toEqual(before);
  await saveEvidence('pc-06-clear', {databaseVersion: 1, metadataDoesNotEnterAuthoring: true, currentPreviousAndRecordsCleared: true});
});

test('PC-BLOCKED: edits under corrupt recovery invalidate the portable copy and warn on exit without overwriting damaged snapshots', async ({page}) => {
  await open(page);
  await page.locator('#project-name').fill('Respaldo'); await flush(page);
  await page.locator('#project-name').fill('Current'); await flush(page);
  await corruptRecords(page, ['current', 'previous']);
  await page.reload(); await page.waitForFunction(() => Boolean(window.studioProbe?.project)); await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-status')).toHaveText('No se pudo recuperar el guardado local');
  const damaged = await records(page);
  await expect.poll(() => page.evaluate(() => Boolean(studioProbe.project.state().contentHash))).toBe(true);
  await download(page);
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  await expect.poll(async () => (await continuity(page)).persisted).toBe(true);
  await page.locator('#project-name').fill('Borrador que sigue editable');
  expect((await continuity(page)).portable).toBe('previous');
  expect(await page.evaluate(() => studioProbe.project.state().beforeUnloadPending)).toBe(true);
  await expect(page.locator('#project-status')).toHaveText('No se pudo recuperar el guardado local');
  await page.waitForTimeout(650); // Past autosave debounce; blocked snapshots must remain untouched.
  expect(await records(page)).toEqual(damaged);
  expect(await page.locator('#project-name').inputValue()).toBe('Borrador que sigue editable');
  await saveEvidence('pc-blocked', {corruptSnapshotsPreserved: true, copyInvalidated: true, pendingExitWarning: true});
});

test('PC-MEMORY: a copy remembered only in this session remains associated with A after opening B and returning to A', async ({page}) => {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function(name, ...args) {
      if (name === 'gg-studio-projects') throw new DOMException('Storage denied', 'SecurityError');
      return open.call(this, name, ...args);
    };
  });
  await open(page);
  await page.locator('#project-name').fill('A sin almacenamiento');
  const portable = await download(page);
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  await expect(page.locator('#project-copy-warning')).toContainText('Solo se recuerda en esta sesión');
  const record = (await continuity(page)).record;
  const b = JSON.parse(await exported(page)); b.project.id = randomUUID(); b.project.name = 'B sin almacenamiento';
  const catalog = await page.evaluate(() => studioProbe.project.catalog());
  await importFile(page, await createProjectArchive(b, {catalog}), 'B.ggproj');
  await expect(page.locator('#project-copy-status')).toHaveText('Sin registro de copia en este navegador');
  await importFile(page, portable.bytes, portable.name);
  await expect.poll(async () => (await continuity(page)).portable).toBe('current');
  expect((await continuity(page)).record).toEqual(record);
  expect((await continuity(page)).persisted).toBe(false);
  await expect(page.locator('#project-status')).toHaveText('Sin guardar en este navegador');
  await expect(page.locator('#project-copy-warning')).toContainText('Solo se recuerda en esta sesión');
  expect((await snapshot(page)).x).toBe(0);
  await saveEvidence('pc-memory', {sameSessionReturn: true, crossProjectIsolation: true, storageDenied: true, noAutorun: true});
});
