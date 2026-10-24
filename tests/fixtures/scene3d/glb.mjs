// CC0-1.0. Triangle geometry and optional 1px blue PNG created for F6.
import {deflateSync} from 'node:zlib';
import {crc32} from '../../../src/contracts/sb3-archive.mjs';
export function bluePng({metadata=false}={}) {
  const chunk=(type,data=Buffer.alloc(0))=>{const bytes=Buffer.alloc(data.length+12);bytes.writeUInt32BE(data.length);bytes.write(type,4);Buffer.from(data).copy(bytes,8);bytes.writeUInt32BE(crc32(bytes.subarray(4,-4)),bytes.length-4);return bytes;};
  const header=Buffer.alloc(13);header.writeUInt32BE(1);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),...(metadata?[chunk('tEXt',Buffer.from('note\0inert'))]:[]),chunk('IDAT',deflateSync(Buffer.from([0,0,80,220,255]))),chunk('IEND')]);
}
export function encodeGlb(document,binary) {
  let json=Buffer.from(JSON.stringify(document));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
  const bin=Buffer.concat([Buffer.from(binary),Buffer.alloc((4-binary.length%4)%4)]),bytes=Buffer.alloc(28+json.length+bin.length);
  bytes.writeUInt32LE(0x46546c67);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.length,8);bytes.writeUInt32LE(json.length,12);bytes.writeUInt32LE(0x4e4f534a,16);json.copy(bytes,20);
  const offset=20+json.length;bytes.writeUInt32LE(bin.length,offset);bytes.writeUInt32LE(0x004e4942,offset+4);bin.copy(bytes,offset+8);return Uint8Array.from(bytes);
}
export function triangleData({textured=false,metadata=false}={}) {
  let binary=Buffer.alloc(textured?68:44);
  const positions=[-1,0,0,1,0,0,0,1,0];positions.forEach((value,index)=>binary.writeFloatLE(value,index*4));
  [0,1,2].forEach((value,index)=>binary.writeUInt16LE(value,36+index*2));
  const document={asset:{version:'2.0',generator:'GuateGeeks CC0 fixture'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'CC0 triangle',mesh:0}],
    meshes:[{primitives:[{attributes:{POSITION:0},indices:1}]}],buffers:[{byteLength:binary.length}],
    bufferViews:[{buffer:0,byteOffset:0,byteLength:36,target:34962},{buffer:0,byteOffset:36,byteLength:6,target:34963}],
    accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[-1,0,0],max:[1,1,0]},{bufferView:1,componentType:5123,count:3,type:'SCALAR'}]};
  if(textured){
    [0,0,1,0,0.5,1].forEach((value,index)=>binary.writeFloatLE(value,44+index*4));
    const image=bluePng({metadata});binary=Buffer.concat([binary,image]);
    document.bufferViews.push({buffer:0,byteOffset:44,byteLength:24,target:34962},{buffer:0,byteOffset:68,byteLength:image.length});
    document.accessors.push({bufferView:2,componentType:5126,count:3,type:'VEC2'});document.meshes[0].primitives[0].attributes.TEXCOORD_0=2;document.meshes[0].primitives[0].material=0;
    document.images=[{bufferView:3,mimeType:'image/png'}];document.textures=[{source:0}];document.materials=[{pbrMetallicRoughness:{baseColorTexture:{index:0},metallicFactor:0,roughnessFactor:1}}];document.buffers[0].byteLength=binary.length;
  }
  return {document,binary};
}
export const triangleGlb=options=>{const {document,binary}=triangleData(options);return encodeGlb(document,binary);};
