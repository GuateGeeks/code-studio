import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
test.setTimeout(120000);
const directory=new URL('../fixtures/sb3/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',directory),'utf8'));
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
async function open(page){await page.goto('/');await expect(page.locator('#run-editor')).toBeEnabled();await page.evaluate(()=>studioProbe.project.ready());await selectContext(page,'sb3');}
async function importItem(page,item){
  await page.locator('#import-sb3').setInputFiles(fileURLToPath(new URL(item.file,directory)));
  await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
  await expect.poll(()=>page.evaluate(()=>studioProbe.resourcesUI.state().report?.status)).toBe(item.expected.status);
  await expect(page.locator('#resources-error')).toBeEmpty();
}
async function originalHash(page){
  const event=page.waitForEvent('download');await clickVisible(page.locator('#download-original-sb3'));
  return createHash('sha256').update(await readFile(await (await event).path())).digest('hex');
}
async function consult(page){
  const tab=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Original y copia',exact:true});
  await tab.focus();await tab.press('Enter');await expect(tab).toHaveAttribute('aria-selected','true');await expect(page.locator('#sb3-tools-heading')).toBeVisible();
}
async function run(page){await clickVisible(page.locator('#run-sb3'));await expect(page.locator('#status')).toHaveText('Proyecto Scratch activo');}

for(const width of [1280,1440])test('E4 Scratch: original, cobertura, transporte y resultado integrados a '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await open(page);
  await expect(page.locator('#run-sb3')).toBeDisabled();await expect(page.locator('#download-original-sb3')).toBeDisabled();
  const before=await page.evaluate(()=>studioProbe.editor.save()),item=manifest.fixtures[0];
  await importItem(page,item);
  expect((await snapshot(page)).mode).not.toBe('compatibility');expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before);
  await expect(page.locator('#sb3-coverage')).toContainText('motion_movesteps');
  await expect(page.locator('#sb3-coverage')).toContainText('hero');
  await expect(page.locator('#sb3-coverage-count')).toContainText('Solo lectura');
  await expect(page.locator('#sb3-feedback-slot #resources-status')).toHaveCount(1);
  const geometry=await page.evaluate(()=>{
    const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return{x:r.x,right:r.right,y:r.y,bottom:r.bottom,height:r.height};};
    return {review:rect('#sb3-review'),stage:rect('#runner-slot'),dock:rect('#workspace-dock'),footer:rect('footer'),workspace:rect('.workspace-layout'),height:innerHeight,scrollY};
  });
  expect(geometry.review.right).toBeLessThan(geometry.stage.x);expect(geometry.review.height).toBeGreaterThanOrEqual(160);
  expect(geometry.stage.bottom).toBeLessThan(geometry.height);expect(geometry.footer.y).toBeGreaterThanOrEqual(Math.max(geometry.dock.bottom,geometry.workspace.bottom));
  expect(await page.locator('#dock-content').evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
  for(const id of ['run-sb3','stop-result'])await expect(page.locator('#'+id)).toBeInViewport();
  await run(page);await expect.poll(async () => (await settled(snapshot, page)).targets.find(target=>target.name==='hero')?.x).toBe(10);
  const session=await page.evaluate(()=>studioProbe.state().sessionId),reference=await page.evaluate(()=>studioProbe.resourcesUI.reference());
  await consult(page);expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(session);expect(await page.evaluate(()=>scrollY)).toBe(geometry.scrollY);
  expect(await originalHash(page)).toBe(item.sha256);expect(reference).toBe(item.sha256);
  await clickVisible(page.locator('#sb3-runtime-panel > summary'));await clickVisible(page.locator('#refresh-sb3-runtime'));
  await expect(page.locator('#sb3-runtime')).toContainText('hero');
  expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(session);
  await page.screenshot({path:artifactPath('e4sb-integrated-'+width+'.png'),fullPage:true});
  await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();expect((await snapshot(page)).mode).not.toBe('compatibility');
  expect(await page.evaluate(()=>studioProbe.resourcesUI.reference())).toBe(reference);expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before);
});

test('E4 Scratch: compatible nativo conserva autoría y ejecución ante un archivo inválido',async({page})=>{
  await open(page);const item=manifest.fixtures.find(value=>value.expected.status==='vm-compatible'&&!value.expected.audio);
  await importItem(page,item);await expect(page.locator('#copy-sb3-blocks')).toBeDisabled();await run(page);
  const before=await page.evaluate(()=>({session:studioProbe.state().sessionId,original:studioProbe.resourcesUI.reference(),blocks:studioProbe.editor.save()}));
  await page.locator('#import-sb3').setInputFiles({name:'invalido.sb3',mimeType:'application/zip',buffer:Buffer.from('archivo inválido')});
  await expect(page.locator('#resources-error')).not.toBeEmpty();await expect(page.locator('#sb3-feedback-slot #resources-error')).toBeVisible();await expect(page.locator('#resources-error')).toHaveAttribute('role','alert');
  await expect(page.locator('#resources-status')).toHaveText('No se completó la acción. Revisa el mensaje e inténtalo de nuevo.');
  expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(before.session);expect((await snapshot(page)).mode).toBe('compatibility');
  expect(await page.evaluate(()=>studioProbe.resourcesUI.reference())).toBe(before.original);expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before.blocks);
  expect(await originalHash(page)).toBe(item.sha256);
});

test('E4 Scratch: cobertura bloqueada conserva el original y no habilita ejecución o copia',async({page})=>{
  await open(page);const item=manifest.fixtures.find(value=>value.id==='19-extension');await importItem(page,item);
  await expect(page.locator('#sb3-summary')).toContainText('Ejecución bloqueada');await expect(page.locator('#sb3-coverage')).toContainText('Extensión no habilitada');
  await expect(page.locator('#run-sb3')).toBeDisabled();await expect(page.locator('#copy-sb3-blocks')).toBeDisabled();
  expect(await originalHash(page)).toBe(item.sha256);expect((await snapshot(page)).mode).not.toBe('compatibility');
});

test('E4 Scratch: teclado estrecho, feedback único, copia explícita y reapertura sin autorun',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await open(page);await importItem(page,manifest.fixtures[0]);
  const feedback=await page.locator('#resource-feedback').elementHandle();
  // Coverage is secondary to the original's state: it starts collapsed and opens by keyboard.
  await page.locator('#sb3-coverage-heading').focus();await page.locator('#sb3-coverage-heading').press('Enter');await expect(page.locator('#sb3-coverage-panel')).toHaveJSProperty('open',true);
  await page.locator('#sb3-coverage-heading').press('Enter');await expect(page.locator('#sb3-coverage-panel')).toHaveJSProperty('open',false);
  await consult(page);await page.locator('#copy-sb3-blocks').focus();await page.locator('#copy-sb3-blocks').press('Enter');
  await expect(page.locator('#authoring-context')).toHaveValue('2d');await expect(page.locator('#resource-feedback-home #resource-feedback')).toHaveCount(1);
  expect((await snapshot(page)).x).toBe(0);expect(await page.locator('#resource-feedback').evaluate((node,original)=>node===original,feedback)).toBe(true);
  const exported=await page.evaluate(()=>studioProbe.project.export());const reopened=await context.newPage();await reopened.goto('/');await expect(reopened.locator('#run-editor')).toBeEnabled();
  await reopened.evaluate(async value=>{await studioProbe.project.ready();await studioProbe.project.open(value);},exported);await selectContext(reopened,'sb3');await expect(reopened.locator('#run-sb3')).toBeEnabled();
  expect((await snapshot(reopened)).mode).not.toBe('compatibility');expect(await originalHash(reopened)).toBe(manifest.fixtures[0].sha256);
  await selectContext(page,'sb3');await run(page);await selectContext(page,'text');await clickVisible(page.locator('#stop-result'));expect((await snapshot(page)).mode).not.toBe('compatibility');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await feedback.dispose();
});
