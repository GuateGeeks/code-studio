import JSZip from 'jszip';
import {selectContext,clickVisible,revealPanel,revealControl,settled} from './workspace-controls.mjs';
import {test, expect, chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp, cp, readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {artifactPath} from './artifacts.mjs';

// Cohort update/rollback polls allow 240 s: on the shared machine a loaded
// gate exceeded 120 s while the same test passes alone (24/10/2026).
test.setTimeout(600000);
const origin='http://127.0.0.1:4177';
const ports={GG_SHELL_PORT:'4177',GG_RUNNER_PORT:'4178',GG_SIMULATOR_PORT:'4179',GG_LANGUAGE_PORT:'4180',GG_SCENE3D_PORT:'4188',GG_WEBAPP_PORT:'4189'};
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
async function serve(browserRoot, releaseRoot) {
  const child=spawn(process.execPath,['tools/f0/serve-browser.mjs'],{env:{...process.env,...ports,GG_BROWSER_ROOT:browserRoot,GG_RELEASE_ROOT:releaseRoot},stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',data=>{log+=data;});child.stderr.on('data',data=>{log+=data;});
  try {
    await expect.poll(async()=>{
      if(child.exitCode!==null) throw new Error('Offline fixture server exited: '+log);
      try{return(await fetch(origin+'/health')).ok;}catch{return false;}
    },{timeout:20000,intervals:[50,100,200]}).toBe(true);
  } catch(error){if(child.exitCode===null&&child.signalCode===null){const ended=once(child,'exit');child.kill('SIGTERM');await ended;}throw error;}
  return {child,log:()=>log,async stop(){if(child.exitCode===null&&child.signalCode===null){const ended=once(child,'exit');child.kill('SIGTERM');const force=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');},3000);try{await ended;}finally{clearTimeout(force);}}}};
}
async function open(page, url=origin+'/') {
  await page.goto(url);
  await page.waitForFunction(()=>Boolean(window.studioProbe?.project));
  await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page.locator('#lessons-panel > summary'));
  await clickVisible(page.locator('#offline-panel > summary'));
}
async function context(profile) {
  return chromium.launchPersistentContext(profile,{headless:true,viewport:{width:1280,height:900},args:['--enable-unsafe-swiftshader']});
}
async function clickPreparedControl(page,selector) {
  const button=page.locator(selector);
  await revealControl(page,button);await button.scrollIntoViewIfNeeded();await expect(button).toBeInViewport();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await clickVisible(button);
}
async function run(page,x) {
  await selectContext(page,'2d');
  await clickVisible(page.locator('#run-editor'));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
}
async function edit(page,id,value) {
  await selectContext(page,'2d');
  await page.locator('#blockly-editor [data-id="'+id+'"] .blocklyText').dblclick();
  await page.locator('.blocklyHtmlInput').fill(String(value));
  await page.locator('.blocklyHtmlInput').press('Enter');
}
async function textRun(page,language,x) {
  await selectContext(page,'text');
  await clickVisible(page.locator('#new-'+language));
  await selectContext(page,'text');
  await page.locator('#text-source').fill(language==='javascript'?"await GG.sprite.move('hero', "+x+");\nconsole.log(await GG.scene.get());":"await GG.sprite.move('hero', "+x+")\nprint(await GG.scene.get())");
  await clickVisible(page.locator('#run-document'));
  await expect(page.locator('#text-run-status')).toHaveText('Documento terminado',{timeout:60000});
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(x);
  await selectContext(page,'text');
  await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
}

test('GG-OFFLINE: immutable update and rollback survive full browser closure with all six servers stopped',async()=>{
  const folder=await mkdtemp(resolve('artifacts','offline-browser-'));
  const profile=resolve(folder,'profile'),copy=resolve(folder,'build-b'),releases=resolve(folder,'releases');
  await mkdir(profile,{recursive:true});
  let server,browserContext;
  const evidence={ports,requests:[],errors:[],phases:[]};
  try {
    server=await serve(resolve('artifacts/browser'),releases);
    browserContext=await context(profile);
    let page=browserContext.pages()[0]??await browserContext.newPage();
    page.on('pageerror',error=>evidence.errors.push(error.message));
    await open(page);
    await revealPanel(page,page.locator('#lesson-select'));await page.locator('#lesson-select').selectOption('story');
    await clickVisible(page.locator('#lesson-load'));
    await expect(page.locator('#lesson-status')).toContainText('Ejemplo cargado sin ejecutar');
    await edit(page,'lesson-story-first-n',40);
    await run(page,60);
    await page.evaluate(()=>studioProbe.project.flush());
    const blocks=await page.evaluate(()=>studioProbe.editor.save());
    await clickPreparedControl(page,'#prepare-offline');
    await expect(page.locator('#offline-status')).toHaveText('Preparación confirmada en este navegador',{timeout:120000});
    const first=(await page.evaluate(()=>studioProbe.offline.state())).current;
    expect(first.packs).toHaveLength(8);
    evidence.first=first;
    // Enter an immutable page A and keep it open while another release is prepared.
    await open(page,origin+first.releaseBase);
    expect(new URL(page.url()).pathname).toBe(first.releaseBase);
    await run(page,60);
    const activeA=(await page.evaluate(()=>studioProbe.state())).sessionId;
    await cp(resolve('artifacts/browser'),copy,{recursive:true});
    const html=resolve(copy,'shell/index.html');
    const originalHTML=await readFile(html,'utf8');
    const htmlB=originalHTML.replace(/<body\b([^>]*)>/i,'<body$1 data-fixture-release="B">');
    expect(htmlB).not.toBe(originalHTML);
    expect(htmlB).toContain('data-fixture-release="B"');
    await writeFile(html,htmlB);
    await server.stop();server=await serve(copy,releases);
    // A genuine corrupted HTTP asset must fail before changing the selection.
    const candidate=await (await fetch(origin+'/latest-release.json')).json();
    expect(candidate.cohort).not.toBe(first.cohort);
    const candidateStyle=resolve(releases,candidate.cohort,'shell/style.css');
    const correctStyle=await readFile(candidateStyle);
    await writeFile(candidateStyle,Buffer.concat([correctStyle,Buffer.from('\n/* deliberately corrupted fixture */')]));
    await clickPreparedControl(page,'#prepare-offline');
    await expect(page.locator('#offline-error')).not.toBeEmpty({timeout:120000});
    expect((await page.evaluate(()=>studioProbe.offline.state())).current.cohort).toBe(first.cohort);
    expect((await page.evaluate(()=>studioProbe.state())).sessionId).toBe(activeA);
    evidence.corruptCandidatePreservedCurrent=true;
    await writeFile(candidateStyle,correctStyle);
    // Preparing B on A must not replace its runner or authoring.
    await clickPreparedControl(page,'#prepare-offline');
    await expect.poll(()=>page.evaluate(()=>studioProbe.offline.state().current.cohort),{timeout:240000}).not.toBe(first.cohort);
    const second=(await page.evaluate(()=>studioProbe.offline.state())).current;
    evidence.second=second;
    expect((await page.evaluate(()=>studioProbe.state())).sessionId).toBe(activeA);
    expect(new URL(page.url()).pathname).toBe(first.releaseBase);
    const fresh=await browserContext.newPage();await open(fresh);
    expect(new URL(fresh.url()).pathname).toBe(second.releaseBase);
    expect(await fresh.locator('body').getAttribute('data-fixture-release')).toBe('B');
    expect(await fresh.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
    await clickPreparedControl(fresh,'#rollback-offline');
    await expect.poll(()=>fresh.evaluate(()=>studioProbe.offline.state().current.cohort),{timeout:240000}).toBe(first.cohort);
    await fresh.evaluate(()=>studioProbe.project.flush());
    evidence.phases.push('prepared A','A remained active during B','new visit opened B','rollback selected A');
    // Close Chromium entirely, not just a page/context from a shared process.
    await browserContext.close();browserContext=null;
    await server.stop();server=null;
    for(const value of Object.values(ports)){
      let available=false;try{available=(await fetch('http://127.0.0.1:'+value+'/health')).ok;}catch{}
      expect(available).toBe(false);
    }
    evidence.serversStopped=true;
    browserContext=await context(profile);
    page=browserContext.pages()[0]??await browserContext.newPage();
    page.on('request',request=>evidence.requests.push({url:request.url(),method:request.method()}));
    page.on('pageerror',error=>evidence.errors.push(error.message));
    await open(page);
    expect(new URL(page.url()).pathname).toBe(first.releaseBase);
    expect(await page.locator('body').getAttribute('data-fixture-release')).toBeNull();
    await expect(page.locator('#entry-continue')).toBeVisible();
    await expect(page.locator('#entry-description')).toContainText('continuar');
    await clickVisible(page.locator('#entry-continue'));
    await expect(page.locator('#editor-heading')).toBeFocused();
    expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
    expect((await snapshot(page)).x).toBe(0);
    // PC-07/SJ-09: portable continuity is real in the new offline process.
    await page.setViewportSize({width:390,height:844});
    await expect(page.locator('#project-status')).toContainText('Guardado');
    await expect(page.locator('#project-copy-status')).toHaveText('Sin registro de copia en este navegador');
    const fileMenu=page.locator('#project-menu > summary');await fileMenu.focus();await fileMenu.press('Enter');
    const portableButton=page.locator('#save-project');await portableButton.scrollIntoViewIfNeeded();await portableButton.focus();
    const coldCopy=page.waitForEvent('download');await portableButton.press('Enter');const copied=await coldCopy;
    const copyPath=artifactPath('offline-continuity.ggproj');await copied.saveAs(copyPath);
    const copyZip=await JSZip.loadAsync(await readFile(copyPath)),copyManifest=JSON.parse(await copyZip.file('manifest.json').async('string'));
    expect(copyManifest.authoring.blockly).toEqual(blocks);
    expect(JSON.stringify(copyManifest)).not.toContain('contentHash');
    await expect.poll(()=>page.evaluate(()=>studioProbe.project.state().continuity.portable)).toBe('current');
    await expect.poll(()=>page.evaluate(()=>studioProbe.project.state().continuity.persisted)).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:artifactPath('offline-continuity-mobile.png'),fullPage:true});
    evidence.offlineContinuity={keyboardDownload:true,path:copyPath,view:await page.evaluate(()=>studioProbe.project.state().continuity),authoringUnchanged:true};
    await portableButton.press('Escape');await expect(fileMenu).toBeFocused();
    expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
    expect((await snapshot(page)).x).toBe(0);
    await page.setViewportSize({width:1280,height:900});
    // A fresh offline process can actually edit, run, check an activity and use both WASM engines.
    await edit(page,'lesson-story-first-n',30);await run(page,50);
    await edit(page,'lesson-story-first-n',40);await run(page,60);
    await revealControl(page,page.locator('#lesson-check'));await page.locator('#lesson-check').scrollIntoViewIfNeeded();
    await expect(page.locator('#lesson-check')).toBeInViewport();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await clickVisible(page.locator('#lesson-check'));await expect(page.locator('#lesson-status')).toContainText('Comprobación completada');
    await expect(page.locator('#lesson-objective')).not.toBeEmpty();
    await expect(page.locator('#lesson-prediction')).not.toBeEmpty();
    const offlineHint=page.locator('[data-step-id="story-position"] .lesson-hint');
    await clickVisible(offlineHint);
    await expect(page.locator('[data-step-id="story-position"] .lesson-hints li')).toHaveCount(1);
    await clickVisible(page.locator('#lesson-variant'));
    await expect(page.locator('#lesson-prediction')).toContainText('x=80');
    expect((await snapshot(page)).x).toBe(60);
    await edit(page,'lesson-story-last-n',40);await run(page,80);
    await clickVisible(page.locator('#lesson-check'));
    await expect(page.locator('#lesson-status')).toContainText('Comprobación completada');
    const educational=await page.evaluate(()=>studioProbe.lessons.state());
    expect(educational.results.map(step=>step.id)).toEqual(['story-variant']);
    await expect(page.locator('#lesson-reflection')).not.toBeEmpty();
    evidence.offlineActivities={mode:educational.mode,checkedStepIds:educational.results.map(step=>step.id),hintsRevealed:1,position:(await snapshot(page)).x};
    const variantBlocks=await page.evaluate(()=>studioProbe.editor.save());
    await textRun(page,'javascript',7);await textRun(page,'python',9);
    await selectContext(page,'microbit');
    await clickVisible(page.locator('#simulate'));
    await expect(page.locator('#status')).toHaveText('Simulador micro:bit',{timeout:60000});
    const simulation=await page.evaluate(()=>studioProbe.request('simulator-snapshot'));
    evidence.simulation=simulation;
    await selectContext(page,'microbit');
    await clickVisible(page.locator('#compile'));
    await expect(page.locator('#compile-result')).toContainText('Compilación lista',{timeout:60000});
    await expect(page.locator('#compile-result')).toContainText('binary.hex');
    evidence.offlineNativeHexGenerated=true;
    evidence.physicalBoardValidated=false;
    await selectContext(page,'2d');
    await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
    await page.evaluate(()=>studioProbe.project.flush());
    // F4: this context is created and edited only after the cold browser restart,
    // with all six HTTP servers already confirmed down.
    await page.locator('#authoring-context').selectOption('microbit');
    await clickVisible(page.locator('#enable-device'));
    await expect(page.locator('#run-device')).toBeEnabled();
    const number=page.locator('#device-blockly-editor [data-id="device-number"]').getByRole('button',{name:/Edit number:/});
    await number.dblclick({timeout:10000});await page.locator('.blocklyHtmlInput').fill('3');await page.locator('.blocklyHtmlInput').press('Enter');
    await expect(page.locator('#device-generated-source')).toHaveValue(/basic.showNumber\(3\)/);
    await clickVisible(page.locator('#run-device'));await expect(page.locator('#device-status')).toContainText('Escena y dispositivo activos',{timeout:60000});
    const buttonA=page.frameLocator('#runner-slot iframe').frameLocator('iframe').getByRole('button',{name:'A',exact:true});
    await clickVisible(buttonA);await expect(page.locator('#device-status')).toContainText('Botón A → microbit-A');
    await clickVisible(page.locator('#compile-device'));await expect(page.locator('#download-device')).toBeEnabled({timeout:60000});
    const hexDownload=page.waitForEvent('download');await clickVisible(page.locator('#download-device'));const coldHex=await hexDownload;
    await coldHex.saveAs(artifactPath('offline-device-universal.hex'));
    evidence.offlineDevice={state:await page.evaluate(()=>studioProbe.device.state()),source:await page.locator('#device-generated-source').inputValue(),hexFile:coldHex.suggestedFilename()};
    await clickPreparedControl(page,'#stop-result');await expect(page.locator('#run-editor')).toBeEnabled();
    await page.evaluate(()=>studioProbe.project.flush());
    await page.locator('#authoring-context').selectOption('2d');
    // F5: import/decode and portable reopen use the prepared local worker and codec
    // in this fresh Chromium process, still with every HTTP server down.
    await page.locator('#authoring-context').selectOption('sb3');
    await page.locator('#import-sb3').setInputFiles(resolve('tests/fixtures/sb3/16-transparent.sb3'));
    await expect(page.locator('#run-sb3')).toBeEnabled();
    await clickVisible(page.locator('#run-sb3'));
    await expect(page.locator('#status')).toHaveText('Proyecto Scratch activo');
    await expect.poll(async () => (await settled(snapshot, page)).targets.find(target=>target.isOriginal)?.x).toBe(6);
    expect((await snapshot(page)).mode).toBe('compatibility');
    await selectContext(page,'sb3');
    await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
    const portable=await page.evaluate(async()=>Array.from(await studioProbe.project.exportArchive()));
    const resourcesBefore=await page.evaluate(()=>studioProbe.resourceStore.capture());
    await page.evaluate(bytes=>studioProbe.project.openArchive(new Uint8Array(bytes)),portable);
    expect(await page.evaluate(()=>studioProbe.resourceStore.capture())).toEqual(resourcesBefore);
    expect((await snapshot(page)).x).toBe(0);
    await page.locator('#authoring-context').selectOption('sb3');
    await expect(page.locator('#run-sb3')).toBeEnabled();await clickVisible(page.locator('#run-sb3'));
    await expect(page.locator('#status')).toHaveText('Proyecto Scratch activo');
    await expect.poll(async () => (await settled(snapshot, page)).targets.find(target=>target.isOriginal)?.x).toBe(6);
    evidence.offlineResources={version:resourcesBefore.version,sourceAssetId:await page.evaluate(()=>studioProbe.resourcesUI.reference()),snapshot:await snapshot(page),portableBytes:portable.length};
    await selectContext(page,'sb3');
    await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();
    await page.locator('#authoring-context').selectOption('2d');
    expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(variantBlocks);
    // F6 contexts are first authored after a genuine cold restart with six roles offline.
    const contextResults={};
    for(const id of ['scene3d','webapp']){
      await page.locator('#authoring-context').selectOption(id);
      const surface=page.locator('#'+id+'-authoring');
      await clickVisible(surface.getByRole('button',{name:id==='scene3d'?'Añadir escena 3D':'Añadir aplicación web',exact:true}));
      await clickVisible(page.getByRole('button',{name:'Crear copia Python',exact:true}));
      await clickVisible(page.getByRole('button',{name:id==='scene3d'?'Ejecutar escena 3D':'Ejecutar aplicación web',exact:true}));
      await expect.poll(()=>page.evaluate(()=>studioProbe.capabilityExecution.state().contextId),{timeout:60000}).toBe(id);
      if(id==='scene3d')await expect.poll(()=>page.evaluate(async()=>(await studioProbe.capabilityExecution.snapshot())?.entities.find(e=>e.id==='sphere').local.position.x)).toBe(1);
      else{const app=page.frameLocator('iframe[title="Aplicación web"]');await app.getByLabel('Nombre').fill('Sin conexión');await clickVisible(app.getByRole('button',{name:'Añadir',exact:true}));await expect(app.getByRole('listitem')).toHaveText('Sin conexión');}
      contextResults[id]=await page.evaluate(()=>studioProbe.capabilityExecution.snapshot());
      await clickVisible(page.getByRole('button',{name:'Detener',exact:true}));await expect(page.locator('#run-editor')).toBeEnabled();
    }
    const contextArchive=await page.evaluate(async()=>Array.from(await studioProbe.project.exportArchive()));
    const contextAuthoring=await page.evaluate(()=>({scene3d:studioProbe.capabilityUI.capture('scene3d'),webapp:studioProbe.capabilityUI.capture('webapp'),resources:studioProbe.resourceStore.capture()}));
    await page.evaluate(bytes=>studioProbe.project.openArchive(new Uint8Array(bytes)),contextArchive);
    expect(await page.evaluate(()=>({scene3d:studioProbe.capabilityUI.capture('scene3d'),webapp:studioProbe.capabilityUI.capture('webapp'),resources:studioProbe.resourceStore.capture()}))).toEqual(contextAuthoring);
    expect(await page.evaluate(()=>studioProbe.capabilityExecution.snapshot())).toBeNull();
    evidence.offlineContexts={results:contextResults,archiveBytes:contextArchive.length,roundtrip:true};
    await page.locator('#authoring-context').selectOption('2d');
    evidence.offlineState=await snapshot(page);
    evidence.phases.push('new Chromium process without servers','recovered without autorun','real block edits and activity complete','QuickJS executed','Pyodide executed','PXT simulator executed');
    expect(evidence.requests.filter(item=>/^https?:/.test(item.url)&&new URL(item.url).hostname!=='127.0.0.1')).toEqual([]);
    const resources=evidence.requests.filter(item=>/^http:/.test(item.url)&&!['/','/offline-sw.js','/offline/service-worker.mjs','/offline/contracts.mjs','/offline/store.mjs','/offline/cache-engine.mjs'].includes(new URL(item.url).pathname));
    expect(resources.every(item=>new URL(item.url).pathname.startsWith(first.releaseBase))).toBe(true);
    expect(evidence.errors).toEqual([]);
    await page.screenshot({path:artifactPath('offline-second-visit.png'),fullPage:true});
  } finally {
    await browserContext?.close();await server?.stop();
    await writeFile(artifactPath('offline-second-visit.json'),JSON.stringify(evidence,null,2));
  }
});

