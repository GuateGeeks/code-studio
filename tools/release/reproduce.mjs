import {readFile,writeFile,mkdir,readdir,lstat,realpath} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {restoreReleaseSource} from './restore.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),workspaceRoot=resolve(projectRoot,'..');
async function run(command,args,{cwd,log}){
 await mkdir(dirname(log),{recursive:true});
 const chunks=[];await new Promise((done,reject)=>{const child=spawn(command,args,{cwd,env:process.env,stdio:['ignore','pipe','pipe'],shell:false});child.stdout.on('data',chunk=>chunks.push(chunk));child.stderr.on('data',chunk=>chunks.push(chunk));child.once('error',reject);child.once('close',async code=>{try{await writeFile(log,Buffer.concat(chunks));code===0?done():reject(new Error(command+' failed ('+code+'); see '+log));}catch(error){reject(error);}});});
}
async function inventory(directory,base=directory){
 const files=[];for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
 const path=resolve(directory,entry.name);if(entry.isSymbolicLink())throw new Error('Symlink in browser payload');
 if(entry.isDirectory())files.push(...await inventory(path,base));else if(entry.isFile()){const bytes=await readFile(path);files.push({path:relative(base,path),bytes:bytes.length,sha256:hash(bytes)});}
 }return files;
}
export async function reproduceRelease({materialRoot=resolve(projectRoot,'artifacts/browser/shell/export-templates/release'),outputRoot=resolve(projectRoot,'artifacts/f7-reproducibility')}={}){
 outputRoot=resolve(outputRoot);await mkdir(outputRoot,{recursive:true});
 const bytes=await readFile(resolve(materialRoot,'source.tar.gz')),manifest=JSON.parse(await readFile(resolve(materialRoot,'source-manifest.json'),'utf8'));
 const roots=[];
 for(const label of ['source-a','source-b']){
 const directory=resolve(outputRoot,label);
 // restoreReleaseSource rejects existing destinations and validates every byte.
 const restored=await restoreReleaseSource(bytes,{manifest,directory});roots.push({...restored,label});
 for(const name of ['guategeeks-code-studio','xcratch-scratch-editor','pxt-microbit']){
 const source=resolve(workspaceRoot,name,'node_modules'),destination=resolve(restored.workspaceRoot,name,'node_modules');
 await run('cp',['-al',source,destination],{cwd:restored.workspaceRoot,log:resolve(outputRoot,label+'-dependencies-'+name+'.log')});
 }
 for(const name of ['scratch-vm','scratch-render','scratch-svg-renderer','task-herder']){
 const source=resolve(workspaceRoot,'xcratch-scratch-editor/packages',name,'node_modules');
 try{if(!(await lstat(source)).isDirectory())continue;}catch(error){if(error.code==='ENOENT')continue;throw error;}
 const destination=resolve(restored.workspaceRoot,'xcratch-scratch-editor/packages',name,'node_modules');
 await run('cp',['-al',source,destination],{cwd:restored.workspaceRoot,log:resolve(outputRoot,label+'-dependencies-'+name+'.log')});
 }
 // The actual package files are hard links in distinct directory trees, not
 // symlinks back to the original QuickJS package or original authored source.
 const quickjs=resolve(restored.projectRoot,'node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.browser.mjs');
 if((await lstat(quickjs)).isSymbolicLink()||await realpath(quickjs)===await realpath(resolve(projectRoot,'node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.browser.mjs')))throw new Error('QuickJS package must resolve in the new root');
 for(const name of ['scratch-svg-renderer','scratch-render']){
 await run(process.execPath,[resolve(restored.workspaceRoot,'xcratch-scratch-editor/node_modules/webpack-cli/bin/cli.js'),'--config',resolve(restored.workspaceRoot,'xcratch-scratch-editor/packages',name,'webpack.config.js'),'--mode','development'],{cwd:resolve(restored.workspaceRoot,'xcratch-scratch-editor/packages',name),log:resolve(outputRoot,label+'-'+name+'.log')});
 }
 await run(process.execPath,['tools/f0/build-browser.mjs'],{cwd:restored.projectRoot,log:resolve(outputRoot,label+'-build.log')});
 console.log(label+': rebuilt from extracted source');
 }
 const payloads=[];
 for(const root of roots){
 const browserRoot=resolve(root.projectRoot,'artifacts/browser'),all=[];
 for(const role of ['shell','runner','simulator','language','scene3d','webapp']){
 const files=await inventory(resolve(browserRoot,role));for(const file of files){
 const path=role+'/'+file.path;all.push({...file,path});
 if(/\.(?:m?js|html|css|json)$/.test(path)&&!path.endsWith('source-manifest.json')&&!path.endsWith('SBOM.json')){
 const text=(await readFile(resolve(browserRoot,path))).toString('utf8');
 if([projectRoot,...roots.map(item=>item.projectRoot),workspaceRoot].some(local=>text.includes(local))||text.includes('file:///home/'))throw new Error('Build-local path leaked into runtime: '+path);
 }
 }
 }
 const {createReleaseSnapshot}=await import(pathToFileURL(resolve(root.projectRoot,'tools/build/release-snapshot.mjs')));
 const origins=Object.fromEntries(Object.entries({shell:4173,runner:4174,simulator:4175,language:4176,scene3d:4181,webapp:4182}).map(([role,port])=>[role+'Origin','http://127.0.0.1:'+port]));
 const release=await createReleaseSnapshot({browserRoot,releaseRoot:resolve(root.projectRoot,'artifacts/releases'),origins});
 payloads.push({label:root.label,cohort:release.cohort,manifestHash:release.manifestHash,inventory:all});
 }
 const samePayloads=JSON.stringify(payloads[0].inventory)===JSON.stringify(payloads[1].inventory),sameCohort=payloads[0].cohort===payloads[1].cohort;
 const distributed=[];
 for(const role of ['shell','runner','simulator','language','scene3d','webapp'])for(const file of await inventory(resolve(projectRoot,'artifacts/browser',role)))distributed.push({...file,path:role+'/'+file.path});
 const sameDistributedPayload=JSON.stringify(payloads[0].inventory)===JSON.stringify(distributed);
 const rebuiltMap=new Map(payloads[0].inventory.map(file=>[file.path,file]));
 const distributedDifferences=distributed.filter(file=>JSON.stringify(file)!==JSON.stringify(rebuiltMap.get(file.path))).map(file=>file.path);
 const report={schemaVersion:1,recordedAt:new Date().toISOString(),sourceArchiveSha256:hash(bytes),toolchain:{node:process.version,platform:process.platform,arch:process.arch},method:'Two independent extracted source directories; pinned installed dependencies reused as hard-linked files in distinct package trees. Native SVG/render and all browser build stages rebuilt. No npm installation, clean C/WASM/C++ rebuild, cold machine or offline dependency installation claim.',samePayloads,sameCohort,sameDistributedPayload,distributedDifferences,sameManifest:payloads[0].manifestHash===payloads[1].manifestHash,payloads};
 await writeFile(resolve(outputRoot,'result.json'),JSON.stringify(report,null,2)+'\n');
 if(!samePayloads||!sameCohort||!sameDistributedPayload||!report.sameManifest)throw new Error('Two-root browser payload mismatch; see '+resolve(outputRoot,'result.json'));
 console.log('Two-root and distributed payloads and cohort match');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length>1)throw new Error('Usage: node tools/release/reproduce.mjs [NEW_OUTPUT_ROOT]');
 await reproduceRelease(args[0]?{outputRoot:args[0]}:{});
}
