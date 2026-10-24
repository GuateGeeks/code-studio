import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createQuickJSEngine} from '../../src/targets/text/quickjs-engine.mjs';
import {createPythonEngine} from '../../src/targets/text/python-engine.mjs';
import {createCapabilityProgramHost} from '../../src/runtime/capability-program.mjs';
import {createGeneratedCapabilityDocument,generateCapabilityProgramSource} from '../../src/generated-capability-source.mjs';
import {resolveOperationProfile} from '../../src/contracts/operations.mjs';
import {languageProfileMetadata,resolveLanguageProfile,validateCapabilityRPC,validateCapabilityInvocation,cloneCapabilityJSON} from '../../src/contracts/capability-language.mjs';
import {validateLanguageRPC} from '../../src/contracts/language-runtime.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';
const require=createRequire(import.meta.url),wasmLocation=require.resolve('@jitl/quickjs-wasmfile-release-sync/wasm');
const pause=()=>new Promise(resolve=>setTimeout(resolve,1));
async function until(predicate){const end=Date.now()+10000;while(!predicate()){if(Date.now()>end)assert.fail('Expected capability state not reached');await pause();}}
const move=(sourceBlockId,x)=>({kind:'call',operationId:'scene3d.move',args:{targetId:'sphere',delta:{x,y:0,z:0}},sourceBlockId});
const sphere={version:1,contextId:'scene3d',documentId:'scene-main',variables:[{id:'steps',name:'Pasos',type:'number',initialValue:2}],scripts:[
 {event:'start',targetId:null,sourceBlockId:'start',body:[{kind:'repeat',count:3,sourceBlockId:'repeat',body:[move('move',{kind:'variable',variableId:'steps',sourceBlockId:'read-steps'}),{kind:'wait',seconds:0,sourceBlockId:'wait'}]}]},
 {event:'key',targetId:null,key:'space',sourceBlockId:'key',body:[move('key-move',1)]}
]};
const form={version:1,contextId:'webapp',documentId:'app-main',variables:[],scripts:[
 {event:'submit',targetId:'form',sourceBlockId:'submit',body:[{kind:'call',operationId:'webapp.appendItem',args:{targetId:'list',text:{kind:'event',path:'values.name',sourceBlockId:'field'}},sourceBlockId:'append'}]}
]};
async function harness(t,{ir,language='javascript',source}){
 const profile=resolveOperationProfile({contextId:ir.contextId,documentId:ir.documentId}),metadata=languageProfileMetadata(profile),events=new Map(),calls=[],diagnostics=[],errors=[],deliveries=[];
 let revision=3,sessionId='session-original',engine,execution,ready=false;
 const host=createCapabilityProgramHost({profile,getRevision:()=>revision,getScope:()=>({sessionId,revision}),
  subscribeEvent:(descriptor,callback)=>{events.set(descriptor.event+':'+descriptor.targetId,callback);return()=>events.delete(descriptor.event+':'+descriptor.targetId);},
  callOperation:async(operationId,args,authority)=>{calls.push({operationId,args,authority});return operationId.endsWith('snapshot')?{items:[]} :null;},
  onInvocation:data=>{deliveries.push(data);return engine.invoke(data).then(result=>{host.complete({invocationId:data.invocationId,revision:data.revision,result});},error=>{errors.push(error);host.complete({invocationId:data.invocationId,revision:data.revision,error:error.message});});},
  onCancel:data=>engine?.cancelInvocation(data.invocationId),onDiagnostic:record=>diagnostics.push(record)});
 const generated=createGeneratedCapabilityDocument(ir,language);
 const document=source===undefined?generated.document:createTextDocument({language,name:'API2 test',source});
 const options={profile:metadata,rpc:(method,args)=>host.call(method,args),onDiagnostic:record=>diagnostics.push(record),onProgramReady:()=>{ready=true;}};
 engine=language==='javascript'?await createQuickJSEngine({...options,wasmLocation}):await createPythonEngine({...options,indexURL:resolve('node_modules/pyodide')+'/'});
 t.after(async()=>{host.dispose();engine.dispose();await execution?.catch(()=>{});});
 await engine.prepare(document);
 return {engine,host,profile,metadata,document,generated,calls,diagnostics,errors,deliveries,events,
  execute(){execution=engine.execute();execution.catch(()=>{});return execution;},
  async listening(){await until(()=>ready);},
  async settled(){await until(()=>host.state().invocations===0);},
  changeScope(){revision++;sessionId='session-replaced';},
  async emit(event,targetId,payload={}){events.get(event+':'+targetId)?.({type:event,targetId,...payload});await pause();await until(()=>host.state().invocations===0);}
 };
}

test('GG-API2 closed metadata/RPC rejects imported authority and keeps API1 closed',()=>{
 const profile=resolveOperationProfile({contextId:'scene3d',documentId:'scene-main'}),meta=languageProfileMetadata(profile);
 assert.equal(resolveLanguageProfile(meta).principal,'gg.3d-basic');
 assert.throws(()=>resolveLanguageProfile({...meta,operations:[]}),/API2/);
 assert.throws(()=>resolveLanguageProfile({...meta,profileId:'unknown'}),/API2/);
 assert.throws(()=>validateCapabilityRPC('context.call',['invoke','scene3d.move',{targetId:'sphere',delta:{x:1,y:0,z:0},principal:'gg.webapps'}],profile));
 assert.throws(()=>validateLanguageRPC('context.call',['invoke','scene3d.snapshot',{}]),/GG language/);
 const invocation={version:2,invocationId:'invoke',handlerId:'handler-0',targetId:null,revision:3,event:{type:'start',targetId:null}};
 assert.deepEqual(validateCapabilityInvocation(invocation,profile),invocation);
 for(const value of [{...invocation,principal:'gg.webapps'},{...invocation,contextId:'webapp'},{...invocation,event:{type:'start',targetId:'foreign'}},{...invocation,event:{type:'start',targetId:null,html:'<script>'}}])assert.throws(()=>validateCapabilityInvocation(value,profile));
 assert.throws(()=>cloneCapabilityJSON(Array(1)));
 const accessor={};Object.defineProperty(accessor,'read',{enumerable:true,get(){assert.fail('Accessor executed');}});assert.throws(()=>cloneCapabilityJSON(accessor));
});

for(const language of ['javascript','python']){
 test('GG-IR1 actual '+language+': sphere control flow, variables, callbacks and authority use the same bindings',{timeout:30000},async t=>{
  const run=await harness(t,{ir:sphere,language});assert.deepEqual(run.calls,[]);
  run.execute();await run.listening();await run.settled();
  assert.equal(run.errors.length,0);
  assert.equal(run.calls.filter(call=>call.operationId==='scene3d.move').reduce((n,call)=>n+call.args.delta.x,0),6);
  assert.ok(run.calls.every(call=>call.authority.sessionId==='session-original'&&call.authority.revision===3&&call.authority.principal==='gg.3d-basic'&&call.authority.documentId==='scene-main'&&call.authority.contextId==='scene3d'&&call.authority.targetId===null));
  await run.emit('key',null,{key:'space'});
  assert.equal(run.calls.filter(call=>call.operationId==='scene3d.move').reduce((n,call)=>n+call.args.delta.x,0),7);
  assert.deepEqual(run.errors,[]);
  assert.ok(run.generated.sourceMap.some(ids=>ids.includes('move')&&ids.includes('read-steps')));
 });
 test('GG-IR1 actual '+language+': form event is copied JSON, appends literal markup and Stop revokes listener',{timeout:30000},async t=>{
  const run=await harness(t,{ir:form,language});run.execute();await run.listening();
  const value='<script>texto literal ñ</script>';
  await run.emit('submit','form',{values:{name:value}});
  assert.deepEqual(run.calls.map(call=>[call.operationId,call.args]),[['webapp.appendItem',{targetId:'list',text:value}]]);
  assert.equal(run.calls[0].authority.targetId,'form');
  run.host.stop();assert.equal(run.events.size,0);
  await run.emit('submit','form',{values:{name:'late'}});assert.equal(run.calls.length,1);
  assert.deepEqual(run.errors,[]);
 });
}

test('GG-API2 QuickJS globals work before configure; configure revokes mutations even before activate',{timeout:5000},async t=>{
 const source='await GG.scene3d.move({targetId:"sphere",delta:{x:1,y:0,z:0}}); GG.context.configure({contextId:"scene3d",documentId:"scene-main"}); await GG.scene3d.move({targetId:"sphere",delta:{x:99,y:0,z:0}});';
 const run=await harness(t,{ir:sphere,source});
 await assert.rejects(run.execute(),/ctx/);assert.equal(run.calls.length,1);assert.equal(run.calls[0].args.delta.x,1);
});

test('GG-API2 retained ctx is revoked after completion/cancel and global mutations cannot bypass it',{timeout:5000},async t=>{
 const source='GG.context.configure({contextId:"scene3d",documentId:"scene-main"});\nlet held;\n'
 +'GG.context.when({event:"click",targetId:"sphere"},async(ctx,event)=>{held=ctx;await ctx.scene3d.move({targetId:"sphere",delta:{x:1,y:0,z:0}});});\n'
 +'GG.context.when({event:"key",targetId:null,key:"space"},async(ctx,event)=>{\n'
 +'try{await held.scene3d.move({targetId:"sphere",delta:{x:99,y:0,z:0}});}catch(error){console.log("old revoked");}\n'
 +'try{await GG.scene3d.move({targetId:"sphere",delta:{x:99,y:0,z:0}});}catch(error){console.log("global revoked");}\n'
 +'await ctx.wait(10);\nawait ctx.scene3d.move({targetId:"sphere",delta:{x:99,y:0,z:0}});\n});\nawait GG.context.activate();';
 const run=await harness(t,{ir:sphere,source});run.execute();await run.listening();await run.emit('click','sphere');
 run.events.get('key:null')({type:'key',targetId:null,key:'space'});
 await until(()=>run.diagnostics.some(record=>record.message==='global revoked'));assert.equal(run.calls.length,1);
 run.host.stop();await run.settled();await pause();assert.equal(run.calls.length,1);assert.equal(run.events.size,0);
 assert.equal(run.diagnostics.filter(record=>record.message==='old revoked').length,1);
});

test('GG-API2 host denies invalid/late tokens without dispatching operations',async()=>{
 const profile=resolveOperationProfile({contextId:'webapp',documentId:'app-main'}),cancelled=[],sent=[],calls=[],callbacks=[];let revision=0;
 const host=createCapabilityProgramHost({profile,getRevision:()=>revision,getScope:()=>({sessionId:'session',revision}),
  subscribeEvent:(handler,callback)=>{callbacks.push(callback);return()=>{};},callOperation:(...args)=>{calls.push(args);},
  onInvocation:data=>sent.push(data),onCancel:data=>cancelled.push(data)});
 host.configure({contextId:'webapp',documentId:'app-main',variables:[],handlers:[{id:'handler',event:'submit',targetId:'form'}]});
 callbacks[0]({type:'submit',targetId:'form',values:{name:'first'}});assert.equal(sent.length,1);
 await assert.rejects(host.call('context.call',['foreign','webapp.appendItem',{targetId:'list',text:'no'}]),/Stale/);
 await host.call('context.call',[sent[0].invocationId,'webapp.appendItem',{targetId:'list',text:'yes'}]);assert.equal(calls.length,1);
 revision++;await assert.rejects(host.call('context.call',[sent[0].invocationId,'webapp.appendItem',{targetId:'list',text:'late'}]),/Stale/);
 assert.equal(calls.length,1);assert.equal(cancelled.length,1);host.dispose();
});

test('GG-IR1 generation is deterministic/detached and provides ephemeral documents',()=>{
 const before=structuredClone(sphere),first=generateCapabilityProgramSource(sphere,'javascript');
 assert.deepEqual(generateCapabilityProgramSource(sphere,'javascript'),first);assert.deepEqual(sphere,before);
 assert.equal(first.text.split('\n').length,first.sourceMap.length);
 const ephemeral=createGeneratedCapabilityDocument(sphere);assert.equal(ephemeral.document.source,first.text);assert.equal(ephemeral.profile.contextId,'scene3d');
 assert.match(ephemeral.document.id,/^text-/);assert.deepEqual(sphere,before);
});

test('GG-API2 basic host preserves captured grants; advanced operations require the selected installed pack',async()=>{
 const {createCapabilities}=await import('../../src/contracts/packs.mjs');
 const forbidden=[
  ['scene3d.setLight',{targetId:'lamp',intensity:2,diffuse:'#ffffff'}],
  ['scene3d.setParent',{targetId:'sphere',parentId:null}],
  ['scene3d.setTransform',{targetId:'sphere',transform:{position:{x:1,y:2,z:3}}}]
 ];
 for(const advanced of [false,true]){
  const capabilities=createCapabilities([advanced?'gg.3d-advanced':'gg.3d-basic']);
  const profile=resolveOperationProfile({contextId:'scene3d',documentId:'scene-main',capabilities}),calls=[],sent=[];
  const host=createCapabilityProgramHost({profile,getScope:()=>({sessionId:'grant-test',revision:1}),getRevision:()=>1,callOperation:(id,args,authority)=>{calls.push({id,args,authority});},onInvocation:data=>sent.push(data)});
  for(const [id,args]of forbidden){
   if(advanced)await host.call('context.global',[id,args]);
   else await assert.rejects(host.call('context.global',[id,args]),/operación|Operación/);
  }
  host.configure({contextId:'scene3d',documentId:'scene-main',variables:[],handlers:[{id:'start',event:'start',targetId:null}]});
  await pause();
  for(const [id,args]of forbidden){
   if(advanced)await host.call('context.call',[sent[0].invocationId,id,args]);
   else await assert.rejects(host.call('context.call',[sent[0].invocationId,id,args]),/operación|Operación/);
  }
  assert.equal(calls.length,advanced?6:0);host.dispose();
 }
});

for(const language of ['javascript','python'])test('GG-IR1 '+language+': dynamic loop guard reports the originating block without running its body',{timeout:30000},async t=>{
 const ir=structuredClone(sphere);ir.variables[0].initialValue=1001;ir.scripts=ir.scripts.slice(0,1);ir.scripts[0].body[0].count={kind:'variable',variableId:'steps',sourceBlockId:'bad-count'};
 const run=await harness(t,{ir,language});run.execute();await run.listening();await run.settled();
 assert.equal(run.calls.length,0);assert.equal(run.errors.length,1);
 const {languageDiagnostic}=await import('../../src/contracts/language-runtime.mjs');
 const diagnostic=languageDiagnostic(run.errors[0],run.document);
 assert.ok(diagnostic.sourceLocation);assert.ok(run.generated.sourceMap[diagnostic.sourceLocation.line-1].includes('repeat'));
});

test('GG-API2 event source schemas, key filtering, listener rollback and event quotas are enforced before dispatch',async()=>{
 const profile=resolveOperationProfile({contextId:'webapp',documentId:'app-main'}),sent=[],cancelled=[],diagnostics=[];let callback;
 const host=createCapabilityProgramHost({profile,getScope:()=>({sessionId:'bounded',revision:0}),getRevision:()=>0,
  subscribeEvent:(handler,fn)=>{callback=fn;return()=>{};},callOperation:()=>null,onInvocation:data=>sent.push(data),onCancel:data=>cancelled.push(data),onDiagnostic:data=>diagnostics.push(data)});
 host.configure({contextId:'webapp',documentId:'app-main',variables:[],handlers:[{id:'key',event:'key',targetId:null,key:'space'}]});
 for(let i=0;i<100;i++)callback({type:'key',targetId:null,key:'other'});
 assert.equal(sent.length,0);assert.equal(diagnostics.length,0);
 for(let i=0;i<100;i++)callback({type:'key',targetId:null,key:'space'});
 assert.equal(sent.length,20);assert.equal(host.state().invocations,20);assert.equal(diagnostics.length,1);
 host.stop();assert.equal(cancelled.length,20);callback({type:'key',targetId:null,key:'space'});assert.equal(sent.length,20);host.dispose();
 let unsubscribed=0;
 const staging=createCapabilityProgramHost({profile,getScope:()=>({sessionId:'staging',revision:0}),getRevision:()=>0,callOperation:()=>null,
  subscribeEvent:handler=>{if(handler.id==='second')throw new Error('subscription failed');return()=>{unsubscribed++;};}});
 assert.throws(()=>staging.configure({contextId:'webapp',documentId:'app-main',variables:[],handlers:[{id:'first',event:'click',targetId:'one'},{id:'second',event:'click',targetId:'two'}]}),/subscription failed/);
 assert.equal(unsubscribed,1);assert.equal(staging.state().active,false);staging.dispose();
});

test('GG-API2 actual Python: a top-level global mutation completes without registering callbacks',{timeout:30000},async t=>{
 const run=await harness(t,{ir:sphere,language:'python',source:'await GG.scene3d.move({"targetId":"sphere","delta":{"x":3,"y":0,"z":0}})'});
 assert.deepEqual(await run.execute(),{completed:true});assert.equal(run.calls.length,1);assert.equal(run.calls[0].args.delta.x,3);
 assert.equal(run.host.state().configured,false);assert.equal(run.host.state().invocations,0);
});
