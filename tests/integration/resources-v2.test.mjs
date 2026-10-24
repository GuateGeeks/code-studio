import {loadWorkspace,workspaceToIR} from '../../src/editor/block-program.mjs';
import {authorizeProgram,authorizeProjectOperation} from '../../src/contracts/pack-broker.mjs';
import {toScratchProject} from '../../src/adapters/scratch/scratch-project.mjs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {xcratchRoot} from '../../spikes/paths.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {prepareAsset,validateResources,validateResources2,promoteResources2,projectContextResources,mergeContextResources,createResourceView,validateResourceView2,getResourceBinding,applyResourceEdit,cloneValidatedResources} from '../../src/contracts/resources.mjs';
import {createResourceStore} from '../../src/resource-store.mjs';
import {createProject,upgradeProject,validateProject} from '../../src/project-format.mjs';
import {createProjectArchive,parseProjectArchive} from '../../src/project-archive.mjs';
import {createCapabilities,selectCapabilityLocksForContext} from '../../src/contracts/packs.mjs';
import {defaultWebAppConfig} from '../../src/contracts/webapp-program.mjs';
import {defaultScene3DConfig,validateScene3DConfig} from '../../src/contracts/scene3d-program.mjs';
import {createTextDocument} from '../../src/text-documents.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {triangleGlb} from '../fixtures/scene3d/glb.mjs';
const svg=new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4"><rect width="4" height="4" fill="#f00"/></svg>');
async function sample(){
 const image=await prepareAsset(svg,{type:'Image',format:'svg'});
 const v1=await validateResources({version:1,assets:{[image.id]:image.asset},integrity:{[image.id]:image.integrity},costumes:[{id:'hero',ownerId:'hero',name:'Hero',assetId:image.id,centerX:2,centerY:2,bitmapResolution:1}],sounds:[]});
 const v2=await promoteResources2(v1),model=await prepareAsset(triangleGlb({textured:true}),{type:'Model',format:'glb'});
 const next=structuredClone(v2);next.assets[model.id]=model.asset;next.integrity[model.id]=model.integrity;
 next.bindings.push({id:'model-binding',owner:{contextId:'scene3d',documentId:'scene-main',targetId:'model'},role:'mesh.geometry',assetId:model.id,name:'Triángulo',properties:{}});
 next.bindings.push({id:'web-image',owner:{contextId:'webapp',documentId:'web-main',targetId:'image'},role:'web.image',assetId:image.id,name:'Imagen',properties:{}});
 return {v1,v2:await validateResources2(next),image,model};
}
const oldSource=await readFile(new URL('../../src/assets/hero.svg',import.meta.url),'utf8'),oldId=createHash('md5').update(oldSource).digest('hex');
const catalog=await buildProjectCatalog({assets:{[oldId]:oldSource},costumes:[[],[{assetId:oldId,name:'hero',rotationCenterX:24,rotationCenterY:24}]],sounds:[]});
test('GG-F6-RESOURCES: explicit 1→2 preserves bytes, SHA, descriptor order/IDs and qualified owners',async()=>{
 const {v1}=await sample(),v2=await promoteResources2(v1);
 assert.deepEqual(v2.assets,v1.assets);assert.deepEqual(v2.integrity,v1.integrity);assert.equal(v2.bindings[0].id,'hero');assert.deepEqual(v2.bindings[0].owner,{contextId:'scratch-2d',documentId:'scene-main',targetId:'hero'});
 assert.deepEqual(projectContextResources(v2),v1);assert.deepEqual(createResourceView(v2),createResourceView(v1));
 const broken=structuredClone(v2);broken.assets[Object.keys(broken.assets)[0]].data='AA==';await assert.rejects(()=>validateResources2(broken));
 assert.throws(()=>createResourceView(structuredClone(v2)),/validación/);
});
test('GG-F6-RESOURCES: model preflight and context metadata stay separate from Scratch projection',async()=>{
 const {v2,model}=await sample(),view=createResourceView(v2,{contextId:'scene3d',documentId:'scene-main'});
 assert.equal(view.version,2);assert.deepEqual(view.assets.find(a=>a.id===model.id).model,{nodes:1,primitives:1,vertices:3,indices:3,images:1,imagePixels:1});
 assert.equal(view.bindings.length,1);assert.ok(getResourceBinding(view,'model-binding',{contextId:'scene3d',documentId:'scene-main',targetId:'model',role:'mesh.geometry'}));
 assert.equal(getResourceBinding(view,'model-binding',{targetId:'hero'}),null);
 const scratch=projectContextResources(v2);assert.ok(!Object.hasOwn(scratch.assets,model.id));assert.deepEqual(scratch.costumes.map(c=>c.id),['hero']);
 assert.throws(()=>validateResourceView2({...view,bindings:Array(1)}));
 const forged=structuredClone(view);forged.assets.find(a=>a.id===model.id).model.vertices=20001;assert.throws(()=>validateResourceView2(forged));
 await assert.rejects(()=>prepareAsset(new Uint8Array(512*1024+1),{type:'Model',format:'glb'}));
 await assert.rejects(()=>validateResources({version:1,assets:{[model.id]:model.asset},integrity:{[model.id]:model.integrity},costumes:[],sounds:[]}));
});
test('GG-F6-RESOURCES: editing a v1 projection merges without erasing models or other documents',async()=>{
 const {v2,model}=await sample(),scratch=projectContextResources(v2),edited=await applyResourceEdit(scratch,{type:'rename-costume',id:'hero',name:'Renombrado'});
 const merged=await mergeContextResources(v2,edited);assert.equal(merged.bindings.find(b=>b.id==='hero').name,'Renombrado');
 assert.deepEqual(merged.bindings.filter(b=>b.owner.contextId!=='scratch-2d'),v2.bindings.filter(b=>b.owner.contextId!=='scratch-2d'));
 assert.deepEqual(merged.assets[model.id],v2.assets[model.id]);assert.equal(v2.bindings[0].name,'Hero');
 const store=createResourceStore({catalog,resources:v2}),checkpoint=store.checkpoint();assert.equal(store.view().version,1);assert.equal(store.view({contextId:'scene3d'}).version,2);
 const candidate=store.prepare(await store.mergeContext(edited));store.commit(candidate);assert.equal(store.view().costumes[0].name,'Renombrado');store.restoreDraft(checkpoint);assert.deepEqual(store.capture(),v2);
});
test('GG-F6-RESOURCES: closed role metadata, duplicate IDs, owner mismatch and quotas reject atomically',async()=>{
 const {v2}=await sample();
 for(const mutate of [r=>r.bindings[1].owner.contextId='webapp',r=>r.bindings.push(r.bindings[0]),r=>r.bindings[1].properties.url='https://x',r=>r.bindings=Array(1),r=>r.integrity.extra={bytes:1,sha256:'x'}]){const r=structuredClone(v2);mutate(r);await assert.rejects(()=>validateResources2(r));}
 const config=defaultScene3DConfig();config.scene.entities.push({id:'model',name:'Model',kind:'model',parentId:null,visible:true,transform:{position:{x:0,y:0,z:0},rotationDegrees:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}},properties:{bindingId:'model-binding',collidable:true}});
 validateScene3DConfig(config,{resourceView:createResourceView(v2,{contextId:'scene3d'})});
 config.scene.entities.at(-1).id='other';assert.throws(()=>validateScene3DConfig(config,{resourceView:createResourceView(v2,{contextId:'scene3d'})}));
});
test('GG-F6-RESOURCES: GGPROJ3 STORE2 roundtrip is explicit and rejects downgrade or dangling source documents',async()=>{
 const {v1,v2}=await sample(),capabilities=createCapabilities(['gg.3d-advanced','gg.webapps','gg.sprites']);
 const model=await createProject({name:'F6',blockly:{blocks:{languageVersion:0,blocks:[]}},deviceSource:'legacy',catalog,resources:v2,capabilities});
 const zip=await createProjectArchive(model,{catalog}),opened=await parseProjectArchive(zip,{catalog});assert.deepEqual(opened,model);assert.equal(opened.resources.version,2);
 await assert.rejects(()=>upgradeProject(model,{catalog,capabilities:createCapabilities(['gg.assets'])}),/downgrade/);
 const old=await createProject({name:'F5',blockly:{},deviceSource:'',catalog,resources:v1,capabilities:createCapabilities(['gg.assets'])});
 const promoted=await upgradeProject(old,{catalog,capabilities});assert.deepEqual(promoted.resources.assets,v1.assets);assert.equal(old.resources.version,1);
 const wrong=structuredClone(model);wrong.capabilities.config['gg.webapps'].selectedTextDocumentId='text-00000000-0000-4000-8000-000000000000';await assert.rejects(()=>validateProject(wrong,{catalog}),/documento textual/);
});

test('GG-F6-RESOURCES: merge snapshots the full candidate before its first asynchronous validation',async()=>{
 const {v2}=await sample(),edited=await applyResourceEdit(projectContextResources(v2),{type:'rename-costume',id:'hero',name:'edited'});
 const promise=mergeContextResources(v2,edited);v2.bindings.find(b=>b.id==='model-binding').name='caller changed';
 const merged=await promise;assert.equal(merged.bindings.find(b=>b.id==='model-binding').name,'Triángulo');
});
test('GG-F6-RESOURCES: embedded GLB image pixels count with all unreferenced image assets',async()=>{
 const resources={version:2,assets:{},integrity:{},bindings:[]};
 for(let i=0;i<4;i++){const prepared=await prepareAsset(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1" height="1" fill="#00000'+i+'"/></svg>'),{type:'Image',format:'svg'});resources.assets[prepared.id]=prepared.asset;resources.integrity[prepared.id]=prepared.integrity;}
 await validateResources2(resources);
 const model=await prepareAsset(triangleGlb({textured:true}),{type:'Model',format:'glb'});resources.assets[model.id]=model.asset;resources.integrity[model.id]=model.integrity;
 await assert.rejects(()=>validateResources2(resources),/píxeles/);
});
test('GG-F6-REFERENCES: contextual selections reference independent existing source documents without duplicating source',async()=>{
 const {v2}=await sample(),capabilities=createCapabilities(['gg.3d-advanced','gg.webapps']),js=createTextDocument({language:'javascript',name:'Escena',source:'console.log(1);'}),py=createTextDocument({language:'python',name:'Web',source:'print(2)'});
 capabilities.config['gg.3d-basic'].mode='javascript';capabilities.config['gg.3d-basic'].selectedTextDocumentId=js.id;
 capabilities.config['gg.webapps'].mode='python';capabilities.config['gg.webapps'].selectedTextDocumentId=py.id;
 const model=await createProject({name:'Fuentes',blockly:{},deviceSource:'',catalog,resources:v2,capabilities,textDocuments:[js,py],selectedTextDocumentId:js.id});
 const opened=await parseProjectArchive(await createProjectArchive(model,{catalog}),{catalog});assert.equal(opened.capabilities.config['gg.3d-basic'].selectedTextDocumentId,js.id);assert.equal(opened.capabilities.config['gg.webapps'].selectedTextDocumentId,py.id);assert.deepEqual(opened.authoring.textDocuments,[js,py]);
 const wrong=structuredClone(model);wrong.capabilities.config['gg.webapps'].selectedTextDocumentId=js.id;await assert.rejects(()=>validateProject(wrong,{catalog}),/incompatible/);
 const duplicated=structuredClone(model);duplicated.capabilities.config['gg.webapps'].source=py.source;await assert.rejects(()=>validateProject(duplicated,{catalog}));
});

test('GG-F6-SHARED: F5 asset blocks retain their 2D contribution, grants and native behavior after explicit 3D promotion',async()=>{
 const {v1}=await sample(),copy=structuredClone(v1),alternative=await prepareAsset(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="#00f"/></svg>'),{type:'Image',format:'svg'});
 copy.assets[alternative.id]=alternative.asset;copy.integrity[alternative.id]=alternative.integrity;copy.costumes.push({id:'GGasset:alternative',ownerId:'hero',name:'Alternativo',assetId:alternative.id,centerX:2,centerY:2,bitmapResolution:1});
 const resources1=await validateResources(copy),resources2=await promoteResources2(resources1),view=createResourceView(resources2);
 const state={blocks:{languageVersion:0,blocks:[{id:'start-assets',type:'gg_when_start',inputs:{DO:{block:{id:'change-assets',type:'gg_assets_set_costume',fields:{COSTUME:'GGasset:alternative'},next:{block:{id:'move-assets',type:'gg_move',inputs:{STEPS:{shadow:{id:'steps-assets',type:'math_number',fields:{NUM:5}}}}}}}}}}]}};
 const before=createCapabilities(['gg.assets']),full=createCapabilities(['gg.sprites','gg.3d-basic']),selectedLocks=selectCapabilityLocksForContext(full.locks,'scratch-2d'),selected={locks:selectedLocks,config:Object.fromEntries(selectedLocks.map(lock=>[lock.id,full.config[lock.id]]))};
 assert.deepEqual(selected.locks.map(lock=>lock.id),['gg.assets','gg.sprites']);assert.equal(selected.locks[0].version,'0.2.0');assert.ok(!full.locks.some(lock=>lock.id==='gg.sb3'));
 function lower(capabilities){const workspace=loadWorkspace(state,{capabilities,resourceView:view});try{return workspaceToIR(workspace,{capabilities,resourceView:view});}finally{workspace.dispose();}}
 const oldIR=lower(before),ir=lower(selected);assert.deepEqual(ir,oldIR);assert.deepEqual(authorizeProgram(selected,ir,{resourceView:view}),ir);
 assert.equal(authorizeProjectOperation(selected,'program.setCostume',['invocation','GGasset:alternative'],{resourceView:view}).args[1],'GGasset:alternative');
 // The headless native VM has no renderer/storage. Install the reviewed names
 // exactly as the browser adapter does, then execute real core costume/motion opcodes.
 const {project}=toScratchProject(ir,{resourceView:view});project.targets[1].costumes=view.costumes.filter(c=>c.ownerId==='hero').map(c=>({name:c.id,assetId:c.assetId,md5ext:c.assetId+'.svg',dataFormat:'svg',rotationCenterX:c.centerX,rotationCenterY:c.centerY,bitmapResolution:c.bitmapResolution}));
 const NativeVM=createRequire(import.meta.url)(resolve(xcratchRoot,'packages/scratch-vm/src/index.js')),vm=new NativeVM();project.projectVersion=3;try{await vm.deserializeProject(structuredClone(project));vm.runtime.handleProjectLoaded();vm.start();vm.greenFlag();for(let i=0;i<8;i++)vm.runtime._step();const hero=vm.runtime.getSpriteTargetByName('hero');assert.equal(hero.x,5);assert.equal(hero.getCostumes()[hero.currentCostume].name,'GGasset:alternative');}finally{vm.quit();}
 assert.equal(selectCapabilityLocksForContext(createCapabilities(['gg.3d-basic']).locks,'scratch-2d').length,0);
});
