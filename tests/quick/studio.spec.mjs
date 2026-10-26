import {selectContext,clickVisible,revealControl} from '../browser/workspace-controls.mjs';
import {revealAdvanced} from '../browser/advanced-controls.mjs';
import {test, expect} from '@playwright/test';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const state = page => page.evaluate(() => studioProbe.request('snapshot'));
const authoring = page => page.evaluate(() => studioProbe.editor.save());
async function open(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function record(name, result) {
  const output = process.env.GG_TEST_EVIDENCE_DIR ?? 'artifacts/test-runs/quick-cases';
  await mkdir(output, {recursive: true});
  await writeFile(join(output, `${name}.json`), JSON.stringify(result, null, 2) + '\n');
}

test('Quick: native Blockly edit, Run, GG control and Stop preserve authoring', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const field = page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await selectContext(page,'2d');
  await field.dblclick();
  await page.locator('.blocklyHtmlInput').fill('6');
  await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText('6');
  const original = await authoring(page);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await state(page)).x).toBe(18);
  const before = await state(page);
  expect(before.pixels.count).toBeGreaterThan(300);
  await revealAdvanced(page);
  await clickVisible(page,page.getByRole('button', {name: 'Mover +10', exact: true}));
  await expect.poll(async () => (await state(page)).x).toBe(28);
  const after = await state(page);
  expect(after.pixels.centerX - before.pixels.centerX).toBeCloseTo(10, 0);
  const oldFrame = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4174/'));
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(oldFrame.isDetached()).toBe(true);
  expect(await authoring(page)).toEqual(original);
  expect(errors).toEqual([]);
  await record('authoring', {editSteps: 6, executedX: 18, externalX: 28, sourcePreserved: true, errors});
});

test('Quick: confirmed autosave and an actual GGPROJ download reopen without autorun', async ({page}) => {
  await open(page);
  const writes = [];
  page.on('request', request => { if (!['GET', 'HEAD'].includes(request.method())) writes.push({method: request.method(), url: request.url()}); });
  await page.locator('#project-name').fill('Proyecto rápido');
  await selectContext(page,'microbit');
  // The independent TypeScript document lives in the Firmware consultation tab.
  await revealControl(page,page.locator('#source'));
  await page.locator('#source').fill('basic.showNumber(5)');
  const original = await authoring(page);
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  const downloaded = page.waitForEvent('download');
  await clickVisible(page.getByRole('button', {name: 'Llevar o entregar', exact: true}));
  const file = await downloaded;
  const bytes = await readFile(await file.path());
  expect([...bytes.subarray(0, 4)]).toEqual([80, 75, 3, 4]);
  await page.reload();
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#project-name')).toHaveValue('Proyecto rápido');
  await expect(page.locator('#source')).toHaveValue('basic.showNumber(5)');
  expect(await authoring(page)).toEqual(original);
  expect((await state(page)).x).toBe(0);
  await page.locator('#open-project').setInputFiles({name: 'proyecto-rapido.ggproj', mimeType: 'application/zip', buffer: bytes});
  await expect(page.locator('#open-project')).toHaveValue('');
  await expect(page.locator('#project-error')).toBeEmpty();
  expect(await authoring(page)).toEqual(original);
  expect((await state(page)).threads).toBe(0);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect.poll(async () => (await state(page)).x).toBe(12);
  expect(writes).toEqual([]);
  await record('persistence', {downloadBytes: bytes.length, restoredName: 'Proyecto rápido', authoringPreserved: true, initialX: 0, rerunX: 12, serverWrites: writes});
});

test('Quick: origin isolation and Stop discard a blocked worker and stale GG references', async ({page}) => {
  await open(page);
  const original = await authoring(page);
  const isolation = await page.evaluate(() => studioProbe.request('isolation-probe'));
  expect(isolation.dom.blocked).toBe(true);
  expect(isolation.storage.blocked).toBe(true);
  const workers = [];
  page.on('worker', worker => {
    const item = {url: worker.url(), closed: false};
    workers.push(item);
    worker.on('close', () => { item.closed = true; });
  });
  const oldFrame = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4174/'));
  await page.evaluate(() => { window.__quickOldGG = GG; return studioProbe.request('start-loop-worker'); });
  await expect.poll(() => workers.some(worker => worker.url.endsWith('/loop-worker.js') && !worker.closed)).toBe(true);
  const oldWorkers = [...workers];
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(oldFrame.isDetached()).toBe(true);
  await expect.poll(() => oldWorkers.filter(worker => !worker.closed).length).toBe(0);
  const stale = await page.evaluate(() => __quickOldGG.sprite.move('hero', 10).then(() => null, error => error.message));
  expect(stale).toContain('Stale GG');
  expect(await authoring(page)).toEqual(original);
  expect((await state(page)).threads).toBe(0);
  await record('isolation', {isolation, oldWorkers, replacementWorkers: workers.filter(worker => !oldWorkers.includes(worker)), stale, authoringPreserved: true});
});
