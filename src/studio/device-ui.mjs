import {validateDeviceConfig,prepareDeviceCompilation} from '../contracts/device-program.mjs';
import {createCapabilities} from '../contracts/packs.mjs';
import {sameDeviceScope,sameSimulatorDeviceScope,selectFirmwareHex} from '../contracts/device-runtime.mjs';
import {openDeviceTransfer} from '../device-transfer/opener.mjs';

const digest=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export function createDeviceUI({contexts,editor,source,getCapabilities,activate,request,getScope,runTogether,requirePack,onDiagnostic=()=>{},onInvalidate=()=>{}}) {
  const pick=id=>document.querySelector('#'+id);
  const context=pick('authoring-context'),mode=pick('device-mode'),variant=pick('device-variant');
  const listeners=new Set(),checkpoints=new WeakMap();
  let active=false,settings=null,ready=false,runnerReady=false,revision=0,sequence=0,artifact=null,transfer=null,simulation=null,busy=false,lastFailure=null,muted=0;
  const notify=()=>{for(const listener of listeners)listener();};
  function config(){return active?{...settings,workspace:editor.captureGraph()}:null;}
  function prepared(){const current=config();if(!current)throw new Error('Añade un dispositivo al proyecto.');return prepareDeviceCompilation({config:current,deviceSource:source.value});}
  function report(error){
    if(['Session stopped','Device revision replaced','Device scene revision replaced'].includes(error.message))return;
    pick('device-error').textContent=error.message;
    onDiagnostic({level:'error',code:error.code??'DEVICE_ERROR',origin:error.diagnosticOrigin==='generation'?'generation':'device',message:error.message,...(error.sourceBlockId?{sourceBlockId:error.sourceBlockId}:{})});
  }
  function current(scope){const outer=getScope();return active&&scope?.sessionId===outer.sessionId&&scope.deviceId===settings.deviceId&&scope.deviceRevision===revision;}
  function nextScope(){const outer=getScope();if(!outer.sessionId||outer.revision===null)throw new Error('Espera a que el escenario esté listo.');return {sessionId:outer.sessionId,deviceId:settings.deviceId,deviceRevision:revision,requestId:++sequence};}
  function render(){
    const showing=(contexts?.current()??context.value)==='microbit';
    if(!contexts){pick('editor-heading').textContent=showing?'Programa micro:bit':'Programa 2D';pick('editor-status').hidden=showing;pick('scene-blockly-surface').hidden=showing;}
    pick('device-authoring').hidden=!showing;
    pick('enable-device').hidden=active;pick('enable-device').disabled=!ready;
    pick('device-configured').hidden=!active;
    variant.disabled=!active||!ready;
    editor.setReady(ready&&active);editor.setVisible(showing&&active&&settings?.mode==='blocks');
    if(active){
      for(const input of mode.querySelectorAll('input'))input.checked=input.value===settings.mode;variant.value=settings.variant;
      pick('device-blockly-editor').hidden=settings.mode!=='blocks';
      pick('edit-device-text').hidden=settings.mode!=='typescript';
      pick('device-mode-help').textContent=settings.mode==='blocks'?'Estos bloques programan el firmware. Consulta su TypeScript de solo lectura en Firmware.':'Editas el documento TypeScript independiente. Los bloques del dispositivo se conservan sin ejecutarse.';
      try{pick('device-generated-source').value=prepared().source;lastFailure=null;}
      catch(error){pick('device-generated-source').value='';const key=error.code+':'+error.sourceBlockId+':'+error.message;if(key!==lastFailure){lastFailure=key;report(error);}}
    }
    for(const id of ['run-device','compile-device'])pick(id).disabled=!active||!ready||!runnerReady||busy;
    const downloadable=Boolean(artifact&&current(artifact.scope));
    pick('download-device').disabled=pick('transfer-device').disabled=!downloadable||busy;
  }
  function invalidate({notifyChange=false,revisionChange=true,sendInvalidation=true,reason='Autoría modificada · vuelve a ejecutar o compilar'}={}){
    if(revisionChange)revision++;onInvalidate();simulation=null;busy=false;transfer?.close();transfer=null;
    pick('device-status').textContent=active?reason:'Sin dispositivo en este proyecto';
    pick('device-build-status').textContent=artifact?'Firmware anterior · descarga desactivada':'Sin firmware compilado';
    pick('device-error').textContent='';lastFailure=null;
    const outer=getScope();
    if(sendInvalidation&&active&&outer.sessionId&&outer.revision!==null){
      request('invalidate-device',{deviceScope:{sessionId:outer.sessionId,deviceId:settings.deviceId,deviceRevision:revision,requestId:++sequence}}).catch(()=>{});
    }
    render();if(notifyChange)notify();
  }
  editor.subscribe(()=>{if(!muted)invalidate({notifyChange:true});});
  source.addEventListener('input',()=>invalidate());
  mode.addEventListener('change',()=>{if(!active)return;settings={...settings,mode:mode.querySelector('input:checked')?.value??'blocks'};invalidate({notifyChange:true});});
  variant.addEventListener('change',()=>{if(!active)return;settings={...settings,variant:variant.value};invalidate({notifyChange:true});});
  if(!contexts)context.addEventListener('change',render);
  pick('edit-device-text').addEventListener('click',()=>{document.dispatchEvent(new CustomEvent('gg-reveal',{detail:{element:source}}));source.focus();source.scrollIntoView({block:'center'});});
  pick('enable-device').addEventListener('click',async()=>{
    try{
      const previous=getCapabilities();const ids=[...new Set([...(previous?.locks.map(x=>x.id)??['gg.sprites']),'gg.microbit'])];
      await activate(createCapabilities(ids,{config:previous?.config??{},versions:Object.fromEntries((previous?.locks??[]).map(x=>[x.id,x.version]))}));
      pick('device-status').textContent='Dispositivo añadido · sin ejecutar';render();
    }catch(error){report(error);}
  });
  function diagnostics(result,preparation){
    for(const diagnostic of (result.diagnostics??[]).slice(0,100)){
      const position=Number.isSafeInteger(diagnostic.start)?diagnostic.start:null;
      const line=Number.isSafeInteger(diagnostic.line)?diagnostic.line+1:null;
      const range=(diagnostic.fileName==='main.ts'?preparation.sourceMap:[]).filter(x=>position!==null?position>=x.start&&position<x.end:line!==null&&line>=x.startLine&&line<=x.endLine).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
      onDiagnostic({level:'error',code:'DEVICE_COMPILE',origin:'device',message:String(diagnostic.messageText).slice(0,1024),...(range?{sourceBlockId:range.sourceBlockId}:{})});
    }
  }
  async function compile(){
    const preparation=prepared();requirePack('microbit-compiler');
    const scope=nextScope(),capabilities=getCapabilities();busy=true;render();pick('device-build-status').textContent='Compilando firmware…';
    try{
      const result=await request('compile-device',{capabilities,deviceSource:source.value,deviceScope:scope});
      if(!current(scope)||!sameDeviceScope(scope,result.deviceScope))throw new Error('Device revision replaced');
      diagnostics(result,preparation);
      if(!result.success){pick('device-build-status').textContent='El firmware no compiló · revisa la consola';return result;}
      const selected=selectFirmwareHex(result,preparation.variant);
      const sha256=await digest(selected.hex);
      if(!current(scope))throw new Error('Device revision replaced');
      if(!/^[a-f0-9]{64}$/.test(result.compilerPackHash??''))throw new Error('Falta la identidad del compilador local.');
      artifact={...selected,scope,sha256,compilerPackHash:result.compilerPackHash};
      pick('device-build-status').textContent='HEX '+selected.variant+' listo · '+Math.ceil(new TextEncoder().encode(selected.hex).length/1024)+' KiB · SHA256 '+sha256.slice(0,12);
      return result;
    }catch(error){if(!current(scope))throw new Error('Device revision replaced');pick('device-build-status').textContent='No se pudo compilar el firmware';throw error;}finally{if(current(scope)){busy=false;render();}}
  }
  async function run(){
    const preparation=prepared();requirePack('microbit-compiler');requirePack('microbit-simulator');requirePack('scratch-2d');
    // runTogether validates the scene before replacing either execution context.
    const input={preparation,capabilities:getCapabilities(),deviceSource:source.value,deviceRevision:revision};
    const result=await runTogether(input);
    if(!current(result.deviceScope))throw new Error('Device revision replaced');
    diagnostics(result,preparation);
    if(result.success){simulation={...result.deviceScope};pick('device-status').textContent='Escena y dispositivo activos · botón A → microbit-A';}
    else pick('device-status').textContent='No se pudo compilar el dispositivo';
    return result;
  }
  pick('compile-device').addEventListener('click',()=>compile().catch(report));
  pick('run-device').addEventListener('click',()=>run().catch(report));
  pick('download-device').addEventListener('click',()=>{
    if(!artifact||!current(artifact.scope))return;
    const url=URL.createObjectURL(new Blob([artifact.hex],{type:'application/octet-stream'}));
    const link=document.createElement('a');link.href=url;link.download=artifact.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  pick('transfer-device').addEventListener('click',()=>{
    if(!artifact||!current(artifact.scope))return;
    transfer?.close();
    try{const {scope,variant,hex,sha256,compilerPackHash}=artifact;
      transfer=openDeviceTransfer({artifact:{scope,variant,hex,sha256,compilerPackHash},releaseBase:getScope().releaseBase??'/',onChange:state=>{
        if(current(scope))pick('device-build-status').textContent=state.error??({opening:'Abriendo página de transferencia…',ready:'Selecciona la placa en la página de transferencia',connecting:'Conectando placa…',connected:'Placa conectada',transferring:'Transfiriendo HEX…',complete:'Transferencia finalizada · verifica la placa',cancelled:'Transferencia cancelada'}[state.status]??state.status);
      }});transfer.ready.catch(error=>{if(current(scope)&&error.message!=='Transferencia cancelada')report(error);});
    }catch(error){report(error);}
  });
  const participant={
    id:'gg.microbit',context:'microbit',
    captureConfig:config,
    prepareConfig:value=>value==null?{active:false}:{active:true,settings:(( {workspace,...rest})=>rest)(validateDeviceConfig(value)),editorCandidate:editor.prepare(value.workspace)},
    commitConfig:candidate=>{
      active=candidate.active;settings=active?structuredClone(candidate.settings):null;
      muted++;try{if(active)editor.commit(candidate.editorCandidate);}finally{muted--;}
      render();
    },
    checkpoint:()=>{const token=Object.freeze({});checkpoints.set(token,{active,settings:structuredClone(settings),editor:editor.checkpoint()});return token;},
    restoreDraft:token=>{const saved=checkpoints.get(token);if(!saved)throw new Error('Checkpoint de dispositivo inválido');active=saved.active;settings=structuredClone(saved.settings);muted++;try{editor.restoreDraft(saved.editor);}finally{muted--;}render();},
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    hasAuthoring:()=>active
  };
  render();
  return Object.freeze({participant,config,prepared,compile,run,invalidate,
    setReady:value=>{ready=Boolean(value);render();},
    setRunnerReady:value=>{runnerReady=Boolean(value);render();},
    refresh:render,
    setContext:value=>{if(contexts)contexts.select(value);else{context.value=value;render();}},
    nextScope,
    onReset:({preserveRevision=false}={})=>invalidate({revisionChange:!preserveRevision,sendInvalidation:false,reason:'Dispositivo detenido · autoría conservada'}),
    acceptInput:message=>{
      if(!simulation||!current(simulation)||!sameSimulatorDeviceScope(message.deviceScope,simulation)||!['A','B','AB'].includes(message.button))return false;
      pick('device-status').textContent='Botón '+message.button+' → '+message.button.replace(/^(.*)$/,'microbit-$1')+' · evento '+message.count;
      return true;
    },
    state:()=>({active,revision,busy,config:config(),simulation:structuredClone(simulation),firmware:artifact?{scope:{...artifact.scope},variant:artifact.variant,sha256:artifact.sha256,compilerPackHash:artifact.compilerPackHash,current:current(artifact.scope)}:null})
  });
}
