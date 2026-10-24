import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {xcratchRoot} from '../../tools/paths.mjs';
import {inspectSb3Project,validateSb3Program,translateSb3Editable} from '../../src/contracts/sb3-program.mjs';
import {toNativeSb3Project} from '../../src/adapters/scratch/sb3/native-project.mjs';
import {installRuntimeGuards} from '../../src/adapters/scratch/sb3/runtime-guards.mjs';
import {exportSb3Initial,scratchMd5} from '../../src/adapters/scratch/sb3/export.mjs';
import {readSb3Archive} from '../../src/contracts/sb3-archive.mjs';
import {copyResourceOwner,createResourceView} from '../../src/contracts/resources.mjs';
import {createSb3Fixtures} from '../fixtures/sb3/fixtures.mjs';
import {prepareFixture} from '../fixtures/sb3/prepare.mjs';
const require=createRequire(import.meta.url),VM=require(resolve(xcratchRoot,'packages/scratch-vm/src/index.js'));
require(resolve(xcratchRoot,'packages/scratch-vm/src/util/log.js')).settings.minLevel=5;
const fixtures=createSb3Fixtures();
const steps=async vm=>{for(let i=0;i<25;i++){vm.runtime._step();await new Promise(resolve=>setImmediate(resolve));}};
for(const fixture of fixtures)test('GG-SB3 corpus '+fixture.id+' '+fixture.title,async()=>{
 const before=structuredClone(fixture.project),prepared=await prepareFixture(fixture);
 assert.equal(prepared.status,fixture.expected.status);
 assert.deepEqual(fixture.project,before);
 const disk=new Uint8Array(await readFile(new URL('../fixtures/sb3/'+fixture.id+'.sb3',import.meta.url)));
 assert.deepEqual(disk,fixture.bytes);
 const entries=await readSb3Archive(disk);assert.deepEqual(JSON.parse(new TextDecoder().decode(entries.get('project.json'))),fixture.project);
 if(prepared.status==='unsupported'){
  assert.equal(prepared.candidate,null);assert.ok(prepared.coverage.some(record=>record.status==='unsupported'));return;
 }
 assert.deepEqual(validateSb3Program(prepared.candidate,{resourceView:prepared.resourceView}),prepared.candidate);
 const native=toNativeSb3Project(prepared.candidate,prepared.resourceView),vm=new VM(),violations=[];
 let guard;
 try{
  // Only the reviewed projection is handed to this pinned VM. Node proves
  // scheduling/data here; browser tests separately prove media/render/gestures.
  await vm.deserializeProject(native);vm.runtime.handleProjectLoaded();
  guard=installRuntimeGuards({vm,onViolation:record=>violations.push(record)});
  vm.start();
  const hero=vm.runtime.getSpriteTargetByName('hero');
  if(fixture.expected.trigger==='key')vm.runtime.startHats('event_whenkeypressed',{KEY_OPTION:'space'});
  else if(fixture.expected.trigger==='click')vm.runtime.startHats('event_whenthisspriteclicked',{},hero);
  else vm.greenFlag();
  await steps(vm);
  assert.deepEqual(violations,[]);
  if(fixture.expected.x!==undefined)assert.equal(hero.x,fixture.expected.x);
  if(fixture.expected.costume!==undefined)assert.equal(hero.currentCostume,fixture.expected.costume);
  for(const [name,x]of Object.entries(fixture.expected.sprites??{}))assert.equal(vm.runtime.getSpriteTargetByName(name).x,x);
  for(const [id,value]of Object.entries(fixture.expected.variables??{}))assert.deepEqual(hero.variables[id].value,value);
  for(const [id,value]of Object.entries(fixture.expected.globalVariables??{}))assert.deepEqual(vm.runtime.getTargetForStage().variables[id].value,value);
  for(const [id,value]of Object.entries(fixture.expected.lists??{}))assert.deepEqual(hero.variables[id].value,value);
  for(const [effect,value]of Object.entries(fixture.expected.effects??{}))assert.equal(hero.effects[effect],value);
  if(fixture.expected.visible!==undefined)assert.equal(hero.visible,fixture.expected.visible);
  if(prepared.editable)assert.deepEqual(translateSb3Editable(prepared.candidate,{resourceView:prepared.resourceView}),prepared.editable);
 }finally{guard?.dispose();vm.stopAll();vm.quit();}
});

test('GG-SB3 exact coverage includes unknown orphan and unknown monitor, and malformed graph fails before VM',async()=>{
 const fixture=fixtures[0],prepared=await prepareFixture(fixture),options={sourceAssetId:prepared.sourceAssetId,assetMap:prepared.assetMap,resourceView:prepared.resourceView};
 const orphan=structuredClone(fixture.project);orphan.targets[1].blocks.bad={opcode:'hardware_connect',next:null,parent:null,inputs:{},fields:{},shadow:false,topLevel:true,x:0,y:0};
 assert.equal(inspectSb3Project(orphan,options).status,'unsupported');
 const monitored=structuredClone(fixture.project);monitored.monitors=[{id:'bad',opcode:'unknown_monitor',params:{},visible:false}];
 assert.equal(inspectSb3Project(monitored,options).status,'unsupported');
 const malformed=structuredClone(fixture.project);malformed.targets[1].blocks.move.next='start';
 assert.throws(()=>inspectSb3Project(malformed,options),/ciclo|padre|conexión/);
 const mutated=structuredClone(fixture.project);mutated.targets[1].blocks.move.mutation={evil:'x'};
 assert.equal(inspectSb3Project(mutated,options).candidate,null);
});
test('GG-SB3 canonical DTO rejects injected fields/opcodes/resources and honors stable-ID overlays',async()=>{
 const fixture=fixtures[9],prepared=await prepareFixture(fixture);
 const invalid=structuredClone(prepared.candidate);invalid.targets[1].blocks.move.opcode='unknown_execute';
 assert.throws(()=>validateSb3Program(invalid,{resourceView:prepared.resourceView}),/canónico/);
 const extra=structuredClone(prepared.candidate);extra.targets[1].extensionURLs=['https://example.invalid/ext'];
 assert.throws(()=>validateSb3Program(extra,{resourceView:prepared.resourceView}),/propiedad/);
 const overlay=structuredClone(prepared.resourceView);const costume=overlay.costumes.find(item=>item.id===prepared.candidate.targets[1].costumes[1]);costume.name='Nuevo nombre';costume.centerX=5;
 const projected=toNativeSb3Project(prepared.candidate,overlay);
 assert.equal(projected.targets[1].costumes[1].rotationCenterX,5);
 assert.equal(projected.targets[1].costumes[1].name,costume.id);
 assert.equal(projected.targets[1].blocks['costume:menu'].fields.COSTUME[0],costume.id);
});
test('GG-SB3 editable export uses initial authoring and interoperable MD5 filenames, never executed state',async()=>{
 const prepared=await prepareFixture(fixtures[0]);
 const copied=await copyResourceOwner(prepared.resources,prepared.candidate.targets[1].id,'hero',{idPrefix:'copy',firstCostumeId:'hero'});
 const withStage=await copyResourceOwner(copied.resources,prepared.candidate.targets[0].id,'stage',{idPrefix:'stagecopy'});
 const ir=structuredClone(prepared.editable.ir),bytes=await exportSb3Initial({ir,resources:withStage.resources});
 const files=await readSb3Archive(bytes),project=JSON.parse(new TextDecoder().decode(files.get('project.json')));
 assert.equal(project.targets[1].x,0);assert.equal(project.targets[1].blocks.move.inputs.STEPS[1][1],'10');
 for(const [path,data]of files)if(path!=='project.json')assert.equal(path.split('.')[0],createHash('md5').update(data).digest('hex'));
 assert.equal(scratchMd5(new TextEncoder().encode('abc')),'900150983cd24fb0d6963f7d28e17f72');
 assert.equal(scratchMd5(new Uint8Array()),'d41d8cd98f00b204e9800998ecf8427e');
 const before=JSON.stringify(ir);project.targets[1].x=999;
 assert.deepEqual(await exportSb3Initial({ir,resources:withStage.resources}),bytes);assert.equal(JSON.stringify(ir),before);
});

test('GG-SB3 closed references reject statement-as-value, fake shadow and data ID collisions',async()=>{
 const fixture=fixtures[0],prepared=await prepareFixture(fixture),options={sourceAssetId:prepared.sourceAssetId,resourceView:prepared.resourceView};
 const statement=structuredClone(fixture.project);
 statement.targets[1].blocks.move.inputs.STEPS=[2,'child'];
 statement.targets[1].blocks.child={opcode:'motion_movesteps',next:null,parent:'move',inputs:{STEPS:[1,[4,'1']]},fields:{},shadow:false,topLevel:false};
 assert.throws(()=>inspectSb3Project(statement,options),/valor\/shadow/);
 const shadow=structuredClone(fixture.project);
 shadow.targets[1].blocks.move.inputs.STEPS=[1,'child'];
 shadow.targets[1].blocks.child={opcode:'math_number',next:null,parent:'move',inputs:{},fields:{NUM:['1',null]},shadow:false,topLevel:false};
 assert.throws(()=>inspectSb3Project(shadow,options),/valor\/shadow/);
 const collision=structuredClone(fixture.project);collision.targets[1].variables.shared=['x',0];collision.targets[1].lists.shared=['items',[]];
 assert.throws(()=>inspectSb3Project(collision,options),/ID de datos duplicado/);
 const monitor=structuredClone(fixture.project);monitor.monitors=[{id:'missing',opcode:'data_variable',mode:'default',params:{VARIABLE:'missing'},spriteName:'hero',visible:false}];
 assert.equal(inspectSb3Project(monitor,options).status,'unsupported');
});

test('GG-SB3 owned local storage preserves SHA256 IDs in the pinned real ScratchStorage',async()=>{
 const {parse}=await import('acorn'),{default:vmModule}=await import('node:vm');
 const source=await readFile(new URL('../../src/adapters/scratch/browser-scene.mjs',import.meta.url),'utf8');
 const create=parse(source,{ecmaVersion:'latest',sourceType:'module'}).body.find(node=>node.type==='ExportNamedDeclaration'&&node.declaration?.id?.name==='createScratchBrowserScene').declaration;
 const helper=create.body.body.find(node=>node.type==='FunctionDeclaration'&&node.id.name==='localStorage');
 const ScratchStorage=require(resolve(xcratchRoot,'node_modules/scratch-storage'));
 const context=vmModule.createContext({ScratchStorage,TextEncoder,Uint8Array,atob});
 const build=vmModule.runInContext('('+source.slice(helper.start,helper.end)+')',context);
 const sha='a'.repeat(64),svg='<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
 const storage=build({[sha]:svg});
 const loaded=await storage.load(storage.AssetType.ImageVector,sha,'svg');
 assert.equal(loaded.assetId,sha);assert.equal(loaded.decodeText(),svg);
});

test('GG-SB3 editable claims roundtrip through the real installed Blockly serializer after resource-owner copying',async()=>{
 const {workspaceFromIR}=await import('../../src/editor/workspace-from-ir.mjs');
 const {loadWorkspace,workspaceToIR}=await import('../../src/editor/block-program.mjs');
 const {createCapabilities}=await import('../../src/contracts/packs.mjs');
 const capabilities=createCapabilities(['gg.assets']);
 const normalize=value=>{const ir=structuredClone(value);if(ir.variables?.length)ir.variables=ir.variables.map(v=>({...v,scope:v.scope??'local'})).sort((a,b)=>a.id.localeCompare(b.id));else delete ir.variables;return ir;};
 const verified=[];
 for(const fixture of fixtures){
  const prepared=await prepareFixture(fixture);if(!prepared.editable)continue;
  const hero=await copyResourceOwner(prepared.resources,prepared.candidate.targets[1].id,'hero',{idPrefix:'GGcopy:'+prepared.sourceAssetId,firstCostumeId:'hero'});
  const stage=await copyResourceOwner(hero.resources,prepared.candidate.targets[0].id,'stage',{idPrefix:'GGstage:'+prepared.sourceAssetId});
  const ir=structuredClone(prepared.editable.ir);
  function remap(value){if(!value||typeof value!=='object')return;
   if(value.kind==='setCostume')value.costume=hero.mapping.costumes[value.costume];
   if(value.kind==='playSound')value.sound=hero.mapping.sounds[value.sound];
   for(const child of Object.values(value))if(child&&typeof child==='object')remap(child);
  }remap(ir);
  const options={capabilities,resourceView:createResourceView(stage.resources),layout:prepared.editable.layout};
  const state=workspaceFromIR(ir,options),workspace=loadWorkspace(state,options);
  try{assert.deepEqual(normalize(workspaceToIR(workspace,options)),normalize(ir),fixture.id);}
  finally{workspace.dispose();}
  verified.push(fixture.id);
 }
 assert.deepEqual(verified,['01-start','02-key','03-click','04-concurrent','05-repeat','06-variables','07-broadcast','09-sound','10-costumes','16-transparent']);
});

test('GG-SB3 global reader/change without authored setter stays compatible; an existing setter preserves editable scope',async()=>{
 const prepared=await prepareFixture(fixtures[7]);
 assert.equal(prepared.status,'vm-compatible');assert.equal(prepared.editable,null);
 const project=structuredClone(fixtures[7].project),blocks=project.targets[1].blocks;
 blocks.start.next='set-global';blocks.create.parent='set-global';
 blocks['set-global']={opcode:'data_setvariableto',parent:'start',next:'create',inputs:{VALUE:[1,[4,'0']]},fields:{VARIABLE:['count','count']},shadow:false,topLevel:false};
 const checked=inspectSb3Project(project,{sourceAssetId:prepared.sourceAssetId,resourceView:prepared.resourceView});
 assert.equal(checked.status,'gg-editable');
 assert.deepEqual(checked.editable.ir.variables,[{id:'count',name:'count',initialValue:0,scope:'global'}]);
 const {workspaceFromIR}=await import('../../src/editor/workspace-from-ir.mjs');
 const {loadWorkspace,workspaceToIR}=await import('../../src/editor/block-program.mjs');
 const {createCapabilities}=await import('../../src/contracts/packs.mjs');
 const state=workspaceFromIR(checked.editable.ir,{capabilities:createCapabilities(['gg.assets']),layout:checked.editable.layout});
 const workspace=loadWorkspace(state,{capabilities:createCapabilities(['gg.assets'])});
 try{assert.equal(workspace.getBlockById('set-global').type,'gg_set_global');assert.equal(workspaceToIR(workspace,{capabilities:createCapabilities(['gg.assets'])}).variables[0].scope,'global');}
 finally{workspace.dispose();}
});
