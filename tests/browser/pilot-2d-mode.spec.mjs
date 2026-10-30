import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {clickVisible,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {auxiliaryServer} from './origins.mjs';

// Own server with the pilot profile, in a block derived from the configured base (offset +60).
test.setTimeout(180000);
const {env:ports,origin}=auxiliaryServer('pilot');
let server=null,releaseRoot=null;
test.beforeAll(async()=>{
  releaseRoot=await mkdtemp(join(tmpdir(),'gg-pilot-releases-'));
  const child=spawn(process.execPath,['tools/f0/serve-browser.mjs'],{env:{...process.env,...ports,GG_CONTEXTS:'2d,text',GG_RELEASE_ROOT:releaseRoot},stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',data=>{log+=data;});child.stderr.on('data',data=>{log+=data;});
  await expect.poll(async()=>{
    if(child.exitCode!==null)throw new Error('Pilot server exited: '+log);
    try{return(await fetch(origin+'/health')).ok;}catch{return false;}
  },{timeout:60000,intervals:[100,250,500]}).toBe(true);
  server=child;
});
test.afterAll(async()=>{
  if(server&&server.exitCode===null&&server.signalCode===null){const ended=once(server,'exit');server.kill('SIGTERM');await ended;}
  if(releaseRoot)await rm(releaseRoot,{recursive:true,force:true});
});
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
async function mode(page,value){await clickVisible(page.locator('#program-mode input[value="'+value+'"]'));await expect(page.locator('#program-mode input[value="'+value+'"]')).toBeChecked();}
async function open(page){
  await page.goto(origin+'/');await page.waitForFunction(()=>Boolean(window.studioProbe?.project));
  await page.evaluate(()=>studioProbe.project.ready());await expect(page.locator('#run-editor')).toBeEnabled();
}

test('PILOT-BROWSER-001: el piloto muestra solo 2D y texto, conserva micro:bit y 3D ocultos y no ejecuta al abrir',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);
  expect(await page.evaluate(()=>fetch('./config.json').then(r=>r.json()).then(c=>c.contexts))).toEqual(['2d','text']);
  expect(await page.locator('#authoring-context option').evaluateAll(nodes=>nodes.map(node=>node.value))).toEqual(['2d','text']);
  await expect(page.locator('#hidden-authoring-notice')).toBeEmpty();
  // A project made elsewhere with micro:bit and a 3D scene.
  const original=await page.evaluate(async()=>{
    const {createCapabilities}=await import(new URL('./app/contracts/packs.mjs',location.href).href);
    // Same path as adding a context in a full installation.
    await studioProbe.project.useCapabilities(createCapabilities(['gg.sprites','gg.microbit','gg.3d-basic']));
    const project=JSON.parse(await studioProbe.project.export());
    project.capabilities.config['gg.microbit'].workspace.nodes.find(node=>node.id==='device-number').fields.NUMBER=7;
    await studioProbe.project.open(JSON.stringify(project));
    return JSON.parse(await studioProbe.project.export()).capabilities.config;
  });
  expect(original['gg.microbit'].workspace.nodes.find(node=>node.id==='device-number').fields.NUMBER).toBe(7);
  await expect(page.locator('#hidden-authoring-notice')).toHaveText('Este proyecto también incluye micro:bit y Escena 3D. Esta instalación del piloto no los muestra, pero se conservan al guardar y descargar.');
  expect((await snapshot(page)).x).toBe(0);
  expect(await page.locator('#authoring-context option').evaluateAll(nodes=>nodes.map(node=>node.value))).toEqual(['2d','text']);
  expect(await page.evaluate(()=>studioProbe.contexts.select('microbit'))).toBe(false);
  expect(await page.evaluate(()=>studioProbe.contexts.select('scene3d'))).toBe(false);
  expect(await page.evaluate(()=>studioProbe.contexts.current())).toBe('2d');
  // 2D keeps working: synchronized view and execution.
  await mode(page,'javascript');await expect(page.locator('#text-source')).toHaveValue(/hero\.move\(4\)/);
  await mode(page,'blocks');
  await clickVisible(page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(12);
  // Saving, reopening and exporting keep the hidden authoring intact.
  await page.evaluate(()=>studioProbe.project.flush());await open(page);
  expect((await snapshot(page)).x).toBe(0);
  await expect(page.locator('#hidden-authoring-notice')).toContainText('micro:bit y Escena 3D');
  const reopened=await page.evaluate(async()=>JSON.parse(await studioProbe.project.export()).capabilities.config);
  expect(reopened['gg.microbit']).toEqual(original['gg.microbit']);
  expect(reopened['gg.3d-basic']).toEqual(original['gg.3d-basic']);
  await page.screenshot({path:artifactPath('pilot-2d-mode.png'),fullPage:true});
  await writeFile(artifactPath('pilot-2d-mode.json'),JSON.stringify({contexts:['2d','text'],kept:Object.keys(reopened)},null,2));
  expect(errors).toEqual([]);
});
