import {validateCodeViewRequest,codeViewProtocol} from '../contracts/code-view-conversion.mjs';

// No language parser, interpreter or learner source evaluation in the shell.
// Each request gets its own cross-origin frame, private port and finite worker.
export function createCodeViewService({origin,releaseBase='/'}) {
  if(new URL(origin).origin!==origin || !releaseBase.startsWith('/') || !releaseBase.endsWith('/'))
    throw new Error('Origen o release de conversión inválido.');
  let active=null,rejected=0;
  function close(run,error) {
    if(!run||run.closed)return;
    run.closed=true;clearTimeout(run.timer);
    window.removeEventListener('message',run.ready);
    run.port?.close();run.frame.remove();
    if(active===run)active=null;
    if(error)run.reject(error);
  }
  async function convert(input) {
    const payload=validateCodeViewRequest(input);
    close(active,new Error('El análisis fue sustituido; el texto se conserva.'));
    return new Promise((resolve,reject)=>{
      const frame=document.createElement('iframe');
      const run={id:crypto.randomUUID(),frame,resolve,reject,closed:false,port:null};
      frame.title='Conversión del programa sin ejecución';frame.hidden=true;
      frame.setAttribute('sandbox','allow-scripts allow-same-origin');frame.referrerPolicy='no-referrer';
      frame.src=origin+releaseBase+'app/targets/text/code-view-host.html#conversion='+run.id;
      run.ready=event=>{
        if(run.closed || run.port || event.origin!==origin || event.source!==frame.contentWindow ||
            event.data?.type!=='code-view-ready' || event.data.protocolVersion!==codeViewProtocol.version ||
            event.data.conversionId!==run.id) {rejected++;return;}
        const channel=new MessageChannel();run.port=channel.port1;
        run.port.onmessage=({data})=>{
          if(run.closed || active!==run || data?.protocolVersion!==codeViewProtocol.version ||
              data.conversionId!==run.id || data.seq!==0 ||
              new TextEncoder().encode(JSON.stringify(data)).length>codeViewProtocol.responseBytes) {rejected++;return;}
          if(data.type==='error') {
            const error=Object.assign(new Error(typeof data.error?.message==='string'?data.error.message:'No se pudo convertir el texto.'),
              {code:data.error?.code??'CV_PARSE',lineNumber:data.error?.lineNumber??1,columnNumber:data.error?.columnNumber??1});
            close(run);reject(error);
          }else if(data.type==='result' && data.workerOrigin===origin) {
            close(run);resolve(data.result);
          }else rejected++;
        };
        run.port.start();
        frame.contentWindow.postMessage({type:'code-view-connect',protocolVersion:codeViewProtocol.version,conversionId:run.id},origin,[channel.port2]);
        run.port.postMessage({protocolVersion:codeViewProtocol.version,conversionId:run.id,seq:0,command:'convert',payload});
      };
      run.timer=setTimeout(()=>close(run,new Error('El analizador no respondió a tiempo; el texto se conserva.')),45000);
      active=run;window.addEventListener('message',run.ready);document.body.append(frame);
    });
  }
  return Object.freeze({convert,dispose:()=>close(active,new Error('El análisis fue cancelado; el texto se conserva.')),
    stats:()=>({active:!!active,rejected})});
}
