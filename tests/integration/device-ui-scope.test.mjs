import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {createDeviceUI} from '../../src/studio/device-ui.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {validateDeviceGraph} from '../../src/contracts/device-program.mjs';
const markup=await readFile(new URL('../../src/studio/index.html',import.meta.url),'utf8');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function harness(t) {
 const dom=new JSDOM(markup,{url:'http://127.0.0.1:4173/'}),before=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,writable:true,value:dom.window.document});
 t.after(()=>{dom.window.close();if(before)Object.defineProperty(globalThis,'document',before);else delete globalThis.document;});
 const initial=createCapabilities(['gg.microbit']),listeners=new Set(),checkpoints=new WeakMap(),calls=[],diagnostics=[];
 let graph=structuredClone(initial.config['gg.microbit'].workspace),outer={sessionId:'session-one',revision:1};
 const editor={
  captureGraph:()=>structuredClone(graph),prepare:value=>validateDeviceGraph(value),
  commit:value=>{graph=structuredClone(value);for(const listener of listeners)listener();},
  checkpoint:()=>{const token={};checkpoints.set(token,structuredClone(graph));return token;},
  restoreDraft:token=>{graph=structuredClone(checkpoints.get(token));for(const listener of listeners)listener();},
  subscribe:callback=>{listeners.add(callback);return()=>listeners.delete(callback);},setReady(){},setVisible(){}
 };
 const source=document.querySelector('#source');source.value='// source remains independent\r\nbasic.showNumber(8)';
 let ui;
 ui=createDeviceUI({editor,source,getCapabilities:()=>createCapabilities(['gg.microbit'],{config:{'gg.microbit':ui.config()}}),
  activate:async()=>{},getScope:()=>({...outer}),runTogether:async()=>{throw new Error('Unexpected simulator request');},
  requirePack(){},onDiagnostic:value=>diagnostics.push(value),
  request:(command,payload)=>{
   if(command==='invalidate-device')return Promise.resolve({});
   assert.equal(command,'compile-device');
   return new Promise((resolve,reject)=>calls.push({payload,resolve,reject}));
  }
 });
 ui.participant.commitConfig(ui.participant.prepareConfig(initial.config['gg.microbit']));ui.setReady(true);ui.setRunnerReady(true);
 return {ui,diagnostics,calls,source,dom,
  click:()=>document.querySelector('#compile-device').click(),
  change(action) {
   if(action==='variant') {const select=document.querySelector('#device-variant');select.value='v2';select.dispatchEvent(new dom.window.Event('change'));}
   else if(action==='graph') {graph.nodes.find(node=>node.id==='device-number').fields.NUMBER=2;for(const listener of listeners)listener();}
   else if(action==='source') {source.value+='\n// edit';source.dispatchEvent(new dom.window.Event('input'));}
   else if(action==='stop') {outer={sessionId:'session-after-stop',revision:1};ui.setRunnerReady(false);ui.onReset();}
   else throw new Error('Unknown test action');
  },
  get error(){return document.querySelector('#device-error').textContent;},
  get status(){return document.querySelector('#device-build-status').textContent;},
  get disabled(){return document.querySelector('#download-device').disabled;}
 };
}
for(const action of ['variant','graph','source','stop'])for(const outcome of ['success','error']) {
 test('GG-DEVICE-004: late '+outcome+' after '+action+' cannot publish diagnostics, firmware or status',async t=>{
  const h=harness(t);h.click();assert.equal(h.calls.length,1);assert.equal(h.ui.state().busy,true);
  const pending=h.calls[0],originalSource=h.source.value;
  h.change(action);const expectedStatus=h.status,expectedError=h.error,expectedRevision=h.ui.state().revision;
  if(outcome==='error')pending.reject(new Error('OLD_DEVICE_FAILURE'));
  else pending.resolve({success:true,deviceScope:pending.payload.deviceScope,compilerPackHash:'a'.repeat(64),
    diagnostics:[{fileName:'main.ts',start:0,line:0,messageText:'OLD_DEVICE_DIAGNOSTIC'}],outfiles:{'binary.hex':'OLD_INVALID_HEX'}});
  await turn();await turn();
  assert.equal(h.error,expectedError);assert.equal(h.status,expectedStatus);
  assert.equal(h.diagnostics.some(record=>/OLD_DEVICE/.test(record.message)),false);
  assert.equal(h.ui.state().firmware,null);assert.equal(h.ui.state().busy,false);assert.equal(h.disabled,true);
  assert.equal(h.ui.state().revision,expectedRevision);
  if(action!=='source')assert.equal(h.source.value,originalSource);
 });
}
test('GG-DEVICE-004: an error for the current scope remains visible and releases the controls',async t=>{
 const h=harness(t);h.click();h.calls[0].reject(new Error('CURRENT_BACKEND_FAILURE'));await turn();await turn();
 assert.equal(h.error,'CURRENT_BACKEND_FAILURE');assert.equal(h.diagnostics.length,1);
 assert.equal(h.diagnostics[0].origin,'device');assert.equal(h.ui.state().busy,false);assert.equal(h.disabled,true);
 assert.equal(document.querySelector('#compile-device').disabled,false);
});
test('GG-DEVICE-002/004: current main.ts diagnostics link to the current device block and leave source unchanged',async t=>{
 const h=harness(t),source=h.source.value,prepared=h.ui.prepared(),range=prepared.sourceMap.find(item=>item.sourceBlockId==='device-number');
 h.click();const pending=h.calls[0];
 pending.resolve({success:false,deviceScope:pending.payload.deviceScope,
  diagnostics:[{fileName:'main.ts',start:range.start,line:range.startLine-1,messageText:'CURRENT_DEVICE_DIAGNOSTIC'}],outfiles:{}});
 await turn();await turn();
 assert.equal(h.diagnostics.length,1);assert.equal(h.diagnostics[0].sourceBlockId,'device-number');
 assert.equal(h.diagnostics[0].origin,'device');assert.equal(h.source.value,source);assert.equal(h.disabled,true);
});
