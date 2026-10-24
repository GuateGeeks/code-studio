import {test,expect} from '@playwright/test';
import {clickVisible,selectContext,revealPanel,revealControl} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
test.setTimeout(90000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
async function open(page,id){
  await page.goto('/');await page.waitForFunction(()=>Boolean(window.studioProbe?.project));
  await page.evaluate(()=>studioProbe.project.ready());await expect(page.locator('#run-editor')).toBeEnabled();
  await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page.locator('#lessons-panel > summary'));
  const before=await page.evaluate(()=>studioProbe.editor.save());
  await revealPanel(page,page.locator('#lesson-select'));await page.locator('#lesson-select').selectOption(id);
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before);
  for(const name of ['objective','prediction','reflection'])await expect(page.locator('#lesson-'+name)).not.toBeEmpty();
  await clickVisible(page.locator('#lesson-load'));
  await expect(page.locator('#lesson-status')).toContainText('Ejemplo cargado sin ejecutar');
  await expect(page.locator('#run-editor')).toBeEnabled();expect((await snapshot(page)).x).toBe(0);
}
async function edit(page,id,value){
  await selectContext(page,'2d');const field=page.locator(`#blockly-editor [data-id="${id}"] .blocklyText`);
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill(String(value));
  await page.locator('.blocklyHtmlInput').press('Enter');await expect(field).toHaveText(String(value));
}
async function run(page,x){
  await selectContext(page,'2d');await clickVisible(page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await snapshot(page)).x).toBe(x);
}
async function check(page){
  await clickVisible(page.locator('#lesson-check'));await expect(page.locator('#lesson-status')).toContainText('Comprobación completada');
  await expect.poll(()=>page.evaluate(()=>studioProbe.lessons.state().historicalStepIds.length)).toBeGreaterThan(0);
  return page.evaluate(()=>studioProbe.lessons.state());
}
for(const mobile of [false,true])test(`E3: predicción, pistas por teclado, variante y recuperación (${mobile?'mobile':'desktop'})`,async({page})=>{
  if(mobile)await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await open(page,'story');
  const first=page.locator('[data-step-id="story-position"]'),hint=first.locator('.lesson-hint');
  await expect(first.locator('.lesson-hints li')).toHaveCount(0);
  await hint.focus();await hint.press('Enter');await expect(hint).toBeFocused();
  await expect(hint).toHaveAccessibleName('Siguiente pista: Llega hasta x=60');
  await expect(first.locator('.lesson-hints li')).toHaveCount(1);await expect(first).not.toContainText('prueba el primero en 40');
  await hint.press('Enter');await expect(first.locator('.lesson-hints li')).toHaveCount(2);
  await hint.press('Enter');await expect(hint).toBeFocused();await expect(first.locator('.lesson-hints li')).toHaveCount(3);
  await edit(page,'lesson-story-first-n',40);await run(page,60);await check(page);
  const blocks=await page.evaluate(()=>studioProbe.editor.save()),before=await snapshot(page);
  await clickVisible(page.locator('#lesson-variant'));await expect(page.locator('#lesson-variant')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#lesson-prediction')).toContainText('x=80');
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  expect((await snapshot(page)).revision).toBe(before.revision);expect((await snapshot(page)).x).toBe(60);
  await expect(page.locator('#lesson-steps > li')).toHaveCount(1);
  await clickVisible(page.locator('#lesson-check'));await expect(page.locator('#lesson-status')).toContainText('Aún faltan metas');
  await edit(page,'lesson-story-last-n',40);await run(page,80);const result=await check(page);
  expect(result.results.map(step=>step.id)).toEqual(['story-variant']);
  await expect(page.locator('#lesson-progress')).toContainText('1 de 1 pasos completados del reto variante');
  await clickVisible(page.locator('#lesson-main'));await expect(first.locator('.lesson-hints li')).toHaveCount(3);
  await expect(page.locator('#lesson-progress')).toContainText('2 de 2');
  expect(await page.evaluate(()=>studioProbe.lessons.state().results)).toEqual([]);
  await revealControl(page,page.locator('#lesson-route-title'));await page.locator('#lesson-route-title').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifactPath(`e3-guide-${mobile?'mobile':'desktop'}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
  await page.evaluate(()=>studioProbe.project.flush());await page.reload();
  await page.waitForFunction(()=>Boolean(window.studioProbe?.project));await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page.locator('#lessons-panel > summary'));
  await expect(page.locator('#lesson-progress')).toContainText('2 de 2');
  await clickVisible(page.locator('#lesson-variant'));await expect(page.locator('#lesson-progress')).toContainText('1 de 1');
  expect((await snapshot(page)).x).toBe(0);expect(errors).toEqual([]);
});
test('E3: cuatro pulsaciones completan solo la variante de puntos',async({page})=>{
  await open(page,'score');await edit(page,'lesson-score-move-n',10);
  await clickVisible(page.locator('#lesson-variant'));await run(page,0);
  const stage=page.frameLocator('#runner-slot iframe').locator('#stage');await stage.focus();
  for(let i=1;i<=4;i++){await stage.press('Space');await expect.poll(()=>page.evaluate(()=>GG.variables.get('gg-pack-score').then(value=>value.value))).toBe(i);}
  await expect.poll(async()=>(await snapshot(page)).x).toBe(40);
  const result=await check(page);expect(result.historicalStepIds).toEqual(['score-variant']);
  expect(result.results[0].checks.every(check=>check.passed&&check.basis==='execution')).toBe(true);
});
for(const language of ['javascript','python'])test(`E3: variante textual independiente ${language}`,async({page})=>{
  await open(page,'text-transition');const blocks=await page.evaluate(()=>studioProbe.editor.save());
  await clickVisible(page.locator('#copy-'+language));
  const source=await page.locator('#text-source').inputValue();expect(source).toContain('ctx.move(4)');
  await page.locator('#text-source').fill(source.replace('ctx.move(4)','ctx.move(8)'));
  await clickVisible(page.locator('#lesson-variant'));await clickVisible(page.locator('#run-document'));
  await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles');
  await expect.poll(async()=>(await snapshot(page)).x).toBe(24);
  const result=await check(page);expect(result.historicalStepIds).toEqual(['text-variant']);
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);await run(page,12);
});
