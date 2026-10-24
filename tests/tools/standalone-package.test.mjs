import {releaseMaterialNames} from '../../src/contracts/release-materials.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createStandaloneRuntime} from '../../tools/build/standalone-package.mjs';
import {readStoredPackage} from '../../src/export/stored-package.mjs';
import {standaloneFixture,digest} from '../helpers/standalone-fixture.mjs';

for(const contextId of ['scene3d','webapp'])for(const language of ['javascript','python'])test('GG-EXPORT runtime selection '+contextId+'/'+language+' comes from verified cohort2 bytes only',async t=>{
 const fixture=await standaloneFixture();t.after(fixture.cleanup);
 const input={releaseRoot:fixture.releaseRoot,cohort:fixture.cohort,contextId,language},zip=await createStandaloneRuntime(input),files=new Map(readStoredPackage(zip));
 assert.deepEqual(await createStandaloneRuntime(input),zip);
 const source=JSON.parse(new TextDecoder().decode(files.get('source-runtime.json')));
 assert.equal(source.cohort,fixture.cohort);assert.equal(source.contextId,contextId);assert.equal(source.language,language);
 assert.deepEqual(new Set(source.files.map(entry=>entry.role)),new Set(['shell','language',contextId]));
 for(const entry of source.files){assert.equal(files.get(entry.path).length,entry.bytes);assert.equal(digest(files.get(entry.path)),entry.sha256);assert.ok(entry.path.includes(fixture.base));}
 assert.equal([...files.keys()].some(path=>path.includes('/vendor/pyodide/')),language==='python');
 assert.equal([...files.keys()].some(path=>path.includes('/vendor/quickjs/')),language==='javascript');
 assert.equal([...files.keys()].some(path=>path.endsWith('/config.json')||path.includes('/app/offline/')),false);
 for(const role of ['shell','language',contextId])assert.equal(digest(files.get('source-manifests/'+role+'.json')),fixture.release.roles[role].sha256);
 for(const name of ['index.html','export.css','serve.mjs.txt','notices.json'])assert.ok(files.has('source-templates/'+name));
 for(const name of releaseMaterialNames)assert.deepEqual(files.get('source-templates/release/'+name),Uint8Array.from(fixture.materials.get(name)));
 assert.equal([...files.keys()].filter(path=>path.endsWith('source.tar.gz')).length,1);assert.equal(files.has('release/source.tar.gz'),false);
 assert.ok(new TextDecoder().decode(files.get('index.html')).includes(fixture.base+'app/export/bootstrap.mjs'));
});
test('GG-EXPORT runtime builder rejects manifest/payload integrity and mixed cohort before creating a package',async t=>{
 const f=await standaloneFixture();t.after(f.cleanup);const input={releaseRoot:f.releaseRoot,cohort:f.cohort,contextId:'scene3d',language:'javascript'};
 const manifestPath=join(f.releaseRoot,f.cohort,'language/manifest.json'),original=await readFile(manifestPath);
 await writeFile(manifestPath,'{}');await assert.rejects(createStandaloneRuntime(input),/integrity/);await writeFile(manifestPath,original);
 const payload=join(f.releaseRoot,f.cohort,'language/vendor/quickjs-engine.bundle.mjs');await writeFile(payload,'tampered');await assert.rejects(createStandaloneRuntime(input),/integrity/);
 await writeFile(payload,f.payloads.get('language/vendor/quickjs-engine.bundle.mjs'));
 const altered=structuredClone(f.release);altered.cohort='b'.repeat(64);await writeFile(f.releasePath,JSON.stringify(altered));await assert.rejects(createStandaloneRuntime(input),/release unavailable/);
 for(const bad of [{...input,cohort:'../escape'},{...input,contextId:'runner'},{...input,language:'javascript/../../x'}])await assert.rejects(createStandaloneRuntime(bad),/selection/);
});

test('GG-RELEASE-MATERIALS: runtime packaging requires all source files from the same checked shell manifest',async t=>{
 const f=await standaloneFixture();t.after(f.cleanup);const path=join(f.releaseRoot,f.cohort,'shell','export-templates/release/source.tar.gz');
 const original=await readFile(path);await writeFile(path,Buffer.from('changed'));
 await assert.rejects(()=>createStandaloneRuntime({releaseRoot:f.releaseRoot,cohort:f.cohort,contextId:'scene3d',language:'javascript'}),/integrity/);
 await writeFile(path,original);
 const manifestPath=join(f.releaseRoot,f.cohort,'shell','manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
 manifest.entries=manifest.entries.filter(entry=>entry.path!=='export-templates/release/LICENSE');manifest.totalBytes=manifest.entries.reduce((n,e)=>n+e.bytes,0);
 const raw=JSON.stringify(manifest);await writeFile(manifestPath,raw);f.release.roles.shell.sha256=digest(raw);await writeFile(f.releasePath,JSON.stringify(f.release));
 await assert.rejects(()=>createStandaloneRuntime({releaseRoot:f.releaseRoot,cohort:f.cohort,contextId:'scene3d',language:'javascript'}),/release/);
});
