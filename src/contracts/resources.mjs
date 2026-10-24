import {sanitizeSvg} from './media-svg.mjs';
import {sanitizePngContainer} from './media-png.mjs';
import {inspectWavPcm16} from './media-wav.mjs';
import {inspectGlb} from './media-glb.mjs';

// Resource bytes remain data. Only this installed policy validates the archive.
export const resourcePolicy = 'gg-resources-v1';
export const resourceLimits = Object.freeze({bytes:2*1024*1024,assets:32,costumes:32,sounds:16,sources:4,
 modelBytes:512*1024,bindings:128,mediaBytes:128*1024,sourceBytes:256*1024,pixels:4*1024*1024,id:128,name:128,center:4096});
const encoder=new TextEncoder(),validated=new WeakMap();
const fail=message=>{throw new Error('GG resources: '+message);};
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
function object(value,required,optional=[]) {
 if(!plain(value))fail('objeto inválido');
 const keys=Object.keys(value);
 if(keys.some(key=>!required.includes(key)&&!optional.includes(key))||required.some(key=>!Object.hasOwn(value,key)))fail('propiedades no permitidas o ausentes');
 for(const key of keys)if(!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))fail('accessor no permitido');
}
function list(value,maximum) {
 if(!Array.isArray(value)||value.length>maximum||Object.keys(value).length!==value.length)fail('lista inválida o cuota excedida');
 for(let index=0;index<value.length;index++)if(!Object.hasOwn(value,index))fail('lista dispersa');
}
function id(value) {if(typeof value!=='string'||! /^[A-Za-z0-9:_-]+$/.test(value)||value.length>resourceLimits.id||['__proto__','prototype','constructor'].includes(value))fail('ID inválido');return value;}
function name(value){if(typeof value!=='string'||!value.trim()||value.length>resourceLimits.name)fail('nombre inválido');return value;}
function sha(value){if(typeof value!=='string'||! /^[a-f0-9]{64}$/.test(value))fail('ID SHA256 inválido');return value;}
function binary(bytes) {
 if(bytes instanceof ArrayBuffer)return new Uint8Array(bytes.slice(0));
 if(bytes instanceof Uint8Array)return bytes.slice();
 fail('bytes ausentes');
}
export function encodeResourceBytes(bytes) {
 let text='';for(const value of bytes)text+=String.fromCharCode(value);
 return btoa(text);
}
export function decodeResourceAsset(asset) {
 object(asset,['type','format','encoding','data']);
 if(asset.encoding!=='base64'||typeof asset.data!=='string'||asset.data.length>Math.ceil(resourceLimits.modelBytes/3)*4||
   asset.data.length%4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.data))fail('base64 inválido');
 let text;try{text=atob(asset.data);}catch{fail('base64 inválido');}
 const bytes=Uint8Array.from(text,char=>char.charCodeAt(0));
 if(encodeResourceBytes(bytes)!==asset.data)fail('base64 no canónico');
 return bytes;
}
async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');}
async function inspectPng(bytes) {
 const image=sanitizePngContainer(bytes);
 if(typeof DecompressionStream!=='function')fail('validador zlib no disponible');
 const stream=new DecompressionStream('deflate'),writer=stream.writable.getWriter(),reader=stream.readable.getReader();
 let count=0,producerError;const stride=image.rowBytes+1;
 // Small writes bound decoder overshoot before the consumer can enforce quota.
 // Observe the producer immediately: a corrupt trailer must not become an
 // unhandled rejection while the readable side is being drained.
 const produced=(async()=>{for(let offset=0;offset<image.idat.length;offset+=512)await writer.write(image.idat.subarray(offset,offset+512));await writer.close();})();
 const observed=produced.catch(async error=>{producerError=error;await reader.cancel(error).catch(()=>{});});
 try {
  for(;;) {
   const {value,done}=await reader.read();if(done)break;
   if(count+value.length>image.expectedInflatedBytes)fail('salida PNG excesiva');
   for(let index=0;index<value.length;index++)if((count+index)%stride===0&&value[index]>4)fail('filtro PNG inválido');
   count+=value.length;
  }
  await observed;if(producerError)throw producerError;
 }catch(error){await Promise.allSettled([reader.cancel(error),writer.abort(error)]);await observed;throw error;}
 finally{reader.releaseLock();writer.releaseLock();}
 if(count!==image.expectedInflatedBytes)fail('salida PNG truncada');
 return image;
}
async function inspect(bytes,type,format) {
 if(!bytes.length||bytes.length>(type==='Source'?resourceLimits.sourceBytes:type==='Model'?resourceLimits.modelBytes:resourceLimits.mediaBytes))fail('tamaño de asset excedido');
 if(type==='Image'&&format==='svg')return sanitizeSvg(bytes);
 if(type==='Image'&&format==='png')return inspectPng(bytes);
 if(type==='Sound'&&format==='wav'){inspectWavPcm16(bytes);return {bytes};}
 if(type==='Model'&&format==='glb'){const model=inspectGlb(bytes);for(const image of model.images)await inspectPng(image.bytes);return {bytes,model:model.metadata};}
 if(type==='Source'&&format==='sb3')return {bytes}; // Inert original; intake is a separate bounded parser.
 fail('tipo o formato no soportado');
}
export async function prepareAsset(input,{type,format}={}) {
 const initial=binary(input),media=await inspect(initial,type,format),bytes=media.bytes??initial;
 if(bytes.length>(type==='Source'?resourceLimits.sourceBytes:type==='Model'?resourceLimits.modelBytes:resourceLimits.mediaBytes))fail('normalización excesiva');
 const hash=await digest(bytes);
 return {id:hash,asset:{type,format,encoding:'base64',data:encodeResourceBytes(bytes)},integrity:{bytes:bytes.length,sha256:hash}};
}
function fingerprint(value){return JSON.stringify(value);}
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';}
function remember(resources,view) {validated.set(resources,{fingerprint:fingerprint(resources),view:structuredClone(view)});return resources;}
function entry(resources) {
 const saved=resources&&validated.get(resources);
 if(!saved||saved.fingerprint!==fingerprint(resources))fail('recursos sin validación local vigente');
 return saved;
}
export function cloneValidatedResources(resources) {
 const saved=entry(resources),copy=structuredClone(resources);
 return remember(copy,saved.view);
}
function descriptors(resources,assets) {
 const used=new Set(),costumes=[],sounds=[];
 list(resources.costumes,resourceLimits.costumes);list(resources.sounds,resourceLimits.sounds);
 for(const item of resources.costumes) {
  object(item,['id','ownerId','name','assetId','centerX','centerY','bitmapResolution']);
  id(item.id);id(item.ownerId);name(item.name);sha(item.assetId);
  if(used.has(item.id))fail('descriptor duplicado');used.add(item.id);
  if(assets.get(item.assetId)?.type!=='Image')fail('imagen de disfraz ausente');
  if(![item.centerX,item.centerY].every(value=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=resourceLimits.center)||
    ![1,2].includes(item.bitmapResolution))fail('centro/resolución inválidos');
  costumes.push({...item});
 }
 for(const item of resources.sounds) {
  object(item,['id','ownerId','name','assetId']);id(item.id);id(item.ownerId);name(item.name);sha(item.assetId);
  if(used.has(item.id))fail('descriptor duplicado');used.add(item.id);
  if(assets.get(item.assetId)?.type!=='Sound')fail('sonido ausente');
  sounds.push({...item});
 }
 return {costumes,sounds};
}
export async function validateResources(input,{policy=resourcePolicy}={}) {
 if(policy==='gg-resources-v2')return validateResources2Internal(input);
 if(policy!==resourcePolicy)fail('política no instalada');
 object(input,['version','assets','integrity','costumes','sounds']);
 if(input.version!==1||!plain(input.assets)||!plain(input.integrity))fail('versión/catálogo inválidos');
 const ids=Object.keys(input.assets);
 if(ids.length>resourceLimits.assets||Object.keys(input.integrity).length!==ids.length||Object.keys(input.integrity).some(key=>!Object.hasOwn(input.assets,key)))fail('integridad o cuota de assets');
 if(encoder.encode(JSON.stringify(input)).length>resourceLimits.bytes)fail('recursos demasiado grandes');
 // Snapshot before the first await; caller edits cannot alter the candidate.
 const resources=structuredClone(input),assets=new Map();let sources=0,pixels=0;
 for(const assetId of ids) {
  sha(assetId);const asset=resources.assets[assetId],integrity=resources.integrity[assetId];
  if(!['Image/svg','Image/png','Sound/wav','Source/sb3'].includes(asset.type+'/'+asset.format))fail('tipo no permitido en política1');
  object(integrity,['bytes','sha256']);const bytes=decodeResourceAsset(asset);
  const media=await inspect(bytes,asset.type,asset.format);
  if(media.bytes&&encodeResourceBytes(media.bytes)!==asset.data)fail('recurso no canónico; normaliza antes de guardar');
  if(!Number.isSafeInteger(integrity.bytes)||integrity.bytes!==bytes.length||integrity.sha256!==assetId||await digest(bytes)!==assetId)fail('hash o tamaño inválido');
  if(asset.type==='Source'&&++sources>resourceLimits.sources)fail('cuota de originales');
  const metadata={id:assetId,type:asset.type,format:asset.format,bytes:bytes.length};
  if(asset.type==='Image') {
   metadata.width=media.width;metadata.height=media.height;pixels+=media.width*media.height;
   if(pixels>resourceLimits.pixels)fail('cuota agregada de píxeles');
  }
  assets.set(assetId,metadata);
 }
 const view={version:1,assets:[...assets.values()],...descriptors(resources,assets)};
 return remember(resources,view);
}
export function createResourceView(resources,{catalog,contextId,documentId}={}) {
 try{const view=entry(resources).view;if(view.version===2){if(!contextId||contextId==='scratch-2d')return createResourceView(projectContextResources(resources,{contextId:'scratch-2d',documentId}));return {...structuredClone(view),bindings:view.bindings.filter(item=>item.owner.contextId===contextId&&(!documentId||item.owner.documentId===documentId)).map(item=>structuredClone(item))};}return structuredClone(view);}catch(error){
  if([1,2].includes(resources?.version)||!catalog?.resources||canonical(resources)!==canonical(catalog.resources))throw error;
  const assets=Object.entries(resources.assets).map(([assetId,asset])=>({id:assetId,type:typeof asset==='string'?'Image':asset.type,
   format:typeof asset==='string'?'svg':asset.format,bytes:resources.integrity[assetId].bytes}));
  const costumes=resources.costumes.flatMap((items,index)=>items.map(item=>({id:item.name,ownerId:index===0?'stage':'hero',name:item.name,assetId:item.assetId,
   centerX:item.rotationCenterX,centerY:item.rotationCenterY,bitmapResolution:item.bitmapResolution??1})));
  const sounds=resources.sounds.map(item=>({id:item.name,ownerId:'hero',name:item.name,assetId:item.assetId}));
  const view=validateResourceView({version:1,assets,costumes,sounds});
  remember(resources,view);return structuredClone(view);
 }
}
export function validateResourceView(view) {
 if(view?.version===2)return validateResourceView2(view);
 object(view,['version','assets','costumes','sounds']);
 if(view.version!==1)fail('versión de vista no soportada');
 list(view.assets,resourceLimits.assets);list(view.costumes,resourceLimits.costumes);list(view.sounds,resourceLimits.sounds);
 const assets=new Map();
 for(const item of view.assets) {
  object(item,['id','type','format','bytes'],['width','height']);id(item.id);
  if(!/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(item.id)||assets.has(item.id)||
    !['Image/svg','Image/png','Sound/wav','Source/sb3'].includes(item.type+'/'+item.format)||
    !Number.isSafeInteger(item.bytes)||item.bytes<1||item.bytes>(item.type==='Source'?resourceLimits.sourceBytes:resourceLimits.mediaBytes))fail('asset de vista inválido');
  if(Object.hasOwn(item,'width')||Object.hasOwn(item,'height')) {
   if(item.type!=='Image'||![item.width,item.height].every(v=>Number.isSafeInteger(v)&&v>0&&v<=1024)||item.width*item.height>1048576)fail('dimensiones inválidas');
  }
  assets.set(item.id,item);
 }
 const ids=new Set();
 for(const [kind,items] of [['Image',view.costumes],['Sound',view.sounds]])for(const item of items) {
  object(item,kind==='Image'?['id','ownerId','name','assetId','centerX','centerY','bitmapResolution']:['id','ownerId','name','assetId']);
  id(item.id);id(item.ownerId);name(item.name);
  if(ids.has(item.id)||assets.get(item.assetId)?.type!==kind)fail('referencia de vista inválida');ids.add(item.id);
  if(kind==='Image'&&(![item.centerX,item.centerY].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=resourceLimits.center)||![1,2].includes(item.bitmapResolution)))fail('centro/resolución de vista inválidos');
 }
 return structuredClone(view);
}
export function getResourceAsset(view,assetId){return validateResourceView(view).assets.find(item=>item.id===assetId)??null;}
export function getResourceCostume(view,costumeId,ownerId){return validateResourceView(view).costumes.find(item=>item.id===costumeId&&(ownerId===undefined||item.ownerId===ownerId))??null;}
export function getResourceSound(view,soundId,ownerId){return validateResourceView(view).sounds.find(item=>item.id===soundId&&(ownerId===undefined||item.ownerId===ownerId))??null;}
export async function promoteLegacyResources(catalog) {
 if(!catalog?.resources)fail('catálogo legacy ausente');
 const legacy=catalog.resources,resources={version:1,assets:{},integrity:{},costumes:[],sounds:[]},ids=new Map();
 for(const [assetId,asset]of Object.entries(legacy.assets)) {
  const prepared=await prepareAsset(typeof asset==='string'?encoder.encode(asset):decodeResourceAsset(asset),{type:typeof asset==='string'?'Image':asset.type,format:typeof asset==='string'?'svg':asset.format});
  ids.set(assetId,prepared.id);resources.assets[prepared.id]=prepared.asset;resources.integrity[prepared.id]=prepared.integrity;
 }
 for(const [index,items]of legacy.costumes.entries())for(const item of items)resources.costumes.push({id:item.name,ownerId:index===0?'stage':'hero',name:item.name,assetId:ids.get(item.assetId),
  centerX:item.rotationCenterX,centerY:item.rotationCenterY,bitmapResolution:item.bitmapResolution??1});
 for(const item of legacy.sounds)resources.sounds.push({id:item.name,ownerId:'hero',name:item.name,assetId:ids.get(item.assetId)});
 return validateResources(resources);
}
export async function applyResourceEdit(current,edit) {
 entry(current);const resources=structuredClone(current);
 if(resources.version!==1)fail('promoción explícita requerida');
 if(!plain(edit)||typeof edit.type!=='string')fail('edición inválida');
 if(edit.type==='put-asset') {
  object(edit,['type','prepared']);const prepared=edit.prepared;
  object(prepared,['id','asset','integrity']);sha(prepared.id);
  resources.assets[prepared.id]=structuredClone(prepared.asset);resources.integrity[prepared.id]=structuredClone(prepared.integrity);
 }else if(edit.type==='replace-costume'||edit.type==='replace-sound') {
  object(edit,['type','descriptor'],['prepared']);
  if(edit.prepared) {
   object(edit.prepared,['id','asset','integrity']);sha(edit.prepared.id);
   resources.assets[edit.prepared.id]=structuredClone(edit.prepared.asset);resources.integrity[edit.prepared.id]=structuredClone(edit.prepared.integrity);
  }
  const items=edit.type==='replace-costume'?resources.costumes:resources.sounds,index=items.findIndex(item=>item.id===edit.descriptor?.id);
  if(index<0)items.push(structuredClone(edit.descriptor));else items[index]=structuredClone(edit.descriptor);
 }else if(['rename-costume','rename-sound','set-costume-center'].includes(edit.type)) {
  object(edit,edit.type==='set-costume-center'?['type','id','centerX','centerY']:['type','id','name']);
  const item=(edit.type==='rename-sound'?resources.sounds:resources.costumes).find(item=>item.id===edit.id);
  if(!item)fail('descriptor ausente');
  if(edit.type==='set-costume-center'){item.centerX=edit.centerX;item.centerY=edit.centerY;}else item.name=edit.name;
 }else fail('edición no soportada');
 // Source originals are never mutated or removed by media edits.
 return validateResources(resources);
}

// Explicit editable copy: bytes are shared by hash; descriptors remain separate
// from the preserved SB3 owner. The mapping is data for the IR copy transaction.
export async function copyResourceOwner(current,sourceOwner,targetOwner,{idPrefix,firstCostumeId}={}) {
 entry(current);id(sourceOwner);id(targetOwner);id(idPrefix);
 if(sourceOwner===targetOwner)fail('la copia requiere un propietario nuevo');
 const resources=structuredClone(current),mapping={costumes:{},sounds:{}};
 const sourceCostumes=resources.costumes.filter(item=>item.ownerId===sourceOwner);
 const sourceSounds=resources.sounds.filter(item=>item.ownerId===sourceOwner);
 if(!sourceCostumes.length)fail('propietario original ausente');
 for(const [kind,items]of [['costumes',sourceCostumes],['sounds',sourceSounds]]) {
  for(const [index,item]of items.entries()) {
   const nextId=kind==='costumes'&&index===0&&firstCostumeId?firstCostumeId:idPrefix+':'+(kind==='costumes'?'c':'s')+index;
   id(nextId);mapping[kind][item.id]=nextId;
   const collision=resources[kind].findIndex(other=>other.id===nextId);
   if(collision>=0&&resources[kind][collision].ownerId!==targetOwner)fail('ID de copia en conflicto');
   const copy={...item,id:nextId,ownerId:targetOwner};
   if(collision<0)resources[kind].push(copy);else resources[kind][collision]=copy;
  }
 }
 return {resources:await validateResources(resources),mapping};
}

// Policy2 is installed data; no archive-provided validators or target code.
export const resourcePolicy2='gg-resources-v2';
function qualifiedOwner(owner){object(owner,['contextId','documentId','targetId']);id(owner.contextId);id(owner.documentId);id(owner.targetId);return {...owner};}
function validateBindings(bindings,assets){
 list(bindings,resourceLimits.bindings);const seen=new Set();
 if(bindings.filter(b=>b?.role==='sprite.costume').length>32||bindings.filter(b=>b?.role==='sound.clip').length>16)fail('cuota de proyección Scratch');
 return bindings.map(binding=>{
  object(binding,['id','owner','role','assetId','name','properties']);id(binding.id);name(binding.name);sha(binding.assetId);qualifiedOwner(binding.owner);
  if(seen.has(binding.id))fail('binding duplicado');seen.add(binding.id);
  const roles={'sprite.costume':'Image','sound.clip':'Sound','mesh.geometry':'Model','web.image':'Image'};
  if(!Object.hasOwn(roles,binding.role)||assets.get(binding.assetId)?.type!==roles[binding.role])fail('rol/asset inválido');
  if(binding.role==='sprite.costume'){
   if(!['scratch-2d','scratch-compatibility'].includes(binding.owner.contextId))fail('contexto de disfraz inválido');
   object(binding.properties,['centerX','centerY','bitmapResolution']);
   if(![binding.properties.centerX,binding.properties.centerY].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=4096)||![1,2].includes(binding.properties.bitmapResolution))fail('centro/resolución inválidos');
  }else{
   object(binding.properties,[]);
   if(binding.role==='mesh.geometry'&&binding.owner.contextId!=='scene3d'||binding.role==='web.image'&&binding.owner.contextId!=='webapp')fail('rol fuera de contexto');
  }
  return structuredClone(binding);
 });
}
async function validateResources2Internal(input){
 object(input,['version','assets','integrity','bindings']);if(input.version!==2||!plain(input.assets)||!plain(input.integrity))fail('recursos2 inválidos');
 const ids=Object.keys(input.assets);if(ids.length>32||Object.keys(input.integrity).length!==ids.length||Object.keys(input.integrity).some(k=>!Object.hasOwn(input.assets,k)))fail('integridad/cuota assets');
 if(encoder.encode(JSON.stringify(input)).length>resourceLimits.bytes)fail('recursos demasiado grandes');
 const resources=structuredClone(input),assets=new Map();let sources=0,pixels=0;
 for(const assetId of ids){
  sha(assetId);const asset=resources.assets[assetId],integrity=resources.integrity[assetId];object(integrity,['bytes','sha256']);const bytes=decodeResourceAsset(asset),media=await inspect(bytes,asset.type,asset.format);
  if(media.bytes&&encodeResourceBytes(media.bytes)!==asset.data||!Number.isSafeInteger(integrity.bytes)||integrity.bytes!==bytes.length||integrity.sha256!==assetId||await digest(bytes)!==assetId)fail('hash/tamaño/canonicalidad inválidos');
  if(asset.type==='Source'&&++sources>resourceLimits.sources)fail('cuota originales');
  const metadata={id:assetId,type:asset.type,format:asset.format,bytes:bytes.length};
  if(asset.type==='Image'){metadata.width=media.width;metadata.height=media.height;pixels+=media.width*media.height;}
  if(asset.type==='Model'){metadata.model=media.model;pixels+=media.model.imagePixels;}
  if(pixels>resourceLimits.pixels)fail('cuota agregada píxeles');
  assets.set(assetId,metadata);
 }
 const view={version:2,assets:[...assets.values()],bindings:validateBindings(resources.bindings,assets)};
 return remember(resources,view);
}
export async function validateResources2(input){return validateResources2Internal(input);}
export function validateResourceView2(view){
 object(view,['version','assets','bindings']);if(view.version!==2)fail('versión de vista');list(view.assets,32);const assets=new Map();let pixels=0,sources=0;
 for(const item of view.assets){
  object(item,['id','type','format','bytes'],['width','height','model']);sha(item.id);
  if(assets.has(item.id)||!['Image/svg','Image/png','Sound/wav','Source/sb3','Model/glb'].includes(item.type+'/'+item.format)||!Number.isSafeInteger(item.bytes)||item.bytes<1||item.bytes>(item.type==='Source'?resourceLimits.sourceBytes:item.type==='Model'?resourceLimits.modelBytes:resourceLimits.mediaBytes))fail('metadata asset inválida');
  if(item.type==='Image'){if(![item.width,item.height].every(v=>Number.isSafeInteger(v)&&v>0&&v<=1024)||item.width*item.height>1048576||Object.hasOwn(item,'model'))fail('metadata imagen inválida');}
  else if(Object.hasOwn(item,'width')||Object.hasOwn(item,'height'))fail('dimensiones ajenas');
  if(item.type==='Model'){object(item.model,['nodes','primitives','vertices','indices','images','imagePixels']);for(const [key,max]of Object.entries({nodes:32,primitives:64,vertices:20000,indices:60000,images:8,imagePixels:4194304}))if(!Number.isSafeInteger(item.model[key])||item.model[key]<0||item.model[key]>max)fail('metadata GLB inválida');}
  else if(Object.hasOwn(item,'model'))fail('metadata modelo ajena');
  if(item.type==='Image')pixels+=item.width*item.height;if(item.type==='Model')pixels+=item.model.imagePixels;if(item.type==='Source'&&++sources>4||pixels>4194304)fail('cuota de metadata');
  assets.set(item.id,item);
 }
 validateBindings(view.bindings,assets);return structuredClone(view);
}
export function getResourceBinding(view,bindingId,{contextId,documentId,targetId,role}={}){
 view=validateResourceView2(view);return view.bindings.find(item=>item.id===bindingId&&(!contextId||item.owner.contextId===contextId)&&(!documentId||item.owner.documentId===documentId)&&(!targetId||item.owner.targetId===targetId)&&(!role||item.role===role))??null;
}
function ownerFromLegacy(ownerId){
 const match=/^sb3:([a-f0-9]{64}):t[0-9]+$/.exec(ownerId);
 return {contextId:match?'scratch-compatibility':'scratch-2d',documentId:match?match[1]:'scene-main',targetId:ownerId};
}
export async function promoteResources2(input){
 entry(input);if(input.version===2)return cloneValidatedResources(input);if(input.version!==1)fail('promueve legacy a política1 primero');
 const resources={version:2,assets:structuredClone(input.assets),integrity:structuredClone(input.integrity),bindings:[]};
 for(const item of input.costumes)resources.bindings.push({id:item.id,owner:ownerFromLegacy(item.ownerId),role:'sprite.costume',assetId:item.assetId,name:item.name,properties:{centerX:item.centerX,centerY:item.centerY,bitmapResolution:item.bitmapResolution}});
 for(const item of input.sounds)resources.bindings.push({id:item.id,owner:ownerFromLegacy(item.ownerId),role:'sound.clip',assetId:item.assetId,name:item.name,properties:{}});
 return validateResources2Internal(resources);
}
export function projectContextResources(input,{contextId='scratch-2d',documentId}={}){
 const saved=entry(input);if(input.version!==2)return cloneValidatedResources(input);
 if(contextId!=='scratch-2d'&&contextId!=='scratch-compatibility')fail('proyección1 sólo Scratch');
 const bindings=input.bindings.filter(b=>['sprite.costume','sound.clip'].includes(b.role)&&(contextId==='scratch-2d'?['scratch-2d','scratch-compatibility'].includes(b.owner.contextId):b.owner.contextId===contextId)&&(!documentId||b.owner.documentId===documentId));
 const ids=new Set(bindings.map(b=>b.assetId));for(const [id,asset]of Object.entries(input.assets))if(asset.type==='Source')ids.add(id);
 const resources={version:1,assets:{},integrity:{},costumes:[],sounds:[]};
 for(const assetId of Object.keys(input.assets))if(ids.has(assetId)){resources.assets[assetId]=structuredClone(input.assets[assetId]);resources.integrity[assetId]=structuredClone(input.integrity[assetId]);}
 for(const b of bindings)if(b.role==='sprite.costume')resources.costumes.push({id:b.id,ownerId:b.owner.targetId,name:b.name,assetId:b.assetId,...structuredClone(b.properties)});
 else resources.sounds.push({id:b.id,ownerId:b.owner.targetId,name:b.name,assetId:b.assetId});
 const view={version:1,assets:saved.view.assets.filter(a=>ids.has(a.id)).map(a=>structuredClone(a)),costumes:structuredClone(resources.costumes),sounds:structuredClone(resources.sounds)};
 validateResourceView(view);return remember(resources,view);
}
export async function mergeContextResources(full,edited,{contextId='scratch-2d'}={}){
 entry(full);entry(edited);if(full.version!==2){if(edited.version!==1)fail('proyección inválida');return cloneValidatedResources(edited);}
 if(contextId!=='scratch-2d'||edited.version!==1)fail('merge sólo proyección Scratch1');
 const next=structuredClone(full),promoted=await promoteResources2(edited);
 const incoming=new Map(promoted.bindings.map(b=>[b.id,b])),replaced=new Set();
 next.bindings=next.bindings.flatMap(binding=>{
  if(!['scratch-2d','scratch-compatibility'].includes(binding.owner.contextId)||!['sprite.costume','sound.clip'].includes(binding.role))return[binding];
  const replacement=incoming.get(binding.id);if(!replacement)return[];replaced.add(binding.id);return[replacement];
 });
 for(const binding of promoted.bindings)if(!replaced.has(binding.id))next.bindings.push(binding);
 for(const [assetId,asset]of Object.entries(edited.assets)){if(Object.hasOwn(next.assets,assetId)&&canonical(next.assets[assetId])!==canonical(asset))fail('collision asset');next.assets[assetId]=structuredClone(asset);next.integrity[assetId]=structuredClone(edited.integrity[assetId]);}
 return validateResources2Internal(next);
}
