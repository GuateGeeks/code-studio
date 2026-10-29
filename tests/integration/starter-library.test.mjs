import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {prepareAsset,validateResources,createResourceView,promoteLegacyResources,resourceLimits} from '../../src/contracts/resources.mjs';
import {sanitizeSvg} from '../../src/contracts/media-svg.mjs';
import {editWavPcm16,inspectWavPcm16} from '../../src/contracts/media-wav.mjs';
import {validateStarterLibrary,decodeStarterLibraryEntry,starterLibraryMedia,applyStarterLibraryEntry,restoreInitialBackdrop,stageBackdropAssetId} from '../../src/contracts/starter-library.mjs';
import {buildStarterLibrary} from '../../tools/resources/starter-library.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createTone} from '../../tools/f0/tone.mjs';

const built=buildStarterLibrary(),library=validateStarterLibrary(JSON.parse(built.bytes.toString('utf8')));
const entry=id=>library.entries.find(item=>item.id===id);
// Same normalization the asset worker applies for prepare-media.
async function prepare(item){
 const bytes=await decodeStarterLibraryEntry(item),{type,format}=starterLibraryMedia(item);
 if(format==='svg'){const safe=sanitizeSvg(bytes);return {...await prepareAsset(safe.bytes,{type,format}),width:safe.width,height:safe.height};}
 const edited=editWavPcm16(bytes);return {...await prepareAsset(edited.bytes,{type,format}),audio:inspectWavPcm16(edited.bytes)};
}
async function projectResources(){
 const assets={},costumes=[[],[]];
 for(const [index,name]of ['stage','hero','hero-alt'].entries()){
  const source=await readFile(new URL('../../src/assets/'+name+'.svg',import.meta.url),'utf8');
  const id=createHash('md5').update(source).digest('hex');assets[id]=source;
  costumes[index===0?0:1].push({assetId:id,name,dataFormat:'svg',md5ext:id+'.svg',rotationCenterX:index===0?240:24,rotationCenterY:index===0?180:24});
 }
 const tone=createTone().buffer,toneId=createHash('md5').update(tone).digest('hex');
 assets[toneId]={type:'Sound',format:'wav',encoding:'base64',data:tone.toString('base64')};
 const catalog=await buildProjectCatalog({assets,costumes,sounds:[{assetId:toneId,name:'tone',dataFormat:'wav',md5ext:toneId+'.wav'}]});
 return {catalog,resources:await promoteLegacyResources(catalog)};
}

test('GG-LIB-001/003: every entry is canonical media whose resource ID is its declared SHA-256',async()=>{
 assert.deepEqual(['costume','backdrop','sound'].map(kind=>library.entries.filter(item=>item.kind===kind).length),[20,8,10]);
 for(const item of library.entries){
  const prepared=await prepare(item);
  assert.equal(prepared.id,item.sha256,item.id);assert.equal(prepared.integrity.bytes,item.bytes,item.id);
  if(item.kind==='sound'){assert.ok(prepared.audio.duration<=2,item.id);assert.equal(prepared.audio.sampleRate,item.sampleRate);assert.equal(prepared.audio.frames,item.frames);}
  else assert.deepEqual([prepared.width,prepared.height],[item.width,item.height],item.id);
 }
});

test('GG-LIB-002/003: the index is closed and tampered entries fail before any media contract',async()=>{
 const raw=()=>JSON.parse(built.bytes.toString('utf8'));
 for(const mutate of [value=>{value.license='MIT';},value=>{value.entries[0].extra=1;},value=>{value.entries[1].id=value.entries[0].id;},value=>{value.entries[0].id='Gato';},
  value=>{value.entries[20].width=400;},value=>{value.entries[0].category='fondo';},value=>{value.entries[0].name='<b>';},value=>{value.format='scratch-library';},
  value=>{value.entries=[];},value=>{value.entries[28].kind='costume';}])
 {const value=raw();mutate(value);assert.throws(()=>validateStarterLibrary(value),/Biblioteca:/);}
 const tampered=raw(),bytes=Buffer.from(tampered.entries[0].data,'base64');bytes[20]^=1;tampered.entries[0].data=bytes.toString('base64');
 await assert.rejects(decodeStarterLibraryEntry(validateStarterLibrary(tampered).entries[0]),/no coincide con su SHA-256/);
 const other=await prepare(entry('perro'));
 const {resources}=await projectResources();
 await assert.rejects(applyStarterLibraryEntry(resources,entry('gato'),other),/no es canónica/);
});

test('GG-LIB-005: costumes and sounds become hero resources with readable IDs, once',async()=>{
 let {resources}=await projectResources();
 const before=structuredClone(resources);
 let result=await applyStarterLibraryEntry(resources,entry('gato'),await prepare(entry('gato')));
 assert.equal(result.status,'added');assert.equal(result.descriptorId,'gato');
 assert.deepEqual(resources,before,'la entrada original no se modifica');
 resources=result.resources;
 assert.deepEqual(resources.costumes.find(item=>item.id==='gato'),{id:'gato',ownerId:'hero',name:'Gato',assetId:entry('gato').sha256,centerX:48,centerY:48,bitmapResolution:1});
 result=await applyStarterLibraryEntry(resources,entry('sonido-salto'),await prepare(entry('sonido-salto')));
 resources=result.resources;
 assert.deepEqual(resources.sounds.find(item=>item.id==='sonido-salto'),{id:'sonido-salto',ownerId:'hero',name:'Salto',assetId:entry('sonido-salto').sha256});
 const again=await applyStarterLibraryEntry(resources,entry('gato'),await prepare(entry('gato')));
 assert.equal(again.status,'present');assert.equal(again.resources.costumes.length,resources.costumes.length);
 const view=createResourceView(await validateResources(resources));
 assert.ok(view.costumes.some(item=>item.id==='gato'&&item.ownerId==='hero'));assert.ok(view.sounds.some(item=>item.id==='sonido-salto'&&item.ownerId==='hero'));
 // A user descriptor already named like the entry keeps its ID; the library one gets a suffix.
 const renamed=structuredClone(resources);renamed.costumes=renamed.costumes.filter(item=>item.id!=='gato');renamed.costumes.push({...resources.costumes.find(item=>item.id==='hero'),id:'perro'});
 const suffixed=await applyStarterLibraryEntry(await validateResources(renamed),entry('perro'),await prepare(entry('perro')));
 assert.equal(suffixed.descriptorId,'perro-2');
});

test('GG-LIB-005: quotas fail with a Spanish next step and leave the input intact',async()=>{
 let {resources}=await projectResources();
 const sounds=library.entries.filter(item=>item.kind==='sound');
 for(const item of sounds)resources=(await applyStarterLibraryEntry(resources,item,await prepare(item))).resources;
 // Without its descriptor, «Pop» is new again; pad the remaining slots with copies of another sound.
 const full=structuredClone(resources);full.sounds=full.sounds.filter(item=>item.id!=='sonido-pop');
 for(let index=full.sounds.length;index<resourceLimits.sounds;index++)full.sounds.push({...full.sounds[0],id:'extra-'+index});
 const validated=await validateResources(full),snapshot=structuredClone(validated);
 await assert.rejects(applyStarterLibraryEntry(validated,entry('sonido-pop'),await prepare(entry('sonido-pop'))),/16 sonidos, el máximo/);
 assert.deepEqual(validated,snapshot);
 const many=structuredClone(resources);
 for(let index=many.costumes.length;index<resourceLimits.costumes;index++)many.costumes.push({...many.costumes[1],id:'copia-'+index});
 await assert.rejects(applyStarterLibraryEntry(await validateResources(many),entry('perro'),await prepare(entry('perro'))),/32 disfraces, el máximo/);
});

test('GG-LIB-006: a backdrop replaces the stage medium keeping its ID and the catalog restores it',async()=>{
 const {resources,catalog}=await projectResources(),initial=stageBackdropAssetId(createResourceView(resources));
 const used=await applyStarterLibraryEntry(resources,entry('playa'),await prepare(entry('playa')));
 assert.equal(used.status,'backdrop');
 const stage=used.resources.costumes.filter(item=>item.ownerId==='stage');
 assert.equal(stage.length,1);assert.deepEqual(stage[0],{id:resources.costumes.find(item=>item.ownerId==='stage').id,ownerId:'stage',name:'Playa',assetId:entry('playa').sha256,centerX:240,centerY:180,bitmapResolution:1});
 assert.equal((await applyStarterLibraryEntry(used.resources,entry('playa'),await prepare(entry('playa')))).status,'present');
 const restored=await restoreInitialBackdrop(used.resources,await promoteLegacyResources(catalog));
 assert.equal(restored.status,'restored');
 assert.deepEqual(restored.resources.costumes.filter(item=>item.ownerId==='stage'),resources.costumes.filter(item=>item.ownerId==='stage'));
 assert.equal(stageBackdropAssetId(createResourceView(restored.resources)),initial);
 assert.equal((await restoreInitialBackdrop(restored.resources,await promoteLegacyResources(catalog))).status,'present');
 assert.deepEqual(restored.resources.costumes.filter(item=>item.ownerId==='hero'),resources.costumes.filter(item=>item.ownerId==='hero'));
});
