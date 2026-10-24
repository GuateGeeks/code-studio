import {test,expect} from '@playwright/test';
import {clickVisible,selectContext,revealPanel,settled} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
test.setTimeout(120000);
const snapshot=page=>page.evaluate(()=>studioProbe.request('snapshot'));
const simulator=page=>page.evaluate(()=>studioProbe.request('simulator-snapshot'));
async function open(page){
  await page.goto('/');await expect(page.locator('#run-editor')).toBeEnabled();
  await page.evaluate(()=>studioProbe.project.ready());
  await selectContext(page,'microbit');await clickVisible(page.locator('#enable-device'));
  await expect(page.locator('#device-status')).toContainText('Dispositivo añadido');
  // Portable fixture: button A both plots a LED and sends the existing scene message.
  await page.evaluate(async()=>{
    const project=JSON.parse(await studioProbe.project.export());
    project.authoring.blockly={blocks:{languageVersion:0,blocks:[
      {type:'gg_when_start',id:'joint-start',x:20,y:20},
      {type:'gg_when_message',id:'joint-receiver',fields:{MESSAGE:'microbit-A'},x:20,y:100,inputs:{DO:{block:{type:'gg_move',id:'joint-move',inputs:{STEPS:{shadow:{type:'math_number',id:'joint-steps',fields:{NUM:10}}}}}}}}
    ]}};
    const plot=project.capabilities.config['gg.microbit'].workspace.nodes.find(node=>node.id==='device-number');
    plot.type='gg_mb_plot';plot.fields={X:0,Y:0};
    await studioProbe.project.open(JSON.stringify(project));
  });
  await expect(page.locator('#run-device')).toBeEnabled();
}
async function consultFirmware(page){
  const tab=page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Firmware',exact:true});
  await tab.focus();await tab.press('Enter');await expect(tab).toHaveAttribute('aria-selected','true');await expect(page.locator('#device-firmware-heading')).toBeVisible();
}
async function run(page){await clickVisible(page.locator('#run-device'));await expect(page.locator('#device-status')).toContainText('Escena y dispositivo activos');}
async function pressA(page){await clickVisible(page.frameLocator('#runner-slot iframe').frameLocator('iframe').getByRole('button',{name:'A',exact:true}));}

for(const width of [1280,1440])test('E4 micro:bit: edición real, placa y escena próximas, consulta sin autorun a '+width,async({page})=>{
  await page.setViewportSize({width,height:900});await open(page);
  const field=page.locator('#device-blockly-editor [data-id="device-number"]').getByRole('button',{name:/Edit number:/}).first();
  await field.dblclick();await page.locator('.blocklyHtmlInput').fill('4');await page.locator('.blocklyHtmlInput').press('Enter');
  const before=await page.evaluate(()=>({graph:studioProbe.deviceEditor.captureGraph(),source:document.querySelector('#source').value,session:studioProbe.state().sessionId,scrollY}));
  await consultFirmware(page);
  expect(await page.evaluate(()=>scrollY)).toBe(before.scrollY);
  expect(await page.evaluate(()=>studioProbe.state().sessionId)).toBe(before.session);
  expect(await page.evaluate(()=>studioProbe.deviceEditor.captureGraph())).toEqual(before.graph);
  await run(page);await pressA(page);
  await expect.poll(async()=>(await simulator(page)).matrix[4]).toBe(1);
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(10);
  // Check the real rendering surfaces, not only the outer slot.
  await page.locator('#authoring-context').scrollIntoViewIfNeeded();
  const editor=await page.locator('#device-blockly-editor').boundingBox();
  const stage=await page.frameLocator('#runner-slot iframe').locator('#stage').boundingBox();
  const board=await page.frameLocator('#runner-slot iframe').locator('iframe').boundingBox();
  expect(editor.right??editor.x+editor.width).toBeLessThan(stage.x);
  expect(editor.height).toBeGreaterThanOrEqual(300);
  expect(stage.width).toBeGreaterThan(200);expect(stage.height).toBeGreaterThan(70);
  expect(board.width).toBeGreaterThan(200);expect(board.height).toBeGreaterThan(250);
  for(const control of await page.frameLocator('#runner-slot iframe').locator('.stage-input select,.stage-input button').all())expect((await control.boundingBox()).height).toBeGreaterThanOrEqual(44);
  expect(board.x).toBeGreaterThanOrEqual(stage.x+stage.width-1);
  expect(Math.max(stage.y+stage.height,board.y+board.height)).toBeLessThan(900);
  for(const id of ['run-device','stop-result'])await expect(page.locator('#'+id)).toBeInViewport();
  expect(await page.locator('#dock-content').evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
  const composition=await page.evaluate(()=>({workspace:document.querySelector('.workspace-layout').getBoundingClientRect().bottom,dock:document.querySelector('#workspace-dock').getBoundingClientRect().bottom,footer:document.querySelector('footer').getBoundingClientRect().top,height:document.documentElement.scrollHeight}));
  expect(composition.footer).toBeGreaterThanOrEqual(Math.max(composition.workspace,composition.dock));
  expect(composition.height).toBeLessThan(1400);
  await page.screenshot({path:artifactPath('e4mb-integrated-'+width+'.png')});
  await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-device')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
  expect(await page.evaluate(()=>studioProbe.deviceEditor.captureGraph())).toEqual(before.graph);
  await expect(page.locator('#source')).toHaveValue(before.source);
});

test('E4 micro:bit: una instancia TypeScript, modos independientes, HEX actual y reapertura sin ejecutar',async({page,context})=>{
  await open(page);const graph=await page.evaluate(()=>studioProbe.deviceEditor.captureGraph());
  const source="input.onButtonPressed(Button.A, function () { led.plot(1, 1) })";
  await page.locator('#device-mode input[value="typescript"]').check();
  await expect(page.locator('#device-text-slot #source')).toHaveCount(1);
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill(source);await revealPanel(page,page.locator('#source'));await page.locator('#source').press('Home');await revealPanel(page,page.locator('#source'));await page.locator('#source').press('Shift+ArrowRight');
  const handle=await page.locator('#source').elementHandle();
  await page.locator('#device-mode input[value="blocks"]').check();
  await expect(page.locator('#device-text-secondary #source')).toHaveCount(1);
  await page.locator('#device-mode input[value="typescript"]').check();
  expect(await page.locator('#source').evaluate((node,original)=>node===original,handle)).toBe(true);
  await expect(page.locator('#source')).toHaveValue(source);await expect(page.locator('#source')).toHaveCount(1);
  expect(await page.evaluate(()=>studioProbe.deviceEditor.captureGraph())).toEqual(graph);
  expect(await page.evaluate(()=>studioProbe.device.state().simulation)).toBeNull();
  await run(page);await pressA(page);await expect.poll(async()=>(await simulator(page)).matrix[6]).toBe(1);
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(10);
  await consultFirmware(page);await clickVisible(page.locator('#compile-device'));
  await expect(page.locator('#download-device')).toBeEnabled({timeout:45000});
  const download=page.waitForEvent('download');await clickVisible(page.locator('#download-device'));
  expect((await download).suggestedFilename()).toMatch(/\.hex$/);
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill(source+'\n// otro intento');
  await expect(page.locator('#download-device')).toBeDisabled();await expect(page.locator('#transfer-device')).toBeDisabled();
  const exported=await page.evaluate(()=>studioProbe.project.export());
  const reopened=await context.newPage();await reopened.goto('/');await expect(reopened.locator('#run-editor')).toBeEnabled();
  await reopened.evaluate(async value=>{await studioProbe.project.ready();await studioProbe.project.open(value);},exported);
  await selectContext(reopened,'microbit');
  await expect(reopened.locator('#device-mode input[value="typescript"]')).toBeChecked();
  await expect(reopened.locator('#device-text-slot #source')).toHaveValue(source+'\n// otro intento');
  expect(await reopened.evaluate(()=>studioProbe.device.state().simulation)).toBeNull();expect((await snapshot(reopened)).x).toBe(0);
  await handle.dispose();
});

test('E4 micro:bit: consulta y texto por teclado en estrecho con movimiento reducido',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await open(page);
  await page.locator('#device-mode input:checked').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('#device-mode input[value="typescript"]')).toBeChecked();
  await clickVisible(page.locator('#edit-device-text'));await expect(page.locator('#source')).toBeFocused();
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill('led.plot(2, 2)');
  await consultFirmware(page);await expect(page.locator('#compile-device')).toBeInViewport();
  await run(page);await expect.poll(async()=>(await simulator(page)).matrix[12]).toBe(1);
  await clickVisible(page.locator('#stop-result'));await expect(page.locator('#run-device')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await selectContext(page,'2d');await expect(page.locator('#device-transport')).toBeHidden();
  await selectContext(page,'microbit');await expect(page.locator('#device-text-slot #source')).toHaveValue('led.plot(2, 2)');
});
