import {readdir,readFile,lstat} from 'node:fs/promises';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const rootFiles=['package.json','package-lock.json','README.md','CONTRIBUTING.md','AGENTS.md','.gitignore','.gitattributes','playwright.config.mjs','playwright.quick.config.mjs','playwright.performance.config.mjs','LICENSE','THIRD_PARTY_NOTICES'];
export const upstreamPlans=[
 {id:'xcratch',root:'xcratch-scratch-editor',trees:['packages/scratch-vm/src','packages/scratch-render/src','packages/scratch-svg-renderer/src','packages/task-herder'],files:['package.json','package-lock.json','LICENSE','TRADEMARK','AGENTS.md','README.md',...['scratch-vm','scratch-render','scratch-svg-renderer','scratch-gui','task-herder'].map(name=>'packages/'+name+'/package.json'),...['scratch-vm','scratch-render','scratch-svg-renderer'].flatMap(name=>['webpack.config.js','LICENSE'].map(file=>'packages/'+name+'/'+file))],optionalFiles:['scratch-vm','scratch-render','scratch-svg-renderer'].map(name=>'packages/'+name+'/README.md')},
 // libs/*/built are pxt serve outputs: unused by the build and their debug
 // binaries change between runs, so they are not source.
 {id:'microbit',root:'pxt-microbit',trees:['compiler','sim','libs'],skip:/^libs\/[^/]+\/built\//,files:['package.json','package-lock.json','pxtarget.json','targetconfig.json','LICENSE.txt','THIRD-PARTY-NOTICES.txt','README.md']},
 {id:'pxt-core',root:'.tools/pxt-core-source',trees:['pxtcompiler','pxtlib','pxtpy','pxtsim','pxtservices','localtypings','libs','backendutils','cli','pxt-cli','scripts'],files:['package.json','LICENSE','ThirdPartyNotice','README.md','Makefile','gulpfile.js','jakeutil.js']}
];
const excluded=new Set(['node_modules','.git','.codegraph','artifacts','test-results','playwright-report','.cache','.codex','.ssh']);
export async function walkFiles(directory,{optional=false,privateCheck=true}={}){
 let entries;try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(optional&&error.code==='ENOENT')return [];throw error;}
 const result=[];for(const entry of entries.sort((a,b)=>a.name<b.name?-1:a.name>b.name?1:0)){
  if(excluded.has(entry.name))continue;
  const file=resolve(directory,entry.name);
  if(entry.isSymbolicLink())throw new Error('Source symlink forbidden: '+file);
  if(entry.isDirectory())result.push(...await walkFiles(file,{privateCheck}));
  else if(entry.isFile()){if(privateCheck&&(['.npmrc','.netrc','id_rsa','id_ed25519'].includes(entry.name)||/(?:^|\.)(?:pem|key|p12|pfx|sqlite|db)$/i.test(entry.name)||/^\.env(?:\.|$)/.test(entry.name)))throw new Error('Private source input forbidden: '+file);result.push(file);}
 }return result;
}
async function required(file){if(!(await lstat(file)).isFile())throw new Error('Required release source missing: '+file);return file;}
export async function upstreamFiles(workspaceRoot,plan){
 const root=resolve(workspaceRoot,plan.root),files=[];
 for(const tree of plan.trees)files.push(...(await walkFiles(resolve(root,tree))).filter(file=>!plan.skip?.test(relative(root,file).split(sep).join('/'))));
 for(const file of plan.files)files.push(await required(resolve(root,file)));
 for(const file of plan.optionalFiles??[]){try{files.push(await required(resolve(root,file)));}catch(error){if(error.code!=='ENOENT')throw error;}}
 // Root/package build settings are needed by the upstream webpack presets.
 for(const directory of [root,...['scratch-vm','scratch-render','scratch-svg-renderer'].map(name=>resolve(root,'packages',name))]){
  let entries;try{entries=await readdir(directory,{withFileTypes:true});}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const entry of entries)if(entry.isFile()&&/^(?:babel\.config\.[cm]?js|\.babelrc(?:\.json|\.js)?|\.browserslistrc|tsconfig(?:\.[^.]+)?\.json)$/.test(entry.name))files.push(resolve(directory,entry.name));
 }return [...new Set(files)].sort();
}
export async function treeDigest(root,files){return digest(Buffer.from(JSON.stringify(await Promise.all(files.map(async file=>({path:relative(root,file).split(sep).join('/'),sha256:digest(await readFile(file))}))))));}
export const runtimePackages=[
 {group:'product',name:'blockly',version:'13.4.0'},
 {group:'product',name:'dapjs',version:'2.3.0'},
 {group:'product',name:'pako',version:'2.1.0'},
 {group:'product',name:'@babylonjs/core',version:'9.32.0'},
 {group:'product',name:'@babylonjs/loaders',version:'9.32.0'},
 {group:'product',name:'quickjs-emscripten-core',version:'0.32.0'},
 {group:'product',name:'@jitl/quickjs-wasmfile-release-sync',version:'0.32.0'},
 {group:'product',name:'pyodide',version:'314.0.7'},
 {group:'xcratch',name:'scratch-storage',version:'5.0.3'},
 {group:'xcratch',name:'scratch-audio',version:'2.0.268'},
 {group:'xcratch',name:'scratch-parser',version:'6.0.0'},
 {group:'xcratch',name:'scratch-sb1-converter',version:'2.0.279'},
 {group:'xcratch',name:'scratch-render-fonts',version:'1.0.252'},
 {group:'microbit',name:'pxt-core',version:'13.0.1'},
 {group:'microbit',name:'pxt-common-packages',version:'14.0.2'},
 {group:'microbit',name:'lzma',version:'2.3.2'}
];
export function packageRoot({projectRoot,workspaceRoot},item){return resolve(item.group==='product'?projectRoot:resolve(workspaceRoot,item.group==='xcratch'?'xcratch-scratch-editor':'pxt-microbit'),'node_modules',item.name);}
export async function runtimePackageFiles(options,item){
 const root=packageRoot(options,item),pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
 if(pkg.version!==item.version)throw new Error('Runtime version mismatch: '+item.name);
 // Selected source, maps and licenses; never archive a node_modules tree or package binary dump.
 const all=await walkFiles(root,{privateCheck:false});
 return all.filter(file=>{const path=relative(root,file).split(sep).join('/');
  if(/(?:^|\/)(?:LICENSE|LICENCE|NOTICE|COPYING|OFL|ThirdPartyNotice)(?:[.-][^/]*)?$/i.test(path)||path==='lib/zlib/README'||path==='package.json'||path==='TRADEMARK')return true;
  if(item.name==='pyodide')return /^(?:pyodide(?:\.js|\.mjs)\.map|pyodide-lock\.json|README\.md)$/.test(path);
  if(item.name==='pxt-core')return false; // Pinned full source is supplied separately.
  if(item.name==='@jitl/quickjs-wasmfile-release-sync')return /\.map$/.test(path)||path==='README.md';
  if(item.name==='scratch-render-fonts')return path.startsWith('src/')||/^(?:webpack\.config\.js|README\.md)$/.test(path);
  if(['pxt-common-packages'].includes(item.name))return path.startsWith('libs/')&&/\.(?:ts|cpp|h|json|md|s|jres|svg|png|wav)$/i.test(path);
  if(item.name.startsWith('@babylonjs/'))return /\.map$/.test(path);
  if(item.name==='blockly')return /(?:\.map$|^media\/|^README\.md$)/.test(path);
  return /^(?:src|lib)\//.test(path)||/^(?:webpack\.config\.js|tsconfig\.json|index\.js|README\.md)$/.test(path)||item.name==='quickjs-emscripten-core'&&/\.map$/.test(path);
 });
}
export async function installedMetadataFiles({projectRoot,workspaceRoot}){
 const result=[];
 for(const root of [projectRoot,resolve(workspaceRoot,'xcratch-scratch-editor'),resolve(workspaceRoot,'pxt-microbit')]){
  const lock=JSON.parse(await readFile(resolve(root,'package-lock.json'),'utf8'));
  for(const [path,value] of Object.entries(lock.packages??{})){
   if(!/^(?:node_modules\/|packages\/[A-Za-z0-9_-]+\/node_modules\/)/.test(path)||value.link)continue;
   if(path.includes('..')||path.includes('\\'))throw new Error('Invalid lock package path');
   const file=resolve(root,path,'package.json');
   try{result.push(await required(file));}catch(error){if(error.code!=='ENOENT')throw error;}
  }
 }return [...new Set(result)].sort();
}
export async function collectSourcePlan({projectRoot,workspaceRoot}){
 const entries=[];const add=(source,path,kind='source')=>entries.push({source,path,kind});
 const configurationFiles=(await readdir(projectRoot)).filter(name=>/^playwright(?:\.[a-z0-9-]+)*\.config\.mjs$/.test(name));
 for(const name of [...new Set([...rootFiles,...configurationFiles])])add(await required(resolve(projectRoot,name)),'workspace/guategeeks-code-studio/'+name,/LICENSE|THIRD_PARTY/.test(name)?'license':name.includes('lock')?'lock':'source');
 for(const name of ['src','spikes','tools','tests','config','openspec','docs','release'])
  for(const file of await walkFiles(resolve(projectRoot,name)))add(file,'workspace/guategeeks-code-studio/'+relative(projectRoot,file).split(sep).join('/'),file.includes('/docs/licenses/')?'license':name==='release'||file.includes('/tools/release/')||file.includes('/docs/release/')?'recipe':'source');
 add(await required(resolve(workspaceRoot,'scripts/env.sh')),'workspace/scripts/env.sh','recipe');
 for(const plan of upstreamPlans)for(const file of await upstreamFiles(workspaceRoot,plan))add(file,'workspace/'+plan.root+'/'+relative(resolve(workspaceRoot,plan.root),file).split(sep).join('/'),/LICENSE|ThirdPartyNotice|THIRD-PARTY|NOTICE|OFL/.test(file)?'license':file.endsWith('package-lock.json')?'lock':'source');
 for(const item of runtimePackages){
  const root=packageRoot({projectRoot,workspaceRoot},item);
  for(const file of await runtimePackageFiles({projectRoot,workspaceRoot},item))add(file,'workspace/vendor-source/'+item.group+'/'+item.name+'/'+relative(root,file).split(sep).join('/'),/(?:LICENSE|LICENCE|NOTICE|COPYING|OFL|ThirdPartyNotice)(?:[.-]|$)|lib\/zlib\/README/i.test(file)?'license':'source');
 }
 // The preserved pre-existing patch is versioned under release/patches.
 for(const entry of entries)if(entry.path.includes('/release/patches/'))entry.kind='patch';
 return entries.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
}
