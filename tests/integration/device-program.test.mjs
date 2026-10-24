import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {deviceLimits,deviceBlockTypes,defaultDeviceGraph,emptyDeviceGraph,validateDeviceGraph,validateDeviceConfig,lowerDeviceGraph,generateDeviceSource,prepareDeviceCompilation} from '../../src/contracts/device-program.mjs';
import {createCapabilities,validateCapabilities,canonicalPackData} from '../../src/contracts/packs.mjs';
import {validatePackConfigSchema,validatePackJSON} from '../../src/contracts/pack-config-schema.mjs';
import {validateLocalPackConfig} from '../../src/contracts/pack-config-validators.mjs';
import {microbitPack} from '../../src/packs/gg.microbit/manifest.mjs';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {createProject,serializeProject,parseProject} from '../../src/project-format.mjs';
import {createProjectArchive,parseProjectArchive} from '../../src/project-archive.mjs';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
const graph=()=>structuredClone(defaultDeviceGraph);
const config=()=>createCapabilities(['gg.microbit']).config['gg.microbit'];
const node=(id,type,fields={},inputs={},next=null)=>({id,type,fields,inputs,next,x:0,y:0});
test('GG-DEVICE-001: default config is pinned data and captures independent portable graph/source',async()=>{
 const profile=createCapabilities(['gg.microbit']);assert.deepEqual(profile.locks.map(item=>item.id),['gg.microbit','gg.sprites']);
 for(const entry of localPackCatalog)assert.equal(createHash('sha256').update(canonicalPackData(entry.manifest)).digest('hex'),entry.sha256);
 const data=await buildProjectCatalog({assets:{['a'.repeat(32)]:'<svg xmlns="http://www.w3.org/2000/svg"/>'},costumes:[],sounds:[]});
 const input={name:'Device project',blockly:{blocks:{languageVersion:0,blocks:[]}},deviceSource:'// original\r\nbasic.showNumber(5)\r\n',catalog:data};
 const legacy=await createProject(input);assert.equal(legacy.version,1);assert.equal(Object.hasOwn(legacy,'capabilities'),false);
 const v2=await createProject({...input,textDocuments:[]});assert.equal(v2.version,2);
 const project=await createProject({...input,textDocuments:[],capabilities:profile});
 assert.equal(project.version,3);assert.equal(Object.hasOwn(project,'scene'),false);
 const serialized=serializeProject(project);assert.equal(serialized.includes('sourceMap'),false);assert.equal(serialized.includes('basic.showIcon'),false);
 const opened=await parseProjectArchive(await createProjectArchive(project,{catalog:data}),{catalog:data});
 assert.deepEqual(opened,project);assert.equal(opened.authoring.deviceSource,input.deviceSource);
 assert.deepEqual(await parseProject(serializeProject(legacy),{catalog:data}),legacy);
 assert.deepEqual(await parseProject(serializeProject(v2),{catalog:data}),v2);
 const detached=validateCapabilities(profile);detached.config['gg.microbit'].workspace.nodes[0].id='changed';
 assert.equal(profile.config['gg.microbit'].workspace.nodes[0].id,'device-start');
});
test('GG-DEVICE-002: every firmware core operation produces actual PXT vocabulary and scoped line/offset maps',()=>{
 const body=[
 node('icon','gg_mb_show_icon',{ICON:'Happy'}, {},'num'),
 node('num','gg_mb_show_number',{NUMBER:-9999.5}, {},'matrix')
 ];
 assert.throws(()=>validateDeviceGraph({version:1,nodes:body,roots:['icon']}),/límites/);
 const nodes=[
 node('start','gg_mb_start',{}, {DO:'icon'}),
 node('icon','gg_mb_show_icon',{ICON:'Happy'}, {},'num'),
 node('num','gg_mb_show_number',{NUMBER:-9999}, {},'matrix'),
 node('matrix','gg_mb_show_leds',{LEDS:'1'.repeat(25)}, {},'plot'),
 node('plot','gg_mb_plot',{X:4,Y:0},{},'unplot'),
 node('unplot','gg_mb_unplot',{X:0,Y:4},{},'clear'),
 node('clear','gg_mb_clear',{}, {},'pause'),
 node('pause','gg_mb_pause',{MS:60000},{},'repeat'),
 node('repeat','gg_mb_repeat',{COUNT:1000},{DO:'if'}),
 node('if','gg_mb_if_button',{BUTTON:'AB'},{DO:'yes',ELSE:'no'}),
 node('yes','gg_mb_show_number',{NUMBER:1}),node('no','gg_mb_show_number',{NUMBER:0}),
 node('forever','gg_mb_forever',{}, {DO:null}),
 node('button','gg_mb_on_button',{BUTTON:'B'},{DO:null})
 ];
 const value={version:1,nodes,roots:['start','forever','button']};
 assert.equal(new Set(nodes.map(item=>item.type)).size,deviceBlockTypes.length);
 const ir=lowerDeviceGraph(value),result=generateDeviceSource(ir);
 for(const text of ['basic.showIcon(IconNames.Happy)','basic.showNumber(-9999)','basic.showLeds','led.plot(4, 0)','led.unplot(0, 4)','basic.clearScreen()','basic.pause(60000)','input.buttonIsPressed(Button.AB)','basic.forever','input.onButtonPressed(Button.B'])assert.ok(result.source.includes(text),text);
 assert.ok(result.source.indexOf('input.onButtonPressed')<result.source.indexOf('basic.showIcon'));
 assert.equal(result.sourceIds.length,nodes.length);
 for(const mapping of result.sourceMap){
  assert.ok(mapping.start>=0&&mapping.end<=result.source.length&&mapping.end>=mapping.start);
  assert.equal(mapping.startLine,result.source.slice(0,mapping.start).split('\n').length);
  assert.ok(result.source.slice(mapping.start,mapping.end).trim().length>0);
 }
 assert.deepEqual(value.nodes,nodes);
});
test('GG-DEVICE-002: structural drafts preserve loose blocks and duplicate hats, semantic generation rejects IDs before PXT',()=>{
 const loose={version:1,nodes:[node('sprite-collision','gg_mb_pause',{MS:10})],roots:['sprite-collision']};
 assert.deepEqual(validateDeviceGraph(loose),loose);
 assert.throws(()=>lowerDeviceGraph(loose),error=>error.code==='DEVICE_LOOSE_BLOCK'&&error.sourceBlockId==='sprite-collision');
 const duplicate=graph();duplicate.nodes.push(node('other-start','gg_mb_start',{}, {DO:null}));duplicate.roots.push('other-start');
 validateDeviceGraph(duplicate);assert.throws(()=>lowerDeviceGraph(duplicate),error=>error.sourceBlockId==='other-start');
 const sprite=graph();sprite.nodes[1].type='gg_move';
 assert.throws(()=>lowerDeviceGraph(sprite),error=>error.code==='DEVICE_TARGET_OPERATION'&&error.sourceBlockId==='device-heart');
});
test('GG-DEVICE-002: malformed graphs, shared references, cycles, unknown fields, sparse arrays and numeric injections fail',()=>{
 const mutate=[
 g=>g.nodes[1].fields.ICON='Heart);fetch("bad")',
 g=>g.nodes[1].id=g.nodes[0].id,
 g=>g.nodes[0].next=g.nodes[1].id,
 g=>g.nodes[0].inputs.DO='missing',
 g=>g.nodes[2].inputs.DO=g.nodes[1].id,
 g=>g.nodes[1].next=g.nodes[1].id,
 g=>g.nodes[1].fields.unexpected=true,
 g=>g.nodes[1].x=Infinity,
 g=>g.nodes[1].type={},
 g=>g.nodes.push(undefined)
 ];
 for(const change of mutate){const value=graph();change(value);assert.throws(()=>validateDeviceGraph(value));}
 for(const nodes of [Array(1),Object.assign([],{extra:true})])assert.throws(()=>validateDeviceGraph({version:1,nodes,roots:[]}));
 for(const fields of [{MS:-1},{MS:60001},{MS:1.1},{MS:'20'}])assert.throws(()=>validateDeviceGraph({version:1,nodes:[node('wait','gg_mb_pause',fields)],roots:['wait']}));
 for(const fields of [{LEDS:'0'.repeat(24)},{LEDS:'0'.repeat(24)+'x'}])assert.throws(()=>validateDeviceGraph({version:1,nodes:[node('matrix','gg_mb_show_leds',fields)],roots:['matrix']}));
 assert.throws(()=>generateDeviceSource({version:1,scripts:[{event:'start',sourceBlockId:'root',body:[{kind:'sprite.move',sourceBlockId:'bad'}]}]}),error=>error.sourceBlockId==='bad');
});
test('GG-DEVICE-001: workspace/config budgets are real UTF-8 limits and inactive blocks survive text mode',()=>{
 const value=config();value.mode='typescript';value.workspace={version:1,nodes:[node('loose','gg_mb_pause',{MS:1})],roots:['loose']};
 const source='// ü\r\nbasic.showNumber(7)\r\n';
 const result=prepareDeviceCompilation({config:value,deviceSource:source});
 assert.equal(result.source,source);assert.deepEqual(result.sourceMap,[]);
 assert.deepEqual(validateDeviceConfig(value),value);
 value.mode='blocks';assert.throws(()=>prepareDeviceCompilation({config:value,deviceSource:source}),/Conecta/);
 const large=graph();large.nodes[0].x=1;large.nodes[0].id='ü'.repeat(128);large.roots[0]=large.nodes[0].id;
 validateDeviceGraph(large);
 const many={version:1,nodes:Array.from({length:49},(_,index)=>node('node'+index,'gg_mb_clear')),roots:[]};
 assert.throws(()=>validateDeviceGraph(many),/Lista/);
 const unicode={version:1,nodes:Array.from({length:30},(_,index)=>node(index+'ü'.repeat(100),'gg_mb_clear')),roots:Array.from({length:30},(_,index)=>index+'ü'.repeat(100))};
 assert.ok(new TextEncoder().encode(JSON.stringify(unicode)).length>deviceLimits.workspaceBytes);assert.throws(()=>validateDeviceGraph(unicode),/8 KiB/);
 assert.throws(()=>prepareDeviceCompilation({config:{...config(),mode:'typescript'},deviceSource:'ü'.repeat(8193)}),/límite/);
});
test('GG-DEVICE-001: generic schemas handle boolean/enum/dense arrays/bounded JSON and only installed validators',()=>{
 const definition={type:'object',required:['enabled','values','data'],properties:{enabled:{type:'boolean'},values:{type:'array',minItems:1,maxItems:2,items:{type:'string',enum:['a','b']}},data:{type:'json',maxBytes:20,maxDepth:2}}};
 validatePackConfigSchema({enabled:true,values:['a'],data:{x:1}},definition);
 for(const value of [{enabled:1,values:['a'],data:{}},{enabled:true,values:['c'],data:{}},{enabled:true,values:Array(1),data:{}},{enabled:true,values:['a'],data:{x:'x'.repeat(30)}}])assert.throws(()=>validatePackConfigSchema(value,definition));
 assert.throws(()=>validatePackJSON({x:undefined}));assert.throws(()=>validatePackJSON(JSON.parse('{"__proto__":1}')));
 assert.throws(()=>validateLocalPackConfig('archive-provided-validator',{}),/no instalado/);
 assert.throws(()=>validateLocalPackConfig('device-program-v1',{...config(),variant:'remote'}));
 const entry=structuredClone(localPackCatalog.find(item=>item.manifest.id==='gg.microbit'));
 entry.manifest.configValidator='not-installed';
 const catalog=localPackCatalog.filter(item=>item.manifest.id!=='gg.microbit').concat(entry);
 assert.throws(()=>createCapabilities(['gg.microbit'],{catalog}),/no instalado/);
});

test('GG-DEVICE-001/002: depth and hat budgets reject before generation while sequential nodes do not count as nesting',()=>{
 function nested(count) {
  const nodes=[node('start','gg_mb_start',{}, {DO:count?'loop0':'end'}),node('end','gg_mb_clear')];
  for(let i=0;i<count;i++)nodes.push(node('loop'+i,'gg_mb_repeat',{COUNT:1},{DO:i+1<count?'loop'+(i+1):'end'}));
  return {version:1,nodes,roots:['start']};
 }
 generateDeviceSource(lowerDeviceGraph(nested(4)));
 assert.throws(()=>validateDeviceGraph(nested(5)),error=>error.sourceBlockId==='end');
 const many={version:1,nodes:Array.from({length:9},(_,i)=>node('hat'+i,'gg_mb_on_button',{BUTTON:'A'},{DO:null})),roots:Array.from({length:9},(_,i)=>'hat'+i)};
 assert.throws(()=>validateDeviceGraph(many),/eventos/);
 const sequential={version:1,nodes:[node('start','gg_mb_start',{}, {DO:'s0'}),...Array.from({length:40},(_,i)=>node('s'+i,'gg_mb_clear',{}, {},i<39?'s'+(i+1):null))],roots:['start']};
 assert.equal(lowerDeviceGraph(sequential).scripts[0].body.length,40);
 const withExtra=Object.assign(['a'],{extra:'b'});assert.throws(()=>validatePackConfigSchema(withExtra,{type:'array',items:{type:'string'}}));
});
test('GG-DEVICE-001: aggregate config quota applies even when each installed pack config is valid alone',()=>{
 const large={manifest:{id:'gg.large',version:'0.1.0',apiVersion:1,dependencies:[{id:'gg.sprites',version:'0.1.0'}],configSchema:{type:'json',maxBytes:16000},defaults:{value:'x'.repeat(15000)}},sha256:'f'.repeat(64)};
 const catalog=[...localPackCatalog,large];
 createCapabilities(['gg.large'],{catalog,versions:{'gg.large':'0.1.0'}});
 const profile=createCapabilities(['gg.microbit','gg.large'],{catalog,versions:{'gg.large':'0.1.0'}});
 const value=profile.config['gg.microbit'];
 value.workspace.nodes[0].id='x'.repeat(128);value.workspace.roots[0]=value.workspace.nodes[0].id;
 value.workspace.nodes[1].id='y'.repeat(128);value.workspace.nodes[0].inputs.DO=value.workspace.nodes[1].id;
 value.workspace.nodes[2].id='z'.repeat(128);value.workspace.roots[1]=value.workspace.nodes[2].id;
 value.workspace.nodes[3].id='w'.repeat(128);value.workspace.nodes[2].inputs.DO=value.workspace.nodes[3].id;
 validateDeviceConfig(value);
 assert.throws(()=>validateCapabilities(profile,{catalog}),/demasiado grande/);
});

test('GG-DEVICE-001: device identity matches runtime64 while source block IDs retain128',()=>{
 const value=config();value.deviceId='d'.repeat(64);validateDeviceConfig(value);
 for(const invalid of ['with space','ü','line\nfeed',''])assert.throws(()=>validateDeviceConfig({...value,deviceId:invalid}));
 value.deviceId+='d';assert.throws(()=>validateDeviceConfig(value),/Configuración/);
 const profile=createCapabilities(['gg.microbit']);profile.config['gg.microbit'].deviceId='d'.repeat(65);
 assert.throws(()=>validateCapabilities(profile),/texto inválido/);
 const graph=structuredClone(emptyDeviceGraph);graph.nodes=[node('s'.repeat(128),'gg_mb_clear')];graph.roots=[graph.nodes[0].id];validateDeviceGraph(graph);
 for(const invalid of [Array(1),Object.assign(['a'],{extra:true}),[1],['a','b','a']])assert.throws(()=>validatePackConfigSchema(invalid,{type:'array',maxItems:2,items:{type:'string',enum:['a','b']}}));
 assert.throws(()=>validatePackConfigSchema('v3',{type:'string',enum:['v1','v2']}));
 assert.throws(()=>validatePackConfigSchema(true,{type:'string',enum:['true']}));
});

test('GG-DEVICE-001: vertical starter layout shares one default while imported coordinates remain untouched',()=>{
 assert.equal(microbitPack.defaults.workspace,defaultDeviceGraph);
 const second=defaultDeviceGraph.nodes.find(node=>node.id==='device-button-a');
 assert.deepEqual([second.x,second.y],[20,180]);
 const imported=graph();imported.nodes.find(node=>node.id==='device-button-a').x=350;imported.nodes.find(node=>node.id==='device-button-a').y=-30;
 assert.deepEqual(validateDeviceGraph(imported),imported);
 assert.deepEqual([second.x,second.y],[20,180]);
});
