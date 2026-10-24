import {resolveOperationProfile,validateCapabilityOperation} from './operations.mjs';
import {validateProgramIR1} from './program-ir1.mjs';

export const capabilityLanguageLimits=Object.freeze({handlers:16,invocations:64,eventBytes:8192,bytes:16384,id:128});
const fail=message=>{throw new Error('GG API2: '+message);};
export function capabilityRecord(value,required,optional=[]){
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value))||
  required.some(key=>!Object.hasOwn(value,key))||Object.keys(value).some(key=>![...required,...optional].includes(key)))fail('propiedades no válidas');
 for(const key of Object.keys(value))if(!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value'))fail('accesor no permitido');
}
export function capabilityId(value){if(typeof value!=='string'||!value.trim()||value.length>128||['__proto__','prototype','constructor'].includes(value))fail('ID no válido');return value;}
export function cloneCapabilityJSON(value,{maximum=capabilityLanguageLimits.bytes}={}){
 let nodes=0;const ancestors=new Set();
 function visit(item,depth){
  if(++nodes>4096||depth>16)fail('datos demasiado profundos');
  if(item===null||typeof item==='boolean'||typeof item==='string')return;
  if(typeof item==='number'){if(!Number.isFinite(item))fail('número no finito');return;}
  if(typeof item!=='object'||ancestors.has(item)||(!Array.isArray(item)&&![Object.prototype,null].includes(Object.getPrototypeOf(item))))fail('datos JSON requeridos');
  ancestors.add(item);
  if(Array.isArray(item)&&(Object.keys(item).length!==item.length||Array.from({length:item.length},(_,i)=>i).some(i=>!Object.hasOwn(item,i))))fail('lista dispersa');
  for(const key of Object.keys(item)){
   if(['__proto__','prototype','constructor'].includes(key)||!Object.hasOwn(Object.getOwnPropertyDescriptor(item,key),'value'))fail('clave/accesor no permitido');
   visit(item[key],depth+1);
  }
  ancestors.delete(item);
 }
 visit(value,0);
 if(new TextEncoder().encode(JSON.stringify(value)).length>maximum)fail('cupo de datos excedido');
 return structuredClone(value);
}
export function resolveLanguageProfile(value){
 capabilityRecord(value,['profileId','contextId','documentId']);
 for(const key of ['profileId','contextId','documentId'])capabilityId(value[key]);
 const profile=resolveOperationProfile({contextId:value.contextId,documentId:value.documentId});
 if(profile.profileId!==value.profileId)fail('perfil no instalado');
 return profile;
}
export function languageProfileMetadata(profile){return {profileId:profile.profileId,contextId:profile.contextId,documentId:profile.documentId};}
export function validateCapabilityConfiguration(value,profile){
 capabilityRecord(value,['contextId','documentId'],['variables']);
 if(value.contextId!==profile.contextId||value.documentId!==profile.documentId)fail('contexto/documento sustituido');
 const variables=value.variables??[];
 validateProgramIR1({version:1,contextId:profile.contextId,documentId:profile.documentId,variables,scripts:[]},{profile});
 return cloneCapabilityJSON({contextId:value.contextId,documentId:value.documentId,variables});
}
export function validateCapabilityHandler(value,profile,{withId=true}={}){
 capabilityRecord(value,[...(withId?['id']:[]),'event','targetId'],['key']);
 if(withId)capabilityId(value.id);
 if(!profile.events.some(event=>event.id===value.event))fail('evento no instalado');
 if(value.targetId!==null)capabilityId(value.targetId);
 if(value.event==='start'&&value.targetId!==null||!['start','key'].includes(value.event)&&value.targetId===null)fail('target de evento no válido');
 if(value.event==='key'){
  if(typeof value.key!=='string'||!value.key.length||value.key.length>32||/[\u0000-\u001f\u007f]/.test(value.key))fail('tecla no soportada');
 }else if(Object.hasOwn(value,'key'))fail('tecla fuera de evento');
 return cloneCapabilityJSON(value);
}
export function validateCapabilityActivation(value,profile){
 capabilityRecord(value,['contextId','documentId','variables','handlers']);
 const config=validateCapabilityConfiguration({contextId:value.contextId,documentId:value.documentId,variables:value.variables},profile);
 if(!Array.isArray(value.handlers)||value.handlers.length>capabilityLanguageLimits.handlers)fail('cupo de handlers excedido');
 cloneCapabilityJSON(value);
 const ids=new Set(),handlers=value.handlers.map(item=>{const handler=validateCapabilityHandler(item,profile);if(ids.has(handler.id))fail('handler duplicado');ids.add(handler.id);return handler;});
 return {...config,handlers};
}
export function validateCapabilityInvocation(value,profile){
 capabilityRecord(value,['version','invocationId','handlerId','targetId','revision','event']);
 if(value.version!==2)fail('versión de invocación no soportada');
 for(const key of ['invocationId','handlerId'])capabilityId(value[key]);
 if(value.targetId!==null)capabilityId(value.targetId);
 if(!Number.isSafeInteger(value.revision)||value.revision<0)fail('revisión no válida');
 const payloadFields={start:[],click:[],key:['key'],input:['value'],submit:['values']};
 if(!value.event||!Object.hasOwn(payloadFields,value.event.type)||!profile.events.some(event=>event.id===value.event.type))fail('tipo de evento no instalado');
 capabilityRecord(value.event,['type','targetId',...payloadFields[value.event.type]]);
 if(value.event.targetId!==value.targetId)fail('target de evento sustituido');
 if(value.event.type==='start'&&value.targetId!==null||!['start','key'].includes(value.event.type)&&value.targetId===null)fail('target de evento no válido');
 if(value.event.value!==undefined&&(typeof value.event.value!=='string'||new TextEncoder().encode(value.event.value).length>1024))fail('valor de evento no válido');
 if(value.event.key!==undefined&&(typeof value.event.key!=='string'||!value.event.key.length||value.event.key.length>32))fail('tecla de evento no válida');
 if(value.event.values!==undefined){
  capabilityRecord(value.event.values,[],Object.keys(value.event.values));
  if(Object.keys(value.event.values).length>64)fail('demasiados campos de formulario');
  for(const [key,item]of Object.entries(value.event.values)){capabilityId(key);if(typeof item!=='string'||new TextEncoder().encode(item).length>1024)fail('valor de formulario no válido');}
 }
 cloneCapabilityJSON(value.event,{maximum:capabilityLanguageLimits.eventBytes});
 return cloneCapabilityJSON(value);
}
export function validateCapabilityRPC(method,args,profile){
 if(!Array.isArray(args))fail('lista de argumentos requerida');
 cloneCapabilityJSON(args);
 if(method==='context.activate'){
  if(args.length!==1)fail('aridad no válida');
  return {method,args:[validateCapabilityActivation(args[0],profile)]};
 }
 if(method==='context.call'){
  if(args.length!==3)fail('aridad no válida');capabilityId(args[0]);
  const call=validateCapabilityOperation(profile,args[1],args[2]);
  return {method,args:[args[0],call.operationId,call.args]};
 }
 if(method==='context.global'){
  if(args.length!==2)fail('aridad no válida');
  const call=validateCapabilityOperation(profile,args[0],args[1]);
  return {method,args:[call.operationId,call.args]};
 }
 fail('operación API2 no soportada');
}
