// Closed JSON data shared by installed capability contracts; no engine objects.
export function fail(message,sourceBlockId){const error=new Error('GG capability: '+message);if(sourceBlockId)error.sourceBlockId=sourceBlockId;throw error;}
export function plain(value){return value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));}
export function fields(value,required,optional=[]){if(!plain(value)||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>!required.includes(k)&&!optional.includes(k)||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')))fail('propiedades inválidas');return value;}
export function list(value,max){if(!Array.isArray(value)||value.length>max||Object.keys(value).length!==value.length)fail('lista inválida');for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))fail('lista dispersa');return value;}
export function identifier(value){if(typeof value!=='string'||!value.length||value.length>128||!/^[-A-Za-z0-9:_]+$/.test(value)||['__proto__','constructor','prototype'].includes(value))fail('ID inválido');return value;}
export function finite(value,min=-1e6,max=1e6){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail('número fuera de dominio');return value;}
export function string(value,max=1024){if(typeof value!=='string'||value.length>max)fail('texto inválido');return value;}
export function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}
export function validateSchema(value,schema,depth=0){if(depth>12)fail('profundidad excedida');if(schema.enum&&!schema.enum.includes(value))fail('valor fuera de enum');if(schema.type==='json'){const visit=(v,d)=>{if(d>8)fail('JSON profundo');if(v===null||typeof v==='boolean')return;if(typeof v==='number'){finite(v);return;}if(typeof v==='string'){string(v,4096);return;}if(Array.isArray(v)){list(v,128);v.forEach(x=>visit(x,d+1));return;}if(plain(v)){if(Object.keys(v).length>128)fail('JSON grande');for(const [k,x]of Object.entries(v)){identifier(k);visit(x,d+1);}return;}fail('JSON inválido');};visit(value,0);return structuredClone(value);}
 if(schema.type==='object'){fields(value,schema.required??Object.keys(schema.properties),Object.keys(schema.properties).filter(k=>!(schema.required??Object.keys(schema.properties)).includes(k)));for(const [k,v]of Object.entries(value))validateSchema(v,schema.properties[k],depth+1);}
 else if(schema.type==='array'){list(value,schema.maxItems??128);if(value.length<(schema.minItems??0))fail('lista corta');value.forEach(v=>validateSchema(v,schema.items,depth+1));}
 else if(schema.type==='number'||schema.type==='integer'){finite(value,schema.minimum??-1e6,schema.maximum??1e6);if(schema.type==='integer'&&!Number.isInteger(value))fail('entero requerido');}
 else if(schema.type==='string'){string(value,schema.maxLength??1024);if(value.length<(schema.minLength??0)||schema.pattern&&!new RegExp(schema.pattern).test(value))fail('texto fuera de esquema');}
 else if(schema.type==='boolean'){if(typeof value!=='boolean')fail('boolean requerido');}
 else if(schema.type==='null'){if(value!==null)fail('null requerido');}
 else if(schema.anyOf){let valid=false;for(const item of schema.anyOf)try{validateSchema(value,item,depth+1);valid=true;break;}catch{}if(!valid)fail('unión inválida');}
 else fail('esquema no instalado');
 return structuredClone(value);}

// Decimal literal shared with native input[type=number]. No whitespace, hex,
// leading plus or trailing decimal point which HTML would silently sanitize.
export function parseCapabilityNumberLiteral(value){
 if(typeof value!=='string'||!/^-?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:[eE][-+]?[0-9]+)?$/.test(value))fail('literal numérico inválido');
 return finite(Number(value));
}
