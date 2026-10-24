import {test,expect} from '@playwright/test';
import {selectContext,clickVisible,consult} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';

async function open(page) {
  await page.goto('/');
  await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(()=>studioProbe.project.ready());
}
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
let errors;
test.beforeEach(({page})=>{errors=[];page.on('pageerror',error=>errors.push(error.message));});
test.afterEach(()=>expect(errors).toEqual([]));

for(const narrow of [false,true])test('E2: navegación contextual y ayuda de los seis contextos '+(narrow?'estrecho':'escritorio'),async({page})=>{
  if(narrow)await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  const before=await page.evaluate(()=>studioProbe.editor.save());
  const scope=await page.evaluate(()=>studioProbe.state().sessionId);
  for(const [id,name]of [['2d','Escena 2D'],['text','Texto para 2D'],['microbit','micro:bit'],['sb3','Scratch'],['scene3d','Escena 3D'],['webapp','Aplicación web']]){
    await selectContext(page,id);
    // Narrow: direct links to Program, Result and Help. Desktop: all three regions are visible together.
    if(narrow)for(const [label,target]of [['Programa','editor-heading'],['Resultado','scene-heading'],['Ayuda','workspace-help-heading']]){
      const link=page.getByRole('navigation',{name:'Recorrer el espacio'}).getByRole('link',{name:label,exact:true});
      await link.focus();await link.press('Enter');await expect(page.locator('#'+target)).toBeFocused();
    }
    else {
      for(const region of ['.authoring','.scene','#workspace-dock'])await expect(page.locator(region)).toBeInViewport();
      await consult(page,'Ayuda');
    }
    await expect(page.locator('#workspace-help-heading')).toContainText(name);
    if(id==='2d')await expect(page.locator('#restore-editor')).toBeVisible();
    else await expect(page.locator('#restore-editor')).toBeHidden();
    await expect(page.locator('#result-context')).toContainText('sin ejecutar');
    // Availability is the tool's tab; its panel shows only when selected.
    if(['2d','text','microbit'].includes(id))await expect(page.locator('#tab-inspector')).toBeVisible();
    else await expect(page.locator('#tab-inspector')).toBeHidden();
    if(['scene3d','webapp','microbit','sb3'].includes(id))await expect(page.locator('#tab-code')).toBeHidden();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(scope);
  }
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(before);
  await clickVisible(page.locator('#offline-panel > summary'));
  await expect(page.locator('#offline-panel')).toHaveJSProperty('open',true);
  await expect(page.locator('#prepare-offline')).toBeInViewport();
});

test('E2: copia 2D, borrador inválido, comparación y diagnóstico revelan la fuente real',async({page})=>{
  await open(page);const blocks=await page.evaluate(()=>studioProbe.editor.save());
  await clickVisible(page.locator('#copy-javascript'));
  await expect(page.locator('#authoring-context')).toHaveValue('text');
  await expect(page.locator('#text-source')).toBeFocused();
  await page.locator('#text-name').fill('');await page.locator('#text-source').fill('const pendiente =');
  const draft=await page.locator('#text-source').inputValue();
  await selectContext(page,'webapp');await selectContext(page,'text');
  await expect(page.locator('#text-source')).toHaveValue(draft);await expect(page.locator('#text-name')).toHaveValue('');
  expect(await page.evaluate(()=>studioProbe.editor.save())).toEqual(blocks);
  await page.locator('#text-name').fill('Mi copia');
  await page.locator('#text-source').fill("await GG.sprite.move('hero', 7);\nthrow new Error('revisar mi copia');");
  await clickVisible(page.locator('#run-document'));await expect(page.locator('#console-entries')).toContainText('revisar mi copia',{timeout:60000});
  await expect(page.locator('#result-context')).toContainText('Mi copia');
  await selectContext(page,'2d');
  await clickVisible(page,page.getByRole('button', {name:'Ver línea 2',exact:true, includeHidden: true}));
  await expect(page.locator('#authoring-context')).toHaveValue('text');await expect(page.locator('#text-source')).toBeFocused();
  expect((await snapshot(page)).x).toBe(7);
  await selectContext(page,'webapp');
  await expect(page.locator('#result-context')).toContainText('Mi copia');
  await clickVisible(page.locator('#stop-result'));await expect(page.locator('#result-context')).toContainText('sin ejecutar');
  expect((await snapshot(page)).x).toBe(0);
});

for(const id of ['scene3d','webapp'])test('E2: edición independiente en '+id+' y detención desde otro contexto',async({page})=>{
  test.setTimeout(120000);await open(page);await selectContext(page,id);
  await clickVisible(page.getByRole('button',{name:id==='scene3d'?'Añadir escena 3D':'Añadir aplicación web',exact:true}));
  await expect(page.locator('#'+id+'-mode')).toBeVisible();
  const original=await page.evaluate(id=>studioProbe.capabilityUI.capture(id),id);
  await clickVisible(page.getByRole('button',{name:'Crear copia JavaScript',exact:true}));
  await expect(page.locator('#text-source')).toBeVisible();await expect(page.locator('#text-source')).toBeFocused();
  await expect(page.locator('#text-destination')).toContainText(id==='scene3d'?'Escena 3D':'Aplicación web');
  await expect(page.locator('#run-document')).toBeHidden();
  await expect(page.locator('#text-run-document')).toBeHidden();
  const source=await page.locator('#text-source').inputValue();
  expect(source).toContain('GG.');
  const modifiedSource=source.replace('await GG.context.activate()', 'console.log("mi documento contextual");\nawait GG.context.activate()');
  expect(modifiedSource).not.toBe(source);
  await page.locator('#text-source').fill(modifiedSource);
  await page.locator('#text-context-run').focus();await page.locator('#text-context-run').press('Enter');
  await expect(page.locator('#'+id+'-run')).toBeFocused();
  await clickVisible(page.locator('#'+id+'-run'));
  await expect.poll(()=>page.evaluate(()=>studioProbe.capabilityExecution.state().contextId)).toBe(id);
  await expect(page.locator('#console-entries')).toContainText('mi documento contextual',{timeout:60000});
  const current=await page.evaluate(id=>studioProbe.capabilityUI.capture(id),id);
  expect(current.workspace).toEqual(original.workspace);
  await selectContext(page,'2d');
  await expect(page.locator('#result-context')).toContainText(id==='scene3d'?'escena 3D':'aplicación web');
  expect(await page.evaluate(()=>studioProbe.capabilityExecution.state().contextId)).toBe(id);
  await clickVisible(page.locator('#stop-result'));
  await expect.poll(()=>page.evaluate(()=>studioProbe.capabilityExecution.state().contextId)).toBe(null);
  await selectContext(page,id);await expect(page.locator('#text-source')).toHaveValue(modifiedSource);
  await expect(page.locator('#new-python')).toBeHidden();
  await selectContext(page,'text');await clickVisible(page.locator('#new-javascript'));
  await page.locator('#text-source').fill('// Borrador para 2D');
  const documentsBefore=await page.evaluate(()=>studioProbe.textDocuments.capture());
  await selectContext(page,id);
  await expect(page.locator('#text-source')).toHaveValue(modifiedSource);
  expect(await page.evaluate(()=>studioProbe.textDocuments.capture())).toEqual(documentsBefore);
  await selectContext(page,'text');await expect(page.locator('#text-source')).toHaveValue('// Borrador para 2D');
  await selectContext(page,id);
  await consult(page,'Ayuda');
  await clickVisible(page.locator('#context-tools').getByRole('link',{name:id==='scene3d'?'Objetos y estado inicial':'Componentes y estado inicial'}));
  await expect(page.locator('#'+id+'-objects')).toHaveJSProperty('open',true);
  await page.screenshot({path:artifactPath('e2-'+id+'-workspace.png')});
});

test('E2: un diagnóstico textual 3D vuelve al destino que produjo el error',async({page})=>{
  await open(page);await selectContext(page,'scene3d');
  await clickVisible(page.getByRole('button',{name:'Añadir escena 3D',exact:true}));
  await expect(page.locator('#scene3d-mode')).toBeVisible();
  await clickVisible(page.getByRole('button',{name:'Crear copia JavaScript',exact:true}));
  await page.locator('#text-source').fill('throw new Error("diagnóstico de la escena");');
  await clickVisible(page.locator('#scene3d-run'));
  await expect(page.locator('#console-entries')).toContainText('diagnóstico de la escena');
  const documentId=await page.locator('#text-document').inputValue();
  await expect.poll(()=>page.evaluate(()=>studioProbe.capabilityExecution.state().sourceDocument)).toBe(documentId);
  await selectContext(page,'2d');
  await clickVisible(page,page.getByRole('button', {name:'Ver línea 1',exact:true, includeHidden: true}));
  await expect(page.locator('#authoring-context')).toHaveValue('scene3d');
  await expect(page.locator('#text-source')).toBeFocused();
  await expect(page.locator('#text-destination')).toContainText('Escena 3D');
  await expect(page.locator('#run-document')).toBeHidden();
});

