import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createCapabilities,validateCapabilities,resolveCapabilities,canonicalPackData,selectCapabilityLocksForContext,resolveCapabilityFeatures} from '../../src/contracts/packs.mjs';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {resolveOperationProfile,validateCapabilityOperation,capabilityBlockDefinitions,contextToolbox} from '../../src/contracts/operations.mjs';
import {validateProgramIR1,validateCapabilityGraph,lowerCapabilityGraph} from '../../src/contracts/program-ir1.mjs';
import {validateScene3DConfig,defaultScene3DConfig} from '../../src/contracts/scene3d-program.mjs';
import {validateWebAppConfig,defaultWebAppConfig,validateWebInputValue} from '../../src/contracts/webapp-program.mjs';

test('GG-F6-KERNEL: independent installed providers, immutable data locks and dependency projection',()=>{
 for(const pack of localPackCatalog)assert.equal(createHash('sha256').update(canonicalPackData(pack.manifest)).digest('hex'),pack.sha256);
 for(const id of ['gg.3d-basic','gg.webapps']){const caps=createCapabilities([id]);assert.ok(!caps.locks.some(l=>l.id==='gg.sprites'));assert.equal(resolveCapabilities(caps).initialScene,undefined);}
 const caps=createCapabilities(['gg.sprites','gg.3d-advanced','gg.webapps']);
 assert.deepEqual(selectCapabilityLocksForContext(caps.locks,'scene3d').map(l=>l.id).sort(),['gg.3d-advanced','gg.3d-basic','gg.assets']);
 assert.deepEqual(selectCapabilityLocksForContext(caps.locks,'scratch-2d').map(l=>l.id),['gg.assets','gg.sprites']);
 assert.equal(new Set(capabilityBlockDefinitions.map(b=>b.type)).size,capabilityBlockDefinitions.length);
});
test('GG-F6-KERNEL: API2 schema is closed, typed, finite and detached while API1 is separate',()=>{
 const profile=resolveOperationProfile({contextId:'scene3d',documentId:'scene-main'}),args={targetId:'sphere',delta:{x:1,y:0,z:0}};
 const value=validateCapabilityOperation(profile,'scene3d.move',args);value.args.delta.x=99;assert.equal(args.delta.x,1);
 for(const bad of [{...args,authority:'root'},{...args,delta:{x:Infinity,y:0,z:0}},{...args,delta:{x:1,y:0,z:0,w:1}}])assert.throws(()=>validateCapabilityOperation(profile,'scene3d.move',bad));
 assert.throws(()=>validateCapabilityOperation(profile,'webapp.setText',{targetId:'x',text:'a'}));
 assert.throws(()=>resolveOperationProfile({contextId:'foreign',documentId:'x'}));
 assert.throws(()=>resolveOperationProfile({contextId:'scene3d',documentId:'x',capabilities:createCapabilities(['gg.sprites'])}));
 assert.throws(()=>validateCapabilityOperation(profile,'sprite.move',{}));
});
test('GG-F6-IR1: current scene and submit graph lower source IDs, typed events and calls without source code',()=>{
 for(const [contextId,config]of [['scene3d',defaultScene3DConfig()],['webapp',defaultWebAppConfig()]]){
 const ir=lowerCapabilityGraph(config.workspace,{contextId,documentId:config.documentId});assert.equal(ir.version,1);assert.equal(ir.scripts[0].sourceBlockId,config.workspace.roots[0]);assert.equal(ir.scripts[0].body[0].sourceBlockId,config.workspace.nodes[1].id);assert.deepEqual(validateProgramIR1(ir),ir);
 }
 const ir=lowerCapabilityGraph(defaultWebAppConfig().workspace,{contextId:'webapp',documentId:'web-main'});assert.deepEqual(ir.scripts[0].body[0].args.text,{kind:'event',path:'values.web-input'});
 const invalid=structuredClone(ir);invalid.scripts[0].body[0].operationId='scene3d.move';assert.throws(()=>validateProgramIR1(invalid),e=>e.sourceBlockId==='web-append');
 const sparse=structuredClone(ir);sparse.scripts=Array(1);assert.throws(()=>validateProgramIR1(sparse));
});
test('GG-F6-IR1: common typed state/control and finite domains validate before generation',()=>{
 const ir={version:1,contextId:'scene3d',documentId:'scene-main',variables:[{id:'count',name:'Count',type:'number',initialValue:0}],scripts:[{event:'start',targetId:null,sourceBlockId:'s',body:[
 {kind:'repeat',count:3,sourceBlockId:'r',body:[{kind:'changeVariable',variableId:'count',value:1,sourceBlockId:'v'}]},
 {kind:'if',condition:{kind:'compare',operator:'GT',left:{kind:'variable',variableId:'count'},right:0},sourceBlockId:'i',body:[{kind:'wait',seconds:.1,sourceBlockId:'w'}],elseBody:[]}
 ]}]};assert.deepEqual(validateProgramIR1(ir),ir);
 for(const change of [c=>c.scripts[0].body[0].count=1001,c=>c.scripts[0].body[0].body[0].value='wrong',c=>c.scripts[0].body[1].body[0].seconds=-1,c=>c.variables[0].initialValue=Infinity]){const c=structuredClone(ir);change(c);assert.throws(()=>validateProgramIR1(c));}
});
test('GG-F6-GRAPH: drafts preserve layout but cycles/sharing/unknown blocks/fields reject',()=>{
 const graph=defaultScene3DConfig().workspace;assert.deepEqual(validateCapabilityGraph(graph),graph);
 for(const mutate of [g=>g.nodes[1].next=g.nodes[1].id,g=>g.nodes[1].fields.secret='x',g=>g.nodes[1].type='evil',g=>g.roots.push(g.roots[0]),g=>g.nodes=Array(1)]){const g=structuredClone(graph);mutate(g);assert.throws(()=>validateCapabilityGraph(g));}
 const loose=structuredClone(graph);loose.nodes[0].inputs.DO=null;loose.roots.push(loose.nodes[1].id);assert.deepEqual(validateCapabilityGraph(loose),loose);assert.throws(()=>lowerCapabilityGraph(loose,{contextId:'scene3d',documentId:'scene-main'}),e=>e.sourceBlockId==='scene-move');
});
test('GG-F6-CONFIG: scene hierarchy and native web tree stay closed, bounded and labelled',()=>{
 assert.deepEqual(validateScene3DConfig(defaultScene3DConfig()),defaultScene3DConfig());assert.deepEqual(validateWebAppConfig(defaultWebAppConfig()),defaultWebAppConfig());
 for(const modify of [c=>c.scene.entities[0].parentId='sphere',c=>c.scene.entities[0].properties.url='https://x',c=>c.scene.cameraArc.radius=0]){const c=defaultScene3DConfig();modify(c);assert.throws(()=>validateScene3DConfig(c));}
 for(const modify of [c=>c.app.nodes[1].props.label='',c=>c.app.nodes[2].props.onclick='javascript:x',c=>c.app.nodes[1].parentId='web-input',c=>c.app.nodes[0].props.styles={position:'absolute'}]){const c=defaultWebAppConfig();modify(c);assert.throws(()=>validateWebAppConfig(c));}
 const old=createCapabilities(['gg.sprites']);old.config['gg.sprites'].extra='x'.repeat(17000);assert.throws(()=>validateCapabilities(old));
});

test('GG-F6-KERNEL: installed basic grants cannot call advanced operations through a contextual profile',()=>{
 const basic=resolveOperationProfile({contextId:'scene3d',documentId:'scene-main',capabilities:createCapabilities(['gg.3d-basic'])});
 assert.throws(()=>validateCapabilityOperation(basic,'scene3d.setLight',{targetId:'light',intensity:1,diffuse:'#ffffff'}));
 assert.throws(()=>validateCapabilityOperation(basic,'scene3d.setParent',{targetId:'sphere',parentId:null}));
 assert.ok(validateCapabilityOperation(basic,'scene3d.move',{targetId:'sphere',delta:{x:1,y:0,z:0}}));
 const advanced=resolveOperationProfile({contextId:'scene3d',documentId:'scene-main',capabilities:createCapabilities(['gg.3d-advanced'])});
 assert.ok(validateCapabilityOperation(advanced,'scene3d.setLight',{targetId:'light',intensity:1,diffuse:'#ffffff'}));
});

test('GG-F6-KERNEL: graph generation/toolbox enforce the captured project grants before execution',()=>{
 const capabilities=createCapabilities(['gg.3d-basic']);
 const toolbox=contextToolbox('scene3d',{capabilities});
 assert.equal(toolbox.kind,'categoryToolbox');
 const offered=toolbox.contents.flatMap(category=>category.contents.map(block=>block.type));
 assert.ok(offered.includes('gg_scene3d_move'));
 assert.ok(!offered.includes('gg_scene3d_setLight'));
 const config=defaultScene3DConfig(),graph=config.workspace;graph.nodes[1].type='gg_scene3d_setLight';graph.nodes[1].fields={targetId:'light',intensity:1,diffuse:'#ffffff'};
 assert.throws(()=>lowerCapabilityGraph(graph,{contextId:'scene3d',documentId:'scene-main',capabilities}),e=>e.sourceBlockId==='scene-move');
 assert.ok(lowerCapabilityGraph(graph,{contextId:'scene3d',documentId:'scene-main',capabilities:createCapabilities(['gg.3d-advanced'])}));
});

test('GG-F6-GRAPH: native editor IDs preserve punctuation without becoming entity IDs or executable expressions',()=>{
 const c=defaultScene3DConfig(),graph=c.workspace,hat='hat[{}]!?',statement='stmt~#@%/';
 graph.nodes[0].id=hat;graph.nodes[0].inputs.DO=statement;graph.nodes[1].id=statement;graph.roots=[hat];
 const ir=lowerCapabilityGraph(graph,{contextId:'scene3d',documentId:'scene-main'});assert.equal(ir.scripts[0].sourceBlockId,hat);assert.equal(ir.scripts[0].body[0].sourceBlockId,statement);
});
test('GG-F6-CONFIG: only installed new profiles admit aggregated configuration above 16 KiB',()=>{
 const caps=createCapabilities(['gg.webapps']),config=caps.config['gg.webapps'];
 for(let i=0;i<20;i++)config.app.nodes.push({id:'text-'+i,type:'text',parentId:'web-form',props:{text:'x'.repeat(1024)}});
 assert.ok(new TextEncoder().encode(JSON.stringify(caps.config)).length>16384);validateCapabilities(caps);
 const large=createCapabilities(['gg.webapps']);large.config['gg.webapps']=config;for(let i=20;i<60;i++)large.config['gg.webapps'].app.nodes.push({id:'text-'+i,type:'text',parentId:'web-form',props:{text:'x'.repeat(1024)}});
 assert.throws(()=>validateCapabilities(large));
});

test('GG-F6-GRAPH: numeric fields use a closed literal/reference grammar, without coercion or evaluation',()=>{
 const config=defaultScene3DConfig(),graph=config.workspace;
 graph.nodes.unshift({id:'declare',type:'gg_cap_variable',fields:{ID:'amount',NAME:'Cantidad',TYPE:'number',INITIAL:'2'},inputs:{},next:null,x:250,y:20});graph.roots.push('declare');graph.nodes[2].fields['delta.x']='$var.amount';
 const ir=lowerCapabilityGraph(graph,{contextId:'scene3d',documentId:'scene-main'});assert.deepEqual(ir.scripts[0].body[0].args.delta.x,{kind:'variable',variableId:'amount'});
 for(const value of ['',true,'0x10','1;eval(1)','Infinity']){const broken=structuredClone(graph);broken.nodes[2].fields['delta.x']=value;assert.throws(()=>lowerCapabilityGraph(broken,{contextId:'scene3d',documentId:'scene-main'}));}
});

test('GG-F6-IR1: event expressions use only paths present on the concrete event DTO',()=>{
 const config=defaultWebAppConfig(),ir=lowerCapabilityGraph(config.workspace,{contextId:'webapp',documentId:'web-main'});
 for(const [event,path]of [['start','value'],['click','key'],['input','values.web-input']]){
  const candidate=structuredClone(ir),script=candidate.scripts[0];script.event=event;script.targetId=event==='start'?null:'web-input';script.body[0].args.text={kind:'event',path};assert.throws(()=>validateProgramIR1(candidate));
 }
 const start=structuredClone(ir);start.scripts[0].event='start';start.scripts[0].targetId=null;start.scripts[0].body[0].args.text={kind:'event',path:'targetId'};assert.throws(()=>validateProgramIR1(start),/tipo argumento/);
 const key=structuredClone(ir);key.scripts[0].event='key';key.scripts[0].key='space';key.scripts[0].targetId=null;key.scripts[0].body[0].args.text={kind:'event',path:'key'};validateProgramIR1(key);
});

test('GG-F6-FEATURES: installed declarations enforce basic authoring without central format/editor branches',()=>{
 const basic=createCapabilities(['gg.3d-basic']);validateCapabilities(basic);
 assert.deepEqual(resolveCapabilityFeatures(basic,'scene3d'),{entityKinds:['sphere','hemisphericLight'],hierarchy:false,rotation:false,scale:false});
 const extra={
  group:{},box:{width:1,height:1,depth:1,color:'#ffffff',collidable:true},
  ground:{width:1,height:1,subdivisions:1,color:'#ffffff',collidable:true},
  model:{bindingId:'model-binding',collidable:true},pointLight:{intensity:1,diffuse:'#ffffff'}
 };
 for(const [kind,properties]of Object.entries(extra)){
  const profile=structuredClone(basic),entity=structuredClone(profile.config['gg.3d-basic'].scene.entities[0]);entity.id='extra';entity.kind=kind;entity.properties=properties;profile.config['gg.3d-basic'].scene.entities.push(entity);
  assert.throws(()=>validateCapabilities(profile),/Tipo de entidad no habilitado/);
  const advanced=createCapabilities(['gg.3d-advanced']);advanced.config['gg.3d-basic']=profile.config['gg.3d-basic'];validateCapabilities(advanced);
 }
 for(const modify of [scene=>scene.entities[0].parentId='light',scene=>scene.entities[0].transform.rotationDegrees.y=30,scene=>scene.entities[0].transform.scale.x=2]){
  const profile=structuredClone(basic);modify(profile.config['gg.3d-basic'].scene);assert.throws(()=>validateCapabilities(profile),/no habilitada|no habilitado/);
  const advanced=createCapabilities(['gg.3d-advanced']);advanced.config['gg.3d-basic']=profile.config['gg.3d-basic'];validateCapabilities(advanced);
 }
 const positioned=structuredClone(basic);positioned.config['gg.3d-basic'].scene.entities[0].transform.position.x=20;positioned.config['gg.3d-basic'].scene.cameraArc.radius=15;validateCapabilities(positioned);
});

test('GG-F6-GRAPH: typed initial values reject invalid literals and retain the declaration source ID',()=>{
 const make=(type,value)=>{const graph=defaultScene3DConfig().workspace;graph.nodes.push({id:'declaration',type:'gg_cap_variable',fields:{ID:'value',NAME:'Valor',TYPE:type,...(value===undefined?{}:{INITIAL:value})},inputs:{},next:null,x:250,y:20});graph.roots.push('declaration');return graph;};
 for(const [type,value]of [['boolean','maybe'],['boolean',''],['number',''],['number','0x10'],['number','$var.other'],['number',true],['string',undefined],['string',42]]){
  assert.throws(()=>lowerCapabilityGraph(make(type,value),{contextId:'scene3d',documentId:'scene-main'}),error=>error.sourceBlockId==='declaration');
 }
 for(const [type,value,expected]of [['boolean','false',false],['boolean','true',true],['boolean',false,false],['number','-1.5',-1.5],['number',2,2],['string','', ''],['string','false','false']]){
  const ir=lowerCapabilityGraph(make(type,value),{contextId:'scene3d',documentId:'scene-main'});assert.equal(ir.variables[0].initialValue,expected);
 }
});

test('GG-F6-GRAPH: a newly created key hat targets the actual global keyboard event',()=>{
 const definition=capabilityBlockDefinitions.find(block=>block.type==='gg_cap_key');assert.equal(definition.args0.find(field=>field.name==='TARGETID').text,'');assert.match(definition.tooltip,/global/);
 const graph={version:1,nodes:[{id:'key-hat',type:'gg_cap_key',fields:{TARGETID:'',KEY:'space'},inputs:{DO:null},next:null,x:20,y:20}],roots:['key-hat']};
 const ir=lowerCapabilityGraph(graph,{contextId:'scene3d',documentId:'scene-main'});assert.equal(ir.scripts[0].targetId,null);assert.equal(ir.scripts[0].key,'space');
});

test('GG-F6-WEB: numeric native input values use closed finite decimal grammar without silent sanitization',()=>{
 for(const value of ['', '0','-0','1.5','-.5','1e2','1e-2','1e+2','1000000','-1000000'])assert.equal(validateWebInputValue('number',value),value);
 for(const value of ['abc','Infinity','NaN','0x10',' ',' 1','1 ','+1','1.','1e999','1000001','-1000001'])assert.throws(()=>validateWebInputValue('number',value));
 assert.equal(validateWebInputValue('text','abc'),'abc');assert.throws(()=>validateWebInputValue('text','a'.repeat(1025)));
 const config=defaultWebAppConfig(),input=config.app.nodes.find(node=>node.type==='input');input.props.inputType='number';input.props.value='7';const before=structuredClone(config);
 const candidate=structuredClone(config);candidate.app.nodes.find(node=>node.type==='input').props.value='abc';assert.throws(()=>validateWebAppConfig(candidate));assert.deepEqual(config,before);assert.equal(input.props.value,'7');
});
