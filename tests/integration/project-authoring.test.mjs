import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {validateDeviceConfig,defaultDeviceGraph} from '../../src/contracts/device-program.mjs';
function environment() {
 const profile=createCapabilities(['gg.microbit']);
 let blockly={draft:'old-2d'},settings={deviceId:'microbit-main',variant:'universal',mode:'blocks'},graph=structuredClone(defaultDeviceGraph),active=true;
 let text={textDocuments:[],selectedTextDocumentId:null};let captureCalls=0,commits=0,failCommit=null;
 const groups=[new Set(),new Set(),new Set()],tokens=new WeakMap();
 const subscribe=index=>callback=>{groups[index].add(callback);return()=>groups[index].delete(callback);};
 const notify=index=>{for(const callback of groups[index])callback();};
 const editor={
  save:()=>structuredClone(blockly),captureCapabilities:()=>profile,
  prepare:(state,{capabilities})=>{assert.equal(capabilities?.locks.some(lock=>lock.id==='gg.microbit')??false,false);return {state:structuredClone(state),capabilities};},
  commit(candidate){blockly=structuredClone(candidate.state);commits++;notify(0);if(failCommit==='editor'){failCommit=null;throw new Error('editor commit failure');}},
  subscribe:subscribe(0)
 };
 const texts={
  capture:()=>structuredClone(text),prepare:value=>structuredClone({textDocuments:value.textDocuments??[],selectedTextDocumentId:value.selectedTextDocumentId??null}),
  commit(candidate){text=structuredClone(candidate);notify(1);if(failCommit==='text'){failCommit=null;throw new Error('text commit failure');}},
  checkpoint(){const token={};tokens.set(token,structuredClone(text));return token;},
  restoreDraft(token){if(!tokens.has(token))throw new Error('foreign text token');text=structuredClone(tokens.get(token));notify(1);},
  subscribe:subscribe(1)
 };
 const participant={
  id:'gg.microbit',context:'microbit',
  captureConfig(){captureCalls++;return active?{...settings,workspace:structuredClone(graph)}:null;},
  prepareConfig(config){return config===null?{active:false}:{active:true,config:validateDeviceConfig(config)};},
  commitConfig(candidate){active=candidate.active;if(active){const {workspace,...next}=candidate.config;settings=next;graph=structuredClone(workspace);}notify(2);if(failCommit==='device'){failCommit=null;throw new Error('device commit failure');}},
  checkpoint(){const token={};tokens.set(token,{settings:structuredClone(settings),graph:structuredClone(graph),active});return token;},
  restoreDraft(token){const saved=tokens.get(token);if(!saved)throw new Error('foreign device token');settings=structuredClone(saved.settings);graph=structuredClone(saved.graph);active=saved.active;notify(2);},
  hasAuthoring:()=>active&&graph.nodes.length>0,
  subscribe:subscribe(2)
 };
 const source=new EventTarget();source.value='legacy\r\n';source.selectionStart=2;source.selectionEnd=4;source.selectionDirection='backward';source.scrollTop=5;source.scrollLeft=8;
 source.ownerDocument={activeElement:source};source.focus=()=>{source.ownerDocument.activeElement=source;};source.setSelectionRange=(start,end,direction)=>{source.selectionStart=start;source.selectionEnd=end;source.selectionDirection=direction;};
 const authoring=createProjectAuthoring({editor,textDocuments:texts,source,capabilityEditors:[participant],initialCapabilities:profile});
 const model=(caps=profile)=>({capabilities:structuredClone(caps),authoring:{blockly:{draft:'new-2d'},deviceSource:'new legacy',textDocuments:[],selectedTextDocumentId:null}});
 return {authoring,source,profile,model,participant,get graph(){return graph;},set graph(value){graph=value;},get settings(){return settings;},get active(){return active;},get text(){return text;},set text(value){text=value;},get blockly(){return blockly;},get commits(){return commits;},get captureCalls(){return captureCalls;},fail(value){failCommit=value;},changed:()=>notify(2)};
}
test('GG-DEVICE-003: materialized capture uses the only live graph; device edits never reload 2D',()=>{
 const e=environment();let updates=0;e.authoring.subscribe(()=>updates++);
 const first=e.authoring.captureCapabilities();
 e.graph.nodes[1].fields.ICON='Happy';e.changed();
 const captured=e.authoring.capture();
 assert.equal(captured.capabilities.config['gg.microbit'].workspace.nodes[1].fields.ICON,'Happy');
 assert.equal(first.config['gg.microbit'].workspace.nodes[1].fields.ICON,'Heart');
 assert.equal(e.commits,0);assert.equal(updates,1);assert.equal(captured.deviceSource,'legacy\r\n');
 captured.capabilities.config['gg.microbit'].workspace.nodes[1].fields.ICON='Sad';
 assert.equal(e.graph.nodes[1].fields.ICON,'Happy');
});
test('GG-DEVICE-003: context projection does not capture an invalid other-context draft',()=>{
 const e=environment();e.graph.nodes[0].id='x'.repeat(10000);
 assert.throws(()=>e.authoring.captureCapabilities());
 const before=e.captureCalls,projection=e.authoring.captureExecutionCapabilities('scratch-2d');
 assert.equal(e.captureCalls,before);assert.deepEqual(projection.locks.map(item=>item.id),['gg.sprites']);
 assert.throws(()=>e.authoring.captureExecutionCapabilities('microbit'));
 assert.equal(e.commits,0);
});
test('GG-DEVICE-003: all participant preparation finishes before mutations; managed config removal is explicit',()=>{
 const e=environment(),before=e.authoring.capture();
 const malformed=e.model();malformed.capabilities.config['gg.microbit'].variant='other';
 assert.throws(()=>e.authoring.prepare(malformed));assert.deepEqual(e.authoring.capture(),before);assert.equal(e.commits,0);
 const noDevice=createCapabilities(['gg.sprites']);
 assert.throws(()=>e.authoring.prepare(e.model(noDevice)),/descartaría/);
 const candidate=e.authoring.prepare(e.model(noDevice),{allowRemoval:true});
 assert.equal(e.active,true);
 e.authoring.commit(candidate);assert.equal(e.active,false);
 assert.deepEqual(e.authoring.captureCapabilities().locks.map(item=>item.id),['gg.sprites']);
});
test('GG-DEVICE-003: commits notify once after all participants and preserve scope/profile settings',()=>{
 const e=environment();const model=e.model();model.capabilities.config['gg.microbit'].variant='v2';model.capabilities.config['gg.microbit'].mode='typescript';
 const candidate=e.authoring.prepare(model);let notices=0;
 e.authoring.subscribe(()=>{notices++;assert.deepEqual(e.blockly,{draft:'new-2d'});assert.equal(e.settings.variant,'v2');assert.equal(e.source.value,'new legacy');});
 e.authoring.commit(candidate);assert.equal(notices,1);
 assert.deepEqual(e.authoring.captureCapabilities(),model.capabilities);
 assert.throws(()=>e.authoring.commit({}),/no pertenece/);
});
test('GG-DEVICE-003: failures restore complete invalid drafts, graph, source selection and profile without portable revalidation',()=>{
 for(const failed of ['editor','text','device']) {
  const e=environment();e.graph.nodes[0].fields.unfinished='x'.repeat(9000);e.text={textDocuments:[{name:'',source:'unfinished'}],selectedTextDocumentId:'invalid-draft'};
  const previousGraph=structuredClone(e.graph),previousText=structuredClone(e.text);
  assert.throws(()=>e.authoring.captureCapabilities());
  const token=e.authoring.prepare(e.model());e.fail(failed);
  assert.throws(()=>e.authoring.commit(token),/commit failure/);
  assert.deepEqual(e.graph,previousGraph);assert.deepEqual(e.text,previousText);assert.deepEqual(e.blockly,{draft:'old-2d'});
  assert.equal(e.source.value,'legacy\r\n');assert.deepEqual([e.source.selectionStart,e.source.selectionEnd,e.source.selectionDirection],[2,4,'backward']);
  assert.deepEqual([e.source.scrollTop,e.source.scrollLeft],[5,8]);
  assert.throws(()=>e.authoring.captureCapabilities());
 }
});
test('GG-DEVICE-003: checkpoints are unforgeable, detached and restore legacy null profiles',()=>{
 const e=environment(),checkpoint=e.authoring.checkpoint();
 for(const fake of [{},structuredClone(checkpoint),null])assert.throws(()=>e.authoring.restoreDraft(fake),/no pertenece/);
 const other=environment();assert.throws(()=>other.authoring.restoreDraft(checkpoint),/no pertenece/);
 e.graph.nodes[1].fields.ICON='Sad';e.authoring.restoreDraft(checkpoint);assert.equal(e.graph.nodes[1].fields.ICON,'Heart');
 const legacy=e.model(null),candidate=e.authoring.prepare(legacy,{allowRemoval:true});e.authoring.commit(candidate);
 assert.equal(e.authoring.captureCapabilities(),null);assert.equal(Object.hasOwn(e.authoring.capture(),'capabilities'),false);
 e.authoring.restoreDraft(checkpoint);assert.ok(e.authoring.captureCapabilities().config['gg.microbit']);
});
test('GG-DEVICE-003: source subscriptions dispose cleanly and failed captures do not replace drafts',()=>{
 const e=environment();let count=0;e.authoring.subscribe(()=>count++);
 e.source.dispatchEvent(new Event('input'));assert.equal(count,1);
 const before=e.graph;e.graph.nodes[0].inputs.DO='missing';assert.throws(()=>e.authoring.capture());assert.equal(e.graph,before);
 e.authoring.dispose();e.source.dispatchEvent(new Event('input'));e.changed();assert.equal(count,1);
});
