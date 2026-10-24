export function createContextFrame({contextId,origin,shellOrigin=location.origin,releaseBase='/',slot,sessionId=crypto.randomUUID(),revision=0,onEvent=()=>{},onDiagnostic=()=>{}}){
 const frame=document.createElement('iframe');frame.title=contextId==='scene3d'?'Escena 3D':'Aplicación web';frame.sandbox='allow-scripts allow-same-origin'+(contextId==='webapp'?' allow-forms':'');frame.referrerPolicy='no-referrer';frame.inert=true;
 const pending=new Map();let port=null,sequence=0,lastSequence=-1,closed=false,resolveReady,rejectReady;
 const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});ready.catch(()=>{});
 const timer=setTimeout(()=>rejectReady(new Error('Context renderer timeout')),20000);
 const mounted=document.createElement('div');mounted.hidden=true;mounted.className='context-preview';mounted.append(frame);if(!slot)throw new Error('Context frame slot missing');slot.after(mounted);let published=false;
 function receive(event){
  if(closed||port||event.source!==frame.contentWindow||event.origin!==origin||event.data?.type!=='context-ready'||event.data.contextId!==contextId||event.data.sessionId!==sessionId||event.data.protocolVersion!==1)return;
  const channel=new MessageChannel();port=channel.port1;
  port.onmessage=event=>{
    const message=event.data;
    if(closed||message?.protocolVersion!==1||message.sessionId!==sessionId||message.revision!==revision||!Number.isSafeInteger(message.sequence)||message.sequence<=lastSequence)return;
    lastSequence=message.sequence;
    if(message.type==='ready'){clearTimeout(timer);resolveReady();return;}
    if(message.type==='event'){onEvent(message.event);return;}
    if(message.type==='diagnostic'){onDiagnostic(message.record);return;}
    const request=pending.get(message.requestId);if(!request)return;pending.delete(message.requestId);clearTimeout(request.timer);
    if(message.type==='result')request.resolve(message.result);else request.reject(new Error(String(message.error??'Context error').slice(0,1024)));
  };port.start();frame.contentWindow.postMessage({type:'context-connect',protocolVersion:1,sessionId},origin,[channel.port2]);
 }
 window.addEventListener('message',receive);
 frame.src=origin+releaseBase+'?session='+sessionId;
 async function request(command,payload={}){
   await ready;if(closed)throw new Error('Session stopped');
   const requestId=++sequence;
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('Context request timeout'));},20000);pending.set(requestId,{resolve,reject,timer});port.postMessage({protocolVersion:1,sessionId,revision,sequence:requestId,requestId,command,payload});});
 }
 return Object.freeze({sessionId,revision,ready,request,activate(){if(!closed)frame.inert=false;},
  mount(slot){if(closed)throw new Error('Session stopped');published=true;slot.hidden=true;mounted.hidden=false;mounted.scrollIntoView?.({block:'nearest'});},
  dispose(){if(closed)return;closed=true;clearTimeout(timer);rejectReady(new Error('Session stopped'));try{port?.postMessage({protocolVersion:1,sessionId,revision,sequence:++sequence,requestId:sequence,command:'stop',payload:{}});}catch{}port?.close();for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error('Session stopped'));}pending.clear();window.removeEventListener('message',receive);if(published)slot.hidden=false;frame.remove();mounted.remove();}
 });
}
