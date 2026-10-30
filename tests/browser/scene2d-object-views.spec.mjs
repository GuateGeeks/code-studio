import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

// scene2d-multi-sprite tarea 2.2 (E2, 30/10/2026, R2): Bloques/JavaScript/Python
// show the selected object's program. Actions written for another object are
// rejected with cause and line; changing object with pending text applies it
// like returning to Blocks, and on rejection nothing changes. IDs, Undo and
// saved views stay per object, and an API3 copy runs on its own sprite. These
// tests call the hook the objects panel calls (scene2d-objects-panel covers the panel).
test.setTimeout(240000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const mounted=page=>page.evaluate(()=>studioProbe.authoring.mountedObject());
const selectObject=(page,id)=>page.evaluate(id=>studioProbe.syncedViews.selectObject(id).then(result=>result.ok),id);
const workspaces=page=>page.evaluate(()=>studioProbe.authoring.capture().scene2d);
async function mode(page,value){await clickVisible(page,page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
// hero and «Cesta» (with a copy of hero's resources), each with its own script.
async function openTwoSprites(page){
  await page.evaluate(async()=>{
    const app=path=>import(new URL('./app/'+path,location.href).href);
    const [{createProject},{createCapabilities},{promoteLegacyResources,copyResourceOwner}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs'),app('contracts/resources.mjs')]);
    const catalog=studioProbe.project.catalog();
    const {resources}=await copyResourceOwner(await promoteLegacyResources(catalog),'hero','cesta',{idPrefix:'cesta',firstCostumeId:'cesta'});
    const capabilities=createCapabilities(['gg.sprites','gg.assets']);
    capabilities.config['gg.sprites']={stage:{backdrop:'stage'},sprites:[
      {id:'hero',name:'hero',x:0,y:0,direction:90,size:100,visible:true,costume:'hero'},
      {id:'cesta',name:'Cesta',x:120,y:-40,direction:90,size:60,visible:true,costume:'cesta:c1'}]};
    const hero={blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'h-start',x:20,y:20,inputs:{DO:{block:{type:'gg_say',id:'h-say',fields:{MESSAGE:'Hola'}}}}}]}};
    const cesta={blocks:{languageVersion:0,blocks:[{type:'gg_when_clicked',id:'c-click',x:40,y:60,inputs:{DO:{block:{type:'gg_say',id:'c-say',fields:{MESSAGE:'Soy Cesta'}}}}}]}};
    const document=await createProject({name:'Dos objetos',scene2d:{stage:{},sprites:{hero,cesta}},deviceSource:'',catalog,capabilities,resources});
    await studioProbe.project.open(JSON.stringify(document));
  });
  await selectContext(page,'2d');await expect(page.locator('#run-editor')).toBeEnabled();
}

test('MS-BROWSER-003: views follow the selected object; another object\'s action is rejected; changing object applies the text',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);await openTwoSprites(page);
  const source=page.locator('#text-source');
  await mode(page,'javascript');
  await expect(source).toHaveValue(/hero\.say\("Hola"\);/);
  // An action of Cesta in hero's view: cause and line; Blocks is refused and nothing changes.
  const before=await workspaces(page);
  const foreign='onStart(() => {\n  hero.say("Hola");\n  cesta.move(10);\n});\n';
  await source.fill(foreign);
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));
  await expect(page.locator('#text-error')).toContainText('Línea 3');
  await expect(page.locator('#text-error')).toContainText('«Cesta»');
  await expect(page.locator('#program-mode input[value=javascript]')).toBeChecked();
  expect(await workspaces(page)).toEqual(before);
  // Changing object with that text: the selection stays, the text stays.
  expect(await selectObject(page,'cesta')).toBe(false);
  expect(await mounted(page)).toBe('hero');
  await expect(source).toHaveValue(foreign);
  await expect(page.locator('#text-error')).toContainText('Línea 3');
  // Valid pending text is applied like returning to Blocks, then the view follows the object.
  await source.fill((await source.inputValue()).replace('  cesta.move(10);\n','').replace('"Hola"','"Hola de nuevo"'));
  expect(await selectObject(page,'cesta')).toBe(true);
  expect(await mounted(page)).toBe('cesta');
  await expect(source).toHaveValue(/cesta\.onClick\(\(\) => \{\n {2}cesta\.say\("Soy Cesta"\);/);
  await expect(page.locator('#text-error')).toHaveText('');
  await expect(page.locator('#program-mode input[value=javascript]')).toBeChecked();
  const applied=await workspaces(page);
  expect(applied.sprites.hero.blocks.blocks[0].id).toBe('h-start');
  expect(applied.sprites.hero.blocks.blocks[0].inputs.DO.block).toMatchObject({id:'h-say',fields:{MESSAGE:'Hola de nuevo'}});
  expect(applied.sprites.cesta).toEqual(before.sprites.cesta);
  // Nothing ran.
  expect((await settled(snapshot,page)).threads).toBe(0);
  // Cesta's text converts on Cesta, with its IDs, and hero's action is now the foreign one.
  await source.fill((await source.inputValue()).replace('"Soy Cesta"','"Soy la cesta"'));
  await mode(page,'blocks');
  const edited=await workspaces(page);
  expect(edited.sprites.cesta.blocks.blocks[0].inputs.DO.block).toMatchObject({id:'c-say',fields:{MESSAGE:'Soy la cesta'}});
  expect(edited.sprites.cesta.blocks.blocks[0].id).toBe('c-click');
  // Undo belongs to the object: Cesta's conversion is undone on Cesta only.
  await clickVisible(page,page.locator('#code-view-undo'));
  await expect.poll(async()=>(await workspaces(page)).sprites.cesta.blocks.blocks[0].inputs.DO.block.fields.MESSAGE).toBe('Soy Cesta');
  expect((await workspaces(page)).sprites.hero.blocks.blocks[0].inputs.DO.block.fields.MESSAGE).toBe('Hola de nuevo');
  // Back on hero, its Undo point returned with it.
  expect(await selectObject(page,'hero')).toBe(true);
  await expect(page.locator('#code-view-undo')).toBeVisible();
  await clickVisible(page,page.locator('#code-view-undo'));
  await expect.poll(async()=>(await workspaces(page)).sprites.hero.blocks.blocks[0].inputs.DO.block.fields.MESSAGE).toBe('Hola');
  expect(errors).toEqual([]);
});

test('MS-BROWSER-004: per-object views persist, Python rejects the other object, and the stage has its own program',async({page})=>{
  await open(page);await openTwoSprites(page);
  const source=page.locator('#text-source');
  expect(await selectObject(page,'cesta')).toBe(true);
  await mode(page,'python');
  await expect(source).toHaveValue(/@cesta\.on_click\ndef al_hacer_clic\(\):\n {4}cesta\.say\("Soy Cesta"\)/);
  await source.fill('@cesta.on_click\ndef al_hacer_clic():\n    hero.say("Hola")\n');
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));
  await expect(page.locator('#text-error')).toContainText('Línea 3',{timeout:60000});
  await expect(page.locator('#text-error')).toContainText('«hero»');
  await source.fill('@cesta.on_click\ndef al_hacer_clic():\n    cesta.say("Hola")\n');
  await mode(page,'blocks');
  // Saved views name the object; reopening mounts it, runs nothing and keeps the scene program.
  const saved=await page.evaluate(()=>studioProbe.authoring.capture().codeViews);
  expect([saved.version,saved.objectId,Object.keys(saved.objects)]).toEqual([2,'cesta',[]]);
  await page.evaluate(()=>studioProbe.project.flush());
  await page.reload();await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(await mounted(page)).toBe('cesta');
  expect((await settled(snapshot,page)).threads).toBe(0);
  const program=await page.evaluate(()=>studioProbe.authoring.sceneProgram());
  expect(program.scripts.map(script=>[script.targetId,script.sourceBlockId])).toEqual([['hero','h-start'],['cesta','c-click']]);
  // The stage: its own view, no sprite actions.
  expect(await selectObject(page,'stage')).toBe(true);
  await mode(page,'javascript');
  await source.fill('onStart(() => {\n  stage.move(10);\n});\n');
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));
  await expect(page.locator('#text-error')).toContainText('Línea 2');
  await expect(page.locator('#text-error')).toContainText('escenario');
  await source.fill('stage.onClick(() => {\n  broadcastAndWait("saluda");\n});\n');
  await mode(page,'blocks');
  const scene=await page.evaluate(()=>studioProbe.authoring.sceneProgram());
  expect(scene.scripts.map(script=>[script.targetId,script.event])).toEqual([['stage','click'],['hero','start'],['cesta','click']]);
});

test('MS-BROWSER-006: a JavaScript copy of the project uses hero. and cesta. and each sprite does what it did with blocks',async({page})=>{
  await open(page);await openTwoSprites(page);
  // Blocks first: hero sends the message, Cesta answers and moves (scene as the reference).
  await page.evaluate(async()=>{
    const capture=studioProbe.authoring.capture();
    const hero={blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'h-start',x:20,y:20,inputs:{DO:{block:{type:'gg_say',id:'h-say',fields:{MESSAGE:'Hola'},next:{block:{type:'gg_broadcast_wait',id:'h-send',fields:{MESSAGE:'saluda'}}}}}}}]}};
    const cesta={blocks:{languageVersion:0,blocks:[{type:'gg_when_message',id:'c-hear',x:40,y:60,fields:{MESSAGE:'saluda'},inputs:{DO:{block:{type:'gg_set_x',id:'c-x',inputs:{X:{shadow:{type:'math_number',fields:{NUM:33}}}},next:{block:{type:'gg_say',id:'c-say',fields:{MESSAGE:'Soy Cesta'}}}}}}}]}};
    const app=path=>import(new URL('./app/'+path,location.href).href);
    const {createProject}=await app('project-format.mjs');
    const document=await createProject({name:'Dos objetos',scene2d:{stage:{},sprites:{hero,cesta}},deviceSource:'',catalog:studioProbe.project.catalog(),capabilities:capture.capabilities,resources:capture.resources});
    await studioProbe.project.open(JSON.stringify(document));
  });
  await selectContext(page,'2d');await expect(page.locator('#run-editor')).toBeEnabled();
  await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites?.find(sprite=>sprite.id==='cesta')?.x,{timeout:30000}).toBe(33);
  const state=value=>value.sprites.map(({id,x,y,direction,size,visible,costume,bubble})=>({id,x,y,direction,size,visible,costume,bubble}));
  const blocks=state(await snapshot(page));
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  // The copy: one document with every object's ID in its metadata.
  await clickVisible(page,page.locator('#copy-javascript'));
  await expect(page.locator('#authoring-context')).toHaveValue('text');
  const copy=(await page.evaluate(()=>studioProbe.textDocuments.capture())).textDocuments.at(-1);
  expect(copy.runtime).toMatchObject({api:'api3',targetIds:{stage:'stage',hero:'hero',cesta:'cesta'}});
  expect(copy.source).toMatch(/^hero\.onStart\(\(\) => \{\n {2}hero\.say\("Hola"\);/m);
  expect(copy.source).toMatch(/^cesta\.onMessage\("saluda", \(\) => \{\n {2}cesta\.setX\(33\);/m);
  await clickVisible(page,page.locator('#run-document'));
  await expect(page.locator('#status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
  await expect.poll(async()=>(await settled(snapshot,page)).sprites?.find(sprite=>sprite.id==='cesta')?.x,{timeout:30000}).toBe(33);
  await expect.poll(async()=>state(await settled(snapshot,page))).toEqual(blocks);
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
});

test('MS-BROWSER-005: an API3 copy of an object runs on that sprite with every sprite on stage; Detener stops it',async({page})=>{
  await open(page);await openTwoSprites(page);
  const source=page.locator('#text-source');
  expect(await selectObject(page,'cesta')).toBe(true);
  await mode(page,'javascript');
  const text='onStart(() => {\n  cesta.setX(33);\n  cesta.say("copia");\n});\n';
  await source.fill(text);
  await page.locator('#code-view-copy').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#authoring-context')).toHaveValue('text');
  await expect(source).toHaveValue(text);
  const documents=await page.evaluate(()=>studioProbe.textDocuments.capture());
  const copy=documents.textDocuments.at(-1);
  expect(copy.runtime).toMatchObject({api:'api3',targetIds:{cesta:'cesta'}});
  await clickVisible(page,page.locator('#run-document'));
  await expect(page.locator('#status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
  await expect.poll(async()=>(await settled(snapshot,page)).sprites?.find(sprite=>sprite.id==='cesta')?.x,{timeout:30000}).toBe(33);
  const ran=await snapshot(page);
  expect(ran.sprites.map(sprite=>[sprite.id,sprite.x])).toEqual([['hero',0],['cesta',33]]);
  expect(ran.sprites.find(sprite=>sprite.id==='cesta').bubble).toEqual({type:'say',text:'copia'});
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  // The translation rejects another object at its line, before anything runs.
  const foreign='onStart(() => {\n\n  hero.setX(1);\n});\n';
  await source.fill(foreign);
  await clickVisible(page,page.locator('#run-document'));
  await expect(page.locator('#text-error')).toContainText('«hero.setX»',{timeout:60000});
  await writeFile(artifactPath('scene2d-object-views.json'),JSON.stringify({copy,ran:ran.sprites},null,2));
});
