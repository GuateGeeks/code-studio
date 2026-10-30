import {clickVisible} from './workspace-controls.mjs';
import {createHash} from 'node:crypto';
import {test,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,readFile,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname,relative,sep} from 'node:path';
import {readStoredPackage} from '../../src/export/stored-package.mjs';
import {auxiliaryServer} from './origins.mjs';
const sourceNames=['index.html','source.tar.gz','source-manifest.json','LICENSE','THIRD_PARTY_NOTICES.txt','SBOM.json'];
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
// Studio server in a block derived from the configured base (offset +70).
// The exported packages' own server (serve.mjs) listens on 4211–4213 (shell, language and
// context); deployment.json also names 4214–4216 as origins, but nothing binds them. Those
// ports are fixed by the export format, not derived from the base, so this suite is
// exclusive (exclusiveSuites in tools/test/partitions.mjs): never run it in two runs at once.
const {env:ports,origin:studioOrigin}=auxiliaryServer('standalone');
async function server(command,args,options,origin){
 const child=spawn(command,args,{...options,stdio:['ignore','pipe','pipe']});let log='';
 child.stdout.on('data',data=>{log+=data;});child.stderr.on('data',data=>{log+=data;});
 const stop=async()=>{if(child.exitCode!==null||child.signalCode!==null)return;const ended=once(child,'exit');child.kill('SIGTERM');await ended;};
 try{await expect.poll(async()=>{if(child.exitCode!==null)throw new Error(log);try{return(await fetch(origin)).ok;}catch{return false;}},{timeout:30000}).toBe(true);}catch(error){await stop();throw error;}
 return {child,stop,log:()=>log};
}
test('GG-EXPORT-001: four packages run from an external folder with Studio stopped and all network restricted to exported origins',async({browser},testInfo)=>{
 test.setTimeout(300000);
 const folder=await mkdtemp(resolve(tmpdir(),'gg-standalone-browser-')),packages=[],evidence={folder,packages:[]};
 let studio,standalone,context;
 try{
  studio=await server(process.execPath,['tools/f0/serve-browser.mjs'],{env:{...process.env,...ports,GG_RELEASE_ROOT:resolve(folder,'releases')}},studioOrigin+'/health');
  for(const contextId of ['scene3d','webapp'])for(const language of ['javascript','python']){
   context=await browser.newContext();const page=await context.newPage();await page.goto(studioOrigin+'/');
   await page.waitForFunction(()=>window.studioProbe?.project.state().ready);
   await page.locator('#authoring-context').selectOption(contextId);
   const surface=page.locator('#'+contextId+'-authoring'),title=contextId==='scene3d'?'escena 3D':'aplicación web';
   await clickVisible(surface.getByRole('button',{name:'Añadir '+title,exact:true}));
   await expect(page.locator('#'+contextId+'-mode')).toBeVisible();
   await clickVisible(page.getByRole('button',{name:'Crear copia '+(language==='javascript'?'JavaScript':'Python'),exact:true}));
   const downloaded=page.waitForEvent('download',{timeout:30000});await clickVisible(page.getByRole('button',{name:'Descargar aplicación autónoma',exact:true}));
   const download=await downloaded,zipPath=testInfo.outputPath(contextId+'-'+language+'.zip');await download.saveAs(zipPath);
   const bytes=new Uint8Array(await readFile(zipPath)),entries=readStoredPackage(bytes),destination=resolve(folder,contextId+'-'+language);
   await mkdir(destination,{recursive:true});
   for(const [path,data]of entries){const target=resolve(destination,path),from=relative(destination,target);if(from.startsWith('..'+sep)||from==='..')throw new Error('Invalid extraction path');await mkdir(dirname(target),{recursive:true});await writeFile(target,data);}
   const manifest=JSON.parse(await readFile(resolve(destination,'package-manifest.json'),'utf8'));
   const fileMap=new Map(entries),source=JSON.parse(new TextDecoder().decode(fileMap.get('release/source-manifest.json')));
   for(const name of sourceNames)expect(fileMap.has('release/'+name)).toBe(true);
   expect([...fileMap.keys()].filter(path=>path.endsWith('source.tar.gz'))).toEqual(['release/source.tar.gz']);
   expect(source.license).toBe('AGPL-3.0-only');expect(source.sourceArchive.bytes).toBe(fileMap.get('release/source.tar.gz').length);expect(source.sourceArchive.sha256).toBe(digest(fileMap.get('release/source.tar.gz')));
   packages.push({contextId,language,destination,bytes:bytes.length,files:entries.length,cohort:manifest.sourceCohort,sourceBytes:source.sourceArchive.bytes,sourceHash:source.sourceArchive.sha256});
   await context.close();context=null;
  }
  await studio.stop();studio=null;
  for(const value of Object.values(ports)){let alive=false;try{alive=(await fetch('http://127.0.0.1:'+value+'/health')).ok;}catch{}expect(alive).toBe(false);}
  evidence.studioStopped=true;
  for(const item of packages){
   standalone=await server(process.execPath,['serve.mjs'],{cwd:item.destination,env:{...process.env}},'http://127.0.0.1:4211/');
   context=await browser.newContext({viewport:{width:390,height:844}});const forbidden=[],requests=[];
   await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&['4211','4212','4213'].includes(url.port)){requests.push(url.href);return route.continue();}forbidden.push(url.href);return route.abort();});
   const page=await context.newPage();await page.goto('http://127.0.0.1:4211/');
   const start=performance.now();await clickVisible(page.getByRole('button',{name:'Ejecutar',exact:true}));
   await expect.poll(()=>page.evaluate(()=>window.standaloneProbe?.state().program?.active??false),{timeout:60000}).toBe(true);
   if(item.contextId==='scene3d'){
     await expect.poll(()=>page.evaluate(async()=>(await standaloneProbe.snapshot())?.entities.find(e=>e.id==='sphere').local.position.x)).toBe(1);
     await expect(page.frameLocator('.context-preview:not([hidden]) iframe').locator('canvas')).toBeVisible();
   }else{
     const app=page.frameLocator('.context-preview:not([hidden]) iframe');await app.getByLabel('Nombre').fill('Autónoma <script>');
     await clickVisible(app.getByRole('button',{name:'Añadir',exact:true}));await expect(app.getByRole('listitem')).toHaveText('Autónoma <script>');
   }
   const startupMs=performance.now()-start;
   const renderer=page.frames().find(frame=>new URL(frame.url()||'about:blank').origin==='http://127.0.0.1:4213');
   const cdp=await context.newCDPSession(renderer),heap=await cdp.send('Runtime.getHeapUsage');await cdp.detach();
   await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));await expect(page.locator('iframe')).toHaveCount(0);
   expect(await page.evaluate(()=>standaloneProbe.snapshot())).toBeNull();
   await clickVisible(page.getByRole('link',{name:'Fuente, licencia y procedencia de esta versión'}));
   await expect(page).toHaveURL('http://127.0.0.1:4211/release/index.html');
   const sourceDownload=page.waitForEvent('download');await clickVisible(page.locator('a[href$="source.tar.gz"]'));const downloaded=await sourceDownload;
   const sourcePath=testInfo.outputPath(item.contextId+'-'+item.language+'-source.tar.gz');await downloaded.saveAs(sourcePath);expect(digest(await readFile(sourcePath))).toBe(item.sourceHash);
   const materials=await page.evaluate(async()=>{const result={};for(const name of ['source-manifest.json','LICENSE','THIRD_PARTY_NOTICES.txt','SBOM.json']){const response=await fetch('/release/'+name);result[name]={status:response.status,text:await response.text(),mime:response.headers.get('Content-Type')};}return result;});
   for(const name of Object.keys(materials))expect(materials[name].status).toBe(200);
   expect(JSON.parse(materials['source-manifest.json'].text).sourceArchive.sha256).toBe(item.sourceHash);
   expect(materials.LICENSE.text.trim().length).toBeGreaterThan(100);expect(materials['THIRD_PARTY_NOTICES.txt'].text.trim().length).toBeGreaterThan(100);expect(JSON.parse(materials['SBOM.json'].text)).toBeTruthy();
   expect(forbidden).toEqual([]);
   expect(new Set(requests.map(url=>new URL(url).origin))).toEqual(new Set(['http://127.0.0.1:4211','http://127.0.0.1:4212','http://127.0.0.1:4213']));
   evidence.packages.push({...item,startupMs,rendererHeap:heap,requests:requests.length,forbidden});
   await context.close();context=null;await standalone.stop();standalone=null;
  }
  await writeFile(testInfo.outputPath('standalone-evidence.json'),JSON.stringify(evidence,null,2));
 }finally{await context?.close();await standalone?.stop();await studio?.stop();}
});

