import test from 'node:test';
import assert from 'node:assert/strict';
import {inflateSync} from 'node:zlib';
import {inspectGlb,glbLimits} from '../../src/contracts/media-glb.mjs';
import {triangleGlb,triangleData,encodeGlb} from '../fixtures/scene3d/glb.mjs';

test('GG-F6-GLB: own CC0 static indexed geometry and embedded PNG produce detached bounded inspection data',()=>{
  for(const textured of [false,true]){
    const original=triangleGlb({textured}),before=original.slice(),result=inspectGlb(Buffer.from(original));
    assert.deepEqual(result.metadata,{nodes:1,primitives:1,vertices:3,indices:3,images:textured?1:0,imagePixels:textured?1:0});
    assert.deepEqual(result.bytes,before);result.bytes[0]=0;assert.deepEqual(original,before);
    if(textured){assert.equal(result.images[0].width,1);assert.equal(inflateSync(result.images[0].idat).length,result.images[0].expectedInflatedBytes);}
  }
});
test('GG-F6-GLB: headers, chunk layout, padding, UTF8 and inventory reject before any loader',()=>{
  const corrupt=mutate=>{const bytes=triangleGlb();mutate(new DataView(bytes.buffer),bytes);assert.throws(()=>inspectGlb(bytes),/GLB:/);};
  corrupt(view=>view.setUint32(0,0,true));corrupt(view=>view.setUint32(4,1,true));corrupt(view=>view.setUint32(8,123,true));
  corrupt(view=>view.setUint32(12,1,true));corrupt(view=>view.setUint32(16,0,true));corrupt((_,bytes)=>bytes[20]=255);
  assert.throws(()=>inspectGlb(new Uint8Array(glbLimits.bytes+1)),/512 KiB/);
  for(const mutate of [document=>document.buffers[0].uri='https://example.invalid/file.bin',document=>document.extensionsUsed=['KHR_draco_mesh_compression'],
    document=>document.animations=[],document=>document.skins=[],document=>document.meshes[0].primitives[0].targets=[],document=>document.nodes[0].camera=0,
    document=>document.accessors[0].sparse={},document=>document.asset.minVersion='3.0']){
    const {document,binary}=triangleData();mutate(document);assert.throws(()=>inspectGlb(encodeGlb(document,binary)),/GLB:/);
  }
});
test('GG-F6-GLB: byte ranges/alignment, accessor counts, finite values, bounds and actual index values are enforced',()=>{
  for(const mutate of [(document)=>document.bufferViews[0].byteLength=200,(document)=>document.bufferViews[0].byteOffset=2,
    document=>document.accessors[0].byteOffset=2,document=>document.accessors[0].count=300,document=>document.accessors[0].max=[2,1,0],
    document=>document.accessors[0].componentType=5123,document=>document.meshes[0].primitives[0].mode=1,
    (_,binary)=>binary.writeFloatLE(NaN,0),(_,binary)=>binary.writeFloatLE(Infinity,0),(_,binary)=>binary.writeUInt16LE(3,36),
    document=>document.accessors[1].normalized=true,document=>document.bufferViews[1].byteStride=4]){
    const {document,binary}=triangleData();mutate(document,binary);assert.throws(()=>inspectGlb(encodeGlb(document,binary)),/GLB:/);
  }
  const {document,binary}=triangleData();document.meshes[0].primitives=Array.from({length:65},()=>structuredClone(document.meshes[0].primitives[0]));
  assert.throws(()=>inspectGlb(encodeGlb(document,binary)),/GLB:/);
});
test('GG-F6-GLB: scene graph cycles, multiple parents, deep trees, degenerate transforms and large inventories fail',()=>{
  for(const mutate of [document=>document.nodes[0].children=[0],document=>{document.nodes.push({children:[0]});document.nodes[0].children=[1];},
    document=>{document.nodes=[{children:[2]},{children:[2]},{}];document.scenes[0].nodes=[0,1];},
    document=>{document.nodes=Array.from({length:9},(_,index)=>index<8?{children:[index+1]}:{mesh:0});},
    document=>document.nodes[0].rotation=[0,0,0,0],document=>document.nodes[0].scale=[1,0,1],
    document=>document.nodes[0].matrix=Array(16).fill(0),document=>document.nodes=Array.from({length:33},()=>({mesh:0}))]){
    const {document,binary}=triangleData();mutate(document);assert.throws(()=>inspectGlb(encodeGlb(document,binary)),/GLB:/);
  }
});
test('GG-F6-GLB: aggregate primitive vertex/index quotas count reused accessor data rather than only BIN size',()=>{
  const manyVertices=triangleData(),vertexBin=Buffer.alloc(4808);manyVertices.binary.copy(vertexBin,0,0,36);manyVertices.binary.copy(vertexBin,4800,36,42);
  manyVertices.document.buffers[0].byteLength=vertexBin.length;manyVertices.document.bufferViews[0].byteLength=4800;manyVertices.document.bufferViews[1].byteOffset=4800;manyVertices.document.accessors[0].count=400;
  manyVertices.document.meshes[0].primitives=Array.from({length:51},()=>({attributes:{POSITION:0},indices:1}));
  assert.throws(()=>inspectGlb(encodeGlb(manyVertices.document,vertexBin)),/cuota de vértices/);
  const manyIndices=triangleData(),indexBin=Buffer.alloc(120036);manyIndices.binary.copy(indexBin,0,0,36);
  for(let index=0;index<60000;index++)indexBin.writeUInt16LE(index%3,36+index*2);
  manyIndices.document.buffers[0].byteLength=indexBin.length;manyIndices.document.bufferViews[1].byteLength=120000;manyIndices.document.accessors[1].count=60000;
  manyIndices.document.meshes[0].primitives.push(structuredClone(manyIndices.document.meshes[0].primitives[0]));
  assert.throws(()=>inspectGlb(encodeGlb(manyIndices.document,indexBin)),/cuota de índices/);
});
test('GG-F6-GLB: URI textures, codecs, foreign MIME and PNG metadata cannot reach the loader through BIN',()=>{
  assert.throws(()=>inspectGlb(triangleGlb({textured:true,metadata:true})),/metadatos PNG/);
  for(const mutate of [document=>document.images[0].uri='data:image/png;base64,anything',document=>document.images[0].mimeType='image/jpeg',
    document=>document.textures[0].extensions={KHR_texture_basisu:{source:0}},document=>document.materials[0].extensions={KHR_materials_unlit:{}},
    document=>document.materials[0].pbrMetallicRoughness.baseColorTexture.texCoord=1]){
    const {document,binary}=triangleData({textured:true});mutate(document);assert.throws(()=>inspectGlb(encodeGlb(document,binary)),/GLB:/);
  }
});
