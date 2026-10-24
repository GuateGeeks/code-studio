import {readFile,readdir,realpath,lstat} from 'node:fs/promises';
import {resolve,dirname,relative,sep} from 'node:path';
import {runtimePackages,packageRoot,digest} from './source-plan.mjs';
const normal=path=>path.split(sep).join('/');
async function locate(base,name,workspaceRoot){
 if(!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name))throw new Error('Invalid runtime dependency name');
 for(let root=base;;root=dirname(root)){
  const file=resolve(root,'node_modules',name,'package.json');
  try{await lstat(file);return dirname(file);}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;}
  if(root===workspaceRoot||dirname(root)===root)break;
 }return null;
}
export async function runtimeDependencyClosure(options){
 const roots=runtimePackages.map(item=>packageRoot(options,item));
 for(const name of ['scratch-vm','scratch-render','scratch-svg-renderer'])roots.push(resolve(options.workspaceRoot,'xcratch-scratch-editor/packages',name));
 const covered=new Set(await Promise.all(roots.map(root=>realpath(root)))),queue=[...roots],packages=new Map(),inputs=new Set();
 while(queue.length){
  const root=await realpath(queue.shift());if(packages.has(root))continue;
  if(!normal(root).startsWith(normal(options.workspaceRoot)+'/'))throw new Error('Runtime dependency outside declared workspace');
  const file=resolve(root,'package.json'),pkg=JSON.parse(await readFile(file,'utf8'));inputs.add(file);
  const names=(await readdir(root,{withFileTypes:true})).filter(entry=>entry.isFile()&&/^(?:LICENSE|LICENCE|NOTICE|COPYING|OFL|ThirdPartyNotice)(?:[.-]|$)/i.test(entry.name)).map(entry=>entry.name).sort();
  if(pkg.name==='pako'){
   try{await lstat(resolve(root,'lib/zlib/README'));names.push('lib/zlib/README');}catch(error){if(error.code!=='ENOENT'||pkg.version==='2.1.0')throw error;}
  }
  // Pyodide's published npm artifact omits its text; the reviewed copies are local.
  let licensePaths=pkg.name==='pyodide'?['pyodide-314.0.7-MPL-2.0.txt','cpython-3.14.2-LICENSE.txt'].map(name=>resolve(options.projectRoot,'docs/licenses',name)):names.map(name=>resolve(root,name));
  let noticeStatus='Original license/notice files';
  if(!licensePaths.length){
   const readme=(await readdir(root)).find(name=>/^readme(?:\.md|\.txt)?$/i.test(name));
   const path=readme&&resolve(root,readme),text=path?await readFile(path,'utf8'):'';
   if(!pkg.license)throw new Error('Runtime dependency license missing: '+pkg.name);
   licensePaths=[...(path?[path]:[]),resolve(root,'package.json')];noticeStatus='Published package supplies only a license declaration in README/metadata, without a standalone license text; originals preserved. Generic license variants are not inferred.';
  }
  if(/\b(?:A?GPL|LGPL)-/.test(pkg.license??'')&&!/\b(?:MIT|Apache|BSD|ISC)\b/.test(pkg.license??'')&&!covered.has(root))throw new Error('Unreviewed copyleft runtime source: '+pkg.name);
  const texts=[];for(const path of [...new Set(licensePaths)].sort()){const bytes=await readFile(path);inputs.add(path);texts.push({name:normal(relative(root,path)).startsWith('..')?normal(relative(options.projectRoot,path)):normal(relative(root,path)),bytes,sha256:digest(bytes)});}
  // PXT is shipped as reviewed compiler/simulator prebuilts, not its full editor.
  // Makefile WORKER_DEPS concatenates these third-party libraries.
  const dependencies=pkg.name==='pxt-core'?Object.fromEntries(['dompurify','lzma'].filter(name=>Object.hasOwn(pkg.dependencies??{},name)).map(name=>[name,'pinned by lock'])):pkg.name==='pxt-common-packages'?{}:{...pkg.dependencies,...pkg.optionalDependencies};
  packages.set(root,{name:pkg.name,version:pkg.version,license:pkg.license??'See original license files',installationPath:normal(relative(options.workspaceRoot,root)),noticeStatus,texts});
  for(const name of Object.keys(dependencies).sort()){
   if(['raw-loader','ify-loader','base64-loader','arraybuffer-loader'].includes(name))continue; // Reviewed webpack-only transforms; retained in installed SBOM.
   const dependency=await locate(root,name,options.workspaceRoot);
   if(!dependency){if(Object.hasOwn(pkg.optionalDependencies??{},name))continue;throw new Error('Runtime dependency missing: '+pkg.name+' -> '+name);}
   queue.push(dependency);
  }
 }
 return {scope:'Conservative declared-dependency closure of runtime roots, including installed optional packages. PXT prebuilt edges are installed DOMPurify/LZMA; embedded Fuse.js 3.2.0 is covered by the retained PXT ThirdPartyNotice and prebuilt hash, not installed as a separate package. The full PXT editor graph is excluded. Reviewed webpack-only raw/ify/base64/arraybuffer loaders are excluded here and remain in the installed SBOM. Not an exact webpack module inventory.',packages:[...packages.values()].sort((a,b)=>(a.installationPath).localeCompare(b.installationPath,'en')),inputs:[...inputs].sort()};
}
