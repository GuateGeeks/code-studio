import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {clickVisible,selectContext,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

// scene2d-vocabulary-v2, tanda E1: the single-sprite vocabulary of
// gg.sprites@0.2.0 in the real studio — toolbox, Scratch effect, equivalence
// of blocks/JavaScript/Python, synced views keeping IDs, persistence, Stop
// and the explicit pack update from 0.1.0.
test.setTimeout(240000);
const hero=JSON.parse(readFileSync(resolve(import.meta.dirname,'../fixtures/canonical/scene2d/hero-presents/project.json'),'utf8'));
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const authoring=page=>page.evaluate(()=>studioProbe.editor.save());
const stable=state=>({size:state.hero.size,costume:state.hero.costume,visible:state.hero.visible,bubble:state.hero.bubble});
const finalState={size:120,costume:'hero-alt',visible:true,bubble:{type:'say',text:'¡Mira cómo reboto!'}};
async function open(page){
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
}
async function starter(page,project){
  await page.evaluate(starter=>studioProbe.project.loadStarter(starter),{name:project.name,packIds:project.packIds,blockly:project.blockly});
  await selectContext(page,'2d');await expect(page.locator('#run-editor')).toBeEnabled();
}
async function runBlocks(page){await selectContext(page,'2d');await clickVisible(page,page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');}
async function mode(page,value){await clickVisible(page,page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
async function runCopy(page,language){
  await selectContext(page,'2d');await clickVisible(page,page.locator('#copy-'+language));await expect(page.locator('#copy-status')).toContainText('creada');
  const source=await page.locator('#text-source').inputValue();
  await selectContext(page,'text');await clickVisible(page,page.getByRole('button',{name:'Ejecutar documento 2D',exact:true}));
  await expect(page.locator('#text-run-status')).toHaveText('Documento activo · eventos disponibles',{timeout:60000});
  return source;
}
async function stopResult(page){await clickVisible(page,page.locator('#stop-result'));await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(0);}
async function toolboxText(page,category){
  await selectContext(page,'2d');
  // The category row (not its label span) receives the pointer.
  const row=page.locator('#blockly-editor .blocklyToolboxCategory').filter({has:page.locator('.blocklyToolboxCategoryLabel',{hasText:new RegExp('^'+category+'$')})});
  await clickVisible(page,row.first());
  const flyout=page.locator('#blockly-editor .blocklyToolboxFlyout, #blockly-editor .blocklyFlyout').filter({has:page.locator('.blocklyDraggable')}).first();
  await expect(flyout).toBeVisible({timeout:15000});
  return (await flyout.locator('.blocklyText').allTextContents()).join(' ').replace(/ /g,' ');
}
// One deterministic program for traces: no glide or timers, only frames.
const bounce={name:'E1 · rebote',packIds:['gg.sprites'],blockly:{blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:'bounce-start',x:20,y:20,inputs:{DO:{block:
  {type:'gg_go_to',id:'bounce-home',inputs:{X:{shadow:{type:'math_number',id:'bounce-home-x',fields:{NUM:0}}},Y:{shadow:{type:'math_number',id:'bounce-home-y',fields:{NUM:0}}}},next:{block:
  {type:'gg_point_direction',id:'bounce-aim',inputs:{DIRECTION:{shadow:{type:'math_number',id:'bounce-aim-n',fields:{NUM:90}}}},next:{block:
  {type:'gg_forever',id:'bounce-loop',inputs:{DO:{block:{type:'gg_move',id:'bounce-step',inputs:{STEPS:{shadow:{type:'math_number',id:'bounce-step-n',fields:{NUM:25}}}},
    next:{block:{type:'gg_bounce',id:'bounce-edge'}}}}}}}}}}}}}]}}};
async function trace(page,length=40){
  await expect.poll(async()=>(await settled(snapshot,page)).moves.length,{timeout:30000}).toBeGreaterThanOrEqual(length);
  return (await snapshot(page)).moves.slice(0,length);
}

test('E1-01: the 0.2.0 toolbox offers every E1 block from its menus; a legacy project keeps the 0.1.0 toolbox',async({page})=>{
  await open(page);
  // R1 (29/10/2026): the unsaved initial project is already at the latest (0.2.0 or later); the legacy
  // toolbox is the one of a saved GGPROJ v1 (no capabilities).
  expect(await toolboxText(page,'Control')).toContain('por siempre');
  await page.evaluate(async()=>{
    const {createProject}=await import(new URL('./app/project-format.mjs',location.href).href);
    await studioProbe.project.open(JSON.stringify(await createProject({name:'Guardado v1',blockly:studioProbe.editor.save(),deviceSource:'basic.showNumber(1)',catalog:studioProbe.project.catalog()})));
  });
  expect(await page.evaluate(()=>studioProbe.project.capabilities())).toBeNull();
  const legacy=await toolboxText(page,'Control');
  expect(legacy).not.toContain('por siempre');
  await starter(page,hero);
  const motion=await toolboxText(page,'Movimiento'),looks=await toolboxText(page,'Apariencia'),control=await toolboxText(page,'Control');
  for(const text of ['girar ↻','girar ↺','ir a x:','deslizar en','apuntar en dirección','cambiar x por','fijar x a','cambiar y por','fijar y a','rebotar si toca un borde'])expect(motion).toContain(text);
  for(const text of ['decir','durante','pensar','siguiente disfraz','cambiar tamaño por','fijar tamaño a','mostrar','esconder'])expect(looks).toContain(text);
  for(const text of ['por siempre','esperar hasta que','repetir hasta que','detener todo','detener este programa'])expect(control).toContain(text);
  expect((await page.evaluate(()=>studioProbe.project.capabilities())).locks.find(lock=>lock.id==='gg.sprites').version).toBe('0.3.0'); // E2: the latest (0.3.0) keeps the whole E1 vocabulary
  await writeFile(artifactPath('e1-toolbox.json'),JSON.stringify({legacy,motion,looks,control},null,2));
});

test('E1-02: «Hero se presenta» behaves the same as blocks, JavaScript copy and Python copy, and Stop restores it',async({page})=>{
  await open(page);await starter(page,hero);
  expect((await snapshot(page)).hero).toEqual({x:0,y:0,direction:90,size:100,visible:true,costume:'hero',bubble:null});
  await runBlocks(page);
  await expect.poll(async()=>stable(await settled(snapshot,page)),{timeout:30000}).toEqual(finalState);
  await expect.poll(async()=>(await settled(snapshot,page)).hero.bubble?.text,{timeout:10000}).toBe('¡Mira cómo reboto!');
  const evidence={blocks:stable(await snapshot(page))};
  await stopResult(page);expect((await snapshot(page)).hero).toEqual({x:0,y:0,direction:90,size:100,visible:true,costume:'hero',bubble:null});
  for(const language of ['javascript','python']){
    const source=await runCopy(page,language);
    expect(source).toMatch(language==='javascript'?/while \(true\) \{\n\s+hero\.move\(10\);\n\s+hero\.bounceOnEdge\(\);/:/while True:\n\s+hero\.move\(10\)\n\s+hero\.bounce_on_edge\(\)/);
    await expect.poll(async()=>stable(await settled(snapshot,page)),{timeout:30000}).toEqual(finalState);
    evidence[language]={source,state:stable(await snapshot(page))};
    await selectContext(page,'text');await clickVisible(page,page.getByRole('button',{name:'Detener',exact:true}));
    await expect.poll(async()=>(await settled(snapshot,page)).hero).toEqual({x:0,y:0,direction:90,size:100,visible:true,costume:'hero',bubble:null});
  }
  await writeFile(artifactPath('e1-hero-presents.json'),JSON.stringify(evidence,null,2));
});

test('E1-03: «por siempre» with «rebotar» leaves the same position trace as blocks, JavaScript and Python; Detener ends it',async({page})=>{
  await open(page);await starter(page,bounce);
  await runBlocks(page);const blocks=await trace(page);
  expect(Math.max(...blocks)).toBeGreaterThan(150);expect(blocks.some((x,i)=>i>0&&x<blocks[i-1]),'the sprite bounced back').toBe(true);
  await stopResult(page);
  const traces={blocks};
  for(const language of ['javascript','python']){
    await runCopy(page,language);traces[language]=await trace(page);
    expect(traces[language],language).toEqual(blocks);
    await selectContext(page,'text');await clickVisible(page,page.getByRole('button',{name:'Detener',exact:true}));
    await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(0);
    const stopped=await snapshot(page);await page.waitForTimeout(400);
    expect((await snapshot(page)).moves.length,language+': nothing moves after Detener').toBe(stopped.moves.length);
  }
  await writeFile(artifactPath('e1-bounce-traces.json'),JSON.stringify(traces,null,2));
});

test('E1-04: JavaScript and Python views edit E1 blocks keeping IDs, then save, reopen and run without autorun',async({page})=>{
  await open(page);await starter(page,hero);
  const before=await authoring(page);
  const ids=state=>{const out=[];const visit=block=>{if(!block)return;out.push(block.id);for(const input of Object.values(block.inputs??{})){visit(input.shadow);visit(input.block);}visit(block.next?.block);};state.blocks.blocks.forEach(visit);return out.sort();};
  await mode(page,'javascript');const source=page.locator('#text-source');
  await expect(source).toHaveValue(/hero\.glide\(1, 100, 0\);/);await expect(source).toHaveValue(/while \(true\) \{/);
  await source.fill((await source.inputValue()).replace('hero.glide(1, 100, 0);','hero.glide(1, 120, 0);').replace('hero.say("¡Mira cómo reboto!");','hero.say("¡Reboto!");'));
  await mode(page,'blocks');
  const afterJs=await authoring(page);expect(ids(afterJs)).toEqual(ids(before));
  expect(JSON.stringify(afterJs)).toContain('"id":"hero-glide-x","fields":{"NUM":120}');expect(JSON.stringify(afterJs)).toContain('¡Reboto!');
  expect((await snapshot(page)).hero.x??0).toBe(0);
  await mode(page,'python');await expect(source).toHaveValue(/while True:/,{timeout:60000});
  await source.fill((await source.inputValue()).replace('hero.change_size(20)','hero.change_size(30)'));
  await mode(page,'blocks');const afterPy=await authoring(page);expect(ids(afterPy)).toEqual(ids(before));
  expect(JSON.stringify(afterPy)).toContain('"id":"hero-grow-delta","fields":{"NUM":30}');
  // A free while has no block: rejected with its line, blocks untouched.
  await mode(page,'javascript');await source.fill((await source.inputValue()).replace('while (true) {','while (2 < 3) {'));
  await clickVisible(page,page.locator('#program-mode input[value=blocks]'));await expect(page.locator('#text-error')).toContainText('Línea');
  await expect(page.locator('#text-error')).toContainText('while (true)');
  expect(await authoring(page)).toEqual(afterPy);
  page.once('dialog',dialog=>dialog.accept());await clickVisible(page,page.locator('#code-view-restore'));await expect(page.locator('#program-mode input[value=blocks]')).toBeChecked();
  await page.evaluate(()=>studioProbe.project.flush());await page.reload();await page.waitForFunction(()=>!!window.studioProbe?.project);await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  expect(await authoring(page)).toEqual(afterPy);
  expect((await page.evaluate(()=>studioProbe.project.capabilities())).locks.find(lock=>lock.id==='gg.sprites').version).toBe('0.3.0'); // E2: the latest (0.3.0) keeps the whole E1 vocabulary
  expect((await snapshot(page)).hero).toEqual({x:0,y:0,direction:90,size:100,visible:true,costume:'hero',bubble:null});
  await runBlocks(page);
  await expect.poll(async()=>stable(await settled(snapshot,page)),{timeout:30000}).toEqual({...finalState,size:130,bubble:{type:'say',text:'¡Reboto!'}});
  await stopResult(page);
});

// E2 (scene2d-multi-sprite): «Actualizar packs» goes to the latest, 0.3.0, through 0.2.0.
test('E1-05: «Actualizar packs» takes a 0.1.0 project to the latest (0.2.0 → 0.3.0) without running and with the same blocks',async({page})=>{
  await open(page);
  const project=JSON.parse(readFileSync(resolve(import.meta.dirname,'../fixtures/canonical/scene2d/repeat-move/project.json'),'utf8'));
  await starter(page,project);
  await page.evaluate(async()=>{
    const {createCapabilities}=await import(new URL('./app/contracts/packs.mjs',location.href).href);
    await studioProbe.project.useCapabilities(createCapabilities(['gg.sprites'],{versions:{'gg.sprites':'0.1.0'}}));
  });
  await clickVisible(page,page.locator('#capabilities-panel > summary'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.1.0');
  expect(await toolboxText(page,'Control')).not.toContain('por siempre');
  const original=await authoring(page);
  await clickVisible(page,page.locator('#update-packs'));
  await expect(page.locator('#packs-list')).toContainText('gg.sprites · 0.3.0');
  expect(await authoring(page)).toEqual(original);
  expect((await page.evaluate(()=>studioProbe.project.capabilities())).config['gg.sprites'].sprites).toEqual([{id:'hero',name:'hero',x:0,y:0,direction:90,size:100,visible:true,costume:'hero'}]);
  expect((await snapshot(page)).x).toBe(0);
  expect(await toolboxText(page,'Control')).toContain('por siempre');
  await runBlocks(page);await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(15);
});
