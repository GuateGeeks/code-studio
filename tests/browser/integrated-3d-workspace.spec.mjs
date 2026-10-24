import {test,expect} from '@playwright/test';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
test.setTimeout(120000);
const capture=page=>page.evaluate(()=>studioProbe.capabilityUI.capture('scene3d'));
const snapshot=page=>page.evaluate(()=>studioProbe.capabilityExecution.snapshot());
const execution=page=>page.evaluate(()=>studioProbe.capabilityExecution.state());
async function open(page){await page.goto('/');await expect(page.locator('#run-editor')).toBeEnabled();await page.evaluate(()=>studioProbe.project.ready());await selectContext(page,'scene3d');}
async function enable(page){await clickVisible(page.getByRole('button',{name:'Añadir escena 3D',exact:true}));await expect(page.locator('#scene3d-mode')).toBeVisible();}
async function consult(page,name,target){const tab=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:name,exact:true});await tab.focus();await tab.press('Enter');await expect(tab).toHaveAttribute('aria-selected','true');await expect(page.locator(target)).toBeVisible();}
async function run(page,x){await clickVisible(page.locator('#scene3d-run'));await expect.poll(async () => (await settled(snapshot, page))?.entities.find(item=>item.id==='sphere')?.local.position.x,{timeout:45000}).toBe(x);}
async function textBoundary(page){
 const bounds=await page.evaluate(()=>{const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{top:r.top,bottom:r.bottom};};return{context:rect('#context-authoring'),status:rect('#scene3d-status'),error:rect('#scene3d-error'),panel:rect('.text-authoring'),label:rect('label[for="text-source"]')};});
 expect(bounds.context.bottom).toBeGreaterThanOrEqual(Math.max(bounds.status.bottom,bounds.error.bottom));expect(bounds.panel.top-bounds.context.bottom).toBeGreaterThanOrEqual(16);expect(bounds.label.top).toBeGreaterThanOrEqual(bounds.panel.top);expect(bounds.label.bottom).toBeLessThanOrEqual(bounds.panel.bottom);
}

for(const width of [1280,1440])test('E4 3D: bloques reales, resultado, consulta y Stop integrados a '+width,async({page})=>{
 await page.setViewportSize({width,height:900});await open(page);await expect(page.locator('#scene3d-run')).toBeDisabled();await expect(page.locator('#scene3d-tools')).toBeHidden();
 await enable(page);expect(await snapshot(page)).toBeNull();
 const field=page.locator('#scene3d-blockly-editor [data-id="scene-move"] .blocklyText').filter({hasText:/^1$/});await field.dblclick();await page.locator('.blocklyHtmlInput').fill('2');await page.locator('.blocklyHtmlInput').press('Enter');
 const before=await capture(page);expect(before.workspace.nodes.find(item=>item.id==='scene-move').fields['delta.x']).toBe('2');
 for(const id of ['scene3d-run','stop-result'])await expect(page.locator('#'+id)).toBeInViewport();await run(page,2);
 const state=await execution(page),scroll=await page.evaluate(()=>scrollY);
 const geometry=await page.evaluate(()=>{const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return{x:r.x,right:r.right,y:r.y,bottom:r.bottom,height:r.height};};return{editor:rect('#scene3d-blockly-editor'),preview:rect('.context-preview:not([hidden])'),dock:rect('#workspace-dock'),footer:rect('footer'),workspace:rect('.workspace-layout'),height:innerHeight};});
 expect(geometry.editor.right).toBeLessThan(geometry.preview.x);expect(geometry.editor.height).toBeGreaterThanOrEqual(300);expect(geometry.preview.bottom).toBeLessThan(geometry.height);expect(geometry.footer.y).toBeGreaterThanOrEqual(Math.max(geometry.workspace.bottom,geometry.dock.bottom));
 expect(await page.locator('#dock-content').evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
 await consult(page,'Objetos 3D','#scene3d-tools-heading');await expect(page.locator('#scene3d-tools')).toContainText('estado inicial guardado');await expect(page.locator('#scene3d-tools > p')).toBeInViewport();expect((await execution(page)).sessionId).toBe(state.sessionId);expect(await page.evaluate(()=>scrollY)).toBe(scroll);
 const input=page.locator('#scene3d-property-name');await input.fill('Esfera con docente');await input.press('Home');await input.press('ArrowRight');const caret=await input.evaluate(node=>node.selectionStart);await input.press('Enter');await expect(input).toBeFocused();expect(await input.evaluate(node=>node.selectionStart)).toBe(caret);
 const saved=await capture(page);expect(saved.scene.entities[0].name).toBe('Esfera con docente');expect((await execution(page)).sessionId).toBe(state.sessionId);expect((await snapshot(page)).entities.find(item=>item.id==='sphere').local.position.x).toBe(2);
 await page.locator('#scene3d-property-id').fill('light');await clickVisible(page.locator('#scene3d-apply-properties'));await expect(page.locator('#scene3d-properties-feedback')).not.toBeEmpty();await expect(page.locator('#scene3d-properties-feedback')).toHaveAttribute('role','alert');expect(await capture(page)).toEqual(saved);expect((await execution(page)).sessionId).toBe(state.sessionId);
 await consult(page,'Código 3D','#scene3d-code-heading');await expect(page.locator('#scene3d-generated-source')).toHaveAttribute('readonly','');await expect(page.locator('#scene3d-generated-source')).toHaveValue(/2/);
 await page.screenshot({path:artifactPath('e43d-integrated-'+width+'.png'),fullPage:true});
 await clickVisible(page.locator('#scene3d-copy-javascript'));await expect(page.locator('#text-source')).toBeFocused();await page.locator('#text-source').scrollIntoViewIfNeeded();expect((await page.locator('#text-source').boundingBox()).height).toBeGreaterThanOrEqual(240);
 await textBoundary(page);await consult(page,'Objetos 3D','#scene3d-tools-heading');await page.locator('#scene3d-property-id').fill('light');await clickVisible(page.locator('#scene3d-apply-properties'));await expect(page.locator('#scene3d-properties-feedback')).not.toBeEmpty();await textBoundary(page);
 const copied=await capture(page);expect(copied.workspace).toEqual(saved.workspace);expect((await execution(page)).sessionId).toBe(state.sessionId);
 await clickVisible(page.locator('#stop-result'));expect(await snapshot(page)).toBeNull();expect(await capture(page)).toEqual(copied);
});

for(const language of ['javascript','python'])test('E4 3D: documento único, copia explícita, estrecho y reapertura '+language,async({page,context})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await open(page);await enable(page);const original=await capture(page);
 const sourceNode=await page.locator('#text-source').elementHandle();await consult(page,'Código 3D','#scene3d-code-heading');await clickVisible(page.locator('#scene3d-copy-'+language));await expect(page.locator('#scene3d-mode input[value="'+language+'"]')).toBeChecked();await expect(page.locator('#text-source')).toBeFocused();
 expect(await page.locator('#text-source').evaluate((node,original)=>node===original,sourceNode)).toBe(true);await expect(page.locator('#text-destination')).toContainText('Escena 3D');expect((await capture(page)).workspace).toEqual(original.workspace);expect(await snapshot(page)).toBeNull();
 await page.locator('#text-source').press('End');const caret=await page.locator('#text-source').evaluate(node=>node.selectionStart);await consult(page,'Objetos 3D','#scene3d-tools-heading');expect(await page.locator('#text-source').evaluate(node=>node.selectionStart)).toBe(caret);
 await run(page,1);await selectContext(page,'sb3');await clickVisible(page.locator('#stop-result'));expect(await snapshot(page)).toBeNull();await selectContext(page,'scene3d');expect((await capture(page)).workspace).toEqual(original.workspace);
 const archive=await page.evaluate(()=>studioProbe.project.export());const reopened=await context.newPage();await reopened.goto('/');await expect(reopened.locator('#run-editor')).toBeEnabled();await reopened.evaluate(async value=>{await studioProbe.project.ready();await studioProbe.project.open(value);},archive);await selectContext(reopened,'scene3d');await expect(reopened.locator('#scene3d-mode input[value="'+language+'"]')).toBeChecked();expect(await snapshot(reopened)).toBeNull();expect((await capture(reopened)).workspace).toEqual(original.workspace);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await sourceNode.dispose();
});

