import {origins} from './origins.mjs';
import {selectContext,clickVisible,settled} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {artifactPath} from './artifacts.mjs';
import {writeFile, readFile} from 'node:fs/promises';
import JSZip from 'jszip';
test.setTimeout(90000);
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
const changingSnapshot = page => snapshot(page).catch(error => { if (/Session stopped|Program revision replaced|GG scene loading/.test(error.message)) return {x: null}; throw error; });
async function open(page) {
  await page.goto('/');
  await expect(page.locator('#new-javascript')).toBeEnabled();
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function create(page, language, source) {
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name: language === 'javascript' ? 'Nuevo JavaScript' : 'Nuevo Python', exact: true}));
  await selectContext(page,'text');
  await page.locator('#text-source').fill(source);
}
// Historical interpreter/bridge cases start with an API1 fixture. They do
// not overwrite a newly created API3 template with the previous public API.
// New-document UX is exercised by the API3 cases and CV-NEW-DOCUMENTS.
async function legacyFixture(page,language,source){
  await selectContext(page,'text');
  const document=await page.evaluate(({language,source})=>studioProbe.textDocuments.add({
    language,source,name:'Documento API1 anterior'}),{language,source});
  await expect(page.locator('#text-source')).toHaveValue(source);
  expect(document.runtime.api).toBeUndefined();
}
async function run(page) {
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
  await expect(page.locator('#status')).toHaveText(/Documento (terminado|activo · eventos disponibles)/, {timeout: 60000});
}
for (const language of ['javascript', 'python']) {
  test('GG-TEXT-001/002: real ' + language + ' API3 owns only source; contextual effects, console, portable reopen and recovery', async ({page, browser}) => {
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await open(page);
    const blocks = await page.evaluate(() => studioProbe.editor.save());
    const source = language === 'javascript'
      ? "let n = 2;\nlet score = 0;\nonStart(() => {\n  for (let i = 0; i < 3; i++) { if (n > 1) hero.move(n); }\n  score = 9;\n  wait(0.01);\n  console.log('resultado');\n});"
      : "n = 2\nscore = 0\n@on_start\ndef al_iniciar():\n    global score\n    for i in range(3):\n        if n > 1:\n            hero.move(n)\n    score = 9\n    wait(0.01)\n    print('resultado')";
    await create(page, language, source);
    await selectContext(page,'text');
    await page.locator('#text-name').fill('Mi programa ' + language);
    await run(page);
    await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(6);
    expect(await page.evaluate(() => GG.variables.get('score'))).toEqual({id: 'score', name: 'score', value: 9});
    await expect(page.locator('#console-entries')).toContainText('resultado');
    expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(blocks);
    await page.evaluate(() => studioProbe.project.flush());
    const authoring = JSON.parse(await page.evaluate(() => studioProbe.project.export())).authoring;
    const downloadEvent = page.waitForEvent('download');
    await clickVisible(page.getByRole('button', {name: 'Llevar o entregar', exact: true}));
    const download = await downloadEvent;
    const path = artifactPath('text-' + language + '.ggproj');
    await download.saveAs(path);
    const zip = await JSZip.loadAsync(await readFile(path));
    const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
    expect(manifest.version).toBe(4);
    expect(manifest.authoring).toEqual(authoring);
    // R1: a new project keeps its initial scene in its gg.sprites capabilities.
    expect(manifest.scene).toBeUndefined();expect(manifest.capabilities.config['gg.sprites'].initialScene.x).toBe(0);
    expect(JSON.stringify(manifest)).not.toContain('resultado 6');
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
    await expect(page.locator('#run-editor')).toBeEnabled();
    expect((await snapshot(page)).x).toBe(0);
    const context = await browser.newContext();
    const reopened = await context.newPage(); await open(reopened);
    await reopened.locator('#open-project').setInputFiles(path);
    await expect(reopened.locator('#recovery-notice')).toContainText('Proyecto abierto');
    await expect(reopened.locator('#text-source')).toHaveValue(source);
    expect((await snapshot(reopened)).x).toBe(0);
    expect(JSON.parse(await reopened.evaluate(() => studioProbe.project.export())).authoring).toEqual(authoring);
    await run(reopened);
    await expect.poll(async()=>(await settled(snapshot,reopened)).x).toBe(6);
    await reopened.reload();
    await expect(reopened.locator('#run-editor')).toBeEnabled();
    await expect(reopened.locator('#text-source')).toHaveValue(source);
    expect((await snapshot(reopened)).x).toBe(0);
    await writeFile(artifactPath('text-' + language + '.json'), JSON.stringify({authoring, manifestVersion: manifest.version, runtimeX: 6, reopenedX: 6, recoveryAutoRun: false, errors}, null, 2));
    await context.close(); expect(errors).toEqual([]);
  });
}
for (const mobile of [false, true]) {
  test('GG-TEXT-003: syntax preflight preserves scene; source diagnostic selects line; edit invalidates link (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}) => {
    if (mobile) await page.setViewportSize({width: 390, height: 844});
    await open(page);
    await selectContext(page,'2d');
    await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
    await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
    const scope = await page.evaluate(() => studioProbe.state());
    await legacyFixture(page, 'javascript', "const = ;");
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
    await expect(page.locator('#text-error')).not.toBeEmpty({timeout: 60000});
    expect((await snapshot(page)).x).toBe(12);
    expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(scope.sessionId);
    await selectContext(page,'text');
    await page.locator('#text-source').fill("await GG.sprite.move('hero', 4);\nthrow new Error('fallo controlado');");
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
    await expect(page.locator('#console-entries')).toContainText('fallo controlado', {timeout: 60000});
    await expect.poll(async () => (await settled(snapshot, page)).x).toBe(4);
    const link = page.getByRole('button', {name: 'Ver línea 2', exact: true, includeHidden: true});
    await clickVisible(page,link);
    await expect(page.locator('#text-source')).toBeFocused();
    expect(await page.locator('#text-source').evaluate(node => node.value.slice(0, node.selectionStart).split('\n').length)).toBe(2);
    await page.locator('#text-source').press('End');
    await page.locator('#text-source').press('Space');
    await expect(link).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile ? 390 : 1280);
    // Capture tall panels only after cross-origin interaction assertions.
    await selectContext(page,'text');
    await page.locator('.text-authoring').screenshot({path: artifactPath('text-authoring-' + (mobile ? 'mobile' : 'desktop') + '.png')});
  });
}
for (const language of ['javascript', 'python']) {
  test('GG-TEXT-004: Stop terminates ' + language + ' infinite execution and delayed old RPC cannot affect new scene', async ({page}) => {
    await open(page);
    await legacyFixture(page, language, language === 'javascript' ? "await GG.sprite.move('hero', 7);\nwhile (true) {}" : "await GG.sprite.move('hero', 7)\nwhile True:\n    pass");
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
    // Scene replacement may reject a read while assets are loading. Poll only
    // those explicit transition states; unexpected runner errors still fail.
    await expect.poll(async () => (await changingSnapshot(page)).x, {timeout: 60000}).toBe(7);
    const old = await page.evaluate(() => studioProbe.state());
    const started = Date.now();
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
    await expect(page.locator('#run-editor')).toBeEnabled();
    expect(Date.now() - started).toBeLessThan(5000);
    expect((await snapshot(page)).x).toBe(0);
    expect((await page.evaluate(() => studioProbe.state())).sessionId).not.toBe(old.sessionId);
    expect(await page.evaluate(() => studioProbe.language.state())).toMatchObject({active: null, candidate: null});
    await selectContext(page,'text');
    await page.locator('#text-source').fill(language === 'javascript' ? "await GG.wait(2); await GG.sprite.move('hero', 100);" : "await GG.wait(2)\nawait GG.sprite.move('hero', 100)");
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
    await expect(page.locator('#status')).toHaveText('Ejecutando documento', {timeout: 60000});
    await selectContext(page,'text');
    await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
    await expect(page.locator('#run-editor')).toBeEnabled();
    await page.waitForTimeout(2200);
    expect((await snapshot(page)).x).toBe(0);
    await expect(page.locator('#console-summary')).toHaveText('Sin mensajes');
  });
}
test('GG-TEXT-005: unavailable runtime and cancelled preparation preserve current scene; isolated origin has restricted CSP', async ({page, request}) => {
  await page.route('**/vendor/pyodide/pyodide.mjs', route => route.abort());
  await open(page);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar bloques', exact: true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  const before = await page.evaluate(() => studioProbe.state());
  await legacyFixture(page, 'python', "print('hola')");
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
  await expect(page.locator('#text-error')).not.toBeEmpty({timeout: 60000});
  expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(before.sessionId);
  expect((await snapshot(page)).x).toBe(12);
  const shell = await request.get('/');
  const runner = await request.get(origins.runnerOrigin + '/');
  const language = await request.get(origins.languageOrigin + '/');
  expect(shell.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
  expect(runner.headers()['content-security-policy']).not.toContain("'unsafe-eval'");
  expect(language.headers()['content-security-policy']).toContain("'wasm-unsafe-eval'");
  expect(language.headers()['content-security-policy']).not.toMatch(/https:|\*/);
});

test('GG-TEXT-006: Stop cancels a prepared-runtime candidate and invalid import preserves active document/scene', async ({page}) => {
  let release;
  let entered;
  const held = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/vendor/quickjs-engine.bundle.mjs', async route => {
    entered();
    await gate;
    await route.continue().catch(() => {});
  });
  await open(page);
  await legacyFixture(page, 'javascript', "await GG.sprite.move('hero', 90);");
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
  await held;
  await expect(page.locator('#text-run-status')).toContainText('Preparando');
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run-editor')).toBeEnabled();
  release();
  await page.waitForTimeout(400);
  expect((await snapshot(page)).x).toBe(0);
  expect(await page.evaluate(() => studioProbe.language.state())).toMatchObject({candidate: null, active: null});
  await page.unroute('**/vendor/quickjs-engine.bundle.mjs');
  await run(page);
  expect((await snapshot(page)).x).toBe(90);
  const before = await page.evaluate(async () => ({scope: studioProbe.state(), authoring: JSON.parse(await studioProbe.project.export()).authoring}));
  const rejected = await page.evaluate(async () => {
    const model = JSON.parse(await studioProbe.project.export());
    model.authoring.selectedTextDocumentId = 'text-00000000-0000-4000-8000-000000000099';
    try { await studioProbe.project.open(JSON.stringify(model)); return false; } catch { return true; }
  });
  expect(rejected).toBe(true);
  expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(before.scope.sessionId);
  expect(JSON.parse(await page.evaluate(() => studioProbe.project.export())).authoring).toEqual(before.authoring);
  expect((await snapshot(page)).x).toBe(90);
});
test('GG-TEXT-007: log quota retains terminal error and location; runtime has no shell DOM or remote packages', async ({page}) => {
  const external = [];
  const localOrigins = new Set([origins.shellOrigin,origins.runnerOrigin,origins.simulatorOrigin,origins.languageOrigin]);
  page.on('request', request => {
    const url = new URL(request.url());
    // A blob URL names local preview bytes; it is not a remote package request.
    // Match its embedded origin exactly, retaining rejection of foreign blobs.
    if(url.protocol==='data:' || ['http:','blob:'].includes(url.protocol)&&localOrigins.has(url.origin)) return;
    external.push(request.url());
  });
  await open(page);
  await legacyFixture(page, 'javascript', "for (let i=0; i<150; i++) console.log('mensaje', i);\nthrow new Error('error después de logs');");
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name: 'Ejecutar documento 2D', exact: true}));
  await expect(page.locator('#console-entries')).toContainText('error después de logs', {timeout:60000});
  await expect(page.getByRole('button', {name:'Ver línea 2', exact:true, includeHidden: true})).toBeEnabled();
  expect(await page.locator('#console-entries li').count()).toBeLessThanOrEqual(100);
  await selectContext(page,'text');
  await page.locator('#text-source').fill("console.log(typeof window, typeof document, typeof fetch);");
  await run(page);
  await expect(page.locator('#console-entries')).toContainText('undefined undefined undefined');
  await legacyFixture(page, 'python', "import js\nprint('shell disponible', hasattr(js, 'window'), hasattr(js, 'document'))");
  await run(page);
  await expect(page.locator('#console-entries')).toContainText('shell disponible False False');
  expect(external).toEqual([]);
});

test('GG-TEXT-008: Python syntax preserves active scene and runtime traceback links the independent document line', async ({page}) => {
  await open(page);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Ejecutar bloques', exact:true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  const original = await page.evaluate(() => studioProbe.state());
  await legacyFixture(page, 'python', "if :\n    pass");
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name:'Ejecutar documento 2D', exact:true}));
  await expect(page.locator('#text-error')).not.toBeEmpty({timeout:60000});
  expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(original.sessionId);
  expect((await snapshot(page)).x).toBe(12);
  await selectContext(page,'text');
  await page.locator('#text-source').fill("await GG.sprite.move('hero', 3)\nraise ValueError('error python vinculado')");
  await selectContext(page,'text');
  await clickVisible(page.getByRole('button', {name:'Ejecutar documento 2D', exact:true}));
  await expect(page.locator('#console-entries')).toContainText('error python vinculado', {timeout:60000});
  await expect(page.locator('#text-run-status')).toHaveText('Error de ejecución de texto');
  const link = page.getByRole('button', {name:'Ver línea 2', exact:true, includeHidden: true});
  await clickVisible(page,link);
  await expect(page.locator('#text-source')).toBeFocused();
  expect(await page.locator('#text-source').evaluate(node => node.value.slice(0,node.selectionStart).split('\n').length)).toBe(2);
  expect((await snapshot(page)).x).toBe(3);
});
