import {test,expect} from '@playwright/test';
import {chooseMode,clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {artifactPath} from './artifacts.mjs';
test.setTimeout(90000);
async function open(page){await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());await expect(page.locator('#run-editor')).toBeEnabled();}
const authoring=page=>page.evaluate(()=>studioProbe.editor.save());
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
// Wait for this run's own session: from a text view, Run converts first and the
// status still shows the previous «Bloques ejecutados» meanwhile (29/10/2026).
async function run(page,x){const before=await page.evaluate(()=>studioProbe.state().sessionId);await clickVisible(page,page.locator('#run-editor'));await expect.poll(()=>page.evaluate(()=>studioProbe.state().sessionId)).not.toBe(before);await expect(page.locator('#status')).toHaveText('Bloques ejecutados');await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(x);}
async function mode(page,value){await clickVisible(page,page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
test('CV-VIEWS-001: looking and returning preserves blocks, IDs, positions and active result',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await run(page,12);
 const before=await authoring(page),docs=await page.evaluate(()=>studioProbe.textDocuments.capture());
 await mode(page,'javascript');await expect(page.locator('#text-source')).toBeEditable();await expect(page.locator('#text-source')).toHaveValue(/hero.move\(4\)/);
 await expect(page.locator('#code-view-format')).toBeVisible();
 expect((await snapshot(page)).x).toBe(12);expect(await authoring(page)).toEqual(before);
 await mode(page,'blocks');expect(await authoring(page)).toEqual(before);expect((await snapshot(page)).x).toBe(12);
 expect(await page.evaluate(()=>studioProbe.textDocuments.capture())).toEqual(docs);expect(errors).toEqual([]);
});
test('CV-VIEWS-002: text edits keep numeric IDs and live result; Undo restores authoring alone',async({page})=>{
 await open(page);await run(page,12);const before=await authoring(page);
 await mode(page,'javascript');const source=page.locator('#text-source');await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));
 await mode(page,'blocks');await expect(page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText')).toHaveText('25');
 expect((await snapshot(page)).x).toBe(12);await run(page,75);
 await clickVisible(page,page.locator('#code-view-undo'));expect(await authoring(page)).toEqual(before);expect((await snapshot(page)).x).toBe(75);
});
test('CV-VIEWS-003: rejection has a line and keyboard exits; confirmed restore preserves blocks',async({page})=>{
 await open(page);await run(page,12);const before=await authoring(page);
 await mode(page,'javascript');await page.locator('#text-source').fill('onStart(() => {\n  while (1 < 3) {}\n});');
 await clickVisible(page,page.locator('#program-mode input[value=blocks]'));await expect(page.locator('#text-error')).toContainText('Línea 2');
 await expect(page.locator('#code-view-edit')).toBeVisible();await expect(page.locator('#code-view-copy')).toBeVisible();await expect(page.locator('#code-view-restore')).toBeVisible();
 expect(await authoring(page)).toEqual(before);expect((await snapshot(page)).x).toBe(12);
 await page.locator('#code-view-edit').focus();await page.keyboard.press('Enter');await expect(page.locator('#text-source')).toBeFocused();
 page.once('dialog',d=>d.dismiss());await clickVisible(page,page.locator('#code-view-restore'));await expect(page.locator('#text-source')).toHaveValue(/while/);
 page.once('dialog',d=>d.accept());await clickVisible(page,page.locator('#code-view-restore'));await expect(page.locator('#program-mode input[value=blocks]')).toBeChecked();
 expect(await authoring(page)).toEqual(before);
});
test('CV-VIEWS-004: pending rejected text recovers without running and copies exactly to an independent API3 document',async({page})=>{
 await open(page);await mode(page,'javascript');const source='onStart(() => {\n  while (1 < 3) {}\n});';
 await page.locator('#text-source').fill(source);await page.evaluate(()=>studioProbe.project.flush());await page.reload();await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
 await expect(page.locator('#text-source')).toHaveValue(source);await expect(page.locator('#program-mode input[value=javascript]')).toBeChecked();
 await clickVisible(page,page.locator('#program-mode input[value=blocks]'));await expect(page.locator('#text-error')).toContainText('Línea 2');
 await page.locator('#code-view-copy').focus();await page.keyboard.press('Enter');
 await expect(page.locator('#authoring-context')).toHaveValue('text');await expect(page.locator('#text-source')).toHaveValue(source);
 const docs=await page.evaluate(()=>studioProbe.textDocuments.capture());expect(JSON.stringify(docs)).toContain('api3');
 await page.screenshot({path:artifactPath('code-view-independent-copy.png'),fullPage:true});
});

test('CV-VIEWS-005: Python loads on demand, converts numeric edits and rejects while with its Python line',async({page})=>{
 await open(page);await run(page,12);
 await mode(page,'python');const source=page.locator('#text-source');
 await expect(source).toBeEditable();await expect(source).toHaveValue(/hero.move\(4\)/);
 await source.fill((await source.inputValue()).replace('hero.move(4)','hero.move(25)'));
 await mode(page,'blocks');await expect(page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText')).toHaveText('25');expect((await snapshot(page)).x).toBe(12);
 await mode(page,'python');await source.fill((await source.inputValue()).replace('hero.move(25)','hero.move(26)'));await run(page,78);
 await expect(page.locator('#program-mode input[value=python]')).toBeChecked();
 await source.fill('@on_start\ndef start():\n    while 1 < 3:\n        pass');
 await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#text-error')).toContainText('Línea 3');
 await expect(page.locator('#text-error')).toContainText('bucle');expect((await snapshot(page)).x).toBe(78);
 await page.screenshot({path:artifactPath('code-view-python-rejection.png'),fullPage:true});
});
test('CV-VIEWS-006: JavaScript Run converts first; invalid Run leaves live references usable',async({page})=>{
 await open(page);await mode(page,'javascript');const source=page.locator('#text-source');
 await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));await run(page,75);
 await source.fill('onStart(() => {\n  while(1 < 3) {}\n});');await clickVisible(page,page.locator('#run-editor'));
 await expect(page.locator('#text-error')).toContainText('Línea 2');expect((await snapshot(page)).x).toBe(75);
 expect((await page.evaluate(()=>GG.sprite.move('hero',1).then(()=>GG.sprite.get('hero')))).x).toBe(76);
});

test('CV-VIEWS-007: GGPROJ reopens active text and a portable Undo point in a clean browser',async({page,browser})=>{
 await open(page);const before=await authoring(page);await mode(page,'javascript');const source=page.locator('#text-source');
 await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));await mode(page,'blocks');await mode(page,'javascript');
 const pending=page.waitForEvent('download');await clickVisible(page,page.locator('#save-project'));
 const file=await pending,bytes=await readFile(await file.path());const context=await browser.newContext();
 try{
  const fresh=await context.newPage();await open(fresh);
  await fresh.locator('#open-project').setInputFiles({name:'vistas.ggproj',mimeType:'application/zip',buffer:bytes});
  await expect(fresh.locator('#open-project')).toHaveValue('');await expect(fresh.locator('#text-source')).toHaveValue(/hero.move\(25\)/);
  await expect(fresh.locator('#program-mode input[value=javascript]')).toBeChecked();await expect(fresh.locator('#code-view-undo')).toBeVisible();
  await clickVisible(fresh,fresh.locator('#code-view-undo'));await expect(fresh.locator('#program-mode input[value=blocks]')).toBeChecked();
  expect(await authoring(fresh)).toEqual(before);
 }finally{await context.close();}
});
test('CV-VIEWS-008: unavailable storage keeps conversion, in-memory Undo and portable export usable',async({page})=>{
 await page.addInitScript(()=>{IDBFactory.prototype.open=function(){throw new DOMException('Blocked for test','SecurityError');};});
 await open(page);const before=await authoring(page);await mode(page,'javascript');const source=page.locator('#text-source');
 await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));await mode(page,'blocks');
 await expect(page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText')).toHaveText('25');await run(page,75);
 await clickVisible(page,page.locator('#code-view-undo'));expect(await authoring(page)).toEqual(before);
 const pending=page.waitForEvent('download');await clickVisible(page,page.locator('#save-project'));expect((await readFile(await (await pending).path())).length).toBeGreaterThan(100);
});
test('CV-VIEWS-009: typing cancels an in-flight analysis without overwriting the newer draft or previous Undo',async({page})=>{
 await open(page);await mode(page,'javascript');const source=page.locator('#text-source');
 await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));await mode(page,'blocks');await mode(page,'javascript');
 const point=await page.evaluate(()=>studioProbe.codeViews.get('2d').restorePoint);
 let release;const blocked=new Promise(resolve=>{release=resolve;});
 await page.route('**/code-view-worker.mjs',async route=>{await blocked;await route.continue().catch(()=>{});});
 await source.fill((await source.inputValue()).replace('hero.move(25);','hero.move(26);'));
 const requested=page.waitForRequest('**/code-view-worker.mjs');await clickVisible(page,page.locator('#program-mode input[value=blocks]'));await requested;
 await source.fill('onStart(() => { hero.move(27); });');release();
 await expect.poll(()=>page.evaluate(()=>studioProbe.syncedViews.status().busy)).toBe(false);
 await expect(source).toHaveValue('onStart(() => { hero.move(27); });');
 expect(await page.evaluate(()=>studioProbe.codeViews.get('2d').restorePoint)).toEqual(point);
 await expect(page.locator('#program-mode input[value=javascript]')).toBeChecked();
 page.once('dialog',d=>d.dismiss());await clickVisible(page,page.locator('#code-view-undo'));await expect(source).toHaveValue('onStart(() => { hero.move(27); });');
});

test('CV-VIEWS-010: another context pack does not disable synchronized 2D languages',async({page})=>{
 await open(page);await selectContext(page,'microbit');await clickVisible(page,page.locator('#enable-device'));
 await expect(page.locator('#device-configured')).toBeVisible();await selectContext(page,'2d');await mode(page,'javascript');
 const source=page.locator('#text-source');await expect(source).toBeEditable();
 await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));await mode(page,'blocks');
 await expect(page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText')).toHaveText('25');
 await mode(page,'python');await expect(source).toBeEditable();
 await source.fill((await source.inputValue()).replace('hero.move(25)','hero.move(26)'));await mode(page,'blocks');
 await expect(page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText')).toHaveText('26');
});
test('CV-NEW-DOCUMENTS: new API3 templates and help execute in each language while previous copies remain independent',async({page})=>{
 await open(page);await selectContext(page,'text');
 for(const [language,button] of [['javascript','#new-javascript'],['python','#new-python']]){
  await clickVisible(page,page.locator(button));const source=await page.locator('#text-source').inputValue();
  expect(source).toContain(language==='javascript'?'onStart':'@on_start');expect(source).toContain('hero.move(10)');expect(source).not.toContain('GG.');
  await expect(page.locator('#text-api-help')).toContainText('hero.move(10)');
  expect((await page.evaluate(()=>studioProbe.textDocuments.selected())).runtime.api).toBe('api3');
  await clickVisible(page,page.locator('#run-document'));await expect(page.locator('#status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(10);
 }
});

test('CV-VIEWS-011: desktop and narrow rejection controls remain visible without horizontal overflow',async({page})=>{
 await open(page);await run(page,12);const samples=[];
 for(const [width,height] of [[1280,720],[1440,900],[390,844]]){
  await page.setViewportSize({width,height});await mode(page,'javascript');
  const source=page.locator('#text-source');await source.fill('onStart(() => {\n  while(1 < 3) {}\n});');
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));await expect(page.locator('#text-error')).toContainText('Línea 2');
  for(const id of ['code-view-edit','code-view-restore','code-view-copy','run-editor','stop-result']){
   const control=page.locator('#'+id);await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport();
   const box=await control.boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:artifactPath('synced-2d-'+width+'.png'),fullPage:width!==390});
  if(width===390){
   await page.locator('.text-authoring').screenshot({path:artifactPath('synced-2d-mobile-code.png')});
   await page.locator('#runner-slot').scrollIntoViewIfNeeded();
   const stage=page.frameLocator('#runner-slot iframe').locator('#stage');await stage.scrollIntoViewIfNeeded();
   await stage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.screenshot({path:artifactPath('synced-2d-mobile-result.png')});
  }
  samples.push({width,height,context:await page.locator('#authoring-context').inputValue(),runtimeX:(await snapshot(page)).x});
  page.once('dialog',dialog=>dialog.accept());await clickVisible(page,page.locator('#code-view-restore'));await expect(page.locator('#program-mode input[value=blocks]')).toBeChecked();
 }
 await writeFile(artifactPath('synced-2d-viewports.json'),JSON.stringify(samples,null,2));
});

test('CV-VIEWS-012: imported baseline equality cannot authorize invalid text or run the previous blocks',async({page})=>{
 await open(page);await mode(page,'javascript');await page.locator('#text-source').fill('onStart(()=>{ while(1<3){} });');
 const model=await page.evaluate(()=>studioProbe.project.capture());const entry=model.authoring.codeViews.entries.find(item=>item.contextId==='2d');entry.baselineSource=entry.source;
 await page.locator('#open-project').setInputFiles({name:'baseline-no-confiable.ggproj',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(model))});
 await expect(page.locator('#open-project')).toHaveValue('');await expect(page.locator('#text-source')).toHaveValue(entry.source);
 const before=await authoring(page);await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#text-error')).toContainText('bucle');
 expect(await authoring(page)).toEqual(before);expect((await snapshot(page)).x).toBe(0);
});

test('CV-VIEWS-013: a pending text edit cannot be checked against the previous execution of a lesson',async({page})=>{
 await open(page);await run(page,12);await mode(page,'javascript');const source=page.locator('#text-source');
 await source.fill((await source.inputValue()).replace('hero.move(4);','hero.move(25);'));
 await clickVisible(page,page.locator('#lesson-check'));
 await expect(page.locator('#lesson-status')).toContainText('Ejecuta tus cambios antes de comprobar.');
 expect((await snapshot(page)).x).toBe(12);
});
