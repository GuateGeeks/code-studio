import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createReleaseSnapshot} from '../../tools/build/release-snapshot.mjs';
import {rewriteJavaScript,rewriteHTML} from '../../tools/build/rewrite-release-paths.mjs';
import {sha256,offlineRoles} from '../../src/offline/contracts.mjs';
import {offlineFixture} from '../helpers/offline-fixture.mjs';
test('GG-OFFLINE-002: AST rewrite changes only known literals and preserves parser operators, comments and authoring',()=>{
  const base='/releases/'+'a'.repeat(64)+'/';
  const input="const a='/'; const b='/='; const regex=/\\//; // '/vendor/not-code.js'\nfetch('/config.json'); import('/vendor/engine.mjs'); const x='/unknown-root.dat';";
  const output=rewriteJavaScript(input,base);
  assert.ok(output.includes("const a='/'"));assert.ok(output.includes("const b='/='"));assert.ok(output.includes("// '/vendor/not-code.js'"));
  assert.ok(output.includes(JSON.stringify(base+'config.json')));assert.ok(output.includes(JSON.stringify(base+'vendor/engine.mjs')));
  assert.ok(output.includes("'/unknown-root.dat'"));assert.ok(output.includes('const regex=/\\//'));
  assert.equal(rewriteHTML('<script src="/vendor/x.js"></script><a href="https://example.invalid/">x</a>',base),'<script src="'+base+'vendor/x.js"></script><a href="https://example.invalid/">x</a>');
});
test('GG-OFFLINE-002: deterministic complete final-byte manifests, instance descriptor and historical routes',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const second=await createReleaseSnapshot({browserRoot:f.browserRoot,releaseRoot:f.releaseRoot,origins:f.origins});
  assert.equal(second.cohort,f.snapshot.cohort);assert.equal(second.manifestHash,f.snapshot.manifestHash);
  for(const role of offlineRoles) {
    const global=await readFile(f.snapshot.resolveRoute(role,f.snapshot.releaseBase+'release.json').filePath);
    assert.equal(await sha256(global),f.snapshot.manifestHash);
    const localBytes=await readFile(f.snapshot.resolveRoute(role,f.snapshot.releaseBase+'manifest.json').filePath);
    assert.equal(await sha256(localBytes),f.snapshot.manifest.roles[role].sha256);
    const local=JSON.parse(localBytes);
    for(const entry of local.entries) {
      const bytes=await readFile(f.snapshot.resolveRoute(role,f.snapshot.releaseBase+entry.path).filePath);
      assert.equal(bytes.length,entry.bytes);assert.equal(await sha256(bytes),entry.sha256);
    }
    const config=JSON.parse(await readFile(f.snapshot.resolveRoute(role,f.snapshot.releaseBase+'config.json').filePath));
    assert.deepEqual(config,{...f.origins,offlineProtocolVersion:1,cohort:f.snapshot.cohort,releaseBase:f.snapshot.releaseBase});
    assert.equal(Object.hasOwn(config,'manifestHash'),false);
  }
  const next=await f.next();assert.notEqual(next.cohort,f.snapshot.cohort);
  assert.deepEqual(JSON.parse(next.resolveRoute('shell','/latest-release.json').body),next.descriptor);
  assert.deepEqual(JSON.parse(f.snapshot.resolveRoute('shell','/latest-release.json').body),f.snapshot.descriptor);
  assert.equal(await readFile(next.resolveRoute('shell',f.snapshot.releaseBase+'app/example.mjs').filePath,'utf8'),"export const slash='/';");
  assert.equal(next.resolveRoute('shell',next.releaseBase+'../outside'),null);
  assert.equal(next.resolveRoute('shell',next.releaseBase+'%2e%2e/outside'),null);
});
test('GG-OFFLINE-002: changing origins creates another immutable cohort and JSON authoring stays byte-identical',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const bytes=Buffer.from('{"source":"fetch(\\\"/vendor/student.js\\\")"}');
  await writeFile(join(f.browserRoot,'shell','project-authoring.json'),bytes);
  const origins=Object.fromEntries(Object.entries(f.origins).map(([key,value])=>[key,value.replace('426','427')]));
  const changed=await createReleaseSnapshot({browserRoot:f.browserRoot,releaseRoot:f.releaseRoot,origins});
  assert.notEqual(changed.cohort,f.snapshot.cohort);
  assert.deepEqual(await readFile(changed.resolveRoute('shell',changed.releaseBase+'project-authoring.json').filePath),bytes);
  await assert.rejects(createReleaseSnapshot({browserRoot:f.browserRoot,releaseRoot:f.releaseRoot,origins:{...origins,runnerOrigin:origins.shellOrigin}}),/distinct/);
});

test('GG-OFFLINE-002: URL sinks/defaults are versioned but passive paths and PXT virtual config keys are unchanged',()=>{
  const base='/releases/'+'a'.repeat(64)+'/';
  const input="generatedFiles['/config.json']='virtual'; const passive='/vendor/not-a-url.js'; const props={path:'/app/virtual.ts',file:'/config.json'}; fetch('/config.json'); new Worker('/compiler-worker.js'); importScripts('/vendor/pxtworker.js'); import('/vendor/engine.mjs'); function engine({indexURL='/vendor/pyodide/',wasmLocation='/vendor/quickjs/emscripten-module.wasm'}={}){}; const options={media:'/blockly-media/'}; __webpack_require__.p='/vendor/';";
  const output=rewriteJavaScript(input,base);
  for(const passive of ["generatedFiles['/config.json']","passive='/vendor/not-a-url.js'","path:'/app/virtual.ts'","file:'/config.json'"]) assert.ok(output.includes(passive));
  for(const path of ['config.json','compiler-worker.js','vendor/pxtworker.js','vendor/engine.mjs','vendor/pyodide/','vendor/quickjs/emscripten-module.wasm','blockly-media/','vendor/']) assert.ok(output.includes(JSON.stringify(base+path)),path);
});
test('GG-OFFLINE-002: pinned PXT vendor bytes including native virtual config filename remain unchanged',async()=>{
  const original=await readFile(new URL('../../../pxt-microbit/node_modules/pxt-core/built/web/pxtworker.js',import.meta.url),'utf8');
  assert.ok(original.includes('generatedFiles["/config.json"]'));
  assert.equal(rewriteJavaScript(original,'/releases/'+'a'.repeat(64)+'/'),original);
});
