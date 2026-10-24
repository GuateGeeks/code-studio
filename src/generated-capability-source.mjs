import {createTextDocument} from './text-documents.mjs';
import {validateProgramIR1} from './contracts/program-ir1.mjs';
import {resolveOperationProfile} from './contracts/operations.mjs';
import {languageProfileMetadata} from './contracts/capability-language.mjs';
const js=value=>JSON.stringify(value).replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const py=value=>js(value).replaceAll('\\u2028','\\u2028').replaceAll('\\u2029','\\u2029');

export function generateCapabilityProgramSource(input,language,{profile}={}){
 if(!['javascript','python'].includes(language))throw new Error('Unsupported generated language');
 const ir=validateProgramIR1(input,{profile}),python=language==='python';
 profile=resolveOperationProfile({contextId:ir.contextId,documentId:ir.documentId});
 const lines=[],sourceMap=[],quote=python?py:js;let counter=0;
 const line=(text,ids=[],depth=0)=>{lines.push('  '.repeat(depth)+text);sourceMap.push([...new Set(ids.filter(Boolean))]);};
 function literal(value){
  if(value===null)return python?'None':'null';
  if(typeof value==='boolean')return python?value?'True':'False':String(value);
  if(typeof value==='number')return Object.is(value,-0)?'-0':String(value);
  if(typeof value==='string')return quote(value);
  if(Array.isArray(value))return '['+value.map(literal).join(', ')+']';
  return '{'+Object.entries(value).map(([key,item])=>quote(key)+': '+literal(item)).join(', ')+'}';
 }
 function expression(value,ids){
  if(!value||typeof value!=='object')return literal(value);
  if(value.sourceBlockId)ids.push(value.sourceBlockId);
  if(value.kind==='variable')return 'gg_state['+quote(value.variableId)+']';
  if(value.kind==='event')return 'gg_event(event, '+quote(value.path)+')';
  if(value.kind==='compare')return 'gg_compare('+quote(value.operator)+', '+expression(value.left,ids)+', '+expression(value.right,ids)+')';
  if(Array.isArray(value))return '['+value.map(item=>expression(item,ids)).join(', ')+']';
  return '{'+Object.entries(value).map(([key,item])=>quote(key)+': '+expression(item,ids)).join(', ')+'}';
 }
 line((python?'#':'//')+' API2: fuente derivada del BlockGraph; el intérprete ejecuta todo el control de flujo.');
 if(python){
  line('import math as gg_math');
  line('def gg_number(value):');line('if isinstance(value, bool) or not isinstance(value, (int, float)) or not gg_math.isfinite(value) or abs(value) > 1000000:',[],1);line('raise ValueError("Número fuera del dominio finito ±1e6")',[],2);line('return value',[],1);
  line('def gg_repeat(value):');line('value = gg_number(value)',[],1);line('if value < 0 or value > 1000 or int(value) != value:',[],1);line('raise ValueError("Repetición fuera de 0..1000")',[],2);line('return int(value)',[],1);
  line('def gg_seconds(value):');line('value = gg_number(value)',[],1);line('if value < 0 or value > 60:',[],1);line('raise ValueError("Espera fuera de 0..60 segundos")',[],2);line('return value',[],1);
  line('def gg_compare(op, left, right):');line('numeric = lambda value: isinstance(value, (int, float)) and not isinstance(value, bool)',[],1);line('same = (numeric(left) and numeric(right)) or type(left) is type(right)',[],1);line('if op == "EQ": return same and left == right',[],1);line('if not same or isinstance(left, bool) or left is None: raise ValueError("Comparación de tipos incompatibles")',[],1);line('return left < right if op == "LT" else left > right',[],1);
  line('def gg_event(event, path):');line('value = event',[],1);line('for part in path.split("."):',[],1);line('value = value[part]',[],2);line('return value',[],1);
 }else{
  line('const gg_number = value => { if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1000000) throw new Error("Número fuera del dominio finito ±1e6"); return value; };');
  line('const gg_repeat = value => { gg_number(value); if (!Number.isInteger(value) || value < 0 || value > 1000) throw new Error("Repetición fuera de 0..1000"); return value; };');
  line('const gg_seconds = value => { gg_number(value); if (value < 0 || value > 60) throw new Error("Espera fuera de 0..60 segundos"); return value; };');
  line('const gg_compare = (op,left,right) => { const same = typeof left === typeof right; if (op === "EQ") return same && left === right; if (!same || !["number","string"].includes(typeof left)) throw new Error("Comparación de tipos incompatibles"); return op === "LT" ? left < right : left > right; };');
  line('const gg_event = (event,path) => { let value=event; for (const part of path.split(".")) { if (!value || !Object.hasOwn(value,part)) throw new Error("Campo de evento ausente"); value=value[part]; } return value; };');
 }
 line((python?'gg_state = ':'const gg_state = ')+literal(Object.fromEntries(ir.variables.map(v=>[v.id,v.initialValue])))+(python?'':';'));
 line('GG.context.configure('+literal({contextId:ir.contextId,documentId:ir.documentId,variables:ir.variables})+')'+(python?'':';'));
 function guarded(text,ids,depth){
  if(python){line('try:',ids,depth);line(text,ids,depth+1);line('except Exception as gg_error:',ids,depth);line('raise RuntimeError(str(gg_error)) from None',ids,depth+1);}
  else{const number=lines.length+1;line('try { '+text+'; } catch (gg_error) { throw Object.assign(new Error(String(gg_error?.message ?? gg_error)), {lineNumber: '+number+'}); }',ids,depth);}
 }
 function body(nodes,depth,parent){
  if(!nodes.length&&python)line('pass',[parent],depth);
  for(const node of nodes){
   const ids=[node.sourceBlockId];
   if(node.kind==='call'){
    const descriptor=profile.operations.find(item=>item.id===node.operationId);
    guarded('await ctx.'+descriptor.publicPath.join('.')+'('+expression(node.args,ids)+')',ids,depth);
   }else if(node.kind==='setVariable'||node.kind==='changeVariable'){
    const target='gg_state['+quote(node.variableId)+']',value=expression(node.value,ids),variable=ir.variables.find(v=>v.id===node.variableId);
    const result=node.kind==='changeVariable'?'gg_number(gg_number('+target+') + gg_number('+value+'))':variable.type==='number'?'gg_number('+value+')':value;
    guarded(target+' = '+result,ids,depth);
   }else if(node.kind==='wait')guarded('await ctx.wait(gg_seconds('+expression(node.seconds,ids)+'))',ids,depth);
   else if(node.kind==='repeat'){
    const name='gg_repeat_'+counter++,count=expression(node.count,ids),bound=name+'_count';
    if(!python)line('let '+bound+';',ids,depth);
    guarded(bound+' = gg_repeat('+count+')',ids,depth);
    if(python){line('for '+name+' in range('+bound+'):',ids,depth);body(node.body,depth+1,node.sourceBlockId);}
    else{line('for (let '+name+' = 0; '+name+' < '+bound+'; '+name+'++) {',ids,depth);body(node.body,depth+1,node.sourceBlockId);line('}',[node.sourceBlockId],depth);}
   }else if(node.kind==='if'){
    const condition='gg_condition_'+counter++;if(!python)line('let '+condition+';',ids,depth);guarded(condition+' = '+expression(node.condition,ids),ids,depth);
    line(python?'if '+condition+':':'if ('+condition+') {',ids,depth);body(node.body,depth+1,node.sourceBlockId);
    if(node.elseBody.length){line(python?'else:':'} else {',[node.sourceBlockId],depth);body(node.elseBody,depth+1,node.sourceBlockId);}
    if(!python)line('}',[node.sourceBlockId],depth);
   }
  }
 }
 for(const [index,script]of ir.scripts.entries()){
  line('');line(python?'async def gg_handler_'+index+'(ctx, event):':'async function gg_handler_'+index+'(ctx, event) {',[script.sourceBlockId]);
  body(script.body,1,script.sourceBlockId);if(!python)line('}',[script.sourceBlockId]);
 }
 line('');
 for(const [index,script]of ir.scripts.entries())line('GG.context.when('+literal({event:script.event,targetId:script.targetId,...(script.key!==undefined?{key:script.key}:{})})+', gg_handler_'+index+')'+(python?'':';'),[script.sourceBlockId]);
 line('await GG.context.activate()'+(python?'':';'));
 const text=lines.join('\n');
 if(new TextEncoder().encode(text).length>65536)throw new Error('Generated program source exceeds 65536 UTF-8 bytes');
 return {text,sourceMap,requirements:{apiVersion:2,profile:languageProfileMetadata(profile)}};
}

export function createGeneratedCapabilityDocument(ir,language='javascript',{name='Bloques '+ir.contextId,...options}={}){
 const generated=generateCapabilityProgramSource(ir,language,options);
 const document=createTextDocument({language,name,source:generated.text});
 return {document,sourceMap:generated.sourceMap,profile:generated.requirements.profile,requirements:generated.requirements};
}
