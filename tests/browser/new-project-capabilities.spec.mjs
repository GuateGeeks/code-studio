import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {editableExample} from '../fixtures/corpus.blocks.mjs';

// R1 (29/10/2026): new projects start with explicit capabilities at the latest
// gg.sprites version and its E1 vocabulary; a saved v1/v2 file opens exactly
// as saved at 0.1.0. Nothing runs on start, creation or opening.
test.setTimeout(180000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const sprites=page=>page.evaluate(()=>studioProbe.project.capabilities()?.locks.find(lock=>lock.id==='gg.sprites').version??null);
// Blockly serialization omits empty objects (e.g. `fields: {}`) of the fixture.
const compact=value=>JSON.parse(JSON.stringify(value,(key,item)=>item&&typeof item==='object'&&!Array.isArray(item)&&!Object.keys(item).length?undefined:item));
const exported=async page=>JSON.parse(await page.evaluate(()=>studioProbe.project.export()));
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function reveal(page,panel,toggle){
  if(!await page.locator(panel).evaluate(node=>node.open))await clickVisible(page,page.locator(toggle));
  await expect(page.locator(panel)).toHaveAttribute('open','');
}
const packs=page=>reveal(page,'#capabilities-panel','#capabilities-panel > summary');
async function toolboxText(page,category){
  await selectContext(page,'2d');
  const row=page.locator('#blockly-editor .blocklyToolboxCategory').filter({has:page.locator('.blocklyToolboxCategoryLabel',{hasText:new RegExp('^'+category+'$')})});
  await clickVisible(page,row.first());
  const flyout=page.locator('#blockly-editor .blocklyToolboxFlyout, #blockly-editor .blocklyFlyout').filter({has:page.locator('.blocklyDraggable')}).first();
  await expect(flyout).toBeVisible({timeout:15000});
  return (await flyout.locator('.blocklyText').allTextContents()).join(' ').replace(/\u00a0/g,' ');
}
async function expectE1Toolbox(page){
  const motion=await toolboxText(page,'Movimiento'),looks=await toolboxText(page,'Apariencia'),control=await toolboxText(page,'Control');
  for(const text of ['girar ↻','ir a x:','deslizar en','rebotar si toca un borde'])expect(motion).toContain(text);
  for(const text of ['decir','pensar','fijar tamaño a','mostrar','esconder'])expect(looks).toContain(text);
  for(const text of ['por siempre','repetir hasta que','esperar hasta que','detener todo','detener este programa'])expect(control).toContain(text);
  return {motion,looks,control};
}

test('NP-BROWSER-001: the unsaved initial project and «Crear mi primera escena» use the latest gg.sprites with the E1 toolbox and run nothing',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);
  // Initial project: explicit capabilities, same example blocks, nothing executed.
  expect(await sprites(page)).toBe('0.2.0');
  const initial=await exported(page);
  expect(initial.version).toBe(3);expect(initial.scene).toBeUndefined();
  expect(initial.capabilities.config['gg.sprites'].initialScene).toEqual({spriteId:'hero',x:0,y:0,direction:90,size:100,costume:'hero'});
  expect(compact(initial.authoring.blockly)).toEqual(compact(editableExample)); // the built-in example (shell/editable.blocks.json)
  await packs(page);
  await expect(page.locator('#packs-list')).toHaveText('gg.sprites · 0.2.0');
  await expect(page.locator('#packs-status')).toHaveText('Versiones fijadas en este proyecto');
  await expect(page.locator('#update-packs')).toBeHidden();
  const initialToolbox=await expectE1Toolbox(page);
  expect((await snapshot(page)).x).toBe(0);
  // «Crear mi primera escena» replaces it with the story starter at the latest version.
  await reveal(page,'#entry-panel','#entry-toggle');
  await clickVisible(page,page.locator('#entry-create'));
  await expect(page.locator('#entry-create')).toHaveText('Crear mi primera escena');
  await expect(page.locator('#project-name')).toHaveValue('Mi primera creación');
  expect(await sprites(page)).toBe('0.2.0');
  const created=await exported(page);
  expect(created.capabilities.locks.map(lock=>[lock.id,lock.version])).toEqual([['gg.sprites','0.2.0']]);
  await expectE1Toolbox(page);
  expect((await settled(snapshot,page)).x).toBe(0);
  await expect(page.locator('#status')).not.toHaveText('Bloques ejecutados');
  expect(errors).toEqual([]);
  await writeFile(artifactPath('new-project-capabilities.json'),JSON.stringify({initialVersion:initial.version,initialLocks:initial.capabilities.locks,createdLocks:created.capabilities.locks,initialToolbox},null,2));
});

test('NP-BROWSER-002: a saved GGPROJ v1 and v2 open identical at 0.1.0 with the legacy toolbox and run nothing',async({page})=>{
  await open(page);
  // Files as the studio writes them: the example serialized by the editor.
  const saved=await page.evaluate(async()=>{
    const blockly=studioProbe.editor.save();
    const {createProject}=await import(new URL('./app/project-format.mjs',location.href).href);
    const catalog=studioProbe.project.catalog();
    const stamp={id:'0b5c2a3e-4f6d-4a7b-8c9d-0e1f2a3b4c5d',createdAt:'2026-10-01T10:00:00.000Z',updatedAt:'2026-10-01T10:00:00.000Z',revision:4};
    return [await createProject({name:'Guardado v1',blockly,deviceSource:'basic.showNumber(1)',catalog,...stamp}),
      await createProject({name:'Guardado v2',blockly,deviceSource:'basic.showNumber(2)',textDocuments:[],selectedTextDocumentId:null,catalog,...stamp})];
  });
  expect(saved.map(document=>document.version)).toEqual([1,2]);
  const timeless=document=>({...document,project:{...document.project,revision:null,updatedAt:null}});
  for(const document of saved){
    await page.evaluate(value=>studioProbe.project.open(JSON.stringify(value)),document);
    await expect(page.locator('#project-name')).toHaveValue(document.project.name);
    expect(await page.evaluate(()=>studioProbe.project.capabilities())).toBeNull();
    expect(timeless(await exported(page))).toEqual(timeless(document));
    await packs(page);
    await expect(page.locator('#packs-list')).toHaveText('gg.sprites · 0.1.0');
    await expect(page.locator('#packs-status')).toHaveText('Perfil compatible 2D · archivo original sin actualizar');
    const control=await toolboxText(page,'Control');
    for(const text of ['por siempre','repetir hasta que','esperar hasta que'])expect(control).not.toContain(text);
    expect((await settled(snapshot,page)).x).toBe(0);
    await expect(page.locator('#status')).not.toHaveText('Bloques ejecutados');
  }
});
