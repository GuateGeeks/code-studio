import {languageTables} from '../packs/language-tables.mjs';
// Portable device authoring and derivation. No DOM, Blockly or PXT dependency.
export const deviceLimits = Object.freeze({nodes:48,hats:8,depth:4,workspaceBytes:8192,sourceBytes:16384,id:128,deviceId:64});
export const deviceIcons = Object.freeze(['Heart','SmallHeart','Yes','No','Happy','Sad']);
export const deviceButtons = Object.freeze(['A','B','AB']);
const specs = {
  gg_mb_start:{fields:[],inputs:['DO'],hat:'start'},
  gg_mb_forever:{fields:[],inputs:['DO'],hat:'forever'},
  gg_mb_on_button:{fields:['BUTTON'],inputs:['DO'],hat:'button'},
  gg_mb_show_icon:{fields:['ICON'],inputs:[],kind:'showIcon'},
  gg_mb_show_number:{fields:['NUMBER'],inputs:[],kind:'showNumber'},
  gg_mb_show_leds:{fields:['LEDS'],inputs:[],kind:'showLeds'},
  gg_mb_plot:{fields:['X','Y'],inputs:[],kind:'plot'},
  gg_mb_unplot:{fields:['X','Y'],inputs:[],kind:'unplot'},
  gg_mb_clear:{fields:[],inputs:[],kind:'clear'},
  gg_mb_pause:{fields:['MS'],inputs:[],kind:'pause'},
  gg_mb_repeat:{fields:['COUNT'],inputs:['DO'],kind:'repeat'},
  gg_mb_if_button:{fields:['BUTTON'],inputs:['DO','ELSE'],kind:'ifButton'}
};
export const deviceBlockTypes = Object.freeze(Object.keys(specs));
const encoder = new TextEncoder();
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
export class DeviceProgramError extends Error {
  constructor(message,sourceBlockId,code='DEVICE_PROGRAM_INVALID') {super(message);this.name='DeviceProgramError';this.code=code;if(typeof sourceBlockId==='string'&&sourceBlockId.length<=128)this.sourceBlockId=sourceBlockId;}
}
const fail=(message,id,code)=>{throw new DeviceProgramError(message,id,code);};
function exact(value,fields,id) {
  if(!plain(value)||Object.keys(value).length!==fields.length||fields.some(key=>!Object.hasOwn(value,key)))fail('Estructura de dispositivo inválida.',id);
}
function dense(value,max,id) {
  if(!Array.isArray(value)||value.length>max||Object.keys(value).length!==value.length)fail('Lista de dispositivo inválida.',id);
  for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))fail('Lista dispersa no permitida.',id);
}
function identifier(value) {return typeof value==='string'&&value.trim()&&value.length<=128&&!['__proto__','prototype','constructor'].includes(value);}
function finite(value,min,max,id,integer=true) {if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))fail('Número de dispositivo fuera de límites.',id);}
function fields(node,spec) {
  exact(node.fields,spec.fields,node.id);exact(node.inputs,spec.inputs,node.id);
  const f=node.fields;
  if(Object.hasOwn(f,'BUTTON')&&!deviceButtons.includes(f.BUTTON))fail('Botón no soportado.',node.id);
  if(Object.hasOwn(f,'ICON')&&!deviceIcons.includes(f.ICON))fail('Icono no soportado.',node.id);
  if(Object.hasOwn(f,'NUMBER'))finite(f.NUMBER,-9999,9999,node.id,false);
  if(Object.hasOwn(f,'LEDS')&&(typeof f.LEDS!=='string'||!/^[01]{25}$/.test(f.LEDS)))fail('La matriz requiere 25 bits.',node.id);
  for(const key of ['X','Y'])if(Object.hasOwn(f,key))finite(f[key],0,4,node.id);
  if(Object.hasOwn(f,'MS'))finite(f.MS,0,60000,node.id);
  if(Object.hasOwn(f,'COUNT'))finite(f.COUNT,0,1000,node.id);
}
export function validateDeviceGraph(graph) {
  exact(graph,['version','nodes','roots']);
  if(graph.version!==1)fail('Versión de grafo de dispositivo no soportada.');
  dense(graph.nodes,deviceLimits.nodes);dense(graph.roots,deviceLimits.nodes);
  let encoded;try{encoded=JSON.stringify(graph);}catch{fail('El grafo debe ser JSON.');}
  if(encoder.encode(encoded).length>deviceLimits.workspaceBytes)fail('El grafo excede 8 KiB.');
  const nodes=new Map();let hats=0;
  for(const node of graph.nodes) {
    exact(node,['id','type','fields','inputs','next','x','y'],node?.id);
    if(!identifier(node.id)||nodes.has(node.id))fail('ID de bloque inválido o duplicado.',node.id);
    const spec=typeof node.type==='string'?specs[node.type]:null;
    if(typeof node.type!=='string'||!Object.hasOwn(specs,node.type))fail('Este bloque no pertenece al dispositivo.',node.id,'DEVICE_TARGET_OPERATION');
    fields(node,spec);finite(node.x,-100000,100000,node.id,false);finite(node.y,-100000,100000,node.id,false);
    if(spec.hat){hats++;if(node.next!==null)fail('Un evento no puede tener bloque siguiente.',node.id);}
    for(const ref of [node.next,...Object.values(node.inputs)])if(ref!==null&&!identifier(ref))fail('Conexión inválida.',node.id);
    nodes.set(node.id,node);
  }
  if(hats>deviceLimits.hats)fail('Demasiados eventos de dispositivo.');
  const parents=new Map(),roots=new Set();
  for(const id of graph.roots) {
    if(!identifier(id)||!nodes.has(id)||roots.has(id))fail('Raíz inválida o duplicada.',id);
    roots.add(id);
  }
  for(const node of nodes.values())for(const ref of [node.next,...Object.values(node.inputs)])if(ref!==null) {
    if(!nodes.has(ref)||specs[nodes.get(ref).type].hat||parents.has(ref)||roots.has(ref))fail('Conexión ausente, compartida o dirigida a un evento.',node.id);
    parents.set(ref,node.id);
  }
  const seen=new Set(),visiting=new Set();
  function visit(id,depth) {
    if(depth>deviceLimits.depth)fail('Anidación de dispositivo excesiva.',id);
    if(visiting.has(id))fail('Ciclo de bloques no permitido.',id);
    if(seen.has(id))return;
    const node=nodes.get(id);visiting.add(id);
    for(const ref of Object.values(node.inputs))if(ref!==null)visit(ref,depth+(specs[node.type].hat?0:1));
    if(node.next!==null)visit(node.next,depth);
    visiting.delete(id);seen.add(id);
  }
  for(const id of roots)visit(id,0);
  if(seen.size!==nodes.size)fail('Bloques sin raíz o ciclo desconectado.',[...nodes.keys()].find(id=>!seen.has(id)));
  return structuredClone(graph);
}
export function validateDeviceConfig(config) {
  exact(config,['deviceId','variant','mode','workspace']);
  if(!identifier(config.deviceId)||config.deviceId.length>deviceLimits.deviceId||!/^[a-zA-Z0-9._:-]+$/.test(config.deviceId)||!['universal','v1','v2'].includes(config.variant)||!['blocks','typescript'].includes(config.mode))fail('Configuración de dispositivo inválida.');
  return {deviceId:config.deviceId,variant:config.variant,mode:config.mode,workspace:validateDeviceGraph(config.workspace)};
}
export function lowerDeviceGraph(input) {
  const graph=validateDeviceGraph(input),nodes=new Map(graph.nodes.map(node=>[node.id,node])),events=new Set();
  function body(id) {
    const result=[];
    while(id!==null) {
      const node=nodes.get(id),spec=specs[node.type];
      if(spec.hat)fail('Evento en una secuencia.',id);
      const item={kind:spec.kind,sourceBlockId:node.id,...structuredClone(node.fields)};
      if(Object.hasOwn(node.inputs,'DO'))item.body=body(node.inputs.DO);
      if(Object.hasOwn(node.inputs,'ELSE'))item.elseBody=body(node.inputs.ELSE);
      result.push(item);id=node.next;
    }
    return result;
  }
  const scripts=graph.roots.map(id=>{
    const node=nodes.get(id),event=specs[node.type].hat;
    if(!event)fail('Conecta el bloque a un evento para compilar.',id,'DEVICE_LOOSE_BLOCK');
    const key=event+':'+(node.fields.BUTTON??'');
    if(events.has(key))fail('Evento de dispositivo duplicado.',id,'DEVICE_DUPLICATE_EVENT');
    events.add(key);
    return {event,sourceBlockId:id,...(event==='button'?{button:node.fields.BUTTON}:{}),body:body(node.inputs.DO)};
  });
  return {version:1,scripts};
}
export const deviceGraphToIR=lowerDeviceGraph;
function validateIR(ir) {
  exact(ir,['version','scripts']);if(ir.version!==1)fail('Versión de IR no soportada.');dense(ir.scripts,8);
  const ids=new Set();let count=0;const events=new Set();
  function source(node) {if(!plain(node))fail('Nodo de IR inválido.');if(!identifier(node.sourceBlockId)||ids.has(node.sourceBlockId)||++count>48)fail('ID o cantidad de IR inválidos.',node.sourceBlockId);ids.add(node.sourceBlockId);}
  function body(items,depth) {
    dense(items,48);if(items.length&&depth>4)fail('Anidación de IR excesiva.',items[0]?.sourceBlockId);
    for(const node of items) {
      source(node);const type=Object.keys(specs).find(type=>specs[type].kind===node.kind),spec=specs[type];
      if(!spec)fail('Operación de firmware no soportada.',node.sourceBlockId,'DEVICE_TARGET_OPERATION');
      exact(node,['kind','sourceBlockId',...spec.fields,...(spec.inputs.includes('DO')?['body']:[]),...(spec.inputs.includes('ELSE')?['elseBody']:[])],node.sourceBlockId);
      fields({id:node.sourceBlockId,fields:Object.fromEntries(spec.fields.map(key=>[key,node[key]])),inputs:Object.fromEntries(spec.inputs.map(key=>[key,null]))},spec);
      if(node.body)body(node.body,depth+1);if(node.elseBody)body(node.elseBody,depth+1);
    }
  }
  for(const script of ir.scripts) {
    source(script);const isButton=script.event==='button';
    exact(script,['event','sourceBlockId','body',...(isButton?['button']:[])],script.sourceBlockId);
    if(!['start','forever','button'].includes(script.event)||(isButton&&!deviceButtons.includes(script.button)))fail('Evento de IR no soportado.',script.sourceBlockId);
    const key=script.event+':'+(script.button??'');if(events.has(key))fail('Evento duplicado.',script.sourceBlockId);events.add(key);body(script.body,0);
  }
  return ir;
}
const deviceFormats={'led-matrix':value=>'\n'+Array.from({length:5},(_,row)=>value.slice(row*5,row*5+5).split('').map(bit=>bit==='1'?'#':'.').join(' ')).join('\n')+'\n'};
function renderDeviceStatement(node){
  const entry=languageTables['gg.microbit@0.1.0'].find(item=>item.kind==='call'&&item.lower.device===node.kind);
  if(!entry)fail('Instrucción de dispositivo sin tabla de lenguaje.',node.sourceBlockId);
  return entry.typescript.replace(/\{([A-Z][A-Z0-9_]*)\}/g,(match,name)=>{const value=node[name];return entry.format?.[name]?deviceFormats[entry.format[name]](value):String(value);});
}
export function generateDeviceSource(input) {
  const ir=validateIR(input);let source='',line=1,loop=0;const sourceMap=[];
  const append=text=>{source+=text;line+=(text.match(/\n/g)??[]).length;};
  function span(id,emit){const start=source.length,startLine=line;emit();sourceMap.push({sourceBlockId:id,start,end:source.length,startLine,endLine:Math.max(startLine,line-1)});}
  function body(items,indent) {
    const pad='    '.repeat(indent);
    for(const node of items)span(node.sourceBlockId,()=>{
      switch(node.kind) {
        case 'showIcon':case 'showNumber':case 'showLeds':case 'plot':case 'unplot':case 'clear':case 'pause':
          // Statement text comes from the gg.microbit language table (ADR-011).
          append(pad+renderDeviceStatement(node)+';\n');break;
        case 'repeat': {
          const local='gg_device_i_'+(++loop);append(pad+'for (let '+local+' = 0; '+local+' < '+node.COUNT+'; '+local+'++) {\n');body(node.body,indent+1);append(pad+'}\n');break;
        }
        case 'ifButton':
          append(pad+'if (input.buttonIsPressed(Button.'+node.BUTTON+')) {\n');body(node.body,indent+1);append(pad+'} else {\n');body(node.elseBody,indent+1);append(pad+'}\n');break;
      }
    });
  }
  const scripts=[...ir.scripts.filter(script=>script.event==='button'),...ir.scripts.filter(script=>script.event==='forever'),...ir.scripts.filter(script=>script.event==='start')];
  for(const script of scripts)span(script.sourceBlockId,()=>{
    if(script.event==='start'){body(script.body,0);return;}
    append(script.event==='forever'?'basic.forever(() => {\n':'input.onButtonPressed(Button.'+script.button+', () => {\n');body(script.body,1);append('});\n');
  });
  if(encoder.encode(source).length>deviceLimits.sourceBytes)fail('Fuente de firmware demasiado grande.');
  return {source,text:source,sourceMap,sourceIds:[...new Set(sourceMap.map(item=>item.sourceBlockId))]};
}
export function prepareDeviceCompilation({config,deviceSource}) {
  const value=validateDeviceConfig(config);let generated;
  if(value.mode==='blocks')generated=generateDeviceSource(lowerDeviceGraph(value.workspace));
  else {
    if(typeof deviceSource!=='string'||encoder.encode(deviceSource).length>deviceLimits.sourceBytes)fail('Fuente textual excede el límite de compilación.');
    generated={source:deviceSource,text:deviceSource,sourceMap:[],sourceIds:[]};
  }
  return {deviceId:value.deviceId,variant:value.variant,mode:value.mode,...generated};
}
function deepFreeze(value){for(const child of Object.values(value))if(child&&typeof child==='object')deepFreeze(child);return Object.freeze(value);}
export const emptyDeviceGraph=deepFreeze({version:1,nodes:[],roots:[]});
export const defaultDeviceGraph=deepFreeze({version:1,nodes:[
  {id:'device-start',type:'gg_mb_start',fields:{},inputs:{DO:'device-heart'},next:null,x:20,y:20},
  {id:'device-heart',type:'gg_mb_show_icon',fields:{ICON:'Heart'},inputs:{},next:null,x:0,y:0},
  {id:'device-button-a',type:'gg_mb_on_button',fields:{BUTTON:'A'},inputs:{DO:'device-number'},next:null,x:20,y:180},
  {id:'device-number',type:'gg_mb_show_number',fields:{NUMBER:1},inputs:{},next:null,x:0,y:0}
],roots:['device-start','device-button-a']});
