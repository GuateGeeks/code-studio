const commands=new Set(['prepare','commit','call','snapshot','stop']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function validateContextEnvelope(value,{sessionId,revision=null,lastSequence=-1}={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==7||Object.keys(value).some(k=>!['protocolVersion','sessionId','revision','sequence','requestId','command','payload'].includes(k))||
 value.protocolVersion!==1||!uuid.test(value.sessionId)||value.sessionId!==sessionId||!Number.isSafeInteger(value.sequence)||value.sequence<=lastSequence||value.requestId!==value.sequence||
 !commands.has(value.command)||!Number.isSafeInteger(value.revision)||value.revision<0||(revision!==null&&value.revision!==revision)||
 new TextEncoder().encode(JSON.stringify(value)).length>3*1024*1024)throw new Error('Invalid context channel message');
 return value;
}

export function validateContextPayload(command,payload){
 const keys=command==='prepare'?['config','resources','capabilities']:command==='call'?['operationId','args']:[];
 if(!commands.has(command)||!payload||typeof payload!=='object'||Array.isArray(payload)||![Object.prototype,null].includes(Object.getPrototypeOf(payload))||Object.keys(payload).length!==keys.length||keys.some(key=>!Object.hasOwn(payload,key)))throw new Error('Invalid context command payload');
 return payload;
}
