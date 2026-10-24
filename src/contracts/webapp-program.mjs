import {getResourceBinding} from './resources.mjs';
import {fields,list,identifier,string,validateSchema,fail,parseCapabilityNumberLiteral} from './capability-data.mjs';
import {validateContextAuthoring} from './scene3d-program.mjs';
const text={type:'string',maxLength:1024},color={type:'string',maxLength:7,pattern:'^#[a-fA-F0-9]{6}$'},object=(properties,required=Object.keys(properties))=>({type:'object',properties,required});
const style=object({color,backgroundColor:color,fontSize:{type:'number',minimum:12,maximum:48},display:{type:'string',enum:['block','flex']},gap:{type:'number',minimum:0,maximum:32}},[]);
const props={group:{},form:{},text:{text},input:{label:text,value:text,inputType:{type:'string',enum:['text','number']}},button:{text},list:{items:{type:'array',maxItems:128,items:text}},image:{assetBindingId:{type:'string',minLength:1,maxLength:128},alt:text}};
export const webAppLimits=Object.freeze({nodes:64,depth:8,items:128});
export function validateWebAppConfig(config,{resourceView}={}){
 validateContextAuthoring(config,'app');fields(config.app,['nodes','rootId']);list(config.app.nodes,64);identifier(config.app.rootId);const map=new Map();
 for(const node of config.app.nodes){fields(node,['id','type','parentId','props']);identifier(node.id);if(map.has(node.id)||!Object.hasOwn(props,node.type))fail('componente inválido');if(node.parentId!==null)identifier(node.parentId);validateSchema(node.props,object({...props[node.type],styles:style},Object.keys(props[node.type])));if(node.type==='input'){if(!node.props.label.trim())fail('entrada sin etiqueta');validateWebInputValue(node.props.inputType,node.props.value);}if(node.type==='button'&&!node.props.text.trim())fail('botón sin etiqueta');map.set(node.id,node);}
 if(!map.has(config.app.rootId)||map.get(config.app.rootId).parentId!==null)fail('raíz web inválida');
 for(const node of map.values()){let current=node,seen=new Set();while(current.parentId!==null){if(seen.has(current.id)||seen.size>=8)fail('árbol web cíclico/profundo');seen.add(current.id);current=map.get(current.parentId);if(!current||!['group','form'].includes(current.type))fail('padre web inválido');if(node.type==='form'&&current.type==='form')fail('formulario anidado');}if(current.id!==config.app.rootId)fail('árbol desconectado');}
 if(resourceView)for(const item of config.app.nodes){const bindingId=item.props.assetBindingId;if(bindingId&&!getResourceBinding(resourceView,bindingId,{contextId:'webapp',documentId:config.documentId,targetId:item.id,role:'web.image'}))fail('binding ausente o ajeno');}
 return structuredClone(config);
}
export function defaultWebAppConfig(){return {documentId:'web-main',mode:'blocks',selectedTextDocumentId:null,workspace:{version:1,nodes:[{id:'web-submit',type:'gg_cap_submit',fields:{TARGETID:'web-form'},inputs:{DO:'web-append'},next:null,x:20,y:20},{id:'web-append',type:'gg_webapp_appendItem',fields:{targetId:'web-list',text:'$event.values.web-input'},inputs:{},next:null,x:0,y:0}],roots:['web-submit']},app:{rootId:'web-form',nodes:[{id:'web-form',type:'form',parentId:null,props:{}},{id:'web-input',type:'input',parentId:'web-form',props:{label:'Nombre',value:'',inputType:'text'}},{id:'web-add',type:'button',parentId:'web-form',props:{text:'Añadir'}},{id:'web-list',type:'list',parentId:'web-form',props:{items:[]}}]}};}


export function validateWebInputValue(inputType,value){
 if(!['text','number'].includes(inputType))fail('Tipo de entrada web inválido.');
 string(value,1024);
 if(inputType==='number'&&value!=='')parseCapabilityNumberLiteral(value);
 return value;
}
