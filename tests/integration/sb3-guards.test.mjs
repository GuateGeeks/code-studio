import test from 'node:test';
import assert from 'node:assert/strict';
import {installRuntimeGuards} from '../../src/adapters/scratch/sb3/runtime-guards.mjs';
import {awaitRenderReadiness,awaitSceneStep} from '../../src/adapters/scratch/sb3/readiness.mjs';
function harness(){
 const variable={type:'',value:0},list={type:'list',value:[]},target={id:'target',isOriginal:true,isStage:false,variables:{value:variable,list},lookupVariableById:id=>id==='list'?list:variable};
 const runtime={targets:[target],threads:[],_primitives:{
  operator_join:args=>String(args.STRING1)+String(args.STRING2),
  data_addtolist:args=>list.value.push(args.ITEM),
  data_setvariableto:args=>{variable.value=args.VALUE;},
  data_changevariableby:args=>{variable.value=Number(variable.value)+Number(args.VALUE);},
  control_create_clone_of(){runtime.targets.push({...target,isOriginal:false});}
 },_pushThread(id){const thread={id};this.threads.push(thread);return thread;},_step(){this._pushThread('hat',target);},getSpriteTargetByName:()=>target};
 const errors=[];let stops=0;
 const vm={runtime,stopAll(){stops++;runtime.threads=[];}},guard=installRuntimeGuards({vm,onViolation:value=>errors.push(value)});
 return {runtime,target,list,variable,guard,errors,get stops(){return stops;},util:{target,thread:{peekStack:()=> 'block'}}};
}
test('GG-SB3 guards reject growth before mutation and publish one scoped diagnosis',()=>{
 const value=harness(),initial='x'.repeat(1024);
 value.runtime._primitives.data_addtolist({LIST:{id:'list'},ITEM:initial},value.util);
 const before=structuredClone(value.list.value);
 assert.throws(()=>value.runtime._primitives.data_addtolist({LIST:{id:'list'},ITEM:initial+'x'},value.util),/límite/);
 assert.deepEqual(value.list.value,before);assert.equal(value.errors.length,1);assert.equal(value.errors[0].sourceBlockId,'block');
 assert.throws(()=>value.runtime._primitives.operator_join({STRING1:'x',STRING2:'y'},value.util),/detenida/);
 assert.equal(value.errors.length,1);value.guard.dispose();
});
test('GG-SB3 joining and clone/thread quotas stop safely without null native threads',()=>{
 const joined=harness();assert.throws(()=>joined.runtime._primitives.operator_join({STRING1:'x'.repeat(1024),STRING2:'y'},joined.util),/unión/);joined.guard.dispose();
 const threads=harness();
 for(let i=0;i<64;i++)threads.runtime._pushThread('hat',threads.target);
 assert.doesNotThrow(()=>threads.runtime._step());assert.equal(threads.stops,1);assert.equal(threads.errors.length,1);threads.guard.dispose();
 const clones=harness();for(let i=0;i<64;i++)clones.runtime.targets.push({...clones.target,isOriginal:false});
 assert.throws(()=>clones.runtime._primitives.control_create_clone_of({CLONE_OPTION:'_myself_'},clones.util),/clones/);assert.equal(clones.runtime.targets.length,65);clones.guard.dispose();
});
test('GG-SB3 render readiness accepts hidden/non-red/transparent skins and awaits actual SVG decode',async()=>{
 let loaded=false,draws=0;
 const skin={_svgImageLoaded:false,_svgImage:{complete:false,naturalWidth:0},getTexture(){}};
 const renderer={_allSkins:[skin],getSkinSize:()=>[16,16],draw(){draws++;}};
 const vm={runtime:{targets:[{isOriginal:true,isStage:false,getCostumes:()=>[{skinId:0}]}]}};
 setTimeout(()=>{skin._svgImageLoaded=true;loaded=true;},20);
 await awaitRenderReadiness({vm,renderer,timeoutMs:1000});
 assert.equal(loaded,true);assert.equal(draws,1);
 skin._svgImageLoaded=false;skin._svgImage.complete=true;
 await assert.rejects(awaitRenderReadiness({vm,renderer}),/failed to decode/);
 const signal=AbortSignal.abort();await assert.rejects(awaitRenderReadiness({vm,renderer,signal}),/cancelled/);
});

test('GG-SB3 numeric write overflow is stopped before mutation and preparation waits abort promptly',async()=>{
 const value=harness();value.variable.value='1e10000';
 assert.throws(()=>value.runtime._primitives.data_changevariableby({VARIABLE:{id:'value'},VALUE:1},value.util),/finito/);
 assert.equal(value.variable.value,'1e10000');value.guard.dispose();
 const controller=new AbortController(),pending=awaitSceneStep(new Promise(()=>{}),{signal:controller.signal,timeoutMs:1000});
 controller.abort();await assert.rejects(pending,/cancelled/);
 await assert.rejects(awaitSceneStep(new Promise(()=>{}),{timeoutMs:5}),/timeout/);
});
