import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {createStoredPackage,readStoredPackage,packageLimits} from '../../src/export/stored-package.mjs';
const sample=()=>createStoredPackage([['index.html','<!doctype html>'],['roles/language/a.bin',Uint8Array.from([0,1,128,255])],['documentos/ñ.txt','GuateGeeks ñ']]);
function mutate(callback){const bytes=sample(),view=new DataView(bytes.buffer),end=bytes.length-22,central=view.getUint32(end+16,true);callback(bytes,view,{central,end});return bytes;}

test('GG-EXPORT STORE has deterministic detached UTF8/binary interoperability and no compression',async()=>{
 const bytes=sample(),copy=readStoredPackage(bytes);assert.deepEqual(sample(),bytes);
 assert.equal(new TextDecoder().decode(copy[0][1]),'<!doctype html>');assert.deepEqual([...copy[1][1]],[0,1,128,255]);
 copy[0][1][0]=0;assert.equal(readStoredPackage(bytes)[0][1][0],60);
 const zip=await JSZip.loadAsync(bytes,{checkCRC32:true});assert.equal(await zip.file('documentos/ñ.txt').async('string'),'GuateGeeks ñ');
 assert.equal(Object.values(zip.files).filter(file=>!file.dir).length,3);
});
test('GG-EXPORT STORE rejects unsafe paths, duplicate/sparse inventories and entry quotas before packaging',()=>{
 for(const path of ['../escape','a/../escape','/absolute','a//b','a/./b','a\\b','a?b','a#b','a%b','a\0b','C:/escape','C:escape','a\u007fb'])assert.throws(()=>createStoredPackage([[path,'x']]),path);
 assert.throws(()=>createStoredPackage([['same','a'],['same','b']]),/Duplicate|duplicate/);
 assert.throws(()=>createStoredPackage(Array(packageLimits.entries+1)),/limit/);
 assert.throws(()=>createStoredPackage(Array(1)));
 assert.throws(()=>createStoredPackage([['file',null]]));
 assert.throws(()=>createStoredPackage([['file','x','ignored']]));
 assert.throws(()=>createStoredPackage(['ab']));
});
test('GG-EXPORT STORE rejects CRC, bounds, compression, encryption, split disks, symlinks and mismatched headers',()=>{
 const variants=[
  bytes=>bytes[31]^=1,
  (b,v,{central})=>v.setUint16(central+10,8,true),
  (b,v,{central})=>v.setUint16(central+8,1,true),
  (b,v,{central})=>v.setUint16(central+34,1,true),
  (b,v,{central})=>{v.setUint16(central+4,0x0314,true);v.setUint32(central+38,0xa0000000,true);},
  (b,v,{central})=>v.setUint16(central+6,99,true),
  (b,v)=>v.setUint16(4,99,true),
  (b,v,{central})=>{v.setUint32(central+20,packageLimits.fileBytes+1,true);v.setUint32(central+24,packageLimits.fileBytes+1,true);},
  (b,v,{central})=>v.setUint32(central+42,1,true),
  (b,v,{end})=>v.setUint16(end+8,1,true),
  (b,v,{end})=>v.setUint16(end+20,1,true)
 ];
 variants.forEach((change,index)=>assert.throws(()=>readStoredPackage(mutate(change)),'malformed '+index));
 for(const bytes of [new Uint8Array(),sample().slice(0,-1),new Uint8Array([...sample(),0])])assert.throws(()=>readStoredPackage(bytes));
});
