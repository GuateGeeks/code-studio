import {fields,list,identifier,finite,string,plain,validateSchema,fail,parseCapabilityNumberLiteral} from './capability-data.mjs';
import {resolveOperationProfile,operationBlockType,operationBlockFields,capabilityBlockDefinitions} from './operations.mjs';
export const capabilityGraphLimits=Object.freeze({nodes:128,hats:16,depth:8,bytes:32768,variables:16,scripts:16});
function sourceIdentifier(value){if(typeof value!=='string'||!value.trim()||value.length>128||['__proto__','constructor','prototype'].includes(value))fail('ID de bloque inválido');return value;}
const events=['start','click','key','input','submit'];
const isHat=node=>events.some(event=>node.type==='gg_cap_'+event);
function blockError(error,id){if(id&&!error.sourceBlockId)error.sourceBlockId=id;throw error;}
export function validateCapabilityGraph(input){
 fields(input,['version','nodes','roots']);if(input.version!==1)fail('versión graph');list(input.nodes,128);list(input.roots,128);
 if(new TextEncoder().encode(JSON.stringify(input)).length>32768)fail('graph demasiado grande');
 const ids=new Map(),parents=new Map(),types=new Set(capabilityBlockDefinitions.map(b=>b.type));
 for(const node of input.nodes)try{fields(node,['id','type','fields','inputs','next','x','y']);sourceIdentifier(node.id);if(ids.has(node.id))fail('nodo duplicado');if(!types.has(node.type))fail('bloque no instalado');const definition=capabilityBlockDefinitions.find(b=>b.type===node.type),allowedFields=new Set((definition.args0??[]).filter(arg=>arg.type.startsWith('field_')).map(arg=>arg.name)),allowedInputs=new Set((definition.args0??[]).filter(arg=>arg.type==='input_statement').map(arg=>arg.name));if(Object.keys(node.fields??{}).some(k=>!allowedFields.has(k))||Object.keys(node.inputs??{}).some(k=>!allowedInputs.has(k)))fail('campo/input desconocido');if(!plain(node.fields)||!plain(node.inputs))fail('campos inválidos');if(Object.keys(node.fields).length>32||Object.keys(node.inputs).length>8)fail('cuota campos');for(const [key,value]of Object.entries(node.fields)){string(key,128);if(!['string','number','boolean'].includes(typeof value))fail('campo no escalar');if(typeof value==='number')finite(value);else if(typeof value==='string')string(value,2048);}finite(node.x,-100000,100000);finite(node.y,-100000,100000);if(node.next!==null)sourceIdentifier(node.next);for(const [key,target]of Object.entries(node.inputs)){if(!['DO','ELSE'].includes(key))fail('input inválido');if(target!==null)sourceIdentifier(target);}if(isHat(node)&&node.next!==null)fail('hat con next');ids.set(node.id,node);}catch(e){blockError(e,node?.id);}
 for(const node of input.nodes)for(const child of [node.next,...Object.values(node.inputs)].filter(Boolean)){if(!ids.has(child)||parents.has(child))fail('conexión ausente/compartida',node.id);parents.set(child,node.id);}
 const rootIds=new Set();for(const root of input.roots){sourceIdentifier(root);if(rootIds.has(root)||!ids.has(root)||parents.has(root))fail('raíz inválida');rootIds.add(root);}
 if([...ids.keys()].some(id=>!parents.has(id)&&!rootIds.has(id)))fail('raíz omitida');
 const visited=new Set();function walk(id,depth,stack){if(!id)return;if(stack.has(id))fail('ciclo graph',id);if(depth>8)fail('profundidad graph',id);visited.add(id);const node=ids.get(id),nextStack=new Set([...stack,id]);for(const child of Object.values(node.inputs))if(child)walk(child,depth+1,nextStack);if(node.next)walk(node.next,depth,nextStack);}
 input.roots.forEach(root=>walk(root,0,new Set()));if(visited.size!==ids.size)fail('ciclo desconectado');
 if(input.nodes.filter(isHat).length>16)fail('cuota eventos');
 return structuredClone(input);
}
function exprType(value,variables,event,depth=0){
 if(depth>8)fail('expresión profunda');if(value===null)return'null';if(typeof value==='number'){finite(value);return'number';}if(typeof value==='string'){string(value,4096);return'string';}if(typeof value==='boolean')return'boolean';
 if(!plain(value))fail('expresión inválida');if(Object.hasOwn(value,'sourceBlockId'))sourceIdentifier(value.sourceBlockId);
 if(value.kind==='variable'){fields(value,['kind','variableId'],['sourceBlockId']);const type=variables.get(value.variableId);if(!type)fail('variable ausente');return type;}
 if(value.kind==='event'){fields(value,['kind','path'],['sourceBlockId']);const eventName=typeof event==='string'?event:event.event;if(typeof value.path!=='string'||!(/^(?:value|key|targetId|values\.[-A-Za-z0-9:_]+)$/).test(value.path)||value.path==='value'&&eventName!=='input'||value.path==='key'&&eventName!=='key'||value.path.startsWith('values.')&&eventName!=='submit')fail('evento fuera de esquema');return value.path==='targetId'&&(eventName==='start'||eventName==='key'&&(typeof event==='string'||event.targetId===null))?'null':'string';}
 if(value.kind==='compare'){fields(value,['kind','operator','left','right'],['sourceBlockId']);if(!['EQ','LT','GT'].includes(value.operator))fail('comparación inválida');const left=exprType(value.left,variables,event,depth+1),right=exprType(value.right,variables,event,depth+1);if(left!==right||value.operator!=='EQ'&&!['number','string'].includes(left))fail('tipos comparación');return'boolean';}
 fail('expresión no instalada');
}
function validateArg(value,schema,variables,event,depth=0){
 if(depth>12)fail('args profundos');
 if(plain(value)&&['variable','event','compare'].includes(value.kind)){const type=exprType(value,variables,event);if(schema.type!==type&&schema.type!=='json'&&!schema.anyOf?.some(s=>s.type===type))fail('tipo argumento');return;}
 if(schema.type==='object'){fields(value,schema.required,Object.keys(schema.properties).filter(k=>!schema.required.includes(k)));for(const [key,item]of Object.entries(value))validateArg(item,schema.properties[key],variables,event,depth+1);}
 else if(schema.type==='array'){list(value,schema.maxItems??128);value.forEach(v=>validateArg(v,schema.items,variables,event,depth+1));}
 else validateSchema(value,schema);
}
export function validateProgramIR1(input,{profile}={}){
 fields(input,['version','contextId','documentId','variables','scripts']);if(input.version!==1)fail('versión IR1');profile??=resolveOperationProfile(input);if(profile.contextId!==input.contextId||profile.documentId!==input.documentId)fail('perfil IR no coincide');
 list(input.variables,16);list(input.scripts,16);if(new TextEncoder().encode(JSON.stringify(input)).length>65536)fail('IR1 grande');
 const variables=new Map(),sources=new Set();for(const variable of input.variables){fields(variable,['id','name','type','initialValue']);identifier(variable.id);string(variable.name,128);if(variables.has(variable.id)||!['number','string','boolean'].includes(variable.type))fail('variable inválida');if(typeof variable.initialValue!==variable.type)fail('tipo inicial');exprType(variable.initialValue,new Map(),'start');variables.set(variable.id,variable.type);}
 let nodes=0;function source(node){sourceIdentifier(node.sourceBlockId);if(sources.has(node.sourceBlockId))fail('source repetido',node.sourceBlockId);sources.add(node.sourceBlockId);}
 function body(items,event,depth){list(items,128);if(depth>8)fail('control profundo');for(const node of items)try{if(++nodes>128)fail('cuota nodos');source(node);
 if(node.kind==='call'){fields(node,['kind','operationId','args','sourceBlockId']);const operation=profile.operations.find(op=>op.id===node.operationId);if(!operation)fail('operación fuera de contexto');validateArg(node.args,operation.argsSchema,variables,event);}
 else if(['setVariable','changeVariable'].includes(node.kind)){fields(node,['kind','variableId','value','sourceBlockId']);const type=variables.get(node.variableId);if(!type||exprType(node.value,variables,event)!==type||node.kind==='changeVariable'&&type!=='number')fail('tipo variable');}
 else if(node.kind==='repeat'){fields(node,['kind','count','body','sourceBlockId']);if(exprType(node.count,variables,event)!=='number'||typeof node.count==='number'&&(!Number.isInteger(node.count)||node.count<0||node.count>1000))fail('repetición inválida');body(node.body,event,depth+1);}
 else if(node.kind==='if'){fields(node,['kind','condition','body','elseBody','sourceBlockId']);if(exprType(node.condition,variables,event)!=='boolean')fail('condición inválida');body(node.body,event,depth+1);body(node.elseBody,event,depth+1);}
 else if(node.kind==='wait'){fields(node,['kind','seconds','sourceBlockId']);if(exprType(node.seconds,variables,event)!=='number'||typeof node.seconds==='number'&&(node.seconds<0||node.seconds>60))fail('espera inválida');}
 else fail('statement IR1 no instalado');
 }catch(e){blockError(e,node?.sourceBlockId);}}
 for(const script of input.scripts)try{fields(script,['event','targetId','sourceBlockId','body'],['key']);source(script);if(!profile.events.some(e=>e.id===script.event))fail('evento no instalado');if(script.targetId!==null)identifier(script.targetId);if(script.event==='start'&&script.targetId!==null||script.event!=='start'&&script.event!=='key'&&script.targetId===null)fail('target de evento');if(script.event==='key'){string(script.key,32);if(!script.key.length||/[\u0000-\u001f\u007f]/.test(script.key))fail('tecla vacía');}else if(Object.hasOwn(script,'key'))fail('tecla inesperada');body(script.body,script,0);}catch(e){blockError(e,script?.sourceBlockId);}
 return structuredClone(input);
}
function fieldExpr(value,schema){if(typeof value==='string'&&value.startsWith('$event.'))return{kind:'event',path:value.slice(7)};if(typeof value==='string'&&value.startsWith('$var.'))return{kind:'variable',variableId:value.slice(5)};if(schema.type==='number'){if(typeof value==='number')return value;return parseCapabilityNumberLiteral(value);}if(schema.type==='boolean')return value===true||value==='TRUE';if(schema.anyOf&&value==='null')return null;return value;}

export function lowerCapabilityGraph(graph,{contextId,documentId,variables=[],capabilities,profile}={}){
 graph=validateCapabilityGraph(graph);profile??=resolveOperationProfile({contextId,documentId,capabilities});const map=new Map(graph.nodes.map(n=>[n.id,n]));
 function literal(value){if(typeof value!=='string')return value;if(value.startsWith('$event.'))return{kind:'event',path:value.slice(7)};if(value.startsWith('$var.'))return{kind:'variable',variableId:value.slice(5)};if(value==='true'||value==='false')return value==='true';try{return parseCapabilityNumberLiteral(value);}catch{}return value;}
 const declarations=graph.roots.filter(id=>map.get(id).type==='gg_cap_variable').map(id=>{
  const node=map.get(id);
  try{fields(node.fields,['ID','NAME','TYPE','INITIAL']);const type=node.fields.TYPE,value=node.fields.INITIAL;let initialValue;
   if(type==='number'){initialValue=fieldExpr(value,{type:'number'});if(typeof initialValue!=='number')fail('Inicial numérico literal requerido');}
   else if(type==='boolean'){if(![true,false,'true','false'].includes(value))fail('Inicial booleano literal requerido');initialValue=value===true||value==='true';}
   else if(type==='string'){if(typeof value!=='string')fail('Inicial textual literal requerido');initialValue=value;}
   else fail('Tipo de variable no instalado');
   return{id:node.fields.ID,name:node.fields.NAME,type,initialValue};
  }catch(error){blockError(error,id);}
 });
 variables=[...variables,...declarations];
 function sequence(id){const out=[];while(id){const node=map.get(id),op=profile.operations.find(op=>operationBlockType(op.id)===node.type);let statement;
  if(op){const args={};for(const field of operationBlockFields(op)){const parts=field.path.split('.');let cursor=args;for(const key of parts.slice(0,-1))cursor=cursor[key]??={};cursor[parts.at(-1)]=fieldExpr(node.fields[field.path],field.schema);}statement={kind:'call',operationId:op.id,args,sourceBlockId:id};}
  else if(node.type==='gg_cap_wait')statement={kind:'wait',seconds:literal(node.fields.SECONDS),sourceBlockId:id};
  else if(node.type==='gg_cap_repeat')statement={kind:'repeat',count:literal(node.fields.COUNT),body:sequence(node.inputs.DO),sourceBlockId:id};
  else if(node.type==='gg_cap_if')statement={kind:'if',condition:{kind:'compare',operator:node.fields.OP,left:literal(node.fields.LEFT),right:literal(node.fields.RIGHT)},body:sequence(node.inputs.DO),elseBody:sequence(node.inputs.ELSE),sourceBlockId:id};
  else if(['gg_cap_setVariable','gg_cap_changeVariable'].includes(node.type))statement={kind:node.type.slice(7),variableId:node.fields.VARIABLEID,value:literal(node.fields.VALUE),sourceBlockId:id};
  else fail('statement fuera del contexto',id);
  out.push(statement);id=node.next;}return out;}
 const scripts=graph.roots.filter(id=>map.get(id).type!=='gg_cap_variable').map(id=>{const node=map.get(id),event=node.type.replace('gg_cap_','');if(!events.includes(event))fail('instrucción sin evento',id);return{event,targetId:event==='start'?null:(node.fields.TARGETID||null),...(event==='key'?{key:node.fields.KEY}:{}),sourceBlockId:id,body:sequence(node.inputs.DO)};});
 return validateProgramIR1({version:1,contextId,documentId,variables,scripts},{profile});
}
