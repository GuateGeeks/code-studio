import test from 'node:test';
import assert from 'node:assert/strict';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {createBabylonAdapter} from '../../src/adapters/babylon/adapter.mjs';
import {defaultScene3DConfig} from '../../src/contracts/scene3d-program.mjs';
import {prepareAsset,validateResources,createResourceView} from '../../src/contracts/resources.mjs';
import {triangleGlb} from '../fixtures/scene3d/glb.mjs';
const close=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-5,actual+' ≈ '+expected);
function harness(t,options={}){
  const engines=[],adapter=createBabylonAdapter({engineFactory:()=>{const engine=new NullEngine({renderWidth:256,renderHeight:256,textureSize:256});engines.push(engine);return engine;},...options});
  t.after(()=>adapter.dispose());return {adapter,engines};
}
const transform=(position={x:0,y:0,z:0},rotationDegrees={x:0,y:0,z:0},scale={x:1,y:1,z:1})=>({position,rotationDegrees,scale});
test('GG-F6-BABYLON: staging uses real geometry, right-handed matrices and detached DTOs without publishing a candidate',async t=>{
  const {adapter}=harness(t),config=defaultScene3DConfig(),before=structuredClone(config);
  const handle=await adapter.prepare(config);assert.equal(adapter.snapshot().entities.length,0);
  const snapshot=adapter.commit(handle);assert.equal(snapshot.rightHanded,true);assert.equal(snapshot.documentId,'scene-main');
  const sphere=snapshot.entities.find(item=>item.id==='sphere');assert.ok(sphere.geometry.vertices>20);assert.ok(sphere.geometry.indices>30);assert.equal(sphere.world.matrix.length,16);
  close(sphere.world.position.y,1);snapshot.entities[0].local.position.x=999;
  assert.equal(adapter.call('scene3d.getEntity',{targetId:'sphere'}).local.position.x,0);
  adapter.call('scene3d.move',{targetId:'sphere',delta:{x:1,y:0,z:0}});close(adapter.snapshot().entities[0].world.position.x,1);
  assert.deepEqual(config,before);assert.throws(()=>adapter.commit(handle),/candidato/);
});
test('GG-F6-BABYLON: hierarchy, degrees, local reparenting, camera and light calls use real engine transforms',async t=>{
  const {adapter}=harness(t),config=defaultScene3DConfig();
  config.scene.entities.unshift({id:'group',name:'Grupo',kind:'group',parentId:null,visible:true,transform:transform({x:5,y:0,z:0},{x:0,y:0,z:90},{x:2,y:2,z:2}),properties:{}});
  const sphere=config.scene.entities.find(item=>item.id==='sphere');sphere.parentId='group';sphere.transform.position={x:1,y:0,z:0};
  adapter.commit(await adapter.prepare(config));let value=adapter.call('scene3d.getEntity',{targetId:'sphere'});
  close(value.local.position.x,1);close(value.world.position.x,5);close(value.world.position.y,2);
  adapter.call('scene3d.move',{targetId:'sphere',delta:{x:1,y:0,z:0}});value=adapter.call('scene3d.getEntity',{targetId:'sphere'});
  close(value.local.position.x,2);close(value.world.position.x,5);close(value.world.position.y,4);
  const before=adapter.snapshot();assert.throws(()=>adapter.call('scene3d.setParent',{targetId:'group',parentId:'sphere'}),/jerarquía/);assert.deepEqual(adapter.snapshot(),before);
  value=adapter.call('scene3d.setParent',{targetId:'sphere',parentId:null});close(value.local.position.x,2);close(value.world.position.x,2);close(value.world.position.y,0);
  adapter.call('scene3d.setCamera',{alpha:90,beta:60,radius:12,target:{x:1,y:2,z:3}});close(adapter.snapshot().cameraArc.alpha,90);close(adapter.snapshot().cameraArc.beta,60);assert.equal(adapter.snapshot().cameraArc.radius,12);
  assert.deepEqual(adapter.snapshot().cameraArc.target,{x:1,y:2,z:3});
  const light=adapter.call('scene3d.setLight',{targetId:'light',intensity:.25,diffuse:'#112233'});assert.equal(light.light.intensity,.25);assert.equal(light.light.diffuse.toLowerCase(),'#112233');
  assert.throws(()=>adapter.call('scene3d.setLight',{targetId:'sphere',intensity:1,diffuse:'#ffffff'}),/no es una luz/);
});
test('GG-F6-BABYLON: moveWithCollisions stops the actual ellipsoid against box triangles and the opt-out moves freely',async t=>{
  for(const collidable of [true,false]){
    const {adapter}=harness(t),config=defaultScene3DConfig();config.scene.entities[0].properties.collidable=collidable;
    config.scene.entities.push({id:'wall',name:'Pared',kind:'box',parentId:null,visible:true,transform:transform({x:3,y:1,z:0}),properties:{width:1,height:4,depth:4,color:'#aabbcc',collidable:true}});
    adapter.commit(await adapter.prepare(config));const value=adapter.call('scene3d.move',{targetId:'sphere',delta:{x:5,y:0,z:0}});
    if(collidable){assert.ok(value.world.position.x>1.3&&value.world.position.x<1.6,'real collision stopped at '+value.world.position.x);}
    else close(value.world.position.x,5);
  }
});
test('GG-F6-BABYLON: superseded, aborted, foreign and invalid candidates preserve the live scene and release engines',async t=>{
  const {adapter,engines}=harness(t),config=defaultScene3DConfig();adapter.commit(await adapter.prepare(config));const before=adapter.snapshot();
  const invalid=structuredClone(config);invalid.scene.entities[0].parentId='missing';await assert.rejects(adapter.prepare(invalid));assert.deepEqual(adapter.snapshot(),before);
  const old=await adapter.prepare(config),next=await adapter.prepare(config);assert.throws(()=>adapter.commit(old),/candidato|cancelada/);assert.deepEqual(adapter.snapshot(),before);
  const other=harness(t);assert.throws(()=>other.adapter.commit(next),/candidato/);
  const inFlight=adapter.prepare(config),fresh=adapter.prepare(config);await assert.rejects(inFlight,{name:'AbortError'});await fresh;assert.deepEqual(adapter.snapshot(),before);
  const controller=new AbortController(),pending=adapter.prepare(config,{signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(adapter.snapshot(),before);
  adapter.dispose();assert.ok(engines.every(engine=>engine.isDisposed));assert.throws(()=>adapter.call('scene3d.move',{targetId:'sphere',delta:{x:1,y:0,z:0}}),/escena activa/);
  await assert.rejects(adapter.prepare(config),/cerrado/);
  const earlyAbort=new AbortController(),created=[];
  const aborted=harness(t,{engineFactory:()=>{const engine=new NullEngine();created.push(engine);earlyAbort.abort();return engine;}});
  await assert.rejects(aborted.adapter.prepare(config,{signal:earlyAbort.signal}),{name:'AbortError'});assert.ok(created.every(engine=>engine.isDisposed));
});
test('GG-F6-BABYLON: loader imports the validated CC0 GLB into staged containers and enforces qualified resource owners',async t=>{
  const {adapter}=harness(t),prepared=await prepareAsset(triangleGlb(),{type:'Model',format:'glb'});
  const input={version:2,assets:{[prepared.id]:prepared.asset},integrity:{[prepared.id]:prepared.integrity},bindings:[{id:'triangle-binding',name:'Triángulo CC0',owner:{contextId:'scene3d',documentId:'scene-main',targetId:'model'},role:'mesh.geometry',assetId:prepared.id,properties:{}}]};
  const resources=await validateResources(input,{policy:'gg-resources-v2'}),resourceView=createResourceView(resources,{contextId:'scene3d',documentId:'scene-main'}),config=defaultScene3DConfig();
  config.scene.entities.push({id:'model',name:'Modelo CC0',kind:'model',parentId:null,visible:true,transform:transform({x:3,y:0,z:0}),properties:{bindingId:'triangle-binding',collidable:true}});
  const handle=await adapter.prepare(config,{resources,resourceView});assert.equal(adapter.snapshot().entities.length,0);
  adapter.commit(handle);const model=adapter.call('scene3d.getEntity',{targetId:'model'});assert.deepEqual(model.geometry,{vertices:3,indices:3});close(model.world.position.x,3);assert.equal(adapter.snapshot().rightHanded,true);
  const before=adapter.snapshot(),foreign=structuredClone(input);foreign.bindings[0].owner.targetId='other';const wrong=await validateResources(foreign,{policy:'gg-resources-v2'});
  await assert.rejects(adapter.prepare(config,{resources:wrong}),/pertenece/);assert.deepEqual(adapter.snapshot(),before);
});
test('GG-F6-BABYLON: typed operation and finite position guards reject forged fields without engine mutation',async t=>{
  const {adapter}=harness(t);adapter.commit(await adapter.prepare(defaultScene3DConfig()));const before=adapter.snapshot();
  for(const [operation,args]of [['scene3d.move',{targetId:'sphere',delta:{x:Infinity,y:0,z:0}}],['scene3d.move',{targetId:'sphere',delta:{x:1,y:0,z:0},principal:'gg.3d-basic'}],['scene3d.setTransform',{targetId:'sphere',transform:{scale:{x:0,y:1,z:1}}}],['webapp.setText',{targetId:'sphere',text:'no'}],['scene3d.move',{targetId:'missing',delta:{x:1,y:0,z:0}}]])assert.throws(()=>adapter.call(operation,args));
  assert.deepEqual(adapter.snapshot(),before);
});
