import test from 'node:test';
import assert from 'node:assert/strict';
import {createOfflineController} from '../../src/offline/controller.mjs';
import {createMemoryOfflineStore} from '../../src/offline/store.mjs';
import {offlineRoles,offlinePackIds,releaseBase} from '../../src/offline/contracts.mjs';
import {offlineFixture} from '../helpers/offline-fixture.mjs';
function receipts(selection,manifest) {
  return Object.fromEntries(offlineRoles.map(role=>[role,{role,cohort:selection.cohort,manifestHash:selection.manifestHash,roleManifestHash:manifest.roles[role].sha256,packs:[...selection.packs],bytes:10}]));
}
function createHarness(f,store=createMemoryOfflineStore()) {
  const state={release:f.snapshot,fail:false,hold:null,commands:[]},changes=[];
  const transport={init:async()=>{},async run(command,selection,operation) {
    state.commands.push(command);
    if(state.hold) await state.hold;
    if(state.fail) throw new Error('One origin incomplete');
    const manifest=selection.cohort===f.snapshot.cohort?f.snapshot.manifest:state.release.manifest;
    return receipts(selection,manifest);
  }};
  const controller=createOfflineController({config:f.origins,store,transport,onChange:value=>changes.push(value),
    loadRelease:async()=>({descriptor:state.release.descriptor,manifest:state.release.manifest})});
  return {controller,state,store,changes,transport};
}
test('GG-OFFLINE-001: complete receipts commit current/previous; invalid candidate preserves selection and detached state',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);const h=createHarness(f);
  assert.equal((await h.controller.init()).current,null);
  await h.controller.prepare();
  assert.equal(h.controller.hasPack('python-stdlib'),true);
  const previous=await h.store.read();assert.equal(previous.current.cohort,f.snapshot.cohort);
  h.state.release=await f.next();h.state.fail=true;
  await assert.rejects(h.controller.prepare(),/incomplete/);
  assert.deepEqual(await h.store.read(),previous);
  h.state.fail=false;await h.controller.prepare();
  const state=await h.controller.status();
  assert.equal(state.current.cohort,h.state.release.cohort);assert.equal(state.previous.cohort,f.snapshot.cohort);
  state.current.packs.length=0;h.changes.at(-1).current.origins.shellOrigin='changed';
  assert.deepEqual(h.controller.state().current.packs,offlinePackIds);
  assert.equal(h.controller.state().current.origins.shellOrigin,f.origins.shellOrigin);
});
test('GG-OFFLINE-002: rollback preflights the whole previous selection and failed rollback does not mutate pointers',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);const h=createHarness(f);
  await h.controller.init();await h.controller.prepare();h.state.release=await f.next();await h.controller.prepare();
  const before=await h.store.read();h.state.fail=true;
  await assert.rejects(h.controller.rollback(),/incomplete/);assert.deepEqual(await h.store.read(),before);
  h.state.fail=false;const rolled=await h.controller.rollback();
  assert.equal(rolled.cohort,f.snapshot.cohort);assert.equal((await h.store.read()).previous.cohort,h.state.release.cohort);
  assert.equal(h.state.commands.at(-1),'preflight');
});
test('GG-OFFLINE-001: cancellation suppresses late receipts without deleting a prepared cohort or publishing current',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);const h=createHarness(f);await h.controller.init();await h.controller.prepare();
  h.state.release=await f.next();const before=await h.store.read();
  let release;h.state.hold=new Promise(resolve=>{release=resolve;});
  const pending=h.controller.prepare();
  while(h.state.commands.length<2) await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.controller.cancel(),true);assert.equal(h.controller.cancel(),false);
  release();await assert.rejects(pending,/cancelada/);
  assert.deepEqual(await h.store.read(),before);assert.equal(h.controller.state().status,'ready');
});
test('GG-OFFLINE-002: generation CAS rejects the second tab commit while preserving the winning pointer',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);const store=createMemoryOfflineStore(),a=createHarness(f,store),b=createHarness(f,store);
  let resolveA,resolveB;a.state.hold=new Promise(resolve=>{resolveA=resolve;});b.state.hold=new Promise(resolve=>{resolveB=resolve;});
  const first=a.controller.prepare(),second=b.controller.prepare();
  while(a.state.commands.length<1||b.state.commands.length<1) await new Promise(resolve=>setImmediate(resolve));
  resolveA();await first;const winner=await store.read();resolveB();
  await assert.rejects(second,/pestana/);assert.deepEqual(await store.read(),winner);assert.equal(winner.generation,1);
});
test('GG-OFFLINE-001: malformed role receipts fail before commit and cancelled storage commit stays unchanged',async t=>{
  const f=await offlineFixture();t.after(f.cleanup);const h=createHarness(f);
  h.transport.run=async(command,selection)=>{const result=receipts(selection,f.snapshot.manifest);result.runner.manifestHash='f'.repeat(64);return result;};
  await assert.rejects(h.controller.prepare(),/receipt/);assert.equal((await h.store.read()).generation,0);
  const candidate={...f.snapshot.descriptor,releaseBase:releaseBase(f.snapshot.cohort),origins:f.origins,packs:[...offlinePackIds]};
  candidate.receipts=receipts(candidate,f.snapshot.manifest);
  const abort=new AbortController();abort.abort();
  await assert.rejects(h.store.commit(candidate,0,{signal:abort.signal}),/cancelada/);assert.equal((await h.store.read()).generation,0);
});
