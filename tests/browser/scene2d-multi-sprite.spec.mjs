import {test,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

// scene2d-multi-sprite tarea 2.1 (E2, 29/10/2026): a gg.sprites@0.3.0 project
// with hero, «Cesta» and stage scripts runs in the real studio as one VM
// target per sprite. Opening runs nothing; the initial scene follows the
// configuration; hero and Cesta talk through a message and share a global
// variable with the stage; the scene reading lists both sprites; Stop (in the
// VM and the studio's Detener) stops every object.
test.setTimeout(240000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const shape=sprite=>(({id,name,x,y,direction,size,visible,costume})=>({id,name,x,y,direction,size,visible,costume}))(sprite);
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
// Built in the page with the studio's own modules: two sprites (Cesta with a
// copy of hero's resources) and a script on every object.
async function openDialogue(page){
  await page.evaluate(async()=>{
    const app=path=>import(new URL('./app/'+path,location.href).href);
    const [{createProject},{createCapabilities},{promoteLegacyResources,copyResourceOwner}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs'),app('contracts/resources.mjs')]);
    const catalog=studioProbe.project.catalog();
    const {resources}=await copyResourceOwner(await promoteLegacyResources(catalog),'hero','cesta',{idPrefix:'cesta',firstCostumeId:'cesta'});
    const capabilities=createCapabilities(['gg.sprites','gg.assets']);
    capabilities.config['gg.sprites']={stage:{backdrop:'stage'},sprites:[
      {id:'hero',name:'hero',x:0,y:0,direction:90,size:100,visible:true,costume:'hero'},
      {id:'cesta',name:'Cesta',x:120,y:-40,direction:-90,size:60,visible:false,costume:'cesta:c1'}]};
    const number=(name,value)=>({[name]:{shadow:{type:'math_number',fields:{NUM:value}}}});
    const say=(id,text,next)=>({type:'gg_say',id,fields:{MESSAGE:text},...(next?{next:{block:next}}:{})});
    const change=(id,variable,value,next)=>({type:'math_change',id,fields:{VAR:{id:variable}},inputs:number('DELTA',value),...(next?{next:{block:next}}:{})});
    const variables=[{name:'turnos',id:'turnos'},{name:'ticks',id:'ticks'}];
    const workspace=blocks=>({variables,blocks:{languageVersion:0,blocks}});
    const hero=workspace([{type:'gg_when_start',id:'h-start',x:20,y:20,inputs:{DO:{block:say('h-say','Hola, Cesta',
      {type:'gg_set_global',id:'h-reset',fields:{VAR:{id:'turnos'}},inputs:number('VALUE',0),next:{block:
      {type:'gg_broadcast_wait',id:'h-send',fields:{MESSAGE:'saluda'},next:{block:change('h-turn','turnos',1,say('h-done','Listo'))}}}})}}}]);
    const cesta=workspace([
      {type:'gg_when_message',id:'c-hear',x:20,y:20,fields:{MESSAGE:'saluda'},inputs:{DO:{block:{type:'gg_show',id:'c-show',next:{block:
        {type:'gg_change_x',id:'c-step',inputs:number('DX',-50),next:{block:change('c-turn','turnos',10,say('c-say','¡Hola, hero!'))}}}}}}},
      {type:'gg_when_start',id:'c-start',x:20,y:200,inputs:{DO:{block:{type:'gg_forever',id:'c-loop',inputs:{DO:{block:{type:'gg_turn_right',id:'c-spin',inputs:number('DEGREES',5)}}}}}}}]);
    const stage=workspace([
      {type:'gg_when_message',id:'s-hear',x:20,y:20,fields:{MESSAGE:'saluda'},inputs:{DO:{block:change('s-turn','turnos',100)}}},
      {type:'gg_when_start',id:'s-start',x:20,y:200,inputs:{DO:{block:{type:'gg_set_global',id:'s-reset',fields:{VAR:{id:'ticks'}},inputs:number('VALUE',0),next:{block:
        {type:'gg_forever',id:'s-loop',inputs:{DO:{block:change('s-tick','ticks',1)}}}}}}}}]);
    const document=await createProject({name:'Diálogo',scene2d:{stage,sprites:{hero,cesta}},deviceSource:'',catalog,capabilities,resources});
    await studioProbe.project.open(JSON.stringify(document));
  });
  await selectContext(page,'2d');await expect(page.locator('#run-editor')).toBeEnabled();
}

test('MS-BROWSER-001: two sprites and the stage run as separate objects, talk through a message, share a global and stop together',async({page})=>{
  await open(page);await openDialogue(page);
  // Opening runs nothing.
  expect((await settled(snapshot,page)).threads).toBe(0);
  const program=await page.evaluate(()=>studioProbe.authoring.sceneProgram());
  expect(program.version).toBe(1);
  expect(program.sprites).toEqual(['hero','cesta']);
  expect(program.scripts.map(script=>[script.targetId,script.sourceBlockId])).toEqual([['stage','s-hear'],['stage','s-start'],['hero','h-start'],['cesta','c-hear'],['cesta','c-start']]);
  // Loading the scene at the simulator boundary (no start): the configured initial state of every sprite, and nothing running.
  const loaded=await page.evaluate(ir=>studioProbe.request('load-program',{ir,capabilities:studioProbe.authoring.captureExecutionCapabilities('scratch-2d'),resources:studioProbe.resourceStore.captureContext('scratch-2d')}),program);
  expect(loaded.threads).toBe(0);
  expect(loaded.sprites.map(shape)).toEqual([
    {id:'hero',name:'hero',x:0,y:0,direction:90,size:100,visible:true,costume:'hero'},
    {id:'cesta',name:'Cesta',x:120,y:-40,direction:-90,size:60,visible:false,costume:'cesta:c1'}]);
  expect(loaded.targets.filter(target=>target.isOriginal).map(target=>target.name)).toEqual(['hero','cesta']);
  // Run with the studio's own button: the message reaches Cesta and the stage; the global is shared.
  await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).hero?.bubble?.text,{timeout:30000}).toBe('Listo');
  const ran=await snapshot(page);
  const cesta=ran.sprites.find(sprite=>sprite.id==='cesta');
  expect([cesta.x,cesta.y,cesta.visible,cesta.bubble]).toEqual([70,-40,true,{type:'say',text:'¡Hola, hero!'}]);
  expect(ran.globalVariables.turnos.value).toBe(111);
  expect(ran.threads).toBeGreaterThan(0);
  // The scene reading lists both sprites with their visible names.
  const reading=await page.evaluate(()=>studioProbe.inspector.refresh());
  expect(reading.status).toBe('ready');
  expect(reading.snapshot.sprites.map(sprite=>[sprite.id,sprite.name,sprite.x])).toEqual([['hero','hero',0],['cesta','Cesta',70]]);
  const rendered=await page.evaluate(()=>{const select=document.querySelector('#inspector-object');select.value='scene';select.dispatchEvent(new Event('change'));
    return [...document.querySelectorAll('#inspector-runtime dt')].map(term=>term.textContent+'='+term.nextElementSibling.textContent);});
  expect(rendered).toEqual(['Sprites consultados=2','Sprite=hero','x de hero=0','y de hero=0','Sprite=Cesta','x de Cesta=70','y de Cesta=-40','Variables locales de los sprites=0']);
  // Stop in the VM stops every object: cesta's loop and the stage's loop freeze.
  const stopped=await page.evaluate(()=>studioProbe.request('stop-scene'));
  expect(stopped.threads).toBe(0);
  await page.waitForTimeout(300);
  const later=await snapshot(page);
  expect(later.threads).toBe(0);
  expect(later.globalVariables.ticks.value).toBe(stopped.globalVariables.ticks.value);
  expect(later.sprites.find(sprite=>sprite.id==='cesta').direction).toBe(stopped.sprites.find(sprite=>sprite.id==='cesta').direction);
  // The studio's single Detener stops everything as well; authoring is kept.
  await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).threads,{timeout:30000}).toBeGreaterThan(0);
  await clickVisible(page,page.locator('#stop-result'));
  await expect.poll(async()=>(await settled(snapshot,page)).threads).toBe(0);
  expect(await page.evaluate(()=>studioProbe.authoring.sceneProgram())).toEqual(program);
  await writeFile(artifactPath('scene2d-multi-sprite.json'),JSON.stringify({program,loaded:loaded.sprites,ran:ran.sprites,globals:ran.globalVariables,reading:reading.snapshot},null,2));
});

test('MS-BROWSER-002: a hero-only 0.3.0 project runs through the objects path exactly like its 0.2.0 copy',async({page})=>{
  await open(page);
  const bounce={blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'b-start',x:20,y:20,inputs:{DO:{block:{type:'gg_say',id:'b-say',fields:{MESSAGE:'¡Listo!'},
    next:{block:{type:'gg_change_x',id:'b-step',inputs:{DX:{shadow:{type:'math_number',fields:{NUM:30}}}},next:{block:{type:'gg_next_costume',id:'b-costume'}}}}}}}}]}};
  const results={};
  for(const version of ['0.2.0','0.3.0']){
    await page.evaluate(async({version,bounce})=>{
      const app=path=>import(new URL('./app/'+path,location.href).href);
      const [{createProject},{createCapabilities}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs')]);
      const document=await createProject({name:'Rebote '+version,blockly:bounce,deviceSource:'',catalog:studioProbe.project.catalog(),capabilities:createCapabilities(['gg.sprites'],{versions:{'gg.sprites':version}})});
      await studioProbe.project.open(JSON.stringify(document));
    },{version,bounce});
    await selectContext(page,'2d');
    const ir=await page.evaluate(()=>studioProbe.authoring.sceneProgram());
    expect(ir.version).toBe(version==='0.3.0'?1:0);
    await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
    await expect.poll(async()=>(await settled(snapshot,page)).threads,{timeout:30000}).toBe(0);
    const state=await snapshot(page);
    results[version]={hero:state.hero,sprites:state.sprites.map(shape)};
  }
  expect(results['0.3.0']).toEqual(results['0.2.0']);
  expect(results['0.3.0'].hero).toEqual({x:30,y:0,direction:90,size:100,visible:true,costume:'hero-alt',bubble:{type:'say',text:'¡Listo!'}});
});
