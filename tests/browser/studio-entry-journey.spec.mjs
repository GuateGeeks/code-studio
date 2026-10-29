import {selectContext,clickVisible,revealPanel,settled} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {artifactPath} from './artifacts.mjs';

const authored = page => page.evaluate(() => studioProbe.editor.save());
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
async function open(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.studioProbe?.project);
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function create(page) {
  await clickVisible(page.locator('#entry-create'));
  await expect(page.locator('#project-name')).toHaveValue('Mi primera creación');
  await expect(page.locator('#entry-create')).toBeEnabled();
  await expect(page.locator('#editor-heading')).toBeFocused();
}
async function edit(page, value) {
  await page.locator('#blockly-editor [data-id="lesson-story-first-n"] .blocklyText').dblclick();
  await page.locator('.blocklyHtmlInput').fill(String(value));
  await page.locator('.blocklyHtmlInput').press('Enter');
}
async function run(page, x) {
  await selectContext(page,'2d');
  await clickVisible(page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
}

test('GG-ENTRY-001: recovery stays pending until its real resources are ready; navigation does not run a program', async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/project-catalog.json', async route => { await gate; await route.continue(); });
  const navigation = page.goto('/');
  await expect(page.locator('#entry-description')).toHaveText('Buscando tu proyecto en este navegador…');
  await expect(page.locator('#entry-create')).toBeDisabled();
  await expect(page.locator('#entry-continue')).toBeHidden();
  release(); await navigation;
  await expect(page.locator('#entry-create')).toBeEnabled();
  expect(await page.evaluate(() => studioProbe.project.state().recoveryStatus)).toBe('new');
  await expect(page.locator('#editor-status')).toHaveText('Listo para editar');
  await expect(page.locator('#entry-continue')).toBeHidden();
  expect((await snapshot(page)).x).toBe(0);
});

for (const mobile of [false,true]) test(`GG-ENTRY-003/004/005: create, edit, Run/Stop, download and recover (${mobile?'mobile':'desktop'})`, async ({page,context}) => {
  if (mobile) await page.setViewportSize({width:390,height:844});
  await open(page);
  await page.screenshot({path:artifactPath(`e1-${mobile?'mobile':'desktop'}-entry.png`)});
  await create(page);
  expect((await snapshot(page)).x).toBe(0);
  await expect(page.locator('#creation-guide')).toContainText('docente');
  await edit(page,30);
  const blocks = await authored(page);
  await run(page,50);
  await selectContext(page,'2d');
  await clickVisible(page.locator('#stop-result'));
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(await authored(page)).toEqual(blocks);
  expect((await snapshot(page)).x).toBe(0);
  await run(page,50);
  await page.locator('#project-name').fill('Mi idea recuperable');
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  const pending = page.waitForEvent('download');
  await clickVisible(page.locator('#save-project'));
  const download = await pending;
  const bytes = await readFile(await download.path());
  expect(download.suggestedFilename()).toBe('Mi idea recuperable.ggproj');
  await page.locator('#authoring-context').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifactPath(`e1-${mobile?'mobile':'desktop'}-editor.png`)});
  await page.close();
  const returned = await context.newPage();
  if(mobile) await returned.setViewportSize({width:390,height:844});
  await open(returned);
  await expect(returned.locator('#entry-description')).toContainText('Mi idea recuperable');
  await clickVisible(returned.locator('#entry-continue'));
  await expect(returned.locator('#editor-heading')).toBeFocused();
  expect(await authored(returned)).toEqual(blocks);
  expect((await snapshot(returned)).x).toBe(0);
  await returned.locator('#open-project').setInputFiles({name:'copia.ggproj',mimeType:'application/zip',buffer:bytes});
  await expect(returned.locator('#open-project')).toHaveValue('');
  await expect(returned.locator('#project-name')).toHaveValue('Mi idea recuperable');
  expect((await snapshot(returned)).x).toBe(0);
  await run(returned,50);
});

test('GG-ENTRY-002: activity exploration and invalid file preserve current work and runtime', async ({page}) => {
  await open(page); await create(page); await run(page,40);
  const before = {blocks:await authored(page),id:await page.evaluate(()=>studioProbe.project.state().id)};
  await clickVisible(page.locator('#entry-activities'));
  await expect(page.locator('#lesson-select')).toBeFocused();
  await revealPanel(page,page.locator('#lesson-select'));await page.locator('#lesson-select').selectOption('score');
  expect(await authored(page)).toEqual(before.blocks);
  expect((await snapshot(page)).x).toBe(40);
  const cancelled = page.waitForEvent('filechooser');
  await clickVisible(page.locator('#entry-open'));
  await (await cancelled).setFiles([]);
  expect(await authored(page)).toEqual(before.blocks);
  expect(await page.evaluate(()=>studioProbe.project.state().id)).toBe(before.id);
  expect((await snapshot(page)).x).toBe(40);
  const chooser = page.waitForEvent('filechooser');
  await clickVisible(page.locator('#entry-open'));
  await (await chooser).setFiles({name:'invalido.ggproj',mimeType:'application/zip',buffer:Buffer.from('not a project')});
  await expect(page.locator('#project-error')).not.toBeEmpty();
  expect(await authored(page)).toEqual(before.blocks);
  expect(await page.evaluate(()=>studioProbe.project.state().id)).toBe(before.id);
  expect((await snapshot(page)).x).toBe(40);
});

test('GG-ENTRY-002/005: failed protection cannot replace work; editing and download remain available', async ({page}) => {
  await page.addInitScript(() => {
    const original = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function(name,...args) {
      if(name==='gg-studio-projects') throw new DOMException('Storage denied','SecurityError');
      return original.call(this,name,...args);
    };
  });
  await open(page);
  const before=await authored(page),id=await page.evaluate(()=>studioProbe.project.state().id);
  expect(await page.evaluate(()=>studioProbe.project.state().recoveryStatus)).toBe('unavailable');
  await page.locator('#project-name').fill('Conservar este trabajo');
  await clickVisible(page.locator('#entry-create'));
  await expect(page.locator('#entry-error')).toContainText('guardado local');
  expect(await authored(page)).toEqual(before);
  expect(await page.evaluate(()=>studioProbe.project.state().id)).toBe(id);
  await expect(page.locator('#project-name')).toHaveValue('Conservar este trabajo');
  await expect(page.locator('#project-status')).toHaveText('Sin guardar en este navegador');
  const pending=page.waitForEvent('download');await clickVisible(page.locator('#save-project'));
  expect((await pending).suggestedFilename()).toBe('Conservar este trabajo.ggproj');
});

test('GG-ENTRY-005: recovered backup remains explicit and corrupt copies block replacement', async ({page}) => {
  await open(page);await create(page);
  await page.locator('#project-name').fill('Revisión anterior');
  await page.evaluate(()=>studioProbe.project.flush());
  await page.locator('#project-name').fill('Última revisión');
  await page.evaluate(()=>studioProbe.project.flush());
  const corrupt=keys=>page.evaluate(keys=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('gg-studio-projects',1);
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{const db=request.result,tx=db.transaction('snapshots','readwrite');
      for(const key of keys)tx.objectStore('snapshots').put({serialized:'corrupt',savedAt:new Date().toISOString()},key);
      tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};};
  }),keys);
  await corrupt(['current']);await open(page);
  expect(await page.evaluate(()=>studioProbe.project.state().recoveryStatus)).toBe('restored');
  await expect(page.locator('#entry-description')).toContainText('revisión anterior');
  await expect(page.locator('#recovery-notice')).toContainText('dañada');
  await expect(page.locator('#entry-continue')).toBeVisible();
  expect((await snapshot(page)).x).toBe(0);
  await corrupt(['current','previous']);await open(page);
  expect(await page.evaluate(()=>studioProbe.project.state().recoveryStatus)).toBe('corrupt');
  await expect(page.locator('#entry-create')).toBeDisabled();
  await expect(page.locator('#save-new-copy')).toBeVisible();
  await expect(page.locator('#entry-continue')).toBeHidden();
});

test('GG-ENTRY-006/007: advanced examples are explicit and a textual copy stays independent', async ({page}) => {
  await open(page);await create(page);
  const blocks=await authored(page);
  await expect(page.locator('#fixture')).toBeHidden();
  await revealPanel(page,page.locator('#advanced-tools > summary'));await page.locator('#advanced-tools > summary').focus();
  await page.keyboard.press('Enter');
  await revealPanel(page,page.locator('#fixture'));await page.locator('#fixture').selectOption('repeat');
  expect((await snapshot(page)).x).toBe(0);
  await clickVisible(page.getByRole('button',{name:'Ejecutar ejemplo',exact:true}));
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(15);
  expect(await authored(page)).toEqual(blocks);
  await clickVisible(page.locator('#advanced-tools > summary'));
  await expect(page.locator('#advanced-tools > summary')).toBeFocused();
  await expect(page.locator('#generated-code')).toHaveAttribute('readonly','');
  await selectContext(page,'2d');
  await clickVisible(page.locator('#copy-python'));
  await expect(page.locator('#text-source')).toBeEnabled();
  await selectContext(page,'text');
  await page.locator('#text-source').fill('print("Una copia independiente")');
  expect(await authored(page)).toEqual(blocks);
  await expect(page.locator('#generated-help')).toContainText('independiente');
  await page.locator('#authoring-context').selectOption('microbit');
  await expect(page.locator('#run-editor')).toBeHidden();
  await expect(page.locator('#scene-stop-link')).toHaveAttribute('href','#stop-result');
  await clickVisible(page.locator('#stop-result'));
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(0);
  expect(await authored(page)).toEqual(blocks);
  await selectContext(page,'text');
  await expect(page.locator('#text-source')).toHaveValue('print("Una copia independiente")');
});

test('GG-ENTRY-008: keyboard entry, result and Stop work with reduced motion and narrow viewport', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await open(page);await page.locator('#entry-create').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#editor-heading')).toBeFocused();
  await page.locator('#run-editor').focus();await page.keyboard.press('Enter');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(40);
  await page.locator('#scene-stop-link').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#stop-result')).toBeFocused();
  await page.keyboard.press('Enter');await expect(page.locator('#run-editor')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('GG-ENTRY-001: arrancar no crea audio, así un dispositivo de audio colgado no bloquea Ejecutar; el pitido de teclado sigue tras el gesto', async ({page}) => {
  // Chromium construye cada AudioContext de forma síncrona contra el servicio de
  // audio: con el servidor de audio colgado, cada constructor bloqueó el hilo
  // principal ~20 s y el arranque quedó minutos con Ejecutar deshabilitado
  // (docs/engineering/STARTUP-HANG-INVESTIGATION.md). Se cuentan construcciones reales.
  await page.addInitScript(() => {
    const Native = window.AudioContext; window.ggAudioProbe = {contexts: [], oscillators: 0};
    if (Native) window.AudioContext = class extends Native {
      constructor(...args) { super(...args); window.ggAudioProbe.contexts.push(new Error().stack.split('\n').slice(2, 5).join(' | ')); }
      createOscillator() { window.ggAudioProbe.oscillators++; return super.createOscillator(); }
    };
  });
  await open(page);
  expect(await page.evaluate(() => window.ggAudioProbe)).toEqual({contexts: [], oscillators: 0});
  // Blockly avisa con un pitido una acción de teclado imposible (← en la caja de
  // herramientas). Sigue sonando: el contexto se crea entonces, tras el gesto.
  await page.locator('#authoring-context').focus();
  for (let count = 0; count < 15 && !await page.evaluate(() => document.querySelector('#blockly-editor .blocklyToolbox')?.contains(document.activeElement)); count++) await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.ggAudioProbe.oscillators)).toBe(1);
  expect((await page.evaluate(() => window.ggAudioProbe)).contexts).toHaveLength(1);
  await expect(page.locator('#run-editor')).toBeEnabled();
});
