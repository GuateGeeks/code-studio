import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {clickVisible,revealPanel,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

// scene2d-multi-sprite tarea 3.2 (E2, 30/10/2026): each object's costumes, sounds,
// inspector, derived code and activities work per object, and the starter library
// adds a sprite as a new object (R4). Nothing here runs without the student's Run.
test.setTimeout(240000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const mounted=page=>page.evaluate(()=>studioProbe.authoring.mountedObject());
const capture=page=>page.evaluate(()=>studioProbe.authoring.capture());
const config=page=>page.evaluate(()=>studioProbe.authoring.captureCapabilities().config['gg.sprites']);
const option=(page,name)=>page.getByRole('option',{name,exact:true});
const status=page=>page.locator('#objects-status');
const blockErrors=page=>page.locator('#editor-error');
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function reload(page){
  await page.evaluate(()=>studioProbe.project.flush());
  await open(page);
}
// A project with gg.assets, the installed resources and these workspaces.
async function openScene(page,{sprites,stage={},extra=[]}){
  await page.evaluate(async({sprites,stage,extra})=>{
    const app=path=>import(new URL('./app/'+path,location.href).href);
    const [{createProject},{createCapabilities},{promoteLegacyResources}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs'),app('contracts/resources.mjs')]);
    const catalog=studioProbe.project.catalog(),capabilities=createCapabilities(['gg.sprites','gg.assets']);
    capabilities.config['gg.sprites'].sprites.push(...extra);
    const document=await createProject({name:'Recursos',scene2d:{stage,sprites},deviceSource:'',catalog,capabilities,resources:await promoteLegacyResources(catalog)});
    await studioProbe.project.open(JSON.stringify(document));
  },{sprites,stage,extra});
  await expect(page.locator('#run-editor')).toBeEnabled();
}
const chain=blocks=>blocks.reduceRight((next,block)=>({...block,...(next?{next:{block:next}}:{})}),null);
const onStart=(id,...blocks)=>({blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id,x:24,y:24,inputs:{DO:{block:chain(blocks)}}}]}});
const move=(id,steps)=>({type:'gg_move',id,inputs:{STEPS:{shadow:{type:'math_number',id:id+'-n',fields:{NUM:steps}}}}});
const say=(id,text)=>({type:'gg_say',id,fields:{MESSAGE:text}});
async function run(page){
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect(blockErrors(page)).toHaveText('');
}
async function stop(page){
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function pick(page,name){
  await option(page,name).click();
  await expect(option(page,name)).toHaveAttribute('aria-selected','true');
}
async function nameForm(page,name){
  const input=page.locator('#object-name');
  await expect(input).toBeFocused();
  await input.fill(name);await input.press('Enter');
}
async function add(page,name){
  await clickVisible(page,page.locator('#object-add'));
  await nameForm(page,name);
  await expect(option(page,name)).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function removeSelected(page){
  page.once('dialog',dialog=>void dialog.accept());
  await clickVisible(page,page.locator('#object-delete'));
}
async function mode(page,value){await clickVisible(page,page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
// The real Blockly dropdown of a block: centered in the editor and in the page,
// clear of Blockly's controls and of the sticky transport bar.
// A block's group also holds the blocks under it: the field is found by its text.
async function openMenu(page,id,label){
  await page.evaluate(id=>{studioProbe.editor.selectSource(id);document.querySelector('#blockly-editor [data-id="'+id+'"]').scrollIntoView({block:'center'});},id);
  await page.locator(`#blockly-editor [data-id="${id}"] .blocklyDropdownText`,{hasText:label}).first().click();
}
async function menu(page,id,label){
  await openMenu(page,id,label);
  await expect(page.locator('.blocklyDropDownDiv .blocklyMenuItem').first()).toBeVisible();
  const items=(await page.locator('.blocklyDropDownDiv .blocklyMenuItem').allTextContents()).map(text=>text.trim());
  await page.keyboard.press('Escape');await expect(page.locator('.blocklyDropDownDiv .blocklyMenuItem')).toHaveCount(0);
  return items;
}
async function flyout(page,category){
  await page.locator('#blockly-editor .blocklyToolbox [role=treeitem]',{hasText:category}).first().click();
  await expect(page.locator('#blockly-editor .blocklyFlyout .blocklyDraggable').first()).toBeVisible();
  // Blockly writes spaces as non-breaking ones.
  const text=await page.evaluate(()=>[...document.querySelectorAll('#blockly-editor .blocklyFlyout .blocklyDraggable')].map(node=>node.textContent.replaceAll('\u00a0',' ')).join(' | '));
  await page.keyboard.press('Escape');
  return text;
}
const library=page=>page.locator('#starter-library'),card=(page,id)=>page.locator(`#starter-library-items li[data-entry="${id}"]`);
async function openLibrary(page){
  await revealPanel(page,library(page));
  if(!await library(page).evaluate(node=>node.open))await clickVisible(page,page.locator('#starter-library > summary'));
  await expect(page.locator('#starter-library-status')).toContainText('recursos disponibles');
}
async function show(page,kind){
  const input=page.locator(`#starter-library-filter input[value="${kind}"]`);
  await revealPanel(page,library(page));await input.scrollIntoViewIfNeeded();await input.check();
  await expect(page.locator('#starter-library-items')).toHaveAttribute('data-kind',kind);
}
const resourceList=page=>page.locator('#resource-list option').allTextContents();

test('MS-BROWSER-016: duplicate a sprite with costume and sound blocks, select the copy, run, delete it and run again',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);
  const hero=onStart('h-start',{type:'gg_set_costume',id:'h-fixed',fields:{COSTUME:'hero-alt'}},{type:'gg_play_sound',id:'h-tone',fields:{SOUND:'tone'}},
    {type:'gg_assets_set_costume',id:'h-menu',fields:{COSTUME:'hero'}},{type:'gg_assets_play_sound',id:'h-menu-sound',fields:{SOUND:'tone'}},{type:'gg_assets_set_costume',id:'h-last',fields:{COSTUME:'hero-alt'}});
  await openScene(page,{sprites:{hero}});
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');

  await clickVisible(page,page.locator('#object-duplicate'));
  await expect(option(page,'hero 2')).toHaveAttribute('aria-selected','true');
  await expect(status(page)).toContainText('es una copia');
  await expect(page.locator('#object-delete-unopened')).toBeHidden();
  const objects=await config(page),copy=objects.sprites[1].id;
  expect(await mounted(page)).toBe(copy);
  expect((await snapshot(page)).threads).toBe(0);
  // The copy's blocks name its own resources, and its menus list them.
  const stored=(await capture(page)).resources,own=kind=>Object.fromEntries(stored[kind].filter(item=>item.ownerId===copy).map(item=>[item.name,item.id]));
  const program=await page.evaluate(()=>studioProbe.authoring.sceneProgram());
  const body=program.scripts.find(script=>script.targetId===copy).body;
  expect(body.map(node=>node.costume??node.sound)).toEqual([own('costumes')['hero-alt'],own('sounds').tone,own('costumes').hero,own('sounds').tone,own('costumes')['hero-alt']]);
  expect(await menu(page,body[0].sourceBlockId,'hero-alt')).toEqual(['hero','hero-alt']);
  // Run starts both objects, each with its own costume.
  await run(page);
  await expect.poll(async()=>(await settled(snapshot,page)).sprites.map(sprite=>sprite.costume)).toEqual(['hero-alt',own('costumes')['hero-alt']]);
  await stop(page);
  // Reopening keeps it: the copy's workspace loads as the copy's.
  await reload(page);
  expect(await mounted(page)).toBe(copy);
  await run(page);
  await stop(page);
  await removeSelected(page);
  await expect(option(page,'hero 2')).toHaveCount(0);
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await run(page);
  await expect.poll(async()=>(await settled(snapshot,page)).sprites.map(sprite=>sprite.id)).toEqual(['hero']);
  await stop(page);
  expect(errors).toEqual([]);
});

test('MS-BROWSER-017: an object that cannot be opened says why, names itself when Run fails and can be deleted',async({page})=>{
  await open(page);
  const hero=onStart('h-start',move('h-move',10)),rota=onStart('r-start',{type:'gg_assets_set_costume',id:'r-costume',fields:{COSTUME:'fantasma'}});
  await openScene(page,{sprites:{hero,rota},extra:[{id:'rota',name:'Rota',x:50,y:0,direction:90,size:100,visible:true,costume:'hero'}]});
  await option(page,'Rota').click();
  await expect(status(page)).toContainText('No se pudo abrir «Rota»');
  await expect(status(page)).toContainText('puedes borrarlo');
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await clickVisible(page,page.locator('#run-editor'));
  await expect(blockErrors(page)).toContainText('«Rota»');
  const remove=page.getByRole('button',{name:'Borrar «Rota»',exact:true});
  await expect(remove).toBeVisible();
  // Cancelling keeps it, with the focus on its button.
  page.once('dialog',dialog=>void dialog.dismiss());
  await remove.click();
  await expect(remove).toBeFocused();
  page.once('dialog',dialog=>void dialog.accept());
  await remove.click();
  await expect(option(page,'Rota')).toHaveCount(0);
  await expect(remove).toBeHidden();
  await expect(option(page,'hero')).toBeFocused();
  await expect(status(page)).toContainText('«Rota» se borró');
  await run(page);
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(10);
});

test('MS-BROWSER-028: unfinished blocks never lock their object: it opens again, in any view, and only Run asks to finish it',async({page})=>{
  await open(page);
  const hero=onStart('h-start',move('h-move',10)),cesta=onStart('c-start',{type:'controls_if',id:'c-if'});
  await openScene(page,{sprites:{hero,cesta},extra:[{id:'cesta',name:'Cesta',x:50,y:0,direction:90,size:100,visible:true,costume:'hero'}]});
  await pick(page,'Cesta');
  await expect(page.locator('#object-delete-unopened')).toBeHidden();
  expect(JSON.stringify(await page.evaluate(()=>studioProbe.editor.save()))).toContain('c-if');
  await pick(page,'hero');
  await clickVisible(page,page.locator('#run-editor'));
  await expect(blockErrors(page)).toContainText('«Cesta»');
  // From a text view it opens too, in Blocks: it has no text yet.
  await mode(page,'javascript');
  await pick(page,'Cesta');
  await expect(page.locator('#program-mode input[value=blocks]')).toBeChecked();
  expect(JSON.stringify(await page.evaluate(()=>studioProbe.editor.save()))).toContain('c-if');
  await expect(page.locator('#object-delete-unopened')).toBeHidden();
});

test('MS-BROWSER-018: menus, toolbox, the resource list and uploads follow the selected object',async({page})=>{
  await open(page);
  await openScene(page,{sprites:{hero:onStart('h-start',{type:'gg_assets_set_costume',id:'h-costume',fields:{COSTUME:'hero-alt'}})}});
  await add(page,'Cesta');
  const cesta=await mounted(page);
  await openLibrary(page);await show(page,'costume');
  await clickVisible(page,card(page,'gato').getByRole('button',{name:'Añadir «Gato» a los disfraces'}));
  await expect(page.locator('#starter-library-status')).toHaveText('«Gato» se añadió a los disfraces de Cesta. Elígelo en el bloque «disfraz».');
  await expect(page.locator('#starter-library-scope')).toContainText('Cesta');
  await expect(page.locator('#starter-library-scope')).not.toContainText('hero');
  await expect(card(page,'gato')).toHaveAttribute('data-state','added');
  // Cesta's menus: its costumes and no sound of hero's.
  await page.evaluate(state=>studioProbe.editor.load(state),onStart('c-start',{type:'gg_assets_set_costume',id:'c-costume',fields:{COSTUME:'gato'}},{type:'gg_assets_play_sound',id:'c-sound',fields:{SOUND:'__gg_missing_resource__'}}));
  expect(await menu(page,'c-costume','Gato')).toEqual(['Cesta','Gato']);
  expect(await menu(page,'c-sound','Sin recursos')).toEqual(['Sin recursos disponibles']);
  expect(await flyout(page,'Apariencia')).not.toContain('cambiar disfraz a');
  expect(await flyout(page,'Recursos locales')).toContain('disfraz');
  await revealPanel(page,page.locator('#resource-list'));
  expect(await resourceList(page)).toEqual(['Cesta · Cesta','Gato · Cesta']);
  // Another object: its own again, and the library says so.
  // Cesta has no sounds yet: the block stays, it can come back to it, and Run says so.
  await pick(page,'hero');
  await clickVisible(page,page.locator('#run-editor'));
  await expect(blockErrors(page)).toContainText('«Cesta»: Este objeto aún no tiene ese recurso');
  await pick(page,'Cesta');
  await expect(page.locator('#object-delete-unopened')).toBeHidden();
  // Adding a sound is the way out, from the object on screen.
  await show(page,'sound');
  await clickVisible(page,card(page,'sonido-salto').getByRole('button',{name:'Añadir «Salto» a los sonidos'}));
  await expect(page.locator('#starter-library-status')).toContainText('sonidos de Cesta');
  await show(page,'costume');
  await pick(page,'hero');
  expect(await menu(page,'h-costume','hero-alt')).toEqual(['hero','hero-alt']);
  expect(await flyout(page,'Apariencia')).toContain('cambiar disfraz a');
  await revealPanel(page,page.locator('#resource-list'));
  expect(await resourceList(page)).toEqual(['hero · hero','hero-alt · hero','tone · hero']);
  await expect(card(page,'gato')).not.toHaveAttribute('data-state','added');
  // An upload goes to the selected object.
  await pick(page,'Cesta');
  await revealPanel(page,page.locator('#import-media'));
  await page.locator('#import-media').setInputFiles({name:'caja.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#c33"/></svg>')});
  await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
  await expect.poll(async()=>(await capture(page)).resources.costumes.find(item=>item.name==='caja.svg')?.ownerId).toBe(cesta);
  // The stage has no costumes: the upload explains; a sound is its own.
  await pick(page,'Escenario');
  expect(await page.locator('#resource-list').evaluate(node=>[...node.options].map(item=>item.textContent))).toEqual(['stage · Escenario']);
  await page.locator('#import-media').setInputFiles({name:'caja2.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#3c3"/></svg>')});
  await expect(page.locator('#resources-error')).toContainText('El escenario no lleva disfraces');
  expect((await capture(page)).resources.costumes.some(item=>item.name==='caja2.svg')).toBe(false);
  expect((await snapshot(page)).threads).toBe(0);
});

test('MS-BROWSER-019: text on an object uses its costumes in a view and in a copy; another object\'s is refused',async({page})=>{
  await open(page);
  await openScene(page,{sprites:{hero:onStart('h-start',move('h-move',5))}});
  await add(page,'Cesta');
  await openLibrary(page);await show(page,'costume');
  await clickVisible(page,card(page,'gato').getByRole('button',{name:'Añadir «Gato» a los disfraces'}));
  await expect(page.locator('#starter-library-status')).toContainText('disfraces de Cesta');
  await mode(page,'javascript');
  // In a view, hero's costume on Cesta is refused in its line, and the text stays.
  const bad='onStart(() => {\n  cesta.setCostume("hero-alt");\n});\n',good='onStart(() => {\n  cesta.setCostume("gato");\n});\n';
  await page.locator('#text-source').fill(bad);
  await page.locator('#run-editor').click();
  await expect(page.locator('#text-error')).toContainText('Línea 2');
  await expect(page.locator('#text-source')).toHaveValue(bad);
  await page.locator('#text-source').fill(good);
  await run(page);
  await expect.poll(async()=>(await settled(snapshot,page)).sprites[1].costume).toBe('gato');
  await stop(page);
  await mode(page,'blocks');
  const cesta=await mounted(page);
  expect(JSON.stringify((await capture(page)).scene2d.sprites[cesta])).toContain('gg_assets_set_costume');
  // A copy of the project runs them too: the call is authorized for its object.
  await revealPanel(page,page.locator('#copy-javascript'));
  await clickVisible(page,page.locator('#copy-javascript'));
  await expect(page.locator('#text-source')).toHaveValue(/cesta\.setCostume\("gato"\)/);
  await clickVisible(page,page.getByRole('button',{name:'Ejecutar documento 2D',exact:true}));
  await expect(page.locator('#status')).toHaveText(/Documento (terminado|activo · eventos disponibles)|Ejecutando documento/,{timeout:60000});
  await expect.poll(async()=>(await snapshot(page)).sprites[1].costume).toBe('gato');
  const source=await page.locator('#text-source').inputValue();
  // The broker accepts any object's resource in a text call; the scene runs it on the calling object.
  await page.locator('#text-source').fill(source.replace('cesta.setCostume("gato")','cesta.setCostume("hero-alt")'));
  await clickVisible(page,page.getByRole('button',{name:'Ejecutar documento 2D',exact:true}));
  await expect(page.locator('#console-entries')).toContainText('costume unavailable',{timeout:60000});
  expect((await snapshot(page)).sprites[1].costume).not.toBe('hero-alt');
});

test('MS-BROWSER-020: the library adds a sprite as a new object and sets the stage\'s backdrop; nothing runs',async({page})=>{
  await open(page);
  await openLibrary(page);await show(page,'costume');
  const create=card(page,'gato').getByRole('button',{name:'Nuevo objeto con «Gato»'});
  await clickVisible(page,create);
  await expect(page.locator('#starter-library-status')).toHaveText('«Gato» es un objeto nuevo. Aparecerá en el escenario al ejecutar.');
  await expect(option(page,'Gato')).toHaveAttribute('aria-selected','true');
  await expect(create).toBeFocused();
  await expect(page.locator('#editing-context')).toHaveText('Editando: Gato · bloques');
  expect((await snapshot(page)).threads).toBe(0);
  const sprite=(await config(page)).sprites[1],stored=(await capture(page)).resources;
  expect(stored.costumes.find(item=>item.id===sprite.costume)).toMatchObject({ownerId:sprite.id,name:'Gato'});
  expect(stored.costumes.filter(item=>item.ownerId==='hero').map(item=>item.id)).toEqual(['hero','hero-alt']);
  // A second one gets a free name; a sound goes to the selected object.
  await clickVisible(page,create);
  await expect(option(page,'Gato 2')).toHaveAttribute('aria-selected','true');
  await show(page,'sound');
  await clickVisible(page,card(page,'sonido-salto').getByRole('button',{name:'Añadir «Salto» a los sonidos'}));
  await expect(page.locator('#starter-library-status')).toContainText('sonidos de Gato 2');
  // The stage: drawings become objects, sounds and backdrops are its own.
  await pick(page,'Escenario');
  await show(page,'costume');
  await expect(card(page,'perro').getByRole('button',{name:'Añadir «Perro» a los disfraces'})).toBeHidden();
  await expect(card(page,'perro').getByRole('button',{name:'Nuevo objeto con «Perro»'})).toBeVisible();
  await expect(page.locator('#starter-library-scope')).not.toContainText('hero');
  await show(page,'sound');
  await clickVisible(page,card(page,'sonido-salto').getByRole('button',{name:'Añadir «Salto» a los sonidos'}));
  await expect(page.locator('#starter-library-status')).toContainText('sonidos del escenario');
  await show(page,'backdrop');
  const before=await option(page,'Escenario').locator('img').getAttribute('src');
  const backdrop=page.locator('#starter-library-items li').first();
  await clickVisible(page,backdrop.getByRole('button',{name:/Usar de fondo/}));
  await expect(page.locator('#starter-library-status')).toContainText('es ahora el fondo del escenario');
  await expect.poll(()=>option(page,'Escenario').locator('img').getAttribute('src')).not.toBe(before);
  await reload(page);
  await expect(option(page,'Gato 2')).toBeVisible();
  await run(page);
  const reading=await settled(snapshot,page);
  expect(reading.sprites.map(item=>item.name)).toEqual(['hero','Gato','Gato 2']);
  expect(reading.sprites[1].costume).toBe(sprite.costume);
  await stop(page);
  // The limit explains itself in the library.
  await openLibrary(page);await show(page,'costume');
  for(const name of ['D','E','F','G','H'])await add(page,name);
  await revealPanel(page,library(page));
  await clickVisible(page,card(page,'perro').getByRole('button',{name:'Nuevo objeto con «Perro»'}));
  await expect(page.locator('#starter-library-status')).toContainText('hasta 8');
  expect((await config(page)).sprites).toHaveLength(8);
});

test('MS-BROWSER-021: inspector and derived code follow the selected object',async({page})=>{
  await open(page);
  await openScene(page,{sprites:{hero:onStart('h-start',move('h-move',12))}});
  await add(page,'Cesta');
  const id=await mounted(page);
  await page.evaluate(state=>studioProbe.editor.load(state),{variables:[{name:'pasos',id:'c-pasos'}],...onStart('c-start',say('c-say','Hola'),{type:'variables_set',id:'c-set',fields:{VAR:{id:'c-pasos'}},inputs:{VALUE:{shadow:{type:'math_number',id:'c-n',fields:{NUM:3}}}}})});
  await clickVisible(page,page.locator('#tab-inspector'));
  const initial=page.locator('#inspector-initial');
  await expect(page.locator('#inspector-object option[value=hero]')).toHaveText('Cesta · Sprite');
  await expect(page.locator('#inspector-variables-heading')).toHaveText('Variables locales de Cesta');
  await expect(initial).toContainText('Cesta');
  await expect(initial).toContainText('Disfraz inicial');
  await expect(initial).not.toContainText('sprite-');
  await expect(initial).not.toContainText(id);
  await run(page);
  await expect(page.locator('#inspector-runtime')).toContainText('Cesta');
  await expect(page.locator('#inspector-variables')).toContainText('pasos: 3 · local de Cesta');
  await pick(page,'hero');
  await expect(page.locator('#inspector-object option[value=hero]')).toHaveText('hero · Sprite');
  await expect(page.locator('#inspector-runtime')).toContainText('12');
  await pick(page,'Escenario');
  await expect(page.locator('#inspector-object option[value=hero]')).toHaveText('Escenario · Fondo');
  // A backdrop reads as in its menu: «Fondo inicial» is the label and the name of the catalog's.
  await expect(initial).toHaveText('Sprites de autoría2Fondo inicialFondo inicial');
  await expect(page.locator('#inspector-runtime')).toContainText('no tiene posición');
  await stop(page);
  // Derived code: the selected object's, with its identifier.
  await pick(page,'Cesta');
  await clickVisible(page,page.locator('#tab-code'));
  const code=page.locator('#generated-code'),language=page.locator('#generated-language');
  await expect(page.locator('#generated-status')).toHaveText('Código de «Cesta» · actualizado desde tus bloques');
  await language.selectOption('javascript');
  await expect(code).toHaveValue(/cesta\.say\("Hola"\)/);
  await expect(code).not.toHaveValue(/hero/);
  await language.selectOption('python');
  await expect(code).toHaveValue(/cesta\.say\("Hola"\)/);
  // A rename reaches the listing without touching the blocks.
  await language.selectOption('javascript');
  await clickVisible(page,page.locator('#object-rename'));
  await nameForm(page,'Canasta');
  await clickVisible(page,page.locator('#tab-code'));
  await expect(code).toHaveValue(/canasta\.say\("Hola"\)/);
  await expect(page.locator('#generated-status')).toHaveText('Código de «Canasta» · actualizado desde tus bloques');
  await pick(page,'hero');
  await language.selectOption('javascript');
  await expect(code).toHaveValue(/hero\.move\(12\)/);
  await expect(page.locator('#generated-status')).toHaveText('Código de «hero» · actualizado desde tus bloques');
  expect((await snapshot(page)).threads).toBe(0);
  // The GG control moves hero, and says so among several objects.
  await expect(page.locator('#gg-move')).toHaveText('Mover hero +10');
  await removeSelected(page);
  await expect(option(page,'hero')).toHaveCount(0);
  await expect(page.locator('#gg-move')).toHaveText('Mover +10');
  await page.locator('#gg-move').evaluate(node=>node.click());
  await expect(page.locator('#gg-result')).toHaveText('Este control mueve a hero, y este proyecto ya no lo tiene.');
});

test('MS-BROWSER-022: a diagnostic link goes to its object, or says why it cannot',async({page})=>{
  await open(page);
  await openScene(page,{sprites:{hero:onStart('h-start',move('h-move',12))}});
  await add(page,'Cesta');
  await page.evaluate(()=>studioProbe.console.local({level:'error',code:'PRUEBA',origin:'generation',message:'Mensaje de prueba',sourceBlockId:'h-move'}));
  const link=page.getByRole('button',{name:'Ver bloque h-move',exact:true,includeHidden:true});
  await clickVisible(page,link);
  await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#console-selection')).toHaveText('Bloque seleccionado: h-move');
  await expect.poll(()=>page.evaluate(()=>studioProbe.editor.selectedSource())).toBe('h-move');
  await expect(link).toBeEnabled();
  // Text that does not convert keeps the object, and the link explains.
  await pick(page,'Cesta');
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  nada(\n});\n');
  await page.evaluate(()=>studioProbe.console.local({level:'error',code:'PRUEBA',origin:'generation',message:'Otro mensaje',sourceBlockId:'h-move'}));
  await clickVisible(page,page.getByRole('button',{name:'Ver bloque h-move',exact:true,includeHidden:true}).last());
  await expect(page.locator('#console-selection')).toContainText('Arregla el error del texto');
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#text-source')).toHaveValue(/nada\(/);
});

test('MS-BROWSER-023: an activity reads the scene and its object, whichever object is on screen',async({page})=>{
  await open(page);
  await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page,page.locator('#lessons-panel > summary'));
  await revealPanel(page,page.locator('#lesson-select'));await page.locator('#lesson-select').selectOption('story');
  await revealPanel(page,page.locator('#lesson-load'));await clickVisible(page,page.locator('#lesson-load'));
  await expect(page.locator('#lesson-status')).toContainText('Ejemplo cargado sin ejecutar');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await add(page,'Cesta');
  await pick(page,'hero');
  const field=page.locator('#blockly-editor [data-id="lesson-story-first-n"] .blocklyText');
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill('40');await page.locator('.blocklyHtmlInput').press('Enter');await expect(field).toHaveText('40');
  await run(page);
  await expect.poll(async()=>(await settled(snapshot,page)).sprites[0].x).toBe(60);
  // Selecting Cesta changes nothing the activity reads.
  await pick(page,'Cesta');
  const check=page.locator('#lesson-check');await revealPanel(page,check);await clickVisible(page,check);
  await expect(page.locator('#lesson-status')).toContainText('Comprobación completada');
  expect((await page.evaluate(()=>studioProbe.lessons.state())).results.every(step=>step.passed)).toBe(true);
});

test('MS-BROWSER-024: the document variables and the export read the scene, not the object on screen',async({page})=>{
  await open(page);
  const hero={variables:[{name:'pasos',id:'h-pasos'}],...onStart('h-start',{type:'variables_set',id:'h-set',fields:{VAR:{id:'h-pasos'}},inputs:{VALUE:{shadow:{type:'math_number',id:'h-n',fields:{NUM:2}}}}})};
  await openScene(page,{sprites:{hero}});
  // With the stage on screen hero's locals stay in its documents.
  await pick(page,'Escenario');
  await selectContext(page,'text');
  await page.evaluate(()=>studioProbe.textDocuments.add({language:'javascript',source:"await GG.scene.get();",name:'Documento anterior'}));
  await clickVisible(page,page.getByRole('button',{name:'Ejecutar documento 2D',exact:true}));
  await expect(page.locator('#status')).toHaveText(/Documento (terminado|activo · eventos disponibles)/,{timeout:60000});
  expect(Object.keys((await snapshot(page)).sprites.find(sprite=>sprite.id==='hero').variables)).toEqual(['h-pasos']);
  await selectContext(page,'2d');
  await pick(page,'Escenario');
  // The export is hero's program, also from the stage.
  await revealPanel(page,page.locator('#export-sb3'));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-sb3').click()]);
  const zip=await JSZip.loadAsync(await readFile(await download.path()));
  const exported=JSON.parse(await zip.file('project.json').async('string'));
  expect(Object.keys(exported.targets[1].blocks)).toContain('h-set');
  // Several objects: it says so and exports nothing.
  await add(page,'Cesta');
  await revealPanel(page,page.locator('#export-sb3'));
  await page.locator('#export-sb3').click();
  await expect(page.locator('#resources-error')).toContainText('un solo objeto');
  // A new document writes for the selected sprite; help speaks of it.
  await selectContext(page,'text');
  await clickVisible(page,page.locator('#new-javascript'));
  await expect(page.locator('#text-source')).toHaveValue(/cesta\.move\(10\)/);
  await expect(page.locator('#text-api-help')).toContainText('cesta.move(10)');
  await expect(page.locator('#text-api-help')).not.toContainText('hero');
});

test('MS-BROWSER-025: the name form keeps what was typed when refused, and never outlives its object or project',async({page})=>{
  await open(page);
  await expect(page.locator('#object-name-error')).toHaveAttribute('role','alert');
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  nada(\n});\n');
  await clickVisible(page,page.locator('#object-add'));
  const input=page.locator('#object-name');
  await input.fill('Mi Cesta');await input.press('Enter');
  await expect(status(page)).toContainText('El texto tiene un error');
  await expect(input).toBeVisible();await expect(input).toHaveValue('Mi Cesta');
  // Rename too, then the text is fixed and the same form succeeds.
  await page.locator('#text-source').fill('onStart(() => {\n  hero.move(4);\n});\n');
  await input.press('Enter');
  await expect(option(page,'Mi Cesta')).toHaveAttribute('aria-selected','true');
  await expect(input).toBeHidden();
  // Changing object from elsewhere closes the form.
  await mode(page,'blocks');
  await clickVisible(page,page.locator('#object-rename'));
  await expect(input).toBeVisible();
  await page.evaluate(()=>studioProbe.syncedViews.selectObject('hero'));
  await expect(input).toBeHidden();
  // So does another project, with the same object selected.
  await clickVisible(page,page.locator('#object-rename'));
  await expect(input).toBeVisible();
  await openScene(page,{sprites:{hero:{}}});
  await expect(input).toBeHidden();
  // Text typed after the panel applied it is the student's.
  await mode(page,'javascript');
  const typed='onStart(() => {\n  hero.move(99);\n});\n';
  await page.locator('#text-source').fill(typed);
  await page.evaluate(()=>studioProbe.syncedViews.refreshObjectText());
  await expect(page.locator('#text-source')).toHaveValue(typed);
});

test('MS-BROWSER-026: a tool that fails while checking the text is not called an error of the text, and offers to delete nothing',async({page})=>{
  await open(page);
  await add(page,'Cesta');
  await pick(page,'hero');
  await page.context().route('**/code-view-parser.bundle.mjs',route=>route.abort());
  await mode(page,'javascript');
  await page.locator('#text-source').fill('onStart(() => {\n  hero.move(4);\n});\n');
  // A sprite and the stage: both intact, the failure is the tool's.
  for(const target of ['Cesta','Escenario']){
    await option(page,target).click();
    await expect(status(page)).toContainText('No se pudo comprobar el texto para cambiar a «'+target+'»');
    await expect(status(page)).not.toContainText('El texto tiene un error');
    await expect(status(page)).not.toContainText('puedes borrarlo');
    await expect(page.locator('#object-delete-unopened')).toBeHidden();
    await expect(option(page,'hero')).toHaveAttribute('aria-selected','true');
  }
});

const unfinished=id=>onStart(id+'-start',{type:'controls_if',id:id+'-if'});
const sprite=(id,name,x=50)=>({id,name,x,y:0,direction:90,size:100,visible:true,costume:'hero'});
test('MS-BROWSER-029: unfinished work on the selected object blocks no panel edit, library addition or delete',async({page})=>{
  await open(page);
  const rota=onStart('r-start',{type:'gg_assets_set_costume',id:'r-costume',fields:{COSTUME:'fantasma'}});
  await openScene(page,{sprites:{hero:onStart('h-start',move('h-move',10)),rota,cesta:unfinished('c'),nube:{}},extra:[sprite('rota','Rota'),sprite('cesta','Cesta',-50),sprite('nube','Nube',80)]});
  await pick(page,'Cesta');
  // Add, rename, duplicate.
  await add(page,'Caja');
  await pick(page,'Cesta');
  await clickVisible(page,page.locator('#object-rename'));
  await nameForm(page,'Canasta');
  await expect(option(page,'Canasta')).toBeFocused();
  await expect(status(page)).toContainText('se llama ahora');
  // Duplicate needs a costume of its own, so it uses the added object.
  await pick(page,'Caja');
  await page.evaluate(state=>studioProbe.editor.load(state),unfinished('k'));
  await clickVisible(page,page.locator('#object-duplicate'));
  await expect(option(page,'Caja 2')).toHaveAttribute('aria-selected','true');
  await pick(page,'Canasta');
  // The library, with the unfinished object on screen.
  await openLibrary(page);await show(page,'sound');
  await clickVisible(page,card(page,'sonido-salto').getByRole('button',{name:'Añadir «Salto» a los sonidos'}));
  await expect(page.locator('#starter-library-status')).toContainText('sonidos de Canasta');
  await expect(page.locator('#resources-error')).toBeEmpty();
  // The stuck object goes, whatever is on screen.
  await option(page,'Rota').click();
  await expect(status(page)).toContainText('No se pudo abrir «Rota»');
  page.once('dialog',dialog=>void dialog.accept());
  await page.getByRole('button',{name:'Borrar «Rota»',exact:true}).click();
  await expect(option(page,'Rota')).toHaveCount(0);
  await expect(status(page)).toContainText('«Rota» se borró');
  await expect(option(page,'Canasta')).toHaveAttribute('aria-selected','true');
  // Deleting the neighbour of an unfinished object: selection moves there and the delete completes.
  await pick(page,'Nube');
  await pick(page,'hero');
  await removeSelected(page);
  await expect(option(page,'hero')).toHaveCount(0);
  await expect(status(page)).toContainText('«hero» se borró');
  await expect(option(page,'Canasta')).toHaveAttribute('aria-selected','true');
  expect(JSON.stringify(await page.evaluate(()=>studioProbe.editor.save()))).toContain('c-if');
  // Only Run asks to finish it.
  await clickVisible(page,page.locator('#run-editor'));
  await expect(blockErrors(page)).not.toHaveText('');
  expect((await snapshot(page)).threads).toBe(0);
});

test('MS-BROWSER-030: unfinished work reopens as it was, from the browser and from a file; a file with blocks outside its packs is refused',async({page})=>{
  await open(page);
  await openScene(page,{sprites:{hero:onStart('h-start',move('h-move',10)),cesta:unfinished('c')},extra:[sprite('cesta','Cesta')]});
  await pick(page,'Cesta');
  const before=await capture(page);
  expect(await page.evaluate(()=>studioProbe.project.flush().then(()=>true,()=>false))).toBe(true);
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  await open(page);
  expect(await mounted(page)).toBe('cesta');
  await expect(option(page,'Cesta')).toHaveAttribute('aria-selected','true');
  expect((await capture(page)).scene2d.sprites.cesta).toEqual(before.scene2d.sprites.cesta);
  expect((await capture(page)).scene2d.sprites.hero).toEqual(before.scene2d.sprites.hero);
  // The same through a file.
  const opened=await page.evaluate(async()=>{const text=await studioProbe.project.export();return studioProbe.project.open(text).then(()=>null,error=>error.message);});
  expect(opened).toBeNull();
  expect(await mounted(page)).toBe('cesta');
  // Import safety is the import's: blocks of a pack the file does not lock stay out, on any object.
  const refused=await page.evaluate(async()=>{
    const document=JSON.parse(await studioProbe.project.export());
    document.authoring.scene2d.sprites.hero.blocks.blocks.push({type:'gg_score_set',id:'ajeno',x:200,y:200});
    return studioProbe.project.open(JSON.stringify(document)).then(()=>null,error=>error.message);
  });
  expect(refused).toContain('gg_score_set');
  expect(await mounted(page)).toBe('cesta');
  expect((await capture(page)).scene2d.sprites.hero).toEqual(before.scene2d.sprites.hero);
});

const packs=page=>page.locator('#packs-list li').allTextContents();
async function openPacks(page){
  await revealPanel(page,page.locator('#capabilities-panel'));
  if(!await page.locator('#capabilities-panel').evaluate(node=>node.open))await clickVisible(page,page.locator('#capabilities-panel > summary'));
}
async function enableScore(page){
  await openPacks(page);
  await clickVisible(page,page.locator('#enable-score'));
  await expect.poll(async()=>(await packs(page)).some(item=>item.startsWith('gg.score'))).toBe(true);
  await expect(page.locator('#run-editor')).toBeEnabled();
}
const scoreBlock=id=>({type:'gg_score_set',id,inputs:{VALUE:{shadow:{type:'math_number',id:id+'-n',fields:{NUM:1}}}}});
const saves=page=>page.evaluate(()=>studioProbe.project.flush().then(()=>true,()=>false));
test('MS-BROWSER-031: a pack rollback that would strand blocks is refused with its reason, and the project keeps saving and editing',async({page})=>{
  await open(page);
  await add(page,'Cesta');
  await pick(page,'hero');
  await enableScore(page);
  await page.evaluate(state=>studioProbe.editor.load(state),onStart('h-start',scoreBlock('h-score')));
  await openPacks(page);
  const rollback=page.locator('#rollback-packs'),reason=page.locator('#packs-error');
  await clickVisible(page,rollback);
  await expect(reason).toContainText('«hero» aún usa bloques');
  await expect(reason).not.toContainText('Unsupported');
  expect((await packs(page)).some(item=>item.startsWith('gg.score'))).toBe(true);
  expect(await saves(page)).toBe(true);
  // With the object out of the editor it is the same.
  await pick(page,'Cesta');
  await openPacks(page);
  await page.locator('#packs-error').evaluate(node=>{node.textContent='';});
  await clickVisible(page,rollback);
  await expect(reason).toContainText('«hero» aún usa bloques');
  expect((await packs(page)).some(item=>item.startsWith('gg.score'))).toBe(true);
  expect(await saves(page)).toBe(true);
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  // A panel edit, a run of the same project and a reload all still work.
  await add(page,'Caja');
  await expect(status(page)).toContainText('«Caja» se añadió');
  await pick(page,'hero');
  await run(page);
  await stop(page);
  expect(await saves(page)).toBe(true);
  await open(page);
  expect(JSON.stringify((await capture(page)).scene2d.sprites.hero)).toContain('h-score');
  await expect(option(page,'Caja')).toBeVisible();
});

test('MS-BROWSER-032: a block of a pack the project lacks cannot come back by paste or undo; the history stays usable and the project keeps saving',async({page})=>{
  await open(page);
  await enableScore(page);
  await page.evaluate(state=>studioProbe.editor.load(state),onStart('h-start',scoreBlock('h-score'),move('h-move',5),move('h-extra',7)));
  const saved=async text=>JSON.stringify(await page.evaluate(()=>studioProbe.editor.save())).includes(text);
  const present=()=>saved('gg_score_set'),extra=()=>saved('h-extra');
  const history=async key=>{await page.evaluate(()=>studioProbe.editor.selectSource('h-move'));await page.keyboard.press(key);};
  const refused=async()=>{await expect(blockErrors(page)).toContainText('no está disponible en este proyecto');await expect.poll(present).toBe(false);await page.evaluate(()=>{document.querySelector('#editor-error').textContent='';});};
  // An earlier edit, which Undo must still reach later.
  await page.evaluate(()=>studioProbe.editor.selectSource('h-extra'));
  await page.keyboard.press('Delete');
  await expect.poll(extra).toBe(false);
  // The block is deleted and the pack goes, as the refusal of a rollback asks.
  await page.evaluate(()=>studioProbe.editor.selectSource('h-score'));
  await page.keyboard.press('Control+C');
  await page.keyboard.press('Delete');
  await expect.poll(present).toBe(false);
  await openPacks(page);
  await clickVisible(page,page.locator('#rollback-packs'));
  await expect.poll(async()=>(await packs(page)).some(item=>item.startsWith('gg.score'))).toBe(false);
  await expect(page.locator('#packs-error')).toHaveText('');
  await expect(page.locator('#run-editor')).toBeEnabled();
  // Undo: the first press reaches the foreign block, which goes again; the next one goes past it.
  await history('Control+Z');
  await refused();
  expect(await saves(page)).toBe(true);
  await history('Control+Z');
  await expect.poll(extra).toBe(true);
  expect(await present()).toBe(false);
  // Redo is not left empty.
  await history('Control+Y');
  await expect.poll(extra).toBe(false);
  // Paste, from the clipboard filled while the pack was there: undo walks past it, redo stays.
  await history('Control+V');
  await refused();
  expect(await saves(page)).toBe(true);
  await history('Control+Z');
  await page.waitForTimeout(100);
  expect(await present()).toBe(false);
  expect(await extra()).toBe(false);
  await history('Control+Z');
  await expect.poll(extra).toBe(true);
  await history('Control+Y');
  await expect.poll(extra).toBe(false);
  expect(await present()).toBe(false);
  await expect(blockErrors(page)).toHaveText('');
  expect(await saves(page)).toBe(true);
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  await add(page,'Cesta');
  await expect(status(page)).toContainText('«Cesta» se añadió');
  await pick(page,'hero');
  await run(page);
  await stop(page);
});

test('MS-BROWSER-013-LIMIT: the nine tiles of a full project leave at least 300 px of Blockly in sight at 1280×720',async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await open(page);
  if(await page.locator('#entry-panel').evaluate(node=>node.open))await page.locator('#entry-toggle').click();
  for(const name of ['Cesta','Pelota con un nombre bien largo','Robot','Nube','Gato','Quetzal','Volcán'])await add(page,name);
  await expect(page.locator('#objects-list [role=option]')).toHaveCount(9);
  await page.locator('#objects-panel').scrollIntoViewIfNeeded();
  const box=await page.evaluate(()=>{const rect=selector=>document.querySelector(selector).getBoundingClientRect();
    const editor=rect('#blockly-editor');
    return {scroll:document.scrollingElement.scrollWidth,viewport:innerWidth,editor:editor.height,visibleEditor:Math.min(innerHeight,editor.bottom)-Math.max(0,editor.top),panel:rect('#objects-panel').height,list:rect('#objects-list').height};});
  await page.screenshot({path:artifactPath('objects-nine-laptop.png')});
  await writeFile(artifactPath('objects-nine-laptop.json'),JSON.stringify(box,null,2));
  expect(box.scroll).toBeLessThanOrEqual(box.viewport);
  // In sight, not the element: min-height keeps the element at 300 px whatever is left.
  expect(box.visibleEditor,JSON.stringify(box)).toBeGreaterThanOrEqual(300);
  // One row of tiles that scrolls: the selected object stays in it.
  const row=await page.evaluate(()=>{const list=document.querySelector('#objects-list').getBoundingClientRect(),selected=document.querySelector('#objects-list [aria-selected=true]').getBoundingClientRect(),tops=new Set([...document.querySelectorAll('#objects-list [role=option]')].map(node=>Math.round(node.getBoundingClientRect().top)));return {rows:tops.size,left:selected.left-list.left,right:list.right-selected.right,scrolls:document.querySelector('#objects-list').scrollWidth>document.querySelector('#objects-list').clientWidth};});
  expect(row.rows).toBe(1);expect(row.scrolls).toBe(true);
  expect(row.left,JSON.stringify(row)).toBeGreaterThanOrEqual(-1);expect(row.right,JSON.stringify(row)).toBeGreaterThanOrEqual(-1);
});

const views=[['desktop',1440,900],['laptop',1280,720],['narrow',390,844],['zoom',320,568]];
for(const [label,width,height] of views)test('MS-BROWSER-027: resource menus, inspector and library fit '+label+' '+width+'×'+height,async({page})=>{
  await page.setViewportSize({width,height});
  await open(page);
  if(await page.locator('#entry-panel').evaluate(node=>node.open))await page.locator('#entry-toggle').click();
  await openScene(page,{sprites:{hero:onStart('h-start',{type:'gg_assets_set_costume',id:'h-costume',fields:{COSTUME:'hero-alt'}})}});
  await add(page,'Cesta');
  await pick(page,'hero');
  const overflow=()=>page.evaluate(()=>document.scrollingElement.scrollWidth<=innerWidth);
  // Menu of a block on screen.
  // At 320 px Blockly's zoom controls sit over the block: the menu is opened where it can be.
  if(label==='zoom')await page.evaluate(()=>studioProbe.editor.selectSource('h-costume'));
  else{
    await openMenu(page,'h-costume','hero-alt');
    await expect(page.locator('.blocklyDropDownDiv .blocklyMenuItem').first()).toBeVisible();
  }
  await page.screenshot({path:artifactPath('resource-menu-'+label+'.png')});
  await page.keyboard.press('Escape');
  await pick(page,'Cesta');
  await clickVisible(page,page.locator('#tab-inspector'));
  await expect(page.locator('#inspector-object option[value=hero]')).toHaveText('Cesta · Sprite');
  await page.locator('#inspector-heading').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifactPath('inspector-'+label+'.png')});
  expect(await overflow()).toBe(true);
  await openLibrary(page);await show(page,'costume');
  await card(page,'gato').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifactPath('library-'+label+'.png')});
  expect(await overflow()).toBe(true);
  const boxes=await card(page,'gato').locator('button:visible').evaluateAll(nodes=>nodes.map(node=>{const rect=node.getBoundingClientRect(),parent=node.closest('li').getBoundingClientRect();return {height:rect.height,inside:rect.left>=parent.left-1&&rect.right<=parent.right+1};}));
  expect(boxes).toHaveLength(2);
  for(const box of boxes){expect(box.height).toBeGreaterThanOrEqual(44);expect(box.inside).toBe(true);}
});
