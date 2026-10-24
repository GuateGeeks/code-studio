import test from 'node:test';
import assert from 'node:assert/strict';
import * as Blockly from 'blockly';
import {JSDOM} from 'jsdom';
import {createEditor} from '../../src/editor/editor-entry.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {validateResourceView,promoteLegacyResources,createResourceView} from '../../src/contracts/resources.mjs';
import {readFile} from 'node:fs/promises';
import {buildProjectCatalog} from '../../tools/f1/build-project-catalog.mjs';
import {createHash} from 'node:crypto';

const profile=createCapabilities(['gg.assets']);
const empty={blocks:{languageVersion:0,blocks:[]}};
function installDOM(t) {
 const dom=new JSDOM('<!doctype html><html><body><div id="a" style="width:600px;height:440px"></div><div id="b" style="width:600px;height:440px"></div><output id="editor-status"></output><button id="outside">Outside</button></body></html>',{pretendToBeVisual:true});
 const previous=new Map(),values={window:dom.window,document:dom.window.document,navigator:dom.window.navigator,
  Element:dom.window.Element,HTMLElement:dom.window.HTMLElement,SVGElement:dom.window.SVGElement,Node:dom.window.Node,
  DOMParser:dom.window.DOMParser,XMLSerializer:dom.window.XMLSerializer,HTMLInputElement:dom.window.HTMLInputElement,
  HTMLTextAreaElement:dom.window.HTMLTextAreaElement,KeyboardEvent:dom.window.KeyboardEvent,PointerEvent:dom.window.MouseEvent,
  FocusEvent:dom.window.FocusEvent,getComputedStyle:dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame:dom.window.requestAnimationFrame.bind(dom.window),cancelAnimationFrame:dom.window.cancelAnimationFrame.bind(dom.window),
  ResizeObserver:class {observe(){} disconnect(){}}};
 for(const [key,value]of Object.entries(values)){previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});}
 dom.window.SVGElement.prototype.getBBox=()=>({x:0,y:0,width:100,height:20});
 dom.window.SVGElement.prototype.getComputedTextLength=function(){return(this.textContent?.length??0)*8;};
 dom.window.HTMLCanvasElement.prototype.getContext=()=>({font:'',measureText:text=>({width:String(text).length*8})});
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 Blockly.utils.xml.injectDependencies(dom.window);
 const editors=[];
 t.after(async()=>{for(const editor of editors)editor.dispose();await new Promise(resolve=>setTimeout(resolve,0));dom.window.close();
  for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}});
 return {dom,editor:id=>{const editor=createEditor(document.getElementById(id),empty);editors.push(editor);return editor;}};
}
function view(prefix) {
 return validateResourceView({version:1,assets:[
  {id:'a'.repeat(64),type:'Image',format:'svg',bytes:100,width:4,height:4},
  {id:'b'.repeat(64),type:'Sound',format:'wav',bytes:100}],
  costumes:[{id:prefix+'-costume',ownerId:'hero',name:prefix+' costume label',assetId:'a'.repeat(64),centerX:2,centerY:2,bitmapResolution:1}],
  sounds:[{id:prefix+'-sound',ownerId:'hero',name:prefix+' sound label',assetId:'b'.repeat(64)}]});
}
function state(prefix) {
 return {blocks:{languageVersion:0,blocks:[{type:'gg_when_start',id:prefix+'-hat',x:10,y:20,inputs:{DO:{block:{
  type:'gg_assets_set_costume',id:prefix+'-costume-block',fields:{COSTUME:prefix+'-costume'},next:{block:{
   type:'gg_assets_play_sound_wait',id:prefix+'-sound-block',fields:{SOUND:prefix+'-sound'}}}}}}}]}};
}
function block(editor,id){assert.equal(editor.selectSource(id),true);return Blockly.common.getSelected();}
function load(editor,prefix,resourceView=view(prefix)){editor.commit(editor.prepare(state(prefix),{capabilities:profile,resourceView}));}

test('GG-ASSET-004: two real editors keep resource menus and serialized IDs workspace-local',t=>{
 const env=installDOM(t),a=env.editor('a'),b=env.editor('b');load(a,'a');load(b,'b');
 const aField=block(a,'a-costume-block').getField('COSTUME'),bField=block(b,'b-costume-block').getField('COSTUME');
 assert.deepEqual(aField.getOptions(false),[['a costume label','a-costume']]);
 assert.deepEqual(bField.getOptions(false),[['b costume label','b-costume']]);
 assert.equal(aField.getValue(),'a-costume');assert.equal(bField.getValue(),'b-costume');
 assert.equal(a.program().scripts[0].body[0].costume,'a-costume');
 assert.equal(b.program().scripts[0].body[1].sound,'b-sound');
 const saved=a.save(),renamed=view('a');renamed.costumes[0].name='Renamed label';
 a.commit(a.prepare(saved,{capabilities:profile,resourceView:renamed}));
 const field=block(a,'a-costume-block').getField('COSTUME');
 assert.equal(field.getValue(),'a-costume');assert.deepEqual(field.getOptions(false),[['Renamed label','a-costume']]);
 assert.deepEqual(a.save(),saved);assert.deepEqual(bField.getOptions(false),[['b costume label','b-costume']]);
});

test('GG-ASSET-004: actual toolbox flyouts use the owning workspace resources',t=>{
 const env=installDOM(t),a=env.editor('a'),b=env.editor('b');load(a,'a');load(b,'b');
 for(const [editor,prefix]of [[a,'a'],[b,'b']]){
  const workspace=block(editor,prefix+'-costume-block').workspace,toolbox=workspace.getToolbox();
  const category=toolbox.getToolboxItems().find(item=>item.getName()==='Recursos locales');
  assert.ok(category);toolbox.setSelectedItem(category);
  const flyout=workspace.getFlyout(),costume=flyout.getWorkspace().getAllBlocks(false).find(item=>item.type==='gg_assets_set_costume');
  assert.ok(costume);assert.deepEqual(costume.getField('COSTUME').getOptions(false),[[prefix+' costume label',prefix+'-costume']]);
 }
});

test('GG-ASSET-004: invalid imported resource IDs retain their source attribution and active authoring',t=>{
 const env=installDOM(t),editor=env.editor('a');load(editor,'a');const before=editor.save();
 for(const invalidId of ['not-present','remote.svg','b-costume']){
  const candidate=state('a');candidate.blocks.blocks[0].inputs.DO.block.fields.COSTUME=invalidId;
  assert.throws(()=>editor.prepare(candidate,{capabilities:profile,resourceView:view('a')}),error=>error.sourceBlockId==='a-costume-block');
  assert.deepEqual(editor.save(),before);
 }
 const foreign=view('a');foreign.costumes[0].ownerId='other';
 assert.throws(()=>editor.prepare(state('a'),{capabilities:profile,resourceView:foreign}),error=>error.sourceBlockId==='a-costume-block');
 assert.deepEqual(editor.save(),before);
});

test('GG-ASSET-004: checkpoint restores an invalid live 2D draft, open field text, selection and viewport',t=>{
 const env=installDOM(t),editor=env.editor('a');load(editor,'a');
 const draft=editor.save();
 draft.blocks.blocks.push({type:'gg_move',id:'draft-move',x:40,y:150,inputs:{STEPS:{shadow:{type:'math_number',id:'draft-number',fields:{NUM:7}}}}});
 editor.commit({state:draft,capabilities:profile,resourceView:view('a')});
 const number=block(editor,'draft-number'),workspace=number.workspace;
 workspace.setScale(1.1);workspace.scroll(-30,-45);
 const field=number.getField('NUM');Blockly.getFocusManager().focusNode(field);field.showEditor();
 const input=document.activeElement;assert.equal(input.tagName,'INPUT');input.value='unfinished number';input.setSelectionRange(2,9,'backward');input.scrollLeft=12;
 const before=editor.save(),viewport={scale:workspace.scale,x:workspace.scrollX,y:workspace.scrollY},token=editor.checkpoint();
 assert.throws(()=>editor.program(),error=>error.sourceBlockId==='draft-move');
 editor.commit(editor.prepare(state('b'),{capabilities:profile,resourceView:view('b')}));
 for(const foreign of [{},structuredClone(token),null])assert.throws(()=>editor.restoreDraft(foreign),/no pertenece/);
 editor.restoreDraft(token);
 assert.deepEqual(editor.save(),before);assert.deepEqual(editor.resourceView(),view('a'));assert.equal(editor.selectedSource(),'draft-number');
 assert.equal(document.activeElement.tagName,'INPUT');assert.equal(document.activeElement.value,'unfinished number');
 assert.deepEqual([document.activeElement.selectionStart,document.activeElement.selectionEnd,document.activeElement.selectionDirection],[2,9,'backward']);
 assert.equal(document.activeElement.scrollLeft,12);
 assert.deepEqual({scale:workspace.scale,x:workspace.scrollX,y:workspace.scrollY},viewport);
 assert.equal(editor.program instanceof Function,true);
});

test('GG-ASSET-001: promotion keeps legacy bytes unchanged and exposes stable ID labels to a real editor',async t=>{
 const assets={},costumes=[[],[]];
 for(const [index,name]of ['stage','hero','hero-alt'].entries()){
  const bytes=await readFile(new URL('../../src/assets/'+name+'.svg',import.meta.url),'utf8'),id=createHash('md5').update(bytes).digest('hex');
  assets[id]=bytes;costumes[index===0?0:1].push({assetId:id,name,dataFormat:'svg',md5ext:id+'.svg',rotationCenterX:index===0?240:24,rotationCenterY:index===0?180:24});
 }
 const catalog=await buildProjectCatalog({assets,costumes,sounds:[]}),before=JSON.stringify(catalog),promoted=await promoteLegacyResources(catalog);
 assert.equal(JSON.stringify(catalog),before);assert.equal(promoted.version,1);
 const env=installDOM(t),editor=env.editor('a'),model=state('a');model.blocks.blocks[0].inputs.DO.block.fields.COSTUME='hero-alt';
 delete model.blocks.blocks[0].inputs.DO.block.next;
 editor.commit(editor.prepare(model,{capabilities:profile,resourceView:createResourceView(promoted)}));
 assert.equal(editor.program().scripts[0].body[0].costume,'hero-alt');
 assert.equal(block(editor,'a-costume-block').getField('COSTUME').getValue(),'hero-alt');
 assert.equal(JSON.stringify(catalog),before);
});
