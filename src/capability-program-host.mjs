import {resolveOperationProfile,validateCapabilityOperation} from './contracts/operations.mjs';
import {validateCapabilityActivation,validateCapabilityInvocation,validateCapabilityRPC,cloneCapabilityJSON} from './contracts/capability-language.mjs';
import {validateTextInvocationResult} from './contracts/text-program.mjs';

export const capabilityProgramLimits=Object.freeze({invocations:64,eventsPerSecond:20,eventsPerRun:1024});
// Event/lease broker only. All student control flow stays in QuickJS/Pyodide.
export function createCapabilityProgramHost({profile,getRevision,getScope,onInvocation=()=>{},onCancel=()=>{},onDiagnostic=()=>{},callOperation,subscribeEvent=()=>()=>{}}){
 if(typeof getScope!=='function'||typeof getRevision!=='function'||typeof callOperation!=='function')throw new TypeError('Capability host requires scope, revision and operation hooks');
 const installed=resolveOperationProfile({contextId:profile.contextId,documentId:profile.documentId});
 if(profile.profileId!==installed.profileId||!Array.isArray(profile.operations))throw new Error('Perfil contextual no instalado.');
 const grants=new Set();for(const operation of profile.operations){if(!operation||typeof operation.id!=='string'||grants.has(operation.id)||!installed.operations.some(item=>item.id===operation.id))throw new Error('Operación de perfil no instalada/duplicada');grants.add(operation.id);}
 // Keep only captured host grants and use installed schemas/functions. Resolving
 // metadata again must never widen a selected basic pack into advanced grants.
 profile={...installed,operations:installed.operations.filter(operation=>grants.has(operation.id))};
 let alive=true,configured=false,active=false,captured=null,sequence=0,events=0,windowStart=0,windowCount=0,warned=false;
 const invocations=new Map(),subscriptions=[];
 const open=()=>{if(!alive)throw new Error('Session stopped');};
 const scope=()=>{const value=getScope();if(!value||typeof value.sessionId!=='string'||!value.sessionId||!Number.isSafeInteger(value.revision)||value.revision<0||value.revision!==getRevision())throw new Error('Context scope unavailable');return {sessionId:value.sessionId,revision:value.revision};};
 const current=()=>{if(!active||!captured)return false;try{const now=scope();return now.sessionId===captured.sessionId&&now.revision===captured.revision;}catch{return false;}};
 function diagnostic(code,message){try{onDiagnostic({level:'error',code,origin:'runner',message});}catch{}}
 function retire(record,notify=true,reason='cancelled'){
  if(invocations.get(record.id)!==record)return;
  invocations.delete(record.id);record.abort.abort();
  if(notify)try{onCancel({invocationId:record.id,revision:record.authority.revision,reason});}catch{}
 }
 function requireInvocation(id){
  open();const record=invocations.get(id);
  if(!current()||!record){if(record)retire(record,true,'scope-changed');throw new Error('Stale capability invocation');}
  return record;
 }
 function authority(targetId){return Object.freeze({...captured,contextId:profile.contextId,documentId:profile.documentId,principal:profile.principal,targetId});}
 function emit(handler,raw){
  if(!alive||!current())return false;
  if(handler.event==='key'&&raw?.key!==handler.key)return false;
  const now=Date.now();if(now-windowStart>=1000){windowStart=now;windowCount=0;}
  if(++events>capabilityProgramLimits.eventsPerRun||++windowCount>capabilityProgramLimits.eventsPerSecond||invocations.size>=capabilityProgramLimits.invocations){
   if(!warned){warned=true;diagnostic('CAPABILITY_EVENT_LIMIT','Se alcanzó el límite de eventos o callbacks del contexto.');}return false;
  }
  const id='capability-invocation-'+(++sequence),event=cloneCapabilityJSON(raw,{maximum:8192});
  const data=validateCapabilityInvocation({version:2,invocationId:id,handlerId:handler.id,targetId:handler.targetId,revision:captured.revision,event},profile);
  if(data.event.type!==handler.event||data.event.targetId!==handler.targetId)throw new Error('Context event source mismatch');
  const record={id,authority:authority(handler.targetId),handlerId:handler.id,abort:new AbortController()};
  invocations.set(id,record);
  try{const result=onInvocation(data);if(result&&typeof result.then==='function')Promise.resolve(result).then(accepted=>{if(accepted===false)retire(record,true,'delivery-rejected');}).catch(error=>{retire(record);diagnostic('CAPABILITY_CALLBACK_DELIVERY',String(error?.message??error).slice(0,1024));});}
  catch(error){retire(record);diagnostic('CAPABILITY_CALLBACK_DELIVERY',String(error?.message??error).slice(0,1024));return false;}
  return true;
 }
 function configure(descriptor){
  open();if(configured)throw new Error('El contexto ya está configurado.');
  const program=validateCapabilityActivation(descriptor,profile),nextScope=scope(),nextSubscriptions=[];
  // External listeners are staged before publishing any active program.
  try{for(const handler of program.handlers)if(handler.event!=='start'){
   const unsubscribe=subscribeEvent(structuredClone(handler),event=>{
    if(!current())return;
    try{emit(handler,event);}catch(error){diagnostic('CAPABILITY_EVENT_INVALID',String(error.message).slice(0,1024));}
   },Object.freeze({...nextScope,contextId:profile.contextId,documentId:profile.documentId,principal:profile.principal,targetId:handler.targetId}));
   if(typeof unsubscribe!=='function')throw new Error('Event subscription requires disposer');
   nextSubscriptions.push(unsubscribe);
  }}catch(error){for(const unsubscribe of nextSubscriptions.reverse())try{unsubscribe();}catch{}throw error;}
  captured=nextScope;subscriptions.push(...nextSubscriptions);configured=true;active=true;
  for(const handler of program.handlers)if(handler.event==='start')queueMicrotask(()=>{if(current())try{emit(handler,{type:'start',targetId:handler.targetId});}catch(error){diagnostic('CAPABILITY_EVENT_INVALID',String(error.message).slice(0,1024));}});
  return {started:true};
 }
 async function call(method,args){
  open();const request=validateCapabilityRPC(method,args,profile);
  if(method==='context.activate')return configure(request.args[0]);
  const invocation=method==='context.call'?requireInvocation(request.args[0]):null;
  if(!invocation&&!current()){
   // A top-level API2 program is already bound to a prepared host context.
   // Before activation it may read/mutate only that captured run scope.
   if(configured)throw new Error('Session stopped');
   const now=scope();captured??=now;
   if(captured.sessionId!==now.sessionId||captured.revision!==now.revision)throw new Error('Session stopped');
  }
  const operationId=request.args[invocation?1:0],operationArgs=request.args[invocation?2:1];
  const descriptor=profile.operations.find(item=>item.id===operationId);
  if(!descriptor)throw new Error('Operación no autorizada por los grants capturados');
  if(!invocation&&configured&&descriptor.mutates)throw new Error('Usa ctx para modificar un contexto configurado.');
  const owned=validateCapabilityOperation(profile,operationId,operationArgs),auth=invocation?.authority??authority(null);
  if(invocation?.abort.signal.aborted)throw new Error('Stale capability invocation');
  const result=await callOperation(owned.operationId,owned.args,auth,{signal:invocation?.abort.signal});
  if(invocation)requireInvocation(invocation.id);
  else{const now=scope();if(now.sessionId!==auth.sessionId||now.revision!==auth.revision)throw new Error('Session stopped');}
  return cloneCapabilityJSON(result??null);
 }
 function complete(payload){
  const value=validateTextInvocationResult(payload),record=invocations.get(value.invocationId);
  if(!current()||!record||record.authority.revision!==value.revision)return {accepted:false};
  retire(record,false);
  if(value.error)diagnostic('CAPABILITY_CALLBACK_FAILED',value.error);
  return {accepted:true};
 }
 function stop(){
  active=false;
  for(const record of [...invocations.values()])retire(record,true,'stopped');
  for(const unsubscribe of subscriptions.splice(0).reverse())try{unsubscribe();}catch{}
 }
 function dispose(){if(!alive)return;stop();alive=false;}
 return Object.freeze({configure,call,complete,stop,dispose,state:()=>({active:current(),configured,invocations:invocations.size,events})});
}
