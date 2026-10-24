import {releaseMaterialNames,validateReleaseMaterialSet} from '../../src/contracts/release-materials.mjs';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {validateReleaseManifest,validateRoleManifest,releaseBase} from '../../src/offline/contracts.mjs';
import {createStoredPackage} from '../../src/export/stored-package.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function createStandaloneRuntime({releaseRoot,cohort,contextId,language}){
 if(!/^[a-f0-9]{64}$/.test(cohort)||!['scene3d','webapp'].includes(contextId)||!['javascript','python'].includes(language))throw new Error('Invalid standalone selection');
 const cohortRoot=resolve(releaseRoot,cohort),release=validateReleaseManifest(JSON.parse(await readFile(resolve(cohortRoot,'shell/release.json'),'utf8')));
 if(release.cohort!==cohort||release.schemaVersion!==2)throw new Error('Standalone release unavailable');
 const entries=[],sources=[],base=releaseBase(cohort),templates=new Map();
 for(const role of ['shell','language',contextId]){
  const manifestBytes=await readFile(resolve(cohortRoot,role,'manifest.json'));
  if(hash(manifestBytes)!==release.roles[role].sha256)throw new Error('Role manifest integrity mismatch');
  const manifest=validateRoleManifest(JSON.parse(manifestBytes),role,cohort);
  if(manifest.schemaVersion!==release.schemaVersion)throw new Error('Mixed standalone manifest versions');
  entries.push(['source-manifests/'+role+'.json',manifestBytes]);
  for(const entry of manifest.entries){
   if(entry.path==='config.json'||entry.path.startsWith('app/offline/')||entry.path.startsWith('offline-'))continue;
   if(role==='shell'&&!entry.path.startsWith('app/')&&!entry.path.startsWith('export-templates/'))continue;
   if(role==='language'&&entry.path.startsWith('vendor/')&&(language==='javascript'?entry.path.startsWith('vendor/pyodide/'):!entry.path.startsWith('vendor/pyodide/')))continue;
   const bytes=await readFile(resolve(cohortRoot,role,entry.path));
   if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new Error('Release payload integrity mismatch');
   if(entry.path.startsWith('export-templates/')){const name=entry.path.slice('export-templates/'.length);if(role!=='shell'||templates.has(name)||!['index.html','export.css','serve.mjs.txt','notices.json',...releaseMaterialNames.map(name=>'release/'+name)].includes(name))throw new Error('Unknown/foreign export template');templates.set(name,bytes);entries.push(['source-templates/'+name,bytes]);continue;}
   const path='roles/'+role+base+entry.path;entries.push([path,bytes]);sources.push({path,bytes:bytes.length,sha256:entry.sha256,role,sourcePath:entry.path});
  }
 }
 await validateReleaseMaterialSet(new Map(releaseMaterialNames.map(name=>[name,templates.get('release/'+name)])));
 const template=templates.get('index.html')?.toString('utf8');if(!template)throw new Error('Standalone templates absent');
 entries.push(['index.html',template.replace('__BOOTSTRAP__',base+'app/export/bootstrap.mjs')]);
 for(const [source,target]of [['export.css','export.css'],['serve.mjs.txt','serve.mjs']]){const bytes=templates.get(source);if(!bytes)throw new Error('Missing export template');entries.push([target,bytes]);}
 let notices='GuateGeeks Code Studio · runtime autónomo\nFuentes y versiones incluidas según source-runtime.json.\nFuente correspondiente local: release/index.html.\n\n';
 const noticeInventory=JSON.parse(templates.get('notices.json')?.toString('utf8')??'null');if(!noticeInventory)throw new Error('Runtime notices absent');
 for(const name of [contextId==='scene3d'?'@babylonjs/core':null,contextId==='scene3d'?'@babylonjs/loaders':null,language==='javascript'?'quickjs-emscripten-core':'pyodide',language==='javascript'?'@jitl/quickjs-wasmfile-release-sync':null,'pako'].filter(Boolean)){
  const pkg=noticeInventory[name];if(!pkg)throw new Error('Runtime notice absent');
  notices+=name+' '+pkg.version+' · '+pkg.license+'\n';
  for(const file of pkg.texts)notices+=file.text+'\n';
 }
 entries.push(['RUNTIME_NOTICES.txt',notices],['source-runtime.json',JSON.stringify({schemaVersion:1,cohort,contextId,language,sourceOrigins:release.origins,files:sources},null,2)]);
 return createStoredPackage(entries);
}
