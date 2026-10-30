import {origins,ports} from './origins.mjs';
import {selectContext,clickVisible,revealPanel,revealControl} from './workspace-controls.mjs';
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import JSZip from 'jszip';
import {artifactPath} from './artifacts.mjs';
import {validateFirmwareHex} from '../../src/contracts/device-runtime.mjs';
test.setTimeout(120000);
const snap=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const sim=page=>page.evaluate(()=>studioProbe.request('simulator-snapshot'));
async function clickStable(page,selector){
 const button=page.locator(selector);await revealControl(page,button);await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await clickVisible(button);
}
async function stop(page){
 const session=await page.evaluate(()=>studioProbe.state().sessionId);
 await clickStable(page,'#stop-result');
 await expect.poll(()=>page.evaluate(()=>studioProbe.state().sessionId)).not.toBe(session);
 await expect(page.locator('#run-editor')).toBeEnabled();
}
async function open(page){
 await page.goto('/');await page.waitForFunction(()=>Boolean(window.studioProbe?.device));await page.evaluate(()=>studioProbe.project.ready());
 await expect(page.locator('#run-editor')).toBeEnabled();
 await page.locator('#authoring-context').selectOption('microbit');
 await clickVisible(page.locator('#enable-device'));
 await expect(page.locator('#device-status')).toContainText('Dispositivo añadido');
 await page.evaluate(async()=>{
  const project=JSON.parse(await studioProbe.project.export());
  project.authoring.blockly={blocks:{languageVersion:0,blocks:[
   {type:'gg_when_start',id:'joint-start',x:20,y:20},
   {type:'gg_when_message',id:'joint-receiver',fields:{MESSAGE:'microbit-A'},x:20,y:100,inputs:{DO:{block:{type:'gg_move',id:'joint-move',inputs:{STEPS:{shadow:{type:'math_number',id:'joint-steps',fields:{NUM:10}}}}}}}}
  ]}};
  const plot=project.capabilities.config['gg.microbit'].workspace.nodes.find(x=>x.id==='device-number');
  plot.type='gg_mb_plot';plot.fields={X:0,Y:0};
  await studioProbe.project.open(JSON.stringify(project));
 });
 await expect(page.locator('#run-device')).toBeEnabled();
}
async function editX(page,value){
 const field=page.locator('#device-blockly-editor [data-id="device-number"]').getByRole('button',{name:/Edit number:/}).first();
 await selectContext(page,'microbit');
 await field.dblclick({timeout:10000});await page.locator('.blocklyHtmlInput').fill(String(value));await page.locator('.blocklyHtmlInput').press('Enter');
 await expect(field).toHaveText(String(value));
}
async function run(page){await clickVisible(page.locator('#run-device'));await expect(page.locator('#device-status')).toContainText('Escena y dispositivo activos');}
async function pressA(page){const button=page.frameLocator('#runner-slot iframe').frameLocator('iframe').getByRole('button',{name:'A',exact:true});await clickVisible(button);}
for(const mobile of [false,true]){
 test('GG-DEVICE: contextual edit → StaticTS → actual button/LED/scene → Stop → HEX → portable reopen ('+(mobile?'mobile':'desktop')+')',async({page,browser})=>{
  if(mobile)await page.setViewportSize({width:390,height:844});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  const source=await page.locator('#source').inputValue();
  const blocks=await page.evaluate(()=>studioProbe.editor.save());
  await editX(page,4);
  await clickVisible(page.locator('#device-source-panel > summary'));
  await expect(page.locator('#device-generated-source')).toHaveValue(/led.plot\(4, 0\)/);
  expect(await page.locator('#device-generated-source').getAttribute('readonly')).not.toBeNull();
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  expect(await page.locator('#source').inputValue()).toBe(source);
  await run(page);await expect.poll(async()=>(await sim(page)).matrix[4]).toBe(0);
  await pressA(page);await expect.poll(async()=>(await sim(page)).matrix[4]).toBe(1);
  await expect.poll(async()=>(await snap(page)).x).toBe(10);
  await expect(page.locator('#device-status')).toContainText('Botón A → microbit-A');
  expect(await page.frameLocator('#runner-slot iframe').locator('#stage').isVisible()).toBe(true);
  await page.locator('#runner-slot').scrollIntoViewIfNeeded();await page.screenshot({path:artifactPath('device-combined-'+(mobile?'mobile':'desktop')+'.png')});
  const graph=await page.evaluate(()=>studioProbe.deviceEditor.captureGraph());
  await stop(page);
  expect((await snap(page)).x).toBe(0);expect(await page.evaluate(()=>studioProbe.deviceEditor.captureGraph())).toEqual(graph);
  const files=[];
  for(const variant of (mobile?['universal']:['v1','v2','universal'])){
    await revealPanel(page,page.locator('#device-variant'));await page.locator('#device-variant').selectOption(variant);
    await clickVisible(page.locator('#compile-device'));await expect(page.locator('#download-device')).toBeEnabled({timeout:45000});
    const download=page.waitForEvent('download');await clickVisible(page.locator('#download-device'));const file=await download;
    const path=artifactPath('device-'+(mobile?'mobile':'desktop')+'-'+variant+'.hex');await file.saveAs(path);
    const hex=await readFile(path,'utf8');files.push({variant,...validateFirmwareHex(hex,{variant})});
  }
  const download=page.waitForEvent('download');await clickVisible(page.locator('#save-project'));const projectFile=await download;const projectPath=artifactPath('device-'+(mobile?'mobile':'desktop')+'.ggproj');await projectFile.saveAs(projectPath);
  const zip=await JSZip.loadAsync(await readFile(projectPath));const manifest=JSON.parse(await zip.file('manifest.json').async('string'));
  expect(manifest.version).toBe(3);expect(manifest.authoring.deviceSource).toBe(source);
  expect(manifest.capabilities.config['gg.microbit'].workspace).toEqual(await page.evaluate(()=>studioProbe.deviceEditor.captureGraph()));
  expect(JSON.stringify(manifest)).not.toContain('compilerPackHash');expect(JSON.stringify(manifest)).not.toContain('deviceRevision');expect(JSON.stringify(manifest.capabilities.config['gg.microbit'])).not.toContain('basic.showIcon');
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
  try{const reopened=await context.newPage();await reopened.goto('/');await expect(reopened.locator('#run-editor')).toBeEnabled();await reopened.locator('#open-project').setInputFiles(projectPath);await expect(reopened.locator('#project-status')).toHaveText('Guardado en este navegador');expect((await snap(reopened)).x).toBe(0);
   expect(await reopened.evaluate(()=>studioProbe.device.state().simulation)).toBeNull();
   await reopened.locator('#authoring-context').selectOption('microbit');await run(reopened);await pressA(reopened);await expect.poll(async()=>(await snap(reopened)).x).toBe(10);
  }finally{await context.close();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(mobile?390:1280);
  await writeFile(artifactPath('device-'+(mobile?'mobile':'desktop')+'.json'),JSON.stringify({files,errors,sourcePreserved:true},null,2));
  expect(errors).toEqual([]);
 });
}
test('GG-DEVICE: target diagnostic selects device source and invalid generation/import preserve live scene',async({page})=>{
 await open(page);await run(page);await pressA(page);await expect.poll(async()=>(await snap(page)).x).toBe(10);
 const before=await page.evaluate(()=>({session:studioProbe.state().sessionId,graph:studioProbe.deviceEditor.captureGraph()}));
 // A detached statement is a valid editable draft, but cannot generate firmware.
 await page.evaluate(()=>{
  const graph=studioProbe.deviceEditor.captureGraph();
  graph.nodes.find(x=>x.id==='device-button-a').inputs.DO=null;
  const loose=graph.nodes.find(x=>x.id==='device-number');loose.x=20;loose.y=330;
  graph.roots.push('device-number');studioProbe.deviceEditor.commit(studioProbe.deviceEditor.prepare(graph));
 });
 await expect(page.locator('#device-generated-source')).toHaveValue('');
 await expect(page.locator('#console-entries')).toContainText('DEVICE_LOOSE_BLOCK');
 await page.locator('#authoring-context').selectOption('2d');
 await clickVisible(page,page.locator('#console-entries button').filter({hasText:'Ver bloque device-number'}).last());
 await expect(page.locator('#authoring-context')).toHaveValue('microbit');
 expect(await page.evaluate(()=>studioProbe.deviceEditor.selectedSource())).toBe('device-number');
 await clickVisible(page.locator('#run-device'));
 expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(before.session);expect((await snap(page)).x).toBe(10);
 const targetGuard=await page.evaluate(graph=>{
   const node=graph.nodes.find(x=>x.id==='device-number');node.type='gg_move';node.fields={};node.inputs={STEPS:null};
   try{studioProbe.deviceEditor.prepare(graph);return null;}catch(error){return {code:error.code,id:error.sourceBlockId};}
 },before.graph);
 expect(targetGuard).toEqual({code:'DEVICE_TARGET_OPERATION',id:'device-number'});
 // Independent 2D authoring still runs while the device draft is invalid.
 await selectContext(page,'2d');
 await page.locator('#authoring-context').selectOption('2d');await clickVisible(page.locator('#run-editor'));
 await expect(page.locator('#status')).toHaveText('Bloques ejecutados');expect((await snap(page)).x).toBe(0);
 await page.evaluate(graph=>studioProbe.deviceEditor.commit(studioProbe.deviceEditor.prepare(graph)),before.graph);
 const outcome=await page.evaluate(async()=>{
  const value=JSON.parse(await studioProbe.project.export());value.capabilities.config['gg.microbit'].workspace.nodes[1].next='missing';
  try{await studioProbe.project.open(JSON.stringify(value));return 'accepted';}catch(e){return e.message;}
 });expect(outcome).not.toBe('accepted');expect((await snap(page)).x).toBe(0);
});
test('GG-DEVICE: editing during compilation revokes old diagnostics/download and blocked compile is stopped',async({page})=>{
 await open(page);
 let release;const blocked=new Promise(r=>release=r);let intercepted;
 const reached=new Promise(r=>intercepted=r);
 await page.route('**/compiler-worker.js',async route=>{intercepted();await blocked;await route.continue();});
 await clickVisible(page.locator('#compile-device'));await reached;
 await editX(page,3);release();
 await expect(page.locator('#device-build-status')).not.toHaveText('Compilando firmware…');
 await expect(page.locator('#download-device')).toBeDisabled();
 await page.unroute('**/compiler-worker.js');
 await clickVisible(page.locator('#compile-device'));await expect(page.locator('#download-device')).toBeEnabled({timeout:45000});
 const old=await page.evaluate(()=>studioProbe.device.state().firmware);
 await stop(page);await expect(page.locator('#download-device')).toBeDisabled();
 expect(await page.evaluate(()=>studioProbe.device.state().firmware.scope)).toEqual(old.scope);
 expect(await page.evaluate(()=>studioProbe.device.state().firmware.current)).toBe(false);
});

test('GG-DEVICE: simulator port rejects replay/forged/stale scopes and bounds valid event flood',async({page,context})=>{
 await context.addInitScript(simulatorPort=>{
  if(location.port!==simulatorPort)return;
  const original=MessagePort.prototype.postMessage;
  MessagePort.prototype.postMessage=function(data,...rest){
   if(data?.type==='device-event')window.deviceWireTest={port:this,data:structuredClone(data)};
   return original.call(this,data,...rest);
  };
 },String(ports.simulator));
 await open(page);await run(page);await pressA(page);await expect.poll(async()=>(await snap(page)).x).toBe(10);
 const child=page.frames().find(frame=>new URL(frame.url()).port===String(ports.simulator));
 const packet=await child.evaluate(()=>structuredClone(deviceWireTest.data));
 await child.evaluate(value=>{
  deviceWireTest.port.postMessage(value);
  deviceWireTest.port.postMessage({...value,seq:value.seq+10,deviceScope:{...value.deviceScope,generation:'forged'}});
  deviceWireTest.port.postMessage({...value,seq:value.seq+20,event:{...value.event,method:'sprite.move'}});
 },packet);
 expect((await snap(page)).x).toBe(10);
 await child.evaluate(value=>{for(let i=1;i<=100;i++)deviceWireTest.port.postMessage({...value,seq:value.seq+i});},packet);
 await expect(page.locator('#console-entries')).toContainText('DEVICE_EVENT_LIMIT');
 await expect.poll(async()=>(await snap(page)).x).toBeGreaterThan(10);
 const before=(await snap(page)).x;expect(before).toBeLessThanOrEqual(410);
 await editX(page,2);
 await child.evaluate(value=>deviceWireTest.port.postMessage({...value,seq:value.seq+1000}),packet);
 expect((await snap(page)).x).toBe(before);
 await stop(page);expect(child.isDetached()).toBe(true);
});
test('GG-DEVICE: Stop cancels a compiler bootstrap and a fresh session compiles afterwards',async({page})=>{
 await open(page);let release,reached;
 const wait=new Promise(r=>release=r),started=new Promise(r=>reached=r);
 await page.route('**/compiler-worker.js',async route=>{reached();await wait;await route.continue().catch(()=>{});});
 await clickVisible(page.locator('#compile-device'));await started;
 const old=await page.evaluate(()=>studioProbe.state().sessionId);
 await clickStable(page,'#stop-result');release();
 await expect(page.locator('#run-editor')).toBeEnabled();expect(await page.evaluate(()=>studioProbe.state().sessionId)).not.toBe(old);
 await expect(page.locator('#download-device')).toBeDisabled();await page.unroute('**/compiler-worker.js');
 await clickVisible(page.locator('#compile-device'));await expect(page.locator('#download-device')).toBeEnabled({timeout:45000});
 expect(await page.evaluate(()=>studioProbe.console.snapshot().entries.some(x=>/Session stopped/.test(x.message)))).toBe(false);
});
