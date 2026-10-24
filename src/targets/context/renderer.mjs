import {createAssetProcessor} from '../../import/asset-processor.mjs';
import {validateContextEnvelope,validateContextPayload} from '../../contracts/context-channel.mjs';
import {resolveOperationProfile,validateCapabilityOperation} from '../../contracts/operations.mjs';
import {validateResources2} from '../../contracts/resources-v2.mjs';
import {createWebAppAdapter} from '../../adapters/webapp/dom-adapter.mjs';
const config=await fetch('./config.json').then(r=>{if(!r.ok)throw new Error('Missing context config');return r.json();});
const contextId=location.origin===config.scene3dOrigin?'scene3d':location.origin===config.webappOrigin?'webapp':null;
const sessionId=new URL(location.href).searchParams.get('session');
if(!contextId||!sessionId)throw new Error('Invalid context renderer');
let port=null,adapter=null,candidate=null,profile=null,revision=0,sequence=0,lastRequest=-1,stopped=false;
const assetProcessor=createAssetProcessor();
const status=document.querySelector('#renderer-status');
const send=data=>port?.postMessage({protocolVersion:1,sessionId,revision,sequence:++sequence,...data});
async function makeAdapter(){
 const options={onEvent:event=>{if(profile&&!stopped)send({type:'event',event});},onDiagnostic:record=>send({type:'diagnostic',record})};
 if(contextId==='webapp')return createWebAppAdapter({...options,container:document.querySelector('#surface')});
 const canvas=document.createElement('canvas');canvas.tabIndex=0;canvas.setAttribute('aria-label','Escena 3D. Arrastra para girar la cámara.');document.querySelector('#surface').append(canvas);
 const {createBabylonAdapter}=await import('/vendor/babylon-adapter.bundle.mjs');
 document.querySelector('#surface').addEventListener('keydown',event=>{if(!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['Tab','Escape'].includes(event.key))options.onEvent({type:'key',targetId:null,key:event.key===' '?'space':event.key});});
 return createBabylonAdapter({...options,canvas});
}
async function dispatch(message){
 validateContextEnvelope(message,{sessionId,revision,lastSequence:lastRequest});lastRequest=message.sequence;
 const payload=validateContextPayload(message.command,message.payload);
 if(message.command==='stop'){stopped=true;assetProcessor.dispose();adapter?.dispose();adapter=null;profile=null;status.textContent='Detenido';return {stopped:true};}
 if(stopped)throw new Error('Context stopped');
 if(message.command==='prepare'){
   if(candidate)adapter?.disposePrepared?.(candidate.handle);
   const nextProfile=resolveOperationProfile({contextId,documentId:payload.config?.documentId,capabilities:payload.capabilities});
   const resources=await validateResources2(payload.resources);
   await assetProcessor.process('validate-resources',{resources});
   if(!adapter){const created=await makeAdapter();if(stopped){created.dispose();throw new Error('Context stopped');}adapter=created;}
   const handle=await adapter.prepare(payload.config,{resources});
   candidate={handle,profile:nextProfile};return {prepared:true};
 }
 if(message.command==='commit'){
   if(!candidate)throw new Error('Context candidate absent');
   const next=candidate;candidate=null;
   const snapshot=adapter.commit(next.handle);profile=next.profile;
   status.textContent=contextId==='scene3d'?'Escena 3D lista':'Aplicación lista';return {snapshot};
 }
 if(!profile)throw new Error('Context is not committed');
 if(message.command==='snapshot')return adapter.snapshot();
 if(message.command==='call'){
   const call=validateCapabilityOperation(profile,payload.operationId,payload.args);
   return await adapter.call(call.operationId,call.args);
 }
 throw new Error('Unsupported context command');
}
window.addEventListener('message',event=>{
 if(port||event.source!==parent||event.origin!==config.shellOrigin||event.ports.length!==1||event.data?.type!=='context-connect'||event.data.sessionId!==sessionId||event.data.protocolVersion!==1)return;
 port=event.ports[0];
 let queue=Promise.resolve();
 port.onmessage=event=>{const message=event.data;queue=queue.then(async()=>{
   try{const result=await dispatch(message);send({type:'result',requestId:message.requestId,result});}
   catch(error){send({type:'error',requestId:message?.requestId,error:String(error.message).slice(0,1024)});}
 });};
 port.start();send({type:'ready',contextId});
});
window.addEventListener('pagehide',()=>{stopped=true;assetProcessor.dispose();adapter?.dispose();port?.close();});
parent.postMessage({type:'context-ready',protocolVersion:1,contextId,sessionId},config.shellOrigin);
