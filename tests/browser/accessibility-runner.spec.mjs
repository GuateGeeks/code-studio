import {selectContext,clickVisible} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {workspaceFromIR} from '../../src/editor/workspace-from-ir.mjs';

const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const runner = page => page.frameLocator('#runner-slot > iframe');
const stage = page => runner(page).locator('#stage');
const selector = page => runner(page).getByLabel('Objeto que recibe el clic');
const activate = page => runner(page).locator('#activate-stage-target');
async function shellClick(page, id) {
  const control = page.locator(id);
  await control.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await control.click();
}
const sceneIR = {
  version: 0, variables: [{id: 'clone-mark', name: 'esClon', initialValue: 0}], scripts: [
    {event: 'start', sourceBlockId: 'accessible-start', body: [{kind: 'move', steps: 100, sourceBlockId: 'start-away'}, {kind: 'createClone', sourceBlockId: 'create-copy'}]},
    {event: 'clone', sourceBlockId: 'accessible-clone', body: [{kind: 'setVariable', variableId: 'clone-mark', name: 'esClon', value: 1, sourceBlockId: 'mark-copy'}, {kind: 'move', steps: -180, sourceBlockId: 'copy-away'}]},
    {event: 'click', sourceBlockId: 'accessible-click', body: [{kind: 'if', sourceBlockId: 'which-target',
      condition: {kind: 'compare', operator: 'EQ', sourceBlockId: 'clone-comparison', left: {kind: 'variable', variableId: 'clone-mark', name: 'esClon', sourceBlockId: 'read-clone-mark'}, right: 1},
      body: [{kind: 'deleteClone', sourceBlockId: 'remove-clicked-copy'}], elseBody: [{kind: 'move', steps: 11, sourceBlockId: 'move-clicked-original'}]}]},
    {event: 'key', key: 'space', sourceBlockId: 'accessible-key', body: [{kind: 'move', steps: 7, sourceBlockId: 'move-space'}]}
  ]
};
const state = workspaceFromIR(sceneIR);
async function open(page, mobile = false) {
  if (mobile) await page.setViewportSize({width: 390, height: 844});
  await page.goto('/'); await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(blocks => studioProbe.editor.load(blocks), state);
}
async function run(page) {
  await selectContext(page,'2d');
  await clickVisible(page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await snapshot(page)).targets.length).toBe(2);
  await expect.poll(async () => (await snapshot(page)).x).toBe(100);
  await expect(selector(page).locator('option')).toHaveCount(2);
}
async function point(page, x, y) {
  // Chromium throttles rAF in an offscreen cross-origin iframe. Bring its
  // shell slot into view before asking Playwright to await canvas stability.
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();
  await stage(page).scrollIntoViewIfNeeded();
  const bounds = await stage(page).boundingBox();
  // Convert a known Scratch coordinate to the actual object-fit image, rather
  // than clicking the canvas centre (which could hide a letterbox regression).
  const imageHeight = Math.min(bounds.height, bounds.width * .75), imageWidth = imageHeight * 4 / 3;
  await page.mouse.click(bounds.x + (bounds.width - imageWidth) / 2 + imageWidth * (x + 240) / 480,
    bounds.y + (bounds.height - imageHeight) / 2 + imageHeight * (180 - y) / 360);
}
async function semanticOriginal(page, key = 'Enter') {
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();
  await selector(page).selectOption({label: 'hero'});
  await activate(page).press(key);
}

for (const mobile of [false, true]) test('GG-F7-RUNNER: off-centre pointer and semantic target agree, keyboard escapes, clone identity and Stop (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}, testInfo) => {
  test.setTimeout(120000); await open(page, mobile); await run(page);
  const authoring = await page.evaluate(() => studioProbe.editor.save());
  await point(page, 100, 0);
  await expect.poll(async () => (await snapshot(page)).x).toBe(111);
  await semanticOriginal(page);
  await expect.poll(async () => (await snapshot(page)).x).toBe(122);
  await stage(page).focus(); await stage(page).press('Tab'); await expect(selector(page)).toBeFocused();
  await selector(page).press('Shift+Tab'); await expect(stage(page)).toBeFocused();
  await stage(page).press('Escape'); await expect(stage(page)).toBeFocused();
  await stage(page).press('Control+Space');
  expect((await snapshot(page)).x).toBe(122);
  await stage(page).press('Space');
  await expect.poll(async () => (await snapshot(page)).x).toBe(129);
  const clone = (await snapshot(page)).targets.find(target => !target.isOriginal);
  expect(clone.x).toBe(-73);
  await selector(page).selectOption(clone.id); await activate(page).press('Space');
  await expect.poll(async () => (await snapshot(page)).targets.length).toBe(1);
  await expect(selector(page).locator('option')).toHaveCount(1);
  expect((await snapshot(page)).x).toBe(129);
  const bounds = await stage(page).boundingBox();
  const width = Math.min(bounds.width, bounds.height * 4 / 3), height = width * .75;
  if (bounds.width - width > 8 || bounds.height - height > 8) {
    await page.mouse.click(bounds.x + 2, bounds.y + 2);
    expect((await snapshot(page)).x).toBe(129);
  }
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();
  await page.screenshot({path: testInfo.outputPath('runner-controls-' + (mobile ? 'mobile' : 'desktop') + '.png'), timeout: 10000});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const old = await activate(page).elementHandle();
  await shellClick(page, '#stop-result'); await expect(page.locator('#run-editor')).toBeEnabled();
  await expect.poll(async () => (await snapshot(page)).x).toBe(0);
  await expect(old.evaluate(button => button.click())).rejects.toThrow();
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
  await run(page); await semanticOriginal(page);
  await expect.poll(async () => (await snapshot(page)).x).toBe(111);
});

for (const language of ['javascript', 'python']) test('GG-F7-RUNNER: semantic target activates the actual native callback and clone of an independent ' + language + ' document', async ({page}) => {
  test.setTimeout(150000); await open(page);
  await selectContext(page,'2d');
  await clickVisible(page.locator('#copy-' + language));
  await expect(page.locator('#copy-status')).toContainText('creada');
  await clickVisible(page.locator('#run-document'));
  await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles', {timeout: 60000});
  await expect.poll(async () => (await snapshot(page)).targets.length).toBe(2);
  await expect.poll(async () => (await snapshot(page)).x).toBe(100);
  await expect(stage(page)).toHaveAccessibleName('Escenario 2D del documento de texto');
  const source = await page.locator('#text-source').inputValue();
  await semanticOriginal(page); await expect.poll(async () => (await snapshot(page)).x).toBe(111);
  const clone = (await snapshot(page)).targets.find(target => !target.isOriginal);
  await expect(selector(page).locator('option')).toHaveCount(2);
  await selector(page).selectOption(clone.id); await activate(page).press('Enter');
  await expect.poll(async () => (await snapshot(page)).targets.length).toBe(1);
  expect((await snapshot(page)).x).toBe(111);
  await expect(page.locator('#text-source')).toHaveValue(source);
  await shellClick(page, '#stop-result'); await expect(page.locator('#run-editor')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
});

test('GG-F7-RUNNER: imported Stage click uses the same native Stage hat as a pointer on empty background', async ({page}) => {
  test.setTimeout(120000); await page.goto('/'); await expect(page.locator('#run-editor')).toBeEnabled();
  const zip = await JSZip.loadAsync(await readFile(new URL('../fixtures/sb3/03-click.sb3', import.meta.url)));
  const project = JSON.parse(await zip.file('project.json').async('string')), stageTarget = project.targets[0];
  stageTarget.variables['stage-clicks'] = ['clicsEscena', 0];
  stageTarget.blocks['stage-hat'] = {opcode: 'event_whenstageclicked', next: 'stage-change', parent: null, inputs: {}, fields: {}, shadow: false, topLevel: true, x: 20, y: 20};
  stageTarget.blocks['stage-change'] = {opcode: 'data_changevariableby', next: null, parent: 'stage-hat', inputs: {VALUE: [1, [4, '1']]}, fields: {VARIABLE: ['clicsEscena', 'stage-clicks']}, shadow: false, topLevel: false};
  zip.file('project.json', JSON.stringify(project));
  await page.locator('#authoring-context').selectOption('sb3');
  await page.locator('#import-sb3').setInputFiles({name: 'stage-click.sb3', mimeType: 'application/zip', buffer: await zip.generateAsync({type: 'nodebuffer'})});
  await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
  await clickVisible(page.locator('#run-sb3')); await expect(page.locator('#status')).toHaveText('Proyecto Scratch activo');
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();
  await expect(stage(page)).toHaveAccessibleName('Escenario del proyecto Scratch importado');
  const id = await selector(page).locator('option').filter({hasText: /^escenario /}).getAttribute('value');
  await selector(page).selectOption(id); await activate(page).press('Enter');
  const clicks = async () => Object.values((await snapshot(page)).globalVariables).find(variable => variable.name === 'clicsEscena')?.value;
  await expect.poll(clicks).toBe(1); await point(page, -200, 130); await expect.poll(clicks).toBe(2);
  expect((await snapshot(page)).targets.find(target => target.name === 'hero').x).toBe(0);
});

for (const mobile of [false, true]) test('GG-F7-RUNNER: controls, off-centre pointer and simulator remain usable together (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}) => {
  test.setTimeout(120000); await open(page, mobile);
  await page.locator('#authoring-context').selectOption('microbit'); await clickVisible(page.locator('#enable-device'));
  await expect(page.locator('#device-status')).toContainText('Dispositivo añadido');
  await clickVisible(page.locator('#run-device'));
  await expect(page.locator('#device-status')).toContainText('Escena y dispositivo activos');
  await expect.poll(async () => (await snapshot(page)).x).toBe(100);
  await expect(stage(page)).toBeVisible(); await expect(activate(page)).toBeVisible();
  await expect(runner(page).frameLocator('iframe').getByRole('button', {name: 'A', exact: true})).toBeVisible();
  await point(page, 100, 0); await expect.poll(async () => (await snapshot(page)).x).toBe(111);
  await semanticOriginal(page); await expect.poll(async () => (await snapshot(page)).x).toBe(122);
  expect(await runner(page).locator('body').evaluate(body => body.scrollWidth <= innerWidth)).toBe(true);
  await shellClick(page, '#stop-result'); await expect(page.locator('#run-editor')).toBeEnabled();
});
