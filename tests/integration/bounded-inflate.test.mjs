import test from 'node:test';
import assert from 'node:assert/strict';
import {Inflate,deflate,deflateRaw} from 'pako';
import {createBoundedInflaters} from '../../src/targets/assets/bounded-inflate.mjs';
const {inflateRaw,inflateZlib}=createBoundedInflaters(Inflate);
async function decode(method,bytes,quota) { const chunks=[];await method(bytes,{maxOutputBytes:quota,onData:chunk=>chunks.push(chunk.slice())});return Buffer.concat(chunks); }
test('pinned streaming codec checks actual output, exact stream end and cancellation before publication',async()=>{
  const original=new TextEncoder().encode('GuateGeeks '.repeat(6000)),compressed=deflateRaw(original);
  assert.deepEqual(await decode(inflateRaw,compressed,original.length),Buffer.from(original));
  let retained=0;
  await assert.rejects(inflateRaw(compressed,{maxOutputBytes:20000,onData:chunk=>{retained+=chunk.length;}}),/cuota/);
  assert.ok(retained<=20000);
  await assert.rejects(decode(inflateRaw,compressed.subarray(0,compressed.length-1),original.length),/truncado|inválido/);
  const trailing=new Uint8Array(compressed.length+2);trailing.set(compressed);trailing.set([1,2],compressed.length);
  await assert.rejects(decode(inflateRaw,trailing,original.length),/posteriores/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(inflateRaw(compressed,{signal:controller.signal,maxOutputBytes:original.length,onData(){}}),{name:'AbortError'});
});
test('PNG zlib wrapper rejects checksum errors, dictionary/concatenated streams and trailing bytes',async()=>{
  const data=new Uint8Array([0,255,0,10,20,0,4,5,6]),compressed=deflate(data);
  assert.deepEqual(await decode(inflateZlib,compressed,data.length),Buffer.from(data));
  const broken=compressed.slice();broken[broken.length-1]^=1;
  await assert.rejects(decode(inflateZlib,broken,data.length),/checksum/);
  const extra=Buffer.concat([compressed,deflate(new Uint8Array())]);
  await assert.rejects(decode(inflateZlib,extra,data.length),/posteriores|checksum/);
  const dict=compressed.slice();dict[1]|=32;
  await assert.rejects(decode(inflateZlib,dict,data.length),/cabecera/);
});
