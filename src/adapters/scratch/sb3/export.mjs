import {toScratchProject} from '../scratch-project.mjs';
import {validateResources,createResourceView,decodeResourceAsset} from '../../../contracts/resources.mjs';
const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,value)=>{for(let bit=0;bit<8;bit++)value=value&1?0xedb88320^(value>>>1):value>>>1;return value>>>0;});
export function crc32(bytes){let value=0xffffffff;for(const byte of bytes)value=crcTable[(value^byte)&255]^(value>>>8);return (value^0xffffffff)>>>0;}
// RFC1321 MD5 is used only for Scratch filenames. SHA256 remains asset integrity.
export function scratchMd5(bytes){
  const length=Math.ceil((bytes.length+9)/64)*64,data=new Uint8Array(length);data.set(bytes);data[bytes.length]=128;
  const view=new DataView(data.buffer);view.setUint32(length-8,(bytes.length*8)>>>0,true);view.setUint32(length-4,Math.floor(bytes.length/536870912),true);
  let a0=0x67452301,b0=0xefcdab89,c0=0x98badcfe,d0=0x10325476;
  const shifts=[7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
  for(let offset=0;offset<length;offset+=64){let a=a0,b=b0,c=c0,d=d0;
    for(let index=0;index<64;index++){let f,g;if(index<16){f=(b&c)|(~b&d);g=index;}else if(index<32){f=(d&b)|(~d&c);g=(5*index+1)%16;}else if(index<48){f=b^c^d;g=(3*index+5)%16;}else{f=c^(b|~d);g=(7*index)%16;}
      const sum=(a+f+Math.floor(Math.abs(Math.sin(index+1))*4294967296)+view.getUint32(offset+g*4,true))|0;
      const shift=shifts[Math.floor(index/16)*4+index%4],next=d;d=c;c=b;b=(b+((sum<<shift)|(sum>>>(32-shift))))|0;a=next;
    }a0=(a0+a)|0;b0=(b0+b)|0;c0=(c0+c)|0;d0=(d0+d)|0;
  }
  const result=new Uint8Array(16),out=new DataView(result.buffer);[a0,b0,c0,d0].forEach((value,index)=>out.setInt32(index*4,value,true));
  return Array.from(result,byte=>byte.toString(16).padStart(2,'0')).join('');
}
export function writeSb3Archive(entries){
  if(!Array.isArray(entries)||entries.length<1||entries.length>64)throw new Error('SB3 export: entry limit');
  const names=new Set(),parts=[],central=[];let offset=0,total=0;
  for(const [name,data]of entries){
    if(typeof name!=='string'||!/^(?:project\.json|[a-f0-9]{32}\.(?:svg|png|wav))$/.test(name)||names.has(name)||!(data instanceof Uint8Array))throw new Error('SB3 export: invalid entry');
    names.add(name);total+=data.length;if(total>512*1024)throw new Error('SB3 export: expansion limit');
    const path=encoder.encode(name),local=new Uint8Array(30+path.length),v=new DataView(local.buffer),crc=crc32(data);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,0x21,true);
    v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,path.length,true);local.set(path,30);
    const directory=new Uint8Array(46+path.length),d=new DataView(directory.buffer);
    d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,0x21,true);
    d.setUint32(16,crc,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,path.length,true);d.setUint32(42,offset,true);directory.set(path,46);
    parts.push(local,data);central.push(directory);offset+=local.length+data.length;
  }
  const size=central.reduce((sum,item)=>sum+item.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
  v.setUint32(0,0x06054b50,true);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);
  const output=new Uint8Array(offset+size+22);let at=0;for(const part of [...parts,...central,end]){output.set(part,at);at+=part.length;}
  if(output.length>256*1024)throw new Error('SB3 export: archive limit');
  return output;
}
export async function exportSb3Initial({ir,resources}){
  const snapshot=await validateResources(resources),view=createResourceView(snapshot);
  const {project}=toScratchProject(ir,{resourceView:view}),entries=new Map();
  project.targets.forEach((target,index)=>{
    const ownerId=index===0?'stage':'hero';
    target.costumes=view.costumes.filter(item=>item.ownerId===ownerId).map(item=>{
      const asset=snapshot.assets[item.assetId],bytes=decodeResourceAsset(asset),md5=scratchMd5(bytes),path=md5+'.'+asset.format;entries.set(path,bytes);
      return {name:item.id,assetId:md5,md5ext:path,dataFormat:asset.format,rotationCenterX:item.centerX,rotationCenterY:item.centerY,bitmapResolution:item.bitmapResolution};
    });
    target.sounds=view.sounds.filter(item=>item.ownerId===ownerId).map(item=>{
      const bytes=decodeResourceAsset(snapshot.assets[item.assetId]),md5=scratchMd5(bytes),path=md5+'.wav';entries.set(path,bytes);return {name:item.id,assetId:md5,md5ext:path,dataFormat:'wav'};
    });
    if(!target.costumes.length)throw new Error('SB3 export: initial costume missing');
  });
  const manifest=encoder.encode(JSON.stringify(project));if(manifest.length>128*1024)throw new Error('SB3 export: manifest limit');
  return writeSb3Archive([['project.json',manifest],...entries]);
}
