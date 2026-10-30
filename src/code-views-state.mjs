// Portable authoring only. No parser, editor, DOM or runtime dependencies.
const contexts = new Set(['2d','text','microbit','sb3','scene3d','webapp']);
const synchronizedContexts = new Set(['2d','microbit','scene3d','webapp']);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype,null].includes(Object.getPrototypeOf(value));
const bytes = value => new TextEncoder().encode(value).length;
const fail = message => { throw new Error('Vistas de código: ' + message); };
// scene2d-multi-sprite 2.2: version 2 adds the object the 2d entry describes and
// the stored view of each other object. Text is never stored per object: it is
// applied before changing object (R2), so only order and Undo point remain.
const objectKeys = ['version','activeContext','entries','objectId','objects'];
const objectId = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(value) && !['__proto__','constructor','prototype'].includes(value);
function object(value,fields) {
  if(!plain(value)||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key))) fail('estructura inválida.');
}
function order(value) {if(value!==null&&(!Array.isArray(value)||value.length>16||new Set(value).size!==value.length||value.some(id=>typeof id!=='string'||!id.trim()||id.length>128)))fail('orden de eventos inválido.');}
function restorePoint(point) {
  if(point===null)return;
  object(point,['id','workspace','appliedHash','scriptOrder']);
  data(point.workspace);order(point.scriptOrder);
  if(typeof point.id!=='string'||!/^[a-f0-9-]{36}$/.test(point.id)||
      !plain(point.workspace)||bytes(JSON.stringify(point.workspace))>65536||
      typeof point.appliedHash!=='string'||!/^[a-f0-9]{64}$/.test(point.appliedHash))fail('punto de restauración inválido.');
}
function text(value) {if(typeof value!=='string'||bytes(value)>65536)fail('el texto supera el límite de 65.536 bytes.');}
function data(value,depth=0) {
  if(depth>64)fail('restauración demasiado profunda.');
  if(value===null||typeof value==='string'||typeof value==='boolean')return;
  if(typeof value==='number'&&Number.isFinite(value))return;
  if(Array.isArray(value)){for(const item of value)data(item,depth+1);return;}
  if(!plain(value))fail('la restauración necesita datos JSON.');
  for(const [key,item] of Object.entries(value)){
    if(['__proto__','constructor','prototype'].includes(key))fail('propiedad no permitida.');
    data(item,depth+1);
  }
}
export function validateCodeViews(value, {allowDrafts=false}={}) {
  if(value===null||value===undefined)return null;
  object(value,value?.version===2?objectKeys:['version','activeContext','entries']);
  if(![1,2].includes(value.version)||!contexts.has(value.activeContext)||!Array.isArray(value.entries)||value.entries.length>4)fail('versión o contexto inválido.');
  if(value.version===2){
    if(!objectId(value.objectId)||!plain(value.objects)||Object.keys(value.objects).length>8)fail('objeto inválido.');
    for(const [id,view] of Object.entries(value.objects)){
      if(!objectId(id)||id===value.objectId)fail('objeto inválido.');
      object(view,['scriptOrder','restorePoint']);order(view.scriptOrder);restorePoint(view.restorePoint);
    }
  }
  const seen=new Set();
  for(const entry of value.entries){
    object(entry,['contextId','language','source','baselineSource','formatNoticeShown','editedInText','scriptOrder','restorePoint','pendingRestorePoint']);
    if(!synchronizedContexts.has(entry.contextId)||seen.has(entry.contextId))fail('contexto duplicado o desconocido.');
    seen.add(entry.contextId);
    const languages=entry.contextId==='microbit'?['blocks','typescript']:['blocks','javascript','python'];
    if(!languages.includes(entry.language)||typeof entry.formatNoticeShown!=='boolean'||typeof entry.editedInText!=='boolean')fail('vista o estado inválido.');
    if(allowDrafts){if(typeof entry.source!=='string')fail('el borrador necesita texto.');}else text(entry.source);
    text(entry.baselineSource);order(entry.scriptOrder);
    restorePoint(entry.restorePoint);restorePoint(entry.pendingRestorePoint);
  }
  // Version 2 keeps an Undo point (≤ 64 KiB) for each of up to 8 more objects.
  if(!allowDrafts&&bytes(JSON.stringify(value))>(value.version===2?1024:512)*1024)fail('las vistas superan el límite de datos del proyecto.');
  return structuredClone(value);
}
export const emptyCodeView = contextId => ({contextId,language:'blocks',source:'',baselineSource:'',
  formatNoticeShown:false,editedInText:false,scriptOrder:null,restorePoint:null,pendingRestorePoint:null});

export function createCodeViewsState(initial=null) {
  let value=validateCodeViews(initial);
  const listeners=new Set(),checkpoints=new WeakMap();
  const emit=reason=>{for(const listener of listeners)listener(reason);};
  function set(entry){
    const entries=(value?.entries??[]).filter(item=>item.contextId!==entry.contextId).concat(structuredClone(entry));
    const next=validateCodeViews({...(value?.version===2?value:{version:1}),activeContext:value?.activeContext??entry.contextId,entries},{allowDrafts:true});
    value=next;emit({type:'edit',contextId:entry.contextId});
  }
  function commit(candidate){value=validateCodeViews(candidate);emit({type:'load'});}
  return Object.freeze({
    capture:()=>structuredClone(value),
    get:contextId=>structuredClone(value?.entries.find(entry=>entry.contextId===contextId)??emptyCodeView(contextId)),
    set,
    // Incomplete and oversized drafts remain in memory; persistence validates
    // separately and reports a failure instead of replacing the user's text.
    editSource(contextId,source){
      if(typeof source!=='string')throw new TypeError('El borrador necesita texto.');
      if(!value?.entries.some(entry=>entry.contextId===contextId))fail('abre primero una vista de código.');
      const entry=value.entries.find(entry=>entry.contextId===contextId);
      if(entry.source===source)return;
      entry.source=source;emit({type:'edit',contextId});
    },
    currentObject:()=>value?.version===2?value.objectId:null,
    // Stored view of an object that is not the current one.
    objectView:objectId=>structuredClone(value?.objects?.[objectId]??{scriptOrder:null,restorePoint:null}),
    // Moves the 2d view to another object. The caller applied any pending text
    // first (R2); the language stays, its text is generated for the new object.
    switchObject(from,to,{scriptOrder=null}={}){
      if(!objectId(from)||!objectId(to)||from===to)fail('objeto inválido.');
      const entry=structuredClone(value?.entries.find(item=>item.contextId==='2d')??emptyCodeView('2d'));
      if(entry.source!==entry.baselineSource)fail('aplica primero el texto pendiente.');
      if(entry.pendingRestorePoint)fail('hay una conversión en curso.');
      const objects=structuredClone(value?.objects??{}),next=objects[to]??{scriptOrder:null,restorePoint:null};
      delete objects[to];
      if(scriptOrder!==null||entry.restorePoint)objects[from]={scriptOrder:structuredClone(scriptOrder),restorePoint:entry.restorePoint};
      else delete objects[from];
      const replaced={...entry,source:'',baselineSource:'',scriptOrder:next.scriptOrder,restorePoint:next.restorePoint,pendingRestorePoint:null};
      value=validateCodeViews({version:2,activeContext:value?.activeContext??'2d',
        entries:(value?.entries??[]).filter(item=>item.contextId!=='2d').concat(replaced),objectId:to,objects},{allowDrafts:true});
      emit({type:'object',objectId:to});
    },
    // The applied state's hash arrives after the conversion; by then its object
    // may be stored. False when no stored point has that id.
    correctStoredPoint(pointId,appliedHash){
      const view=Object.values(value?.objects??{}).find(item=>item.restorePoint?.id===pointId);
      if(!view)return false;
      if(view.restorePoint.appliedHash!==appliedHash){view.restorePoint.appliedHash=appliedHash;emit({type:'edit',contextId:'2d'});}
      return true;
    },
    activate(contextId){
      if(!contexts.has(contextId))fail('contexto inválido.');
      if(!value||value.activeContext===contextId)return;
      value.activeContext=contextId;emit({type:'navigation',contextId});
    },
    prepare:value=>validateCodeViews(value),commit,
    checkpoint(){const token=Object.freeze({});checkpoints.set(token,structuredClone(value));return token;},
    restoreDraft(token){if(!checkpoints.has(token))fail('punto de recuperación desconocido.');value=structuredClone(checkpoints.get(token));emit({type:'load'});},
    subscribe(callback){listeners.add(callback);return()=>listeners.delete(callback);}
  });
}
