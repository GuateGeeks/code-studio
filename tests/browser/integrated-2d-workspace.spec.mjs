import {test,expect} from '@playwright/test';
import {clickVisible,selectContext} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(()=>studioProbe.project.ready());
}
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
async function consult(page,label,target) {
  const tab=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:label,exact:true});
  await tab.focus();await tab.press('Enter');
  await expect(tab).toHaveAttribute('aria-selected','true');
  await expect(page.locator(target)).toBeVisible();
}

for(const width of [1280,1440])test('E4: programa, ejecución, escenario y consulta caben juntos a '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await open(page);
  // Nominal case: the start panel is closed after entering the project.
  if(await page.locator('#entry-toggle').getAttribute('aria-expanded')==='true')await page.locator('#entry-toggle').click();
  const frame=page.frameLocator('#runner-slot iframe');
  await expect(frame.locator('#stage')).toBeVisible();
  const geometry=await page.evaluate(()=>{
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    return {editor:rect('#blockly-editor'),stage:rect('#runner-slot'),dock:rect('#workspace-dock'),height:innerHeight,scrollY};
  });
  expect(geometry.scrollY).toBe(0);
  expect(geometry.editor.right).toBeLessThan(geometry.stage.x);
  expect(geometry.editor.width).toBeGreaterThan(500);
  expect(geometry.editor.height).toBeGreaterThan(300);
  expect(geometry.stage.bottom).toBeLessThan(geometry.height);
  expect(geometry.dock.y+100).toBeLessThanOrEqual(geometry.height);
  for(const id of ['run-editor','stop-result'])await expect(page.locator('#'+id)).toBeInViewport();
  const before=await page.evaluate(()=>({blocks:studioProbe.editor.save(),session:studioProbe.state().sessionId,scrollY}));
  await consult(page,'Actividad','#lesson-select');
  await expect(page.locator('#lessons-panel')).toHaveJSProperty('open',true);
  expect(await page.evaluate(()=>scrollY)).toBe(before.scrollY);
  await expect(page.locator('#blockly-editor')).toBeInViewport();
  await consult(page,'Propiedades','#inspector-heading');
  await expect(page.locator('#refresh-inspector')).toBeInViewport();
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before.blocks);
  expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(before.session);
  await page.screenshot({path:artifactPath('e4-integrated-'+width+'.png')});
});

test('E4: actividad, edición real, resultado, consulta y recuperación comparten una estación',async({page,context})=>{
  await open(page);await consult(page,'Actividad','#lesson-select');
  await clickVisible(page.locator('#lesson-load'));
  await expect(page.locator('#lesson-status')).toContainText('Ejemplo cargado sin ejecutar');
  const input=page.locator('#blockly-editor [data-id="lesson-story-first-n"] .blocklyText');
  await input.dblclick();await page.locator('.blocklyHtmlInput').fill('30');await page.locator('.blocklyHtmlInput').press('Enter');
  const blocks=await page.evaluate(()=>studioProbe.editor.save());
  await clickVisible(page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await snapshot(page)).x).toBe(50);
  await consult(page,'Propiedades','#inspector-heading');await clickVisible(page.locator('#refresh-inspector'));
  await expect(page.locator('#inspector-runtime')).toContainText('50');
  await consult(page,'Actividad','#lesson-select');
  await clickVisible(page.locator('.lesson-hint').first());
  await expect(page.locator('.lesson-hints li')).toHaveCount(1);
  await clickVisible(page.locator('#stop-result'));
  expect((await snapshot(page)).x).toBe(0);
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  await page.locator('#project-name').fill('Estación E4');
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  const recovered=await context.newPage();await open(recovered);
  await expect(recovered.locator('#project-name')).toHaveValue('Estación E4');
  expect(await recovered.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  expect((await snapshot(recovered)).x).toBe(0);
});

test('E4: consulta estrecha y copia textual conservan foco, bloques y resultado al cambiar contexto',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  const blocks=await page.evaluate(()=>studioProbe.editor.save());
  await consult(page,'Código','#generated-heading');await clickVisible(page.locator('#copy-javascript'));
  await expect(page.locator('#text-source')).toBeFocused();
  await page.locator('#text-source').fill("await GG.sprite.move('hero', 9);");
  // Wait until the document run is active: its own reset rejects any snapshot
  // request still pending, which made the poll below fail intermittently.
  await clickVisible(page.locator('#run-document'));await expect(page.locator('#result-context')).toContainText('· activo');
  await expect.poll(async()=>(await snapshot(page)).x).toBe(9);
  await selectContext(page,'microbit');
  await expect(page.locator('#result-context')).toContainText('documento');
  await clickVisible(page.locator('#stop-result'));expect((await snapshot(page)).x).toBe(0);
  await selectContext(page,'text');await expect(page.locator('#text-source')).toHaveValue("await GG.sprite.move('hero', 9);");
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  await consult(page,'Actividad','#lesson-select');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});
