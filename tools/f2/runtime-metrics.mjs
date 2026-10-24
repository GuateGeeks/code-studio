import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {readFile, mkdir, writeFile, readdir, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {cpus, platform, release} from 'node:os';
import {performance} from 'node:perf_hooks';
import {projectRoot} from '../paths.mjs';

const cycles = Number(process.env.GG_METRIC_CYCLES ?? 10);
if (!Number.isSafeInteger(cycles) || cycles < 1 || cycles > 20) throw new Error('cycles must be 1..20');
const ports = {GG_SHELL_PORT:'4193',GG_RUNNER_PORT:'4194',GG_SIMULATOR_PORT:'4195',GG_LANGUAGE_PORT:'4196'};
const baseURL = 'http://127.0.0.1:4193';
let service;
async function boot() {
  try { if ((await fetch(baseURL+'/health')).ok) throw new Error('Performance ports are occupied; do not reuse an unknown server.'); } catch(error) { if (error.message.startsWith('Performance ports')) throw error; }
  service = spawn(process.execPath,['tools/f0/serve-browser.mjs'],{cwd:projectRoot,env:{...process.env,...ports},stdio:['ignore','pipe','pipe']});
  let logs=''; service.stdout.on('data',data=>{logs+=data;}); service.stderr.on('data',data=>{logs+=data;});
  const end=performance.now()+10000;
  while(performance.now()<end) {
    if(service.exitCode!==null) throw new Error(logs);
    try { if ((await fetch(baseURL+'/health')).ok && (await fetch('http://127.0.0.1:4196/health')).ok) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  throw new Error('Metrics server did not start: '+logs);
}
async function rss(cdp) {
  const {processInfo}=await cdp.send('SystemInfo.getProcessInfo');
  let bytes=0,count=0;
  for(const process of processInfo) {
    try {
      const status=await readFile('/proc/'+process.id+'/status','utf8');
      const match=status.match(/^VmRSS:\s+(\d+) kB/m);
      if(match){bytes+=Number(match[1])*1024;count++;}
    } catch(error){if(!['ENOENT','ESRCH'].includes(error.code))throw error;}
  }
  return {bytes,processes:count};
}
async function treeBytes(path) {
  let bytes=0;
  for(const entry of await readdir(path,{withFileTypes:true})) {
    const file=resolve(path,entry.name);
    bytes+=entry.isDirectory()?await treeBytes(file):(await stat(file)).size;
  }
  return bytes;
}
const result={recordedAt:new Date().toISOString(),scope:'Local WSL/Chromium diagnostic; not a school device acceptance measurement',environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model},cycles,metrics:{}};
try {
  await boot();
  for(const language of ['javascript','python']) {
    const server=await chromium.launchServer({headless:true,args:['--enable-unsafe-swiftshader']});
    const browser=await chromium.connect(server.wsEndpoint());
    try {
      result.environment.chromium=browser.version();
      const cdp=await browser.newBrowserCDPSession();
      const context=await browser.newContext();
      const page=await context.newPage();
      await page.goto(baseURL);
      await page.locator('#run-editor').waitFor({state:'visible'});
      await page.waitForFunction(()=>window.studioProbe?.project.state().ready && !document.querySelector('#run-editor').disabled);
      const baseline=await rss(cdp);
      await page.locator(language==='javascript'?'#new-javascript':'#new-python').click();
      await page.locator('#text-source').fill(language==='javascript'?"await GG.sprite.move('hero',1);":"await GG.sprite.move('hero',1)");
      const runs=[];
      for(let cycle=0;cycle<cycles;cycle++) {
        const started=performance.now();
        await page.locator('#run-document').click();
        await page.waitForFunction(()=>document.querySelector('#text-run-status').textContent==='Documento terminado',{},{timeout:60000});
        const runMs=performance.now()-started;
        const running=await rss(cdp);
        const stopStarted=performance.now();
        await page.locator('#stop-document').click();
        await page.waitForFunction(()=>!document.querySelector('#run-editor').disabled);
        const stopMs=performance.now()-stopStarted;
        const stopped=await rss(cdp);
        const state=await page.evaluate(()=>studioProbe.language.state());
        if(state.active!==null||state.candidate!==null)throw new Error('Text runtime remained attached after Stop');
        runs.push({cycle:cycle+1,runMs,stopMs,runningRSS:running,stoppedRSS:stopped});
      }
      result.metrics[language]={baselineRSS:baseline,runs};
      await context.close();await cdp.detach();
    } finally {await browser.close();await server.close();}
  }
  result.servedBytes={};
  for(const role of ['shell','runner','simulator','language'])result.servedBytes[role]=await treeBytes(resolve(projectRoot,'artifacts/browser',role));
  result.limitations=['RSS sums Chromium processes and may count shared pages more than once; it is not private heap or a WASM-only measurement.','Run includes fresh runner/interpreter bootstrap and one GG command; first run is cold within a fresh browser process.','No RAM/loading threshold is certified for school hardware.'];
  await mkdir(resolve(projectRoot,'artifacts'),{recursive:true});
  await writeFile(resolve(projectRoot,'artifacts/f2-runtime-metrics.json'),JSON.stringify(result,null,2)+'\n');
  console.log('Runtime metrics saved for '+cycles+' Run/Stop cycles per language.');
} finally {service?.kill('SIGTERM');}
