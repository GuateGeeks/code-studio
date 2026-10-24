import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,mkdir,writeFile,unlink,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildReleaseMaterials,releaseMaterialInputs} from '../../tools/release/materials.mjs';
import {verifyReleaseSource} from '../../tools/release/restore.mjs';
import {releaseMaterialNames,validateReleaseMaterialSet} from '../../src/contracts/release-materials.mjs';
import {installedMetadataFiles,upstreamPlans,upstreamFiles,treeDigest,runtimePackages,packageRoot,runtimePackageFiles,digest} from '../../tools/release/source-plan.mjs';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),workspaceRoot=resolve(projectRoot,'..');
async function fixture(t){
 const root=await mkdtemp(resolve(tmpdir(),'gg-release-fixture-'));t.after(()=>rm(root,{recursive:true,force:true}));const options={workspaceRoot:root,projectRoot:resolve(root,'guategeeks-code-studio')};
 const put=async(path,content='fixture source\n')=>{await mkdir(dirname(path),{recursive:true});await writeFile(path,content);};
 for(const name of ['package.json','package-lock.json','README.md','CONTRIBUTING.md','AGENTS.md','.gitignore','.gitattributes','playwright.config.mjs','playwright.quick.config.mjs','playwright.performance.config.mjs','playwright.release-performance.config.mjs','LICENSE','THIRD_PARTY_NOTICES'])await put(resolve(options.projectRoot,name),name==='package.json'?JSON.stringify({name:'fixture',version:'1.0.0'}):name==='package-lock.json'?JSON.stringify({packages:{}}):'fixture\n');
 for(const name of ['src','spikes','tools','tests','config','openspec','docs','release'])await put(resolve(options.projectRoot,name,'fixture.mjs'));
 await put(resolve(root,'scripts/env.sh'));await put(resolve(options.projectRoot,'docs/release/BUILD.md'));await put(resolve(options.projectRoot,'release/patches/pxt-microbit-prior.patch'),'patch\n');
 for(const name of ['pyodide-314.0.7-MPL-2.0.txt','cpython-3.14.2-LICENSE.txt'])await put(resolve(options.projectRoot,'docs/licenses',name),'license\n');
 const repositories=[];
 for(const plan of upstreamPlans){
  for(const file of plan.files)await put(resolve(root,plan.root,file),file.endsWith('package.json')?JSON.stringify({name:plan.id+'-'+file,version:'1.0.0',license:'MIT'}):file==='package-lock.json'?JSON.stringify({packages:{}}):'source\n');
  for(const file of plan.optionalFiles??[])await put(resolve(root,plan.root,file),'Optional package README\n');
  for(const tree of plan.trees)await put(resolve(root,plan.root,tree,'fixture.mjs'));
  repositories.push({id:plan.id,root:plan.root,origin:'https://example.org/'+plan.id,revision:'a'.repeat(40),version:'1.0.0',treeSha256:await treeDigest(resolve(root,plan.root),await upstreamFiles(root,plan))});
 }
 const runtimeSources=[];
 for(const item of runtimePackages){
  const pkgRoot=packageRoot(options,item);await put(resolve(pkgRoot,'package.json'),JSON.stringify({name:item.name,version:item.version,license:'MIT'}));await put(resolve(pkgRoot,'LICENSE'),'license\n');
  await put(resolve(pkgRoot,'src/index.ts'),'export const fixture = 1;\n');
  if(item.name==='pako')await put(resolve(pkgRoot,'lib/zlib/README'),'zlib license\n');
  if(item.name==='scratch-render-fonts')await put(resolve(pkgRoot,'OFL.txt'),'font license\n');
  runtimeSources.push({id:item.group+':'+item.name,sha256:await treeDigest(pkgRoot,await runtimePackageFiles(options,item))});
 }
 const bytes=Buffer.from('fixture-prebuilt'),source='pxt-microbit/built/fixture.hex';await put(resolve(root,source),bytes);
 const lock={schemaVersion:1,toolchain:{node:process.version,npm:'10.9.9'},repositories,runtimeSources,patch:{path:'release/patches/pxt-microbit-prior.patch',bytes:6,sha256:digest(Buffer.from('patch\n'))},prebuilts:[{source,path:'workspace/pxt-microbit/built/fixture.hex',bytes:bytes.length,sha256:digest(bytes),origin:'https://example.org/prebuilt',recipe:'workspace/guategeeks-code-studio/docs/release/BUILD.md',limitation:'Fixture prebuilt, not a native rebuild.'}]};
 await put(resolve(options.projectRoot,'release/source-lock.json'),JSON.stringify(lock));return {...options,outputRoot:resolve(root,'output'),put};
}
test('GG-RELEASE real workspace produces six bounded materials and an independently verifiable source inventory',async t=>{
 const outputRoot=await mkdtemp(resolve(tmpdir(),'gg-release-real-'));t.after(()=>rm(outputRoot,{recursive:true,force:true}));
 const result=await buildReleaseMaterials({projectRoot,workspaceRoot,outputRoot});assert.deepEqual(result.outputs.map(path=>path.slice(outputRoot.length+1)),releaseMaterialNames);
 const files=new Map(await Promise.all(releaseMaterialNames.map(async name=>[name,await readFile(resolve(outputRoot,name))]))),{manifest}=await validateReleaseMaterialSet(files),verified=verifyReleaseSource(files.get('source.tar.gz'),manifest);
 assert.ok(manifest.sourceArchive.bytes<64*1024*1024);assert.equal(result.metadata.sourceEntries,verified.files.size);
 for(const path of ['workspace/guategeeks-code-studio/spikes/paths.mjs','workspace/scripts/env.sh','workspace/guategeeks-code-studio/release/patches/pxt-microbit-prior.patch','workspace/.tools/pxt-core-source/pxtcompiler/simpledriver.ts'])assert.ok(verified.files.has(path),path);
 for(const name of ['scratch-vm','scratch-render','scratch-svg-renderer'])assert.ok(verified.files.has('workspace/xcratch-scratch-editor/packages/'+name+'/LICENSE'));
 assert.ok([...verified.files.keys()].some(path=>path.includes('/mapped-source/')&&path.endsWith('.ts')));
 for(const path of verified.files.keys())assert.ok(!/(?:^|\/)(?:node_modules|\.git|\.codegraph|artifacts)(?:\/|$)/.test(path),path);
 assert.equal(manifest.provenance.prebuilts.length,12);assert.match(files.get('THIRD_PARTY_NOTICES.txt').toString(),/zlib license|zlib|ZLIB/);assert.match(JSON.parse(files.get('SBOM.json')).scope,/Conservative.*development/);
 const inputs=await releaseMaterialInputs({projectRoot,workspaceRoot});assert.deepEqual(inputs,[...new Set(inputs)].sort());assert.ok(inputs.some(path=>path.endsWith('/pako/lib/zlib/README')));assert.ok(inputs.some(path=>path.endsWith('/scratch-render-fonts/OFL.txt')));assert.ok(!inputs.includes(resolve(projectRoot,'node_modules')));assert.ok(!inputs.includes(resolve(workspaceRoot,'.tools')));
});
test('GG-RELEASE fixture generation is byte deterministic and tracks every Playwright config',async t=>{
 const f=await fixture(t),a=await buildReleaseMaterials(f),first=await Promise.all(a.outputs.map(path=>readFile(path)));await buildReleaseMaterials(f);
 for(let i=0;i<a.outputs.length;i++)assert.deepEqual(await readFile(a.outputs[i]),first[i]);
 const manifest=JSON.parse(first[2]);assert.ok(manifest.entries.some(entry=>entry.path.endsWith('/playwright.release-performance.config.mjs')));
});
test('GG-RELEASE required source, runtime license and pinned prebuilt failures do not create materials',async t=>{
 const f=await fixture(t),source=resolve(f.workspaceRoot,'.tools/pxt-core-source/pxtcompiler/fixture.mjs');await f.put(source,'altered\n');await assert.rejects(buildReleaseMaterials(f),/source integrity/);
 assert.deepEqual(await readdir(f.workspaceRoot).then(names=>names.filter(name=>name==='output')),[]);
 const g=await fixture(t);await unlink(resolve(packageRoot(g,runtimePackages.find(item=>item.name==='pako')),'lib/zlib/README'));await assert.rejects(buildReleaseMaterials(g),/source integrity|zlib/);
 const h=await fixture(t);await h.put(resolve(h.workspaceRoot,'pxt-microbit/built/fixture.hex'),'tampered');await assert.rejects(buildReleaseMaterials(h),/Prebuilt integrity/);
});

test('GG-RELEASE source plan requires each Scratch package license and preserves optional package READMEs',async t=>{
 const f=await fixture(t),plan=upstreamPlans.find(item=>item.id==='xcratch'),paths=await upstreamFiles(f.workspaceRoot,plan);
 for(const name of ['scratch-vm','scratch-render','scratch-svg-renderer']){
  assert.ok(paths.includes(resolve(f.workspaceRoot,plan.root,'packages',name,'LICENSE')));
  assert.ok(paths.includes(resolve(f.workspaceRoot,plan.root,'packages',name,'README.md')));
 }
 await unlink(resolve(f.workspaceRoot,plan.root,'packages/scratch-vm/LICENSE'));
 await assert.rejects(upstreamFiles(f.workspaceRoot,plan),{code:'ENOENT'});
});

test('GG-RELEASE installed SBOM inputs include nested workspace dependencies and reject escaped lock paths',async t=>{
 const f=await fixture(t),root=resolve(f.workspaceRoot,'xcratch-scratch-editor'),path='packages/scratch-render/node_modules/raw-loader',file=resolve(root,path,'package.json');
 await f.put(file,JSON.stringify({name:'raw-loader',version:'0.5.1',license:'MIT'}));
 const lockPath=resolve(root,'package-lock.json');await f.put(lockPath,JSON.stringify({packages:{[path]:{version:'0.5.1'}}}));
 assert.ok((await installedMetadataFiles(f)).includes(file));
 await f.put(lockPath,JSON.stringify({packages:{'packages/scratch-render/node_modules/../../private':{version:'1.0.0'}}}));
 await assert.rejects(installedMetadataFiles(f),/Invalid lock package path/);
});
