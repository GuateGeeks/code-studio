import {fields,identifier,freeze,validateSchema,fail} from './capability-data.mjs';
const number=(minimum=-1e6,maximum=1e6)=>({type:'number',minimum,maximum});
const text={type:'string',maxLength:1024},id={type:'string',minLength:1,maxLength:128,pattern:'^[-A-Za-z0-9:_]+$'};
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const vector=obj({x:number(),y:number(),z:number()});
const transform=obj({position:vector,rotationDegrees:vector,scale:obj({x:number(.001,1000),y:number(.001,1000),z:number(.001,1000)})},[]);
const color={type:'string',pattern:'^#[a-fA-F0-9]{6}$',maxLength:7};
function op(contextId,name,argsSchema,result='void',mutates=true){return {id:contextId+'.'+name,publicPath:[contextId==='webapp'?'web':contextId,name],parameters:Object.entries(argsSchema.properties).map(([name,type])=>({name,type,optional:!argsSchema.required.includes(name)})),argsSchema,result,mutates,targetParameter:Object.hasOwn(argsSchema.properties,'targetId')?'targetId':null,contexts:[contextId]};}
export const operationDescriptors=freeze([
 op('scene3d','getEntity',obj({targetId:id}),'json',false),
 op('scene3d','move',obj({targetId:id,delta:vector})),
 op('scene3d','setTransform',obj({targetId:id,transform})),
 op('scene3d','setParent',obj({targetId:id,parentId:{anyOf:[id,{type:'null'}]}})),
 op('scene3d','setCamera',obj({alpha:number(-36000,36000),beta:number(.01,179.99),radius:number(.1,10000),target:vector})),
 op('scene3d','setLight',obj({targetId:id,intensity:number(0,10),diffuse:color})),
 op('scene3d','snapshot',obj({}),'json',false),
 op('webapp','getValue',obj({targetId:id}),'string',false),
 op('webapp','setText',obj({targetId:id,text})),
 op('webapp','setValue',obj({targetId:id,value:text})),
 op('webapp','appendItem',obj({targetId:id,text})),
 op('webapp','clearItems',obj({targetId:id})),
 op('webapp','setVisible',obj({targetId:id,visible:{type:'boolean'}})),
 op('webapp','snapshot',obj({}),'json',false)
]);
export const operationPermissionGrants=freeze({'gg.3d-basic':['scene3d.getEntity','scene3d.move','scene3d.setCamera','scene3d.snapshot'],'gg.3d-advanced':['scene3d.setTransform','scene3d.setParent','scene3d.setLight'],'gg.webapps':['webapp.getValue','webapp.setText','webapp.setValue','webapp.appendItem','webapp.clearItems','webapp.setVisible','webapp.snapshot']});
export const contextDescriptors=freeze([
 {id:'scene3d',profileId:'gg-scene3d-v1',packIds:['gg.3d-basic','gg.3d-advanced'],events:[{id:'start'},{id:'click'},{id:'key'}]},
 {id:'webapp',profileId:'gg-webapp-v1',packIds:['gg.webapps'],events:[{id:'start'},{id:'click'},{id:'input'},{id:'submit'},{id:'key'}]}
]);
export function resolveOperationProfile({contextId,documentId,capabilities}={}) {
 const context=contextDescriptors.find(item=>item.id===contextId);if(!context)fail('contexto no instalado');identifier(documentId);
 if(capabilities!=null&&!capabilities.locks?.some(lock=>context.packIds.includes(lock.id)))fail('proveedor no seleccionado');
 const grants=capabilities==null?null:new Set(capabilities.locks.flatMap(lock=>lock.version==='0.1.0'?(operationPermissionGrants[lock.id]??[]):[]));
 return structuredClone({profileId:context.profileId,principal:contextId==='scene3d'?'gg.3d-basic':'gg.webapps',contextId,documentId,operations:operationDescriptors.filter(item=>item.contexts.includes(contextId)&&(!grants||grants.has(item.id))),events:context.events});
}
export function validateCapabilityOperation(profile,operationId,args){
 if(!profile||!contextDescriptors.some(item=>item.profileId===profile.profileId&&item.id===profile.contextId))fail('perfil inválido');
 const operation=operationDescriptors.find(item=>item.id===operationId&&item.contexts.includes(profile.contextId)&&profile.operations?.some(grant=>grant.id===item.id));if(!operation)fail('operación fuera del perfil');
 return {operationId,args:validateSchema(args,operation.argsSchema)};
}
function leafFields(schema,prefix=''){const out=[];if(schema.type==='object')for(const [name,child]of Object.entries(schema.properties))out.push(...leafFields(child,prefix?prefix+'.'+name:name));else out.push({path:prefix,schema});return out;}
export function operationBlockType(operationId){return 'gg_'+operationId.replaceAll('.','_');}
export function operationBlockFields(operation){return leafFields(operation.argsSchema);}
export const capabilityBlockDefinitions=freeze([
 {type:'gg_cap_variable',message0:'variable %1 nombre %2 tipo %3 inicial %4',args0:[{type:'field_input',name:'ID',text:'counter'},{type:'field_input',name:'NAME',text:'Contador'},{type:'field_dropdown',name:'TYPE',options:[['número','number'],['texto','string'],['booleano','boolean']]},{type:'field_input',name:'INITIAL',text:'0'}],colour:330},
 ...['setVariable','changeVariable'].map(kind=>({type:'gg_cap_'+kind,message0:kind+' %1 valor %2',args0:[{type:'field_input',name:'VARIABLEID',text:'counter'},{type:'field_input',name:'VALUE',text:'1'}],previousStatement:null,nextStatement:null,colour:330})),
 {type:'gg_cap_wait',message0:'esperar segundos %1',args0:[{type:'field_input',name:'SECONDS',text:'1'}],previousStatement:null,nextStatement:null,colour:35},
 {type:'gg_cap_repeat',message0:'repetir %1 veces %2',args0:[{type:'field_input',name:'COUNT',text:'3'},{type:'input_statement',name:'DO'}],previousStatement:null,nextStatement:null,colour:35},
 {type:'gg_cap_if',message0:'si %1 %2 %3 entonces %4 si no %5',args0:[{type:'field_input',name:'LEFT',text:'$var.counter'},{type:'field_dropdown',name:'OP',options:[['=','EQ'],['<','LT'],['>','GT']]},{type:'field_input',name:'RIGHT',text:'3'},{type:'input_statement',name:'DO'},{type:'input_statement',name:'ELSE'}],previousStatement:null,nextStatement:null,colour:35},
 ...['start','click','input','submit','key'].map(event=>({type:'gg_cap_'+event,message0:event+(event==='start'?'':' %1')+(event==='key'?' %2':'')+' %'+(event==='start'?1:event==='key'?3:2),args0:[...(event==='start'?[]:[{type:'field_input',name:'TARGETID',text:event==='key'?'':event==='submit'?'web-form':'sphere'}]),...(event==='key'?[{type:'field_input',name:'KEY',text:'space'}]:[]),{type:'input_statement',name:'DO'}],colour:35,tooltip:event==='key'?'Tecla global: deja el objetivo vacío.':'Evento contextual',hat:'cap'})),
 ...operationDescriptors.map(operation=>{const leaves=leafFields(operation.argsSchema);return {type:operationBlockType(operation.id),message0:operation.id+' '+leaves.map((field,index)=>field.path+' %'+(index+1)).join(' '),args0:leaves.map(({path,schema})=>schema.type==='number'?{type:'field_input',name:path,text:path.startsWith('transform.scale.')?'1':'0'}:schema.type==='boolean'?{type:'field_checkbox',name:path,checked:true}:{type:'field_input',name:path,text:path==='targetId'?'sphere':''}),previousStatement:null,nextStatement:null,colour:operation.contexts[0]==='scene3d'?210:160};})
]);
export function contextToolbox(contextId,{capabilities,profile}={}){
 profile??=resolveOperationProfile({contextId,documentId:'preview',capabilities});
 return {kind:'categoryToolbox',contents:[
  {kind:'category',name:'Eventos',colour:35,contents:profile.events.map(e=>({kind:'block',type:'gg_cap_'+e.id}))},
  {kind:'category',name:'Control y datos',colour:330,contents:capabilityBlockDefinitions.filter(b=>['gg_cap_variable','gg_cap_setVariable','gg_cap_changeVariable','gg_cap_wait','gg_cap_repeat','gg_cap_if'].includes(b.type)).map(b=>({kind:'block',type:b.type}))},
  {kind:'category',name:contextId==='scene3d'?'Escena 3D':'Aplicación web',colour:contextId==='scene3d'?210:160,contents:profile.operations.map(op=>({kind:'block',type:operationBlockType(op.id)}))}
 ]};
}
