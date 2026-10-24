import {selectContext,clickVisible,revealPanel,settled} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
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
  await clickVisible(page.getByRole('button', {name: 'Descargar proyecto', exact: true}));
  const result = await pending;
  expect(result.suggestedFilename()).toMatch(/\.ggproj$/);
  return {name: result.suggestedFilename(), bytes: await readFile(await result.path())};
}
async function importFile(page, bytes, name = 'reabrir.ggproj') {
  await page.locator('#open-project').setInputFiles({name, mimeType: 'application/zip', buffer: bytes});
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
  expect(manifest.scene.x).toBe(0);
  expect(manifest.scene.y).toBe(0);
  const id = manifest.project.id;
  await page.close();

  const fresh = await browser.newContext({baseURL: 'http://127.0.0.1:4173', viewport: {width: 390, height: 844}});
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
    expect(restored.scene.x).toBe(0);
    expect((await snapshot(reopened)).x).toBe(0);
    await run(reopened, 18);
    expect((await snapshot(reopened)).sourceMap['editable-move']).toBe('editable-move');
    expect(await reopened.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await reopened.screenshot({path: artifactPath('f1-project-mobile.png'), fullPage: true});
    await saveEvidence('portable', {filename: saved.name, localArtifact: artifactPath('f1-example.ggproj'), bytes: saved.bytes.length, sha256: createHash('sha256').update(saved.bytes).digest('hex'), entries: Object.keys(zip.files), projectId: id, authoringPreserved: true, sourcePreserved: true, initialX: restored.scene.x, runtimeX: (await snapshot(reopened)).x, freshContext: true});
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
  const oldFrame = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4174/'));
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
  expect(runnerUrl.origin).toBe('http://127.0.0.1:4174');
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
