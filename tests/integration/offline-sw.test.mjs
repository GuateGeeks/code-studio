import test from 'node:test';
import assert from 'node:assert/strict';
import {installOfflineWorker} from '../../src/offline/service-worker.mjs';
import {memoryCaches} from '../helpers/offline-fixture.mjs';
const origin='http://127.0.0.1:4261',cohort='a'.repeat(64),base='/releases/'+cohort+'/',id='e5d0f9a7-7691-4e6b-8000-520630f4304c';
function harness(clientURL,role='runner',clientType='window') {
  const listeners=new Map(),calls=[];
  const scope={location:{origin},caches:memoryCaches(),crypto:globalThis.crypto,clients:{get:async()=>({url:clientURL,type:clientType})},
    fetch:async request=>{calls.push(typeof request==='string'?request:request.url);return new Response('root sentinel');},
    addEventListener:(type,callback)=>listeners.set(type,callback)};
  installOfflineWorker(role,scope);
  return {listeners,calls};
}
test('GG-OFFLINE-002: versioned client root escapes fail while existing online legacy clients retain lazy loading',async()=>{
  for(const [clientURL,expected] of [[origin+base,503],[origin+'/',200]]) {
    const h=harness(clientURL);let response;
    h.listeners.get('fetch')({request:new Request(origin+'/vendor/root-sentinel.js'),clientId:'page',respondWith:value=>{response=value;}});
    assert.equal((await response).status,expected);
    assert.equal(h.calls.length,expected===503?0:1);
  }
});
test('GG-OFFLINE-002: unknown cohort remains an exact versioned request, never a root or another cohort fallback',async()=>{
  const h=harness(origin+base);let response;
  const url=origin+base+'vendor/missing.js';
  h.listeners.get('fetch')({request:new Request(url),clientId:'page',respondWith:value=>{response=value;}});
  assert.equal((await response).status,200);assert.deepEqual(h.calls,[url]);
});
test('GG-OFFLINE-001: runtime/worker clients cannot send preparation requests to the SW even with a valid DTO',()=>{
  const h=harness(origin+base),data={protocolVersion:1,command:'prepare',operationId:id,cohort,manifestHash:'b'.repeat(64),packs:['studio-core']};
  for(const source of [
    {url:origin+base+'app/targets/text/language-worker.mjs',type:'worker'},
    {url:origin+base+'app/targets/text/language-host.mjs',type:'window'},
    {url:origin+base,type:'window'}
  ]) {
    let invoked=false;
    h.listeners.get('message')({data,source,ports:[{start:()=>{invoked=true;}}],waitUntil:()=>{invoked=true;}});
    assert.equal(invoked,false);
  }
  assert.equal(h.calls.length,0);
});

test('GG-F6-EXPORT: only a window of the same immutable shell cohort may fetch a checked runtime package',async()=>{
 const endpoint='/standalone-runtime/'+cohort+'/scene3d/python.zip';
 for(const [clientURL,role,type,path,expected]of [
 [origin+base,'shell','window',endpoint,200],
 [origin+base,'shell','window',endpoint+'?other=true',503],
 [origin+'/releases/'+'b'.repeat(64)+'/','shell','window',endpoint,503],
 [origin+'/','shell','window',endpoint,503],
 [origin+base+'app/worker.mjs','shell','worker',endpoint,503],
 [origin+base,'runner','window',endpoint,503],
 [origin+base,'shell','window',endpoint.replace('scene3d','unknown'),503],
 [origin+base,'shell','window','/vendor/unversioned.js',503]]){
  const h=harness(clientURL,role,type);let response;h.listeners.get('fetch')({request:new Request(origin+path),clientId:'page',respondWith:value=>{response=value;}});
  assert.equal((await response).status,expected,[clientURL,role,type,path].join(' '));assert.equal(h.calls.length,expected===200?1:0);
 }
});


test('GG-F6-NAV: only explicit shell document navigations reach immutable online entry redirects',async()=>{
 for(const [role,path,mode,expected] of [
 ['shell','/latest','navigate',200],['shell','/device-transfer.html?nonce=test','navigate',200],
 ['shell','/latest','cors',503],['shell','/device-transfer.html','cors',503],
 ['runner','/latest','navigate',503],['shell','/vendor/missing.js','navigate',503],
 ['shell','/unknown.html','navigate',503]]){
  const h=harness(origin+base,role);let response;
  h.listeners.get('fetch')({request:{method:'GET',url:origin+path,mode},clientId:'page',respondWith:value=>{response=value;}});
  assert.equal((await response).status,expected,[role,path,mode].join(' '));assert.equal(h.calls.length,expected===200?1:0);
 }
});
