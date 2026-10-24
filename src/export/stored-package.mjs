// Standalone software packages use bounded ZIP STORE, separate from GGPROJ.
const utf8=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
export const packageLimits=Object.freeze({bytes:128*1024*1024,entries:4096,fileBytes:64*1024*1024});
const crcTable=Uint32Array.from({length:256},(_,v)=>{for(let i=0;i<8;i++)v=v&1?0xedb88320^(v>>>1):v>>>1;return v>>>0;});
function crc(bytes){let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return(value^0xffffffff)>>>0;}
function path(name){if(typeof name!=='string'||name.length>512||/[\\?#%\u0000-\u0020\u007f]/.test(name)||/^[A-Za-z]:/.test(name)||name.startsWith('/')||name.split('/').some(p=>!p||p==='.'||p==='..'))throw new Error('Invalid package path');}
export function createStoredPackage(entries){
 if(!Array.isArray(entries)||entries.length>packageLimits.entries||Object.keys(entries).length!==entries.length)throw new Error('Package entry limit');
 const locals=[],central=[],names=new Set();let offset=0;
 for(const entry of entries){
  if(!Array.isArray(entry)||entry.length!==2||Object.keys(entry).length!==2||!Object.hasOwn(entry,0)||!Object.hasOwn(entry,1))throw new Error('Invalid package entry');
  const [name,raw]=entry;
  path(name);if(names.has(name))throw new Error('Duplicate package path');names.add(name);
  const data=typeof raw==='string'?utf8.encode(raw):raw;if(!(data instanceof Uint8Array)||data.length>packageLimits.fileBytes)throw new Error('Invalid package bytes');
  const n=utf8.encode(name),sum=crc(data),header=new Uint8Array(30+n.length),v=new DataView(header.buffer);
  v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);v.setUint32(14,sum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,n.length,true);header.set(n,30);
  const c=new Uint8Array(46+n.length),cv=new DataView(c.buffer);cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);cv.setUint16(8,0x800,true);cv.setUint16(14,0x21,true);cv.setUint32(16,sum,true);cv.setUint32(20,data.length,true);cv.setUint32(24,data.length,true);cv.setUint16(28,n.length,true);cv.setUint32(42,offset,true);c.set(n,46);
  locals.push(header,data);central.push(c);offset+=header.length+data.length;
 }
 const centralSize=central.reduce((n,b)=>n+b.length,0),size=offset+centralSize+22;
 if(size>packageLimits.bytes)throw new Error('Package byte limit');
 const end=new Uint8Array(22),ev=new DataView(end.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
 const result=new Uint8Array(size);let cursor=0;for(const part of [...locals,...central,end]){result.set(part,cursor);cursor+=part.length;}return result;
}
export function readStoredPackage(bytes){
 if(!(bytes instanceof Uint8Array)||bytes.length<22||bytes.length>packageLimits.bytes)throw new Error('Invalid package size');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length),end=bytes.length-22;
 if(v.getUint32(end,true)!==0x06054b50||v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+20,true))throw new Error('Invalid ZIP end');
 const count=v.getUint16(end+10,true),central=v.getUint32(end+16,true),centralSize=v.getUint32(end+12,true);
 if(count>packageLimits.entries||v.getUint16(end+8,true)!==count||central+centralSize!==end)throw new Error('Invalid package inventory');
 const entries=[],names=new Set();let cursor=central,local=0;
 for(let i=0;i<count;i++){
  if(cursor+46>end||v.getUint32(cursor,true)!==0x02014b50)throw new Error('Invalid ZIP directory');
  const length=v.getUint32(cursor+24,true),nameLength=v.getUint16(cursor+28,true),offset=v.getUint32(cursor+42,true);
  if(v.getUint16(cursor+4,true)!==20||v.getUint16(cursor+6,true)!==20||v.getUint16(cursor+34,true)||v.getUint16(cursor+36,true)||v.getUint32(cursor+38,true)||v.getUint16(cursor+8,true)!==0x800||v.getUint16(cursor+10,true)||v.getUint32(cursor+20,true)!==length||v.getUint16(cursor+30,true)||v.getUint16(cursor+32,true)||offset!==local||length>packageLimits.fileBytes||cursor+46+nameLength>end||local+30+nameLength+length>central)throw new Error('Invalid stored entry');
  const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));path(name);if(names.has(name))throw new Error('Duplicate path');names.add(name);
  if(v.getUint32(local,true)!==0x04034b50||v.getUint16(local+4,true)!==20||v.getUint16(local+10,true)!==v.getUint16(cursor+12,true)||v.getUint16(local+12,true)!==v.getUint16(cursor+14,true)||v.getUint16(local+6,true)!==0x800||v.getUint16(local+8,true)||v.getUint32(local+18,true)!==length||v.getUint32(local+22,true)!==length||v.getUint16(local+26,true)!==nameLength||v.getUint16(local+28,true)||decoder.decode(bytes.subarray(local+30,local+30+nameLength))!==name)throw new Error('Mismatched ZIP local entry');
  const data=bytes.slice(local+30+nameLength,local+30+nameLength+length),sum=crc(data);
  if(sum!==v.getUint32(cursor+16,true)||sum!==v.getUint32(local+14,true))throw new Error('Package CRC mismatch');
  entries.push([name,data]);local+=30+nameLength+length;cursor+=46+nameLength;
 }
 if(cursor!==end||local!==central)throw new Error('Package trailing or unlisted bytes');return entries;
}
