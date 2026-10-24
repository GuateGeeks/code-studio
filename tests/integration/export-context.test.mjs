import {releaseMaterialNames} from '../../src/contracts/release-materials.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {exportStandaloneContext} from '../../src/export/export-context.mjs';
import {createStoredPackage,readStoredPackage} from '../../src/export/stored-package.mjs';
import {createStandaloneRuntime} from '../../tools/build/standalone-package.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {defaultScene3DConfig} from '../../src/contracts/scene3d-program.mjs';
import {defaultWebAppConfig} from '../../src/contracts/webapp-program.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';
import {prepareAsset,validateResources2} from '../../src/contracts/resources.mjs';
import {standaloneFixture,digest} from '../helpers/standalone-fixture.mjs';
const text=bytes=>new TextDecoder().decode(bytes);
function input(contextId,mode='blocks'){
 const contextConfig=contextId==='scene3d'?defaultScene3DConfig():defaultWebAppConfig();
 const selected=createTextDocument({language:mode==='python'?'python':'javascript',name:'Seleccionado',source:'print("test")'});
 const unrelated=createTextDocument({language:'javascript',name:'Ajeno',source:'console.log("not exported")'});
 if(mode!=='blocks'){contextConfig.mode=mode;contextConfig.selectedTextDocumentId=selected.id;}
 return {contextConfig,capabilities:createCapabilities([contextId==='scene3d'?'gg.3d-basic':'gg.webapps']),resources:{version:2,assets:{},integrity:{},bindings:[]},textDocuments:[selected,unrelated]};
}
function transport(f,runtime,{release=f.release,type='application/zip'}={}){
 const calls=[];return {calls,fetchImpl:async path=>{calls.push(path);if(path===f.base+'release.json')return new Response(JSON.stringify(release),{headers:{'Content-Type':'application/json'}});
  assert.match(path,new RegExp('^/standalone-runtime/'+f.cohort+'/'));
  return new Response(runtime,{headers:{'Content-Type':type}});
 }};
}
for(const contextId of ['scene3d','webapp'])for(const mode of ['blocks','javascript','python'])test('GG-EXPORT verified authoring export '+contextId+'/'+mode+' selects its runtime and preserves source inputs',async t=>{
 const f=await standaloneFixture();t.after(f.cleanup);
 const language=mode==='blocks'?'javascript':mode,authoring=input(contextId,mode),before=structuredClone(authoring);
 const runtime=await createStandaloneRuntime({releaseRoot:f.releaseRoot,cohort:f.cohort,contextId,language}),network=transport(f,runtime);
 const result=await exportStandaloneContext({config:{cohort:f.cohort},contextId,authoring,fetchImpl:network.fetchImpl}),files=new Map(readStoredPackage(result));
 assert.deepEqual(authoring,before);assert.equal(network.calls[0],f.base+'release.json');assert.equal(network.calls.length,2);
 const standalone=JSON.parse(text(files.get('standalone.json'))),manifest=JSON.parse(text(files.get('package-manifest.json')));
 assert.equal(standalone.contextId,contextId);assert.equal(manifest.language,language);assert.equal(manifest.sourceCohort,f.cohort);
 assert.equal(standalone.authoring.textDocuments.length,mode==='blocks'?0:1);
 if(mode!=='blocks')assert.equal(standalone.authoring.textDocuments[0].id,authoring.contextConfig.selectedTextDocumentId);
 assert.equal(manifest.files.length,files.size-1);
 for(const entry of manifest.files){assert.equal(files.get(entry.path).length,entry.bytes);assert.equal(digest(files.get(entry.path)),entry.sha256);}
 assert.match(text(files.get('README.txt')),new RegExp(language==='python'?'Pyodide314.0.7':'QuickJS0.32.0'));
 for(const name of releaseMaterialNames)assert.deepEqual(files.get('release/'+name),Uint8Array.from(f.materials.get(name)));
 assert.equal([...files.keys()].filter(path=>path.endsWith('source.tar.gz')).length,1);
 assert.ok(![...files.keys()].some(path=>path.startsWith('source-templates/release/')));
 assert.match(text(files.get('README.txt')),/release\/index\.html/);
});

test('GG-EXPORT runtime verification rejects self-consistent CRC archives with foreign cohort/language, omissions, extra code or altered templates',async t=>{
 const f=await standaloneFixture();t.after(f.cleanup);const contextId='webapp',authoring=input(contextId),before=structuredClone(authoring);
 const runtime=await createStandaloneRuntime({releaseRoot:f.releaseRoot,cohort:f.cohort,contextId,language:'javascript'}),original=readStoredPackage(runtime);
 const variants=[
  ['source-missing',files=>files.delete('source-templates/release/source.tar.gz')],
  ['source-tamper',files=>files.set('source-templates/release/source.tar.gz',new Uint8Array([31,139]))],
  ['source-extra',files=>files.set('source-templates/release/evil.mjs',new TextEncoder().encode('export const x=1;'))],
  ['source-inventory',files=>files.set('source-templates/release/source-manifest.json',new TextEncoder().encode('{}'))],
  ['source-license',files=>files.delete('source-templates/release/LICENSE')],
  ['cohort',files=>{const source=JSON.parse(text(files.get('source-runtime.json')));source.cohort='b'.repeat(64);files.set('source-runtime.json',new TextEncoder().encode(JSON.stringify(source)));}],
  ['language',files=>{const source=JSON.parse(text(files.get('source-runtime.json')));source.language='python';files.set('source-runtime.json',new TextEncoder().encode(JSON.stringify(source)));}],
  ['inventory',files=>{const source=JSON.parse(text(files.get('source-runtime.json')));source.files[0].sha256='0'.repeat(64);files.set('source-runtime.json',new TextEncoder().encode(JSON.stringify(source)));}],
  ['missing',files=>files.delete([...files.keys()].find(path=>path.includes('/vendor/quickjs/')))],
  ['extra',files=>files.set('evil.mjs',new TextEncoder().encode('globalThis.evil=true;'))],
  ['foreign-role',files=>files.set('source-manifests/runner.json',new TextEncoder().encode('{}'))],
  ['mixed-file',files=>files.set('roles/language/releases/'+'b'.repeat(64)+'/evil.mjs',new TextEncoder().encode('export const mixed=true;'))],
  ['payload',files=>files.set([...files.keys()].find(path=>path.endsWith('language-host.mjs')),new TextEncoder().encode('export const tampered=true;'))],
  ['index',files=>files.set('index.html',new TextEncoder().encode('<script src="/evil.mjs"></script>'))],
  ['serve',files=>files.set('serve.mjs',new TextEncoder().encode('console.log("tampered");'))],
  ['template',files=>files.set('source-templates/export.css',new TextEncoder().encode('body{display:none}'))],
  ['manifest',files=>files.set('source-manifests/language.json',new TextEncoder().encode('{}'))]
 ];
 for(const [name,mutate]of variants){
  const files=new Map(structuredClone(original));mutate(files);const bytes=createStoredPackage([...files]);
  const network=transport(f,bytes);
  await assert.rejects(exportStandaloneContext({config:{cohort:f.cohort},contextId,authoring,fetchImpl:network.fetchImpl}),undefined,name);
  assert.deepEqual(authoring,before,name);
 }
 const wrong=structuredClone(f.release);wrong.cohort='b'.repeat(64);
 await assert.rejects(exportStandaloneContext({config:{cohort:f.cohort},contextId,authoring,fetchImpl:transport(f,runtime,{release:wrong}).fetchImpl}),/release/);
 await assert.rejects(exportStandaloneContext({config:{cohort:f.cohort},contextId,authoring,fetchImpl:transport(f,runtime,{type:'text/html'}).fetchImpl}),/type/);
 // A rejection must release the module's export lease.
 const recovered=await exportStandaloneContext({config:{cohort:f.cohort},contextId,authoring,fetchImpl:transport(f,runtime).fetchImpl});assert.ok(recovered.length);
});

test('GG-EXPORT resource selection retains only qualified selected-document assets and bindings',async t=>{
 const f=await standaloneFixture();t.after(f.cleanup);const contextId='webapp',authoring=input(contextId);
 const resources={version:2,assets:{},integrity:{},bindings:[]};
 for(const [index,color]of ['red','blue'].entries()){
  const asset=await prepareAsset(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="'+color+'"/></svg>'),{type:'Image',format:'svg'});
  resources.assets[asset.id]=asset.asset;resources.integrity[asset.id]=asset.integrity;
  resources.bindings.push({id:'image-'+index,owner:{contextId,documentId:index===0?authoring.contextConfig.documentId:'unselected',targetId:'image-'+index},role:'web.image',assetId:asset.id,name:'Image '+index,properties:{}});
 }
 authoring.resources=await validateResources2(resources);
 const runtime=await createStandaloneRuntime({releaseRoot:f.releaseRoot,cohort:f.cohort,contextId,language:'javascript'});
 const bytes=await exportStandaloneContext({config:{cohort:f.cohort},contextId,authoring,fetchImpl:transport(f,runtime).fetchImpl}),files=new Map(readStoredPackage(bytes));
 const selected=JSON.parse(text(files.get('standalone.json'))).authoring.resources;
 assert.deepEqual(selected.bindings,[resources.bindings[0]]);assert.deepEqual(Object.keys(selected.assets),[resources.bindings[0].assetId]);
 assert.equal(Object.keys(authoring.resources.assets).length,2);
});
