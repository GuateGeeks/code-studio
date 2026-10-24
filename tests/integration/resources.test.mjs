import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import JSZip from 'jszip';
import {prepareAsset,validateResources,createResourceView,validateResourceView,promoteLegacyResources,applyResourceEdit,copyResourceOwner,
 cloneValidatedResources,resourceLimits} from '../../src/contracts/resources.mjs';
import {createResourceStore} from '../../src/resource-store.mjs';
import {createProject,validateProject,upgradeProject,serializeProject,parseProject} from '../../src/project-format.mjs';
import {createProjectArchive,parseProjectArchive} from '../../src/project-archive.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {authorizeProgram,authorizeProjectOperation,createCapabilityBroker} from '../../src/contracts/pack-broker.mjs';
import {validateProgram} from '../../src/contracts/program-contract.mjs';
import {generateProgramSource} from '../../src/generated-program-source.mjs';
import {generateCode} from '../../src/generated-code.mjs';
import {createProjectAuthoring} from '../../src/project-authoring.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';

const utf8=new TextEncoder();
const svg=(color='#f00',width=4,height=4)=>utf8.encode(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${color}"/></svg>`);
const empty=()=>({version:1,assets:{},integrity:{},costumes:[],sounds:[]});
const costume=(id,assetId,ownerId='hero')=>({id,ownerId,name:'Etiqueta '+id,assetId,centerX:2,centerY:2,bitmapResolution:1});
function put(resources,prepared){resources.assets[prepared.id]=prepared.asset;resources.integrity[prepared.id]=prepared.integrity;return prepared.id;}
async function sample(){
 const resources=empty(),image=await prepareAsset(svg(),{type:'Image',format:'svg'});
 put(resources,image);resources.costumes.push(costume('local-costume',image.id));
 const sound=await prepareAsset(new Uint8Array(createTone().buffer),{type:'Sound',format:'wav'});
 put(resources,sound);resources.sounds.push({id:'local-sound',ownerId:'hero',name:'Sonido local',assetId:sound.id});
 return validateResources(resources);
}
async function localCatalog(){
 const assets={},costumes=[[],[]];
 for(const [index,name]of ['stage','hero','hero-alt'].entries()){
  const source=await readFile(new URL('../../src/assets/'+name+'.svg',import.meta.url),'utf8');
  const id=createHash('md5').update(source).digest('hex');assets[id]=source;
  costumes[index===0?0:1].push({assetId:id,name,dataFormat:'svg',md5ext:id+'.svg',rotationCenterX:index===0?240:24,rotationCenterY:index===0?180:24});
 }
 const bytes=createTone().buffer,id=createHash('md5').update(bytes).digest('hex');
 assets[id]={type:'Sound',format:'wav',encoding:'base64',data:bytes.toString('base64')};
 return buildProjectCatalog({assets,costumes,sounds:[{assetId:id,name:'tone',dataFormat:'wav',md5ext:id+'.wav',format:'',rate:22050,sampleCount:26460}]});
}
const catalog=await localCatalog();
const caps=createCapabilities(['gg.assets']);
const makeProject=(resources,capabilities=caps)=>createProject({name:'Recursos',blockly:{blocks:{languageVersion:0,blocks:[]}},deviceSource:'',catalog,capabilities,resources});
function png(raw,{trailing=false}={}){
 const crc=bytes=>{let c=0xffffffff;for(const b of bytes){c^=b;for(let bit=0;bit<8;bit++)c=c&1?0xedb88320^(c>>>1):c>>>1;}return(c^0xffffffff)>>>0;};
 const chunk=(type,data)=>{const b=Buffer.alloc(data.length+12);b.writeUInt32BE(data.length,0);b.write(type,4);data.copy(b,8);b.writeUInt32BE(crc(b.subarray(4,-4)),b.length-4);return b;};
 const header=Buffer.alloc(13);header.writeUInt32BE(1,0);header.writeUInt32BE(1,4);header[8]=8;header[9]=6;
 return new Uint8Array(Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',trailing?Buffer.concat([deflateSync(raw),deflateSync(Buffer.alloc(0))]):deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
}

test('GG-ASSET-001: SHA256, canonical bytes, bounded formats and immutable validation snapshot',async()=>{
 const prepared=await prepareAsset(svg(),{type:'Image',format:'svg'});
 assert.match(prepared.id,/^[a-f0-9]{64}$/);assert.equal(prepared.integrity.sha256,prepared.id);
 assert.equal(prepared.asset.encoding,'base64');
 const resources=await sample(),view=createResourceView(resources);
 assert.equal(view.assets[0].width,4);assert.equal(Object.hasOwn(view.assets[0],'data'),false);
 for(const corrupt of [
  value=>{value.integrity[prepared.id]={bytes:1,sha256:prepared.id};},
  value=>{value.assets[prepared.id].data=Buffer.from('tampered').toString('base64');},
  value=>{value.costumes[0].assetId='f'.repeat(64);},value=>{value.costumes[0].id='remote.svg';},
  value=>{value.costumes[0].centerX=Infinity;},value=>{value.costumes[0].bitmapResolution=3;},
  value=>{value.extra=true;},value=>{value.costumes=Array(1);}
 ]){const copy=structuredClone(resources);corrupt(copy);await assert.rejects(validateResources(copy));}
 const input=structuredClone(resources),pending=validateResources(input);input.costumes[0].name='changed during hashing';
 assert.notEqual((await pending).costumes[0].name,input.costumes[0].name);
 const forged=structuredClone(view);forged.assets[0].data='bytes';assert.throws(()=>validateResourceView(forged));
 await assert.rejects(prepareAsset(new Uint8Array(resourceLimits.sourceBytes+1),{type:'Source',format:'sb3'}),/tamaño/);
});

test('GG-ASSET-003: PNG real zlib output and filter bytes are checked before publication',async()=>{
 const good=await prepareAsset(png(Buffer.from([0,255,0,0,255])),{type:'Image',format:'png'});
 const resources=empty();put(resources,good);resources.costumes.push(costume('pixel',good.id));
 assert.equal(createResourceView(await validateResources(resources)).assets[0].height,1);
 for(const raw of [Buffer.from([0,1]),Buffer.from([5,255,0,0,255]),Buffer.alloc(4*1024*1024)])
  await assert.rejects(prepareAsset(png(raw),{type:'Image',format:'png'}));
 await assert.rejects(prepareAsset(png(Buffer.from([0,255,0,0,255]),{trailing:true}),{type:'Image',format:'png'}));
});

test('GG-ASSET-001: quotas count unreferenced assets, originals and aggregate pixels',async()=>{
 const originals=empty();
 for(let index=0;index<5;index++)put(originals,await prepareAsset(Uint8Array.of(index+1),{type:'Source',format:'sb3'}));
 await assert.rejects(validateResources(originals),/originales/);
 const pictures=empty();
 for(let index=0;index<5;index++)put(pictures,await prepareAsset(svg('#'+String(index+1).padStart(6,'0'),1024,1024),{type:'Image',format:'svg'}));
 await assert.rejects(validateResources(pictures),/píxeles/);
 const many=empty();
 for(let index=0;index<33;index++)put(many,await prepareAsset(svg('#'+String(index+1).padStart(6,'0'),1,1),{type:'Image',format:'svg'}));
 await assert.rejects(validateResources(many),/cuota/);
 const sparse={version:1,assets:[],costumes:[],sounds:[]};sparse.assets.length=1;
 assert.throws(()=>validateResourceView(sparse),/lista/);
});

test('GG-ASSET-002: opaque store preparation rejects forged/mutated snapshots and rolls back',async()=>{
 const resources=await sample(),store=createResourceStore({catalog,resources}),previous=store.capture(),checkpoint=store.checkpoint();
 assert.throws(()=>store.prepare(structuredClone(resources)),/validación/);
 const capture=store.capture();capture.costumes[0].name='mutated';assert.throws(()=>store.prepare(capture),/validación/);
 assert.deepEqual(store.capture(),previous);
 const edited=await applyResourceEdit(resources,{type:'rename-costume',id:'local-costume',name:'Nuevo nombre'});
 const candidate=store.prepare(edited);edited.costumes[0].name='postprepare mutation';store.commit(candidate);
 assert.equal(store.capture().costumes[0].name,'Nuevo nombre');
 assert.throws(()=>store.commit({}),/ajeno/);store.restoreDraft(checkpoint);assert.deepEqual(store.capture(),previous);
});

test('GG-ASSET-001: explicit promotion preserves the legacy catalog and stable descriptor identities',async()=>{
 const before=structuredClone(catalog),promoted=await promoteLegacyResources(catalog);
 assert.deepEqual(catalog,before);assert.equal(promoted.version,1);
 assert.ok(Object.keys(promoted.assets).every(id=>id.length===64));
 assert.deepEqual(promoted.costumes.map(item=>item.id),['stage','hero','hero-alt']);
 assert.deepEqual(promoted.sounds.map(item=>item.id),['tone']);
 const legacy=createResourceStore({catalog});assert.equal(legacy.capture().version,undefined);
 assert.equal(legacy.view().costumes.find(item=>item.id==='hero').ownerId,'hero');
});

test('GG-ASSET-001: GGPROJ3 policy gates portable resources; legacy and store ZIP remain exact',async()=>{
 const legacy=await makeProject(undefined,null),legacyZip=await createProjectArchive(legacy,{catalog});
 assert.deepEqual(await parseProjectArchive(legacyZip,{catalog}),legacy);
 const upgraded=await upgradeProject(legacy,{capabilities:caps,catalog});
 assert.equal(upgraded.resources.version,1);assert.equal(legacy.version,1);
 assert.deepEqual(await createProjectArchive(legacy,{catalog}),legacyZip);
 const model=await makeProject(await sample()),zip=await createProjectArchive(model,{catalog});
 assert.deepEqual(await parseProjectArchive(zip,{catalog}),model);
 assert.deepEqual(await parseProject(serializeProject(model),{catalog}),model);
 // validateProject returns resources with local provenance usable by sync prepare.
 createResourceStore({catalog,resources:(await validateProject(model,{catalog})).resources});
 await assert.rejects(makeProject(model.resources,createCapabilities()),/política/);
 const wrong=structuredClone(model);wrong.resources.integrity[Object.keys(wrong.resources.assets)[0]].sha256='f'.repeat(64);
 await assert.rejects(validateProject(wrong,{catalog}),/hash/);
 const archive=await JSZip.loadAsync(zip);archive.file('assets/'+ 'f'.repeat(64)+'.svg','unexpected',{createFolders:false});
 await assert.rejects(parseProjectArchive(await archive.generateAsync({type:'uint8array',compression:'STORE'}),{catalog}),/adicional/);
});

test('GG-ASSET-001: unknown policy/source references and removal cannot silently downgrade authoring',async()=>{
 const resources=await sample(),profile=createCapabilities(['gg.sb3']);
 profile.config['gg.sb3'].sourceAssetId='a'.repeat(64);
 await assert.rejects(makeProject(resources,profile),/original/);
 const source=await prepareAsset(Uint8Array.of(1,2,3),{type:'Source',format:'sb3'});
 const copy=structuredClone(resources);put(copy,source);profile.config['gg.sb3'].sourceAssetId=source.id;
 const model=await makeProject(await validateResources(copy),profile);
 assert.equal(model.capabilities.config['gg.sb3'].sourceAssetId,source.id);
 const unknown=structuredClone(model);unknown.capabilities.locks.find(item=>item.id==='gg.assets').sha256='f'.repeat(64);
 await assert.rejects(validateProject(unknown,{catalog}),/hash/);
});

test('GG-ASSET-002: resource participant prepares first and is restored if editor commit fails',async()=>{
 const resources=await sample(),store=createResourceStore({catalog,resources});let blockly={draft:'uncompilable'},fail=false,prepares=0;
 const editor={save:()=>structuredClone(blockly),captureCapabilities:()=>caps,
  prepare(state,{resourceView}){prepares++;assert.equal(resourceView.costumes[0].name,'New label');return {state:structuredClone(state)};},
  commit(candidate){blockly=structuredClone(candidate.state);if(fail){fail=false;throw new Error('editor failure');}},
  checkpoint:()=>structuredClone(blockly),restoreDraft:value=>{blockly=structuredClone(value);}};
 const source={value:'old source'},authoring=createProjectAuthoring({editor,source,resourceStore:store,initialCapabilities:caps});
 const edited=await applyResourceEdit(resources,{type:'rename-costume',id:'local-costume',name:'New label'});
 const model={capabilities:caps,resources:edited,authoring:{blockly:{draft:'new'},deviceSource:'new source'}};
 const invalid={...model,resources:structuredClone(edited)};assert.throws(()=>authoring.prepare(invalid),/validación/);assert.equal(prepares,0);
 const before=authoring.capture(),candidate=authoring.prepare(model);fail=true;
 assert.throws(()=>authoring.commit(candidate),/editor failure/);assert.deepEqual(authoring.capture(),before);
 let changes=0;authoring.subscribe(()=>changes++);authoring.commit(authoring.prepare(model));assert.equal(changes,1);
 assert.equal(authoring.capture().resources.costumes[0].name,'New label');
 assert.throws(()=>authoring.prepareCapabilities(createCapabilities()),/política/);
});

test('GG-ASSET-001: IR, generated source and broker authorize stable IDs only for their owner/pack',async()=>{
 const resources=await sample(),resourceView=createResourceView(resources);
 const ir={version:0,scripts:[{event:'start',sourceBlockId:'hat',body:[
  {kind:'setCostume',costume:'local-costume',sourceBlockId:'costume'},
  {kind:'playSound',sound:'local-sound',wait:true,sourceBlockId:'sound'}]}]};
 assert.throws(()=>validateProgram(ir),/costume/);validateProgram(ir,{resourceView});
 assert.deepEqual(authorizeProgram(caps,ir,{resourceView}),ir);
 assert.match(generateProgramSource(ir,'javascript',{resourceView}).text,/ctx.setCostume\("local-costume"\)/);
 assert.match(generateCode(ir,{resourceView}).text,/local-costume/);
 assert.throws(()=>authorizeProgram(null,ir,{resourceView}),/no declarado/);
 assert.equal(authorizeProjectOperation(caps,'program.playSound',['ctx','local-sound',true],{resourceView}).args[1],'local-sound');
 assert.throws(()=>authorizeProjectOperation(caps,'program.playSound',['ctx','unknown',true],{resourceView}),/no declarado/);
 const alien=structuredClone(resourceView);alien.sounds[0].ownerId='other';
 assert.throws(()=>authorizeProjectOperation(caps,'program.playSound',['ctx','local-sound',true],{resourceView:alien}),/no declarado/);
 const broker=createCapabilityBroker({capabilities:caps,call:()=>true,getContext:()=>({resourceView})}),client=broker.client('gg.assets');
 assert.equal(client.invoke('program.setCostume',['ctx','local-costume']),true);
 assert.throws(()=>client.invoke('sprite.move',['hero',10]),/no declarado/);
});

test('GG-ASSET-002: editable copies share immutable bytes and preserve original descriptors',async()=>{
 const resources=await sample(),input=structuredClone(resources),sourceOwner='sb3:'+'a'.repeat(64)+':t1';
 input.costumes[0].ownerId=sourceOwner;input.sounds[0].ownerId=sourceOwner;
 const original=await validateResources(input);
 const copied=await copyResourceOwner(original,sourceOwner,'hero',{idPrefix:'GGcopy:'+'a'.repeat(64),firstCostumeId:'hero'});
 assert.equal(copied.mapping.costumes['local-costume'],'hero');
 assert.equal(copied.resources.costumes.find(item=>item.id==='local-costume').ownerId,sourceOwner);
 assert.equal(copied.resources.costumes.find(item=>item.id==='hero').assetId,original.costumes[0].assetId);
 assert.equal(Object.keys(copied.resources.assets).length,Object.keys(original.assets).length);
 assert.deepEqual(original,input);
 assert.throws(()=>cloneValidatedResources(structuredClone(original)),/validación/);
});
