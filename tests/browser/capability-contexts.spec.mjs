import {selectContext,clickVisible} from './workspace-controls.mjs';
import {test,expect} from '@playwright/test';
import {createProject} from '../../src/project-format.mjs';
import {createProjectArchive} from '../../src/project-archive.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {promoteLegacyResources,promoteResources2} from '../../src/contracts/resources.mjs';
async function ready(page){await page.goto('/');await page.evaluate(()=>window.studioProbe?.project.ready());await expect.poll(()=>page.evaluate(()=>Boolean(window.studioProbe?.project.state().ready))).toBe(true);}
async function snapshot(page){return page.evaluate(()=>studioProbe.capabilityExecution.snapshot());}
async function context(page,id){await page.locator('#authoring-context').selectOption(id);}
test('GG-CONTEXT-001: independent 3D blocks, readonly source, QuickJS, Python, Stop and GGPROJ roundtrip',async({page},testInfo)=>{
 test.setTimeout(180000);await ready(page);await context(page,'scene3d');
 await clickVisible(page.getByRole('button',{name:'Añadir escena 3D',exact:true}));
 await expect(page.locator('#scene3d-mode')).toBeVisible();
 await expect(page.locator('#scene3d-generated-source')).toHaveJSProperty('readOnly',true);
 await expect(page.locator('#scene3d-generated-source')).toHaveValue(/sphere\.move\(/);
 await clickVisible(page.getByRole('button',{name:'Ejecutar escena 3D',exact:true}));
 await expect.poll(async()=>{const s=await snapshot(page);return s?.entities?.find(e=>e.id==='sphere')?.local?.position?.x??s?.entities?.find(e=>e.id==='sphere')?.position?.x;},{timeout:30000}).toBe(1);
 const canvas=page.frameLocator('.context-preview:not([hidden]) iframe[title="Escena 3D"]').locator('canvas');await expect(canvas).toBeVisible();await page.screenshot({path:testInfo.outputPath('babylon-real-render.png'),timeout:10000});
 const authoring=await page.evaluate(()=>studioProbe.capabilityUI.capture('scene3d'));
 await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));await expect.poll(()=>page.evaluate(()=>studioProbe.capabilityExecution.state().contextId)).toBe(null);
 expect(await page.evaluate(()=>studioProbe.capabilityUI.capture('scene3d'))).toEqual(authoring);
 for(const language of ['JavaScript','Python']){
  await clickVisible(page.getByRole('button',{name:'Crear copia '+language,exact:true}));
  await clickVisible(page.getByRole('button',{name:'Ejecutar escena 3D',exact:true}));
  await expect.poll(async()=>{const s=await snapshot(page);return s?.entities?.find(e=>e.id==='sphere')?.local?.position?.x??s?.entities?.find(e=>e.id==='sphere')?.position?.x;},{timeout:45000}).toBe(1);
  await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));
 }
 const archive=await page.evaluate(async()=>Array.from(await studioProbe.project.exportArchive()));
 await page.locator('#open-project').setInputFiles({name:'3d.ggproj',mimeType:'application/zip',buffer:Buffer.from(archive)});
 await expect(page.locator('#scene3d-mode input[value="python"]')).toBeChecked();
 expect(await snapshot(page)).toBe(null);await clickVisible(page.getByRole('button',{name:'Ejecutar escena 3D',exact:true}));
 await expect.poll(async()=>Boolean((await snapshot(page))?.entities),{timeout:45000}).toBe(true);
});
for(const mobile of [false,true])test('GG-CONTEXT-002: native form events, list and Python bindings '+(mobile?'mobile':'desktop'),async({page})=>{
 test.setTimeout(180000);if(mobile)await page.setViewportSize({width:390,height:844});await ready(page);await context(page,'webapp');
 await clickVisible(page.getByRole('button',{name:'Añadir aplicación web',exact:true}));
 for(const language of ['blocks','javascript','python']){
  if(language!=='blocks')await clickVisible(page.getByRole('button',{name:'Crear copia '+(language==='javascript'?'JavaScript':'Python'),exact:true}));
  await clickVisible(page.getByRole('button',{name:'Ejecutar aplicación web',exact:true}));
  await expect(page.getByRole('button',{name:'Ejecutar aplicación web',exact:true})).toBeEnabled({timeout:60000});
  const app=page.frameLocator('.context-preview:not([hidden]) iframe[title="Aplicación web"]');await expect(app.getByLabel('Nombre')).toBeVisible({timeout:45000});
  await app.getByLabel('Nombre').fill(language+' <script>');await app.getByLabel('Nombre').press('Enter');
  await expect(app.getByRole('listitem')).toHaveText(language+' <script>');
  await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('GG-CONTEXT-003: real block edit updates readonly code and runtime error selects its current source block',async({page})=>{
 test.setTimeout(120000);await ready(page);await context(page,'scene3d');
 const surface=page.locator('#scene3d-authoring');await clickVisible(surface.getByRole('button',{name:'Añadir escena 3D',exact:true}));
 const field=surface.locator('[data-id="scene-move"] .blocklyText').filter({hasText:/^(sphere|missing)$/});
 await field.dblclick();await page.locator('.blocklyHtmlInput').fill('missing');await page.locator('.blocklyHtmlInput').press('Enter');
 await expect(page.locator('#scene3d-generated-source')).toHaveValue(/missing/);
 await clickVisible(page.getByRole('button',{name:'Ejecutar escena 3D',exact:true}));
 await expect.poll(()=>page.evaluate(()=>studioProbe.console.snapshot().entries.some(record=>record.origin==='scene3d'&&record.sourceBlockId==='scene-move')),{timeout:30000}).toBe(true);
 const link=page.locator('#console-entries').getByRole('button', {name:'Ver bloque scene-move',exact:true,includeHidden:true});await expect(link).toBeEnabled();await clickVisible(link);
 expect(await page.evaluate(()=>studioProbe.capabilityUI.get('scene3d').blockEditor.selectedSource())).toBe('scene-move');
 await field.dblclick();await page.locator('.blocklyHtmlInput').fill('sphere');await page.locator('.blocklyHtmlInput').press('Enter');await expect(link).toBeDisabled();
 await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));
 await clickVisible(page.getByRole('button',{name:'Ejecutar escena 3D',exact:true}));
 await expect.poll(async()=>{const s=await snapshot(page);return s?.entities.find(e=>e.id==='sphere').local.position.x;}).toBe(1);
});
test('GG-CONTEXT-004: a 3D-only GGPROJ requires no sprite provider and can explicitly add a 2D context',async({page})=>{
 test.setTimeout(120000);await ready(page);
 const catalog=await page.evaluate(()=>studioProbe.project.catalog());
 const resources=await promoteResources2(await promoteLegacyResources(catalog));
 const model=await createProject({name:'Solo esfera',blockly:{blocks:{languageVersion:0,blocks:[]}},deviceSource:'',textDocuments:[],selectedTextDocumentId:null,catalog,resources,capabilities:createCapabilities(['gg.3d-basic'])});
 const archive=await createProjectArchive(model,{catalog});
 await page.locator('#open-project').setInputFiles({name:'only-3d.ggproj',mimeType:'application/zip',buffer:Buffer.from(archive)});
 await expect(page.locator('#authoring-context')).toHaveValue('scene3d');
 expect(await page.evaluate(()=>studioProbe.project.capabilities().locks.some(lock=>lock.id==='gg.sprites'))).toBe(false);
 await context(page,'2d');await expect(page.locator('#inactive-2d')).toBeVisible();await expect(page.locator('#scene-blockly-surface')).toBeHidden();
 await context(page,'scene3d');await clickVisible(page.getByRole('button',{name:'Ejecutar escena 3D',exact:true}));
 await expect.poll(async()=>{const s=await snapshot(page);return s?.entities.find(e=>e.id==='sphere').local.position.x;},{timeout:30000}).toBe(1);
 await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));
 await selectContext(page,'2d');
 await context(page,'2d');await clickVisible(page.locator('#enable-2d'));await expect(page.locator('#scene-blockly-surface')).toBeVisible();await expect(page.locator('#run-editor')).toBeEnabled();
 expect(await page.evaluate(()=>studioProbe.project.capabilities().locks.some(lock=>lock.id==='gg.sprites'))).toBe(true);
 // gg.sprites enters at its latest version (0.3.0): GGPROJ v6 with one workspace per 2D object.
 expect((await page.evaluate(()=>studioProbe.project.capture())).version).toBe(6);
});

