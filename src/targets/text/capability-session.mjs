import {validateCapabilityConfiguration,validateCapabilityHandler,validateCapabilityActivation,validateCapabilityInvocation,capabilityLanguageLimits} from '../../contracts/capability-language.mjs';
import {validateCapabilityOperation} from '../../contracts/operations.mjs';

// Retains callbacks and cancellation, never evaluates a block graph or IR.
export function createCapabilityProgramSession({profile,rpc,invoke,cancel=()=>{},release=()=>{},onReady=()=>{}}){
 let alive=true,configured=false,started=false,config=null,closeRun=null;
 const handlers=[],active=new Map();
 const open=()=>{if(!alive)throw new Error('Session stopped');};
 function current(id){open();const record=active.get(id);if(!record)throw new Error('Text invocation cancelled');return record;}
 function configure(value){
  open();if(configured||started||handlers.length)throw new Error('El contexto ya fue configurado.');
  config=validateCapabilityConfiguration(value,profile);configured=true;
 }
 function register(descriptor,callback){
  open();if(!configured||started)throw new Error('Configura el contexto antes de registrar eventos.');
  const id='handler-'+handlers.length,item=validateCapabilityHandler({id,...validateCapabilityHandler(descriptor,profile,{withId:false})},profile);
  validateCapabilityActivation({...config,handlers:[...handlers.map(h=>h.descriptor),item]},profile);
  handlers.push({descriptor:item,callback});return id;
 }
 async function activate(){
  open();if(!configured||started)throw new Error('El contexto no está preparado o ya está activo.');
  started=true;
  const result=await rpc('context.activate',[{...config,handlers:handlers.map(item=>item.descriptor)}]);
  open();if(!handlers.length)return result;
  onReady();return new Promise((resolve,reject)=>{closeRun=reject;});
 }
 async function call(id,operationId,args){
  current(id);const operation=validateCapabilityOperation(profile,operationId,args);
  const result=await rpc('context.call',[id,operation.operationId,operation.args]);
  current(id);return result;
 }
 function assertGlobalAllowed(operationId){
  open();const operation=profile.operations.find(item=>item.id===operationId);
  if(!operation)throw new Error('Operación no instalada.');
  if(configured&&operation.mutates)throw new Error('Usa ctx para modificar un contexto configurado.');
 }
 async function globalCall(operationId,args){
  assertGlobalAllowed(operationId);const operation=validateCapabilityOperation(profile,operationId,args);
  assertGlobalAllowed(operationId);return rpc('context.global',[operation.operationId,operation.args]);
 }
 function wait(id,seconds){
  const record=current(id);
  if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0||seconds>60)throw new Error('Espera fuera de 0..60 segundos.');
  if(record.waits.size>=64)throw new Error('Cupo de esperas excedido.');
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{record.waits.delete(timer);try{current(id);resolve(null);}catch(error){reject(error);}},seconds*1000);
   record.waits.set(timer,reject);
  });
 }
 async function dispatch(raw){
  open();if(!started)throw new Error('El contexto no está activo.');
  const data=validateCapabilityInvocation(raw,profile);
  if(active.has(data.invocationId)||active.size>=capabilityLanguageLimits.invocations)throw new Error('Invocación duplicada o cupo agotado.');
  const handler=handlers.find(item=>item.descriptor.id===data.handlerId);
  if(!handler||handler.descriptor.targetId!==data.targetId||data.event.type!==handler.descriptor.event||(handler.descriptor.event==='key'&&data.event.key!==handler.descriptor.key))throw new Error('Handler/contexto de evento no válido.');
  let cancelled;const cancellation=new Promise(resolve=>{cancelled=resolve;});
  const record={waits:new Map(),cancelled};active.set(data.invocationId,record);
  try{return await Promise.race([Promise.resolve().then(()=>{current(data.invocationId);return invoke(handler.callback,data);}).then(()=>({completed:true})),cancellation.then(()=>({cancelled:true}))]);}
  catch(error){if(!alive||!active.has(data.invocationId)||error?.name==='CancelledError'||/Text invocation cancelled/.test(String(error?.message)))return {cancelled:true};throw error;}
  finally{if(active.get(data.invocationId)===record){active.delete(data.invocationId);for(const [timer,reject]of record.waits){clearTimeout(timer);reject(new Error('Text invocation cancelled'));}record.waits.clear();}}
 }
 function cancelInvocation(id){
  const record=active.get(id);if(!record)return;
  active.delete(id);
  for(const [timer,reject]of record.waits){clearTimeout(timer);reject(new Error('Text invocation cancelled'));}
  record.waits.clear();cancel(id);record.cancelled();
 }
 function dispose(){
  if(!alive)return;
  for(const id of [...active.keys()])cancelInvocation(id);
  alive=false;closeRun?.(new Error('Session stopped'));
  for(const item of handlers)release(item.callback);
  handlers.length=0;
 }
 return Object.freeze({configure,register,activate,call,globalCall,assertGlobalAllowed,wait,dispatch,cancelInvocation,dispose,configured:()=>configured});
}
