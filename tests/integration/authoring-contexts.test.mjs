import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {createResourceStore} from '../../src/resource-store.mjs';
import {validateResources2} from '../../src/contracts/resources.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {defaultScene3DConfig} from '../../src/contracts/scene3d-program.mjs';
import {defaultWebAppConfig} from '../../src/contracts/webapp-program.mjs';
async function environment(){
 const profile=createCapabilities(['gg.sprites','gg.3d-advanced','gg.webapps']),resources=await validateResources2({version:2,assets:{},integrity:{},bindings:[]}),store=createResourceStore({resources});
 const events=[],saved=new WeakMap();let state={draft:'old Blockly'},text={textDocuments:[],selectedTextDocumentId:null},fail=null;
 const editor={save:()=>structuredClone(state),prepare:(input,options)=>{events.push('prepare-editor');assert.equal(options.resourceView.version,1);assert.ok(options.capabilities.locks.every(l=>['gg.sprites','gg.assets'].includes(l.id)));return structuredClone(input);},commit(candidate){events.push('commit-editor');state=structuredClone(candidate);},checkpoint(){const token={};saved.set(token,structuredClone(state));return token;},restoreDraft(token){state=structuredClone(saved.get(token));}};
 const source=new EventTarget();source.value='legacy';
 const texts={capture:()=>structuredClone(text),prepare(input){events.push('prepare-text');return {textDocuments:input.textDocuments??[],selectedTextDocumentId:input.selectedTextDocumentId??null};},commit(candidate){text=structuredClone(candidate);},checkpoint(){const token={};saved.set(token,structuredClone(text));return token;},restoreDraft(token){text=structuredClone(saved.get(token));}};
 const configs={'gg.3d-basic':defaultScene3DConfig(),'gg.webapps':defaultWebAppConfig()},captureCalls=new Map();
 function participant(id,context,dependencies=[]){return {id,context,dependencies,captureConfig(){captureCalls.set(id,(captureCalls.get(id)??0)+1);if(fail==='capture-'+id)throw Error('invalid other-context draft');return structuredClone(configs[id]);},prepareConfig(config,options){events.push('prepare-'+id);assert.equal(options.resourceView.version,2);assert.equal(options.resourceView.bindings.length,0);assert.deepEqual(options.textDocuments,[]);return structuredClone(config);},commitConfig(config){events.push('commit-'+id);configs[id]=structuredClone(config);if(fail==='commit-'+id){fail=null;throw Error('injected failure');}},checkpoint(){const token={};saved.set(token,structuredClone(configs[id]));return token;},restoreDraft(token){configs[id]=structuredClone(saved.get(token));},hasAuthoring:()=>true};}
 // Reverse injection order proves dependency order is independent of UI layout.
 const scene=participant('gg.3d-basic','scene3d'),web=participant('gg.webapps','webapp',['gg.3d-basic','resources','textDocuments']);
 const authoring=createProjectAuthoring({editor,source,textDocuments:texts,capabilityEditors:[web,scene],initialCapabilities:profile,resourceStore:store});
 const model=()=>({capabilities:profile,resources:store.capture(),authoring:{blockly:{draft:'new Blockly'},deviceSource:'new legacy',textDocuments:[],selectedTextDocumentId:null}});
 return {authoring,store,events,configs,captureCalls,model,set fail(value){fail=value;},get state(){return state;},set state(value){state=value;},source};
}
test('GG-F6-AUTHORING: execution captures only the selected context closure and ignores unrelated invalid drafts',async()=>{
 const env=await environment();env.fail='capture-gg.webapps';
 const projected=env.authoring.captureExecutionCapabilities('scene3d');assert.deepEqual(projected.locks.map(l=>l.id).sort(),['gg.3d-advanced','gg.3d-basic','gg.assets']);
 assert.equal(env.captureCalls.get('gg.webapps')??0,0);assert.equal(env.captureCalls.get('gg.3d-basic'),1);
 assert.throws(()=>env.authoring.capture(),/invalid other-context/);
 env.fail='capture-gg.3d-basic';const calls=env.captureCalls.get('gg.3d-basic');
 assert.deepEqual(env.authoring.captureExecutionCapabilities('scratch-2d').locks.map(l=>l.id),['gg.assets','gg.sprites']);assert.equal(env.captureCalls.get('gg.3d-basic'),calls);
});
test('GG-F6-AUTHORING: resources and text prepare before consumers; failed commits restore all live drafts',async()=>{
 const env=await environment();env.state={invalidDraft:'retained verbatim'};const before=structuredClone(env.configs),oldResources=env.store.capture();let notifications=0;env.authoring.subscribe(()=>notifications++);
 const model=env.model();model.capabilities=structuredClone(model.capabilities);model.capabilities.config['gg.3d-basic'].scene.entities[0].name='candidate';
 const candidate=env.authoring.prepare(model);assert.deepEqual(env.events,['prepare-text','prepare-editor','prepare-gg.3d-basic','prepare-gg.webapps']);assert.equal(notifications,0);
 env.fail='commit-gg.webapps';assert.throws(()=>env.authoring.commit(candidate),/injected failure/);
 assert.deepEqual(env.state,{invalidDraft:'retained verbatim'});assert.equal(env.source.value,'legacy');assert.deepEqual(env.configs,before);assert.deepEqual(env.store.capture(),oldResources);assert.equal(notifications,0);
});
test('GG-F6-AUTHORING: invalid or foreign resource candidates cannot trigger any editor preparation',async()=>{
 const env=await environment(),model=env.model();model.resources=structuredClone(model.resources);
 assert.throws(()=>env.authoring.prepare(model),/validación/);assert.deepEqual(env.events,[]);
 const next=env.model();next.capabilities=structuredClone(next.capabilities);next.capabilities.config['gg.webapps'].selectedTextDocumentId='text-00000000-0000-4000-8000-000000000000';assert.throws(()=>env.authoring.prepare(next),/documento textual/);assert.deepEqual(env.events,['prepare-text']);
});

test('GG-F6-AUTHORING: an absent explicit context cannot fall back to legacy execution authority',()=>{
 const profile=createCapabilities(['gg.webapps']),source=new EventTarget();source.value='';
 const editor={save:()=>({}),prepare:()=>({}),commit(){}};
 const authoring=createProjectAuthoring({editor,source,initialCapabilities:profile});
 assert.throws(()=>authoring.captureExecutionCapabilities('scratch-2d'),/Contexto no seleccionado/);
 assert.ok(authoring.captureExecutionCapabilities('webapp').locks.some(lock=>lock.id==='gg.webapps'));
});
