import {test,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {clickVisible,selectContext,consult,chooseMode,revealPanel} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
// Rework E4-01…08: composition, identity, consultation, language, errors,
// orientation and Scratch state, verified with real controls and geometry.
test.setTimeout(180000);
const sb3=name=>fileURLToPath(new URL('../fixtures/sb3/'+name,import.meta.url));
const capture=(page,id)=>page.evaluate(id=>studioProbe.capabilityUI.capture(id),id);
const execution=page=>page.evaluate(()=>studioProbe.capabilityExecution.state());
const contextSnapshot=page=>page.evaluate(()=>studioProbe.capabilityExecution.snapshot());
const session=page=>page.evaluate(()=>studioProbe.state().sessionId);
async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(()=>studioProbe.project.ready());
  // Nominal closed case: entering closes the start panel; notices are acknowledged.
  if(await page.locator('#entry-toggle').getAttribute('aria-expanded')==='true')await page.locator('#entry-toggle').click();
  await expect(page.locator('#entry-panel')).toBeHidden();
}
async function acknowledge(page){if(await page.locator('#dismiss-notices').isVisible())await page.locator('#dismiss-notices').click();}
async function enable(page,id){
  await selectContext(page,id);
  const label={microbit:'Añadir micro:bit al proyecto',scene3d:'Añadir escena 3D',webapp:'Añadir aplicación web'}[id];
  const button=page.getByRole('button',{name:label,exact:true});
  if(await button.isVisible())await clickVisible(button);
  await expect(id==='microbit'?page.locator('#device-configured'):page.locator('#'+id+'-program')).toBeVisible();
  await acknowledge(page);
}
async function geometry(page) {
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  return page.evaluate(()=>{
    const rect=selector=>{const node=document.querySelector(selector);if(!node||!node.getClientRects().length)return null;const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
    return {scrollY,innerHeight,innerWidth,overflow:document.scrollingElement.scrollWidth>innerWidth,authoring:rect('.authoring'),result:rect('.scene'),slot:rect('#runner-slot:not([hidden])'),
      preview:rect('.context-preview:not([hidden]) iframe'),stop:rect('#stop-result'),blocks:['#blockly-editor','#device-blockly-editor','#scene3d-blockly-editor','#webapp-blockly-editor'].map(rect).find(Boolean)??null,source:rect('#text-source')};
  });
}
// Measures the fitted 4:3 image inside the runner frame, not only the iframe.
async function stageImage(page) {
  const frame=page.frameLocator('#runner-slot iframe');
  await expect(frame.locator('#stage')).toBeVisible();
  return frame.locator('#stage').evaluate(canvas=>{const r=canvas.getBoundingClientRect(),ratio=canvas.width/canvas.height,width=Math.min(r.width,r.height*ratio);return {width,height:width/ratio,ratio,box:{width:r.width,height:r.height}};});
}

for(const [width,height] of [[1280,720],[1440,900]])test(`E4-01: programa, transporte y resultado juntos sin desplazamiento a ${width}×${height}`,async({page})=>{
  await page.setViewportSize({width,height});await open(page);
  const samples=[];
  const steps=[
    ['2d',async()=>{}],
    ['text',async()=>{await selectContext(page,'text');await clickVisible(page.locator('#new-javascript'));}],
    ['microbit',async()=>enable(page,'microbit')],
    ['sb3',async()=>{await selectContext(page,'sb3');}],
    ['scene3d',async()=>enable(page,'scene3d')],
    ['webapp',async()=>enable(page,'webapp')]
  ];
  for(const [id,setup] of steps){
    await setup();await acknowledge(page);
    await expect(page.locator('body')).toHaveAttribute('data-workspace-context',id);
    const g=await geometry(page);samples.push({id,...g});
    expect(g.scrollY,id).toBe(0);expect(g.overflow,id).toBe(false);
    expect(g.authoring.top,id).toBeLessThanOrEqual(200);expect(g.result.top,id).toBeLessThanOrEqual(200);
    expect(g.authoring.right,id).toBeLessThan(g.result.left);
    expect(g.stop.bottom,id).toBeLessThanOrEqual(g.innerHeight);
    await expect(page.locator('#workspace-bar .controls:not([hidden]) button.run')).toBeInViewport();
    await expect(page.locator('#stop-result')).toBeInViewport();
    if(id==='text')expect(g.source.height,id).toBeGreaterThanOrEqual(240);
    else if(id!=='sb3')expect(g.blocks.height,id).toBeGreaterThanOrEqual(300);
    const image=await stageImage(page);
    expect(image.ratio).toBeCloseTo(4/3,2);
    // A result that belongs to another context is reference only: it yields height
    // to consultation, where 3D objects and web components are prepared.
    if(await page.locator('#result-other').isVisible()){
      expect(image.height,id).toBeGreaterThan(100);
      expect(await page.locator('#dock-content').evaluate(node=>node.getBoundingClientRect().height),id).toBeGreaterThanOrEqual(150);
    }else expect(image.height,id).toBeGreaterThanOrEqual(240);
    expect((g.slot??g.preview).bottom,id).toBeLessThanOrEqual(g.innerHeight);
    await page.screenshot({path:artifactPath(`rework-${width}x${height}-${id}.png`)});
  }
  expect((await execution(page)).contextId??null).toBeNull();
});

test('E4-01: vista ampliada reversible por teclado sin remontar el resultado',async({page})=>{
  await page.setViewportSize({width:1280,height:720});await open(page);
  const frame=await page.locator('#runner-slot iframe').elementHandle(),before=await geometry(page);
  await page.locator('#expand-result').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#expand-result')).toHaveAttribute('aria-pressed','true');
  const expanded=await geometry(page);expect(expanded.slot.height).toBeGreaterThan(before.slot.height);
  expect(await page.locator('.authoring').evaluate(node=>node.inert)).toBe(true);
  await expect(page.locator('#stop-result')).toBeInViewport();
  expect((await stageImage(page)).height).toBeGreaterThan(300);
  await page.keyboard.press('Escape');
  await expect(page.locator('#expand-result')).toHaveAttribute('aria-pressed','false');await expect(page.locator('#expand-result')).toBeFocused();
  expect(await page.locator('.authoring').evaluate(node=>node.inert)).toBe(false);
  expect(await page.locator('#runner-slot iframe').evaluate((node,old)=>node===old,frame)).toBe(true);await frame.dispose();
});

test('E4-03: Componentes web → 2D → web conserva selección visible, contenido y sesión',async({page})=>{
  await open(page);await enable(page,'webapp');
  const initial=await capture(page,'webapp'),scope=await session(page);
  const tools=await consult(page,'Componentes web');
  await selectContext(page,'2d');
  const selected=page.locator('#dock-tabs [role=tab][aria-selected=true]');
  await expect(selected).toHaveCount(1);await expect(selected).toBeVisible();
  await expect(page.locator('#tab-webapp-tools')).toBeHidden();await expect(page.locator('#tab-webapp-tools')).toHaveAttribute('aria-selected','false');
  await expect(page.locator('#'+await selected.getAttribute('aria-controls'))).toBeVisible();
  await expect(page.locator('#webapp-tools')).toBeHidden();
  // Keyboard: arrows move a real selection over visible tabs only.
  const first=await selected.getAttribute('id');await selected.focus();await page.keyboard.press('ArrowRight');
  const next=page.locator('#dock-tabs [role=tab][aria-selected=true]');await expect(next).not.toHaveAttribute('id',first);await expect(next).toBeFocused();
  await selectContext(page,'webapp');
  await expect(tools).toHaveAttribute('aria-selected','true');await expect(page.locator('#webapp-tools-heading')).toBeVisible();
  expect(await contextSnapshot(page)).toBeNull();expect(await session(page)).toBe(scope);
  expect((await capture(page,'webapp')).app).toEqual(initial.app);
});

test('E4-02: «Editando» y «Resultado de» distinguen 2D de una aplicación web activa; Detener es transversal',async({page})=>{
  await open(page);await enable(page,'webapp');
  await clickVisible(page.locator('#webapp-run'));
  await expect.poll(async()=>(await execution(page)).contextId).toBe('webapp');
  await expect(page.locator('#result-context')).toContainText('aplicación web');
  await selectContext(page,'2d');
  await expect(page.locator('#editing-context')).toHaveText('Editando: hero · bloques');
  await expect(page.locator('#result-other')).toBeVisible();await expect(page.locator('#result-other')).toContainText('Aplicación web');
  await expect(page.getByRole('button',{name:'Ejecutar bloques',exact:true})).toBeVisible();
  expect((await execution(page)).contextId).toBe('webapp');
  await clickVisible(page.locator('#stop-result'));
  expect(await contextSnapshot(page)).toBeNull();
  await expect(page.locator('#result-context')).toContainText('sin ejecutar');await expect(page.locator('#result-other')).toBeHidden();
  await expect(page.locator('#editor-status')).not.toContainText('en ejecución');
});

test('E4-02: cambios después de ejecutar se anuncian y se ejecutan solo por acción explícita',async({page})=>{
  await open(page);
  await clickVisible(page.getByRole('button',{name:'Ejecutar bloques',exact:true}));await expect(page.locator('#status')).toHaveText('Bloques ejecutados');
  await expect(page.locator('#result-pending')).toBeHidden();
  const field=page.locator('#blockly-editor [data-id="editable-move-n"] .blocklyText');
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill('7');await page.locator('.blocklyHtmlInput').press('Enter');
  await expect(page.locator('#result-pending')).toBeVisible();
  const before=await page.evaluate(()=>studioProbe.state().revision);
  await page.waitForTimeout(500);expect(await page.evaluate(()=>studioProbe.state().revision)).toBe(before);
  await page.locator('#run-pending').click();
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados');await expect(page.locator('#result-pending')).toBeHidden();
});

test('E4-04: bloques y propiedades en español conservan tipo, campos e identidad al reabrir',async({page,context})=>{
  await open(page);await enable(page,'scene3d');
  const blocks=page.locator('#scene3d-blockly-editor');
  await expect(blocks).toContainText('mover objeto');await expect(blocks).not.toContainText('scene3d.move');
  const before=await capture(page,'scene3d');
  expect(before.workspace.nodes.some(node=>node.type==='gg_scene3d_move')).toBe(true);
  await enable(page,'webapp');await consult(page,'Componentes web');
  const size=page.locator('label[for="webapp-property-props-styles-fontSize"]');
  await expect(size).toContainText('Estilo · Tamaño de letra');await expect(size.locator('.technical')).toHaveText('props.styles.fontSize');
  const archive=await page.evaluate(()=>studioProbe.project.export());
  const reopened=await context.newPage();await reopened.goto('/');await expect(reopened.locator('#run-editor')).toBeEnabled();
  await reopened.evaluate(async value=>{await studioProbe.project.ready();await studioProbe.project.open(value);},archive);
  expect((await capture(reopened,'scene3d')).workspace).toEqual(before.workspace);
  expect(await reopened.evaluate(()=>studioProbe.capabilityExecution.snapshot())).toBeNull();
});

test('E4-05: un identificador duplicado se explica junto al formulario y conserva borrador, autoría y sesión',async({page})=>{
  await open(page);await enable(page,'webapp');
  await clickVisible(page.locator('#webapp-run'));await expect.poll(async()=>(await execution(page)).contextId).toBe('webapp');
  const running=await execution(page);await consult(page,'Componentes web');
  await revealPanel(page,page.locator('#webapp-object'));await page.locator('#webapp-object').selectOption('web-add');const saved=await capture(page,'webapp');
  const id=page.locator('#webapp-property-id');await id.fill('web-form');
  await clickVisible(page.locator('#webapp-apply-properties'));
  const feedback=page.locator('#webapp-properties-feedback');
  await expect(feedback).toBeVisible();await expect(feedback).toHaveAttribute('role','alert');
  await expect(feedback).toContainText('Ya existe otro componente con el identificador «web-form»');await expect(feedback).toContainText('web-form-2');
  expect(await feedback.evaluate(node=>Boolean(node.closest('form')))).toBe(true);
  await expect(id).toHaveAttribute('aria-invalid','true');await expect(id).toHaveValue('web-form');
  expect(await capture(page,'webapp')).toEqual(saved);expect((await execution(page)).sessionId).toBe(running.sessionId);
  await id.fill('web-add');await clickVisible(page.locator('#webapp-apply-properties'));
  await expect(feedback).toBeHidden();await expect(id).not.toHaveAttribute('aria-invalid','true');
});

test('E4-04: un error de sintaxis se explica en español y conserva el detalle técnico y la línea',async({page})=>{
  await open(page);await selectContext(page,'text');
  await expect(page.locator('#text-empty')).toBeVisible();
  await clickVisible(page.locator('#new-javascript'));await expect(page.locator('#text-empty')).toBeHidden();
  await page.locator('#text-source').fill('const valor = ;');
  await clickVisible(page.getByRole('button',{name:'Ejecutar documento 2D',exact:true}));
  await consult(page,'Diagnósticos');
  const entry=page.locator('#console-entries li').filter({hasText:'Hay un error de escritura'});
  await expect(entry).toBeVisible();await expect(entry.locator('details')).toContainText('LANGUAGE_PREPARE');
  await expect(entry.locator('.diagnostic-title')).not.toContainText('LANGUAGE_PREPARE');
  await expect(page.locator('#text-source')).toHaveValue('const valor = ;');
});

test('E4-06: una actividad 2D consultada desde 3D anuncia su destino y no cambia ni ejecuta el programa',async({page})=>{
  await open(page);await enable(page,'scene3d');const before=await capture(page,'scene3d'),scope=await session(page);
  await consult(page,'Actividad');
  await expect(page.locator('#activity-destination')).toBeVisible();await expect(page.locator('#activity-destination')).toContainText('Escena 2D');
  await revealPanel(page,page.locator('#lessons-panel'));if(!await page.locator('#lessons-panel').evaluate(node=>node.open))await clickVisible(page.locator('#lessons-panel > summary'));
  const select=page.locator('#lesson-select');await expect(select).toBeEnabled();await select.selectOption({index:1});
  await expect(page.locator('#lesson-steps > li').first()).toBeVisible();
  expect(await capture(page,'scene3d')).toEqual(before);expect(await contextSnapshot(page)).toBeNull();expect(await session(page)).toBe(scope);
  await consult(page,'Ayuda');await expect(page.locator('#activity-pointer')).toContainText('Escena 2D');
});

test('E4-07: el estado del original Scratch y su siguiente acción están junto a la importación',async({page})=>{
  await open(page);await selectContext(page,'sb3');
  await expect(page.locator('#sb3-state-heading')).toHaveText('Sin original importado');
  for(const [file,heading,copy] of [['19-extension.sb3','Ejecución bloqueada',false],['08-clones.sb3','Se puede ejecutar; no se puede convertir',false],['01-start.sb3','Se puede ejecutar y convertir',true]]){
    await page.locator('#import-sb3').setInputFiles(sb3(file));
    await expect(page.locator('#sb3-state-heading')).toHaveText(heading);
    await expect(page.locator('#download-original-sb3')).toBeVisible();
    if(copy)await expect(page.locator('#copy-sb3-blocks')).toBeEnabled();else await expect(page.locator('#copy-sb3-blocks')).toBeHidden();
    if(heading==='Ejecución bloqueada'){
      await expect(page.locator('#run-sb3')).toBeDisabled();
      await page.locator('#sb3-review-coverage').click();await expect(page.locator('#sb3-coverage-panel')).toHaveJSProperty('open',true);
      await expect(page.locator('#sb3-coverage li').first()).toBeVisible();await expect(page.locator('#sb3-coverage li details').first()).toContainText('proyecto');
    }
    const state=await page.locator('#sb3-state').boundingBox(),input=await page.locator('#import-sb3').boundingBox();
    expect(state.y-input.y).toBeLessThan(200);
  }
  expect((await page.evaluate(()=>studioProbe.request('snapshot'))).mode).not.toBe('compatibility');
});

test('E4-08: estrecho y zoom conservan Programa, Resultado, Ayuda y Detener sin desbordar',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  const nav=page.getByRole('navigation',{name:'Recorrer el espacio'});
  for(const [label,target] of [['Resultado','#scene-heading'],['Ayuda','#workspace-help-heading'],['Programa','#editor-heading']]){
    await nav.getByRole('link',{name:label,exact:true}).click();await expect(page.locator(target)).toBeFocused();await expect(page.locator(target)).toBeInViewport();
    await expect(page.locator('#stop-result')).toBeInViewport();
  }
  await page.locator('#workspace-dock').scrollIntoViewIfNeeded();await expect(page.locator('#stop-result')).toBeInViewport();
  expect((await geometry(page)).overflow).toBe(false);
  await page.screenshot({path:artifactPath('rework-390x844-2d.png')});
});
