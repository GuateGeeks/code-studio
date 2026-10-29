import {readFile,writeFile,mkdir,lstat} from 'node:fs/promises';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {releaseMaterialNames,validateSourceManifest,validateReleaseMaterialSet} from '../../src/contracts/release-materials.mjs';
import {collectSourcePlan,installedMetadataFiles,runtimePackages,packageRoot,runtimePackageFiles,upstreamPlans,upstreamFiles,treeDigest,digest} from './source-plan.mjs';
import {createSourceArchive,safeSourcePath} from './tar.mjs';
import {verifyReleaseSource} from './restore.mjs';
import {runtimeDependencyClosure} from './runtime-closure.mjs';
const json=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const recipe='workspace/guategeeks-code-studio/docs/release/BUILD.md';
const normalized=path=>path.split(sep).join('/');
async function sourceLock(projectRoot){return JSON.parse(await readFile(resolve(projectRoot,'release/source-lock.json'),'utf8'));}
async function licenseFiles(options,item){
 const root=packageRoot(options,item),files=await runtimePackageFiles(options,item);
 const result=files.filter(file=>/(?:^|\/)(?:LICENSE|LICENCE|NOTICE|COPYING|OFL|ThirdPartyNotice)(?:[.-][^/]*)?$/i.test(normalized(file))||normalized(file).endsWith('/lib/zlib/README'));
 if(item.name==='pyodide')return ['pyodide-314.0.7-MPL-2.0.txt','cpython-3.14.2-LICENSE.txt'].map(file=>resolve(options.projectRoot,'docs/licenses',file));
 if(!result.length)throw new Error('Required runtime license missing: '+item.name);
 if(item.name==='pako'&&!result.some(file=>normalized(file).endsWith('/lib/zlib/README')))throw new Error('Missing pako zlib notice');
 if(item.name==='scratch-render-fonts'&&!result.some(file=>file.endsWith('/OFL.txt')))throw new Error('Missing font notice');
 return result.sort();
}
export async function releaseMaterialInputs({projectRoot,workspaceRoot}){
 const options={projectRoot:resolve(projectRoot),workspaceRoot:resolve(workspaceRoot)},lock=await sourceLock(options.projectRoot),plan=await collectSourcePlan(options);
 const inputs=[...plan.map(item=>item.source),...await installedMetadataFiles(options),...(await runtimeDependencyClosure(options)).inputs];
 for(const item of runtimePackages)inputs.push(...await licenseFiles(options,item));
 for(const item of lock.prebuilts)inputs.push(resolve(options.workspaceRoot,item.source));
 return [...new Set(inputs)].sort();
}
async function runtimeNotices(options){
 let text=await readFile(resolve(options.projectRoot,'THIRD_PARTY_NOTICES'),'utf8');
 const components=[];
 for(const item of runtimePackages){
  const root=packageRoot(options,item),pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8')),texts=[];
  for(const file of await licenseFiles(options,item)){
   const bytes=await readFile(file),name=relative(root,file).startsWith('..')?relative(options.projectRoot,file):relative(root,file);
   texts.push({name:normalized(name),bytes:bytes.length,sha256:digest(bytes)});text+='\n\n===== '+pkg.name+' '+pkg.version+' / '+normalized(name)+' =====\n'+new TextDecoder('utf-8',{fatal:true}).decode(bytes)+'\n';
  }
  components.push({name:pkg.name,version:pkg.version,license:pkg.license??'See original font license files',sourceGroup:item.group,licenseFiles:texts});
 }
 for(const [name,path] of [['Xcratch integrated VM/render/SVG','xcratch-scratch-editor/LICENSE'],['PXT target third-party notices','pxt-microbit/THIRD-PARTY-NOTICES.txt'],['PXT Core third-party notices','.tools/pxt-core-source/ThirdPartyNotice']]){
  const bytes=await readFile(resolve(options.workspaceRoot,path));text+='\n\n===== '+name+' =====\n'+new TextDecoder('utf-8',{fatal:true}).decode(bytes)+'\n';
 }
 const closure=await runtimeDependencyClosure(options),direct=new Set(components.map(item=>item.name+'@'+item.version));
 text+='\n\nAlcance transitivo: '+closure.scope+'\n';
 for(const pkg of closure.packages){if(direct.has(pkg.name+'@'+pkg.version))continue;text+='\n===== '+pkg.name+' '+pkg.version+' / '+pkg.license+' =====\n'+pkg.noticeStatus+'\n';for(const file of pkg.texts)text+='\n--- '+file.name+' ---\n'+new TextDecoder('utf-8',{fatal:true}).decode(file.bytes)+'\n';}
 return {text,components,closure:{scope:closure.scope,packages:closure.packages.map(({texts,...pkg})=>({...pkg,licenseFiles:texts.map(({bytes,...file})=>({...file,bytes:bytes.length}))}))}};
}
async function sbom(options,runtimeComponents){
 const packages=[],locksByRoot=new Map();
 for(const root of [options.projectRoot,resolve(options.workspaceRoot,'xcratch-scratch-editor'),resolve(options.workspaceRoot,'pxt-microbit')])locksByRoot.set(root,JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8')));
 for(const file of await installedMetadataFiles(options)){
  const pkg=JSON.parse(await readFile(file,'utf8'));
  const group=file.startsWith(options.projectRoot+'/')?'product':file.startsWith(resolve(options.workspaceRoot,'xcratch-scratch-editor')+'/')?'xcratch':'microbit';
  const root=group==='product'?options.projectRoot:resolve(options.workspaceRoot,group==='xcratch'?'xcratch-scratch-editor':'pxt-microbit');
  const path=normalized(relative(root,dirname(file))),locked=locksByRoot.get(root).packages?.[path];
  packages.push({group,name:pkg.name??path,version:pkg.version??'unknown',license:pkg.license??'NOASSERTION',installationPath:path,resolved:locked?.resolved??null,integrity:locked?.integrity??null});
 }
 packages.sort((a,b)=>(a.group+'/'+a.installationPath).localeCompare(b.group+'/'+b.installationPath,'en'));
 return {schemaVersion:1,scope:'Conservative installed dependency universe; includes development and build tools. Not an exact browser runtime inventory.',runtimeComponents,packages,ownedContent:await ownedContent(options)};
}
// Project-owned media distributed with the Studio. The lock is the reviewed
// inventory; the bundle itself is generated from tools/resources at build time.
async function ownedContent(options){
 let lock;try{lock=JSON.parse(await readFile(resolve(options.projectRoot,'tools/resources/starter-library.lock.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw error;}
 if(lock.format!=='gg-starter-library-lock'||lock.license!=='CC0-1.0')throw new Error('Starter library lock not recognized');
 return [{name:'gg-starter-library',version:lock.version,license:lock.license,attribution:lock.attribution,generator:'tools/resources/starter-library.mjs',
  lock:'tools/resources/starter-library.lock.json',bundle:{path:'shell/starter-library.json',bytes:lock.bundle.bytes,sha256:lock.bundle.sha256},counts:lock.counts}];
}
function mapSources(item,bytes){
 const map=JSON.parse(Buffer.from(bytes).toString('utf8')),result=[];
 if(!Array.isArray(map.sources)||!Array.isArray(map.sourcesContent))throw new Error('Mapped source unavailable: '+item.path);
 for(let i=0;i<map.sources.length;i++){
  if(map.sourcesContent[i]===null||map.sourcesContent[i]===undefined)continue;
  let path=map.sources[i];if(typeof path!=='string'||typeof map.sourcesContent[i]!=='string')throw new Error('Invalid mapped source');
  while(path.startsWith('../'))path=path.slice(3);
  path=path.replace(/^\.\/+/,'').replaceAll('/node_modules/','/dependencies/');
  if(path.startsWith('node_modules/'))path='dependencies/'+path.slice(13);
  const marker=item.path.indexOf('/vendor-source/'),group=item.path.slice(0,marker+15),relativePath=item.path.slice(marker+15);
  // Keep each package namespace and original map location; repeated source paths must agree.
  const packageParts=relativePath.split('/'),packageLength=packageParts[1]?.startsWith('@')?3:2;
  const packagePrefix=packageParts.slice(0,packageLength).join('/');
  const output=group+packagePrefix+'/mapped-source/'+path;
  safeSourcePath(output);result.push({path:output,bytes:Buffer.from(map.sourcesContent[i]),kind:'source'});
 }
 return result;
}
export async function buildReleaseMaterials({projectRoot,workspaceRoot,outputRoot}){
 const options={projectRoot:resolve(projectRoot),workspaceRoot:resolve(workspaceRoot)},lock=await sourceLock(options.projectRoot);
 for(const item of runtimePackages){const expected=lock.runtimeSources?.find(entry=>entry.id===item.group+':'+item.name),root=packageRoot(options,item);if(!expected||await treeDigest(root,await runtimePackageFiles(options,item))!==expected.sha256)throw new Error('Runtime source integrity mismatch: '+item.name);}
 if(lock.schemaVersion!==1||process.version!==lock.toolchain.node)throw new Error('Release toolchain mismatch');
 const repositories=[];
 for(const plan of upstreamPlans){
  const expected=lock.repositories.find(item=>item.id===plan.id),root=resolve(options.workspaceRoot,plan.root);
  if(!expected||await treeDigest(root,await upstreamFiles(options.workspaceRoot,plan))!==expected.treeSha256)throw new Error('Upstream source integrity mismatch: '+plan.id);
  repositories.push({id:expected.id,origin:expected.origin,revision:expected.revision,version:expected.version,sourcePath:'workspace/'+plan.root,patches:plan.id==='microbit'?[{path:'workspace/guategeeks-code-studio/'+lock.patch.path,bytes:lock.patch.bytes,sha256:lock.patch.sha256}]:[]});
 }
 const sourceFiles=new Map(),add=item=>{
  safeSourcePath(item.path);if(item.bytes.length>32*1024*1024)throw new Error('Source file quota exceeded');
  const previous=sourceFiles.get(item.path);
  if(previous){if(!Buffer.from(previous.bytes).equals(Buffer.from(item.bytes)))throw new Error('Conflicting source path: '+item.path);return;}
  sourceFiles.set(item.path,item);
 };
 for(const item of await collectSourcePlan(options)){
  const bytes=await readFile(item.source);
  if(item.source.endsWith('.map')&&item.path.includes('/vendor-source/')){for(const source of mapSources(item,bytes))add(source);continue;}
  add({path:item.path,kind:item.kind,bytes});
 }
 const patch=sourceFiles.get('workspace/guategeeks-code-studio/'+lock.patch.path);
 if(!patch||patch.bytes.length!==lock.patch.bytes||digest(patch.bytes)!==lock.patch.sha256)throw new Error('Preserved upstream patch integrity mismatch');
 const prebuilts=[];
 for(const item of lock.prebuilts){
  const bytes=await readFile(resolve(options.workspaceRoot,item.source));
  if(bytes.length!==item.bytes||digest(bytes)!==item.sha256)throw new Error('Prebuilt integrity mismatch: '+item.source);
  add({path:item.path,bytes,kind:'prebuilt'});prebuilts.push({path:item.path,bytes:item.bytes,sha256:item.sha256,origin:item.origin,recipe:item.recipe,limitation:item.limitation});
 }
 const files=[...sourceFiles.values()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),archive=createSourceArchive(files),pkg=JSON.parse(await readFile(resolve(options.projectRoot,'package.json'),'utf8'));
 const locks=files.filter(item=>item.path.endsWith('/package-lock.json')).map(item=>({path:item.path,bytes:item.bytes.length,sha256:digest(item.bytes)}));
 const manifest=validateSourceManifest({schemaVersion:1,license:'AGPL-3.0-only',sourceArchive:{path:'source.tar.gz',bytes:archive.bytes.length,sha256:digest(archive.bytes),expandedBytes:archive.expandedBytes},entries:files.map(item=>({path:item.path,bytes:item.bytes.length,sha256:digest(item.bytes),kind:item.kind})),provenance:{product:{name:pkg.name,version:pkg.version,license:'AGPL-3.0-only'},toolchain:{node:lock.toolchain.node,npm:lock.toolchain.npm,platform:process.platform,arch:process.arch},repositories,locks,prebuilts},limitations:['Native DAL/CODAL C++ is not rebuilt; shipped HEX caches are verified precompiled inputs.','QuickJS/Pyodide WASM use pinned upstream precompiled packages; no fresh C/WASM rebuild claim.','Dependency installation needs pinned registry tarballs or explicitly declared shared installations.','Installed SBOM includes development/build tools and is not an exact browser module inventory.']});
 verifyReleaseSource(archive.bytes,manifest);
 const notices=await runtimeNotices(options),materials=new Map([
 ['source.tar.gz',archive.bytes],['source-manifest.json',json(manifest)],
 ['LICENSE',await readFile(resolve(options.projectRoot,'LICENSE'))],
 ['THIRD_PARTY_NOTICES.txt',Buffer.from(notices.text)],
 ['SBOM.json',json({...await sbom(options,notices.components),runtimeDependencyClosure:notices.closure})],
 ['index.html',Buffer.from('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Fuente y avisos · GuateGeeks</title><main><h1>Fuente y avisos</h1><p>GuateGeeks Code Studio · AGPL-3.0-only. Las dependencias conservan sus licencias.</p><ul>'+['source.tar.gz','source-manifest.json','LICENSE','THIRD_PARTY_NOTICES.txt','SBOM.json'].map(name=>'<li><a href="./'+name+'">'+name+'</a></li>').join('')+'</ul><p>La fuente incluye recetas y precompilados PXT verificados. No se afirma reconstrucción nativa C++ desde cero. SBOM incluye herramientas y desarrollo.</p></main></html>')]
 ]);
 await validateReleaseMaterialSet(materials);outputRoot=resolve(outputRoot);await mkdir(outputRoot,{recursive:true});
 const outputs=[];for(const name of releaseMaterialNames){const path=resolve(outputRoot,name);try{if((await lstat(path)).isSymbolicLink())throw new Error('Release output symlink forbidden');}catch(error){if(error.code!=='ENOENT')throw error;}await writeFile(path,materials.get(name));outputs.push(path);}
 return {outputs,metadata:{sourceArchiveSha256:manifest.sourceArchive.sha256,sourceArchiveBytes:archive.bytes.length,sourceManifestSha256:digest(materials.get('source-manifest.json')),sourceEntries:files.length,inventoryScope:'conservative-installed-including-dev',runtimeComponents:notices.components.length}};
}
