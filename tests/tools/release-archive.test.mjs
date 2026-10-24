import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync,gunzipSync} from 'node:zlib';
import {mkdtemp,readFile,rm,lstat,readdir,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {walkFiles} from '../../tools/release/source-plan.mjs';
import {createSourceArchive,readSourceArchive,safeSourcePath} from '../../tools/release/tar.mjs';
import {verifyReleaseSource,restoreReleaseSource} from '../../tools/release/restore.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
function fixture(){
 const files=[{path:'workspace/project/src/main.mjs',bytes:Buffer.from('export const n = 1;\n'),kind:'source'},{path:'workspace/project/LICENSE',bytes:Buffer.from('Fixture license\n'),kind:'license'}];
 const archive=createSourceArchive(files);
 const manifest={schemaVersion:1,license:'AGPL-3.0-only',sourceArchive:{path:'source.tar.gz',bytes:archive.bytes.length,sha256:hash(archive.bytes),expandedBytes:archive.expandedBytes},entries:files.map(file=>({path:file.path,bytes:file.bytes.length,sha256:hash(file.bytes),kind:file.kind})),provenance:{product:{name:'fixture',version:'1.0.0',license:'AGPL-3.0-only'},toolchain:{node:'v22.23.4',npm:'10.9.9',platform:'linux',arch:'x64'},repositories:[],locks:[],prebuilts:[]},limitations:['Fixture only.']};
 return {files,...archive,manifest};
}
test('GG-RELEASE source tar/gzip is deterministic, standard regular USTAR and detached',()=>{
 const f=fixture(),second=createSourceArchive([...f.files].reverse());assert.deepEqual(second.bytes,f.bytes);assert.equal(second.expandedBytes,f.expandedBytes);
 const files=readSourceArchive(f.bytes,{expandedBytes:f.expandedBytes});assert.deepEqual([...files.keys()],[...files.keys()].sort());assert.equal(Buffer.from(files.get(f.files[0].path)).toString(),'export const n = 1;\n');
 files.get(f.files[0].path)[0]=0;assert.equal(Buffer.from(readSourceArchive(f.bytes).get(f.files[0].path)).toString(),'export const n = 1;\n');
 const tar=gunzipSync(f.bytes);assert.equal(tar[156],48);assert.equal(tar.subarray(257,263).toString(),'ustar\0');assert.ok(tar.subarray(-1024).every(n=>n===0));
});
test('GG-RELEASE source paths, sparse inventories, duplicate files and quotas are rejected',()=>{
 for(const path of ['../secret','/absolute','C:/drive','a\\b','a//b','a/./b','a/%2f','a?b','a#b','a/\0b','a/node_modules/x','a/.git/config','a/.env','a/private.key','a/.npmrc','a/.netrc','a/.ssh/id_ed25519','a/'.repeat(150)+'b'])assert.throws(()=>safeSourcePath(path),undefined,path);
 assert.throws(()=>createSourceArchive(Array(1)));const file={path:'workspace/a',bytes:new Uint8Array()};assert.throws(()=>createSourceArchive([file,file]));assert.throws(()=>createSourceArchive([{...file,bytes:new Uint8Array(32*1024*1024+1)}]));
});
test('GG-RELEASE tar rejects links, malformed headers, truncation, extra data and wrong expansion',()=>{
 const f=fixture(),tar=gunzipSync(f.bytes);
 for(const mutate of [b=>b[156]=50,b=>b[100]^=1,b=>b[0]=255,b=>b[157]=65,b=>b[b.length-1]=1]){
  const bad=Buffer.from(tar);mutate(bad);assert.throws(()=>readSourceArchive(gzipSync(bad)));
 }
 assert.throws(()=>readSourceArchive(gzipSync(tar.subarray(0,-512))));assert.throws(()=>readSourceArchive(gzipSync(Buffer.concat([tar,Buffer.alloc(512)]))));assert.throws(()=>readSourceArchive(f.bytes,{expandedBytes:f.expandedBytes+512}));
});
test('GG-RELEASE verifier checks archive and every interior file against external manifest',()=>{
 const f=fixture();assert.equal(verifyReleaseSource(f.bytes,f.manifest).files.size,2);
 assert.throws(()=>verifyReleaseSource(Uint8Array.from(f.bytes,(_,i)=>i===20?0:f.bytes[i]),f.manifest));
 const bad=structuredClone(f.manifest);bad.entries[0].sha256='0'.repeat(64);assert.throws(()=>verifyReleaseSource(f.bytes,bad),/entry integrity/);
 const missing=structuredClone(f.manifest);missing.entries.pop();assert.throws(()=>verifyReleaseSource(f.bytes,missing),/inventory/);
});
test('GG-RELEASE restore verifies before writing, refuses existing destinations and yields real independent files',async t=>{
 const root=await mkdtemp(resolve(tmpdir(),'gg-release-restore-'));t.after(()=>rm(root,{recursive:true,force:true}));const f=fixture(),directory=resolve(root,'new');
 await restoreReleaseSource(f.bytes,{manifest:f.manifest,directory});const file=resolve(directory,f.files[0].path);assert.equal(await readFile(file,'utf8'),'export const n = 1;\n');assert.equal((await lstat(file)).isSymbolicLink(),false);
 await assert.rejects(restoreReleaseSource(f.bytes,{manifest:f.manifest,directory}),/already exists/);
 const bad=structuredClone(f.manifest);bad.entries[0].sha256='1'.repeat(64);
 await assert.rejects(restoreReleaseSource(f.bytes,{manifest:bad,directory:resolve(root,'invalid')}));
 assert.deepEqual(await readdir(root),['new']);
});

test('GG-RELEASE source walker rejects credential filenames before reading contents and excludes SSH directories',async t=>{
 const root=await mkdtemp(resolve(tmpdir(),'gg-source-credentials-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await mkdir(resolve(root,'.ssh'));await writeFile(resolve(root,'.ssh','id_ed25519'),'fixture sentinel; not a credential');
 assert.deepEqual(await walkFiles(root),[]);
 await writeFile(resolve(root,'.npmrc'),'fixture sentinel; not a credential');
 await assert.rejects(walkFiles(root),/Private source input forbidden/);
});
