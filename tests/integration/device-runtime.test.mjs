import test from 'node:test';import assert from 'node:assert/strict';
import {validateDeviceScope,validateSimulatorDeviceScope,validateDeviceEvent,sameDeviceScope,validateFirmwareHex,selectFirmwareHex} from '../../src/contracts/device-runtime.mjs';
const base={sessionId:'session-one',deviceId:'microbit-main',deviceRevision:2,requestId:3};
const scope={...base,generation:'generation-one',sceneRevision:7};
const record=(type,data=[])=>{const a=[data.length,0,0,type,...data];a.push((-a.reduce((x,y)=>x+y,0))&255);return ':'+a.map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();};
const ordinary=[record(4,[0,0]),record(0,[1]),record(1)].join('\n');
const universal=[record(4,[0,0]),record(10,[0x99,0,0xc0,0xde]),record(0,[1]),record(4,[0,0]),record(10,[0x99,3,0xc0,0xde]),record(13,[2]),record(1)].join('\n');
test('GG-DEVICE-004: scopes and events reject extra authority, stale identity and malformed metadata',()=>{
 assert.deepEqual(validateDeviceScope(base),base);assert.deepEqual(validateSimulatorDeviceScope(scope),scope);
 assert.equal(sameDeviceScope(base,{...base,deviceRevision:3}),false);
 for(const v of [{...base,method:'sprite.move'},{...base,requestId:0},{...base,deviceRevision:NaN},[],null])assert.throws(()=>validateDeviceScope(v));
 const message={type:'device-event',version:1,session:base.sessionId,deviceScope:scope,seq:1,event:{kind:'button',button:'A',action:'pressed'}};
 assert.deepEqual(validateDeviceEvent(message),message);
 for(const v of [{...message,session:'other'},{...message,seq:0},{...message,event:{...message.event,method:'events.emit'}},{...message,event:{...message.event,button:'C'}}])assert.throws(()=>validateDeviceEvent(v));
});
test('GG-DEVICE-006: firmware validates checksum, complete variants and named compiler outputs',()=>{
 assert.equal(validateFirmwareHex(ordinary,{variant:'v1'}).records,3);
 assert.equal(validateFirmwareHex(ordinary+'\n'+record(14,[1,2]),{variant:'v1'}).records,4);
 assert.equal(validateFirmwareHex(universal).variant,'universal');
 assert.equal(validateFirmwareHex(universal.replace(/\n/g,'\n\n')).variant,'universal');
 assert.throws(()=>validateFirmwareHex(ordinary));
 assert.throws(()=>validateFirmwareHex(universal,{variant:'v2'}));
 assert.throws(()=>validateFirmwareHex(universal.replace('0100000001FE','0100000001FF')));
 assert.throws(()=>validateFirmwareHex(ordinary+'\n'+record(0,[3]),{variant:'v1'}));
 assert.throws(()=>validateFirmwareHex(universal.replace(record(13,[2])+'\n','')));
 assert.equal(selectFirmwareHex({success:true,outfiles:{'binary.hex':universal}},'universal').hex,universal);
 assert.throws(()=>selectFirmwareHex({success:false,outfiles:{'binary.hex':universal}},'universal'));
 assert.throws(()=>selectFirmwareHex({success:true,outfiles:{'binary.hex':universal}},'v1'));
});
