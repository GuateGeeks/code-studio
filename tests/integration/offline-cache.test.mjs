import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineCache} from '../../src/offline/cache-engine.mjs';
import {offlinePackIds,offlineRoles,releaseBase,validateWorkerRequest,validateRoleManifest,validateReleaseManifest,validateSelection,resolvePackSelection,sha256} from '../../src/offline/contracts.mjs';
import {offlineFixture,memoryCaches} from '../helpers/offline-fixture.mjs';
const id='e5d0f9a7-7691-4e6b-8000-520630f4304c';
const request=snapshot=>({...snapshot.descriptor,packs:[...offlinePackIds]});
test('GG-OFFLINE-001: all four role receipts verify stored bytes, headers and selection without network on second check',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  for(const role of offlineRoles) {
    const storage=memoryCaches(),engine=createOfflineCache({role,origin:f.origins[role+'Origin'],cacheStorage:storage,fetchImpl:f.fetchImpl});
    const receipt=await engine.prepare(request(f.snapshot));
    assert.equal(receipt.role,role);assert.deepEqual(receipt.packs,offlinePackIds);assert.ok(receipt.bytes>0);
    const count=f.state.calls.length;await engine.preflight(request(f.snapshot));assert.equal(f.state.calls.length,count);
    const response=await engine.matchRelease(f.origins[role+'Origin']+f.snapshot.releaseBase+'index.html?session=one');
    assert.equal(response.headers.get('content-security-policy'),"default-src 'self'");
    await assert.rejects(engine.matchRelease(f.origins[role+'Origin']+f.snapshot.releaseBase+'not-in-manifest.js'),/selection/);
    await assert.rejects(engine.matchRelease(f.origins[role+'Origin']+f.snapshot.releaseBase+'index.html?unknown=one'),/query/);
  }
});
test('GG-OFFLINE-001: network failure and quota never produce a ready candidate; previously prepared release survives',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);let quota=false;
  const storage=memoryCaches({failPut:()=>quota}),engine=createOfflineCache({role:'shell',origin:f.origins.shellOrigin,cacheStorage:storage,fetchImpl:f.fetchImpl});
  await engine.prepare(request(f.snapshot));const next=await f.next();
  f.state.fail=url=>url.pathname.endsWith('/revision.txt');
  await assert.rejects(engine.prepare(request(next)),/network/);
  await assert.rejects(engine.preflight(request(next)),/not ready/);
  await engine.preflight(request(f.snapshot));
  f.state.fail=null;quota=true;
  await assert.rejects(engine.prepare(request(next)),/quota/);
  quota=false;await engine.preflight(request(f.snapshot));
});
test('GG-OFFLINE-001: corrupted hashes and post-ready cache tampering fail before a receipt or code response',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const storage=memoryCaches(),engine=createOfflineCache({role:'shell',origin:f.origins.shellOrigin,cacheStorage:storage,fetchImpl:f.fetchImpl});
  await assert.rejects(engine.prepare({...request(f.snapshot),manifestHash:'f'.repeat(64)}),/integrity/);
  await engine.prepare(request(f.snapshot));
  const cache=await storage.open('gg-offline:release:v1:shell:'+f.snapshot.cohort);
  await cache.put(f.origins.shellOrigin+f.snapshot.releaseBase+'index.html',new Response('bad',{headers:{'Content-Type':'text/html'}}));
  await assert.rejects(engine.preflight(request(f.snapshot)),/size|integrity/);
  await assert.rejects(engine.matchRelease(f.origins.shellOrigin+f.snapshot.releaseBase),/size|integrity/);
});
test('GG-OFFLINE-001: cancelling one queued operation does not delete or cancel another operation on its cohort',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const storage=memoryCaches(),engine=createOfflineCache({role:'shell',origin:f.origins.shellOrigin,cacheStorage:storage,fetchImpl:f.fetchImpl});
  let cancelled=false;
  const first=engine.prepare(request(f.snapshot),{cancelled:()=>cancelled,progress:()=>{cancelled=true;}});
  const second=engine.prepare(request(f.snapshot));
  await assert.rejects(first,/cancelled/);await second;await engine.preflight(request(f.snapshot));
  assert.equal(storage.caches.has('gg-offline:release:v1:shell:'+f.snapshot.cohort),true);
});
test('GG-OFFLINE-001: subset packs expand dependencies and absent engines are not represented as prepared',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const engine=createOfflineCache({role:'language',origin:f.origins.languageOrigin,cacheStorage:memoryCaches(),fetchImpl:f.fetchImpl});
  const receipt=await engine.prepare({...request(f.snapshot),packs:['javascript-quickjs']});
  assert.deepEqual(receipt.packs,['studio-core','scratch-2d','javascript-quickjs']);
  await assert.rejects(engine.preflight(request(f.snapshot)),/not prepared/);
  assert.equal(f.state.calls.some(url=>url.includes('vendor/pyodide/')),false);
});
test('GG-OFFLINE-001: SW accepts only recognized window clients, exact requests and role-specific preparation parents',()=>{
  const cohort='a'.repeat(64),data={protocolVersion:1,command:'prepare',operationId:id,cohort,manifestHash:'b'.repeat(64),packs:['studio-core']};
  const origin='http://127.0.0.1:4261',agent=origin+releaseBase(cohort)+'offline-preparer.html?nonce='+id+'&parentRole=shell';
  assert.deepEqual(validateWorkerRequest(data,{role:'runner',origin,sourceType:'window',sourceURL:agent}),data);
  for(const source of [origin+releaseBase(cohort)+'app/targets/text/language-worker.mjs',origin+releaseBase(cohort),origin+'/']) {
    assert.throws(()=>validateWorkerRequest(data,{role:'runner',origin,sourceType:'window',sourceURL:source}),/caller|agent/);
  }
  assert.throws(()=>validateWorkerRequest(data,{role:'runner',origin,sourceType:'worker',sourceURL:agent}),/caller/);
  assert.throws(()=>validateWorkerRequest({...data,extra:true},{role:'runner',origin,sourceType:'window',sourceURL:agent}),/request/);
  assert.throws(()=>validateWorkerRequest({...data,packs:['unknown']},{role:'runner',origin,sourceType:'window',sourceURL:agent}),/packs/);
});

test('GG-OFFLINE-001: a cohort cannot change its manifest identity or corrupt an existing ready release',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const storage=memoryCaches();let replacement;
  const fetchImpl=async input=>new URL(input).pathname.endsWith('/release.json')&&replacement
    ?new Response(replacement,{headers:{'Content-Type':'application/json'}}):f.fetchImpl(input);
  const engine=createOfflineCache({role:'shell',origin:f.origins.shellOrigin,cacheStorage:storage,fetchImpl});
  const previous=request(f.snapshot);
  await engine.prepare(previous);
  const mutated=structuredClone(f.snapshot.manifest);mutated.origins.shellOrigin='http://127.0.0.1:4999';
  replacement=new TextEncoder().encode(JSON.stringify(mutated));
  const count=f.state.calls.length;
  await assert.rejects(engine.prepare({...previous,manifestHash:await sha256(replacement)}),/Immutable.*identity/);
  assert.equal(f.state.calls.length,count,'identity conflicts fail before network or cache replacement');
  await engine.preflight(previous);
  const cache=await storage.open('gg-offline:release:v1:shell:'+f.snapshot.cohort);
  await cache.delete(f.origins.shellOrigin+f.snapshot.releaseBase+'__offline_ready__.json');
  await assert.rejects(engine.prepare({...previous,manifestHash:await sha256(replacement)}),/Immutable.*identity/,
    'valid cached metadata also pins identity before the ready marker exists');
  replacement=null;
  await engine.prepare(previous);await engine.preflight(previous);
});
test('GG-OFFLINE-001: rejected deployment metadata is not retained as a candidate identity',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const storage=memoryCaches();let replacement;
  const fetchImpl=async input=>new URL(input).pathname.endsWith('/release.json')&&replacement
    ?new Response(replacement,{headers:{'Content-Type':'application/json'}}):f.fetchImpl(input);
  const engine=createOfflineCache({role:'shell',origin:f.origins.shellOrigin,cacheStorage:storage,fetchImpl});
  const mutated=structuredClone(f.snapshot.manifest);mutated.origins.shellOrigin='http://127.0.0.1:4999';
  replacement=new TextEncoder().encode(JSON.stringify(mutated));
  await assert.rejects(engine.prepare({...request(f.snapshot),manifestHash:await sha256(replacement)}),/deployment/);
  const cache=await storage.open('gg-offline:release:v1:shell:'+f.snapshot.cohort);
  assert.equal(await cache.match(f.origins.shellOrigin+f.snapshot.releaseBase+'release.json'),undefined);
  replacement=null;await engine.prepare(request(f.snapshot));await engine.preflight(request(f.snapshot));
});
test('GG-OFFLINE-001: manifest, selection, receipt and request arrays reject holes, extras and non-string pack IDs',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  const local=await (await f.fetchImpl(f.origins.shellOrigin+f.snapshot.releaseBase+'manifest.json')).json();
  const engine=createOfflineCache({role:'shell',origin:f.origins.shellOrigin,cacheStorage:memoryCaches(),fetchImpl:f.fetchImpl});
  const receipt=await engine.prepare(request(f.snapshot));
  const selection={...f.snapshot.descriptor,releaseBase:f.snapshot.releaseBase,origins:f.origins,packs:[...offlinePackIds],
    receipts:Object.fromEntries(offlineRoles.map(role=>[role,{...receipt,role}]))};
  validateSelection(selection);
  for(const invalid of [Array(1),Object.assign(['studio-core'],{extra:true}),[1],[{toString:()=> 'studio-core'}]]) {
    assert.throws(()=>validateRoleManifest({...local,entries:[{...local.entries[0],packs:invalid}]},'shell',f.snapshot.cohort),/packs/);
    assert.throws(()=>validateSelection({...selection,packs:invalid}),/packs/);
    assert.throws(()=>validateSelection({...selection,receipts:{...selection.receipts,shell:{...receipt,packs:invalid}}}),/receipt/);
    assert.throws(()=>resolvePackSelection(f.snapshot.manifest,invalid),/selection/);
    const data={protocolVersion:1,command:'prepare',operationId:id,...f.snapshot.descriptor,packs:invalid};
    assert.throws(()=>validateWorkerRequest(data,{role:'shell',origin:f.origins.shellOrigin,sourceType:'window',sourceURL:f.origins.shellOrigin+'/'}),/packs/);
    const manifest=structuredClone(f.snapshot.manifest);manifest.packs[0].dependencies=invalid;
    assert.throws(()=>validateReleaseManifest(manifest),/dependencies/);
  }
  const sparseEntries={...local,entries:Array(1)};
  assert.throws(()=>validateRoleManifest(sparseEntries,'shell',f.snapshot.cohort),/entries/);
  const sparsePacks={...f.snapshot.manifest,packs:Array(offlinePackIds.length)};
  assert.throws(()=>validateReleaseManifest(sparsePacks),/packs/);
});
test('GG-OFFLINE-001: every partial selection includes the actual core and Scratch startup dependencies',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);
  for(const requested of [['studio-core'],['scratch-2d'],['microbit-simulator']]) {
    const selected=resolvePackSelection(f.snapshot.manifest,requested);
    assert.ok(selected.includes('studio-core'));assert.ok(selected.includes('scratch-2d'));
  }
});
