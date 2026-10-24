import {createLanguageController} from './language-controller.mjs';
import {createContextFrame} from './context-frame.mjs';
import {createCapabilityProgramHost} from '../capability-program-host.mjs';
import {resolveOperationProfile} from '../contracts/operations.mjs';
import {lowerCapabilityGraph} from '../contracts/program-ir1.mjs';
import {generateCapabilityProgramSource} from '../generated-capability-source.mjs';
import {createTextDocument} from '../text-documents.mjs';
import {validateResources2} from '../contracts/resources-v2.mjs';
const cancelled=()=>new Error('Session stopped');
export function createCapabilityExecution({config,getAuthoring,slot,beforeCommit,onDiagnostic=()=>{},onStatus=()=>{},requirePack=()=>{}}){
 let active=null,candidate=null,epoch=0;
 const identity=()=>{const run=active;return run?{sessionId:run.frame.sessionId,revision:run.frame.revision}:{sessionId:null,revision:null};};
 const currentAuthoring=run=>JSON.stringify(getAuthoring(run.contextId))===run.key;
 function diagnostic(record){
   const run=record.sourceLocation?[candidate,active].find(r=>r?.document?.id===record.sourceLocation.documentId):(candidate??active);if(!run)return;
   const next=structuredClone(record);
   if(run.generated&&next.sourceLocation){
     const id=run.generated.sourceMap[next.sourceLocation.line-1]?.[0];delete next.sourceLocation;
     if(id&&currentAuthoring(run)){next.sourceBlockId=id;next.origin=run.contextId;}
   }
   onDiagnostic(next);
 }
 const language=createLanguageController({origin:config.languageOrigin,releaseBase:config.releaseBase??'/',getScope:identity,
   getDocument:id=>[active,candidate].find(run=>run?.document?.id===id)?.document,
   rpc:(method,args,scope)=>{const run=active;if(!run||scope.sessionId!==run.frame.sessionId||scope.revision!==run.frame.revision)throw cancelled();return run.host.call(method,args);},
   onDiagnostic:diagnostic,
   onComplete:result=>{if(result?.error||result?.completed===false)active?.host.stop();onStatus(result?.error?'Error de programa contextual':'Programa contextual terminado');},
   onProgramReady:()=>onStatus('Programa activo · eventos disponibles'),
   completeInvocation:(payload,scope)=>{if(scope.sessionId!==active?.frame.sessionId||scope.revision!==active?.frame.revision)return {accepted:false};return active.host.complete(payload);}
 });
 function dispose(run){if(!run)return;run.host?.dispose();run.frame.dispose();}
 function stop({preserveCandidate=false}={}){
   epoch++;dispose(active);active=null;
   if(!preserveCandidate){dispose(candidate);candidate=null;language.stop();}else language.stop({preserve:candidate?.preparedLanguage});
 }
 async function run(contextId){
   const attempt=++epoch;
   const input=getAuthoring(contextId);if(!input?.contextConfig)throw new Error('Añade el contexto al proyecto.');
   const contextConfig=input.contextConfig,profile=resolveOperationProfile({contextId,documentId:contextConfig.documentId,capabilities:input.capabilities});
   const resources=await validateResources2(input.resources),key=JSON.stringify(input);
   if(attempt!==epoch)throw cancelled();
   dispose(candidate);candidate=null;language.cancelPreparation();
   let generated=null,document;
   if(contextConfig.mode==='blocks'){
     generated=generateCapabilityProgramSource(lowerCapabilityGraph(contextConfig.workspace,{contextId,documentId:contextConfig.documentId,profile}),'javascript');
     document=createTextDocument({language:'javascript',name:'Bloques · '+contextId,source:generated.text});
   }else{
     document=input.textDocuments.find(d=>d.id===contextConfig.selectedTextDocumentId&&d.language===contextConfig.mode);
     if(!document)throw new Error('Selecciona un documento independiente del lenguaje indicado.');
   }
   requirePack(contextId==='scene3d'?'scene3d-babylon':'webapp-dom');
   requirePack(document.language==='javascript'?'javascript-quickjs':'python-stdlib');
   const run={contextId,contextConfig,resources,profile,key,generated,document,subscriptions:new Set(),frame:null,host:null,preparedLanguage:null};
   run.frame=createContextFrame({contextId,slot,origin:config[contextId+'Origin'],releaseBase:config.releaseBase??'/',
     onEvent:event=>{if(active!==run)return;for(const item of run.subscriptions){if(item.handler.event!==event.type||item.handler.targetId!==event.targetId||item.handler.event==='key'&&item.handler.key!==event.key)continue;item.callback(event);}},
     onDiagnostic:record=>{if(active===run)onDiagnostic({...record,origin:contextId});}});
   run.host=createCapabilityProgramHost({profile,getRevision:()=>run.frame.revision,getScope:()=>({sessionId:run.frame.sessionId,revision:run.frame.revision}),
     onInvocation:invocation=>language.invoke({sessionId:run.frame.sessionId,...invocation}),
     onCancel:message=>language.cancelInvocation({sessionId:run.frame.sessionId,...message}),
     onDiagnostic:record=>{if(active===run)onDiagnostic({...record,origin:contextId});},
     callOperation:(operationId,args,authority,{signal})=>{
       if(active!==run||signal?.aborted||authority.sessionId!==run.frame.sessionId||authority.revision!==run.frame.revision)throw cancelled();
       return run.frame.request('call',{operationId,args});
     },
     subscribeEvent:(handler,callback)=>{const item={handler,callback};run.subscriptions.add(item);return()=>run.subscriptions.delete(item);}
   });
   candidate=run;onStatus('Preparando '+(contextId==='scene3d'?'escena 3D':'aplicación web')+'…');
   try{
     const [preparedLanguage]=await Promise.all([
       language.prepare(document,{profile:{profileId:profile.profileId,contextId,documentId:profile.documentId}}),
       run.frame.request('prepare',{config:contextConfig,resources,capabilities:input.capabilities})
     ]);run.preparedLanguage=preparedLanguage;
     if(candidate!==run||attempt!==epoch||!currentAuthoring(run))throw new Error('La autoría cambió durante la preparación. Vuelve a ejecutar.');
     await beforeCommit();
     // beforeCommit stops previous execution while retaining this staged run.
     if(candidate!==run||!currentAuthoring(run))throw cancelled();
     await run.frame.request('commit');
     dispose(active);active=run;candidate=null;run.frame.mount(slot);
     await language.execute(preparedLanguage,{runnerSessionId:run.frame.sessionId,revision:run.frame.revision,documentId:document.id});
     if(active===run)run.frame.activate?.();
     return await run.frame.request('snapshot');
   }catch(error){const ownsCandidate=candidate===run;if(ownsCandidate)candidate=null;if(active!==run)dispose(run);if(ownsCandidate)language.cancelPreparation();throw error;}
 }
 return Object.freeze({run,stop,language,
   snapshot:()=>active?active.frame.request('snapshot'):Promise.resolve(null),
   state:()=>({contextId:active?.contextId??null,sessionId:active?.frame.sessionId??null,revision:active?.frame.revision??null,sourceDocument:active?.document?.id??null,preparing:Boolean(candidate),program:active?.host.state()??null}),
   frameRequest:(command,payload)=>{if(!active)throw cancelled();return active.frame.request(command,payload);}
 });
}
