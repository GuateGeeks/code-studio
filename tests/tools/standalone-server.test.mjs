import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,unlink,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {createServer} from 'node:net';
import {request} from 'node:http';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {digest,releaseMaterialsFixture} from '../helpers/standalone-fixture.mjs';

async function freePort(){const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));return port;}
async function packageFixture(t){
 const root=await mkdtemp(join(tmpdir(),'gg-unpacked-')),cohort='a'.repeat(64),base='/releases/'+cohort+'/',ports=await Promise.all([freePort(),freePort(),freePort()]);
 const config={shellOrigin:'http://127.0.0.1:'+ports[0],languageOrigin:'http://127.0.0.1:'+ports[1],webappOrigin:'http://127.0.0.1:'+ports[2],releaseBase:base,cohort};
 const source=await readFile(new URL('../../tools/export/serve.template.mjs',import.meta.url),'utf8');
 const replacements=Object.fromEntries([4211,4212,4213].map((value,index)=>[value,ports[index]]));
 const serve=source.replace(/\b421[123]\b/g,value=>String(replacements[value]));
 const contents=new Map([['serve.mjs',serve],['deployment.json',JSON.stringify(config)],['index.html','<!doctype html><p>shell</p>'],
 ['roles/language'+base+'index.html','<!doctype html><p>language</p>'],['roles/webapp'+base+'index.html','<!doctype html><p>webapp</p>'],
 ['roles/shell'+base+'app/test.mjs','export const value=1;'],['export.css','body{color:blue}']]);
 for(const [name,bytes]of releaseMaterialsFixture())contents.set('release/'+name,bytes);
 const manifest={schemaVersion:1,sourceCohort:cohort,contextId:'webapp',language:'javascript',files:[]};
 for(const [path,value]of contents){const bytes=Buffer.from(value);await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),bytes);manifest.files.push({path,bytes:bytes.length,sha256:digest(bytes)});}
 await writeFile(join(root,'package-manifest.json'),JSON.stringify(manifest));
 const item={root,cohort,base,ports,config,contents,manifest,child:null,output:''};
 t.after(async()=>{
  if(item.child&&item.child.exitCode===null){item.child.kill('SIGTERM');await Promise.race([once(item.child,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);if(item.child.exitCode===null)item.child.kill('SIGKILL');}
  await rm(root,{recursive:true,force:true});
 });
 return item;
}
async function launch(item,{rejects=false}={}){
 const child=spawn(process.execPath,[join(item.root,'serve.mjs')],{cwd:item.root,stdio:['ignore','pipe','pipe']});item.child=child;
 let timer;const ready=new Promise((resolve,reject)=>{
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',chunk=>{item.output+=chunk;if(item.output.includes('Aplicación local:'))resolve();});
  child.stderr.on('data',chunk=>{item.output+=chunk;});
  child.once('error',reject);child.once('exit',code=>reject(new Error('Server exited '+code+': '+item.output)));
  timer=setTimeout(()=>reject(new Error('Server start timeout: '+item.output)),6000);
 });
 if(rejects){await assert.rejects(ready);clearTimeout(timer);return;}
 try{await ready;}finally{clearTimeout(timer);}
}
async function get(port,path,method='GET'){
 return new Promise((resolve,reject)=>{
  const req=request({hostname:'127.0.0.1',port,path,method,headers:{Connection:'close'}},response=>{
   const chunks=[];response.on('data',chunk=>chunks.push(chunk));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString(),raw:Buffer.concat(chunks)}));
  });req.once('error',reject);req.end();
 });
}
test('GG-EXPORT unpacked server serves versioned role indexes and denies cross-role, foreign-cohort and escaped paths',async t=>{
 const f=await packageFixture(t);await launch(f);
 assert.equal((await get(f.ports[0],'/')).status,200);
 for(const port of f.ports.slice(1)){const response=await get(port,f.base+'?session=example');assert.equal(response.status,200);assert.equal(response.headers['x-content-type-options'],'nosniff');assert.match(response.headers['permissions-policy'],/usb=\(\)/);}
 assert.equal((await get(f.ports[0],f.base+'app/test.mjs')).status,200);
 assert.equal((await get(f.ports[1],f.base+'app/test.mjs')).status,404);
 assert.equal((await get(f.ports[2],f.base+'config.json')).body,JSON.stringify(f.config));
 assert.equal((await get(f.ports[2],'/releases/'+'b'.repeat(64)+'/config.json')).status,404);
 for(const path of ['/../outside.txt','/%2e%2e/outside.txt','/%252e%252e/outside.txt','/a%2f..%2foutside.txt','/a%5coutside','/%00','/unlisted.txt','/roles/language'+f.base+'index.html'])assert.equal((await get(f.ports[0],path)).status,404,path);
 const before=await readFile(join(f.root,'export.css'));
 assert.equal((await get(f.ports[0],'/export.css','POST')).status,405);assert.deepEqual(await readFile(join(f.root,'export.css')),before);
 const head=await get(f.ports[0],'/export.css','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
});
test('GG-EXPORT unpacked server refuses corrupted and symlinked files at startup',async t=>{
 const corrupt=await packageFixture(t);await writeFile(join(corrupt.root,'export.css'),'changed');await launch(corrupt,{rejects:true});assert.match(corrupt.output,/integrity/i);
 const linked=await packageFixture(t),outside=join(linked.root,'unlisted-secret.txt');await writeFile(outside,'secret');
 await unlink(join(linked.root,'export.css'));await symlink(outside,join(linked.root,'export.css'));await launch(linked,{rejects:true});assert.match(linked.output,/Unsafe/);
});
test('GG-EXPORT unpacked server never follows a listed file replaced by an escaping symlink after startup',async t=>{
 const f=await packageFixture(t);await launch(f);
 const outside=join(f.root,'unlisted-secret.txt');await writeFile(outside,'MUST NOT SERVE');
 await unlink(join(f.root,'export.css'));await symlink(outside,join(f.root,'export.css'));
 const response=await get(f.ports[0],'/export.css');assert.notEqual(response.body,'MUST NOT SERVE');
 assert.ok(response.status===404||response.body==='body{color:blue}');
});

test('GG-RELEASE-MATERIALS: unpacked source and licenses are local, exact, bounded and exposed only by the shell',async t=>{
 const f=await packageFixture(t);await launch(f);
 const expected=releaseMaterialsFixture();
 for(const [name,bytes]of expected){
  const response=await get(f.ports[0],'/release/'+name);assert.equal(response.status,200,name);assert.equal(digest(response.raw),digest(bytes),name);
  assert.equal((await get(f.ports[1],'/release/'+name)).status,404);assert.equal((await get(f.ports[2],'/release/'+name)).status,404);
  const head=await get(f.ports[0],'/release/'+name,'HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
 }
 const archive=await get(f.ports[0],'/release/source.tar.gz');assert.equal(archive.headers['content-type'],'application/gzip');assert.match(archive.headers['content-disposition'],/attachment/);
 assert.match((await get(f.ports[0],'/release/LICENSE')).headers['content-type'],/^text\/plain/);
 for(const path of ['/release/evil.mjs','/release/','/source-templates/release/LICENSE','/release/%2e%2e/private','/release/a%5Cb'])assert.equal((await get(f.ports[0],path)).status,404,path);
 assert.equal((await get(f.ports[0],'/release/LICENSE','POST')).status,405);
});
test('GG-RELEASE-MATERIALS: cross-inventory archive corruption is rejected before the unpacked server binds',async t=>{
 const f=await packageFixture(t),path='release/source.tar.gz',bytes=Buffer.from('replacement archive');
 await writeFile(join(f.root,path),bytes);const entry=f.manifest.files.find(entry=>entry.path===path);entry.bytes=bytes.length;entry.sha256=digest(bytes);
 await writeFile(join(f.root,'package-manifest.json'),JSON.stringify(f.manifest));await launch(f,{rejects:true});assert.match(f.output,/Source archive integrity/);
});
