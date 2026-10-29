import {test,expect} from '@playwright/test';
import {clickVisible,selectContext,revealPanel,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {writeFile} from 'node:fs/promises';
test.setTimeout(120000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const authoring=page=>page.evaluate(()=>studioProbe.editor.save());
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>Boolean(window.studioProbe?.project));
  await page.evaluate(()=>studioProbe.project.ready());await expect(page.locator('#run-editor')).toBeEnabled();
  await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page.locator('#lessons-panel > summary'));
}
async function choose(page,key){
  const before=await authoring(page);
  await revealPanel(page,page.locator('#lesson-select'));await page.locator('#lesson-select').selectOption(key);
  expect(await authoring(page)).toEqual(before);
}
async function load(page){
  await clickVisible(page.locator('#lesson-load'));
  await expect(page.locator('#lesson-status')).toContainText('Ejemplo cargado sin ejecutar');
  await expect(page.locator('#run-editor')).toBeEnabled();expect((await snapshot(page)).x).toBe(0);
}
async function mode(page,value){await clickVisible(page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
async function check(page,expected){
  await clickVisible(page.locator('#lesson-check'));await expect(page.locator('#lesson-status')).toContainText(expected);
  return page.evaluate(()=>studioProbe.lessons.state());
}

for(const language of ['javascript','python'])test(`CV-ACTIVITY-BROWSER-001: revisión 2 edita el mismo programa en ${language} y vuelve a bloques`,async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);
  const options=await page.locator('#lesson-select option').evaluateAll(nodes=>nodes.map(node=>[node.value,node.textContent]));
  expect(options).toEqual([['story','Una pequeña historia'],['score','Un juego de tres puntos'],
    ['text-transition','De bloques a tu propio código'],['text-transition@1','De bloques a tu propio código · revisión anterior 1']]);
  await choose(page,'text-transition');await load(page);
  await expect(page.locator('#lesson-steps li')).toHaveCount(2);
  const blocks=await authoring(page);
  // Looking at the text and coming back changes nothing and runs nothing.
  await selectContext(page,'2d');await mode(page,language);await mode(page,'blocks');
  expect(await authoring(page)).toEqual(blocks);expect((await snapshot(page)).x).toBe(0);
  await mode(page,language);
  const source=page.locator('#text-source');
  await source.fill((await source.inputValue()).replace('hero.move(4)','hero.move(6)'));
  expect((await snapshot(page)).x).toBe(0);
  await clickVisible(page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(18);
  const passed=await check(page,'Comprobación completada');
  expect(passed.results.map(step=>[step.id,step.passed])).toEqual([['synced-edit',true],['synced-blocks',true]]);
  expect(passed.results.flatMap(step=>step.checks.map(check=>check.basis))).not.toContain('copy');
  await expect.poll(()=>page.evaluate(()=>studioProbe.lessons.state().historicalStepIds)).toEqual(['synced-edit','synced-blocks']);
  await mode(page,'blocks');
  await expect(page.locator('#blockly-editor [data-id="lesson-text-move-n"] .blocklyText')).toHaveText('6');
  const after=await authoring(page);
  expect(JSON.stringify(after)).toContain('"id":"lesson-text-move"');expect(JSON.stringify(after)).toContain('"id":"lesson-text-repeat"');
  expect(await page.evaluate(()=>studioProbe.textDocuments.capture()?.textDocuments??[])).toEqual([]);
  await page.screenshot({path:artifactPath(`synced-transition-${language}.png`),fullPage:true});
  expect(errors).toEqual([]);
});

test('CV-ACTIVITY-BROWSER-002: progreso de la revisión 1 se conserva y se muestra al abrir la revisión 2',async({page})=>{
  await open(page);await choose(page,'text-transition@1');await load(page);
  await selectContext(page,'2d');await clickVisible(page.locator('#copy-javascript'));
  const source=await page.locator('#text-source').inputValue();
  await page.locator('#text-source').fill(source.replace('hero.move(4)','hero.move(6)'));
  await clickVisible(page.locator('#run-document'));
  await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(18);
  const old=await check(page,'Comprobación completada');
  await expect.poll(()=>page.evaluate(()=>studioProbe.lessons.state().historicalStepIds.length)).toBe(3);
  const project=await page.evaluate(()=>studioProbe.project.state().id);
  await choose(page,'text-transition');
  await expect(page.locator('#lesson-progress')).toContainText('Revisión anterior 1: 3 de 3 pasos completados; se conserva.');
  expect(await page.evaluate(()=>studioProbe.lessons.state().historicalStepIds)).toEqual([]);
  // Reopening keeps both revisions apart, in the same project, without running.
  await page.evaluate(()=>studioProbe.project.flush());await open(page);
  expect(await page.evaluate(()=>studioProbe.project.state().id)).toBe(project);expect((await snapshot(page)).x).toBe(0);
  await choose(page,'text-transition');
  await expect(page.locator('#lesson-progress')).toContainText('Revisión anterior 1: 3 de 3 pasos completados');
  await choose(page,'text-transition@1');
  await expect(page.locator('#lesson-progress')).toContainText('Historial: 3 de 3 pasos completados');
  await writeFile(artifactPath('synced-transition-progress.json'),JSON.stringify({old:old.historicalStepIds,project},null,2));
});
