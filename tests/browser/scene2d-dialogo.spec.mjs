import {test,expect,chromium} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {origins} from './origins.mjs';
import {clickVisible,revealControl,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

// scene2d-multi-sprite tarea 4.1 (E2, 30/10/2026): a student builds a two-character
// dialogue with only blocks and menus: objects, messages, «decir», «cambiar fondo» and
// «ir a». Blocks reach the workspace by real drags from the toolbox and values by
// real menus and fields. Nothing here runs without the student's Run.
test.setTimeout(150000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const capture=page=>page.evaluate(()=>studioProbe.authoring.capture());
const config=page=>page.evaluate(()=>studioProbe.authoring.captureCapabilities().config['gg.sprites']);
const option=(page,name)=>page.getByRole('option',{name,exact:true});
const dialogo=JSON.parse(readFileSync(resolve(import.meta.dirname,'../fixtures/canonical/scene2d/dialogo/project.json'),'utf8'));
const spriteOf=(state,name)=>state.sprites.find(item=>item.name===name);
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  if(await page.locator('#entry-panel').evaluate(node=>node.open))await page.locator('#entry-toggle').click();
}
const fieldsOf=state=>{const out=[];const walk=value=>{if(!value||typeof value!=='object')return;if(value.type&&value.id)out.push(value);Object.values(value).forEach(walk);};walk(state?.blocks);return out;};
const blocksOn=async(page,type)=>fieldsOf(await page.evaluate(()=>studioProbe.editor.save())).filter(block=>block.type===type);
const svgBlock=(page,id)=>page.locator('#blockly-editor svg.blocklySvg [data-id="'+id+'"]').first();
const flyout=page=>page.locator('#blockly-editor .blocklyFlyout').filter({has:page.locator('.blocklyDraggable')}).first();
async function openCategory(page,name){
  const row=page.locator('#blockly-editor .blocklyToolboxCategory').filter({has:page.locator('.blocklyToolboxCategoryLabel',{hasText:new RegExp('^'+name+'$')})}).first();
  await row.click();
  await expect(flyout(page)).toBeVisible({timeout:15000});
}
const toolboxWords=async(page,category)=>{await openCategory(page,category);const text=(await flyout(page).locator('.blocklyText').allTextContents()).join(' ').replace(/ /g,' ');await page.keyboard.press('Escape');return text;};
// A real drag: from the block in the flyout to a point of the workspace, or to the
// slot where a block connects. Returns the new block's saved form.
async function drag(page,category,type,place,{top=false}={}){
  await page.locator('#blockly-editor').scrollIntoViewIfNeeded();
  await openCategory(page,category);
  // The point is read after the category opened: clicking it may scroll the page.
  const point=await place();
  const source=flyout(page).locator('g.'+type).first(),box=await source.boundingBox();
  const before=new Set(fieldsOf(await page.evaluate(()=>studioProbe.editor.save())).map(block=>block.id));
  const grab={x:box.x+6,y:box.y+Math.min(box.height/2,14)};
  await page.mouse.move(grab.x,grab.y);await page.mouse.down();
  await page.mouse.move(grab.x+20,grab.y+6,{steps:4});
  await page.mouse.move(point.x+6,point.y+Math.min(box.height/2,14),{steps:14});
  await page.mouse.up();
  await expect.poll(async()=>fieldsOf(await page.evaluate(()=>studioProbe.editor.save())).filter(block=>!before.has(block.id)&&block.type===type).length).toBeGreaterThan(0);
  const created=fieldsOf(await page.evaluate(()=>studioProbe.editor.save())).find(block=>!before.has(block.id)&&block.type===type);
  await expect(svgBlock(page,created.id)).toBeVisible();
  if(!top)expect(await page.evaluate(()=>studioProbe.editor.save().blocks.blocks.map(block=>block.id)),type+' connects').not.toContain(created.id);
  return created;
}
const emptySpot=async page=>{const box=await page.locator('#blockly-editor').boundingBox();return {x:box.x+box.width*0.45,y:box.y+36};};
async function under(page,block){const box=await svgBlock(page,block.id).boundingBox();return {x:box.x,y:box.y+box.height};}
// The statement slot of an empty event sits to the right of its label and fields.
async function inside(page,block){
  const box=await svgBlock(page,block.id).boundingBox();
  const right=await svgBlock(page,block.id).evaluate(node=>Math.max(...[...node.children].filter(child=>child.tagName==='g'&&!child.dataset.id).map(child=>child.getBoundingClientRect().right)));
  return {x:right+8,y:box.y+21};
}
async function setText(page,block,name,value){
  await svgBlock(page,block.id).locator(':scope > .blocklyEditableField').filter({hasText:name}).first().click();
  const input=page.locator('.blocklyWidgetDiv input.blocklyHtmlInput');
  await input.fill(value);await input.press('Enter');
}
async function choose(page,block,current,value){
  await svgBlock(page,block.id).locator(':scope > .blocklyEditableField').filter({hasText:current}).first().click();
  const items=page.locator('.blocklyDropDownDiv .blocklyMenuItem');
  await expect(items.first()).toBeVisible();
  const labels=(await items.allTextContents()).map(item=>item.trim());
  await items.filter({hasText:value}).first().click();
  return labels;
}
async function clearBlocks(page){
  for(const id of await page.evaluate(()=>(studioProbe.editor.save().blocks?.blocks??[]).map(item=>item.id))){
    const box=await svgBlock(page,id).boundingBox();
    await page.mouse.click(box.x+6,box.y+12);
    await page.keyboard.press('Delete');
  }
  await expect.poll(()=>page.evaluate(()=>studioProbe.editor.save().blocks?.blocks?.length??0)).toBe(0);
}
async function addObject(page,name){
  await clickVisible(page,page.locator('#object-add'));
  await expect(page.locator('#object-name')).toBeFocused();
  await page.locator('#object-name').fill(name);await page.locator('#object-name').press('Enter');
  await expect(option(page,name)).toHaveAttribute('aria-selected','true');
}
async function pick(page,name){await option(page,name).click();await expect(option(page,name)).toHaveAttribute('aria-selected','true');}
async function run(page){
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect(page.locator('#editor-error')).toHaveText('');
}
async function stop(page){
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function mode(page,value){await clickVisible(page,page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
async function useBackdrop(page,id){
  await clickVisible(page,page.locator('#tab-resources'));
  await revealControl(page,page.locator('#starter-library-filter'));
  await page.locator('#starter-library-filter input[value=backdrop]').check();
  await clickVisible(page,page.locator('[data-entry="'+id+'"]').getByRole('button',{name:/Usar de fondo/}));
  await expect(page.locator('[data-entry="'+id+'"]')).toHaveAttribute('data-state','current');
}
// Opens a project of objects, as a saved file does: the fixture's resources are
// copies of the catalog's, so that it needs no bytes of its own.
async function openFixture(page,project,overrides={}){
  await page.evaluate(async({project,overrides})=>{
    const app=path=>import(new URL('./app/'+path,location.href).href);
    const [{createProject},{createCapabilities},{promoteLegacyResources,validateResources}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs'),app('contracts/resources.mjs')]);
    const catalog=studioProbe.project.catalog(),capabilities=createCapabilities([...new Set([...project.packIds,'gg.assets'])]);
    capabilities.config['gg.sprites']=project.objects;
    const base=await promoteLegacyResources(catalog),first=owner=>base.costumes.find(item=>item.ownerId===owner);
    const resources=await validateResources({...structuredClone(base),costumes:[...base.costumes,...project.resources.map(({from,...item})=>({...first(from),...item}))]});
    await studioProbe.project.open(JSON.stringify(await createProject({name:project.name,scene2d:{...project.scene2d,...overrides},deviceSource:'',catalog,capabilities,resources})));
  },{project,overrides});
  await expect(page.locator('#run-editor')).toBeEnabled();
}

test('MS-BROWSER-033: «Diálogo» built with only blocks and menus runs, stops, saves and reopens in a new profile',async({page,browser})=>{
  await open(page);
  await clearBlocks(page);
  await addObject(page,'Cesta');
  // Backdrops from the library, chosen with the stage selected.
  await pick(page,'Escenario');
  await useBackdrop(page,'playa');await useBackdrop(page,'espacio');await useBackdrop(page,'playa');
  // hero says hello, sends the message, waits, and the backdrop changes.
  await pick(page,'hero');
  const start=await drag(page,'Eventos','gg_when_start',()=>emptySpot(page),{top:true});
  const hello=await drag(page,'Apariencia','gg_say_for',()=>inside(page,start));
  await setText(page,hello,/Hola/,'¡Hola, Cesta!');
  const send=await drag(page,'Eventos','gg_broadcast_wait',()=>under(page,hello));
  await setText(page,send,/go/,'responde');
  const backdrop=await drag(page,'Apariencia','gg_set_backdrop',()=>under(page,send));
  const menu=await choose(page,backdrop,/Playa|Fondo|Espacio/,'Espacio');
  expect(menu).toEqual(['Fondo inicial','Playa','Espacio']);
  const night=await drag(page,'Apariencia','gg_say',()=>under(page,backdrop));
  await setText(page,night,/Hola/,'¡Mira el cielo!');
  // Cesta answers when the message arrives, and goes to hero.
  await pick(page,'Cesta');
  const hear=await drag(page,'Eventos','gg_when_message',()=>emptySpot(page),{top:true});
  await setText(page,hear,/go/,'responde');
  const answer=await drag(page,'Apariencia','gg_say_for',()=>inside(page,hear));
  await setText(page,answer,/Hola/,'¡Hola, hero!');
  const go=await drag(page,'Movimiento','gg_go_to_object',()=>under(page,answer));
  expect(await choose(page,go,/hero/,'hero')).toEqual(['hero']);
  await expect.poll(async()=>(await page.evaluate(()=>studioProbe.authoring.capture())).scene2d.sprites.hero.blocks.blocks.length).toBe(1);
  const authored=await capture(page);
  const heroBlocks=fieldsOf(authored.scene2d.sprites.hero),cestaId=(await config(page)).sprites.find(sprite=>sprite.name==='Cesta').id;
  expect(heroBlocks.map(block=>block.type).filter(type=>type!=='math_number')).toEqual(['gg_when_start','gg_say_for','gg_broadcast_wait','gg_set_backdrop','gg_say']);
  expect(fieldsOf(authored.scene2d.sprites[cestaId]).map(block=>block.type).filter(type=>type!=='math_number')).toEqual(['gg_when_message','gg_say_for','gg_go_to_object']);
  // Nothing has run: the scene is the idle one.
  expect((await snapshot(page)).threads).toBe(0);
  await run(page);
  await expect.poll(async()=>spriteOf(await settled(snapshot,page),'hero')?.bubble?.text,{timeout:15000}).toBe('¡Hola, Cesta!');
  await expect.poll(async()=>spriteOf(await settled(snapshot,page),'Cesta')?.bubble?.text,{timeout:15000}).toBe('¡Hola, hero!');
  const expected=(await page.evaluate(()=>studioProbe.editor.resourceView().costumes.filter(item=>item.ownerId==='stage').map(item=>[item.name,item.id]))).find(([name])=>name==='Espacio')[1];
  await expect.poll(async()=>(await settled(snapshot,page)).backdrop,{timeout:15000}).toBe(expected);
  await expect.poll(async()=>spriteOf(await settled(snapshot,page),'hero')?.bubble?.text,{timeout:15000}).toBe('¡Mira el cielo!');
  const hero=spriteOf(await snapshot(page),'hero'),cesta=spriteOf(await snapshot(page),'Cesta');
  expect([cesta.x,cesta.y]).toEqual([hero.x,hero.y]);
  await page.screenshot({path:artifactPath('dialogo-running.png')});
  await stop(page);
  const stopped=await snapshot(page);await page.waitForTimeout(300);
  expect((await snapshot(page)).moves.length,'nothing moves after Detener').toBe(stopped.moves.length);
  // Saved as a file and opened in a profile that never saw it.
  await page.evaluate(()=>studioProbe.project.flush());
  const download=page.waitForEvent('download');await clickVisible(page,page.locator('#save-project'));
  const path=artifactPath('dialogo.ggproj');await (await download).saveAs(path);
  const context=await browser.newContext();
  try{
    const reopened=await context.newPage();await open(reopened);
    await reopened.locator('#open-project').setInputFiles(path);
    await expect(option(reopened,'Cesta')).toBeVisible();
    const saved=await capture(reopened);
    expect(saved.scene2d).toEqual(authored.scene2d);
    expect((await config(reopened)).stage).toEqual((await config(page)).stage);
    expect((await snapshot(reopened)).threads,'opening runs nothing').toBe(0);
    await run(reopened);
    await expect.poll(async()=>(await settled(snapshot,reopened)).backdrop,{timeout:15000}).toBe(expected);
    await expect.poll(async()=>spriteOf(await settled(snapshot,reopened),'hero')?.bubble?.text,{timeout:15000}).toBe('¡Mira el cielo!');
    await stop(reopened);
  }finally{await context.close();}
});

test('MS-BROWSER-034: a 0.1.0 project updates to 0.3.0 without running, and only then offers the new blocks and a second object',async({page})=>{
  await open(page);
  const project=JSON.parse(readFileSync(resolve(import.meta.dirname,'../fixtures/canonical/scene2d/repeat-move/project.json'),'utf8'));
  await page.evaluate(starter=>studioProbe.project.loadStarter(starter),{name:project.name,packIds:project.packIds,blockly:project.blockly});
  await page.evaluate(async()=>{
    const {createCapabilities}=await import(new URL('./app/contracts/packs.mjs',location.href).href);
    await studioProbe.project.useCapabilities(createCapabilities(['gg.sprites'],{versions:{'gg.sprites':'0.1.0'}}));
  });
  await selectContext(page,'2d');
  await clickVisible(page,page.locator('#capabilities-panel > summary'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.1.0');
  await expect(page.locator('#objects-panel')).toBeHidden();
  const original=await page.evaluate(()=>studioProbe.editor.save());
  expect(await toolboxWords(page,'Movimiento')).not.toContain('posición aleatoria');
  await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  expect(await page.evaluate(()=>studioProbe.editor.save()),'the same blocks, IDs and positions').toEqual(original);
  expect((await snapshot(page)).threads,'updating runs nothing').toBe(0);
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  expect(await toolboxWords(page,'Movimiento')).toContain('posición aleatoria');
  expect(await toolboxWords(page,'Apariencia')).toContain('cambiar fondo a');
  await run(page);
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(15);
  await stop(page);
  // The updated project takes a second object and a block that names it.
  await addObject(page,'Cesta');
  await pick(page,'hero');
  const last=fieldsOf(await page.evaluate(()=>studioProbe.editor.save())).find(block=>block.type==='controls_repeat_ext');
  const go=await drag(page,'Movimiento','gg_go_to_object',()=>under(page,last));
  const backdrop=await drag(page,'Apariencia','gg_set_backdrop',()=>under(page,go));
  expect(await choose(page,backdrop,/Fondo/,'Fondo inicial')).toEqual(['Fondo inicial']);
  await run(page);
  await expect.poll(async()=>{const now=await settled(snapshot,page);return spriteOf(now,'hero')?.x===spriteOf(now,'Cesta')?.x&&spriteOf(now,'hero')?.y===spriteOf(now,'Cesta')?.y;}).toBe(true);
  await stop(page);
});

test('MS-BROWSER-035: renaming the target keeps the block; deleting it leaves a readable block that saves, and only Run asks',async({page})=>{
  await open(page);
  await openFixture(page,dialogo);
  await pick(page,'Cesta');
  const go=(await blocksOn(page,'gg_go_to_object'))[0];
  await expect(svgBlock(page,go.id).locator(':scope > .blocklyEditableField')).toContainText('hero');
  // Rename: the block keeps the ID, shows the new name and the text the new identifier.
  await pick(page,'hero');
  await clickVisible(page,page.locator('#object-rename'));
  await page.locator('#object-name').fill('Ana María');await page.locator('#object-name').press('Enter');
  await expect(page.locator('#objects-status')).toContainText('se llama ahora');
  await pick(page,'Cesta');
  await expect(svgBlock(page,go.id).locator(':scope > .blocklyEditableField')).toContainText('Ana María');
  expect((await blocksOn(page,'gg_go_to_object'))[0].fields.TARGET).toBe('hero');
  await mode(page,'javascript');
  await expect(page.locator('#text-source')).toHaveValue(/cesta\.goToObject\(ana_maria\);/);
  await mode(page,'blocks');
  await run(page);
  await expect.poll(async()=>spriteOf(await settled(snapshot,page),'Cesta')?.x,{timeout:15000}).toBe(-120);
  await stop(page);
  // Delete: the block reads as unfinished; saving, the panel and reopening work.
  await pick(page,'Ana María');
  page.once('dialog',dialog=>dialog.accept());
  await clickVisible(page,page.locator('#object-delete'));
  await expect(page.locator('#objects-status')).toContainText('se borró');
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await expect(svgBlock(page,go.id).locator(':scope > .blocklyEditableField')).toContainText('añade otro objeto');
  await page.screenshot({path:artifactPath('deleted-target.png')});
  expect(await page.evaluate(()=>studioProbe.project.flush())).toBeTruthy();
  await page.reload();await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(option(page,'Cesta')).toBeVisible();
  await addObject(page,'Nube');
  // From another object, Run names the one to fix, and nothing starts.
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#editor-error')).toContainText('«Cesta»: Este bloque aún no tiene objeto. Elige uno en su menú');
  expect((await settled(snapshot,page)).threads).toBe(0);
  await pick(page,'Cesta');
  await expect(svgBlock(page,go.id).locator(':scope > .blocklyEditableField')).toContainText('elige un objeto');
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#editor-error')).toContainText('Elige uno en su menú');
  // A text view of an unfinished program explains itself and keeps the blocks.
  await page.evaluate(()=>{document.querySelector('#editor-error').textContent='';});
  await clickVisible(page,page.locator('#program-mode input[value=javascript]'));
  await expect(page.locator('#editor-error')).toContainText('Elige uno en su menú');
  await expect(page.locator('#program-mode input[value=blocks]')).toBeChecked();
  // Choosing another object mends it.
  expect(await choose(page,go,/elige/,'Nube')).toEqual(['Nube','elige un objeto']);
  expect((await blocksOn(page,'gg_go_to_object'))[0].fields.TARGET).toBe((await config(page)).sprites.find(sprite=>sprite.name==='Nube').id);
  // The sender is gone, so a new event runs it: a new block starts on the first other object.
  const start=await drag(page,'Eventos','gg_when_start',()=>emptySpot(page),{top:true});
  const added=await drag(page,'Movimiento','gg_go_to_object',()=>inside(page,start));
  expect(added.fields.TARGET).toBe((await config(page)).sprites.find(sprite=>sprite.name==='Nube').id);
  await run(page);
  await expect.poll(async()=>{const state=await settled(snapshot,page);return spriteOf(state,'Cesta')?.x===spriteOf(state,'Nube')?.x;},{timeout:15000}).toBe(true);
  await stop(page);
});

test('MS-BROWSER-036: an image uploaded on the stage is a backdrop: its menu, the text views and a text copy read its name',async({page})=>{
  await open(page);
  await pick(page,'Escenario');
  await clickVisible(page,page.locator('#tab-resources'));
  await revealControl(page,page.locator('#import-media'));
  await expect(page.locator('#import-media-label')).toContainText('como fondo');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#113355"/></svg>';
  await page.locator('#import-media').setInputFiles({name:'Mi noche.svg',mimeType:'image/svg+xml',buffer:Buffer.from(svg)});
  await expect(page.locator('#resources-error')).toHaveText('');
  await expect(page.locator('#resource-list option')).toHaveText(['Fondo inicial · Escenario','Mi noche · Escenario']);
  await expect.poll(async()=>(await config(page)).stage.backdrop).toMatch(/^GGasset:/);
  // The stage's own toolbox offers the backdrop blocks and no sprite action.
  await clickVisible(page,page.locator('#tab-inspector'));
  await expect(page.locator('#inspector-initial')).toContainText('Mi noche');
  const looks=await toolboxWords(page,'Apariencia');
  expect(looks).toContain('cambiar fondo a');expect(looks).toContain('siguiente fondo');expect(looks).not.toContain('decir');
  const start=await drag(page,'Eventos','gg_when_message',()=>emptySpot(page),{top:true});
  await setText(page,start,/go/,'noche');
  const block=await drag(page,'Apariencia','gg_set_backdrop',()=>inside(page,start));
  expect(await choose(page,block,/Mi noche|Fondo/,'Fondo inicial')).toEqual(['Fondo inicial','Mi noche']);
  // Text: names, never IDs, in both languages; an unknown name is refused on its line.
  await mode(page,'javascript');
  const source=page.locator('#text-source');
  await expect(source).toHaveValue(/setBackdrop\("Fondo inicial"\);/);
  expect(await source.inputValue()).not.toContain('GGasset');
  await source.fill((await source.inputValue()).replace('Fondo inicial','Playa'));
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));
  await expect(page.locator('#text-error')).toContainText('Sus fondos son: Fondo inicial, Mi noche');
  await source.fill((await source.inputValue()).replace('Playa','Mi noche'));
  await mode(page,'blocks');
  expect((await blocksOn(page,'gg_set_backdrop'))[0].fields.BACKDROP).toMatch(/^GGasset:/);
  await mode(page,'python');
  await expect(source).toHaveValue(/set_backdrop\("Mi noche"\)/,{timeout:60000});
  await mode(page,'blocks');
});

test('MS-BROWSER-037: «Diálogo» does the same as blocks, as a JavaScript copy and as a Python copy',async({page})=>{
  await open(page);
  await openFixture(page,dialogo);
  const final=state=>({backdrop:state.backdrop,hero:spriteOf(state,'hero')?.bubble,cesta:spriteOf(state,'Cesta')?.bubble,x:spriteOf(state,'Cesta')?.x,y:spriteOf(state,'Cesta')?.y});
  const goal={backdrop:'fondo-noche',hero:{type:'say',text:'¡Ya es de noche!'},cesta:{type:'say',text:'Aquí estoy'},x:-120,y:0};
  await run(page);
  await expect.poll(async()=>final(await settled(snapshot,page)),{timeout:15000}).toEqual(goal);
  await stop(page);
  const evidence={};
  for(const language of ['javascript','python']){
    await selectContext(page,'2d');await clickVisible(page,page.locator('#copy-'+language));await expect(page.locator('#copy-status')).toContainText('creada');
    const source=await page.locator('#text-source').inputValue();
    expect(source).toContain(language==='javascript'?'cesta.goToObject(hero);':'cesta.go_to_object(hero)');
    expect(source).toContain(language==='javascript'?'setBackdrop("Noche");':'set_backdrop("Noche")');
    await selectContext(page,'text');await clickVisible(page,page.getByRole('button',{name:'Ejecutar documento 2D',exact:true}));
    await expect.poll(async()=>final(await settled(snapshot,page)),{timeout:60000}).toEqual(goal);
    evidence[language]=source;
    await selectContext(page,'text');await clickVisible(page,page.getByRole('button',{name:'Detener',exact:true}));
    await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  }
  await writeFile(artifactPath('dialogo-copies.json'),JSON.stringify(evidence,null,2));
});

test('MS-BROWSER-038: the guide above the blocks is true of each object, and no static label names hero',async({page})=>{
  await page.route('**/shell.js',route=>route.abort());
  await page.goto('/');
  // What shows before the first render.
  await expect(page.locator('#creation-guide')).not.toContainText('Mover');
  await expect(page.locator('#inspector-object option[value=hero]')).toHaveText('Objeto seleccionado');
  await expect(page.locator('#inspector-variables-heading')).toHaveText('Variables locales');
  expect(await page.locator('#text-api-help').textContent()).not.toContain('hero');
  await page.unroute('**/shell.js');
  await open(page);
  const guide=page.locator('#creation-guide');
  await expect(guide).toContainText('Mover');
  await clearBlocks(page);
  await expect(guide).toContainText('Empieza el programa de hero');
  await addObject(page,'Cesta');
  await expect(guide).toContainText('Empieza el programa de Cesta');
  await pick(page,'Escenario');
  await expect(guide).toContainText('fondo');await expect(guide).not.toContainText('Mover');
  await pick(page,'Cesta');
  await drag(page,'Eventos','gg_when_start',()=>emptySpot(page),{top:true});
  await expect(guide).toContainText('Cambia un bloque,');await expect(guide).not.toContainText('Mover');
});

test('MS-BROWSER-039: at 320 px the zoom controls and the bin leave a loaded block free to tap',async({page})=>{
  await page.setViewportSize({width:320,height:568});
  await open(page);
  await openFixture(page,dialogo);
  await pick(page,'Cesta');
  await page.locator('#blockly-editor').scrollIntoViewIfNeeded();
  const go=(await blocksOn(page,'gg_go_to_object'))[0];
  const overlap=await page.evaluate(id=>{
    const block=document.querySelector('#blockly-editor svg.blocklySvg [data-id="'+id+'"]').getBoundingClientRect();
    return [...document.querySelectorAll('#blockly-editor .blocklyZoom, #blockly-editor .blocklyTrash')].some(node=>{const box=node.getBoundingClientRect();return box.width&&box.left<block.right&&box.right>block.left&&box.top<block.bottom&&box.bottom>block.top;});
  },go.id);
  await page.screenshot({path:artifactPath('zoom-controls-320.png')});
  expect(overlap).toBe(false);
});

const nine=['Cesta','Pelota con un nombre bien largo','Robot','Nube','Gato','Quetzal','Volcán'];
const noOverflow=page=>page.evaluate(()=>({scroll:document.scrollingElement.scrollWidth,viewport:innerWidth}));
// Captures with real actions: the backdrop menu open, a deleted target and a full panel.
for(const [label,width,height] of [['desktop',1440,900],['laptop',1280,720],['narrow',390,844]])test('MS-BROWSER-040: the backdrop menu, a deleted target and the object that does not open fit '+label+' '+width+'×'+height,async({page})=>{
  await page.setViewportSize({width,height});
  await open(page);
  await openFixture(page,{...dialogo,objects:{...dialogo.objects,sprites:[...dialogo.objects.sprites,{...dialogo.objects.sprites[1],id:'rota',name:'Rota',x:0}]},scene2d:{...dialogo.scene2d,sprites:{...dialogo.scene2d.sprites,rota:{blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'r-start',x:20,y:20,inputs:{DO:{block:{type:'gg_assets_set_costume',id:'r-costume',fields:{COSTUME:'fantasma'}}}}}]}}}}});
  await page.locator('#blockly-editor').scrollIntoViewIfNeeded();
  const backdrop=(await blocksOn(page,'gg_set_backdrop'))[0];
  await svgBlock(page,backdrop.id).scrollIntoViewIfNeeded();
  await svgBlock(page,backdrop.id).locator(':scope > .blocklyEditableField').click();
  await expect(page.locator('.blocklyDropDownDiv .blocklyMenuItem')).toHaveText([/Fondo inicial/,/Noche/]);
  await page.screenshot({path:artifactPath('backdrop-menu-'+label+'.png')});
  await page.keyboard.press('Escape');
  await option(page,'Rota').click();
  await expect(page.locator('#object-delete-unopened')).toBeVisible();
  await page.locator('#objects-panel').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifactPath('object-unopened-'+label+'.png')});
  const delta=await noOverflow(page);expect(delta.scroll).toBeLessThanOrEqual(delta.viewport);
});

test('MS-BROWSER-041: at real browser zoom 200 and 400 % the row of nine objects stays usable, with no page overflow',async()=>{
  const extension=resolve(dirname(fileURLToPath(import.meta.url)),'../fixtures/browser-zoom'),profile=await mkdtemp(resolve(tmpdir(),'gg-dialogo-zoom-'));
  let context;
  try{
    context=await chromium.launchPersistentContext(profile,{channel:'chromium',headless:true,viewport:null,
      args:['--enable-unsafe-swiftshader','--window-size=1280,720','--disable-extensions-except='+extension,'--load-extension='+extension]});
    const worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension://'))??await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension://'),timeout:15000});
    const page=context.pages()[0]??await context.newPage();
    await page.goto(origins.shellOrigin+'/');await page.waitForFunction(()=>window.studioProbe?.project.state().ready);
    await expect(page.locator('#run-editor')).toBeEnabled();
    if(await page.locator('#entry-panel').evaluate(node=>node.open))await page.locator('#entry-toggle').click();
    for(const name of nine)await addObject(page,name);
    await expect(page.locator('#objects-list [role=option]')).toHaveCount(9);
    const evidence=[];
    for(const factor of [2,4]){
      await worker.evaluate(args=>globalThis.zoomFixture.set(args),{url:page.url(),factor});
      await expect.poll(()=>page.evaluate(()=>Math.round(devicePixelRatio))).toBeGreaterThanOrEqual(factor);
      await page.evaluate(()=>document.querySelector('#objects-panel').scrollIntoView({block:'center'}));
      await page.waitForTimeout(400);
      const reading=await noOverflow(page);
      await page.screenshot({path:artifactPath('objects-zoom-'+factor*100+'.png')});
      expect(reading.scroll,JSON.stringify(reading)).toBeLessThanOrEqual(reading.viewport+1);
      // The keyboard reaches a tile off the row; the row scrolls, not the page.
      const list=page.locator('#objects-list');
      await list.locator('[aria-selected=true]').focus();await page.keyboard.press('Home');
      await expect(list.locator('[role=option]').first()).toBeFocused();
      await expect(list.locator('[role=option]').first()).toBeInViewport();
      await page.keyboard.press('End');
      await expect(list.locator('[role=option]').last()).toBeFocused();
      await expect(list.locator('[role=option]').last()).toBeInViewport();
      const editor=await page.locator('#blockly-editor').boundingBox();
      evidence.push({factor,...reading,editor});
    }
    await writeFile(artifactPath('objects-real-zoom.json'),JSON.stringify(evidence,null,2));
  }finally{await context?.close();await rm(profile,{recursive:true,force:true});}
});
