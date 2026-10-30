import {selectContext,clickVisible,revealPanel,settled} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {artifactPath} from './artifacts.mjs';

test.setTimeout(120000);
const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
async function open(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.studioProbe?.project));
  await page.evaluate(() => studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page.locator('#lessons-panel > summary'));
  await clickVisible(page.locator('#capabilities-panel > summary'));
}
async function load(page, id) {
  const before = await page.evaluate(() => studioProbe.editor.save());
  await revealPanel(page,page.locator('#lesson-select'));await page.locator('#lesson-select').selectOption(id);
  expect(await page.evaluate(() => studioProbe.editor.save())).toEqual(before);
  await revealPanel(page,page.locator('#lesson-load'));await page.locator('#lesson-load').focus();
  await revealPanel(page,page.locator('#lesson-load'));await page.locator('#lesson-load').press('Enter');
  await expect(page.locator('#lesson-status')).toContainText('Ejemplo cargado sin ejecutar');
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
}
async function editNumber(page, id, value) {
  const field = page.locator('#blockly-editor [data-id="' + id + '"] .blocklyText');
  await selectContext(page,'2d');
  await field.dblclick();
  await page.locator('.blocklyHtmlInput').fill(String(value));
  await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText(String(value));
}
async function run(page, x) {
  await selectContext(page,'2d');
  await clickVisible(page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
}
async function clickCheck(page) {
  const button=page.locator('#lesson-check');
  await revealPanel(page,button);
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeInViewport();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await clickVisible(button);
}
async function check(page) {
  await clickCheck(page);
  await expect(page.locator('#lesson-status')).toContainText('Comprobación completada');
  const value = await page.evaluate(() => studioProbe.lessons.state());
  expect(value.results.length).toBeGreaterThan(0);
  expect(value.results.every(step => step.passed)).toBe(true);
  return value;
}
async function spaces(page, times) {
  const stage = page.frameLocator('#runner-slot iframe').locator('#stage');
  await stage.focus();
  for (let index = 1; index <= times; index++) {
    await stage.press('Space');
    await expect.poll(() => page.evaluate(() => GG.variables.get('gg-pack-score').then(value => value.value))).toBe(index);
  }
}
for (const mobile of [false, true]) {
  const layout = mobile ? 'mobile' : 'desktop';
  test('GG-LESSON: animated story has real editing, scoped checks and separate progress (' + layout + ')', async ({page}) => {
    if (mobile) await page.setViewportSize({width:390,height:844});
    const errors=[]; page.on('pageerror', error => errors.push(error.message));
    await open(page); await load(page,'story');
    await run(page,40);
    await clickCheck(page);
    await expect(page.locator('#lesson-status')).toContainText('Aún faltan metas');
    await editNumber(page,'lesson-story-first-n',40);
    await clickCheck(page);
    await expect(page.locator('#lesson-status')).toHaveText('Ejecuta tus cambios antes de comprobar.');
    await run(page,60);
    expect((await snapshot(page)).costume.name).toBe('hero-alt');
    const result=await check(page);
    await expect(page.locator('#lesson-progress')).toContainText('Historial: 2 de 2');
    const saved=JSON.parse(await page.evaluate(()=>studioProbe.project.export()));
    expect(saved.version).toBe(3); expect(saved.scene).toBeUndefined();
    expect(saved.capabilities.config['gg.sprites'].sprites[0].x).toBe(0);
    expect(JSON.stringify(saved)).not.toContain('completedStepIds');
    await selectContext(page,'2d');
    await clickVisible(page.locator('#stop-result')); await expect(page.locator('#run-editor')).toBeEnabled();
    expect((await snapshot(page)).x).toBe(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile?390:1280);
    await page.locator('.lessons').screenshot({path:artifactPath('lesson-story-'+layout+'.png')});
    await writeFile(artifactPath('lesson-story-'+layout+'.json'),JSON.stringify({result,sprites:saved.capabilities.config['gg.sprites'].sprites,errors},null,2));
    expect(errors).toEqual([]);
  });

  test('GG-PACK/LESSON: global score pack survives ZIP/reopen and runs a copied event program ('+layout+')',async({page,browser})=>{
    if(mobile) await page.setViewportSize({width:390,height:844});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await open(page);await load(page,'score');
    await expect(page.locator('#packs-list')).toContainText('gg.score · 0.2.0');
    await editNumber(page,'lesson-score-move-n',10);
    await run(page,0);await spaces(page,3);
    await expect.poll(async () => (await settled(snapshot, page)).x).toBe(30);
    await check(page);
    const blocks=await page.evaluate(()=>studioProbe.editor.save());
    const backend=mobile?'python':'javascript';
    await selectContext(page,'2d');
    await clickVisible(page.locator('#copy-'+backend));
    const source=await page.locator('#text-source').inputValue();
    await clickVisible(page.locator('#run-document'));
    await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
    await spaces(page,3);
    await expect.poll(async () => (await settled(snapshot, page)).x).toBe(30);
    await check(page);
    const downloadPromise=page.waitForEvent('download');await clickVisible(page.locator('#save-project'));
    const file=await downloadPromise;const path=artifactPath('score-'+layout+'.ggproj');await file.saveAs(path);
    const zip=await JSZip.loadAsync(await readFile(path));const manifest=JSON.parse(await zip.file('manifest.json').async('string'));
    // The copy declares API v3 (runtime.api), so the project is written as GGPROJ v4 (ADR-011).
    expect(manifest.version).toBe(4);expect(manifest.scene).toBeUndefined();
    expect(manifest.authoring.textDocuments.at(-1).runtime.api).toBe('api3');
    expect(manifest.capabilities.locks.find(lock=>lock.id==='gg.score').version).toBe('0.2.0');
    expect(manifest.capabilities.config['gg.score'].initialValue).toBe(0);
    expect(manifest.authoring.blockly).toEqual(blocks);
    expect(manifest.authoring.textDocuments[0].source).toBe(source);
    const context=await browser.newContext();const reopened=await context.newPage();await open(reopened);
    await reopened.locator('#open-project').setInputFiles(path);
    await expect(reopened.locator('#recovery-notice')).toContainText('Proyecto abierto');
    expect((await snapshot(reopened)).x).toBe(0);
    await expect(reopened.locator('#text-source')).toHaveValue(source);
    expect(await reopened.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
    await run(reopened,0);await spaces(reopened,3);
    expect((await snapshot(reopened)).x).toBe(30);
    await context.close();
    await selectContext(page,'text');
    await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
    expect(errors).toEqual([]);
  });

  test('GG-LESSON: independent text transition uses selected execution and original blocks ('+layout+')',async({page})=>{
    if(mobile) await page.setViewportSize({width:390,height:844});
    await open(page);await load(page,'text-transition@1');
    await run(page,12);
    const blocks=await page.evaluate(()=>studioProbe.editor.save());
    await selectContext(page,'2d');
    await clickVisible(page.locator('#copy-javascript'));
    const source=await page.locator('#text-source').inputValue();
    expect(source).toContain('hero.move(4)');
    await selectContext(page,'text');
    await page.locator('#text-source').fill(source.replace('hero.move(4)','hero.move(6)'));
    await clickVisible(page.locator('#run-document'));
    await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
    await expect.poll(async () => (await settled(snapshot, page)).x).toBe(18);
    const result=await check(page);
    expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
    await selectContext(page,'text');
    await clickVisible(page.locator('#new-javascript'));
    await clickCheck(page);
    await expect(page.locator('#lesson-status')).toHaveText('Ejecuta tus cambios antes de comprobar.');
    await writeFile(artifactPath('lesson-text-'+layout+'.json'),JSON.stringify({result,blocksPreserved:true},null,2));
  });
}

test('GG-PACK: explicit update/rollback, scoped denial and invalid locks preserve the live project',async({page})=>{
  await open(page);await load(page,'score');await run(page,0);await spaces(page,3);
  const original=await page.evaluate(()=>studioProbe.editor.save());
  await page.evaluate(async()=>{
    const {migrateCapabilities}=await import(new URL('./app/contracts/packs.mjs',location.href).href);
    await studioProbe.project.useCapabilities(migrateCapabilities(studioProbe.project.capabilities(),{id:'gg.score',toVersion:'0.1.0'}));
  });
  await expect(page.locator('#packs-list')).toContainText('gg.score · 0.1.0');
  await clickVisible(page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.score · 0.2.0');
  await clickVisible(page.locator('#rollback-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.score · 0.1.0');
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(original);
  await run(page,0);await spaces(page,3);
  const before=await snapshot(page),scope=await page.evaluate(()=>studioProbe.state());
  const denied=await page.evaluate(async()=>{
    const {createCapabilityBroker}=await import(new URL('./app/contracts/pack-broker.mjs',location.href).href);
    const broker=createCapabilityBroker({capabilities:studioProbe.project.capabilities(),getContext:()=>({variables:studioProbe.editor.program().variables}),
      call:(method,args)=>studioProbe.request('gg-call',{method,args,revision:studioProbe.state().revision})});
    try{await broker.client('gg.score').invoke('sprite.move',['hero',50]);return null;}catch(error){return error.message;}
  });
  expect(denied).toContain('no declarado');
  expect((await snapshot(page)).x).toBe(before.x);
  const bytes=Buffer.from(await page.evaluate(async()=>Array.from(await studioProbe.project.exportArchive())));
  const zip=await JSZip.loadAsync(bytes);const manifest=JSON.parse(await zip.file('manifest.json').async('string'));
  manifest.capabilities.locks[0].sha256='0'.repeat(64);zip.file('manifest.json',JSON.stringify(manifest));
  const invalid=await zip.generateAsync({type:'nodebuffer',compression:'STORE'});
  await page.locator('#open-project').setInputFiles({name:'invalid-lock.ggproj',mimeType:'application/zip',buffer:invalid});
  await expect(page.locator('#project-error')).toContainText('hash');
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(original);
  expect((await page.evaluate(()=>studioProbe.state())).sessionId).toBe(scope.sessionId);
  expect((await snapshot(page)).x).toBe(before.x);
});

test('GG-LESSON: Stop cancels an incomplete check and failed starter validation preserves authoring',async({page})=>{
  await open(page);await load(page,'story');await run(page,40);
  await clickCheck(page);
  await expect(page.locator('#lesson-status')).toContainText('Comprobando');
  await selectContext(page,'2d');
  await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
  await expect(page.locator('#lesson-status')).not.toContainText('Comprobación completada');
  expect((await page.evaluate(()=>studioProbe.lessons.state())).historicalStepIds).toEqual([]);
  const blocks=await page.evaluate(()=>studioProbe.editor.save());
  const scope=await page.evaluate(()=>studioProbe.state());
  const error=await page.evaluate(async()=>{
    try{await studioProbe.project.loadStarter({name:'Inválido',packIds:['gg.sprites'],blockly:{blocks:{languageVersion:0,blocks:[{type:'unknown-block',id:'invalid'}]}}});return null;}
    catch(error){return error.message;}
  });
  expect(error).toBeTruthy();
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  expect((await page.evaluate(()=>studioProbe.state())).sessionId).toBe(scope.sessionId);
});


test('GG-PACK: legacy corpus declarations remain available to existing GG variable controls',async({page})=>{
  await open(page);
  await page.evaluate(()=>studioProbe.request('load-corpus',{name:'variables'}));
  expect(await page.evaluate(()=>GG.variables.get('gg-score').then(value=>value.value))).toBe(0);
  await page.evaluate(()=>GG.variables.set('gg-score',5));
  expect(await page.evaluate(()=>GG.variables.get('gg-score').then(value=>value.value))).toBe(5);
  expect((await snapshot(page)).x).toBe(0);
});
