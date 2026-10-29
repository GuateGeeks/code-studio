import {corpus} from '../fixtures/corpus.blocks.mjs';
import {captureCodeViewSnapshot,generateCodeViewSource} from '../../src/editor/code-view-conversion.mjs';
import {test,expect} from '@playwright/test';
import {selectContext,clickVisible,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createProjectArchive} from '../../src/project-archive.mjs';

test.setTimeout(90000);
async function open(page) {
  await page.goto('/');await page.waitForFunction(()=>!!window.studioProbe?.project);
  await page.evaluate(()=>studioProbe.project.ready());
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(async()=>{
    const config=await fetch(new URL('./config.json',location.href)).then(r=>r.json());
    const {createCodeViewService}=await import(new URL('./app/studio/code-view-service.mjs',location.href).href);
    window.codeViewService=createCodeViewService({origin:config.languageOrigin,releaseBase:config.releaseBase??'/'});
    window.codeViewConfig=config;
  });
}
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
async function run(page,x) {
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button',{name:'Ejecutar bloques',exact:true}));
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect.poll(async()=>(await settled(snapshot,page)).x).toBe(x);
}
const authoring=page=>page.evaluate(()=>studioProbe.editor.save());

test('CV-CONVERT-BROWSER-001: language-origin conversion prepares, validates and commits authoring without touching the active result',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await open(page);await run(page,12);
  const before=await authoring(page),runtime=await snapshot(page);
  const prepared=await page.evaluate(async()=>{
    window.viewSnapshot=studioProbe.editor.codeViewSnapshot();
    const generated=GGEditor.generateCodeViewSource(viewSnapshot,'javascript');
    const parsed=await codeViewService.convert({language:'javascript',
      source:generated.text.replace('hero.move(4);','// Editado en texto\n    hero.move(25); // pasos'),
      variableIds:generated.variableIds,variableNames:generated.variableNames,
      capabilities:viewSnapshot.capabilities,resourceView:viewSnapshot.resourceView});
    window.viewCandidate=studioProbe.editor.prepareCodeView(parsed,viewSnapshot);
    return {candidate:viewCandidate.state,locations:viewCandidate.sourceLocations,service:codeViewService.stats()};
  });
  expect(await authoring(page)).toEqual(before);
  expect((await snapshot(page)).x).toBe(runtime.x);
  expect(prepared.service.active).toBe(false);
  expect(await page.getByTitle('Conversión del programa sin ejecución',{exact:true}).count()).toBe(0);
  await page.evaluate(()=>studioProbe.editor.commit(viewCandidate));
  await expect(page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText')).toHaveText('25');
  expect((await snapshot(page)).x).toBe(12);
  const retained=await page.evaluate(()=>GG.sprite.move('hero',1).then(()=>GG.sprite.get('hero')));
  expect(retained.x).toBe(13);
  const after=await authoring(page);
  expect(JSON.stringify(after)).toContain('Editado en texto');
  expect(JSON.stringify(after)).toContain('pasos');
  await run(page,75);
  expect(errors).toEqual([]);
  await writeFile(artifactPath('code-view-conversion-browser.json'),JSON.stringify({before,after,prepared,runtime,errors},null,2));
});
test('CV-CONVERT-BROWSER-002: unsupported source, forged candidate and stale analysis preserve current authoring and live references',async({page})=>{
  await open(page);await run(page,12);
  const before=await authoring(page);
  const rejected=await page.evaluate(async()=>{
    const state=studioProbe.editor.codeViewSnapshot(),generated=GGEditor.generateCodeViewSource(state,'javascript');
    const base={language:'javascript',variableIds:generated.variableIds,capabilities:state.capabilities,resourceView:state.resourceView};
    const invalid=await codeViewService.convert({...base,source:'onStart(()=>{\nwhile(true){}\n})'}).then(()=>null,e=>({message:e.message,line:e.lineNumber}));
    const parsed=await codeViewService.convert({...base,source:generated.text});
    const forged=structuredClone(parsed);forged.ir.version=9;
    let forgedError;try{studioProbe.editor.prepareCodeView(forged,state);}catch(e){forgedError=e.message;}
    window.staleSnapshot=state;window.staleParsed=parsed;
    return {invalid,forgedError};
  });
  expect(rejected.invalid.line).toBe(2);expect(rejected.invalid.message).toContain('bucle');
  expect(rejected.forgedError).toBeTruthy();
  expect(await authoring(page)).toEqual(before);
  await selectContext(page,'2d');
  const field=page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill('6');await page.locator('.blocklyHtmlInput').press('Enter');
  const changed=await authoring(page);
  const stale=await page.evaluate(()=>{try{studioProbe.editor.prepareCodeView(staleParsed,staleSnapshot);return null;}catch(e){return e.message;}});
  expect(stale).toContain('autoría cambió');
  expect(await authoring(page)).toEqual(changed);
  expect((await snapshot(page)).x).toBe(12);
  expect((await page.evaluate(()=>GG.sprite.move('hero',1).then(()=>GG.sprite.get('hero')))).x).toBe(13);
});
test('CV-CONVERT-BROWSER-003: cancellation closes the isolated request and leaves both authoring and result intact',async({page})=>{
  await open(page);await run(page,12);
  const before=await authoring(page);
  const result=await page.evaluate(async()=>{
    const state=studioProbe.editor.codeViewSnapshot(),generated=GGEditor.generateCodeViewSource(state,'javascript');
    const pending=codeViewService.convert({language:'javascript',source:generated.text,variableIds:generated.variableIds})
      .then(()=>null,e=>e.message);
    codeViewService.dispose();
    return {message:await pending,state:codeViewService.stats()};
  });
  expect(result.message).toContain('cancelado');expect(result.state.active).toBe(false);
  expect(await authoring(page)).toEqual(before);expect((await snapshot(page)).x).toBe(12);
});

test('CV-CONVERT-BROWSER-004: an edit after preparation invalidates the commit without stopping the active result',async({page})=>{
  await open(page);
  await page.screenshot({path:artifactPath('code-view-incumbent-1280.png'),fullPage:true});
  await run(page,12);
  await page.evaluate(async()=>{
    const snapshot=studioProbe.editor.codeViewSnapshot(),generated=GGEditor.generateCodeViewSource(snapshot,'javascript');
    const parsed=await codeViewService.convert({language:'javascript',source:generated.text.replace('hero.move(4);','hero.move(25);'),
      variableIds:generated.variableIds,variableNames:generated.variableNames,capabilities:snapshot.capabilities,resourceView:snapshot.resourceView});
    window.preparedBeforeEdit=studioProbe.editor.prepareCodeView(parsed,snapshot);
  });
  await selectContext(page,'2d');
  await page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText').dblclick();
  await page.locator('.blocklyHtmlInput').fill('7');await page.locator('.blocklyHtmlInput').press('Enter');
  const before=await authoring(page);
  const message=await page.evaluate(()=>{try{studioProbe.editor.commit(preparedBeforeEdit);return null;}catch(error){return error.message;}});
  expect(message).toContain('autoría cambió');expect(await authoring(page)).toEqual(before);
  expect((await snapshot(page)).x).toBe(12);
  expect((await page.evaluate(()=>GG.sprite.move('hero',1).then(()=>GG.sprite.get('hero')))).x).toBe(13);
});

test('CV-CONVERT-BROWSER-005: opening a different project with identical authoring invalidates the previous project analysis',async({page})=>{
  await open(page);
  // Both projects use the same import path, including normalized resource views.
  const initial=await page.evaluate(async()=>({model:await studioProbe.project.capture(),catalog:studioProbe.project.catalog()}));
  const initialBytes=await createProjectArchive(initial.model,{catalog:initial.catalog});
  await page.locator('#open-project').setInputFiles({name:'proyecto-a.ggproj',mimeType:'application/zip',buffer:Buffer.from(initialBytes)});
  await expect(page.locator('#open-project')).toHaveValue('');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await run(page,12);
  const before=await authoring(page);
  await page.evaluate(async()=>{
    window.projectASnapshot=studioProbe.editor.codeViewSnapshot();
    const generated=GGEditor.generateCodeViewSource(projectASnapshot,'javascript');
    window.projectAParsed=await codeViewService.convert({language:'javascript',source:generated.text.replace('hero.move(4);','hero.move(25);'),
      variableIds:generated.variableIds,variableNames:generated.variableNames,capabilities:projectASnapshot.capabilities,resourceView:projectASnapshot.resourceView});
    window.authoringFingerprintBefore=JSON.stringify([studioProbe.editor.save(),studioProbe.editor.captureCapabilities(),studioProbe.editor.resourceView()]);
  });
  const {model,catalog}=await page.evaluate(async()=>({model:await studioProbe.project.capture(),catalog:studioProbe.project.catalog()}));
  model.project.id=randomUUID();
  const bytes=await createProjectArchive(model,{catalog});
  await page.locator('#open-project').setInputFiles({name:'otro-proyecto.ggproj',mimeType:'application/zip',buffer:Buffer.from(bytes)});
  await expect(page.locator('#open-project')).toHaveValue('');
  await expect.poll(()=>page.evaluate(()=>studioProbe.project.state().id)).toBe(model.project.id);
  await expect(page.locator('#run-editor')).toBeEnabled();
  const result=await page.evaluate(()=>{
    const same=authoringFingerprintBefore===JSON.stringify([studioProbe.editor.save(),studioProbe.editor.captureCapabilities(),studioProbe.editor.resourceView()]);
    let error=null;try{studioProbe.editor.prepareCodeView(projectAParsed,projectASnapshot);}catch(failure){error=failure.message;}
    return {same,error};
  });
  expect(result.same,'the authoring bytes alone cannot distinguish these projects').toBe(true);
  expect(result.error).toContain('autoría cambió');
  expect(await authoring(page)).toEqual(before);
});

test('CV-CONVERT-BROWSER-006: text event order preserves root positions and a subsequent native root move restores visual ordering',async({page})=>{
  await open(page);await run(page,12);
  const result=await page.evaluate(async()=>{
    const snapshot=studioProbe.editor.codeViewSnapshot(),before=snapshot.ir.scripts.map(script=>script.sourceBlockId);
    const originalPositions=Object.fromEntries(snapshot.state.blocks.blocks.map(block=>[block.id,{x:block.x,y:block.y}]));
    snapshot.ir.scripts.reverse();
    const generated=GGEditor.generateCodeViewSource(snapshot,'javascript');
    const parsed=await codeViewService.convert({language:'javascript',source:generated.text,variableIds:generated.variableIds,
      variableNames:generated.variableNames,capabilities:snapshot.capabilities,resourceView:snapshot.resourceView});
    const prepared=studioProbe.editor.prepareCodeView(parsed,snapshot);studioProbe.editor.commit(prepared);
    return {before,after:studioProbe.editor.program().scripts.map(script=>script.sourceBlockId),originalPositions,
      positions:Object.fromEntries(studioProbe.editor.save().blocks.blocks.map(block=>[block.id,{x:block.x,y:block.y}]))};
  });
  expect(result.after).toEqual([...result.before].reverse());expect(result.positions).toEqual(result.originalPositions);
  expect((await snapshot(page)).x).toBe(12);
  const root=page.locator('#blockly-editor .blocklyDraggable[data-id="editable-boost"] > .blocklyPath').first();
  const box=await root.boundingBox();expect(box).toBeTruthy();
  await page.mouse.move(box.x+10,box.y+12);await page.mouse.down();
  await page.mouse.move(box.x+10,box.y+102,{steps:12});await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>studioProbe.editor.program().scripts.map(script=>script.sourceBlockId))).toEqual(result.before);
  expect((await snapshot(page)).x).toBe(12);
});

test('CV-CONVERT-PYTHON: real Pyodide ast worker reconstructs the entire 2D corpus with all IDs and root positions',async({page})=>{
 test.setTimeout(180000);await open(page);
 const results=[];
 for(const [name,state] of Object.entries(corpus)){
  const captured=captureCodeViewSnapshot(state),generated=generateCodeViewSource(captured,'python');
  const result=await page.evaluate(async({state,generated})=>{
   studioProbe.editor.load(state);
   const snapshot=studioProbe.editor.codeViewSnapshot();
   const parsed=await codeViewService.convert({language:'python',source:generated.text,variableIds:generated.variableIds,variableNames:generated.variableNames});
   const candidate=studioProbe.editor.prepareCodeView(parsed,snapshot);
   return {state:candidate.state,ir:candidate.ir,previous:snapshot.state,oldIR:snapshot.ir};
  },{state,generated});
  expect(result.ir,name).toEqual(result.oldIR);expect(result.state,name).toEqual(result.previous);results.push({name,accepted:true});
 }
 await writeFile(artifactPath('python-corpus.json'),JSON.stringify({worker:'real language-origin Pyodide ast',results},null,2));
});
