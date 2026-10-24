import {gzipSync} from 'node:zlib';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {installedOfflineRoles,installedOfflinePackIds,offlineRootPaths} from '../../src/offline/contracts.mjs';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export const encoded=value=>typeof value==='string'?Buffer.from(value):Buffer.from(value);
export async function standaloneFixture(){
 const root=await mkdtemp(join(tmpdir(),'gg-standalone-')),releaseRoot=join(root,'releases'),cohort='a'.repeat(64),base='/releases/'+cohort+'/';
 const origins=Object.fromEntries(installedOfflineRoles.map((role,index)=>[role+'Origin','http://127.0.0.1:'+(4360+index)]));
 const serve=await readFile(new URL('../../tools/export/serve.template.mjs',import.meta.url));
 const names=['@babylonjs/core','@babylonjs/loaders','quickjs-emscripten-core','@jitl/quickjs-wasmfile-release-sync','pyodide','pako'];
 const notices=Object.fromEntries(names.map((name,index)=>[name,{version:'1.0.'+index,license:'MIT',texts:[{name:'LICENSE',text:'License fixture '+name}]}]));
 const release={schemaVersion:2,cohort,rewriteVersion:1,origins,roles:{},packs:installedOfflinePackIds.map(id=>({id,version:'test-1',contentHash:digest(id),dependencies:[]}))};
 const materials=releaseMaterialsFixture();
 const manifests=new Map(),payloads=new Map();
 for(const role of installedOfflineRoles){
  const content=role==='shell'?{
   'app/export/bootstrap.mjs':'export const bootstrap=true;',
   'app/studio/capability-execution.mjs':'export const execution=true;',
   'app/offline/excluded.mjs':'export const offline=true;',
   'editor.bundle.js':'excluded editor bundle',
   'export-templates/index.html':'<!doctype html><script type="module" src="__BOOTSTRAP__"></script>',
   'export-templates/export.css':'body{color:#123}',
   'export-templates/serve.mjs.txt':serve,
   'export-templates/notices.json':JSON.stringify(notices),
   ...Object.fromEntries([...materials].map(([name,bytes])=>['export-templates/release/'+name,bytes])),
   'config.json':'{}'
  }:role==='language'?{
   'index.html':'<!doctype html><p>language fixture</p>',
   'app/targets/text/language-host.mjs':'export const host=true;',
   'vendor/quickjs-engine.bundle.mjs':'export const quickjs=true;',
   'vendor/quickjs/emscripten-module.wasm':Uint8Array.from([0,97,115,109]),
   'vendor/pyodide/pyodide.mjs':'export const pyodide=true;',
   'vendor/pyodide/pyodide.asm.wasm':Uint8Array.from([0,97,115,109,1]),
   'vendor/pyodide/python_stdlib.zip':'stdlib fixture',
   'config.json':'{}'
  }:{'index.html':'<!doctype html><p>'+role+' fixture</p>',['app/targets/'+role+'/host.mjs']:'export const renderer='+JSON.stringify(role)+';','config.json':'{}'};
  const entries=[];
  for(const [path,value]of Object.entries(content)){
   const bytes=encoded(value),file=join(releaseRoot,cohort,role,path);await mkdir(dirname(file),{recursive:true});await writeFile(file,bytes);
   entries.push({path,bytes:bytes.length,sha256:digest(bytes),contentType:path.endsWith('.json')?'application/json':'text/javascript',packs:['studio-core']});
   payloads.set(role+'/'+path,bytes);
  }
  const bootstrap=offlineRootPaths.map(path=>({path,bytes:0,sha256:digest(''),contentType:'text/javascript'}));
  const manifest={schemaVersion:2,cohort,role,entries,bootstrap,totalBytes:entries.reduce((n,e)=>n+e.bytes,0)};
  const raw=encoded(JSON.stringify(manifest)),path=join(releaseRoot,cohort,role,'manifest.json');await writeFile(path,raw);
  manifests.set(role,{manifest,raw});release.roles[role]={path:'manifest.json',sha256:digest(raw)};
 }
 const releasePath=join(releaseRoot,cohort,'shell/release.json');await writeFile(releasePath,JSON.stringify(release));
 return {root,releaseRoot,cohort,base,origins,release,releasePath,manifests,payloads,materials,cleanup:()=>rm(root,{recursive:true,force:true})};
}


// Small real tar/gzip fixture. It contains inert source/recipe data only;
// production archive construction and reproducibility have their own tests.
export function releaseMaterialsFixture(){
 const data=[
  ['workspace/guategeeks-code-studio/src/index.mjs','export const fixture=true;','source'],
  ['workspace/guategeeks-code-studio/LICENSE','AGPL-3.0-only test fixture','license'],
  ['workspace/guategeeks-code-studio/package-lock.json','{}','lock'],
  ['workspace/pxt-microbit/source.ts','// upstream fixture','source'],
  ['patches/pxt-local.patch','diff --git a/a b/a\n','patch'],
  ['BUILD.md','Verified fixture recipe; native prebuilt is not rebuilt from C++.','recipe'],
  ['prebuilt/native.hex',':00000001FF\n','prebuilt']
 ].map(([path,value,kind])=>({path,bytes:Buffer.from(value),kind}));
 const parts=[];
 for(const entry of data){
  const header=Buffer.alloc(512),write=(offset,length,value)=>header.write(value,offset,length,'ascii');
  write(0,100,entry.path);write(100,8,'0000644\0');write(108,8,'0000000\0');write(116,8,'0000000\0');write(124,12,entry.bytes.length.toString(8).padStart(11,'0')+'\0');write(136,12,'00000000000\0');header.fill(32,148,156);header[156]=48;write(257,6,'ustar\0');write(263,2,'00');const sum=header.reduce((n,v)=>n+v,0);write(148,8,sum.toString(8).padStart(6,'0')+'\0 ');
  parts.push(header,entry.bytes,Buffer.alloc((512-entry.bytes.length%512)%512));
 }
 parts.push(Buffer.alloc(1024));const tar=Buffer.concat(parts),archive=gzipSync(tar,{mtime:0});
 const entries=data.map(entry=>({path:entry.path,bytes:entry.bytes.length,sha256:digest(entry.bytes),kind:entry.kind})),find=path=>{const {bytes,sha256}=entries.find(entry=>entry.path===path);return{path,bytes,sha256};};
 const manifest={schemaVersion:1,license:'AGPL-3.0-only',sourceArchive:{path:'source.tar.gz',bytes:archive.length,sha256:digest(archive),expandedBytes:tar.length},entries,provenance:{product:{name:'guategeeks-code-studio',version:'0.0.0',license:'AGPL-3.0-only'},toolchain:{node:'22.23.4',npm:'10.9.9',platform:'linux',arch:'x64'},repositories:[{id:'pxt-microbit',origin:'https://github.com/microsoft/pxt-microbit',revision:'fixture-commit',version:'9.1.1',sourcePath:'workspace/pxt-microbit',patches:[find('patches/pxt-local.patch')]}],locks:[find('workspace/guategeeks-code-studio/package-lock.json')],prebuilts:[{...find('prebuilt/native.hex'),origin:'https://github.com/microsoft/pxt-microbit',recipe:'BUILD.md',limitation:'Native C++ rebuild is not claimed.'}]},limitations:['Only reviewed fixture source data.']};
 return new Map([['index.html',Buffer.from('<!doctype html><html lang="es"><a href="source.tar.gz">Descargar fuente</a></html>')],['source.tar.gz',archive],['source-manifest.json',Buffer.from(JSON.stringify(manifest))],['LICENSE',Buffer.from('AGPL-3.0-only test fixture')],['THIRD_PARTY_NOTICES.txt',Buffer.from('Third-party fixture licenses remain unchanged.')],['SBOM.json',Buffer.from(JSON.stringify({bomFormat:'CycloneDX',specVersion:'1.6',version:1,components:[]}))]]);
}
