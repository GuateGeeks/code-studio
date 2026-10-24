import {selectContext,clickVisible,revealPanel} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
async function open(page) { await page.goto('/'); await expect(page.locator('#run-editor')).toBeEnabled(); }
async function run(page, x = 12) { await selectContext(page,'2d'); await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true})); await expect(page.locator('#status')).toHaveText('Bloques ejecutados'); await expect.poll(async () => (await snapshot(page)).x).toBe(x); }

test('GG-BLOCK-005/GG-SCRATCH-011: native Blockly edit and GG bindings share one rendered state', async ({page}) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await open(page);
  const field = page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await expect(field).toHaveText('4');
  await selectContext(page,'2d');
  await field.dblclick();
  const input = page.locator('.blocklyHtmlInput');
  await expect(input).toBeVisible(); await input.fill('6'); await input.press('Enter');
  await expect(field).toHaveText('6');
  const authoring = await page.evaluate(() => studioProbe.editor.save());
  const before = await snapshot(page);
  await run(page, 18);
  await revealAdvanced(page);
  await clickVisible(page,page.getByRole('button', {name: 'Mover +10', exact: true}));
  await expect(page.locator('#position')).toHaveText('x = 28');
  expect(await page.evaluate(() => GG.sprite.get('hero'))).toEqual({id: 'hero', name: 'hero', x: 28, y: 0});
  await page.evaluate(() => GG.sprite.setPosition('hero', {x: 40, y: 0}));
  await revealAdvanced(page);
  await revealPanel(page,page.locator('#gg-score'));await page.locator('#gg-score').fill('4');
  await revealAdvanced(page);
  await clickVisible(page,page.getByRole('button', {name: 'Aplicar variable'}));
  await expect.poll(() => page.evaluate(() => GG.variables.get('gg-score').then(item => item.value))).toBe(4);
  await revealAdvanced(page);
  await clickVisible(page,page.getByRole('button', {name: 'Enviar boost'}));
  await expect.poll(async () => (await snapshot(page)).x).toBe(45);
  const after = await snapshot(page);
  const scene = await page.evaluate(() => GG.scene.get());
  expect(scene.sprites[0].x).toBe(after.x);
  expect(scene.variables).toEqual([{id: 'gg-score', name: 'score', value: 5}]);
  expect(after.variables['gg-score'].value).toBe(5);
  expect(after.pixels.centerX - before.pixels.centerX).toBeCloseTo(45, 0);
  expect(after.sourceMap['editable-read']).toBe('editable-read');
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
  await page.screenshot({path: artifactPath('bindings-editor.png'), fullPage: true});
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
  await run(page, 18);
  expect(Number((await snapshot(page)).variables['gg-score'].value)).toBe(1);
  expect((await page.evaluate(() => GG.variables.get('gg-score'))).value).toBe(1);
  expect(errors).toEqual([]);
  await writeFile(artifactPath('bindings-editor.json'), JSON.stringify({before, after, scene, authoringPreserved: true, errors}, null, 2));
});

test('GG-RUN-008: stale clients, stale wire revisions and invalid GG arguments cannot mutate a new scene', async ({page}) => {
  await open(page); await run(page);
  const old = await page.evaluate(() => { window.retainedGG = GG; return studioProbe.state(); });
  await page.evaluate(() => studioProbe.request('load-program', {ir: studioProbe.editor.program()}));
  const clientError = await page.evaluate(() => retainedGG.sprite.move('hero', 10).then(() => null, error => error.message));
  expect(clientError).toContain('Stale GG');
  const wireError = await page.evaluate(revision => studioProbe.request('gg-call', {revision, method: 'sprite.move', args: ['hero', 10]}).then(() => null, error => error.message), old.revision);
  expect(wireError).toContain('Stale GG');
  const failures = await page.evaluate(async () => {
    const actions = [() => GG.sprite.move('missing', 1), () => GG.sprite.move('hero', NaN), () => GG.sprite.setPosition('hero', {x: 999, y: 0}), () => GG.variables.set('absent', 1), () => GG.events.emit('remote-event')];
    return Promise.all(actions.map(action => action().then(() => null, error => error.message)));
  });
  expect(failures.every(Boolean)).toBe(true);
  expect((await snapshot(page)).x).toBe(0);
  await page.evaluate(() => { window.beforeStopGG = GG; });
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  const sessionError = await page.evaluate(() => beforeStopGG.sprite.move('hero', 20).then(() => null, error => error.message));
  expect(sessionError).toContain('Stale GG');
  expect((await snapshot(page)).x).toBe(0);
  await writeFile(artifactPath('bindings-stale.json'), JSON.stringify({clientError, wireError, sessionError, failures, final: await snapshot(page)}, null, 2));
});

test('GG-BLOCK-005: invalid wire IR and unsupported authoring leave the current scene intact', async ({page}) => {
  await open(page); await run(page);
  const before = await snapshot(page);
  const rejected = await page.evaluate(async () => {
    const ir = studioProbe.editor.program();
    const variants = [{...ir, extensions: ['https://example.invalid/extension.js']}, {...ir, scripts: [{...ir.scripts[0], body: [{kind: 'eval', sourceBlockId: 'unsafe'}]}]}];
    return Promise.all(variants.map(ir => studioProbe.request('load-program', {ir}).then(() => null, error => error.message)));
  });
  expect(rejected.every(item => item?.includes('Invalid GG program'))).toBe(true);
  expect((await snapshot(page)).revision).toBe(before.revision);
  expect((await snapshot(page)).x).toBe(12);
  await page.evaluate(() => studioProbe.editor.load({blocks: {languageVersion: 0, blocks: [{type: 'text', id: 'unsupported-editor', fields: {TEXT: 'no-op?'}}]}}));
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#editor-error')).toContainText('Unsupported block text (unsupported-editor)');
  expect((await snapshot(page)).revision).toBe(before.revision);
  expect((await snapshot(page)).x).toBe(12);
  await clickVisible(page.getByRole('button', {name: 'Restaurar ejemplo'})); await run(page);
  await writeFile(artifactPath('bindings-validation.json'), JSON.stringify({rejected, before, final: await snapshot(page), recovered: true}, null, 2));
});

test('Editable workspace and GG controls remain usable at mobile width', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('#blockly-editor .blocklySvg')).toBeVisible();
  await run(page);
  await revealAdvanced(page);
  await clickVisible(page,page.getByRole('button', {name: 'Mover +10', exact: true}));
  await expect(page.locator('#position')).toHaveText('x = 22');
  await page.screenshot({path: artifactPath('bindings-editor-mobile.png'), fullPage: true});
});
