// Generic data-only schema interpreter. No capability-specific branches.
const forbidden=new Set(['__proto__','constructor','prototype']);
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const fail=message=>{throw new Error('GG packs: '+message);};
function canonical(value){if(value===null||typeof value!=='object')return JSON.stringify(value);if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';}
export function validatePackJSON(value,{maxDepth=16,maxBytes=16384}={}) {
 function visit(item,depth) {
  if(depth>maxDepth)fail('configuración demasiado profunda');
  if(item===null||typeof item==='boolean'||typeof item==='string')return;
  if(typeof item==='number'&&Number.isFinite(item))return;
  if(Array.isArray(item)) {
   if(Object.keys(item).length!==item.length)fail('array disperso o propiedades extra');
   for(let index=0;index<item.length;index++){if(!Object.hasOwn(item,index))fail('array disperso');visit(item[index],depth+1);}return;
  }
  if(!plain(item))fail('se requieren datos JSON');
  for(const key of Object.keys(item))if(!Object.hasOwn(Object.getOwnPropertyDescriptor(item,key),'value'))fail('accessor no permitido');
  for(const [key,child]of Object.entries(item)){if(forbidden.has(key))fail('propiedad peligrosa');visit(child,depth+1);}
 }
 visit(value,0);
 if(new TextEncoder().encode(JSON.stringify(value)).length>maxBytes)fail('configuración demasiado grande');
 return value;
}
export function validatePackConfigSchema(value,definition,label='config') {
 if(!plain(definition))fail(label+': esquema inválido');
 if(Object.hasOwn(definition,'const')){if(canonical(value)!==canonical(definition.const))fail(label+': valor no soportado');return;}
 if(definition.enum&&(!Array.isArray(definition.enum)||!definition.enum.some(item=>canonical(item)===canonical(value))))fail(label+': valor no enumerado');
 if(definition.type==='json'){validatePackJSON(value,{maxDepth:definition.maxDepth??16,maxBytes:definition.maxBytes??16384});return;}
 if(definition.type==='object') {
  if(!plain(value))fail(label+': objeto requerido');
  for(const key of definition.required??[])if(!Object.hasOwn(value,key))fail(label+': falta '+key);
  for(const [key,item]of Object.entries(value)){
   const child=definition.properties?.[key];
   if(child)validatePackConfigSchema(item,child,label+'.'+key);
   else if(plain(definition.additionalProperties))validatePackConfigSchema(item,definition.additionalProperties,label+'.'+key);
   else if(definition.additionalProperties!==true)fail(label+': propiedad desconocida '+key);
  }
 }else if(definition.type==='array') {
  if(!Array.isArray(value)||Object.keys(value).length!==value.length||value.length<(definition.minItems??0)||value.length>(definition.maxItems??256))fail(label+': array inválido');
  for(let index=0;index<value.length;index++){if(!Object.hasOwn(value,index))fail(label+': array disperso');validatePackConfigSchema(value[index],definition.items,label+'['+index+']');}
 }else if(definition.type==='string') {
  if(typeof value!=='string'||(!value.trim()&&!definition.allowEmpty)||value.length<(definition.minLength??0)||value.length>(definition.maxLength??128)||definition.notEnum?.includes(value)||(definition.pattern!==undefined&&!new RegExp(definition.pattern).test(value)))fail(label+': texto inválido');
 }else if(definition.type==='number'||definition.type==='integer') {
  if(typeof value!=='number'||!Number.isFinite(value)||value<(definition.minimum??-Infinity)||value>(definition.maximum??Infinity)||(definition.type==='integer'&&!Number.isInteger(value)))fail(label+': número inválido');
 }else if(definition.type==='boolean') {
  if(typeof value!=='boolean')fail(label+': booleano requerido');
 }else fail(label+': esquema local no soportado');
}
