// Owned DTOs. An identifier is data; callers must also bind the authenticated port.
export const deviceRuntimeLimits = Object.freeze({hexBytes: 4 * 1024 * 1024, sourceBytes: 16384, eventsPerSecond: 20, eventsPerRun: 1024});
const fail = message => { throw new Error('GG device: ' + message); };
const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function exact(value, keys, label) {
  if (!plain(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail(label + ': propiedades inválidas');
}
function identifier(value, limit = 128) { return typeof value === 'string' && /^[a-zA-Z0-9._:-]+$/.test(value) && value.length <= limit && !['__proto__','constructor','prototype'].includes(value); }
function scopeFields(value) {
  if (!identifier(value.sessionId) || !identifier(value.deviceId,64) || !Number.isSafeInteger(value.deviceRevision) || value.deviceRevision < 0 ||
      !Number.isSafeInteger(value.requestId) || value.requestId < 1) fail('ámbito inválido');
}
export function validateDeviceScope(value) {
  exact(value,['sessionId','deviceId','deviceRevision','requestId'],'ámbito'); scopeFields(value);
  return {...value};
}
export function validateSimulatorDeviceScope(value) {
  exact(value,['sessionId','deviceId','deviceRevision','requestId','generation','sceneRevision'],'simulador');
  scopeFields(value);
  if (!identifier(value.generation) || !Number.isSafeInteger(value.sceneRevision) || value.sceneRevision < 0) fail('instancia inválida');
  return {...value};
}
export function sameDeviceScope(a,b) {
  return Boolean(a && b && ['sessionId','deviceId','deviceRevision','requestId'].every(key=>a[key]===b[key]));
}
export function sameSimulatorDeviceScope(a,b) {
  return sameDeviceScope(a,b) && a.generation===b.generation && a.sceneRevision===b.sceneRevision;
}
export function validateDeviceEvent(value) {
  exact(value,['type','version','session','deviceScope','seq','event'],'evento');
  if(value.type!=='device-event'||value.version!==1||!Number.isSafeInteger(value.seq)||value.seq<1) fail('sobre de evento inválido');
  const scope=validateSimulatorDeviceScope(value.deviceScope);
  if(value.session!==scope.sessionId)fail('sesión de evento inválida');
  exact(value.event,['kind','button','action'],'botón');
  if(value.event.kind!=='button'||value.event.action!=='pressed'||!['A','B','AB'].includes(value.event.button))fail('botón inválido');
  return {...value,deviceScope:scope,event:{...value.event}};
}
export const deviceButtonMessages=Object.freeze({A:'microbit-A',B:'microbit-B',AB:'microbit-AB'});
export function validateFirmwareHex(hex,{variant='universal'}={}) {
  if(!['v1','v2','universal'].includes(variant)||typeof hex!=='string'||!hex.trim()||new TextEncoder().encode(hex).length>deviceRuntimeLimits.hexBytes)fail('firmware inválido o demasiado grande');
  // PXT emits empty separator lines in universal files; preserve original bytes.
  const lines=hex.trim().split(/\r?\n/).filter(line=>line.length>0);
  let eof=false, data=false, universal=false, section=null;
  const boards=new Set(), boardData=new Set();
  for(let index=0;index<lines.length;index++){
    const line=lines[index];
    if(!/^:[0-9a-fA-F]+$/.test(line)||line.length%2!==1||line.length<11)fail('registro HEX inválido');
    const bytes=Uint8Array.from(line.slice(1).match(/../g),x=>Number.parseInt(x,16));
    if(bytes.length!==bytes[0]+5||[...bytes].reduce((a,b)=>(a+b)&255,0)!==0)fail('checksum HEX inválido');
    const type=bytes[3];
    // Universal HEX extends Intel HEX with block start/end/padding/custom data.
    if(![0,1,2,3,4,5,0x0a,0x0b,0x0c,0x0d,0x0e].includes(type))fail('tipo HEX desconocido');
    if(type===0){if(!bytes[0])fail('registro de datos vacío');data=true;}
    if(type===0x0a){
      if(bytes[0]<2)fail('sección HEX inválida');
      section=(bytes[4]<<8)|bytes[5];
      if(![0x9900,0x9903].includes(section)||boards.has(section))fail('placa HEX desconocida/duplicada');
      boards.add(section);
    }
    if(type===0&&section!==null){if(section!==0x9900)fail('datos V1 fuera de sección');boardData.add(section);}
    if(type===0x0d){if(section!==0x9903||!bytes[0])fail('datos V2 fuera de sección');boardData.add(section);}
    if(type===0x0b)section=null;
    if(type===1){if(eof)fail('fin HEX duplicado');if(bytes[0]!==0||bytes[1]!==0||bytes[2]!==0)fail('fin HEX inválido');eof=true;}
    if(type===4&&bytes[0]!==2)fail('dirección HEX inválida');
    if(type>=0x0a&&type<=0x0d)universal=true;
    // The pinned PXT target appends inert source metadata (0x0E) after EOF.
    // It remains checksummed and bounded; executable records after EOF fail.
    if(eof&&type!==1&&type!==0x0e)fail('datos después del fin HEX');
  }
  if(!eof||!data||(variant==='universal'&&(!universal||!boardData.has(0x9900)||!boardData.has(0x9903)))||(variant!=='universal'&&universal))fail('firmware incompleto o variante incompatible');
  return {variant,bytes:new TextEncoder().encode(hex).length,records:lines.length};
}
export function selectFirmwareHex(result,variant) {
  if(!result?.success)fail('compilación no aprobada');
  const key={v1:'mbdal-binary.hex',v2:'mbcodal-binary.hex',universal:'binary.hex'}[variant];
  if(!key)fail('variante inválida');
  const hex=result.outfiles?.[key];validateFirmwareHex(hex,{variant});
  return {hex,variant,fileName:'guategeeks-microbit-'+variant+'.hex'};
}
