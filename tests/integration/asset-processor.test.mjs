import test from 'node:test';
import assert from 'node:assert/strict';
import {createAssetProcessor,assetProcessingLimits} from '../../src/import/asset-processor.mjs';
class WorkerDouble {
  static instances = [];
  constructor(url,options) { this.url=url;this.options=options;this.terminated=false;WorkerDouble.instances.push(this); }
  postMessage(message) { this.sent=message; }
  terminate() { this.terminated=true; }
  reply(message) { this.onmessage({data:message}); }
}
test('asset worker replacement, AbortSignal and stale envelopes cannot publish into a later job',async()=>{
  WorkerDouble.instances=[];
  const processor=createAssetProcessor({Worker:WorkerDouble,milliseconds:1000});
  const old=processor.process('prepare-media',{bytes:new Uint8Array([1])}).catch(error=>error);
  const first=WorkerDouble.instances[0];
  const next=processor.process('prepare-media',{bytes:new Uint8Array([2])});
  assert.equal((await old).name,'AbortError');assert.equal(first.terminated,true);
  const second=WorkerDouble.instances[1];
  first.reply({version:1,id:first.sent.id,result:'obsolete'});
  second.reply({version:1,id:first.sent.id,result:'wrong-id'});
  second.reply({version:2,id:second.sent.id,result:'wrong-version'});
  second.reply({version:1,id:second.sent.id,result:'unknown-field',extra:true});
  assert.equal(processor.state().pending,1);
  second.reply({version:1,id:second.sent.id,result:{validated:'current'}});
  assert.deepEqual(await next,{validated:'current'});assert.equal(second.terminated,true);
  const abort=new AbortController();
  const pending=processor.process('prepare-media',{bytes:new Uint8Array([3])},{signal:abort.signal}).catch(error=>error);
  abort.abort();assert.equal((await pending).name,'AbortError');assert.equal(processor.state().pending,0);
  processor.dispose();await assert.rejects(processor.process('prepare-media',{}),/cerrado/);
});
test('invalid or oversized jobs never construct a worker; bootstrap and deadline failures terminate it',async()=>{
  WorkerDouble.instances=[];
  const processor=createAssetProcessor({Worker:WorkerDouble,milliseconds:20});
  await assert.rejects(processor.process('execute-code',{source:'anything'}),/no soportada/);
  await assert.rejects(processor.process('prepare-media',{bytes:new Uint8Array(assetProcessingLimits.inputBytes+1)}),/límite/);
  const cycle={};cycle.self=cycle;
  await assert.rejects(processor.process('prepare-media',cycle),/ciclos/);
  await assert.rejects(processor.process('prepare-media',{list:Array(4)}),/Lista/);
  assert.equal(WorkerDouble.instances.length,0);
  const deadline=processor.process('prepare-media',{});await assert.rejects(deadline,/tiempo/);
  assert.equal(WorkerDouble.instances[0].terminated,true);
  const bootstrap=processor.process('prepare-media',{});let prevented=false;
  WorkerDouble.instances[1].onerror({message:'Missing local codec',preventDefault(){prevented=true;}});
  await assert.rejects(bootstrap,/Missing local codec/);assert.equal(prevented,true);
  assert.equal(WorkerDouble.instances[1].terminated,true);processor.dispose();
});
