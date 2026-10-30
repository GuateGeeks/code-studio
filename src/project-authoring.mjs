import {validateCapabilities,resolveResourcePolicy,selectCapabilityLocksForContext,validateCapabilityReferences} from './contracts/packs.mjs';
import {scene2DObjectsOf,scene2DAuthoringFromBlockly} from './project-format.mjs';
import {composeScene2DProgram} from './contracts/program-contract.mjs';

// Injected participants own live drafts. This coordinator owns profile metadata
// and transaction capabilities, never a second mutable workspace.
export function createProjectAuthoring({editor,textDocuments,codeViews,source,capabilityEditors=[],initialCapabilities,resourceStore}={}) {
 if(!editor||!source)throw new TypeError('Authoring participants missing');
 const managed=new Map(),subscribers=new Set(),checkpoints=new WeakMap(),prepared=new WeakMap(),disposers=[];
 let muted=0,disposed=false;
 // GGPROJ v6 (scene2d-multi-sprite 1.3): the single 2D editor holds the first
 // sprite's workspace; the stage and the other sprites stay serialized here
 // until the per-object editor (tarea 3.1). Null for single-workspace profiles.
 // `mounted` is the object in the editor (2.2): the first sprite unless the
 // saved views or mountObject name another; `primary` stays the first sprite.
 let objects=null;
 function objectsOf(model,capabilities,views){
  const config=scene2DObjectsOf(capabilities);if(!config)return null;
  const primary=config.sprites[0].id,mounted=views?.version===2?views.objectId:primary;
  if(mounted!=='stage'&&!config.sprites.some(sprite=>sprite.id===mounted))throw new Error('Las vistas de código nombran un objeto desconocido.');
  return {primary,mounted,scene2d:structuredClone(model.authoring.scene2d??scene2DAuthoringFromBlockly(model.authoring.blockly,config))};
 }
 const objectWorkspace=(store,id)=>id==='stage'?store.scene2d.stage:store.scene2d.sprites[id];
 function storeWorkspace(store,id,state){if(id==='stage')store.scene2d.stage=state;else store.scene2d.sprites[id]=state;}
 function emit(){if(!muted&&!disposed)for(const callback of subscribers)callback();}
 for(const participant of capabilityEditors) {
  if(!participant||typeof participant.id!=='string'||managed.has(participant.id)||
    ['captureConfig','prepareConfig','commitConfig','checkpoint','restoreDraft'].some(key=>typeof participant[key]!=='function'))
    throw new TypeError('Invalid capability authoring participant');
  managed.set(participant.id,participant);
 }
 function templateOf(capabilities) {
  if(capabilities==null)return null;
  const template=structuredClone(capabilities);
  for(const id of managed.keys())delete template.config[id];
  return template;
 }

 // Dependencies between injected capability participants are data, not target branches.
 const ordered=[],visiting=new Set(),visited=new Set();
 function order(id){if(visited.has(id))return;if(visiting.has(id))throw new TypeError('Cyclic authoring dependencies');visiting.add(id);for(const dep of managed.get(id).dependencies??[])if(managed.has(dep))order(dep);else if(!['resources','textDocuments','editor','source'].includes(dep))throw new TypeError('Missing authoring dependency');visiting.delete(id);visited.add(id);ordered.push([id,managed.get(id)]);}
 for(const id of managed.keys())order(id);
 managed.clear();for(const [id,participant]of ordered)managed.set(id,participant);
 let template=templateOf(validateCapabilities(initialCapabilities===undefined?(editor.captureCapabilities?.()??null):initialCapabilities));
 function assemble(base,capture=true) {
  if(base==null)return null;
  const result=structuredClone(base);
  for(const lock of result.locks)if(managed.has(lock.id)&&capture)result.config[lock.id]=managed.get(lock.id).captureConfig();
  return result;
 }
 function captureCapabilities(){return validateCapabilities(assemble(template));}
 function projectExecution(base,context,{allowInactive=false}={}) {
  if(base==null)return null;
  const result=structuredClone(base);
  result.locks=selectCapabilityLocksForContext(result.locks,context);
  if(!result.locks.length){if(allowInactive)return null;throw new Error('Contexto no seleccionado: '+context);}
  const ids=new Set(result.locks.map(lock=>lock.id));
  for(const id of Object.keys(result.config))if(!ids.has(id))delete result.config[id];
  for(const lock of result.locks)if(managed.has(lock.id)&&!Object.hasOwn(result.config,lock.id))result.config[lock.id]=managed.get(lock.id).captureConfig();
  return validateCapabilities(result);
 }
 function captureExecutionCapabilities(context){return projectExecution(template,context);}
 function prepareCapabilities(value,{allowRemoval=false}={}) {
  const next=validateCapabilities(value);
  if(!allowRemoval&&[1,2].includes(resourceStore?.capture().version)&&(!resolveResourcePolicy(next)||resourceStore.capture().version===2&&resolveResourcePolicy(next)!=='gg-resources-v2'))throw new Error('Retirar la política descartaría recursos; reemplaza el proyecto explícitamente.');
  if(!allowRemoval&&template)for(const lock of template.locks)if(managed.has(lock.id)&&!next?.locks.some(item=>item.id===lock.id)) {
   const participant=managed.get(lock.id);
   if(participant.hasAuthoring?.()!==false)throw new Error('Retirar el pack descartaría autoría. Conserva una copia o reemplaza el proyecto explícitamente.');
  }
  return next;
 }
 // Program the 2D scene runs (scene2d-multi-sprite 2.1). Single-workspace
 // profiles (gg.sprites 0.1.0/0.2.0): the editor's IR0, unchanged. 0.3.0: IR
 // 2D v1 composed from the mounted workspace (the first sprite's, the one
 // resolveCapabilities().initialScene describes) and the stored stage and
 // sprites, each lowered headless with the same profile and resources. Pure
 // reading: nothing is mounted, saved or run.
 const emptyWorkspace=state=>!state?.blocks?.blocks?.length&&!state?.variables?.length;
 function sceneProgram() {
  const mounted=editor.program();
  if(!objects)return mounted;
  const config=scene2DObjectsOf(projectExecution(template,'scratch-2d'));
  if(!config)throw new Error('El perfil 2D perdió sus objetos.');
  const lower=state=>{
   if(emptyWorkspace(state))return {version:0,scripts:[]};
   if(typeof editor.programOf!=='function')throw new Error('Este editor no puede convertir los scripts de otros objetos.');
   return editor.programOf(structuredClone(state));
  };
  return composeScene2DProgram(config,{stage:objects.mounted==='stage'?mounted:lower(objects.scene2d.stage),
   sprites:Object.fromEntries(config.sprites.map(sprite=>[sprite.id,sprite.id===objects.mounted?mounted:lower(objects.scene2d.sprites[sprite.id])]))});
 }
 // Puts another object in the single editor (2.2): the coordinator stores the
 // outgoing workspace only after the incoming one validated and loaded, so a
 // rejected object changes nothing. Nothing runs. The panel arrives with 3.1.
 function mountObject(id,{scriptOrder=null}={}) {
  if(!objects)throw new Error('Este proyecto tiene un solo objeto.');
  if(id!=='stage'&&!Object.hasOwn(objects.scene2d.sprites,id))throw new Error('Objeto desconocido.');
  if(id===objects.mounted)return;
  const resourceView=editor.resourceView?.()??null;
  const candidate=editor.prepare(structuredClone(objectWorkspace(objects,id)),{scriptOrder,capabilities:projectExecution(template,'scratch-2d',{allowInactive:true}),...(resourceView?{resourceView}:{})});
  const outgoing=editor.save();
  muted++;
  try{editor.commit(candidate);storeWorkspace(objects,objects.mounted,outgoing);objects.mounted=id;}
  finally{muted--;}
  emit();
 }
 function capture() {
  const capabilities=captureCapabilities(),views=codeViews?.capture();
  const live=editor.save();
  // `blockly` stays the first sprite's workspace (createProject writes it there).
  let scene2d=null;
  if(objects){scene2d=structuredClone({stage:objects.scene2d.stage,sprites:objects.scene2d.sprites});storeWorkspace({scene2d},objects.mounted,structuredClone(live));}
  const blockly=scene2d?structuredClone(scene2d.sprites[objects.primary]):live;
  return {blockly,...(scene2d?{scene2d}:{}),deviceSource:source.value,...(textDocuments?.capture()??{}),...(views?{codeViews:views}:{}),...(capabilities?{capabilities}:{}),...(resourceStore?{resources:resourceStore.capture()}:{})};
 }
 function prepare(model,options={}) {
  if(!model?.authoring||typeof model.authoring.deviceSource!=='string')throw new TypeError('Invalid project authoring');
  const capabilities=prepareCapabilities(model.capabilities??null,options);
  // Resource preparation precedes every editor/config preparation.
  const resourceCandidate=resourceStore?.prepare(model.resources);
  const resourceView=resourceStore?.candidateView(resourceCandidate);
  const resources=resourceStore?.candidateResources(resourceCandidate);
  const textCandidate=textDocuments?.prepare(model.authoring);
  if(model.authoring.codeViews && !codeViews)throw new Error('Este lector no admite las vistas guardadas del proyecto.');
  const viewsCandidate=codeViews?.prepare(model.authoring.codeViews??null);
  if(resources)validateCapabilityReferences(capabilities,{resources,textDocuments:model.authoring.textDocuments??[]});
  const scene2d=objectsOf(model,capabilities,viewsCandidate);
  const plan={
   capabilities,resourceCandidate,objects:scene2d,
   editor:editor.prepare(scene2d?objectWorkspace(scene2d,scene2d.mounted):model.authoring.blockly,{scriptOrder:viewsCandidate?.entries.find(entry=>entry.contextId==='2d')?.scriptOrder??null,capabilities:projectExecution(capabilities,'scratch-2d',{allowInactive:true}),...(resourceView?{resourceView}:{})}),
   text:textCandidate,codeViews:viewsCandidate,
   source:model.authoring.deviceSource,
   managed:[...managed].map(([id,participant])=>{const config=capabilities?.config[id]??null;const contextId=(participant.contexts??[participant.context??participant.id])[0];const view=resourceStore?.candidateView(resourceCandidate,{contextId,documentId:config?.documentId});return {id,candidate:participant.prepareConfig(config,{resources,resourceView:view,textDocuments:model.authoring.textDocuments??[]})};})
  };
  const token=Object.freeze({});prepared.set(token,plan);return token;
 }
 function checkpoint() {
  const token=Object.freeze(Object.create(null));
  checkpoints.set(token,{
   template:structuredClone(template),objects:structuredClone(objects),source:source.value,resources:resourceStore?.checkpoint(),
   sourceView:{selection:[source.selectionStart,source.selectionEnd,source.selectionDirection],scroll:[source.scrollTop,source.scrollLeft],focused:source.ownerDocument?.activeElement===source},
   editor:editor.checkpoint?.(),blockly:editor.save(),editorCapabilities:projectExecution(template,'scratch-2d',{allowInactive:true}),
   text:textDocuments?.checkpoint(),codeViews:codeViews?.checkpoint(),
   managed:[...managed].map(([id,participant])=>({id,token:participant.checkpoint()}))
  });
  return token;
 }
 function restoreDraft(token,{silent=false}={}) {
  const saved=checkpoints.get(token);if(!saved)throw new TypeError('El borrador no pertenece a este coordinador.');
  const failures=[];muted++;
  try {
   template=structuredClone(saved.template);objects=structuredClone(saved.objects);
   try {if(resourceStore)resourceStore.restoreDraft(saved.resources,{silent:true});}catch(error){failures.push(error);}
   try {if(saved.editor&&editor.restoreDraft)editor.restoreDraft(saved.editor);else editor.commit({state:structuredClone(saved.blockly),capabilities:structuredClone(saved.editorCapabilities)});}catch(error){failures.push(error);}
   try {if(codeViews)codeViews.restoreDraft(saved.codeViews);}catch(error){failures.push(error);}
   try {if(textDocuments)textDocuments.restoreDraft(saved.text);}catch(error){failures.push(error);}
   for(const item of saved.managed)try{managed.get(item.id).restoreDraft(item.token);}catch(error){failures.push(error);}
   source.value=saved.source;
   if(saved.sourceView.focused)source.focus?.();
   if(saved.sourceView.selection[0]!==undefined)source.setSelectionRange?.(...saved.sourceView.selection);
   if(saved.sourceView.scroll[0]!==undefined)[source.scrollTop,source.scrollLeft]=saved.sourceView.scroll;
  }finally{muted--;}
  if(failures.length)throw new AggregateError(failures,'No se pudo restaurar toda la autoría.');
  if(!silent)emit();
 }
 function commit(token) {
  const plan=prepared.get(token);if(!plan)throw new TypeError('El candidato no pertenece a este coordinador.');
  const previous=checkpoint();let failed;
  muted++;
  try {
   if(resourceStore)resourceStore.commit(plan.resourceCandidate);
   editor.commit(plan.editor);
   if(textDocuments)textDocuments.commit(plan.text);
   for(const item of plan.managed)managed.get(item.id).commitConfig(item.candidate);
   source.value=plan.source;template=templateOf(plan.capabilities);objects=structuredClone(plan.objects);
   if(codeViews)codeViews.commit(plan.codeViews);
  }catch(error){failed=error;}
  finally{muted--;}
  if(!failed)try{emit();}catch(error){failed=error;}
  if(failed) {
   try{restoreDraft(previous,{silent:true});}catch(error){throw new AggregateError([failed,error],'Falló el commit y la restauración de autoría.');}
   throw failed;
  }
  // No fallible recapture after the transaction has published.
  return undefined;
 }
 for(const participant of [resourceStore,editor,textDocuments,codeViews,...managed.values()])if(participant?.subscribe) {
  const unsubscribe=participant.subscribe(emit);if(typeof unsubscribe==='function')disposers.push(unsubscribe);
 }
 if(source.addEventListener){source.addEventListener('input',emit);disposers.push(()=>source.removeEventListener('input',emit));}
 return Object.freeze({capture,sceneProgram,mountObject,mountedObject:()=>objects?.mounted??null,captureCapabilities,capabilities:captureCapabilities,captureExecutionCapabilities,prepareCapabilities,prepare,commit,checkpoint,restoreDraft,
  subscribe(callback){subscribers.add(callback);return()=>subscribers.delete(callback);},
  dispose(){disposed=true;for(const dispose of disposers)dispose();subscribers.clear();}
 });
}
