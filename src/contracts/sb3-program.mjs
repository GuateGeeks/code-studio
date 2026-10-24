import {validateProgram} from './program-contract.mjs';

// Reviewed Scratch core vocabulary. No prefix-based approval, extensions or
// native project objects supplied by a caller are executable authority.
export const sb3Limits = Object.freeze({projectBytes: 131072, blocks: 1000, hats: 64, sprites: 8,
  clones: 64, threads: 64, listItems: 1024, aggregateItems: 4096, stringBytes: 1024, dataBytes: 65536});
const definitions = {};
function op(name, inputs = [], fields = [], kind = 'statement') { definitions[name] = Object.freeze({inputs, fields, kind}); }
for (const name of ['event_whenflagclicked','event_whenthisspriteclicked','event_whenstageclicked','control_start_as_clone']) op(name,[],[],'hat');
op('event_whenkeypressed',[],['KEY_OPTION'],'hat'); op('event_whenbroadcastreceived',[],['BROADCAST_OPTION'],'hat');
for (const [name, inputs] of Object.entries({
  motion_movesteps:['STEPS'],motion_changexby:['DX'],motion_changeyby:['DY'],motion_setx:['X'],motion_sety:['Y'],
  motion_gotoxy:['X','Y'],motion_turnright:['DEGREES'],motion_turnleft:['DEGREES'],motion_pointindirection:['DIRECTION'],
  looks_changesizeby:['CHANGE'],looks_setsizeto:['SIZE'],looks_switchcostumeto:['COSTUME'],
  sound_play:['SOUND_MENU'],sound_playuntildone:['SOUND_MENU'],sound_changevolumeby:['VOLUME'],sound_setvolumeto:['VOLUME'],
  event_broadcast:['BROADCAST_INPUT'],event_broadcastandwait:['BROADCAST_INPUT'],control_wait:['DURATION'],
  control_repeat:['TIMES','SUBSTACK'],control_forever:['SUBSTACK'],control_if:['CONDITION','SUBSTACK'],
  control_if_else:['CONDITION','SUBSTACK','SUBSTACK2'],control_repeat_until:['CONDITION','SUBSTACK'],control_wait_until:['CONDITION'],
  control_create_clone_of:['CLONE_OPTION']
})) op(name,inputs);
for (const name of ['looks_show','looks_hide','looks_nextcostume','looks_cleargraphiceffects','sound_stopallsounds','control_delete_this_clone']) op(name);
op('looks_changeeffectby',['CHANGE'],['EFFECT']); op('looks_seteffectto',['VALUE'],['EFFECT']);
for (const [name,field] of [['looks_costume','COSTUME'],['sound_sounds_menu','SOUND_MENU'],['control_create_clone_of_menu','CLONE_OPTION']]) op(name,[],[field],'menu');
for (const name of ['motion_xposition','motion_yposition','motion_direction','looks_size','sound_volume']) op(name,[],[],'reporter');
for (const name of ['operator_add','operator_subtract','operator_multiply','operator_divide','operator_mod']) op(name,['NUM1','NUM2'],[],'reporter');
op('operator_random',['FROM','TO'],[],'reporter');
for (const name of ['operator_equals','operator_lt','operator_gt','operator_and','operator_or']) op(name,['OPERAND1','OPERAND2'],[],'reporter');
op('operator_not',['OPERAND'],[],'reporter'); op('operator_join',['STRING1','STRING2'],[],'reporter');
op('operator_letter_of',['LETTER','STRING'],[],'reporter'); op('operator_length',['STRING'],[],'reporter');
op('operator_contains',['STRING1','STRING2'],[],'reporter'); op('operator_round',['NUM'],[],'reporter');
for (const [name,field] of [['math_number','NUM'],['math_integer','NUM'],['math_whole_number','NUM'],['math_positive_number','NUM'],['math_angle','NUM'],['text','TEXT']]) op(name,[],[field],'literal');
op('data_variable',[],['VARIABLE'],'reporter'); op('data_setvariableto',['VALUE'],['VARIABLE']); op('data_changevariableby',['VALUE'],['VARIABLE']);
for (const [name,inputs,kind] of [
  ['data_listcontents',[],'reporter'],['data_addtolist',['ITEM'],'statement'],['data_deleteoflist',['INDEX'],'statement'],
  ['data_deletealloflist',[],'statement'],['data_insertatlist',['ITEM','INDEX'],'statement'],['data_replaceitemoflist',['INDEX','ITEM'],'statement'],
  ['data_itemoflist',['INDEX'],'reporter'],['data_itemnumoflist',['ITEM'],'reporter'],['data_lengthoflist',[],'reporter'],['data_listcontainsitem',['ITEM'],'reporter']
]) op(name,inputs,['LIST'],kind);
export const sb3OpcodeDefinitions = Object.freeze(definitions);
const fail = (message, sourceBlockId) => { throw Object.assign(new Error('SB3: '+message),sourceBlockId?{sourceBlockId}:{}); };
const plain = value => value && typeof value==='object' && !Array.isArray(value) && [Object.prototype,null].includes(Object.getPrototypeOf(value));
const byteLength = value => new TextEncoder().encode(value).length;
function record(value,label) { if(!plain(value))fail(label+': se esperaba objeto'); return value; }
function only(value,allowed,label) { record(value,label); if(Object.keys(value).some(key=>!allowed.includes(key)||['__proto__','constructor','prototype'].includes(key)))fail(label+': propiedad desconocida'); }
function dense(value,max,label) { if(!Array.isArray(value)||value.length>max||Object.keys(value).length!==value.length)fail(label+': lista inválida'); return value; }
function text(value,max=128,label='texto') { if(typeof value!=='string'||!value.length||value.length>max||/[\u0000-\u001f\u007f]/.test(value)||['__proto__','constructor','prototype'].includes(value))fail(label+' inválido'); return value; }
function number(value,min=-1e6,max=1e6) { if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail('número inválido');return value; }
function scalar(value) { if(typeof value==='string'){if(byteLength(value)>sb3Limits.stringBytes)fail('string demasiado grande');return value;} if(typeof value==='boolean')return value;return number(value); }
function hash(value) { if(typeof value!=='string'||!/^[a-f0-9]{64}$/.test(value))fail('SHA de original inválido');return value; }
const owner = (sha,index) => 'sb3:'+sha+':t'+index;
function resourceList(view,key) { const value=view?.[key]; if(!Array.isArray(value))fail('ResourceView no disponible');return value; }

export function buildSb3ResourceDescriptors(project,{sourceAssetId,assetMap}={}) {
  hash(sourceAssetId); dense(project?.targets,9,'targets'); record(assetMap,'assetMap');
  const costumes=[],sounds=[];
  project.targets.forEach((target,index)=>{
    const ownerId=owner(sourceAssetId,index);
    for(const [kind,output,letter] of [['costumes',costumes,'c'],['sounds',sounds,'s']]) {
      dense(target[kind]??[],kind==='costumes'?32:16,kind).forEach((item,assetIndex)=>{
        record(item,kind);
        const path=item.md5ext??(item.assetId+'.'+item.dataFormat);
        const mapped=assetMap[path];
        if(!mapped||typeof mapped.assetId!=='string'||mapped.type!==(kind==='costumes'?'Image':'Sound')||mapped.format!==String(item.dataFormat).toLowerCase())fail('recurso ausente '+String(path));
        const base={id:ownerId+':'+letter+assetIndex,ownerId,name:text(item.name,80,'nombre de recurso'),assetId:hash(mapped.assetId)};
        if(kind==='costumes')output.push({...base,centerX:number(item.rotationCenterX??0,-1024,1024),centerY:number(item.rotationCenterY??0,-1024,1024),bitmapResolution:number(item.bitmapResolution??1,1,2)});
        else output.push(base);
      });
    }
  });
  return {costumes,sounds};
}
function primitiveInput(value,variables,lists,broadcasts) {
  dense(value,3,'literal');
  const kind=value[0];
  if([4,5,6,7,8].includes(kind)&&value.length===2){if(typeof value[1]!=='string'&&typeof value[1]!=='number')fail('literal numérico inválido');scalar(value[1]);return [kind,value[1]];}
  if([9,10].includes(kind)&&value.length===2){scalar(value[1]);if(typeof value[1]!=='string')fail('literal de texto inválido');return [kind,value[1]];}
  if([11,12,13].includes(kind)&&value.length===3){
    text(value[1],80);text(value[2]);
    const map=kind===11?broadcasts:kind===12?variables:lists;
    if(map.get(value[2])!==value[1])fail('referencia literal desconocida');
    return [...value];
  }
  fail('literal SB3 no soportado');
}
function normalize(project,{sourceAssetId,resourceView},canonical=false) {
  hash(sourceAssetId);
  only(project,['targets','monitors','extensions','extensionURLs','meta'],'proyecto');
  dense(project.targets,9,'targets');
  if(!project.targets.length||project.targets.filter(target=>target.isStage===true).length!==1||project.targets[0].isStage!==true)fail('se requiere un único escenario primero');
  if(project.targets.length-1>sb3Limits.sprites)fail('límite de sprites');
  if(byteLength(JSON.stringify(project))>sb3Limits.projectBytes)fail('project.json demasiado grande');
  const coverage=[],targets=[],names=new Set();
  let blockCount=0,hats=0,totalItems=0,totalData=0,unsupported=false;
  const problem=(targetId,blockId,opcode,reason)=>{unsupported=true;coverage.push({targetId,blockId,opcode,status:'unsupported',reason});};
  if(project.extensions!==undefined){dense(project.extensions,16,'extensions');for(const id of project.extensions){text(id);problem(null,null,'extension:'+id,'Extensión no habilitada');}}
  if(project.extensionURLs!==undefined&&Object.keys(project.extensionURLs).length)problem(null,null,'extensionURLs','URLs de extensión no permitidas');
  const declarationIds=new Set();
  for(const target of project.targets)for(const field of ['variables','lists'])for(const id of Object.keys(record(target[field]??{},field))){text(id);if(declarationIds.has(id))fail('ID de datos duplicado');declarationIds.add(id);}
  const globals=project.targets[0].variables??{},globalLists=project.targets[0].lists??{},broadcastNames=new Map();
  for(const target of project.targets)for(const [id,name]of Object.entries(target.broadcasts??{})){text(id);text(name,64);if(declarationIds.has(id))fail('ID de broadcast colisiona con datos');if(broadcastNames.has(id)&&broadcastNames.get(id)!==name)fail('broadcast ambiguo');broadcastNames.set(id,name);}
  const stageVars=new Map(Object.entries(globals).map(([id,value])=>[id,value?.[0]]));
  const stageLists=new Map(Object.entries(globalLists).map(([id,value])=>[id,value?.[0]]));
  project.targets.forEach((target,index)=>{
    only(target,['isStage','name','variables','lists','broadcasts','blocks','comments','currentCostume','costumes','sounds','volume','layerOrder',
      'tempo','videoTransparency','videoState','textToSpeechLanguage','visible','x','y','size','direction','draggable','rotationStyle','extensionURLs'],'target');
    if(typeof target.isStage!=='boolean')fail('tipo de target inválido');
    const id=owner(sourceAssetId,index),name=text(target.name,80,'nombre de target');
    if(names.has(name))fail('nombres de target duplicados');names.add(name);
    if(target.extensionURLs&&Object.keys(target.extensionURLs).length)problem(id,null,'extensionURLs','URL de extensión en target');
    const variables={},lists={},broadcasts={};
    for(const [key,value]of Object.entries(record(target.variables??{},'variables'))){
      text(key);dense(value,3,'variable');if(value.length<2)fail('variable incompleta');text(value[0],80);
      if(value.length>2&&value[2]!==false)problem(id,null,'cloud','Variables cloud no permitidas');
      variables[key]=[value[0],scalar(value[1])];totalData+=byteLength(JSON.stringify(value[1]));
    }
    for(const [key,value]of Object.entries(record(target.lists??{},'listas'))){
      text(key);dense(value,2,'lista');if(value.length!==2)fail('lista incompleta');text(value[0],80);dense(value[1],sb3Limits.listItems,'contenido de lista');
      lists[key]=[value[0],value[1].map(scalar)];totalItems+=value[1].length;totalData+=byteLength(JSON.stringify(value[1]));
    }
    for(const [key,value]of Object.entries(record(target.broadcasts??{},'broadcasts')))broadcasts[text(key)]=text(value,64);
    const variableNames=new Map([...stageVars,...Object.entries(variables).map(([key,value])=>[key,value[0]])]);
    const listNames=new Map([...stageLists,...Object.entries(lists).map(([key,value])=>[key,value[0]])]);
    const resolveResource=(kind,value)=>{
      const letter=kind==='costumes'?'c':'s',items=resourceList(resourceView,kind),own=items.filter(item=>item.ownerId===id);
      if(own.some(item=>item.id===value))return value;
      const original=(target[kind]??[]).findIndex(item=>item.name===value);
      return original>=0?id+':'+letter+original:value;
    };
    const blocks={},sourceBlocks=record(target.blocks??{},'blocks');
    for(const [blockId,raw]of Object.entries(sourceBlocks)){
      text(blockId);if(++blockCount>sb3Limits.blocks)fail('límite de bloques');
      if(Array.isArray(raw)){problem(id,blockId,'compact-reporter','Reporter suelto comprimido no admitido');continue;}
      record(raw,'bloque');const opcode=text(raw.opcode,80,'opcode');const definition=definitions[opcode];
      if(!definition){problem(id,blockId,opcode,'Opcode no habilitado');continue;}
      const unknown=Object.keys(raw).filter(key=>!['opcode','next','parent','inputs','fields','shadow','topLevel','x','y','comment','mutation'].includes(key));
      if(unknown.length||raw.mutation!==undefined){problem(id,blockId,opcode,'Propiedad o mutación no habilitada');continue;}
      if(typeof raw.shadow!=='boolean'||typeof raw.topLevel!=='boolean')fail('flags de bloque inválidos',blockId);
      for(const key of ['next','parent'])if(raw[key]!==null)text(raw[key]);
      if(raw.topLevel&&raw.parent!==null)fail('raíz con padre',blockId);
      if(definition.kind==='hat'&&(!raw.topLevel||raw.shadow))fail('hat inválido',blockId);
      if(definition.kind==='hat'&&++hats>sb3Limits.hats)fail('límite de hats');
      const fields={};only(raw.fields??{},definition.fields,'fields');
      for(const field of definition.fields){
        const tuple=raw.fields?.[field];dense(tuple,2,'field');if(tuple.length<1)fail('field incompleto');
        const value=scalar(tuple[0]);const reference=tuple.length===2?tuple[1]:null;
        if(typeof value!=='string'&&field!=='NUM')fail('field de texto inválido');
        if(reference!==null)text(reference);
        if(field==='VARIABLE'&&variableNames.get(reference)!==value)fail('variable desconocida',blockId);
        if(field==='LIST'&&listNames.get(reference)!==value)fail('lista desconocida',blockId);
        if(field==='BROADCAST_OPTION'&&broadcastNames.get(reference)!==value)fail('broadcast desconocido',blockId);
        if(field==='KEY_OPTION'&&!/^(space|any|up arrow|down arrow|left arrow|right arrow|[a-z0-9])$/.test(value))fail('tecla no admitida',blockId);
        if(field==='EFFECT'&&!['COLOR','FISHEYE','WHIRL','PIXELATE','MOSAIC','BRIGHTNESS','GHOST'].includes(value))fail('efecto desconocido',blockId);
        fields[field]=[opcode==='looks_costume'?resolveResource('costumes',value):opcode==='sound_sounds_menu'?resolveResource('sounds',value):value,reference];
      }
      const inputs={};only(raw.inputs??{},definition.inputs,'inputs');
      for(const [key,input]of Object.entries(raw.inputs??{})){
        dense(input,3,'input');if(![1,2,3].includes(input[0])||input.length!==(input[0]===3?3:2))fail('input inválido',blockId);
        const item=value=>typeof value==='string'?text(value):primitiveInput(value,variableNames,listNames,broadcastNames);
        inputs[key]=[input[0],item(input[1]),...(input[0]===3?[item(input[2])]:[])];
      }
      for(const key of definition.inputs)if(!Object.hasOwn(inputs,key)&&!key.startsWith('SUBSTACK')&&key!=='CONDITION')fail('input ausente '+key,blockId);
      blocks[blockId]={opcode,next:raw.next,parent:raw.parent,inputs,fields,shadow:raw.shadow,topLevel:raw.topLevel,
        ...(raw.topLevel?{x:number(raw.x??0,-10000,10000),y:number(raw.y??0,-10000,10000)}:{})};
      coverage.push({targetId:id,blockId,opcode,status:'vm-compatible'});
    }
    for(const [blockId,block]of Object.entries(blocks)){
      const selection=block.opcode==='looks_switchcostumeto'?['COSTUME','costumes','looks_costume']:
        ['sound_play','sound_playuntildone'].includes(block.opcode)?['SOUND_MENU','sounds','sound_sounds_menu']:null;
      if(!selection)continue;
      const input=block.inputs[selection[0]],value=input?.[1];
      if(Array.isArray(value)&&[4,5,6,7,8,10].includes(value[0]))value[1]=resolveResource(selection[1],String(value[1]));
      else if(typeof value==='string'&&blocks[value]?.opcode!==selection[2])problem(id,blockId,block.opcode,'Selector dinámico de recurso no habilitado');
    }
    if(!unsupported){
      for(const [blockId,block]of Object.entries(blocks)){
        const kind=definitions[block.opcode].kind;
        if(block.next!==null&&( !['hat','statement'].includes(kind)||definitions[blocks[block.next]?.opcode]?.kind!=='statement'||blocks[block.next]?.shadow))fail('conexión next inválida',blockId);
        for(const [name,input]of Object.entries(block.inputs)){
          if(name.startsWith('SUBSTACK')&&(input[0]!==2||typeof input[1]!=='string'||definitions[blocks[input[1]]?.opcode]?.kind!=='statement'||blocks[input[1]]?.shadow))fail('substack inválido',blockId);
          if(name.startsWith('SUBSTACK'))continue;
          for(let index=1;index<input.length;index++)if(typeof input[index]==='string'){
            const child=blocks[input[index]],childKind=definitions[child?.opcode]?.kind;
            if(!['reporter','literal','menu'].includes(childKind)||child.shadow!==(input[0]===1||index===2))fail('conexión de valor/shadow inválida',blockId);
          }
        }
      }
      const inbound=new Map(),visited=new Set(),visiting=new Set();
      const walk=blockId=>{
        if(visiting.has(blockId))fail('ciclo estructural',blockId);if(visited.has(blockId))return;
        visiting.add(blockId);const block=blocks[blockId];if(!block)fail('referencia a bloque ausente',blockId);
        const edges=[...(block.next?[block.next]:[]),...Object.values(block.inputs).flatMap(input=>input.slice(1).filter(value=>typeof value==='string'))];
        for(const child of edges){if(!blocks[child])fail('referencia ausente '+child,blockId);if(inbound.has(child))fail('bloque con varias conexiones',child);inbound.set(child,blockId);if(blocks[child].parent!==blockId)fail('padre incoherente',child);walk(child);}
        visiting.delete(blockId);visited.add(blockId);
      };
      for(const blockId of Object.keys(blocks))walk(blockId);
      for(const [blockId,block]of Object.entries(blocks))if(block.parent!==null&&!inbound.has(blockId))fail('padre sin conexión',blockId);
    }
    const costumeList=resourceList(resourceView,'costumes').filter(item=>item.ownerId===id);
    const soundList=resourceList(resourceView,'sounds').filter(item=>item.ownerId===id);
    dense(target.costumes??[],32,'costumes');dense(target.sounds??[],16,'sounds');
    if(costumeList.length!==(target.costumes??[]).length||soundList.length!==(target.sounds??[]).length||!costumeList.length)fail('referencias de recursos incompletas');
    const costumes=(target.costumes??[]).map((_,i)=>{const descriptor=costumeList.find(item=>item.id===id+':c'+i);if(!descriptor)fail('disfraz estable ausente');return descriptor.id;});
    const sounds=(target.sounds??[]).map((_,i)=>{const descriptor=soundList.find(item=>item.id===id+':s'+i);if(!descriptor)fail('sonido estable ausente');return descriptor.id;});
    const comments=record(target.comments??{},'comments');
    for(const comment of Object.values(comments)){only(comment,['blockId','x','y','width','height','minimized','text'],'comentario');if(typeof comment.text!=='string'||byteLength(comment.text)>1024)fail('comentario inválido');}
    targets.push({id,isStage:target.isStage,name,variables,lists,broadcasts,blocks,comments:structuredClone(comments),costumes,sounds,
      currentCostume:number(target.currentCostume??0,0,costumes.length-1),volume:number(target.volume??100,0,100),layerOrder:number(target.layerOrder??index,0,9),
      ...(target.isStage?{tempo:number(target.tempo??60,20,500)}:{visible:target.visible??true,x:number(target.x??0),y:number(target.y??0),
        size:number(target.size??100,0,1000),direction:number(target.direction??90,-360,360),draggable:target.draggable??false,rotationStyle:target.rotationStyle??'all around'})});
    if(!target.isStage&&(typeof targets.at(-1).visible!=='boolean'||typeof targets.at(-1).draggable!=='boolean'||!['all around','left-right',"don't rotate"].includes(targets.at(-1).rotationStyle)))fail('propiedades de sprite inválidas');
    if(target.isStage&&((target.videoState&&target.videoState!=='off')||target.textToSpeechLanguage!=null))problem(id,null,'hardware','Vídeo o texto a voz no habilitados');
  });
  if(totalItems>sb3Limits.aggregateItems||totalData>sb3Limits.dataBytes)fail('límite agregado de datos');
  const monitors=[];
  for(const monitor of dense(project.monitors??[],32,'monitors')){
    only(monitor,['id','mode','opcode','params','spriteName','value','width','height','x','y','visible','sliderMin','sliderMax','isDiscrete'],'monitor');
    const opcode=text(monitor.opcode,80),target=monitor.spriteName?targets.find(target=>target.name===monitor.spriteName):targets[0];
    if(!target)fail('target de monitor desconocido');
    if(!['data_variable','data_listcontents'].includes(opcode)){problem(target.id,monitor.id??null,opcode,'Monitor no habilitado');continue;}
    const field=opcode==='data_variable'?'VARIABLE':'LIST',models=opcode==='data_variable'?target.variables:target.lists;
    only(monitor.params??{},[field],'params de monitor');
    if(typeof monitor.visible!=='boolean'||!['default','large','slider','list'].includes(monitor.mode??'default'))fail('monitor inválido');
    const model=models[monitor.id]??targets[0][opcode==='data_variable'?'variables':'lists'][monitor.id];
    if(!model||model[0]!==monitor.params?.[field]){problem(target.id,null,opcode,'Referencia de monitor desconocida');continue;}
    if(monitor.visible!==false){problem(target.id,monitor.id??null,opcode,'Monitor visible no implementado');continue;}
    coverage.push({targetId:target.id,blockId:null,opcode,status:'vm-compatible'});
  }
  return {coverage,candidate:unsupported?null:{format:'gg-sb3-program',version:1,sourceAssetId,targets,monitors}};
}

export function inspectSb3Project(project,{sourceAssetId,assetMap,resourceView}={}) {
  const {candidate,coverage}=normalize(project,{sourceAssetId,resourceView});
  if(!candidate)return {status:'unsupported',coverage,candidate:null,editable:null};
  let editable=null;
  try{editable=translateSb3Editable(candidate,{resourceView});}catch{}
  const status=editable?'gg-editable':'vm-compatible';
  return {status,coverage:coverage.map(item=>({...item,status:editable?'gg-editable':item.status})),candidate,editable};
}
export function validateSb3Program(candidate,{resourceView}={}) {
  only(candidate,['format','version','sourceAssetId','targets','monitors'],'candidato');
  if(candidate.format!=='gg-sb3-program'||candidate.version!==1)fail('versión de candidato inválida');
  const raw={targets:dense(candidate.targets,9,'targets').map(target=>{
    only(target,['id','isStage','name','variables','lists','broadcasts','blocks','comments','costumes','sounds','currentCostume','volume','layerOrder',
      'tempo','visible','x','y','size','direction','draggable','rotationStyle'],'target canónico');
    const index=candidate.targets.indexOf(target);if(target.id!==owner(candidate.sourceAssetId,index))fail('identidad de target inválida');
    const result={...target,costumes:target.costumes.map(id=>({name:id})),sounds:target.sounds.map(id=>({name:id}))};delete result.id;return result;
  }),monitors:[]};
  if(!Array.isArray(candidate.monitors)||candidate.monitors.length)fail('monitor canónico inválido');
  const rebuilt=normalize(raw,{sourceAssetId:candidate.sourceAssetId,resourceView},true).candidate;
  if(!rebuilt||JSON.stringify(rebuilt)!==JSON.stringify(candidate))fail('candidato no canónico');
  return structuredClone(rebuilt);
}

export function translateSb3Editable(candidate,{resourceView}={}) {
  if(candidate.targets.length!==2||candidate.targets[0].blocks&&Object.keys(candidate.targets[0].blocks).length)fail('solo un sprite editable');
  const [stage,sprite]=candidate.targets;
  if(stage.name!=='Stage'||stage.currentCostume!==0||stage.layerOrder!==0||sprite.layerOrder!==1)fail('escenario inicial no representable');
  if(sprite.name!=='hero'||sprite.x!==0||sprite.y!==0||sprite.direction!==90||sprite.size!==100||!sprite.visible||sprite.draggable||sprite.rotationStyle!=='all around'||sprite.currentCostume!==0||sprite.volume!==100||stage.volume!==100||stage.tempo!==60)fail('estado inicial fuera de IR0');
  if(candidate.targets.some(target=>Object.keys(target.lists).length||Object.keys(target.comments).length))fail('listas/comentarios sin representación editable');
  const variables=candidate.targets.flatMap(target=>Object.entries(target.variables).map(([id,value])=>{
    if(typeof value[1]!=='number'||value[1]!==0)fail('valor inicial no representable');return {id,name:value[0],initialValue:0,scope:target.isStage?'global':'local'};
  }));
  // The installed Blockly contribution declares global scope only through an
  // authored gg_set_global setter. A reader/change alone would reopen as a
  // sprite-local variable; do not promise an editable copy with altered scope.
  const globalSetters=new Set(Object.values(sprite.blocks).filter(block=>block.opcode==='data_setvariableto').map(block=>block.fields.VARIABLE[1]));
  if(variables.some(variable=>variable.scope==='global'&&!globalSetters.has(variable.id)))fail('ámbito global sin declaración Blockly representable');
  const blocks=sprite.blocks,used=new Set(),layout=[];
  const consume=id=>{const block=blocks[id];if(!block||used.has(id))fail('grafo no editable');used.add(id);return block;};
  const literal=(block,key)=>{
    const input=block.inputs[key];if(!input)fail('literal ausente');
    if(typeof input[1]==='string'){const child=consume(input[1]);if(definitions[child.opcode].kind!=='literal')fail('literal dinámico');return child.fields[child.opcode==='text'?'TEXT':'NUM'][0];}
    if(![4,5,6,7,8,10,11].includes(input[1][0]))fail('literal no editable');return input[1][1];
  };
  const expression=(block,key)=>{
    const input=block.inputs[key];if(!input)fail('expresión ausente');
    if(typeof input[1]!=='string'){if([4,5,6,7,8].includes(input[1][0])){const value=Number(input[1][1]);if(!Number.isFinite(value))fail('número inválido');return value;}fail('expresión compacta no editable');}
    const id=input[1],child=consume(id);
    if(child.opcode==='data_variable')return {kind:'variable',variableId:child.fields.VARIABLE[1],name:child.fields.VARIABLE[0],sourceBlockId:id};
    if(['operator_equals','operator_lt','operator_gt'].includes(child.opcode))return {kind:'compare',operator:{operator_equals:'EQ',operator_lt:'LT',operator_gt:'GT'}[child.opcode],left:expression(child,'OPERAND1'),right:expression(child,'OPERAND2'),sourceBlockId:id};
    if(definitions[child.opcode].kind==='literal'){const value=Number(child.fields.NUM[0]);if(Number.isFinite(value))return value;}
    fail('expresión fuera de IR0');
  };
  const menu=(block,key,opcode,field)=>{
    const input=block.inputs[key];if(!input)fail('menú ausente');
    if(typeof input[1]!=='string')return literal(block,key);
    const child=consume(input[1]);if(child.opcode!==opcode)fail('menú no representable');return child.fields[field][0];
  };
  function stack(first){const body=[];for(let id=first;id;){const block=consume(id),common={sourceBlockId:id};let node;
    switch(block.opcode){
      case 'motion_movesteps':node={kind:'move',steps:expression(block,'STEPS'),...common};break;
      case 'control_wait':node={kind:'wait',seconds:Number(literal(block,'DURATION')),...common};break;
      case 'control_repeat':node={kind:'repeat',count:Number(literal(block,'TIMES')),body:stack(block.inputs.SUBSTACK?.[1]??null),...common};break;
      case 'control_if':case 'control_if_else':node={kind:'if',condition:expression(block,'CONDITION'),body:stack(block.inputs.SUBSTACK?.[1]??null),elseBody:stack(block.inputs.SUBSTACK2?.[1]??null),...common};break;
      case 'event_broadcastandwait':{const message=String(literal(block,'BROADCAST_INPUT'));if(message!==message.trim())fail('mensaje no representable');node={kind:'broadcastWait',message,...common};break;}
      case 'control_create_clone_of':if(menu(block,'CLONE_OPTION','control_create_clone_of_menu','CLONE_OPTION')!=='_myself_')fail('clonar otro sprite');node={kind:'createClone',...common};break;
      case 'control_delete_this_clone':node={kind:'deleteClone',...common};break;
      case 'data_setvariableto':case 'data_changevariableby':node={kind:block.opcode==='data_setvariableto'?'setVariable':'changeVariable',variableId:block.fields.VARIABLE[1],name:block.fields.VARIABLE[0],value:expression(block,'VALUE'),...common};break;
      case 'looks_switchcostumeto':{const name=menu(block,'COSTUME','looks_costume','COSTUME');const costume=resourceList(resourceView,'costumes').find(item=>item.ownerId===sprite.id&&(item.id===name||item.name===name));if(!costume)fail('disfraz no editable');node={kind:'setCostume',costume:costume.id,...common};break;}
      case 'sound_play':case 'sound_playuntildone':{const name=menu(block,'SOUND_MENU','sound_sounds_menu','SOUND_MENU');const sound=resourceList(resourceView,'sounds').find(item=>item.ownerId===sprite.id&&(item.id===name||item.name===name));if(!sound)fail('sonido no editable');node={kind:'playSound',sound:sound.id,wait:block.opcode==='sound_playuntildone',...common};break;}
      case 'sound_stopallsounds':node={kind:'stopSounds',...common};break;
      default:fail('opcode fuera de IR0');
    }body.push(node);id=block.next;}return body;}
  const scripts=[];
  for(const [id,block]of Object.entries(blocks).filter(([,block])=>block.topLevel)){
    const event={event_whenflagclicked:'start',event_whenkeypressed:'key',event_whenthisspriteclicked:'click',event_whenbroadcastreceived:'message',control_start_as_clone:'clone'}[block.opcode];
    if(!event)fail('bloque suelto no editable');consume(id);
    if(event==='key'&&block.fields.KEY_OPTION[0]==='any')fail('tecla any no editable');
    if(event==='message'&&block.fields.BROADCAST_OPTION[0]!==block.fields.BROADCAST_OPTION[0].trim())fail('mensaje no representable');
    scripts.push({event,sourceBlockId:id,...(event==='key'?{key:block.fields.KEY_OPTION[0]}:event==='message'?{message:block.fields.BROADCAST_OPTION[0]}:{}),body:stack(block.next)});
    layout.push({sourceBlockId:id,x:block.x,y:block.y});
  }
  if(used.size!==Object.keys(blocks).length)fail('bloques huérfanos no editables');
  const ir={version:0,scripts,...(variables.length?{variables:variables.sort((a,b)=>a.id.localeCompare(b.id))}:{})};
  validateProgram(ir,{resourceView,resourceOwnerId:sprite.id});
  return {ir,initialScene:{spriteId:'hero',x:0,y:0,direction:90,size:100,costume:sprite.costumes[0]},layout};
}
