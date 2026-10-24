import {selectContext,clickVisible,revealPanel} from './workspace-controls.mjs';
import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deflateSync} from 'node:zlib';
import JSZip from 'jszip';
import {artifactPath} from './artifacts.mjs';
import {crc32} from '../../src/contracts/sb3-archive.mjs';
import {sanitizePngContainer} from '../../src/contracts/media-png.mjs';

const fixture=await readFile(new URL('../fixtures/sb3/01-start.sb3',import.meta.url));
const goodSvg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="blue"/></svg>');
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const exportAuthoring=page=>page.evaluate(async()=>{const model=JSON.parse(await studioProbe.project.export());delete model.project.updatedAt;return model;});
const state=page=>page.evaluate(()=>studioProbe.state());
// Controls in menus or consultation panels are revealed as a learner would.
async function click(page,selector){await clickVisible(page,page.locator(selector));}
async function open(page){
 await page.goto('/');await expect(page.locator('#run-editor')).toBeEnabled();
 await page.evaluate(()=>studioProbe.project.ready());
 await revealPanel(page,page.locator('#resources-panel'));if(!await page.locator('#resources-panel').evaluate(node=>node.open))await clickVisible(page.locator('#resources-panel > summary'));
}
async function live(page){
 const field=page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
 await selectContext(page,'2d');
 await field.dblclick();await page.locator('.blocklyHtmlInput').fill('6');await page.locator('.blocklyHtmlInput').press('Enter');
 await expect(field).toHaveText('6');
 await click(page,'#run-editor');await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
 await expect.poll(async()=>(await snapshot(page)).x).toBe(18);
 await page.evaluate(()=>{window.resourceSafetyGG=GG;});
 await page.evaluate(()=>studioProbe.project.flush());
 return {authoring:await exportAuthoring(page),runtime:await snapshot(page),session:(await state(page)).sessionId};
}
async function unchanged(page,before,x=before.runtime.x){
 expect(await exportAuthoring(page)).toEqual(before.authoring);
 expect((await state(page)).sessionId).toBe(before.session);
 const current=await snapshot(page);
 expect(current.revision).toBe(before.runtime.revision);expect(current.x).toBe(x);expect(current.mode).not.toBe('compatibility');
 // This is the original authenticated GG object, captured before the failed
 // import. A working mutator proves that no hidden reset replaced its session.
 await page.evaluate(()=>resourceSafetyGG.sprite.move('hero',1));
 await expect.poll(async()=>(await snapshot(page)).x).toBe(x+1);
}
async function idle(page){
 await expect.poll(()=>page.evaluate(()=>studioProbe.resourcesUI.state().busy)).toBe(false);
 await expect(page.locator('#cancel-resource-work')).toBeHidden();
}
function png({filter=0}={}){
 const chunk=(type,data=Buffer.alloc(0))=>{const result=Buffer.alloc(data.length+12);result.writeUInt32BE(data.length);result.write(type,4);data.copy(result,8);result.writeUInt32BE(crc32(result.subarray(4,-4)),result.length-4);return result;};
 const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.from([filter,0,80,220,255]))),chunk('IEND')]);
}
async function media(page,name,buffer,mimeType='application/octet-stream'){
 await page.locator('#import-media').setInputFiles({name,mimeType,buffer});
 await expect(page.locator('#import-media')).toHaveValue('');await idle(page);
}
async function scratch(page,name,buffer){
 await page.locator('#authoring-context').selectOption('sb3');
 await page.locator('#import-sb3').setInputFiles({name,mimeType:'application/zip',buffer});
 await expect(page.locator('#import-sb3')).toHaveValue('');await idle(page);
}
let pageErrors=[];
test.beforeEach(async({page})=>{pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));});
test.afterEach(()=>{expect(pageErrors,'Unhandled product errors').toEqual([]);});

test('GG-ASSET/SB3: invalid SVG, decoded PNG, WAV, ZIP structure and source quotas preserve live authoring',async({page})=>{
 await open(page);const before=await live(page),rejected=[];let x=before.runtime.x;
 await revealPanel(page,page.locator('#resource-name'));await page.locator('#resource-name').fill('Borrador');
 const badPng=png({filter:5});
 expect(sanitizePngContainer(badPng).expectedInflatedBytes).toBe(5);
 for(const [name,bytes,kind]of [
  ['active.svg',Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><script>globalThis.injected=true</script></svg>'),'media'],
  ['invalid-filter.png',badPng,'media'],
  ['truncated.wav',Buffer.from('RIFF0000WAVEfmt '),'media'],
  ['truncated.sb3',Buffer.from([80,75,3,4]),'scratch'],
  ['source-quota.sb3',Buffer.alloc(262145),'scratch']
 ]){
  if(kind==='media')await media(page,name,bytes);else await scratch(page,name,bytes);
  await expect(page.locator('#resources-error'),name).not.toBeEmpty();
  if(name==='active.svg')await expect(page.locator('#resource-name')).toHaveValue('Borrador');
  const message=await page.locator('#resources-error').textContent();await unchanged(page,before,x++);
  rejected.push({name,message});
 }
 const malformed=await JSZip.loadAsync(fixture);
 malformed.file('project.json',JSON.stringify({targets:'not-an-array',monitors:[],extensions:[],meta:{semver:'3.0.0'}}),{createFolders:false});
 await scratch(page,'invalid-project.sb3',await malformed.generateAsync({type:'nodebuffer',compression:'STORE'}));
 await expect(page.locator('#resources-error')).not.toBeEmpty();await unchanged(page,before,x++);
 expect(await page.evaluate(()=>globalThis.injected??false)).toBe(false);
 await writeFile(artifactPath('resource-safety-rejections.json'),JSON.stringify({rejected,malformedProjectRejected:true,authoringPreserved:true,originalSessionStillLive:true,finalX:x},null,2)+'\n');
});

test('GG-ASSET: cancelling a delayed real worker bootstrap never commits or executes an import',async({page})=>{
 let release,entered=false;const gate=new Promise(resolve=>{release=resolve;});
 await page.context().route('**/app/targets/assets/asset-worker.mjs',async route=>{entered=true;await gate;await route.continue().catch(()=>{});});
 await open(page);const before=await live(page);
 await page.locator('#authoring-context').selectOption('sb3');
 const importing=page.locator('#import-sb3').setInputFiles({name:'cancelled.sb3',mimeType:'application/zip',buffer:fixture});
 try{
  await expect.poll(()=>entered).toBe(true);await expect(page.locator('#cancel-resource-work')).toBeVisible();await click(page,'#cancel-resource-work');
 }finally{release();}
 await importing;await idle(page);await expect(page.locator('#import-sb3')).toHaveValue('');
 await expect(page.locator('#resources-status')).toHaveText('Preparación cancelada · proyecto conservado');
 await expect(page.locator('#resources-error')).toBeEmpty();await unchanged(page,before);
 await expect(page.locator('#run-sb3')).toBeDisabled();
});

for(const action of ['cancel','edit'])test('GG-ASSET: '+action+' after the real worker result revokes commit before project replacement',async({page})=>{
 await page.addInitScript(()=>{
  window.resourceSafetyGate={completed:false,release:null};
  window.resourceSafetyAfterWorker=()=>new Promise(resolve=>{resourceSafetyGate.completed=true;resourceSafetyGate.release=resolve;});
 });
 await page.route('**/app/studio/resources-ui.mjs',async route=>{
  const response=await route.fetch(),source=await response.text();
  const needle="    const result=await processor.process('import-sb3',{bytes,resources:await baseResources()});";
  expect(source.includes(needle),'Instrument the actual post-worker boundary').toBe(true);
  await route.fulfill({response,body:source.replace(needle,needle+'\n    await globalThis.resourceSafetyAfterWorker();')});
 });
 await open(page);const before=await live(page);
 await page.locator('#authoring-context').selectOption('sb3');
 await page.locator('#import-sb3').setInputFiles({name:'late-worker.sb3',mimeType:'application/zip',buffer:fixture});
 await page.waitForFunction(()=>resourceSafetyGate.completed);
 await expect(page.locator('#cancel-resource-work')).toBeVisible();
 let expected=before;
 if(action==='cancel'){
  await revealPanel(page,page.locator('#cancel-resource-work'));await page.locator('#cancel-resource-work').focus();await revealPanel(page,page.locator('#cancel-resource-work'));await page.locator('#cancel-resource-work').press('Enter');
 }
 else{
  await page.locator('#authoring-context').selectOption('2d');
  const field=page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await selectContext(page,'2d');
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill('7');await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(field).toHaveText('7');
  await page.evaluate(()=>studioProbe.project.flush());
  expected={...before,authoring:await exportAuthoring(page)};
  expect(expected.authoring.authoring.blockly).not.toEqual(before.authoring.authoring.blockly);
 }
 await page.evaluate(()=>resourceSafetyGate.release());
 await expect(page.locator('#import-sb3')).toHaveValue('');await idle(page);
 if(action==='cancel')await expect(page.locator('#import-sb3')).toBeFocused();
 await expect(page.locator('#resources-error')).toContainText('El proyecto cambió durante la preparación');
 await unchanged(page,expected);
 expect(await page.evaluate(()=>studioProbe.resourcesUI.reference())).toBe('');
 await expect(page.locator('#run-sb3')).toBeDisabled();
});

test('GG-ASSET/GGPROJ: PNG with correct SHA, ZIP CRC and allowed container is rejected before opening when pixels are invalid',async({page})=>{
 await open(page);await media(page,'valid.svg',goodSvg,'image/svg+xml');
 await expect(page.locator('#resources-error')).toBeEmpty();
 const before=await live(page);
 const original=Uint8Array.from(await page.evaluate(async()=>[...await studioProbe.project.exportArchive()]));
 const archive=await JSZip.loadAsync(original,{checkCRC32:true}),manifest=JSON.parse(await archive.file('manifest.json').async('string'));
 expect(manifest.resources.version).toBe(1);
 const bytes=png({filter:5}),id=createHash('sha256').update(bytes).digest('hex'),entry='assets/'+id+'.png';
 expect(sanitizePngContainer(bytes).width).toBe(1);
 manifest.resources.assets[id]={entry,type:'Image',format:'png',encoding:'binary'};
 manifest.resources.integrity[id]={bytes:bytes.length,sha256:id};
 manifest.resources.costumes.push({id:'safety-invalid-png',ownerId:'hero',name:'PNG inválido',assetId:id,centerX:0,centerY:0,bitmapResolution:1});
 archive.file(entry,bytes,{createFolders:false});archive.file('manifest.json',JSON.stringify(manifest),{createFolders:false});
 const portable=await archive.generateAsync({type:'nodebuffer',compression:'STORE'});
 // The hostile archive really has internally matching ZIP checksums and SHA.
 const verified=await JSZip.loadAsync(portable,{checkCRC32:true});
 expect(createHash('sha256').update(await verified.file(entry).async('nodebuffer')).digest('hex')).toBe(id);
 await page.locator('#open-project').setInputFiles({name:'valid-hash-invalid-pixels.ggproj',mimeType:'application/zip',buffer:portable});
 await expect(page.locator('#open-project')).toHaveValue('');
 await expect(page.locator('#project-error')).toContainText(/PNG|filtro/);await unchanged(page,before);
 await writeFile(artifactPath('resource-safety-ggproj.json'),JSON.stringify({matchingSHA:id,zipCRCValid:true,containerValid:true,decodedPixelsRejected:true,authoringPreserved:true,originalSessionStillLive:true},null,2)+'\n');
});

test('GG-ASSET/GGPROJ: referenced Source SB3 with matching SHA and ZIP CRC is structurally validated before opening',async({page})=>{
 await open(page);await scratch(page,'valid-original.sb3',fixture);
 await expect(page.locator('#resources-error')).toBeEmpty();
 await page.locator('#authoring-context').selectOption('2d');
 const before=await live(page);
 const original=Uint8Array.from(await page.evaluate(async()=>[...await studioProbe.project.exportArchive()]));
 const archive=await JSZip.loadAsync(original,{checkCRC32:true}),manifest=JSON.parse(await archive.file('manifest.json').async('string'));
 const previous=manifest.capabilities.config['gg.sb3'].sourceAssetId;
 expect(manifest.resources.assets[previous].type).toBe('Source');
 const bytes=Buffer.from([80,75,3,4]),id=createHash('sha256').update(bytes).digest('hex'),entry='assets/'+id+'.sb3';
 archive.remove(manifest.resources.assets[previous].entry);
 delete manifest.resources.assets[previous];delete manifest.resources.integrity[previous];
 manifest.resources.assets[id]={entry,type:'Source',format:'sb3',encoding:'binary'};
 manifest.resources.integrity[id]={bytes:bytes.length,sha256:id};
 manifest.capabilities.config['gg.sb3'].sourceAssetId=id;
 archive.file(entry,bytes,{createFolders:false});archive.file('manifest.json',JSON.stringify(manifest),{createFolders:false});
 const portable=await archive.generateAsync({type:'nodebuffer',compression:'STORE'});
 const verified=await JSZip.loadAsync(portable,{checkCRC32:true});
 expect(createHash('sha256').update(await verified.file(entry).async('nodebuffer')).digest('hex')).toBe(id);
 await page.locator('#open-project').setInputFiles({name:'valid-hash-corrupt-source.ggproj',mimeType:'application/zip',buffer:portable});
 await expect(page.locator('#open-project')).toHaveValue('');
 await expect(page.locator('#project-error')).toContainText(/SB3|ZIP|truncado/);
 await unchanged(page,before);
 expect(await page.evaluate(()=>studioProbe.resourcesUI.reference())).toBe(previous);
 await writeFile(artifactPath('resource-safety-source.json'),JSON.stringify({matchingSHA:id,zipCRCValid:true,referencedSourceStructurallyInvalid:true,authoringPreserved:true,originalSessionStillLive:true},null,2)+'\n');
});

test('GG-ASSET/SB3: an original containing local MP3 stays inert and retains its coverage after GGPROJ reopen',async({page})=>{
 const scratchZip=await JSZip.loadAsync(fixture,{checkCRC32:true});
 const project=JSON.parse(await scratchZip.file('project.json').async('string'));
 // Opaque local MPEG bytes are deliberately outside the supported decoder
 // grammar. The product may preserve these only inside the original ZIP.
 const mp3=Buffer.concat([Buffer.from([73,68,51,4,0,0,0,0,0,0,255,251,144,100]),Buffer.alloc(413)]);
 const md5=createHash('md5').update(mp3).digest('hex'),mp3Path=md5+'.mp3';
 project.targets[1].sounds.push({name:'Medio MP3 no habilitado',assetId:md5,md5ext:mp3Path,dataFormat:'mp3'});
 scratchZip.file(mp3Path,mp3,{createFolders:false});
 scratchZip.file('project.json',JSON.stringify(project),{createFolders:false});
 const original=await scratchZip.generateAsync({type:'nodebuffer',compression:'STORE'}),sha=createHash('sha256').update(original).digest('hex');
 await open(page);
 const blocks=await page.evaluate(()=>studioProbe.editor.save());
 await scratch(page,'original-con-mp3.sb3',original);
 await expect(page.locator('#resources-error')).toBeEmpty();
 await expect(page.locator('#resources-status')).toHaveText('Autoría actualizada · sin ejecutar');
 await expect.poll(()=>page.evaluate(()=>studioProbe.resourcesUI.state().report?.status)).toBe('unsupported');
 await expect(page.locator('#sb3-coverage')).toContainText('asset:mp3');
 await expect(page.locator('#sb3-summary')).toContainText('Ejecución bloqueada');
 await expect(page.locator('#run-sb3')).toBeDisabled();
 await expect(page.locator('#copy-sb3-blocks')).toBeDisabled();
 const report=await page.evaluate(()=>studioProbe.resourcesUI.state().report);
 expect(report.candidate).toBeNull();expect(report.editable).toBeNull();
 expect(await page.evaluate(()=>studioProbe.resourcesUI.reference())).toBe(sha);
 expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
 expect((await snapshot(page)).mode).not.toBe('compatibility');expect((await snapshot(page)).x).toBe(0);
 const downloading=page.waitForEvent('download');await click(page,'#save-project');
 const saved=await downloading,portable=await readFile(await saved.path());
 await page.locator('#open-project').setInputFiles({name:'original-mp3.ggproj',mimeType:'application/zip',buffer:portable});
 await expect(page.locator('#open-project')).toHaveValue('');
 await expect(page.locator('#project-error')).toBeEmpty();
 await page.locator('#authoring-context').selectOption('sb3');
 await expect.poll(()=>page.evaluate(()=>studioProbe.resourcesUI.state().report?.status)).toBe('unsupported');
 expect(await page.evaluate(()=>studioProbe.resourcesUI.state().report)).toEqual(report);
 expect(await page.evaluate(()=>studioProbe.resourcesUI.reference())).toBe(sha);
 await expect(page.locator('#sb3-coverage')).toContainText('asset:mp3');
 await expect(page.locator('#run-sb3')).toBeDisabled();
 expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
 const reopened=await snapshot(page);expect(reopened.mode).not.toBe('compatibility');expect(reopened.x).toBe(0);
 const source=await page.evaluate(id=>studioProbe.resourceStore.capture().assets[id],sha);
 expect(source).toMatchObject({type:'Source',format:'sb3',encoding:'base64'});
 expect(Buffer.from(source.data,'base64')).toEqual(original);
 const originalDownload=page.waitForEvent('download');await click(page,'#download-original-sb3');
 const downloaded=await readFile(await(await originalDownload).path());
 expect(downloaded).toEqual(original);
 await writeFile(artifactPath('resource-safety-inert-mp3.json'),JSON.stringify({originalSHA:sha,reportPreserved:true,coverage:report.coverage,originalBytesPreserved:true,noAutorun:true,mp3Decoder:false},null,2)+'\n');
});
