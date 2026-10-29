// Portable authoring only. No parser, editor, DOM or runtime dependencies.
const contexts = new Set(['2d','text','microbit','sb3','scene3d','webapp']);
const synchronizedContexts = new Set(['2d','microbit','scene3d','webapp']);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype,null].includes(Object.getPrototypeOf(value));
const bytes = value => new TextEncoder().encode(value).length;
const fail = message => { throw new Error('Vistas de código: ' + message); };
function object(value,fields) {
  if(!plain(value)||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key))) fail('estructura inválida.');
}
function order(value) {if(value!==null&&(!Array.isArray(value)||value.length>16||new Set(value).size!==value.length||value.some(id=>typeof id!=='string'||!id.trim()||id.length>128)))fail('orden de eventos inválido.');}
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
  object(value,['version','activeContext','entries']);
  if(value.version!==1||!contexts.has(value.activeContext)||!Array.isArray(value.entries)||value.entries.length>4)fail('versión o contexto inválido.');
  const seen=new Set();
  for(const entry of value.entries){
    object(entry,['contextId','language','source','baselineSource','formatNoticeShown','editedInText','scriptOrder','restorePoint','pendingRestorePoint']);
    if(!synchronizedContexts.has(entry.contextId)||seen.has(entry.contextId))fail('contexto duplicado o desconocido.');
    seen.add(entry.contextId);
    const languages=entry.contextId==='microbit'?['blocks','typescript']:['blocks','javascript','python'];
    if(!languages.includes(entry.language)||typeof entry.formatNoticeShown!=='boolean'||typeof entry.editedInText!=='boolean')fail('vista o estado inválido.');
    if(allowDrafts){if(typeof entry.source!=='string')fail('el borrador necesita texto.');}else text(entry.source);
    text(entry.baselineSource);order(entry.scriptOrder);
    for(const point of [entry.restorePoint,entry.pendingRestorePoint]) if(point!==null){
      object(point,['id','workspace','appliedHash','scriptOrder']);
      data(point.workspace);order(point.scriptOrder);
      if(typeof point.id!=='string'||!/^[a-f0-9-]{36}$/.test(point.id)||
          !plain(point.workspace)||bytes(JSON.stringify(point.workspace))>65536||
          typeof point.appliedHash!=='string'||!/^[a-f0-9]{64}$/.test(point.appliedHash))fail('punto de restauración inválido.');
    }
  }
  if(!allowDrafts&&bytes(JSON.stringify(value))>512*1024)fail('las vistas superan el límite de datos del proyecto.');
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
    const next=validateCodeViews({version:1,activeContext:value?.activeContext??entry.contextId,entries},{allowDrafts:true});
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
