import {deflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {toScratchProject} from '../../../src/adapters/scratch/scratch-project.mjs';
import {crc32,writeSb3Archive} from '../../../src/adapters/scratch/sb3/export.mjs';
const encode=value=>new TextEncoder().encode(value);
const blue=encode('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" fill="#2358cd"/></svg>');
const green=encode('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#236146"/></svg>');
function wav(){const bytes=new Uint8Array(44+320),v=new DataView(bytes.buffer);bytes.set(encode('RIFF'));v.setUint32(4,bytes.length-8,true);bytes.set(encode('WAVEfmt '),8);v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);bytes.set(encode('data'),36);v.setUint32(40,320,true);for(let i=0;i<160;i++)v.setInt16(44+i*2,Math.round(Math.sin(i*Math.PI/8)*4000),true);return bytes;}
function png(){const chunk=(type,data)=>{const output=new Uint8Array(12+data.length),v=new DataView(output.buffer);v.setUint32(0,data.length);output.set(encode(type),4);output.set(data,8);v.setUint32(output.length-4,crc32(output.subarray(4,-4)));return output;};const ihdr=new Uint8Array(13);new DataView(ihdr.buffer).setUint32(0,1);new DataView(ihdr.buffer).setUint32(4,1);ihdr[8]=8;ihdr[9]=6;const chunks=[Uint8Array.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Uint8Array.from([0,0,0,0,0]))),chunk('IEND',new Uint8Array())];const bytes=new Uint8Array(chunks.reduce((n,b)=>n+b.length,0));let at=0;for(const b of chunks){bytes.set(b,at);at+=b.length;}return bytes;}
const md5=bytes=>createHash('md5').update(bytes).digest('hex');
function media(project,{transparent=false}={}){
 const assets=new Map(),image=transparent?png():blue,format=transparent?'png':'svg';
 const costume=(name,bytes,format='svg')=>{const id=md5(bytes),file=id+'.'+format;assets.set(file,bytes);return {name,assetId:id,md5ext:file,dataFormat:format,rotationCenterX:0,rotationCenterY:0,bitmapResolution:1};};
 for(const target of project.targets){target.costumes=[costume('hero',image,format),costume('hero-alt',green)];target.sounds=[];}
 return {assets,addSound(target,name='tone'){const bytes=wav(),id=md5(bytes),file=id+'.wav';assets.set(file,bytes);target.sounds.push({name,assetId:id,md5ext:file,dataFormat:'wav'});}};
}
const move=(id,steps)=>({kind:'move',sourceBlockId:id,steps});
const script=(id,body,event='start',extra={})=>({event,sourceBlockId:id,body,...extra});
const zeroVariable=(id,name=id,scope='local')=>({id,name,initialValue:0,scope});
function block(opcode,parent=null,next=null,inputs={},fields={},topLevel=false){return {opcode,parent,next,inputs,fields,shadow:false,topLevel,...(topLevel?{x:20,y:20}:{})};}
const lit=value=>[1,[typeof value==='number'?4:10,String(value)]];
function stack(target,steps,id='start'){
 target.blocks={[id]:block('event_whenflagclicked',null,steps.length?'b0':null,{}, {},true)};
 steps.forEach((step,index)=>{target.blocks['b'+index]=block(step.opcode,index?'b'+(index-1):id,index+1<steps.length?'b'+(index+1):null,step.inputs??{},step.fields??{});});
}
export function createSb3Fixtures(){
 const list=[],add=(id,title,ir,expected,mutate,options={})=>{
  const project=toScratchProject(ir).project,tools=media(project,options);mutate?.(project,tools);
  const bytes=writeSb3Archive([['project.json',encode(JSON.stringify(project))],...tools.assets]);
  list.push({id,title,license:'CC0-1.0',project,assets:tools.assets,bytes,expected});
 };
 add('01-start','Inicio y secuencia',{version:0,scripts:[script('start',[move('move',10)])]},{status:'gg-editable',x:10});
 add('02-key','Teclado',{version:0,scripts:[script('key',[move('move',12)],'key',{key:'space'})]},{status:'gg-editable',x:12,trigger:'key'});
 add('03-click','Clic',{version:0,scripts:[script('click',[move('move',7)],'click')]},{status:'gg-editable',x:7,trigger:'click'});
 add('04-concurrent','Hats concurrentes',{version:0,scripts:[script('one',[move('a',11)]),script('two',[move('b',2)])]},{status:'gg-editable',x:13});
 add('05-repeat','Repetición anidada',{version:0,scripts:[script('start',[{kind:'repeat',sourceBlockId:'loop',count:3,body:[move('move',4)]}])]},{status:'gg-editable',x:12});
 add('06-variables','Variables y condición',{version:0,variables:[zeroVariable('score')],scripts:[script('start',[
  {kind:'setVariable',sourceBlockId:'set',variableId:'score',name:'score',value:5},
  {kind:'if',sourceBlockId:'if',condition:{kind:'compare',sourceBlockId:'compare',operator:'GT',left:{kind:'variable',sourceBlockId:'read',variableId:'score',name:'score'},right:3},body:[{kind:'changeVariable',sourceBlockId:'inc',variableId:'score',name:'score',value:2}],elseBody:[]},
  move('move',{kind:'variable',sourceBlockId:'readmove',variableId:'score',name:'score'})])]},{status:'gg-editable',x:7,variables:{score:7}});
 add('07-broadcast','Broadcast con espera',{version:0,scripts:[script('start',[{kind:'broadcastWait',sourceBlockId:'send',message:'go'},move('after',2)]),script('receiver',[move('received',3)],'message',{message:'go'})]},{status:'gg-editable',x:5});
 add('08-clones','Clones con variable global',{version:0,variables:[zeroVariable('count','count','global')],scripts:[script('start',[{kind:'createClone',sourceBlockId:'create'}]),script('clone',[{kind:'changeVariable',sourceBlockId:'inc',variableId:'count',name:'count',value:1},{kind:'deleteClone',sourceBlockId:'delete'}],'clone')]},{status:'vm-compatible',x:0,globalVariables:{count:1}});
 add('09-sound','Sonido con espera',{version:0,scripts:[script('start',[{kind:'playSound',sourceBlockId:'sound',sound:'tone',wait:true},move('move',4)])]},{status:'gg-editable',x:4,audio:true},(p,tools)=>tools.addSound(p.targets[1]));
 add('10-costumes','Cambio de disfraz',{version:0,scripts:[script('start',[{kind:'setCostume',sourceBlockId:'costume',costume:'hero-alt'},move('move',2)])]},{status:'gg-editable',x:2,costume:1});
 add('11-initial','Variable inicial conservada',{version:0,variables:[zeroVariable('initial')],scripts:[script('start',[move('move',{kind:'variable',sourceBlockId:'read',variableId:'initial',name:'initial'})])]},{status:'vm-compatible',x:7},p=>p.targets[1].variables.initial[1]=7);
 add('12-two-sprites','Dos sprites',{version:0,scripts:[script('start',[move('move',10)])]},{status:'vm-compatible',sprites:{Azul:10,Verde:20}},p=>{p.targets[1].name='Azul';const second=structuredClone(p.targets[1]);second.name='Verde';second.layerOrder=2;second.blocks.move.inputs.STEPS=lit(20);p.targets.push(second);});
 add('13-lists','Listas ordenadas',{version:0,scripts:[]},{status:'vm-compatible',x:0,lists:{items:['C']}},p=>{const t=p.targets[1];t.lists={items:['items',[]]};stack(t,[
  {opcode:'data_addtolist',fields:{LIST:['items','items']},inputs:{ITEM:lit('A')}},
  {opcode:'data_insertatlist',fields:{LIST:['items','items']},inputs:{ITEM:lit('B'),INDEX:lit(1)}},
  {opcode:'data_replaceitemoflist',fields:{LIST:['items','items']},inputs:{ITEM:lit('C'),INDEX:lit(2)}},
  {opcode:'data_deleteoflist',fields:{LIST:['items','items']},inputs:{INDEX:lit(1)}}]);});
 add('14-unicode','Coerción Unicode y texto',{version:0,scripts:[]},{status:'vm-compatible',x:0,variables:{number:13,text:'Guate ñ'}},p=>{const t=p.targets[1];t.variables={number:['number','１２'],text:['text','']};stack(t,[
  {opcode:'data_changevariableby',fields:{VARIABLE:['number','number']},inputs:{VALUE:lit(1)}},
  {opcode:'data_setvariableto',fields:{VARIABLE:['text','text']},inputs:{VALUE:[2,'join']}}]);t.blocks.join=block('operator_join','b1',null,{STRING1:lit('Guate '),STRING2:lit('ñ')});});
 add('15-effects','Efectos y sprite oculto',{version:0,scripts:[]},{status:'vm-compatible',x:0,effects:{ghost:50,color:30},visible:false},p=>stack(p.targets[1],[
  {opcode:'looks_seteffectto',fields:{EFFECT:['GHOST',null]},inputs:{VALUE:lit(50)}},
  {opcode:'looks_seteffectto',fields:{EFFECT:['COLOR',null]},inputs:{VALUE:lit(30)}},{opcode:'looks_hide'}]));
 add('16-transparent','PNG transparente',{version:0,scripts:[script('start',[move('move',6)])]},{status:'gg-editable',x:6,transparent:true},undefined,{transparent:true});
 add('17-svg-audio','SVG azul y Stop de sonido',{version:0,scripts:[script('start',[{kind:'playSound',sourceBlockId:'sound',sound:'tone',wait:false},{kind:'stopSounds',sourceBlockId:'stop'},move('move',9)])]},{status:'vm-compatible',sprites:{Azul:9},audio:true},(p,tools)=>{p.targets[1].name='Azul';tools.addSound(p.targets[1]);tools.addSound(p.targets[1],'otro');});
 add('18-procedure','Procedimiento no habilitado',{version:0,scripts:[]},{status:'unsupported'},p=>{p.targets[1].blocks.proc=block('procedures_definition',null,null,{}, {},true);p.targets[1].blocks.proc.mutation={proccode:'test',warp:'true'};});
 add('19-extension','Extensión oficial no habilitada',{version:0,scripts:[]},{status:'unsupported'},p=>{p.extensions=['pen'];p.targets[1].blocks.pen=block('pen_clear',null,null,{}, {},true);});
 add('20-unknown','Opcode externo huérfano',{version:0,scripts:[]},{status:'unsupported'},p=>{p.targets[1].blocks.orphan=block('untrusted_execute',null,null,{}, {},true);});
 return list;
}
