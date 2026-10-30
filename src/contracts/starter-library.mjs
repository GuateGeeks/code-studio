import {applyResourceEdit,cloneValidatedResources,decodeResourceAsset,resourceLimits} from './resources.mjs';
import {svgLimits} from './media-svg.mjs';
import {wavLimits} from './media-wav.mjs';

// The starter library is inert installed data: a closed index with canonical
// media bytes. Adding an entry produces ordinary gg-resources-v1 edits; the
// library grants no permission and is never needed to reopen a project.
export const starterLibraryFormat='gg-starter-library';
export const starterLibraryLimits=Object.freeze({bundleBytes:4*1024*1024,entries:64,id:48,name:40});
export const starterLibraryKinds=Object.freeze(['costume','backdrop','sound']);
const fail=message=>{throw new Error('Biblioteca: '+message);};
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
function exact(value,required,optional=[],label='objeto'){
 if(!plain(value))fail(label+' inválido');
 const keys=Object.keys(value);
 if(required.some(key=>!Object.hasOwn(value,key))||keys.some(key=>!required.includes(key)&&!optional.includes(key)))fail(label+' con propiedades no permitidas o ausentes');
 for(const key of keys)if(!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))fail(label+' con accessor');
}
const text=(value,max,label)=>{if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001f\u007f<>]/.test(value))fail(label+' inválido');return value;};
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)fail(label+' fuera de límites');return value;};
async function sha256(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),value=>value.toString(16).padStart(2,'0')).join('');}

export function validateStarterLibrary(input){
 exact(input,['format','schemaVersion','version','license','licenseUrl','attribution','entries'],[],'índice');
 if(input.format!==starterLibraryFormat||input.schemaVersion!==1)fail('formato o versión no soportados');
 if(!/^\d+\.\d+\.\d+$/.test(input.version))fail('versión inválida');
 if(input.license!=='CC0-1.0'||input.licenseUrl!=='https://creativecommons.org/publicdomain/zero/1.0/')fail('licencia no reconocida');
 text(input.attribution,512,'atribución');
 if(!Array.isArray(input.entries)||!input.entries.length||input.entries.length>starterLibraryLimits.entries||Object.keys(input.entries).length!==input.entries.length)fail('lista de entradas inválida');
 const ids=new Set(),hashes=new Set(),entries=input.entries.map(entry=>{
  const sound=entry?.kind==='sound';
  exact(entry,sound?['id','kind','name','format','bytes','sha256','sampleRate','frames','data']:['id','kind','name','format','bytes','sha256','width','height','centerX','centerY','data'],sound?[]:['category'],'entrada');
  if(typeof entry.id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)||entry.id.length>starterLibraryLimits.id||ids.has(entry.id))fail('ID de entrada inválido o duplicado');ids.add(entry.id);
  if(!starterLibraryKinds.includes(entry.kind))fail('tipo de entrada no soportado');
  text(entry.name,starterLibraryLimits.name,'nombre');
  if(typeof entry.sha256!=='string'||!/^[a-f0-9]{64}$/.test(entry.sha256)||hashes.has(entry.sha256))fail('SHA-256 inválido o repetido');hashes.add(entry.sha256);
  if(entry.format!==(sound?'wav':'svg'))fail('formato no admitido para '+entry.id);
  integer(entry.bytes,44,sound?wavLimits.bytes:svgLimits.bytes,'tamaño');
  if(typeof entry.data!=='string'||entry.data.length!==Math.ceil(entry.bytes/3)*4)fail('datos inconsistentes con el tamaño');
  if(sound){integer(entry.sampleRate,wavLimits.minimumRate,wavLimits.maximumRate,'frecuencia');integer(entry.frames,1,entry.sampleRate*wavLimits.seconds,'duración');}
  else{
   integer(entry.width,1,1024,'ancho');integer(entry.height,1,1024,'alto');
   if(entry.kind==='backdrop'&&(entry.width!==480||entry.height!==360))fail('un fondo mide 480×360');
   if(entry.centerX!==entry.width/2||entry.centerY!==entry.height/2)fail('centro inválido');
   if(entry.kind==='costume'?!['personaje','objeto'].includes(entry.category):Object.hasOwn(entry,'category'))fail('categoría inválida');
  }
  return Object.freeze({...entry});
 });
 return Object.freeze({version:input.version,license:input.license,licenseUrl:input.licenseUrl,attribution:input.attribution,entries:Object.freeze(entries)});
}

// Bytes are checked against the declared hash before any media contract runs.
export async function decodeStarterLibraryEntry(entry){
 const bytes=decodeResourceAsset({type:entry.kind==='sound'?'Sound':'Image',format:entry.format,encoding:'base64',data:entry.data});
 if(bytes.length!==entry.bytes||await sha256(bytes)!==entry.sha256)fail('«'+entry.name+'» no coincide con su SHA-256');
 return bytes;
}
export const starterLibraryMedia=entry=>({type:entry.kind==='sound'?'Sound':'Image',format:entry.format});

function descriptorId(resources,base){
 const used=new Set([...resources.costumes,...resources.sounds].map(item=>item.id));
 for(let index=1;index<=99;index++){const id=index===1?base:base+'-'+index;if(!used.has(id))return id;}
 fail('demasiadas copias de «'+base+'»');
}
function checkPrepared(entry,prepared){
 exact(prepared,['id','asset','integrity'],['width','height','crop','audio','clippedFrames'],'medio preparado');
 if(prepared.id!==entry.sha256)fail('«'+entry.name+'» cambió al validarse; la biblioteca no es canónica');
}
function friendly(error){
 if(/cuota|demasiado grandes|integridad o cuota/.test(error.message))return new Error('Tu proyecto alcanzó el límite de recursos ('+resourceLimits.assets+' medios o '+Math.round(resourceLimits.bytes/1048576)+' MiB). Reemplaza un recurso existente antes de añadir otro.',{cause:error});
 return error;
}
async function edit(resources,change){try{return await applyResourceEdit(resources,change);}catch(error){throw friendly(error);}}
export const starterOwners=Object.freeze({sprite:'hero',stage:'stage'});

// resources: validated gg-resources-v1 projection; prepared: output of the
// installed media preparation (prepareAsset) for the entry's bytes. ownerId:
// the object that receives a costume or a sound (hero by default); a backdrop
// is always the stage's.
export async function applyStarterLibraryEntry(resources,entry,prepared,{ownerId=starterOwners.sprite}={}){
 checkPrepared(entry,prepared);
 if(resources?.version!==1)fail('se requiere la proyección de recursos 2D');
 if(entry.kind==='backdrop'){
  const stage=resources.costumes.find(item=>item.ownerId===starterOwners.stage);
  if(stage?.assetId===prepared.id)return {resources:cloneValidatedResources(resources),status:'present',descriptorId:stage.id};
  const descriptor={id:stage?.id??descriptorId(resources,'fondo'),ownerId:starterOwners.stage,name:entry.name,assetId:prepared.id,centerX:entry.centerX,centerY:entry.centerY,bitmapResolution:1};
  return {resources:await edit(resources,{type:'replace-costume',descriptor,prepared:{id:prepared.id,asset:prepared.asset,integrity:prepared.integrity}}),status:'backdrop',descriptorId:descriptor.id};
 }
 const sound=entry.kind==='sound',items=sound?resources.sounds:resources.costumes;
 const existing=items.find(item=>item.ownerId===ownerId&&item.assetId===prepared.id);
 if(existing)return {resources:cloneValidatedResources(resources),status:'present',descriptorId:existing.id};
 const limit=sound?resourceLimits.sounds:resourceLimits.costumes;
 if(items.length>=limit)fail('tu proyecto ya tiene '+limit+(sound?' sonidos':' disfraces')+', el máximo. Reemplaza uno existente antes de añadir otro.');
 if(!Object.hasOwn(resources.assets,prepared.id)&&Object.keys(resources.assets).length>=resourceLimits.assets)throw friendly(new Error('cuota'));
 const descriptor={id:descriptorId(resources,entry.id),ownerId,name:entry.name,assetId:prepared.id,
  ...(sound?{}:{centerX:entry.centerX,centerY:entry.centerY,bitmapResolution:1})};
 return {resources:await edit(resources,{type:sound?'replace-sound':'replace-costume',descriptor,prepared:{id:prepared.id,asset:prepared.asset,integrity:prepared.integrity}}),status:'added',descriptorId:descriptor.id};
}

// The initial backdrop comes from the project's own build catalog, not from
// the library: it keeps its existing provenance.
export async function restoreInitialBackdrop(resources,catalogResources){
 if(resources?.version!==1||catalogResources?.version!==1)fail('se requieren recursos 2D validados');
 const initial=catalogResources.costumes.find(item=>item.ownerId===starterOwners.stage);
 if(!initial)fail('el catálogo no tiene fondo inicial');
 const stage=resources.costumes.find(item=>item.ownerId===starterOwners.stage);
 if(stage?.assetId===initial.assetId&&stage.centerX===initial.centerX&&stage.centerY===initial.centerY)return {resources:cloneValidatedResources(resources),status:'present',descriptorId:stage.id};
 const descriptor={...initial,id:stage?.id??initial.id};
 return {resources:await edit(resources,{type:'replace-costume',descriptor,prepared:{id:initial.assetId,asset:structuredClone(catalogResources.assets[initial.assetId]),integrity:structuredClone(catalogResources.integrity[initial.assetId])}}),status:'restored',descriptorId:descriptor.id};
}
export function stageBackdropAssetId(view){return view?.costumes?.find(item=>item.ownerId===starterOwners.stage)?.assetId??null;}
