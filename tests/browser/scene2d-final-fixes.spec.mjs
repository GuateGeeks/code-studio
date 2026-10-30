import {test,expect} from '@playwright/test';
import {clickVisible,revealControl,selectContext,settled} from './workspace-controls.mjs';
test.setTimeout(120000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const capture=page=>page.evaluate(()=>studioProbe.authoring.capture());
async function open(page){await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());await expect(page.locator('#run-editor')).toBeEnabled();}
async function mode(page,value){await selectContext(page,'2d');await clickVisible(page,page.locator('#program-mode input[value='+value+']'));await expect(page.locator('#program-mode input[value='+value+']')).toBeChecked();}
async function packs(page){for(const id of ['offline-panel','capabilities-panel']){const panel=page.locator('#'+id);if(!await panel.evaluate(element=>element.open))await clickVisible(page,panel.locator(':scope > summary'));}}
async function pick(page,name){await selectContext(page,'2d');await page.getByRole('option',{name,exact:true}).click();await expect(page.getByRole('option',{name,exact:true})).toHaveAttribute('aria-selected','true');}
async function legacy(page,version){
  const result=await page.evaluate(async version=>{
    const app=p=>import(new URL('./app/'+p,location.href).href);
    const [{createProject},{createProjectArchive},{createTextDocument}]=await Promise.all([app('project-format.mjs'),app('project-archive.mjs'),app('text-documents.mjs')]);
    const catalog=studioProbe.project.catalog(),blockly=studioProbe.editor.save();
    const text=createTextDocument({language:'javascript',name:'Texto anterior',source:'await GG.sprite.move("hero", 3);'});
    const model=await createProject({name:'Guardado v'+version,blockly,deviceSource:'original\r\n',catalog,...(version===2?{textDocuments:[text],selectedTextDocumentId:text.id}:{})});
    return {version:model.version,model,bytes:Array.from(await createProjectArchive(model,{catalog}))};
  },version);
  expect(result.version).toBe(version);
  await page.locator('#open-project').setInputFiles({name:'real-v'+version+'.ggproj',mimeType:'application/zip',buffer:Buffer.from(result.bytes)});
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
  return result.model;
}
async function scene(page,{globals=0,locals=0,unfinished=false}={}){
  return page.evaluate(async({globals,locals,unfinished})=>{
    const app=p=>import(new URL('./app/'+p,location.href).href);
    const [{createProject},{createCapabilities},{promoteLegacyResources,copyResourceOwner}]=await Promise.all([app('project-format.mjs'),app('contracts/packs.mjs'),app('contracts/resources.mjs')]);
    const catalog=studioProbe.project.catalog();
    const {resources}=await copyResourceOwner(await promoteLegacyResources(catalog),'hero','cesta',{idPrefix:'cesta',firstCostumeId:'cesta'});
    const capabilities=createCapabilities(['gg.sprites','gg.assets']);
    capabilities.config['gg.sprites']={stage:{backdrop:'stage'},sprites:[
      {id:'hero',name:'Ana',x:0,y:0,direction:90,size:100,visible:true,costume:'hero'},
      {id:'cesta',name:'Cesta',x:100,y:50,direction:90,size:100,visible:true,costume:'cesta:c1'}]};
    const globalModels=Array.from({length:globals},(_,i)=>({id:'global-'+i,name:'global'+i,type:''}));
    const workspace=(prefix)=>({variables:[...globalModels,...Array.from({length:locals},(_,i)=>({id:prefix+'-local-'+i,name:'local'+i,type:''}))],
      blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:prefix+'-start',x:20,y:20,inputs:{DO:{block:locals
        ?{type:'math_change',id:prefix+'-change',fields:{VAR:{id:prefix+'-local-0'}},inputs:{DELTA:{shadow:{type:'math_number',id:prefix+'-number',fields:{NUM:7}}}}}
        :{type:'gg_move',id:prefix+'-move',inputs:{STEPS:{shadow:{type:'math_number',id:prefix+'-number',fields:{NUM:10}}}}}}}}]}});
    const hero=workspace('hero'),cesta=workspace('cesta');
    if(unfinished)cesta.blocks.blocks[0].inputs.DO.block={type:'controls_if',id:'cesta-unfinished'};
    const model=await createProject({name:'Regresiones',scene2d:{stage:{variables:globalModels},sprites:{hero,cesta}},deviceSource:'',catalog,capabilities,resources});
    await studioProbe.project.open(JSON.stringify(model));
    return model;
  },{globals,locals,unfinished});
}
async function editNumber(page,id,value){
  await selectContext(page,'2d');
  const field=page.locator('#blockly-editor [data-id="'+id+'"] .blocklyText');
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill(String(value));await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText(String(value));
}
async function undo(page,key){await page.locator('#blockly-editor .blocklyMainBackground').click({position:{x:350,y:180}});await page.keyboard.press(key);}
const number=page=>page.evaluate(()=>studioProbe.editor.save().blocks.blocks[0].inputs.DO.block.inputs.STEPS.shadow.fields.NUM);

test('MS-FINAL-HISTORY: explicit opens reset real Undo/Redo, same UUID included; transactions and failed commits preserve them',async({page})=>{
  await open(page);const a=await scene(page);const before=JSON.stringify(a);
  await editNumber(page,'hero-number',17);
  const b=structuredClone(a);b.project.id='22222222-2222-4222-8222-222222222222';b.authoring.scene2d.sprites.hero.blocks.blocks[0].inputs.DO.block.inputs.STEPS.shadow.fields.NUM=99;
  await page.evaluate(model=>studioProbe.project.open(JSON.stringify(model)),b);
  await undo(page,'Control+z');await undo(page,'Control+y');expect(await number(page)).toBe(99);
  await editNumber(page,'hero-number',23);
  await page.evaluate(text=>studioProbe.project.open(text),JSON.stringify(b));
  await undo(page,'Control+z');await undo(page,'Control+y');expect(await number(page)).toBe(99);
  await editNumber(page,'hero-number',29);
  await page.evaluate(async()=>{const model=await studioProbe.project.capture();await studioProbe.project.replaceAuthoring(async()=>model);});
  await undo(page,'Control+z');await expect.poll(()=>number(page)).toBe(99);
  await undo(page,'Control+y');await expect.poll(()=>number(page)).toBe(29);
  const message=await page.evaluate(async text=>{
    let fail=true;const off=studioProbe.authoring.subscribe(()=>{if(fail){fail=false;throw new Error('forced publication failure');}});
    try{await studioProbe.project.open(text);return '';}catch(error){return error.message;}finally{off();}
  },before);
  expect(message).toContain('forced publication failure');
  await undo(page,'Control+z');await expect.poll(()=>number(page)).toBe(99);
  expect((await settled(snapshot,page)).threads).toBe(0);
});

for(const version of [1,2])test('MS-FINAL-LEGACY: saved v'+version+' offers explicit migration and score keeps old vocabulary',async({page})=>{
  await open(page);const saved=await legacy(page,version);
  const openedSource=(await capture(page)).deviceSource;
  await packs(page);await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.1.0');
  await expect(page.locator('#objects-panel')).toBeHidden();
  await expect(page.locator('#update-packs')).toBeVisible();
  expect((await settled(snapshot,page)).threads).toBe(0);
  await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  expect((await capture(page)).scene2d.sprites.hero).toEqual(saved.authoring.blockly);
  expect((await capture(page)).textDocuments).toEqual(saved.authoring.textDocuments??[]);
  expect((await capture(page)).deviceSource).toBe(openedSource);
  expect((await settled(snapshot,page)).threads).toBe(0);
  await clickVisible(page,page.locator('#rollback-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.1.0');
  await revealControl(page,page.locator('#enable-score'));await clickVisible(page,page.locator('#enable-score'));
  await expect(page.locator('#packs-list')).toContainText('gg.score');
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.1.0');
  await expect(page.locator('#objects-panel')).toBeHidden();
});

for(const change of ['blocks','pending text'])test('MS-FINAL-ROLLBACK: '+change+' after migration is preserved and stays saved',async({page})=>{
  await open(page);await legacy(page,1);await packs(page);await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  if(change==='blocks')await editNumber(page,'editable-move-n',31);
  else{await mode(page,'javascript');await page.locator('#text-source').fill('onStart(() => {\n  hero.move(31);\n});\n');}
  const before=await capture(page),text=change==='pending text'?await page.locator('#text-source').inputValue():null;
  await packs(page);await clickVisible(page,page.locator('#rollback-packs'));
  await expect(page.locator('#packs-error')).toContainText('cambios');
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  expect((await capture(page)).scene2d).toEqual(before.scene2d);
  if(text!==null)await expect(page.locator('#text-source')).toHaveValue(text);
  await page.evaluate(()=>studioProbe.project.flush());
  await expect(page.locator('#project-status')).toHaveText('Guardado en este navegador');
});

test('MS-FINAL-BUDGET: real Run and synchronized JS/Python retain 16 globals plus a local per sprite',async({page})=>{
  await open(page);await scene(page,{globals:16,locals:1});
  for(const language of ['javascript','python']){
    await mode(page,language);
    const source=page.locator('#text-source'),text=await source.inputValue();
    await source.fill(text.replace(/local0 \+= \d+/,language==='javascript'?'local0 += 8':'local0 += 9'));
    await mode(page,'blocks');
    await expect(page.locator('#text-error')).toHaveText('');
    await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
    await expect.poll(async()=>(await settled(snapshot,page)).sprites.find(sprite=>sprite.id==='hero').variables['hero-local-0']?.value).toBe(language==='javascript'?8:9);
    await clickVisible(page,page.locator('#stop-result'));
  }
  await pick(page,'Cesta');await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites.find(sprite=>sprite.id==='cesta').variables['cesta-local-0']?.value).toBe(7);
});

for(const selected of ['Ana','Cesta'])test('MS-FINAL-INDEPENDENT: old API1 locals run with unfinished other object, selected '+selected,async({page})=>{
  await open(page);await scene(page,{locals:1,unfinished:true});
  await page.evaluate(()=>studioProbe.textDocuments.add({language:'javascript',name:'Anterior',source:'await GG.variables.set("hero-local-0",42);\nawait GG.sprite.move("hero",1);'}));
  await pick(page,selected);
  expect((await settled(snapshot,page)).threads).toBe(0);
  await selectContext(page,'text');await clickVisible(page,page.locator('#run-document'));
  await expect(page.locator('#status')).toHaveText('Documento terminado');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites.find(sprite=>sprite.id==='hero').variables['hero-local-0']?.value).toBe(42);
  expect(JSON.stringify((await capture(page)).scene2d.sprites.cesta)).toContain('cesta-unfinished');
});
test('MS-FINAL-LABELS: native and text controls name renamed hero, UUID sprite and clone, and activate the selected target',async({page})=>{
  await open(page);await scene(page);
  await page.evaluate(async()=>{
    const model=JSON.parse(await studioProbe.project.export()),id='sprite-11111111-1111-4111-8111-111111111111';
    model.capabilities.config['gg.sprites'].sprites[1].id=id;
    for(const kind of ['costumes','sounds'])for(const item of model.resources[kind])if(item.ownerId==='cesta')item.ownerId=id;
    const clicked=(prefix,amount)=>({type:'gg_when_clicked',id:prefix+'-click',x:20,y:150,inputs:{DO:{block:{type:'gg_move',id:prefix+'-move',inputs:{STEPS:{shadow:{type:'math_number',id:prefix+'-num',fields:{NUM:amount}}}}}}}});
    model.authoring.scene2d.sprites.hero={blocks:{languageVersion:0,blocks:[clicked('h',1)]}};
    delete model.authoring.scene2d.sprites.cesta;
    model.authoring.scene2d.sprites[id]={blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'c-start',x:20,y:20,inputs:{DO:{block:{type:'gg_create_clone',id:'c-clone'}}}},clicked('c',2)]}};
    await studioProbe.project.open(JSON.stringify(model));
  });
  const runner=page.frameLocator('#runner-slot iframe'),selector=runner.locator('#stage-target'),action=runner.locator('#activate-stage-target');
  for(const backend of ['blocks','text']){
    if(backend==='blocks'){await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');}
    else{
      await selectContext(page,'2d');await clickVisible(page,page.locator('#copy-javascript'));await expect(page.locator('#copy-status')).toContainText('creada');
      await selectContext(page,'text');await clickVisible(page,page.locator('#run-document'));await expect(page.locator('#status')).toHaveText('Documento activo · eventos disponibles');
    }
    await expect.poll(async()=>(await settled(snapshot,page)).targets.filter(target=>!target.isOriginal).length).toBe(1);
    await expect(selector.locator('option')).toHaveText(['Ana','Cesta','Cesta · clon 1']);
    for(const [label,steps]of [['Ana',1],['Cesta',2],['Cesta · clon 1',2]]){
      await selector.selectOption({label});
      const target=await selector.inputValue(),before=(await snapshot(page)).targets.find(item=>item.id===target).x;
      await expect(action).toHaveText('Activar '+label);await action.press('Enter');
      await expect(runner.locator('#stage-input-status')).toHaveText('Clic enviado a '+label+'.');
      await expect.poll(async()=>(await snapshot(page)).targets.find(item=>item.id===target).x).toBe(before+steps);
    }
    await clickVisible(page,page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
  }
});

test('MS-FINAL-COPY: an actual saved project copy follows the old target ID after rename and visible-name reuse',async({page})=>{
  await open(page);await scene(page);
  await page.evaluate(async()=>{
    const model=JSON.parse(await studioProbe.project.export());
    model.authoring.scene2d.sprites.hero={blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'copy-start',x:20,y:20,inputs:{DO:{block:{type:'gg_go_to_object',id:'copy-go',fields:{TARGET:'cesta'}}}}}]}};
    model.authoring.scene2d.sprites.cesta={};
    await studioProbe.project.open(JSON.stringify(model));
  });
  await clickVisible(page,page.locator('#copy-javascript'));await expect(page.locator('#copy-status')).toContainText('creada');
  await pick(page,'Cesta');await clickVisible(page,page.locator('#object-rename'));await page.locator('#object-name').fill('Canasta');await page.locator('#object-name').press('Enter');
  await expect(page.getByRole('option',{name:'Canasta',exact:true})).toHaveAttribute('aria-selected','true');
  await clickVisible(page,page.locator('#object-add'));await page.locator('#object-name').fill('Cesta');await page.locator('#object-name').press('Enter');
  await expect(page.getByRole('option',{name:'Cesta',exact:true})).toHaveAttribute('aria-selected','true');
  expect((await settled(snapshot,page)).threads).toBe(0);
  await selectContext(page,'text');await clickVisible(page,page.locator('#run-document'));await expect(page.locator('#status')).toHaveText('Documento activo · eventos disponibles');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites.find(sprite=>sprite.id==='hero').x).toBe(100);
});
for(const change of ['project name','sprite configuration'])test('MS-RESIDUAL-R1: '+change+' survives blocked pack rollback and save/reopen',async({page})=>{
  await open(page);await legacy(page,1);await packs(page);await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  if(change==='project name'){
    await page.locator('#project-name').fill('Mi historia nueva');
    await page.locator('#project-name').press('Tab');
  }else{
    // The version list renders during publication; rollback is offered only
    // once the update handler has stored its snapshot and comparison baseline.
    await expect(page.locator('#rollback-packs')).toBeVisible();
    await page.evaluate(async()=>{
      const model=await studioProbe.project.capture();
      Object.assign(model.capabilities.config['gg.sprites'].sprites[0],{name:'Protagonista',x:73});
      studioProbe.authoring.commit(studioProbe.authoring.prepare(model));
    });
  }
  const before=await page.evaluate(()=>studioProbe.project.capture());
  if(change==='sprite configuration'){
    expect(before.capabilities.config['gg.sprites'].sprites[0]).toMatchObject({name:'Protagonista',x:73});
  }
  await page.evaluate(()=>studioProbe.project.flush());
  await packs(page);await clickVisible(page,page.locator('#rollback-packs'));
  await expect(page.locator('#packs-error')).toContainText('cambios');
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  await page.evaluate(()=>studioProbe.project.flush());
  const saved=JSON.parse(await page.evaluate(()=>studioProbe.project.export()));
  expect(saved.project.name).toBe(before.project.name);
  expect(saved.capabilities.config['gg.sprites']).toEqual(before.capabilities.config['gg.sprites']);
  await page.evaluate(model=>studioProbe.project.open(JSON.stringify(model)),saved);
  expect((await page.evaluate(()=>studioProbe.project.capture())).capabilities).toEqual(saved.capabilities);
  await expect(page.locator('#project-name')).toHaveValue(saved.project.name);
  expect((await settled(snapshot,page)).threads).toBe(0);
});

for(const language of ['javascript','python'])for(const origin of ['live owned','reopened owned','inherited stage'])test('MS-RESIDUAL-R2: '+language+' '+origin+' global scope survives conversion and save/reopen',async({page})=>{
  await open(page);await scene(page);
  await page.evaluate(async origin=>{
    const model=JSON.parse(await studioProbe.project.export());
    model.capabilities.config['gg.sprites'].sprites=model.capabilities.config['gg.sprites'].sprites.slice(0,1);
    delete model.authoring.scene2d.sprites.cesta;
    for(const kind of ['costumes','sounds'])model.resources[kind]=model.resources[kind].filter(item=>item.ownerId!=='cesta');
    model.authoring.scene2d.sprites.hero={};
    if(origin==='inherited stage')model.authoring.scene2d.stage={variables:[{id:'puntos',name:'puntos',type:''}]};
    await studioProbe.project.open(JSON.stringify(model));
    const state={variables:[{id:'puntos',name:'puntos',type:''}],blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'owned-start',x:20,y:20,inputs:{DO:{block:{type:'gg_set_global',id:'owned-set',fields:{VAR:{id:'puntos'}},inputs:{VALUE:{shadow:{type:'math_number',id:'owned-num',fields:{NUM:1}}}}}}}}]}};
    studioProbe.editor.commit(studioProbe.editor.prepare(state,{capabilities:studioProbe.editor.captureCapabilities(),resourceView:studioProbe.editor.resourceView(),ownerId:'hero',globalIds:origin==='inherited stage'?['puntos']:[],lower:false}));
    if(origin==='reopened owned')await studioProbe.project.open(await studioProbe.project.export());
  },origin);
  expect((await page.evaluate(()=>studioProbe.authoring.sceneProgram())).variables.find(model=>model.id==='puntos').scope).toBe('global');
  await mode(page,language);
  await expect(page.locator('#text-source')).toHaveValue(/shared\(0\)/);
  await page.locator('#text-source').fill(language==='javascript'?'let puntos = shared(0);\nonStart(() => {});\n':'puntos = shared(0)\n@on_start\ndef go():\n    pass\n');
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));
  if(origin==='inherited stage'){
    await expect(page.locator('#program-mode input[value=blocks]')).toBeChecked();
    await expect(page.locator('#text-error')).toHaveText('');
  }else{
    await expect(page.locator('#text-error')).toContainText('asignación global');
    await expect(page.locator('#program-mode input[value='+language+']')).toBeChecked();
    expect(JSON.stringify((await capture(page)).scene2d.sprites.hero)).toContain('gg_set_global');
  }
  await page.evaluate(()=>studioProbe.project.flush());
  const saved=await page.evaluate(()=>studioProbe.project.export());
  await page.evaluate(text=>studioProbe.project.open(text),saved);
  const ir=await page.evaluate(()=>studioProbe.authoring.sceneProgram());
  expect(ir.variables.find(model=>model.id==='puntos').scope).toBe('global');
  expect((await settled(snapshot,page)).threads).toBe(0);
});

for(const api of ['api1','api3','api1 owner local'])for(const selected of ['Ana','Cesta'])test('MS-RESIDUAL-R3: '+api+' runs independently of 17 draft locals, selected '+selected,async({page})=>{
  await open(page);await scene(page,{locals:1});
  await page.evaluate(async api=>{
    const model=JSON.parse(await studioProbe.project.export());
    model.authoring.scene2d.sprites.cesta={variables:Array.from({length:17},(_,i)=>({id:'draft-'+i,name:'draft'+i,type:''}))};
    await studioProbe.project.open(JSON.stringify(model));
    studioProbe.textDocuments.add({language:'javascript',name:'Independiente',...(api==='api3'?{api:'api3',targetIds:{ana:'hero'}}:{}),
      source:api==='api3'?'onStart(() => { ana.move(1); });':(api==='api1 owner local'?'await GG.variables.set("hero-local-0",42);\n':'')+'await GG.sprite.move("hero",1);'});
  },api);
  await pick(page,selected);expect((await settled(snapshot,page)).threads).toBe(0);
  await selectContext(page,'text');await clickVisible(page,page.locator('#run-document'));
  await expect(page.locator('#status')).toHaveText(api==='api3'?'Documento activo · eventos disponibles':'Documento terminado');
  await expect.poll(async()=>(await settled(snapshot,page)).sprites.find(sprite=>sprite.id==='hero').x).toBe(1);
  if(api==='api1 owner local')expect((await settled(snapshot,page)).sprites.find(sprite=>sprite.id==='hero').variables['hero-local-0'].value).toBe(42);
  await clickVisible(page,page.locator('#stop-result'));await selectContext(page,'2d');
  await clickVisible(page,page.locator('#run-editor'));
  await expect(page.locator('#editor-error')).toContainText('variable limit');
  expect((await capture(page)).scene2d.sprites.cesta.variables).toHaveLength(17);
});

test('MS-RESIDUAL-R1: autosave bookkeeping alone permits immediate pack rollback',async({page})=>{
  await open(page);await legacy(page,1);await packs(page);await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  await page.evaluate(async()=>{await studioProbe.project.flush();await studioProbe.project.flush();});
  await clickVisible(page,page.locator('#rollback-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.1.0');
  await expect(page.locator('#packs-error')).toHaveText('');
  expect((await settled(snapshot,page)).threads).toBe(0);
});

test('MS-RESIDUAL-R1: UI sprite rename invalidates rollback and stays saved after reopen',async({page})=>{
  await open(page);await legacy(page,1);await packs(page);await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  await selectContext(page,'2d');await clickVisible(page,page.locator('#object-rename'));
  await page.locator('#object-name').fill('Protagonista');await page.locator('#object-name').press('Enter');
  await expect(page.getByRole('option',{name:'Protagonista',exact:true})).toHaveAttribute('aria-selected','true');
  await packs(page);await expect(page.locator('#rollback-packs')).toBeHidden();
  await page.evaluate(()=>studioProbe.project.flush());
  const saved=await page.evaluate(()=>studioProbe.project.export());
  expect(JSON.parse(saved).capabilities.config['gg.sprites'].sprites[0].name).toBe('Protagonista');
  await page.evaluate(text=>studioProbe.project.open(text),saved);
  expect((await capture(page)).capabilities.config['gg.sprites'].sprites[0].name).toBe('Protagonista');
  expect((await settled(snapshot,page)).threads).toBe(0);
});
