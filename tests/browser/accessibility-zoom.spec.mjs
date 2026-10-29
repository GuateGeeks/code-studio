import {selectContext,clickVisible,revealPanel} from './workspace-controls.mjs';
import {test,expect,chromium} from '@playwright/test';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const extensionPath=resolve(dirname(fileURLToPath(import.meta.url)),'../fixtures/browser-zoom');
const origin='http://127.0.0.1:4173';
async function dimensions(page){
 return page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,scrollWidth:document.documentElement.scrollWidth,devicePixelRatio,cssZoom:getComputedStyle(document.documentElement).zoom,bodyZoom:getComputedStyle(document.body).zoom}));
}
async function nativeZoom(worker,page,factor){
 const result=await worker.evaluate(args=>globalThis.zoomFixture.set(args),{url:page.url(),factor});
 expect(result.factor).toBeCloseTo(factor,8);
 const read=await worker.evaluate(args=>globalThis.zoomFixture.get(args),{url:page.url()});
 expect(read.factor).toBeCloseTo(factor,8);expect(read.tabId).toBe(result.tabId);return read;
}
async function reachable(page,locator,{enabled=true}={}){
 await locator.scrollIntoViewIfNeeded();await expect(locator).toBeVisible();if(enabled)await expect(locator).toBeEnabled();
 const box=await locator.boundingBox(),width=await page.evaluate(()=>innerWidth);
 expect(box).not.toBeNull();expect(box.width).toBeGreaterThan(0);expect(box.x).toBeGreaterThanOrEqual(-1);expect(box.x+box.width).toBeLessThanOrEqual(width+1);
}
async function noPageOverflow(page){
 const value=await dimensions(page);
 if(value.scrollWidth>value.innerWidth+1)console.log('ZOOM_OVERFLOW',JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(node=>{const r=node.getBoundingClientRect();return node instanceof HTMLElement&&r.width&&r.right>innerWidth+1&&getComputedStyle(node).visibility!=='hidden';}).map(node=>({tag:node.tagName,id:node.id,class:typeof node.className==='string'?node.className:null,width:node.getBoundingClientRect().width,right:node.getBoundingClientRect().right,text:node.textContent.slice(0,90)})).slice(0,45))));
 expect(value.scrollWidth).toBeLessThanOrEqual(value.innerWidth+1);
 // The native browser factor and layout change provide the evidence. Styling
 // the document must never become a fallback for genuine tab zoom.
 expect(['1','normal']).toContain(value.cssZoom);expect(['1','normal']).toContain(value.bodyZoom);return value;
}
async function liveFocus(page){
 expect(await page.evaluate(()=>{
  const element=document.activeElement;
  return Boolean(element&&element!==document.body&&element.isConnected&&!element.closest('[hidden]')&&element.getClientRects().length);
 })).toBe(true);
}
for(const size of [{name:'desktop',width:1280,height:960},{name:'mobile',width:390,height:900}]){
 test('GG-F7-ZOOM: real tab zoom 200/400%, controls, property caret and no global horizontal overflow ('+size.name+')',async({},testInfo)=>{
  test.setTimeout(180000);
  const profile=await mkdtemp(resolve(tmpdir(),'gg-real-zoom-')),evidence={profileKind:'temporary-test-only',browserChannel:'chromium',window:size,extension:'MV3 localhost-only',samples:[]};
  let context,page,worker,primaryError;
  try{
   context=await chromium.launchPersistentContext(profile,{
    channel:'chromium',headless:true,viewport:null,
    args:['--enable-unsafe-swiftshader','--window-size='+size.width+','+size.height,'--disable-extensions-except='+extensionPath,'--load-extension='+extensionPath]
   });
   worker=context.serviceWorkers().find(item=>item.url().startsWith('chrome-extension://'))??await context.waitForEvent('serviceworker',{predicate:item=>item.url().startsWith('chrome-extension://'),timeout:15000});
   page=context.pages()[0]??await context.newPage();await page.goto(origin+'/');
   // All controls act on the versioned navigation, never an unversioned /app.
   await expect(page).toHaveURL(new RegExp('^'+origin.replaceAll('.','\\.')+'/releases/[a-f0-9]{64}/'));
   await expect(page.locator('#run-editor')).toBeEnabled();
   await page.waitForFunction(()=>window.studioProbe?.project.state().ready);
   const windowSession=await context.newCDPSession(page),{windowId}=await windowSession.send('Browser.getWindowForTarget');
   await windowSession.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal',width:size.width,height:size.height}});await windowSession.detach();
   await nativeZoom(worker,page,1);
   const baseline=await noPageOverflow(page);evidence.baseline=baseline;
   // This is an actual narrow browser window, not touch/DPR/viewport emulation.
   expect(baseline.innerWidth).toBeLessThanOrEqual(size.width+1);
   const name=page.locator('#project-name'),selector=page.locator('#authoring-context');
   for(const factor of [2,4]){
    await reachable(page,selector);await expect(selector).toBeInViewport();await selector.selectOption('2d');await name.fill('Proyecto de zoom '+factor);await name.press('Home');await name.press('ArrowRight');await name.press('Shift+ArrowRight');
    const selection=await name.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection}));
    const reported=await nativeZoom(worker,page,factor);await expect(name).toBeFocused();
    expect(await name.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection}))).toEqual(selection);
    await expect.poll(async()=>Math.round((await dimensions(page)).innerWidth*factor)).toBeCloseTo(Math.round(baseline.innerWidth),-1);
    const layout=await noPageOverflow(page);expect(layout.innerWidth).toBeLessThan(baseline.innerWidth);
    await reachable(page,name);await expect(name).toHaveAccessibleName('Nombre del proyecto');
    for(const id of ['project-menu > summary','authoring-context','run-editor','stop-result'])await reachable(page,page.locator('#'+id));
    // PC-07: both continuity dimensions and the one real download remain
    // reachable with native keyboard interaction at the actual browser zoom.
    for(const id of ['project-status','project-copy-status'])await reachable(page,page.locator('#'+id),{enabled:false});
    const fileMenu=page.locator('#project-menu > summary');await fileMenu.focus();await fileMenu.press('Enter');
    const portable=page.locator('#save-project');await reachable(page,portable);
    await expect(portable).toHaveAccessibleName('Llevar o entregar');
    const copyAuthoring=await page.evaluate(()=>studioProbe.editor.save());
    const copyDownload=page.waitForEvent('download');await portable.focus();await portable.press('Enter');
    expect((await copyDownload).suggestedFilename()).toMatch(/\.ggproj$/);
    await expect.poll(()=>page.evaluate(()=>studioProbe.project.state().continuity.portable)).toBe('current');
    expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(copyAuthoring);
    await noPageOverflow(page);await portable.press('Escape');await expect(fileMenu).toBeFocused();
    await name.focus();await name.press('Tab');await expect(page.locator('#entry-toggle')).toBeFocused();
    await page.getByRole('link',{name:'Ir al programa',exact:true}).focus();await page.getByRole('link',{name:'Ir al programa',exact:true}).press('Enter');await expect(selector).toBeFocused();
    const before=await page.evaluate(()=>studioProbe.editor.save());
    await selectContext(page,'2d');
    await clickVisible(page.locator('#run-editor'));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
    await selectContext(page,'2d');
    await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-editor')).toBeEnabled();expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before);

    // Synced views retain keyboard exits and the rejected draft at real zoom.
    const jsView=page.locator('#program-mode input[value=javascript]');
    await reachable(page,jsView);await jsView.focus();await jsView.press('Space');
    const synchronizedSource=page.locator('#text-source');await expect(synchronizedSource).toBeEditable();
    await synchronizedSource.fill('onStart(() => {\n  while(true) {}\n});');
    await synchronizedSource.press('Home');await synchronizedSource.press('Shift+ArrowRight');
    const synchronizedCaret=await synchronizedSource.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd}));
    await selectContext(page,'text');await selectContext(page,'2d');
    expect(await synchronizedSource.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd}))).toEqual(synchronizedCaret);
    const blockView=page.locator('#program-mode input[value=blocks]');
    await reachable(page,blockView);await blockView.focus();await blockView.press('Space');
    await expect(page.locator('#text-error')).toContainText('Línea 2');
    for(const id of ['code-view-edit','code-view-restore','code-view-copy','run-editor','stop-result'])await reachable(page,page.locator('#'+id));
    await noPageOverflow(page);
    await page.screenshot({path:testInfo.outputPath('synced-rejection-'+size.name+'-'+factor+'00.png')});
    const keepEditing=page.locator('#code-view-edit');await keepEditing.focus();await keepEditing.press('Enter');await expect(synchronizedSource).toBeFocused();
    page.once('dialog',dialog=>dialog.accept());
    const restoreBlocks=page.locator('#code-view-restore');await restoreBlocks.focus();await restoreBlocks.press('Enter');
    await expect(blockView).toBeChecked();expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before);
    await selectContext(page,'microbit');
    if(await page.locator('#enable-device').isVisible())await clickVisible(page.locator('#enable-device'));
    await reachable(page,page.locator('#device-mode input:checked'));await page.locator('#device-mode input[value="typescript"]').check();
    const deviceSource=page.locator('#device-text-slot #source');await reachable(page,deviceSource);
    await deviceSource.fill('led.plot(2, 2)');await deviceSource.press('Home');await deviceSource.press('Shift+ArrowRight');
    const deviceCaret=await deviceSource.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd}));
    await deviceSource.press('Tab');await liveFocus(page);
    for(const id of ['run-device','stop-result'])await reachable(page,page.locator('#'+id));
    const firmware=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Firmware',exact:true});
    await reachable(page,firmware);await firmware.press('Enter');await expect(firmware).toHaveAttribute('aria-selected','true');await expect(page.locator('#device-firmware-heading')).toBeVisible();
    for(const id of ['device-variant','compile-device'])await reachable(page,page.locator('#'+id));
    const deviceLayout=await noPageOverflow(page);
    expect(await deviceSource.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd}))).toEqual(deviceCaret);
    expect(await page.evaluate(()=>studioProbe.device.state().simulation)).toBeNull();
    await selectContext(page,'sb3');
    for(const id of ['import-sb3','sb3-coverage-heading','stop-result'])await reachable(page,page.locator('#'+id));
    const scratchTools=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Original y copia',exact:true});
    await reachable(page,scratchTools);await scratchTools.press('Enter');await expect(scratchTools).toHaveAttribute('aria-selected','true');await expect(page.locator('#sb3-tools-heading')).toBeVisible();
    // Without an original there is nothing to download: the state note says so next to the import.
    await reachable(page,page.locator('#sb3-state'),{enabled:false});await expect(page.locator('#download-original-sb3')).toBeHidden();
    const scratchLayout=await noPageOverflow(page);
    await reachable(page,selector);await expect(selector).toBeInViewport();await selector.selectOption('scene3d');
    const surface=page.locator('#scene3d-authoring'),enable=surface.getByRole('button',{name:'Añadir escena 3D',exact:true});
    if(await enable.isVisible())await clickVisible(enable);
    await expect(page.locator('#scene3d-mode')).toBeVisible();
    const details=page.locator('#scene3d-objects');
    const objects=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Objetos 3D',exact:true});await reachable(page,objects);await objects.press('Enter');await expect(objects).toHaveAttribute('aria-selected','true');
    if(await details.getAttribute('open')===null)await clickVisible(details.locator('summary'));
    const property=page.locator('#scene3d-property-name');await reachable(page,property);await property.fill('Esfera al '+factor+'00 por ciento');await property.press('ArrowLeft');
    const caret=await property.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection}));
    await property.press('Enter');await expect(property).toBeFocused();expect(await property.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd,direction:input.selectionDirection}))).toEqual(caret);
    await reachable(page,page.getByRole('button',{name:'Aplicar propiedades',exact:true}));await property.focus();await liveFocus(page);
    for(const id of ['scene3d-run','stop-result'])await reachable(page,page.locator('#'+id));
    const propertiesLayout=await noPageOverflow(page);
    await selectContext(page,'webapp');
    const webEnable=page.getByRole('button',{name:'Añadir aplicación web',exact:true});if(await webEnable.isVisible())await clickVisible(webEnable);
    const webTools=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Componentes web',exact:true});await reachable(page,webTools);await webTools.press('Enter');await expect(webTools).toHaveAttribute('aria-selected','true');await expect(page.locator('#webapp-tools-heading')).toBeVisible();
    await revealPanel(page,page.locator('#webapp-object'));await page.locator('#webapp-object').selectOption('web-input');const webLabel=page.locator('#webapp-property-props-label');await reachable(page,webLabel);await webLabel.fill('Nombre al '+factor+'00 por ciento');await webLabel.press('ArrowLeft');const webCaret=await webLabel.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd}));await webLabel.press('Enter');await expect(webLabel).toBeFocused();expect(await webLabel.evaluate(input=>({start:input.selectionStart,end:input.selectionEnd}))).toEqual(webCaret);
    for(const id of ['webapp-run','stop-result'])await reachable(page,page.locator('#'+id));const webLayout=await noPageOverflow(page);
    await page.screenshot({path:testInfo.outputPath('real-zoom-'+size.name+'-'+factor+'00.png'),timeout:10000});
    evidence.samples.push({requestedFactor:factor,reportedFactor:reported.factor,layout,deviceLayout,deviceCaret,scratchLayout,propertiesLayout,propertyCaret:caret,webLayout,webCaret,cohort:new URL(page.url()).pathname.split('/')[2]});
   }
  }catch(error){primaryError=error;throw error;}
  finally{
   let restoreError;
   if(worker&&page&&!page.isClosed())try{const restored=await nativeZoom(worker,page,1);evidence.restoredFactor=restored.factor;}catch(error){restoreError=error;evidence.restoreError=String(error.message);}
   await writeFile(testInfo.outputPath('real-zoom-evidence.json'),JSON.stringify(evidence,null,2));
   await context?.close();await rm(profile,{recursive:true,force:true});
   if(restoreError&&!primaryError)throw restoreError;
  }
 });
}

