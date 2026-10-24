import {getResourceBinding} from './resources.mjs';
import {fields,list,identifier,finite,string,validateSchema,fail} from './capability-data.mjs';
import {validateCapabilityGraph} from './program-ir1.mjs';
const num=(minimum,maximum)=>({type:'number',minimum,maximum}),color={type:'string',pattern:'^#[a-fA-F0-9]{6}$',maxLength:7},boolean={type:'boolean'},id={type:'string',minLength:1,maxLength:128,pattern:'^[-A-Za-z0-9:_]+$'};
const object=properties=>({type:'object',properties,required:Object.keys(properties)});
const vector=object({x:num(-1e6,1e6),y:num(-1e6,1e6),z:num(-1e6,1e6)});
const entityProperties={
 sphere:object({diameter:num(.01,100),segments:{type:'integer',minimum:3,maximum:32},color,collidable:boolean}),
 box:object({width:num(.01,100),height:num(.01,100),depth:num(.01,100),color,collidable:boolean}),
 ground:object({width:num(.01,100),height:num(.01,100),subdivisions:{type:'integer',minimum:1,maximum:16},color,collidable:boolean}),
 group:object({}),model:object({bindingId:id,collidable:boolean}),
 hemisphericLight:object({intensity:num(0,10),diffuse:color,direction:vector}),pointLight:object({intensity:num(0,10),diffuse:color})
};
export const scene3DLimits=Object.freeze({entities:32,depth:8});
export function validateContextAuthoring(config,payloadField){fields(config,['documentId','mode','selectedTextDocumentId','workspace',payloadField]);identifier(config.documentId);if(!['blocks','javascript','python'].includes(config.mode))fail('modo contextual inválido');if(config.selectedTextDocumentId!==null)identifier(config.selectedTextDocumentId);validateCapabilityGraph(config.workspace);if(new TextEncoder().encode(JSON.stringify(config)).length>65536)fail('configuración contextual demasiado grande');}
export function validateScene3DConfig(config,{resourceView}={}){
 validateContextAuthoring(config,'scene');fields(config.scene,['entities','cameraArc']);list(config.scene.entities,32);const map=new Map();
 for(const entity of config.scene.entities){fields(entity,['id','name','kind','parentId','visible','transform','properties']);identifier(entity.id);string(entity.name,128);if(map.has(entity.id)||!Object.hasOwn(entityProperties,entity.kind))fail('entidad inválida');if(entity.parentId!==null)identifier(entity.parentId);if(typeof entity.visible!=='boolean')fail('visibilidad inválida');fields(entity.transform,['position','rotationDegrees','scale']);validateSchema(entity.transform.position,vector);validateSchema(entity.transform.rotationDegrees,vector);validateSchema(entity.transform.scale,object({x:num(.001,1000),y:num(.001,1000),z:num(.001,1000)}));validateSchema(entity.properties,entityProperties[entity.kind]);map.set(entity.id,entity);}
 for(const entity of map.values()){let cursor=entity,seen=new Set();while(cursor.parentId!==null){if(seen.has(cursor.id)||seen.size>=8)fail('jerarquía cíclica/profunda');seen.add(cursor.id);cursor=map.get(cursor.parentId);if(!cursor)fail('padre ausente');}}
 validateSchema(config.scene.cameraArc,object({alpha:num(-36000,36000),beta:num(.01,179.99),radius:num(.1,10000),target:vector}));
 if(resourceView)for(const item of config.scene.entities){const bindingId=item.properties.bindingId;if(bindingId&&!getResourceBinding(resourceView,bindingId,{contextId:'scene3d',documentId:config.documentId,targetId:item.id,role:'mesh.geometry'}))fail('binding ausente o ajeno');}
 return structuredClone(config);
}
export function defaultScene3DConfig(){return {documentId:'scene-main',mode:'blocks',selectedTextDocumentId:null,
 workspace:{version:1,nodes:[{id:'scene-start',type:'gg_cap_start',fields:{},inputs:{DO:'scene-move'},next:null,x:20,y:20},{id:'scene-move',type:'gg_scene3d_move',fields:{targetId:'sphere','delta.x':1,'delta.y':0,'delta.z':0},inputs:{},next:null,x:0,y:0}],roots:['scene-start']},
 scene:{entities:[{id:'sphere',name:'Esfera',kind:'sphere',parentId:null,visible:true,transform:{position:{x:0,y:1,z:0},rotationDegrees:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}},properties:{diameter:2,segments:16,color:'#4285f4',collidable:true}},{id:'light',name:'Luz',kind:'hemisphericLight',parentId:null,visible:true,transform:{position:{x:0,y:0,z:0},rotationDegrees:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}},properties:{intensity:.9,diffuse:'#ffffff',direction:{x:0,y:1,z:0}}}],cameraArc:{alpha:45,beta:65,radius:10,target:{x:0,y:0,z:0}}}};}


// Installed packs grant authoring features independently from RPC operations.
// Structural validation stays reusable by an adapter; the profile registry
// invokes this validator with the union of reviewed installed declarations.
export function validateScene3DFeatures(config,features){
 const kinds=new Set(features?.entityKinds??[]);
 for(const entity of config.scene.entities){
  if(!kinds.has(entity.kind))fail('Tipo de entidad no habilitado por los packs: '+entity.kind);
  if(entity.parentId!==null&&!features.hierarchy)fail('Jerarquía no habilitada por los packs.');
  if(!features.rotation&&Object.values(entity.transform.rotationDegrees).some(value=>value!==0))fail('Rotación inicial no habilitada por los packs.');
  if(!features.scale&&Object.values(entity.transform.scale).some(value=>value!==1))fail('Escala inicial no habilitada por los packs.');
 }
 return structuredClone(config);
}
