import {validateCodeViewRequest,codeViewProtocol} from '../../contracts/code-view-conversion.mjs';
const config = await fetch('/config.json').then(response => response.json());
const conversionId = new URLSearchParams(location.hash.slice(1)).get('conversion');
let port = null, worker = null, started = false, closed = false;
function close() { closed = true; worker?.terminate(); worker = null; port?.close(); }
window.addEventListener('pagehide',close);
window.addEventListener('message',event=>{
  if (closed || port || event.origin !== config.shellOrigin || event.source !== parent ||
      event.data?.type !== 'code-view-connect' || event.data.protocolVersion !== codeViewProtocol.version ||
      event.data.conversionId !== conversionId || event.ports.length !== 1) return;
  port=event.ports[0];port.start();
  port.onmessage=({data})=>{
    if (started || closed) return;
    started=true;
    const send = message => port.postMessage({protocolVersion:codeViewProtocol.version,conversionId,seq:0,...message});
    try {
      if (data?.protocolVersion !== codeViewProtocol.version || data.conversionId !== conversionId ||
          data.seq !== 0 || data.command !== 'convert') throw new Error('Canal de conversión inválido.');
      const payload=validateCodeViewRequest(data.payload);
      worker=new Worker(new URL('./code-view-worker.mjs',import.meta.url),{type:'module'});
      worker.onmessage=({data:result})=>{
        if (closed) return;
        if (new TextEncoder().encode(JSON.stringify(result)).length > codeViewProtocol.responseBytes)
          send({type:'error',error:{message:'El resultado supera el límite de conversión.',code:'CV_RESULT',lineNumber:1}});
        else send(result);
        worker.terminate();worker=null;
      };
      worker.onerror=()=>{
        if (!closed) send({type:'error',error:{message:'No se pudo preparar el analizador del lenguaje.',code:'CV_WORKER',lineNumber:1}});
        worker?.terminate();worker=null;
      };
      worker.postMessage(payload);
    }catch(error){send({type:'error',error:{message:error.message.slice(0,1024),code:error.code??'CV_REQUEST',lineNumber:error.lineNumber??1}});}
  };
});
parent.postMessage({type:'code-view-ready',protocolVersion:codeViewProtocol.version,conversionId},config.shellOrigin);
