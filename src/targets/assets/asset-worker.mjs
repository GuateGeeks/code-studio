import {inspectGlb} from '../../contracts/media-glb.mjs';
import {Inflate} from '/vendor/pako.bundle.mjs';
import {createBoundedInflaters} from './bounded-inflate.mjs';
import {readSb3Archive,sb3ArchiveLimits} from '../../contracts/sb3-archive.mjs';
import {sanitizeSvg} from '../../contracts/media-svg.mjs';
import {sanitizePngContainer} from '../../contracts/media-png.mjs';
import {inspectWavPcm16,editWavPcm16} from '../../contracts/media-wav.mjs';
import {validateCrop} from '../../contracts/image-edits.mjs';
import {validatePackJSON} from '../../contracts/pack-config-schema.mjs';
import {prepareAsset,validateResources,createResourceView,decodeResourceAsset} from '../../contracts/resources.mjs';
import {buildSb3ResourceDescriptors,inspectSb3Project} from '../../contracts/sb3-program.mjs';
const {inflateRaw,inflateZlib}=createBoundedInflaters(Inflate);
const fail=message=>{throw new Error('GG assets: '+message);};
const bytesOf=value=>value instanceof Uint8Array?value:value instanceof ArrayBuffer?new Uint8Array(value):fail('bytes ausentes');
function record(value,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||
    fields.some(key=>!Object.hasOwn(value,key)))fail('petición inválida');
}
async function png(bytes,{crop}={}) {
  const info=sanitizePngContainer(bytes);let count=0;
  await inflateZlib(info.idat,{maxOutputBytes:info.expectedInflatedBytes,onData:chunk=>{
    for(let index=0;index<chunk.length;index++)if((count+index)%(info.rowBytes+1)===0&&chunk[index]>4)fail('filtro PNG inválido');
    count+=chunk.length;
  }});
  if(count!==info.expectedInflatedBytes)fail('salida PNG incompleta');
  const bitmap=await createImageBitmap(new Blob([info.bytes],{type:'image/png'}));
  try {
    if(bitmap.width!==info.width||bitmap.height!==info.height)fail('dimensiones PNG no coinciden');
    const rect=crop?validateCrop(info,crop):{x:0,y:0,width:info.width,height:info.height};
    const canvas=new OffscreenCanvas(rect.width,rect.height),context=canvas.getContext('2d');
    if(!context)fail('no se pudo preparar la imagen');
    context.drawImage(bitmap,rect.x,rect.y,rect.width,rect.height,0,0,rect.width,rect.height);
    const encoded=new Uint8Array(await (await canvas.convertToBlob({type:'image/png'})).arrayBuffer());
    const normalized=sanitizePngContainer(encoded);
    const prepared=await prepareAsset(normalized.bytes,{type:'Image',format:'png'});
    return {...prepared,width:rect.width,height:rect.height,...(crop?{crop:rect}:{})};
  }finally{bitmap.close();}
}
async function media(bytes,{type,format}) {
  bytes=bytesOf(bytes);
  if(type==='Model'&&format==='glb'){const model=inspectGlb(bytes);for(const image of model.images)await png(image.bytes);return {...await prepareAsset(bytes,{type,format}),model:model.metadata};}
  if(type==='Image'&&format==='png')return png(bytes);
  if(type==='Image'&&format==='svg') {
    const safe=sanitizeSvg(bytes);return {...await prepareAsset(safe.bytes,{type,format}),width:safe.width,height:safe.height};
  }
  if(type==='Sound'&&format==='wav') {
    const edited=editWavPcm16(bytes);
    return {...await prepareAsset(edited.bytes,{type,format}),audio:inspectWavPcm16(edited.bytes)};
  }
  fail('formato de medio no soportado');
}
async function projectInArchive(bytes) {
  const entries=await readSb3Archive(bytes,{inflateRaw});
  const json=entries.get('project.json');
  if(!json||json.length>sb3ArchiveLimits.projectBytes)fail('project.json ausente o demasiado grande');
  let project;try{project=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(json));}catch{fail('project.json inválido');}
  validatePackJSON(project,{maxDepth:32,maxBytes:sb3ArchiveLimits.projectBytes});
  if(!Array.isArray(project.targets)||project.targets.length<1||project.targets.length>9)fail('targets inválidos');
  return {entries,project};
}
function sourceMediaCoverage(project,entries,sourceAssetId) {
  const issues=[];
  for(const [index,target]of project.targets.entries())for(const [kind,type]of [['costumes','Image'],['sounds','Sound']]) {
    if(!Array.isArray(target?.[kind]??[]))fail('lista de medios inválida');
    for(const item of target[kind]??[]) {
      if(!item||typeof item!=='object'||typeof item.dataFormat!=='string')fail('descriptor de medio inválido');
      const path=item.md5ext??(item.assetId+'.'+item.dataFormat),format=item.dataFormat.toLowerCase();
      if(typeof path!=='string'||!entries.has(path))fail('recurso ausente: '+String(path).slice(0,128));
      if(!((type==='Image'&&['svg','png'].includes(format))||(type==='Sound'&&format==='wav')))issues.push({targetId:'sb3:'+sourceAssetId+':t'+index,blockId:null,opcode:'asset:'+format.slice(0,16),status:'unsupported',reason:'Formato de recurso no habilitado'});
    }
  }
  return issues;
}
async function importSb3(payload) {
  record(payload,['bytes','resources']);
  const bytes=bytesOf(payload.bytes);
  if(bytes.length>sb3ArchiveLimits.bytes)fail('SB3 excede256KiB');
  const resources=await validateResources(payload.resources);
  const {entries,project}=await projectInArchive(bytes);
  const original=await prepareAsset(bytes,{type:'Source',format:'sb3'});
  const assetMap={},prepared=new Map(),issues=[];
  for(let targetIndex=0;targetIndex<project.targets.length;targetIndex++) {
    const target=project.targets[targetIndex];
    for(const [kind,type] of [['costumes','Image'],['sounds','Sound']]) {
      if(!Array.isArray(target?.[kind]??[]))fail('lista de medios inválida');
      for(const item of target[kind]??[]) {
        if(!item||typeof item!=='object'||typeof item.dataFormat!=='string')fail('descriptor de medio inválido');
        const path=item.md5ext??(item.assetId+'.'+item.dataFormat),format=item.dataFormat.toLowerCase();
        if(typeof path!=='string'||!entries.has(path))fail('recurso ausente: '+String(path).slice(0,128));
        if(!((type==='Image'&&['svg','png'].includes(format))||(type==='Sound'&&format==='wav'))) {
          issues.push({targetId:'sb3:'+original.id+':t'+targetIndex,blockId:null,opcode:'asset:'+format.slice(0,16),status:'unsupported',reason:'Formato de recurso no habilitado'});
          continue;
        }
        if(!assetMap[path]) {
          const asset=await media(entries.get(path),{type,format});
          assetMap[path]={assetId:asset.id,type,format};prepared.set(asset.id,asset);
        }
      }
    }
  }
  const next=structuredClone(resources);
  next.assets[original.id]=original.asset;next.integrity[original.id]=original.integrity;
  for(const asset of prepared.values()){next.assets[asset.id]=asset.asset;next.integrity[asset.id]=asset.integrity;}
  let report;
  if(issues.length)report={status:'unsupported',coverage:issues.slice(0,100),candidate:null,editable:null};
  else {
    const descriptors=buildSb3ResourceDescriptors(project,{sourceAssetId:original.id,assetMap});
    const owners=new Set(descriptors.costumes.concat(descriptors.sounds).map(item=>item.ownerId));
    next.costumes=next.costumes.filter(item=>!owners.has(item.ownerId)).concat(descriptors.costumes);
    next.sounds=next.sounds.filter(item=>!owners.has(item.ownerId)).concat(descriptors.sounds);
    const validated=await validateResources(next);
    report=inspectSb3Project(project,{sourceAssetId:original.id,assetMap,resourceView:createResourceView(validated)});
  }
  return {sourceAssetId:original.id,resources:await validateResources(next),report};
}
async function deriveSb3(payload) {
  record(payload,['sourceAssetId','resources']);
  const resources=await validateResources(payload.resources);
  const original=resources.assets[payload.sourceAssetId];
  if(original?.type!=='Source'||original.format!=='sb3')fail('original SB3 no disponible');
  const {project,entries}=await projectInArchive(decodeResourceAsset(original));
  const issues=sourceMediaCoverage(project,entries,payload.sourceAssetId);
  if(issues.length)return {sourceAssetId:payload.sourceAssetId,report:{status:'unsupported',coverage:issues.slice(0,100),candidate:null,editable:null}};
  const report=inspectSb3Project(project,{sourceAssetId:payload.sourceAssetId,resourceView:createResourceView(resources)});
  return {sourceAssetId:payload.sourceAssetId,report};
}
async function validateDecodedResources(payload) {
  record(payload,['resources']);const resources=await validateResources(payload.resources,{policy:payload.resources?.version===2?'gg-resources-v2':'gg-resources-v1'});
  for(const [id,asset]of Object.entries(resources.assets))if(asset.type==='Source'&&asset.format==='sb3') {
    const {project,entries}=await projectInArchive(decodeResourceAsset(asset));sourceMediaCoverage(project,entries,id);
  }
  for(const asset of Object.values(resources.assets))if(asset.type==='Model'&&asset.format==='glb'){const model=inspectGlb(decodeResourceAsset(asset));for(const image of model.images)await png(image.bytes);}
  for(const asset of Object.values(resources.assets))if(asset.type==='Image'&&asset.format==='png') {
    const info=sanitizePngContainer(decodeResourceAsset(asset));let count=0;
    await inflateZlib(info.idat,{maxOutputBytes:info.expectedInflatedBytes,onData:chunk=>{
      for(let i=0;i<chunk.length;i++)if((count+i)%(info.rowBytes+1)===0&&chunk[i]>4)fail('filtro PNG inválido');count+=chunk.length;
    }});
    if(count!==info.expectedInflatedBytes)fail('salida PNG incompleta');
    const bitmap=await createImageBitmap(new Blob([info.bytes],{type:'image/png'}));
    try{if(bitmap.width!==info.width||bitmap.height!==info.height)fail('dimensiones PNG no coinciden');}finally{bitmap.close();}
  }
  return {validated:true};
}
async function handle(command,payload) {
  if(command==='validate-resources')return validateDecodedResources(payload);
  if(command==='import-sb3')return importSb3(payload);
  if(command==='derive-sb3')return deriveSb3(payload);
  if(command==='prepare-media'){record(payload,['bytes','type','format']);return media(payload.bytes,payload);}
  if(command==='crop-png'){record(payload,['bytes','crop']);return png(bytesOf(payload.bytes),{crop:payload.crop});}
  if(command==='edit-wav') {
    record(payload,['bytes','options']);const edited=editWavPcm16(bytesOf(payload.bytes),payload.options);
    return {...await prepareAsset(edited.bytes,{type:'Sound',format:'wav'}),audio:inspectWavPcm16(edited.bytes),clippedFrames:edited.clippedFrames};
  }
  fail('operación no soportada');
}
let used=false;
self.onmessage=async event=>{
  const data=event.data;
  try {
    if(used||!data||data.version!==1||!Number.isSafeInteger(data.id)||data.id<1)fail('canal inválido');
    record(data,['version','id','command','payload']);used=true;
    const result=await handle(data.command,data.payload);
    self.postMessage({version:1,id:data.id,result});
  }catch(error){self.postMessage({version:1,id:data?.id,error:String(error.message??error).slice(0,1024)});}
};
