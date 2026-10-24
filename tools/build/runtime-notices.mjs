import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export const runtimeNoticePackages=['@babylonjs/core','@babylonjs/loaders','quickjs-emscripten-core','@jitl/quickjs-wasmfile-release-sync','pyodide','pako'];
export async function runtimeNotices(projectRoot){
 const result={};for(const name of runtimeNoticePackages){
 const root=resolve(projectRoot,'node_modules',name),pkg=JSON.parse(await readFile(resolve(root,'package.json'),'utf8'));
 if(name==='pyodide'){result[name]={version:pkg.version,license:pkg.license,texts:await Promise.all(['pyodide-314.0.7-MPL-2.0.txt','cpython-3.14.2-LICENSE.txt'].map(async name=>({name,text:await readFile(resolve(projectRoot,'docs/licenses',name),'utf8')})))};continue;}
 const names=(await readdir(root)).filter(name=>/^(?:LICEN[CS]E|NOTICE|COPYING)(?:\.|$)/i.test(name)).sort();if(!names.length)throw new Error('Missing runtime license: '+name);
 result[name]={version:pkg.version,license:pkg.license,texts:await Promise.all(names.map(async name=>({name,text:await readFile(resolve(root,name),'utf8')})))};
 }return result;
}
