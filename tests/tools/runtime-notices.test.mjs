import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,unlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {runtimeNotices,runtimeNoticePackages} from '../../tools/build/runtime-notices.mjs';
test('GG-EXPORT runtime notices reflect each installed package and contain real selected license text',async()=>{
 const result=await runtimeNotices(process.cwd());
 assert.deepEqual(Object.keys(result),runtimeNoticePackages);
 for(const name of runtimeNoticePackages){
  const pkg=JSON.parse(await readFile(join('node_modules',name,'package.json'),'utf8'));
  assert.equal(result[name].version,pkg.version);assert.equal(result[name].license,pkg.license);
  assert.ok(result[name].texts.length);assert.ok(result[name].texts.every(file=>typeof file.text==='string'&&file.text.trim().length>50));
 }
 assert.deepEqual(result.pyodide.texts.map(file=>file.name),['pyodide-314.0.7-MPL-2.0.txt','cpython-3.14.2-LICENSE.txt']);
});
test('GG-EXPORT missing license/package evidence fails instead of silently emitting empty notices',async t=>{
 const root=await mkdtemp(join(tmpdir(),'gg-notices-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const name of runtimeNoticePackages){
  const path=join(root,'node_modules',name);await mkdir(path,{recursive:true});
  await writeFile(join(path,'package.json'),JSON.stringify({version:'1.0.0',license:'MIT'}));
  if(name!=='pyodide')await writeFile(join(path,'LICENSE'),'Fixture license '+name);
 }
 for(const name of ['pyodide-314.0.7-MPL-2.0.txt','cpython-3.14.2-LICENSE.txt']){
  const path=join(root,'docs/licenses',name);await mkdir(dirname(path),{recursive:true});await writeFile(path,'Fixture '+name);
 }
 assert.equal(Object.keys(await runtimeNotices(root)).length,runtimeNoticePackages.length);
 await unlink(join(root,'node_modules/pako/LICENSE'));await assert.rejects(runtimeNotices(root),/Missing runtime license/);
});
