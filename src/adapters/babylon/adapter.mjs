import {Engine} from '@babylonjs/core/Engines/engine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3,Color4} from '@babylonjs/core/Maths/math.color.js';
import {LoadAssetContainerAsync} from '@babylonjs/core/Loading/sceneLoader.js';
import {PointerEventTypes} from '@babylonjs/core/Events/pointerEvents.js';
import '@babylonjs/core/Collisions/collisionCoordinator.js';
import '@babylonjs/loaders/glTF/2.0/glTFLoader.js';
import {validateScene3DConfig} from '../../contracts/scene3d-program.mjs';
import {resolveOperationProfile,validateCapabilityOperation} from '../../contracts/operations.mjs';
import {validateResources,createResourceView,validateResourceView,decodeResourceAsset} from '../../contracts/resources.mjs';
import {inspectGlb} from '../../contracts/media-glb.mjs';
import {canonicalPackData} from '../../contracts/packs.mjs';

const radians=value=>value*Math.PI/180,degrees=value=>value*180/Math.PI;
const vector=value=>new Vector3(value.x,value.y,value.z),dto=value=>({x:value.x,y:value.y,z:value.z});
const abortError=()=>Object.assign(new Error('Preparación 3D cancelada.'),{name:'AbortError'});
const fail=message=>{throw new Error('Babylon: '+message);};
function pose(node,value){node.position.copyFrom(vector(value.position));node.rotationQuaternion=null;node.rotation.set(radians(value.rotationDegrees.x),radians(value.rotationDegrees.y),radians(value.rotationDegrees.z));node.scaling.copyFrom(vector(value.scale));}
function local(node){return {position:dto(node.position),rotationDegrees:{x:degrees(node.rotation.x),y:degrees(node.rotation.y),z:degrees(node.rotation.z)},scale:dto(node.scaling)};}

export function createBabylonAdapter({canvas=null,onEvent=()=>{},onDiagnostic=()=>{},
  engineFactory=surface=>new Engine(surface,true,{preserveDrawingBuffer:true,stencil:true})}={}) {
  let surface=canvas,active=null,epoch=0,disposed=false;
  const handles=new WeakMap(),pending=new Set();
  function destroy(bundle){
    if(!bundle||bundle.disposed)return;bundle.disposed=true;bundle.cancel?.();bundle.signal?.removeEventListener('abort',bundle.onAbort);pending.delete(bundle);
    bundle.resizeObserver?.disconnect();
    bundle.engine?.stopRenderLoop();
    for(const entry of bundle.instances??[])entry.dispose();
    for(const container of bundle.containers?.values()??[])container.dispose();
    bundle.scene?.dispose();bundle.engine?.dispose();
  }
  function check(bundle){if(disposed||bundle.disposed||bundle.epoch!==epoch||bundle.signal?.aborted)throw abortError();}
  async function bounded(promise,bundle){
    let timer,listener;
    const cancelled=new Promise((_,reject)=>{
      listener=()=>reject(abortError());bundle.signal?.addEventListener('abort',listener,{once:true});
      timer=setTimeout(()=>reject(new Error('La preparación 3D excedió 10 segundos.')),10000);
    });
    try{check(bundle);return await Promise.race([promise,cancelled,bundle.cancelled]);}
    finally{clearTimeout(timer);bundle.signal?.removeEventListener('abort',listener);}
  }
  function entitySnapshot(bundle,id){
    const item=bundle.entities.get(id);if(!item)fail('entidad no disponible: '+id);
    item.node.computeWorldMatrix(true);
    const matrix=item.node.getWorldMatrix();
    const result={id,name:item.definition.name,kind:item.definition.kind,parentId:item.definition.parentId,visible:item.node.isEnabled(),
      local:local(item.node),world:{position:dto(matrix.getTranslation()),matrix:[...matrix.asArray()]},
      geometry:{vertices:item.meshes.reduce((sum,mesh)=>sum+mesh.getTotalVertices(),0),indices:item.meshes.reduce((sum,mesh)=>sum+mesh.getTotalIndices(),0)}};
    if(item.light)result.light={intensity:item.light.intensity,diffuse:item.light.diffuse.toHexString()};
    return result;
  }
  function snapshot(){
    if(!active)return {contextId:'scene3d',documentId:null,rightHanded:true,entities:[],cameraArc:null};
    return {contextId:'scene3d',documentId:active.config.documentId,rightHanded:active.scene.useRightHandedSystem,
      entities:[...active.entities.keys()].map(id=>entitySnapshot(active,id)),cameraArc:{alpha:degrees(active.camera.alpha),beta:degrees(active.camera.beta),radius:active.camera.radius,target:dto(active.camera.target)}};
  }
  async function prepare(config,{resources,resourceView,signal}={}){
    if(disposed)fail('adaptador cerrado');
    const candidate=validateScene3DConfig(config);epoch++;
    for(const previous of [...pending])destroy(previous);
    const bundle={epoch,config:candidate,signal,canvas:surface?.cloneNode(false)??null,containers:new Map(),instances:[],entities:new Map(),disposed:false};
    bundle.cancelled=new Promise((_,reject)=>{bundle.cancel=()=>reject(abortError());});bundle.cancelled.catch(()=>{});
    pending.add(bundle);bundle.onAbort=()=>destroy(bundle);signal?.addEventListener('abort',bundle.onAbort,{once:true});
    try{
      check(bundle);const engine=engineFactory(bundle.canvas);
      if(bundle.disposed||signal?.aborted){engine.dispose();throw abortError();}
      bundle.engine=engine;bundle.scene=new Scene(bundle.engine);bundle.scene.useRightHandedSystem=true;bundle.scene.collisionsEnabled=true;
      bundle.scene.clearColor=new Color4(.94,.96,.95,1);
      const arc=candidate.scene.cameraArc;bundle.camera=new ArcRotateCamera('GG camera',radians(arc.alpha),radians(arc.beta),arc.radius,vector(arc.target),bundle.scene);
      bundle.scene.activeCamera=bundle.camera;
      let view,validated;
      if(candidate.scene.entities.some(entity=>entity.kind==='model')){
        validated=await bounded(validateResources(resources,{policy:'gg-resources-v2'}),bundle);check(bundle);
        view=createResourceView(validated,{contextId:'scene3d',documentId:candidate.documentId});
        if(resourceView&&canonicalPackData(validateResourceView(resourceView))!==canonicalPackData(view))fail('vista de recursos no coincide con los bytes');
      }
      for(const definition of candidate.scene.entities){
        check(bundle);
        const node=new TransformNode(definition.id,bundle.scene),properties=definition.properties,item={definition,node,meshes:[],light:null};bundle.entities.set(definition.id,item);
        pose(node,definition.transform);node.setEnabled(definition.visible);
        let mesh;
        if(definition.kind==='sphere')mesh=MeshBuilder.CreateSphere(definition.id+':mesh',{diameter:properties.diameter,segments:properties.segments},bundle.scene);
        else if(definition.kind==='box')mesh=MeshBuilder.CreateBox(definition.id+':mesh',{width:properties.width,height:properties.height,depth:properties.depth},bundle.scene);
        else if(definition.kind==='ground')mesh=MeshBuilder.CreateGround(definition.id+':mesh',{width:properties.width,height:properties.height,subdivisions:properties.subdivisions},bundle.scene);
        else if(definition.kind==='hemisphericLight')item.light=new HemisphericLight(definition.id+':light',vector(properties.direction),bundle.scene);
        else if(definition.kind==='pointLight')item.light=new PointLight(definition.id+':light',Vector3.Zero(),bundle.scene);
        else if(definition.kind==='model'){
          const binding=view.bindings.find(value=>value.id===properties.bindingId&&value.role==='mesh.geometry'&&value.owner.contextId==='scene3d'&&value.owner.documentId===candidate.documentId&&value.owner.targetId===definition.id);
          if(!binding)fail('modelo no pertenece a esta entidad/documento');
          let container=bundle.containers.get(binding.assetId);
          if(!container){
            const asset=validated.assets[binding.assetId];if(asset?.type!=='Model'||asset.format!=='glb')fail('asset de modelo no disponible');
            const inspected=inspectGlb(decodeResourceAsset(asset));
            container=await bounded(LoadAssetContainerAsync(inspected.bytes,bundle.scene,{pluginExtension:'.glb',name:binding.assetId+'.glb',
              pluginOptions:{gltf:{animationStartMode:0,createInstances:false,validate:false}}}).then(value=>{
              if(bundle.disposed){value.dispose();throw abortError();}return value;
            }),bundle);check(bundle);bundle.containers.set(binding.assetId,container);
          }
          const entry=container.instantiateModelsToScene(name=>definition.id+':'+name,false,{doNotInstantiate:true});bundle.instances.push(entry);
          for(const root of entry.rootNodes)root.parent=node;
          item.meshes=entry.rootNodes.flatMap(root=>[...(root.getTotalVertices?.()>0?[root]:[]),...root.getChildMeshes(false)]).filter(mesh=>mesh.getTotalVertices()>0);
        }
        if(mesh){mesh.parent=node;item.meshes=[mesh];const material=new StandardMaterial(definition.id+':material',bundle.scene);material.diffuseColor=Color3.FromHexString(properties.color);mesh.material=material;}
        if(item.light){item.light.parent=node;item.light.intensity=properties.intensity;item.light.diffuse=Color3.FromHexString(properties.diffuse);}
        for(const owned of item.meshes){owned.metadata={ggEntityId:definition.id};owned.checkCollisions=properties.collidable===true;owned.isPickable=true;}
      }
      for(const item of bundle.entities.values())item.node.parent=item.definition.parentId===null?null:bundle.entities.get(item.definition.parentId).node;
      for(const item of bundle.entities.values())for(const mesh of item.meshes)mesh.computeWorldMatrix(true);
      bundle.scene.onPointerObservable.add(event=>{
        if(active!==bundle||bundle.disposed||event.type!==PointerEventTypes.POINTERPICK)return;
        const targetId=event.pickInfo?.pickedMesh?.metadata?.ggEntityId;if(targetId)onEvent({type:'click',targetId});
      });
      await bounded(bundle.scene.whenReadyAsync(),bundle);check(bundle);
      const handle=Object.freeze({});handles.set(handle,bundle);return handle;
    }catch(error){destroy(bundle);throw error;}
  }
  function commit(handle){
    const bundle=handles.get(handle);if(!bundle||!pending.has(bundle))fail('candidato inválido');check(bundle);handles.delete(handle);pending.delete(bundle);bundle.signal?.removeEventListener('abort',bundle.onAbort);
    const previous=active;
    try{if(surface&&bundle.canvas)surface.replaceWith(bundle.canvas);}
    catch(error){destroy(bundle);throw error;}
    active=bundle;surface=bundle.canvas;
    if(surface){bundle.camera.attachControl(surface,true);bundle.engine.resize();
      if(typeof ResizeObserver==='function'){bundle.resizeObserver=new ResizeObserver(()=>{if(!bundle.disposed)bundle.engine.resize();});bundle.resizeObserver.observe(surface);}
      bundle.engine.runRenderLoop(()=>{
      if(active!==bundle||bundle.disposed)return;try{bundle.scene.render();}catch(error){bundle.engine.stopRenderLoop();onDiagnostic({level:'error',origin:'scene3d',code:'SCENE3D_RENDER',message:error.message});}
    });}
    destroy(previous);return snapshot();
  }
  function move(bundle,item,delta){
    const node=item.node,requested=node.position.add(vector(delta));
    const config=structuredClone(bundle.config),definition=config.scene.entities.find(entity=>entity.id===item.definition.id);definition.transform.position=dto(requested);validateScene3DConfig(config);
    if(!item.definition.properties.collidable||!item.meshes.length){node.position.copyFrom(requested);item.definition.transform.position=dto(node.position);return;}
    const body=item.meshes[0],parent=body.parent,position=body.position.clone(),rotation=body.rotation.clone(),quaternion=body.rotationQuaternion?.clone()??null,scaling=body.scaling.clone();
    const worldDelta=node.parent?Vector3.TransformNormal(vector(delta),node.parent.computeWorldMatrix(true)):vector(delta);
    for(const mesh of bundle.scene.meshes)mesh.computeWorldMatrix(true);
    const subtree=node.getChildMeshes(false).filter(mesh=>mesh.getTotalVertices()>0),excluded=subtree.filter(mesh=>mesh!==body).map(mesh=>[mesh,mesh.checkCollisions]);
    let minimum=new Vector3(Infinity,Infinity,Infinity),maximum=new Vector3(-Infinity,-Infinity,-Infinity);
    for(const mesh of subtree){const bounds=mesh.getBoundingInfo().boundingBox;minimum=Vector3.Minimize(minimum,bounds.minimumWorld);maximum=Vector3.Maximize(maximum,bounds.maximumWorld);}
    for(const [mesh]of excluded)mesh.checkCollisions=false;
    let actual;
    try{
      body.setParent(null);body.computeWorldMatrix(true);
      const extent=maximum.subtract(minimum).scale(.5),center=maximum.add(minimum).scale(.5);
      body.ellipsoid=new Vector3(Math.max(.01,extent.x),Math.max(.01,extent.y),Math.max(.01,extent.z));
      body.ellipsoidOffset=center.subtract(body.position);const before=body.position.clone();
      body.moveWithCollisions(worldDelta);actual=body.position.subtract(before);
    }finally{
      body.parent=parent;body.position.copyFrom(position);body.rotation.copyFrom(rotation);body.rotationQuaternion=quaternion;body.scaling.copyFrom(scaling);
      for(const [mesh,value]of excluded)mesh.checkCollisions=value;
    }
    const localDelta=node.parent?Vector3.TransformNormal(actual,node.parent.getWorldMatrix().clone().invert()):actual;
    definition.transform.position=dto(node.position.add(localDelta));validateScene3DConfig(config);node.position.addInPlace(localDelta);item.definition.transform.position=dto(node.position);
  }
  function call(operationId,args){
    if(disposed||!active)fail('no hay escena activa');
    const bundle=active,profile=resolveOperationProfile({contextId:'scene3d',documentId:bundle.config.documentId});
    args=validateCapabilityOperation(profile,operationId,args).args;
    if(operationId==='scene3d.snapshot')return snapshot();
    const item=args.targetId?bundle.entities.get(args.targetId):null;if(args.targetId&&!item)fail('entidad no disponible: '+args.targetId);
    if(operationId==='scene3d.getEntity')return entitySnapshot(bundle,args.targetId);
    if(operationId==='scene3d.move')move(bundle,item,args.delta);
    else if(operationId==='scene3d.setTransform'||operationId==='scene3d.setParent'){
      const config=structuredClone(bundle.config),definition=config.scene.entities.find(entity=>entity.id===args.targetId);
      if(operationId==='scene3d.setTransform')Object.assign(definition.transform,args.transform);else definition.parentId=args.parentId;
      validateScene3DConfig(config);
      if(operationId==='scene3d.setTransform')pose(item.node,definition.transform);else item.node.parent=args.parentId===null?null:bundle.entities.get(args.parentId).node;
      Object.assign(item.definition,definition);
    }else if(operationId==='scene3d.setCamera'){
      bundle.camera.setTarget(vector(args.target));bundle.camera.alpha=radians(args.alpha);bundle.camera.beta=radians(args.beta);bundle.camera.radius=args.radius;bundle.config.scene.cameraArc=structuredClone(args);
    }else if(operationId==='scene3d.setLight'){
      if(!item.light)fail('el objeto no es una luz');item.light.intensity=args.intensity;item.light.diffuse=Color3.FromHexString(args.diffuse);Object.assign(item.definition.properties,{intensity:args.intensity,diffuse:args.diffuse});
    }else fail('operación no implementada');
    return args.targetId?entitySnapshot(bundle,args.targetId):snapshot();
  }
  return Object.freeze({prepare,commit,snapshot,call,dispose(){if(disposed)return;disposed=true;epoch++;for(const bundle of [...pending])destroy(bundle);destroy(active);active=null;}});
}
