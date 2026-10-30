import {toScratchProject,toScratchSceneProject,ownerResources} from './scratch-project.mjs';
import {createGGBindings} from './gg-bindings.mjs';
import {measureScenePerformance} from './performance-probe.mjs';
import {createTextProgram} from './text-program.mjs';
import {validateResources,createResourceView,decodeResourceAsset} from '../../contracts/resources.mjs';
import {scene2DBackdrops} from '../../contracts/scene2d-objects.mjs';
import {toNativeSb3Project} from './sb3/native-project.mjs';
import {installRuntimeGuards} from './sb3/runtime-guards.mjs';
import {awaitRenderReadiness,awaitSceneStep} from './sb3/readiness.mjs';
import {createStageInput} from './stage-input.mjs';

// Scratch owns execution state. Candidate engines are private until one sync commit.
export function createScratchBrowserScene({canvas,audioButton,getRevision,advanceRevision,onMove,onDiagnostic,onError,onTextInvocation,onTextCancel}) {
let vm,renderer,currentFixture,activeBundle;
let loadingScene=false,textMode=false,compatibilityMode=false,pendingAudioStart=null;
let moves=[],audioEvents=[],audioEngine,audioAnalyser,closingAudio=false;
let pendingMove=null,moveScheduled=false;
const boundedPush=(items,value)=>{items.push(value);if(items.length>256)items.shift();};
function publishMove(bundle,x){
  pendingMove={bundle,x};if(moveScheduled)return;moveScheduled=true;
  queueMicrotask(()=>{moveScheduled=false;const value=pendingMove;pendingMove=null;if(value&&activeBundle===value.bundle&&!value.bundle.disposed)onMove(value.x);});
}
let preparationEpoch=0;
const prepared=new WeakMap(),preparations=new Set();
const textProgram=createTextProgram({getVM:()=>vm,getRevision,getScene:()=>currentFixture,onInvocation:onTextInvocation,onCancel:onTextCancel,
  onError:(code,message)=>diagnostic('error',code,message)});
const ggCall=createGGBindings(()=>vm,()=>currentFixture?.objects);
function diagnostic(level,code,message,sourceBlockId,revision=getRevision()){onDiagnostic(level,code,message,sourceBlockId,revision);}
function audioSnapshot(){
  if(!audioEngine)return {available:false};
  const samples=new Float32Array(audioAnalyser.fftSize);audioAnalyser.getFloatTimeDomainData(samples);
  const rms=Math.sqrt(samples.reduce((sum,sample)=>sum+sample*sample,0)/samples.length);
  const spectrum=new Float32Array(audioAnalyser.frequencyBinCount);audioAnalyser.getFloatFrequencyData(spectrum);
  const peak=spectrum.reduce((max,value,index)=>value>spectrum[max]?index:max,0);
  const sounds=vm.runtime.targets.filter(target=>target.isOriginal&&!target.isStage).flatMap(target=>Object.values(target.sprite.soundBank?.soundPlayers??{}))
    .map(player=>({playing:player.isPlaying,duration:player.buffer.duration,channels:player.buffer.numberOfChannels,sampleRate:player.buffer.sampleRate}));
  return {available:true,contextState:audioEngine.audioContext.state,currentTime:audioEngine.currentTime,rms,peakHz:peak*audioEngine.audioContext.sampleRate/audioAnalyser.fftSize,sounds,events:[...audioEvents]};
}
function snapshot(){
  renderer.draw();
  const gl=renderer._gl,pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let count=0,sumX=0,minX=canvas.width,maxX=-1,blueCount=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
    const offset=(y*canvas.width+x)*4;
    if(pixels[offset]<130&&pixels[offset+1]<160&&pixels[offset+2]>180&&pixels[offset+3]>200)blueCount++;
    if(pixels[offset]>180&&pixels[offset+1]<150&&pixels[offset+2]<150&&pixels[offset+3]>200){count++;sumX+=x;minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
  }
  const hero=vm.runtime.getSpriteTargetByName('hero');
  const variablesOf=target=>Object.fromEntries(Object.entries(target?.variables??{}).map(([id,variable])=>[id,{name:variable.name,value:structuredClone(variable.value)}]));
  const targets=vm.runtime.targets.filter(target=>!target.isStage).map(target=>({
    id:target.id,name:target.getName(),x:target.x,y:target.y,isOriginal:target.isOriginal,visible:target.visible,size:target.size,direction:target.direction,
    costume:{index:target.currentCostume,name:target.getCostumes()[target.currentCostume]?.name??null},effects:{...target.effects},variables:variablesOf(target)}));
  // E1: the one-sprite state the 2D vocabulary changes (position, direction, size, visibility, costume and speech bubble).
  const state=target=>{const bubble=target.getCustomState('Scratch.looks');
    return {x:target.x,y:target.y,direction:target.direction,size:Math.round(target.size*1000)/1000,visible:target.visible,costume:target.getCostumes()[target.currentCostume]?.name??null,
      bubble:bubble?.text?{type:bubble.type,text:bubble.text}:null};};
  const sprite=hero?state(hero):null;
  // scene2d-multi-sprite 2.1: every configured sprite (VM targets are named by ID), in configuration order.
  const sprites=(currentFixture?.objects??[{id:'hero',name:'hero'}]).flatMap(object=>{const target=vm.runtime.getSpriteTargetByName(object.id);
    return target?.isOriginal?[{id:object.id,name:object.name,...state(target),variables:variablesOf(target)}]:[];});
  const stage=vm.runtime.getTargetForStage();
  return {x:hero?.x??null,hero:sprite,sprites,backdrop:stage?.getCostumes()[stage.currentCostume]?.name??null,pixels:{count,centerX:count?sumX/count:null,minX,maxX},origin:location.origin,bluePixels:blueCount,
    costume:hero?{index:hero.currentCostume,name:hero.getCostumes()[hero.currentCostume]?.name??null}:null,
    globalVariables:variablesOf(vm.runtime.getTargetForStage()),targets,revision:getRevision(),threads:vm.runtime.threads.length,moves:[...moves],sourceMap:currentFixture?.sourceMap,
    variables:variablesOf(hero),authoringVariables:structuredClone(currentFixture?.project.targets.find(target=>!target.isStage)?.variables??{}),
    audio:audioSnapshot(),mode:compatibilityMode?'compatibility':textMode?'text':'native',pendingAudioStart:pendingAudioStart!==null};
}
function bindInput(bundle){
  const revision=getRevision();
  bundle.input=createStageInput({canvas:bundle.canvas,container:bundle.canvas.ownerDocument.querySelector('#stage-controls'),vm:bundle.vm,
    isCurrent:()=>activeBundle===bundle&&!bundle.disposed&&!loadingScene&&getRevision()===revision,
    mode:bundle.compatibility?'scratch':'native',onError:error=>{if(activeBundle===bundle)diagnostic('error','STAGE_INPUT_FAILED',String(error.message));}});
}
function bitmapAdapter(){
  return {resize(source,width,height){const result=document.createElement('canvas');result.width=width;result.height=height;result.getContext('2d').drawImage(source,0,0,width,height);return result;},
    convertDataURIToBinary(uri){const data=uri.slice(uri.indexOf(',')+1);return Uint8Array.from(atob(data),char=>char.charCodeAt(0));}};
}
function disposeBundle(bundle){
  if(!bundle||bundle.disposed)return;bundle.disposed=true;bundle.input?.dispose();bundle.guard?.dispose();bundle.vm?.stopAll();bundle.vm?.quit();
  if(bundle.audio?.audioContext.state!=='closed')bundle.audio?.audioContext.close().catch(()=>{});
  const gl=bundle.renderer?._gl;gl?.getExtension('WEBGL_lose_context')?.loseContext();
}
function localStorage(assets){
  const storage=new ScratchStorage.ScratchStorage(),localAssets=new Map();
  for(const [id,asset]of Object.entries(assets)){
    if(asset.type==='Source')continue;
    const format=typeof asset==='string'?'svg':asset.format;
    const data=typeof asset==='string'?new TextEncoder().encode(asset):
      asset.encoding==='base64'?Uint8Array.from(atob(asset.data),char=>char.charCodeAt(0)):decodeResourceAsset(asset);
    const type=format==='svg'?storage.AssetType.ImageVector:format==='png'?storage.AssetType.ImageBitmap:format==='wav'?storage.AssetType.Sound:null;
    if(!type)throw new Error('Unsupported local asset');
    localAssets.set(id,storage.createAsset(type,format,data,id,false));
  }
  class LocalAssetHelper extends ScratchStorage.Helper{load(type,id){return Promise.resolve(localAssets.get(id)??null);}}
  storage.addHelper(new LocalAssetHelper(storage),200);return storage;
}
async function prepareEngine(fixture,{signal,compatibility=false}={}){
  const epoch=++preparationEpoch;
  for(const pending of preparations)disposeBundle(pending);preparations.clear();
  const bundle={fixture,disposed:false,compatibility,epoch,signal};
  preparations.add(bundle);
  const check=()=>{if(signal?.aborted||bundle.disposed||epoch!==preparationEpoch)throw new Error('Scene preparation cancelled');};
  try{
    check();
    const surface=canvas.cloneNode(false);bundle.canvas=surface;
    bundle.vm=new VirtualMachine();bundle.renderer=new ScratchRender(surface);
    bundle.vm.attachStorage(localStorage(fixture.assets));bundle.vm.attachRenderer(bundle.renderer);bundle.vm.attachV2BitmapAdapter(bitmapAdapter());
    if(fixture.project.targets.some(target=>target.sounds.length)){
      const Context=globalThis.AudioContext??globalThis.webkitAudioContext,context=new Context();
      const nativeResume=context.resume.bind(context);let reported=false;
      context.resume=()=>{
        const pending=nativeResume();pending.catch(error=>{
          if(activeBundle===bundle&&!bundle.disposed&&!closingAudio&&!reported){reported=true;diagnostic('error','AUDIO_RESUME_FAILED',String(error?.message??error));}
        });return pending;
      };
      bundle.audio=new ScratchAudio(context);bundle.analyser=context.createAnalyser();bundle.analyser.fftSize=2048;
      bundle.audio.inputNode.disconnect();bundle.audio.inputNode.connect(bundle.analyser);bundle.analyser.connect(context.destination);bundle.vm.attachAudioEngine(bundle.audio);
    }
    // Native JSON is selected/rebuilt by our translators. No raw archive or ZIP.
    await awaitSceneStep(bundle.vm.deserializeProject(structuredClone(fixture.project)),{signal});check();
    bundle.vm.runtime.handleProjectLoaded();
    for(const target of bundle.vm.runtime.targets){
      if(target.getCostumes().some(costume=>costume.broken))throw new Error('Costume decode fallback rejected');
      if(target.sprite.sounds.some(sound=>sound.broken))throw new Error('Sound decode fallback rejected');
      if(target.sprite.sounds.some(sound=>!sound.soundId||!target.sprite.soundBank?.soundPlayers[sound.soundId]))throw new Error('Sound was not decoded');
    }
    await awaitRenderReadiness({vm:bundle.vm,renderer:bundle.renderer,signal});check();
    if(compatibility)bundle.guard=installRuntimeGuards({vm:bundle.vm,onViolation:record=>{
      if(activeBundle===bundle)diagnostic('error',record.code,record.message,record.sourceBlockId??undefined);
    }});
    const handle=Object.freeze({});prepared.set(handle,bundle);return handle;
  }catch(error){preparations.delete(bundle);disposeBundle(bundle);throw error;}
}
function commitPrepared(handle){
  const bundle=prepared.get(handle);
  if(!bundle||bundle.disposed||bundle.epoch!==preparationEpoch||bundle.signal?.aborted)throw new Error('Invalid or stale prepared scene');
  prepared.delete(handle);preparations.delete(bundle);
  const previous=activeBundle,oldCanvas=canvas;
  textProgram.stop('scene-changed');pendingAudioStart=null;
  vm=bundle.vm;renderer=bundle.renderer;canvas=bundle.canvas;audioEngine=bundle.audio;audioAnalyser=bundle.analyser;currentFixture=bundle.fixture;
  activeBundle=bundle;closingAudio=false;compatibilityMode=bundle.compatibility;textMode=false;
  moves=[];audioEvents=[];advanceRevision();
  oldCanvas.replaceWith(canvas);bindInput(bundle);
  audioButton.hidden=!audioEngine;
  audioButton.textContent=compatibilityMode?'Activar audio e iniciar':'Reproducir sonido';
  for(const target of vm.runtime.targets.filter(target=>!target.isStage)){
    for(const player of Object.values(target.sprite.soundBank?.soundPlayers??{}))for(const type of ['play','stop'])player.on(type,()=>{
      if(activeBundle===bundle)boundedPush(audioEvents,{type,at:audioEngine.currentTime});
    });
    target.on('TARGET_MOVED',target=>{if(activeBundle===bundle){boundedPush(moves,target.x);if(target.getName()==='hero')publishMove(bundle,target.x);}});
  }
  vm.start();disposeBundle(previous);return snapshot();
}
function disposePrepared(handle){const bundle=prepared.get(handle);if(!bundle)return false;prepared.delete(handle);preparations.delete(bundle);disposeBundle(bundle);return true;}
async function loadScene(fixture){
  if(fixture.project.extensions?.length||fixture.project.extensionURLs?.length||fixture.project.targets.some(target=>target.extensionURLs?.length))throw new Error('Unsupported browser fixture');
  const handle=await prepareEngine(fixture);
  try{return commitPrepared(handle);}catch(error){disposePrepared(handle);throw error;}
}
async function prepareCompatibility({candidate,resources},{signal}={}){
  const resourceSnapshot=await validateResources(resources),view=createResourceView(resourceSnapshot);
  if(signal?.aborted)throw new Error('Scene preparation cancelled');
  if(resourceSnapshot.assets[candidate.sourceAssetId]?.type!=='Source'||resourceSnapshot.assets[candidate.sourceAssetId]?.format!=='sb3')throw new Error('Original SB3 resource unavailable');
  const project=toNativeSb3Project(candidate,view);
  return prepareEngine({project,assets:resourceSnapshot.assets,sourceMap:{},candidate,resourceView:view},{signal,compatibility:true});
}
function startCompatibility(){
  if(!compatibilityMode)throw new Error('Compatibility scene unavailable');
  if(audioEngine&&audioEngine.audioContext.state!=='running'){
    pendingAudioStart={revision:getRevision(),vm,bundle:activeBundle};audioButton.hidden=false;return snapshot();
  }
  pendingAudioStart=null;activeBundle.input?.resume();vm.greenFlag();return snapshot();
}
audioButton.addEventListener('click',async()=>{
  const revision=getRevision(),bundle=activeBundle,pending=pendingAudioStart;
  try{
    await audioEngine.audioContext.resume();
    if(closingAudio||revision!==getRevision()||bundle!==activeBundle)return;
    if(compatibilityMode){if(pending&&pending===pendingAudioStart){pendingAudioStart=null;bundle.input?.resume();vm.greenFlag();}}
    else if(!textMode){bundle.input?.resume();vm.greenFlag();}
  }catch(error){if(bundle===activeBundle&&revision===getRevision()){diagnostic('error','AUDIO_START_FAILED',error.message,undefined,revision);onError(error.message);}}
});
window.addEventListener('pagehide',()=>{++preparationEpoch;closingAudio=true;pendingAudioStart=null;textProgram.dispose();for(const bundle of preparations)disposeBundle(bundle);preparations.clear();disposeBundle(activeBundle);});
async function setupScene(){await loadScene(await fetch('/project.json').then(response=>response.json()));}
async function shutdown(stopWorkers=()=>{}){
  ++preparationEpoch;closingAudio=true;pendingAudioStart=null;textProgram.dispose();
  for(const bundle of preparations)disposeBundle(bundle);preparations.clear();disposeBundle(activeBundle);stopWorkers();
  return {closed:true};
}
async function handle(command,payload={}){
  switch(command){
    case 'measure-performance':return measureScenePerformance({vm,renderer},payload);
    case 'snapshot':return snapshot();
    case 'gg-call':{
      if(loadingScene||payload.revision!==getRevision())throw new Error('Stale GG program revision or scene loading');
      if(compatibilityMode){
        if(payload.method==='scene.get')return {sprites:vm.runtime.targets.filter(target=>!target.isStage&&target.isOriginal).map(target=>({id:target.id,name:target.getName(),x:target.x,y:target.y})),variables:[]};
        throw new Error('GG mutation unavailable in SB3 compatibility mode');
      }
      if(typeof payload.method==='string'&&payload.method.startsWith('program.')){
        if(!textMode)throw new Error('Text program requires a textual scene');
        const result=textProgram.call(payload.method,payload.args,payload.revision);
        if(payload.method==='program.start'){activeBundle.input?.setMode('text');activeBundle.input?.resume();}
        else if(payload.method==='program.stop')activeBundle.input?.stop();
        return result;
      }
      return ggCall(payload.method, payload.args);
    }
    case 'text-invocation-result':if(!textMode||compatibilityMode||loadingScene||payload.revision!==getRevision())return {accepted:false};return textProgram.complete(payload);
    case 'load-program':{
      if(payload.textMode!==undefined&&typeof payload.textMode!=='boolean')throw new Error('Invalid text mode');
      // IR 2D v1 (gg.sprites 0.3.0): the runner passes the validated objects of the
      // profile; one target per sprite. IR0 keeps the single hero exactly as before.
      const objects=payload.ir?.version===1?payload.objects:null;
      if(payload.ir?.version===1&&!objects)throw new Error('Escena con objetos sin configuración válida');
      let project,sourceMap,assets,sceneObjects=null,backdropView=null;
      if(payload.resources?.version===1){
        const resources=await validateResources(payload.resources),view=createResourceView(resources);backdropView=view;
        if(objects)({project,sourceMap,objects:sceneObjects}=toScratchSceneProject(payload.ir,{scene:objects,resourceView:view}));
        else{
          ({project,sourceMap}=toScratchProject(payload.ir,{resourceView:view}));
          project.targets.forEach((target,index)=>Object.assign(target,ownerResources(view,index===0?'stage':'hero')));
        }
        assets=resources.assets;
      }else{
        const resources=await fetch('/program-resources.json').then(response=>response.json());
        const usesAudio=nodes=>nodes.some(node=>node.kind==='playSound'||usesAudio(node.body??[])||usesAudio(node.elseBody??[]));
        const audio=payload.textMode===true||payload.ir.scripts.some(script=>usesAudio(script.body));
        if(objects){
          // Built-in resources exist only for the stage and hero, as in IR0.
          const builtIn=owner=>{
            if(owner==='stage')return {costumes:resources.costumes[0],sounds:[]};
            if(owner==='hero')return {costumes:resources.costumes[1],sounds:audio?resources.sounds:[]};
            const name=objects.sprites.find(sprite=>sprite.id===owner)?.name??owner;
            throw new Error('«'+name+'» no tiene disfraces. Añade sus recursos al proyecto antes de ejecutar.');
          };
          ({project,sourceMap,objects:sceneObjects}=toScratchSceneProject(payload.ir,{scene:objects,ownerAssets:builtIn}));
        }else{
          ({project,sourceMap}=toScratchProject(payload.ir));
          project.targets.forEach((target,index)=>{target.costumes=structuredClone(resources.costumes[index]);});
          if(audio)project.targets[1].sounds=structuredClone(resources.sounds);
        }
        assets=resources.assets;
      }
      project.projectVersion=3;loadingScene=true;
      try{await loadScene({project,sourceMap,ir:payload.ir,assets,...(sceneObjects?{objects:sceneObjects,backdrops:scene2DBackdrops(backdropView)}:{})});textMode=payload.textMode===true;activeBundle.input?.setMode(textMode?'text':'native');audioButton.textContent=textMode?'Activar audio':'Reproducir sonido';}
      finally{loadingScene=false;activeBundle?.input?.refresh();}return snapshot();
    }
    case 'load-corpus':{
      if(!['events','messages','clones','variables','audio','audioStop','globalVariables','costumes','concurrent'].includes(payload.name))throw new Error('Unknown corpus fixture');
      const fixtures=await fetch('/corpus.json').then(response=>response.json());loadingScene=true;
      try{await loadScene(fixtures[payload.name]);textMode=false;audioButton.textContent='Reproducir sonido';}finally{loadingScene=false;activeBundle?.input?.refresh();}return snapshot();
    }
    case 'start-compatibility':return startCompatibility();
    case 'start-corpus':{
      if(compatibilityMode)return startCompatibility();
      activeBundle.input?.resume();vm.greenFlag();for(const script of currentFixture?.ir?.scripts??[])if(script.event==='start')diagnostic('info','SCRIPT_STARTED','Inicio enviado al motor 2D.',script.sourceBlockId);return snapshot();
    }
    case 'stop-scene':pendingAudioStart=null;activeBundle.input?.stop();textProgram.stop();vm.stopAll();return snapshot();
    case 'run':{
      if(compatibilityMode)throw new Error('Native run unavailable in compatibility mode');
      if(!['repeat','forever'].includes(payload.mode))throw new Error('Unsupported execution mode');
      vm.stopAll();activeBundle.input?.resume();vm.runtime.getSpriteTargetByName('hero').setXY(0,0,true);
      const repeat=vm.runtime.getSpriteTargetByName('hero').blocks.getBlock('repeat');repeat.opcode=payload.mode==='forever'?'control_forever':'control_repeat';
      vm.runtime.getSpriteTargetByName('hero').blocks.resetCache();vm.greenFlag();
      for(let i=0;i<(payload.mode==='repeat'?12:1);i++)vm.runtime._step();return snapshot();
    }
    default:throw new Error('Unknown scene command');
  }
}
return Object.freeze({setup:setupScene,snapshot,handle,shutdown,prepareCompatibility,commitPrepared,disposePrepared,
  setPresentation:({combined=false}={})=>{canvas.hidden=!combined;canvas.ownerDocument.querySelector('#stage-pane').hidden=!combined;},
  declarations:()=>structuredClone(currentFixture?.ir?.variables??[]),get loading(){return loadingScene;}});
}
