import {selectContext,clickVisible,settled} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {artifactPath} from './artifacts.mjs';

const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const authored = page => page.evaluate(() => studioProbe.editor.save());
const field = (page, container, label) => page.locator(container).locator('dt').filter({hasText: new RegExp(`^${label}$`)}).locator('xpath=following-sibling::dd[1]');
async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#inspector-status')).toHaveAttribute('data-state', 'ready');
}
async function run(page, x = 12) {
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
}
async function currentRecord(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('gg-studio-projects', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('snapshots', 'readonly');
      const read = transaction.objectStore('snapshots').get('current');
      let value;
      read.onsuccess = () => { value = read.result ?? null; };
      transaction.oncomplete = () => { db.close(); resolve(value); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }));
}
async function instrumentReads(page) {
  await page.route('**/app/adapters/scratch/browser-scene.mjs', async route => {
    const response = await route.fetch();
    const source = await response.text();
    // Test-only interception at the adapter that owns the GG call.
    if (!source.includes('return ggCall(payload.method, payload.args);')) {
      await route.fulfill({response, body: source});
      return;
    }
    const instrumented = source.replace('return ggCall(payload.method, payload.args);', `
      const dto = ggCall(payload.method, payload.args);
      if (payload.method === 'scene.get') {
        if (inspectionMode === 'invalid') return {...dto, untrusted: true};
        if (inspectionMode === 'hold') {
          window.inspectionHeld = true;
          return new Promise(resolve => { window.releaseInspection = () => resolve(dto); });
        }
      }
      return dto;
    `);
    await route.fulfill({response, body: instrumented + `
let inspectionMode = 'normal';
window.inspectorTest = {mode: value => { inspectionMode = value; }};
`});
  });
}
async function instrumentEditorReadOnly(page) {
  await page.route('**/editor.bundle.js', async route => {
    const response = await route.fetch();
    const source = await response.text();
    // Test-only access to Blockly connection geometry. All block creation,
    // movement, connection and field edits below use real pointer events.
    // F4 bundles a second Blockly editor. Select the scene factory explicitly;
    // the first inject() in bundle order may belong to the device workspace.
    const declaration = /(function createEditor\(container, example\) \{[\s\S]*?const workspace = )([\w$]+)\.inject\(container, \{/;
    expect(source).toMatch(declaration);
    await route.fulfill({response, body: source.replace(declaration, '$1window.inspectorTestWorkspace = $2.inject(container, {')});
  });
}

for (const mobile of [false, true]) {
  test(`GG-INSPECT-001/003: scoped readings preserve authoring and selector works by keyboard (${mobile ? 'mobile' : 'desktop'})`, async ({page}) => {
    if (mobile) await page.setViewportSize({width: 390, height: 844});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await open(page);
    await page.locator('#project-name').fill('Inspeccionar sin modificar');
    await page.evaluate(() => studioProbe.project.flush());
    const before = {authoring: await authored(page), project: await page.evaluate(() => studioProbe.project.state()), record: await currentRecord(page), exported: JSON.parse(await page.evaluate(() => studioProbe.project.export()))};
    await run(page);
    await expect(field(page, '#inspector-runtime', 'x')).toHaveText('12');
    await revealAdvanced(page);
    await clickVisible(page,page.getByRole('button', {name: 'Mover +10', exact: true}));
    await expect(field(page, '#inspector-runtime', 'x')).toHaveText('22');
    await clickVisible(page.getByRole('button', {name: 'Actualizar lectura', exact: true}));
    await expect(page.locator('#inspector-status')).toHaveAttribute('data-state', 'ready');
    const actualGG = await page.evaluate(() => GG.scene.get());
    const actualVM = await snapshot(page);
    const reading = await page.evaluate(() => studioProbe.inspector.state());
    expect(reading.snapshot).toEqual(actualGG);
    expect(reading.snapshot.sprites[0].x).toBe(actualVM.x);
    await expect(field(page, '#inspector-runtime', 'y')).toHaveText(String(actualGG.sprites[0].y));
    await expect(page.locator('#inspector-variables')).toContainText('score: 1 · local de hero · ID gg-score');
    await clickVisible(page.getByText('Estado inicial del proyecto', {exact: true}));
    await expect(field(page, '#inspector-initial', 'x inicial')).toHaveText('0');
    await expect(field(page, '#inspector-initial', 'y inicial')).toHaveText('0');
    const selector = page.getByLabel('Objeto a inspeccionar', {exact: true});
    await selector.focus(); await selector.press('End'); await selector.press('Enter');
    await expect(selector).toHaveValue('scene');
    await expect(field(page, '#inspector-runtime', 'x de hero')).toHaveText('22');
    await expect(page.locator('#inspector-variables')).toContainText('Selecciona hero');
    await selector.focus(); await selector.press('Home'); await selector.press('Enter');
    await expect(selector).toHaveValue('hero');
    await expect(field(page, '#inspector-runtime', 'x')).toHaveText('22');
    expect(await authored(page)).toEqual(before.authoring);
    expect((await page.evaluate(() => studioProbe.project.state())).revision).toBe(before.project.revision);
    expect(await currentRecord(page)).toEqual(before.record);
    const afterExport = JSON.parse(await page.evaluate(() => studioProbe.project.export()));
    for (const key of ['authoring', 'scene', 'resources', 'locks']) expect(afterExport[key]).toEqual(before.exported[key]);
    expect(Object.keys(afterExport).sort()).toEqual(['authoring', 'format', 'locks', 'project', 'resources', 'scene', 'version']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile ? 390 : 1280);
    await page.locator('.scene-inspector').screenshot({path: artifactPath(`scene-inspector-${mobile ? 'mobile' : 'desktop'}.png`)});
    expect(errors).toEqual([]);
    await writeFile(artifactPath(`scene-inspector-${mobile ? 'mobile' : 'desktop'}.json`), JSON.stringify({reading, actualGG, runtimeX: actualVM.x, initialX: 0, authoringPreserved: true, autosaveUnchanged: true, errors}, null, 2));
  });
}

test('GG-INSPECT-002: invalid DTO preserves valid reading and Stop discards an outstanding old-session read', async ({page}) => {
  await instrumentReads(page);
  await open(page); await run(page);
  await expect(field(page, '#inspector-runtime', 'x')).toHaveText('12');
  const authoring = await authored(page);
  const frame = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4174/'));
  await frame.evaluate(() => inspectorTest.mode('invalid'));
  await clickVisible(page.getByRole('button', {name: 'Actualizar lectura', exact: true}));
  await expect(page.locator('#inspector-status')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('#inspector-status')).toContainText('Se conserva la última lectura válida');
  await expect(field(page, '#inspector-runtime', 'x')).toHaveText('12');
  await expect(page.locator('#refresh-inspector')).toBeEnabled();
  await expect(page.locator('#inspector-object')).toBeEnabled();
  expect(await authored(page)).toEqual(authoring);
  expect((await snapshot(page)).x).toBe(12);
  await frame.evaluate(() => inspectorTest.mode('normal'));
  await clickVisible(page.getByRole('button', {name: 'Actualizar lectura', exact: true}));
  await expect(page.locator('#inspector-status')).toHaveAttribute('data-state', 'ready');
  await frame.evaluate(() => inspectorTest.mode('hold'));
  await page.evaluate(() => { window.oldInspection = studioProbe.inspector.refresh(); });
  await expect.poll(() => frame.evaluate(() => window.inspectionHeld)).toBe(true);
  await expect(page.locator('#inspector-status')).toHaveAttribute('data-state', 'loading');
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await page.evaluate(() => window.oldInspection);
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#inspector-status')).toHaveAttribute('data-state', 'ready');
  await expect(field(page, '#inspector-runtime', 'x')).toHaveText('0');
  expect(frame.isDetached()).toBe(true);
  expect((await page.evaluate(() => studioProbe.inspector.state())).error).toBeNull();
  expect(await authored(page)).toEqual(authoring);
});

test('GG-INSPECT-003: real toolbox drag connects costume block, portable reopen preserves IDs and rendered behavior', async ({page, browser}) => {
  await instrumentEditorReadOnly(page);
  await open(page);
  expect(await page.evaluate(() => document.querySelector('#blockly-editor').contains(inspectorTestWorkspace.getInjectionDiv()))).toBe(true);
  await clickVisible(page.getByRole('treeitem', {name: 'Apariencia', exact: true}));
  const flyout = page.locator('.blocklyFlyout .blocklyDraggable').first();
  await expect(flyout).toBeVisible();
  const start = await flyout.boundingBox();
  const editor = await page.locator('#blockly-editor').boundingBox();
  const pointer = {x: start.x + Math.min(70, start.width / 2), y: start.y + Math.min(18, start.height / 2)};
  const middle = {x: editor.x + editor.width * .7, y: editor.y + editor.height * .6};
  await page.mouse.move(pointer.x, pointer.y); await page.mouse.down();
  await page.mouse.move(middle.x, middle.y, {steps: 15});
  await expect.poll(() => page.evaluate(() => inspectorTestWorkspace.getAllBlocks(false).filter(block => block.type === 'gg_set_costume').length)).toBe(1);
  const connection = await page.evaluate(() => {
    const workspace = inspectorTestWorkspace;
    const added = workspace.getAllBlocks(false).find(block => block.type === 'gg_set_costume');
    const ending = workspace.getBlockById('editable-repeat');
    const screen = (block, connection) => {
      const offset = connection.getOffsetInBlock();
      const point = new DOMPoint(offset.x, offset.y).matrixTransform(block.getSvgRoot().getScreenCTM());
      return {x: point.x, y: point.y};
    };
    return {id: added.id, from: screen(added, added.previousConnection), to: screen(ending, ending.nextConnection)};
  });
  await page.mouse.move(middle.x + connection.to.x - connection.from.x, middle.y + connection.to.y - connection.from.y, {steps: 15});
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => inspectorTestWorkspace.getBlockById('editable-repeat').getNextBlock()?.type)).toBe('gg_set_costume');
  const added = page.locator(`#blockly-editor [data-id="${connection.id.replaceAll('"', '\\"')}"]:visible`).first();
  await clickVisible(added.locator('.blocklyDropdownText:visible'));
  await clickVisible(page.locator('.blocklyMenuItem').filter({hasText: /^hero-alt$/}));
  await expect(page.locator('#generated-code')).toHaveValue(/cambiar disfraz a "hero-alt"/);
  const authoring = await authored(page);
  await page.evaluate(() => studioProbe.project.flush());
  await run(page);
  await expect.poll(async () => (await settled(snapshot, page)).costume.name).toBe('hero-alt');
  expect((await snapshot(page)).bluePixels).toBeGreaterThan(100);
  const pendingDownload = page.waitForEvent('download');
  await clickVisible(page.getByRole('button', {name: 'Llevar o entregar', exact: true}));
  const file = await pendingDownload;
  const filePath = artifactPath('scene-inspector-toolbox.ggproj');
  await file.saveAs(filePath);
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  expect(manifest.authoring.blockly).toEqual(authoring);
  expect(manifest.scene.x).toBe(0);
  expect(manifest.scene.costume).toBe('hero');
  const context = await browser.newContext();
  const reopened = await context.newPage();
  await open(reopened);
  await reopened.locator('#open-project').setInputFiles(filePath);
  await expect(reopened.locator('#recovery-notice')).toContainText('Proyecto abierto');
  await expect(reopened.locator('#run-editor')).toBeEnabled();
  expect(await authored(reopened)).toEqual(authoring);
  expect((await snapshot(reopened)).costume.name).toBe('hero');
  await run(reopened);
  await expect.poll(async () => (await snapshot(reopened)).costume.name).toBe('hero-alt');
  await writeFile(artifactPath('scene-inspector-toolbox.json'), JSON.stringify({addedBlockId: connection.id, authoring, reopenedCostume: (await snapshot(reopened)).costume, portableInitialCostume: manifest.scene.costume, runtimeX: (await snapshot(reopened)).x}, null, 2));
  await context.close();
});
