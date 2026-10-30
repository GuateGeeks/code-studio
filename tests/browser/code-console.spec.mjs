import {selectContext,clickVisible,consult,revealPanel,settled} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {artifactPath} from './artifacts.mjs';

const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
// Test-only sender instrumentation appended within the served module scope.
// Production runner exposes no diagnostic injection or compiler replacement API.
async function instrumentRunner(page) {
  await page.route('**/app/runtime/runner.js', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body: (await response.text()) + `
window.runnerTest = {
  send,
  revision: () => projectRevision,
  sequence: () => outputSequence,
  delayCompiler: () => {
    compilerCall = async () => {
      window.delayedStarted = true;
      return new Promise((resolve, reject) => { window.rejectDelayed = reject; });
    };
  }
};
`});
  });
}

async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#generated-status')).toHaveText('Actualizado desde tus bloques');
}
async function run(page, x = 18) {
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
}
async function edit(page, value) {
  const field = page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await selectContext(page,'2d');
  await field.dblclick();
  await page.locator('.blocklyHtmlInput').fill(value);
  await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText(value);
}
for (const mobile of [false, true]) {
  test(`GG-CODE/CONSOLE: edit → listing → run → source → Stop → portable reopen (${mobile ? 'mobile' : 'desktop'})`, async ({page, browser}) => {
    if (mobile) await page.setViewportSize({width: 390, height: 844});
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await open(page);
    await consult(page, 'Código');
    await expect(page.locator('#generated-code')).toHaveAttribute('readonly', '');
    await expect(page.locator('#generated-code')).toHaveValue(/mover 4 pasos/);
    await edit(page, '6');
    await expect(page.locator('#generated-code')).toHaveValue(/mover 6 pasos/);
    await revealPanel(page,page.locator('#generated-code'));await page.locator('#generated-code').press('ControlOrMeta+A');
    await revealPanel(page,page.locator('#generated-code'));await page.locator('#generated-code').press('Backspace');
    await expect(page.locator('#generated-code')).toHaveValue(/mover 6 pasos/);
    const authoring = await page.evaluate(() => studioProbe.editor.save());
    const listing = await page.evaluate(() => studioProbe.console.listing());
    expect(listing.sourceMap.flat()).toContain('editable-move');
    await run(page);
    const link = page.getByRole('button', {name: 'Ver bloque editable-start', exact: true, includeHidden: true});
    await expect(link).toBeEnabled();
    await clickVisible(page,link);
    await expect(page.locator('#console-selection')).toHaveText('Bloque seleccionado: editable-start');
    expect(await page.evaluate(() => studioProbe.editor.selectedSource())).toBe('editable-start');
    await link.focus();
    await link.press('Enter');
    expect(await page.evaluate(() => studioProbe.editor.selectedSource())).toBe('editable-start');
    expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile ? 390 : 1280);
    await selectContext(page,'2d');
    await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
    await expect(page.locator('#run-editor')).toBeEnabled();
    await expect(page.locator('#console-summary')).toHaveText('Sin mensajes');
    await page.evaluate(() => studioProbe.project.flush());
    await page.reload();
    await expect(page.locator('#run-editor')).toBeEnabled();
    expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
    expect(await page.evaluate(() => studioProbe.console.listing())).toEqual(listing);
    await expect(page.locator('#console-summary')).toHaveText('Sin mensajes');
    expect((await snapshot(page)).x).toBe(0);
    const download = page.waitForEvent('download');
    await clickVisible(page.getByRole('button', {name: 'Llevar o entregar'}));
    const file = await download;
    const filePath = artifactPath(`code-console-${mobile ? 'mobile' : 'desktop'}.ggproj`);
    await file.saveAs(filePath);
    const zip = await JSZip.loadAsync(await readFile(filePath));
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    // R1: the initial project is GGPROJ v3, whose authoring always lists its (empty) text documents.
    expect(Object.keys(manifest.authoring).sort()).toEqual(['blockly', 'deviceSource', 'selectedTextDocumentId', 'textDocuments']);
    expect(manifest.authoring.textDocuments).toEqual([]);expect(manifest.authoring.selectedTextDocumentId).toBeNull();
    expect(JSON.stringify(manifest)).not.toMatch(/SCRIPT_STARTED|generatedCode|sourceMap|consoleEntries/);
    const context = await browser.newContext({viewport: {width: mobile ? 390 : 1280, height: 900}});
    const reopened = await context.newPage();
    await open(reopened);
    await reopened.locator('#open-project').setInputFiles(filePath);
    await expect(reopened.locator('#recovery-notice')).toContainText('Proyecto abierto');
    await expect(reopened.locator('#run-editor')).toBeEnabled();
    expect(await reopened.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
    expect(await reopened.evaluate(() => studioProbe.console.listing())).toEqual(listing);
    expect((await snapshot(reopened)).x).toBe(0);
    await expect(reopened.locator('#console-summary')).toHaveText('Sin mensajes');
    await run(reopened);
    await clickVisible(reopened,reopened.getByRole('button', {name: 'Ver bloque editable-start', exact: true, includeHidden: true}));
    expect(await reopened.evaluate(() => studioProbe.editor.selectedSource())).toBe('editable-start');
    // Capture after interaction assertions: tall element screenshots can resize
    // Chromium's viewport and invalidate cross-origin hit-test surfaces.
    if (mobile) {
      await reopened.locator('.authoring').screenshot({path: artifactPath('code-console-mobile.png')});
      await reopened.locator('#runner-slot').scrollIntoViewIfNeeded();
      await snapshot(reopened);
      await reopened.screenshot({path: artifactPath('code-console-mobile-stage.png')});
    } else await reopened.screenshot({path: artifactPath('code-console-desktop.png'), fullPage: true});
    expect(errors).toEqual([]);
    await writeFile(artifactPath(`code-console-flow-${mobile ? 'mobile' : 'desktop'}.json`), JSON.stringify({authoring, listing, final: await snapshot(reopened), errors}, null, 2));
    await context.close();
  });
}

test('GG-CODE/CONSOLE: invalid generation/import preserve live scene and source errors remain selectable', async ({page}) => {
  await open(page); await run(page, 12);
  const before = await snapshot(page);
  const rejected = await page.evaluate(() => GG.sprite.move('missing', 1).then(() => null, error => error.message));
  expect(rejected).toBeTruthy();
  await expect(page.locator('#console-entries')).toContainText('RUNNER_COMMAND_FAILED');
  const state = await page.evaluate(() => studioProbe.state());
  await edit(page, '999');
  await expect(page.locator('#generated-code')).toHaveValue('');
  await clickVisible(page,page.getByRole('button', {name: 'Ver bloque editable-move', exact: true, includeHidden: true}));
  expect(await page.evaluate(() => studioProbe.editor.selectedSource())).toBe('editable-move');
  expect((await snapshot(page)).x).toBe(12);
  await clickVisible(page.getByRole('button', {name: 'Restaurar ejemplo'}));
  await page.evaluate(() => studioProbe.editor.load({blocks: {languageVersion: 0, blocks: [{type: 'text', id: 'unsupported-editor', fields: {TEXT: '<script>no</script>'}}]}}));
  await expect(page.locator('#generated-code')).toHaveValue('');
  await expect(page.locator('#generated-status')).toContainText('No se pudo generar');
  await clickVisible(page,page.getByRole('button', {name: 'Ver bloque unsupported-editor', includeHidden: true}));
  expect(await page.evaluate(() => studioProbe.editor.selectedSource())).toBe('unsupported-editor');
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#editor-error')).toContainText('Unsupported block');
  expect((await snapshot(page)).x).toBe(12);
  expect((await snapshot(page)).revision).toBe(before.revision);
  expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(state.sessionId);
  await clickVisible(page.getByRole('button', {name: 'Restaurar ejemplo'}));
  await expect(page.locator('#generated-code')).toHaveValue(/mover 4 pasos/);
  const preserved = await page.evaluate(() => studioProbe.editor.save());
  await page.locator('#open-project').setInputFiles({name: 'invalid.ggproj', mimeType: 'application/zip', buffer: Buffer.from('invalid archive')});
  await expect(page.locator('#project-error')).not.toBeEmpty();
  await expect(page.locator('#console-entries')).toContainText('PROJECT_ERROR');
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(preserved);
  expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(state.sessionId);
  expect((await snapshot(page)).x).toBe(12);
});

test('GG-CONSOLE: authenticated channel rejects stale revision/session/sequence, unsafe metadata and bounds flood', async ({page}) => {
  await instrumentRunner(page);
  await open(page); await run(page, 12);
  const frame = page.frames().find(frame => frame.url().includes(':4174/'));
  const original = await page.evaluate(() => studioProbe.state());
  await clickVisible(page.getByRole('button', {name: 'Limpiar consola', includeHidden: true}));
  await frame.evaluate(() => {
    const record = {level: 'warning', code: 'WIRE_TEXT', origin: 'runner', message: '<img src=x onerror=alert(1)>', sourceBlockId: 'editable-start'};
    runnerTest.send({type: 'diagnostic', revision: runnerTest.revision(), diagnostic: record});
    const replaySeq = runnerTest.sequence() - 1;
    runnerTest.send({type: 'diagnostic', seq: replaySeq, revision: runnerTest.revision(), diagnostic: {...record, message: 'REJECT replay'}});
    for (const overrides of [
      {revision: runnerTest.revision() - 1}, {sessionId: 'old-session'}, {protocolVersion: 99},
      {diagnostic: {...record, sourceBlockId: 'missing'}},
      {diagnostic: {...record, message: 'x'.repeat(1025)}},
      {diagnostic: {...record, code: 'x'.repeat(65)}},
      {diagnostic: {...record, extra: 'unknown'}}
    ]) runnerTest.send({type: 'diagnostic', revision: runnerTest.revision(), diagnostic: {...record, message: 'REJECT'}, ...overrides});
  });
  await expect(page.locator('#console-summary')).toHaveText('1 mensaje');
  await expect(page.locator('#console-entries')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#console-entries img')).toHaveCount(0);
  expect((await page.evaluate(() => studioProbe.state())).rejectedMessages - original.rejectedMessages).toBe(8);
  const focusedSource = page.getByRole('button', {name: 'Ver bloque editable-start', exact: true, includeHidden: true});
  await focusedSource.focus();
  await frame.evaluate(() => runnerTest.send({type: 'diagnostic', revision: runnerTest.revision(), diagnostic: {level: 'info', code: 'FOCUS', origin: 'runner', message: 'Preserve focus'}}));
  await expect(focusedSource).toBeFocused();
  await frame.evaluate(() => {
    for (let i = 0; i < 110; i++) runnerTest.send({type: 'diagnostic', revision: runnerTest.revision(), diagnostic: {level: 'info', code: 'FLOOD', origin: 'runner', message: 'message ' + i}});
  });
  await expect(page.locator('#console-summary')).toHaveText('100 mensajes · 12 anteriores retirados');
  await expect(page.locator('#console-entries li')).toHaveCount(100);
  await expect(page.locator('#console-entries')).toBeFocused();
  await clickVisible(page.getByRole('button', {name: 'Limpiar consola', includeHidden: true}));
  await frame.evaluate(() => runnerTest.send({type: 'diagnostic', revision: runnerTest.revision(), diagnostic: {level: 'info', code: 'SOURCE', origin: 'runner', message: 'source', sourceBlockId: 'editable-start'}}));
  await expect(page.getByRole('button', {name: 'Ver bloque editable-start', includeHidden: true})).toBeEnabled();
  await edit(page, '7');
  await expect(page.getByRole('button', {name: 'Ver bloque editable-start', includeHidden: true})).toBeDisabled();
  await frame.evaluate(() => runnerTest.send({type: 'diagnostic', revision: runnerTest.revision(), diagnostic: {level: 'info', code: 'LATE_AFTER_EDIT', origin: 'runner', message: 'source', sourceBlockId: 'editable-start'}}));
  await expect(page.getByRole('button', {name: 'Ver bloque editable-start', includeHidden: true})).toHaveCount(2);
  expect(await page.getByRole('button', {name: 'Ver bloque editable-start', includeHidden: true}).evaluateAll(buttons => buttons.every(b => b.disabled))).toBe(true);
  await page.evaluate(() => studioProbe.request('load-program', {ir: studioProbe.editor.program()}));
  await frame.evaluate(oldRevision => runnerTest.send({type: 'diagnostic', revision: oldRevision, diagnostic: {level: 'error', code: 'REPLACED', origin: 'runner', message: 'REJECT old revision'}}), original.revision);
  await expect(page.locator('#console-entries')).not.toContainText('REPLACED');
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  const newFrame = page.frames().find(frame => frame.url().includes(':4174/'));
  await newFrame.evaluate(old => runnerTest.send({type: 'diagnostic', sessionId: old.sessionId, revision: old.revision, diagnostic: {level: 'error', code: 'AFTER_STOP', origin: 'runner', message: 'REJECT old session'}}), original);
  await expect(page.locator('#console-summary')).toHaveText('Sin mensajes');
  await run(page, 21);
  await expect(page.getByRole('button', {name: 'Ver bloque editable-start', includeHidden: true})).toBeEnabled();
});

test('GG-CONSOLE: asynchronous errors retain their starting revision and cannot leak device output', async ({page}) => {
  await instrumentRunner(page);
  await open(page); await run(page, 12);
  const frame = page.frames().find(frame => frame.url().includes(':4174/'));
  await frame.evaluate(() => runnerTest.delayCompiler());
  await page.evaluate(() => {
    window.delayedCompilation = studioProbe.compile('basic.showNumber(1)', false).then(() => 'resolved', error => error.message);
  });
  await expect.poll(() => frame.evaluate(() => window.delayedStarted)).toBe(true);
  await page.evaluate(() => studioProbe.request('load-program', {ir: studioProbe.editor.program()}));
  await frame.evaluate(() => window.rejectDelayed(new Error('OLD_ASYNC_FAILURE')));
  expect(await page.evaluate(() => window.delayedCompilation)).toBe('Program revision replaced');
  await expect(page.locator('#console-entries')).not.toContainText('OLD_ASYNC_FAILURE');
  await expect(page.locator('#console-entries')).not.toContainText('DEVICE_COMPILE');
});

test('GG-RUN/CONSOLE: Stop supersedes Run during delayed runner preparation', async ({page}) => {
  await open(page); await run(page, 12);
  const authoring = await page.evaluate(() => studioProbe.editor.save());
  let release;
  let entered = false;
  const held = new Promise(resolve => { release = resolve; });
  await page.route('http://127.0.0.1:4174/**', async route => {
    if (route.request().isNavigationRequest() && !entered) {
      entered = true;
      await held;
    }
    await route.continue().catch(() => {});
  });
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect.poll(() => entered).toBe(true);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  release();
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(() => studioProbe.ready());
  expect((await snapshot(page)).x).toBe(0);
  expect((await snapshot(page)).revision).toBe(1);
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(authoring);
  await expect(page.locator('#console-summary')).toHaveText('Sin mensajes');
  await page.unrouteAll({behavior: 'wait'});
  await run(page, 12);
});
