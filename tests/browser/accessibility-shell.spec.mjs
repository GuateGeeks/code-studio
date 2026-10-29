import {test, expect} from '@playwright/test';
import {selectContext,revealPanel,settled} from './workspace-controls.mjs';

const snapshot = page => page.evaluate(() => studioProbe.request('snapshot'));
async function open(page, mobile = false) {
  if (mobile) await page.setViewportSize({width: 390, height: 844});
  await page.goto('/'); await expect(page.locator('#run-editor')).toBeEnabled();
}
async function readOnlyBlockly(page) {
  await page.route('**/editor.bundle.js', async route => {
    const response = await route.fetch(), source = await response.text();
    const declaration = /(function createEditor\(container, example\) \{[\s\S]*?const workspace = \(0,[\w$]+\.withDeferredAudioContext\)\(\(\) => )([\w$]+)\.inject\(container, \{/;
    expect(source).toMatch(declaration);
    // These references are used only for reads below. Creation, selection,
    // movement, connection, field editing and deletion use actual keyboard IO.
    await route.fulfill({response, body: source.replace(declaration, '$1window.shellKeyboardWorkspace = (window.shellKeyboardBlockly = $2).inject(container, {')});
  });
}
async function keyboardState(page) {
  return page.evaluate(() => {
    const workspace = shellKeyboardWorkspace, manager = shellKeyboardBlockly.getFocusManager();
    const node = manager.getFocusedNode(), tree = manager.getFocusedTree();
    const block = tree?.getNavigator().getSourceBlockFromNode(node);
    return {blockId: block?.id ?? null, type: block?.type ?? null, field: node?.name ?? null,
      isBlock: node === block, flyout: Boolean(block?.workspace.isFlyout), moving: shellKeyboardBlockly.KeyboardMover.mover.isMoving(),
      category: workspace.getToolbox().getSelectedItem()?.getName() ?? null,
      blocks: workspace.getAllBlocks(false).map(block => ({id: block.id, type: block.type, parent: block.getParent()?.id ?? null, position: {...block.getRelativeToSurfaceXY()}}))};
  });
}
async function enterEditor(page) {
  await page.locator('#authoring-context').focus();
  for (let count = 0; count < 15; count++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => document.querySelector('#blockly-editor').contains(document.activeElement))) return;
  }
  throw new Error('Tab did not enter the real 2D Blockly editor');
}
async function category(page, name) {
  await page.keyboard.press('t');
  for (let count = 0; count < 12; count++) {
    if ((await keyboardState(page)).category === name) break;
    await page.keyboard.press('ArrowDown');
  }
  expect((await keyboardState(page)).category).toBe(name);
  await nextFrame(page);
  await page.keyboard.press('ArrowRight');
}
async function createFromFlyout(page, categoryName, type) {
  await category(page, categoryName);
  const before = (await keyboardState(page)).blocks.map(block => block.id);
  for (let count = 0; count < 12; count++) {
    const current = await keyboardState(page);
    if (current.flyout && current.type === type) break;
    await page.keyboard.press('ArrowDown');
  }
  expect((await keyboardState(page)).type).toBe(type); expect((await keyboardState(page)).flyout).toBe(true);
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await keyboardState(page)).moving).toBe(true);
  const created = (await keyboardState(page)).blocks.find(block => block.type === type && !before.includes(block.id));
  expect(created).toBeTruthy(); return created.id;
}
async function nextFrame(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function connectByArrows(page, movingId, parentId) {
  // Read workspace coordinates of the real rendered connections. Each 20-unit
  // step is performed by Blockly's installed KeyboardMover via an Arrow key.
  for (let count = 0; count < 100; count++) {
    const delta = await page.evaluate(({movingId, parentId}) => {
      const moving = shellKeyboardWorkspace.getBlockById(movingId), parent = shellKeyboardWorkspace.getBlockById(parentId);
      const position = (block, connection) => {
        const xy = block.getRelativeToSurfaceXY(), offset = connection.getOffsetInBlock();
        return {x: xy.x + offset.x, y: xy.y + offset.y};
      };
      const from = position(moving, moving.previousConnection), to = position(parent, parent.getInput('DO').connection);
      return {x: to.x - from.x, y: to.y - from.y};
    }, {movingId, parentId});
    if (Math.abs(delta.x) <= 12 && Math.abs(delta.y) <= 12) break;
    await page.keyboard.press(Math.abs(delta.x) > 12 ? delta.x > 0 ? 'ArrowRight' : 'ArrowLeft' : delta.y > 0 ? 'ArrowDown' : 'ArrowUp');
  }
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(({movingId, parentId}) => shellKeyboardWorkspace.getBlockById(parentId).getInputTargetBlock('DO')?.id === movingId, {movingId, parentId})).toBe(true);
}
async function backToBlock(page, id) {
  for (let count = 0; count < 10; count++) {
    const current = await keyboardState(page);
    if (current.blockId === id && current.isBlock) return;
    await page.keyboard.press('ArrowLeft');
  }
  throw new Error('Keyboard did not return from the field to its source block');
}

for (const mobile of [false, true]) test('GG-F7-SHELL: Blockly creates and connects with native keys, edits, cancels movement, deletes/undoes and saves (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}, testInfo) => {
  test.setTimeout(150000); await readOnlyBlockly(page); await open(page, mobile);
  expect(await page.evaluate(() => document.querySelector('#blockly-editor').contains(shellKeyboardWorkspace.getInjectionDiv()))).toBe(true);
  // Only the empty initial fixture is supplied through the diagnostic hook.
  // Every tested block is created later from the native toolbox by keyboard.
  await page.evaluate(() => studioProbe.editor.load({blocks: {languageVersion: 0, blocks: []}}));
  await enterEditor(page);
  const hat = await createFromFlyout(page, 'Eventos', 'gg_when_start');
  for (let count = 0; count < 5; count++) await page.keyboard.press('ArrowRight');
  for (let count = 0; count < 3; count++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); await expect.poll(async () => (await keyboardState(page)).moving).toBe(false);
  const position = (await keyboardState(page)).blocks.find(block => block.id === hat).position;
  await page.keyboard.press('m'); await expect.poll(async () => (await keyboardState(page)).moving).toBe(true);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
  await expect.poll(async () => (await keyboardState(page)).moving).toBe(false);
  expect((await keyboardState(page)).blocks.find(block => block.id === hat).position).toEqual(position);
  await page.keyboard.press('w');
  const move = await createFromFlyout(page, 'Movimiento', 'gg_move');
  await connectByArrows(page, move, hat);
  for (let count = 0; count < 8; count++) {
    const current = await keyboardState(page);
    if (current.field === 'NUM' || current.type === 'math_number') break;
    await page.keyboard.press('ArrowRight');
  }
  await page.keyboard.press('Enter'); await expect(page.locator('.blocklyHtmlInput')).toBeVisible();
  await page.keyboard.press('Control+A'); await page.keyboard.type('9'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(id => Number(shellKeyboardWorkspace.getBlockById(id).getInputTargetBlock('STEPS').getFieldValue('NUM')), move)).toBe(9);
  await backToBlock(page, move); await page.keyboard.press('Delete');
  await expect.poll(() => page.evaluate(id => Boolean(shellKeyboardWorkspace.getBlockById(id)), move)).toBe(false);
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.evaluate(({move, hat}) => shellKeyboardWorkspace.getBlockById(hat).getInputTargetBlock('DO')?.id === move, {move, hat})).toBe(true);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => page.evaluate(id => Boolean(shellKeyboardWorkspace.getBlockById(id)), move)).toBe(false);
  await page.keyboard.press('Control+z'); await nextFrame(page);
  const authored = await page.evaluate(() => studioProbe.editor.save());
  // E4 places transport before the workspace. Reverse native tab navigation
  // exits Blockly toward that toolbar; no synthetic focus or forced click.
  for (let count = 0; count < 20; count++) {
    if (await page.locator('#run-editor').evaluate(button => button === document.activeElement)) break;
    await page.keyboard.press('Shift+Tab');
  }
  await expect(page.locator('#run-editor')).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText('Bloques ejecutados'); await expect.poll(async () => (await settled(snapshot, page)).x).toBe(9);
  await page.locator('#stop-result').focus(); await page.keyboard.press('Enter'); await expect(page.locator('#run-editor')).toBeEnabled();
  expect((await snapshot(page)).x).toBe(0);
  await page.locator('#project-menu > summary').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#project-menu')).toHaveJSProperty('open', true);
  await page.locator('#save-project').focus();
  const downloadEvent = page.waitForEvent('download'); await page.keyboard.press('Enter'); const download = await downloadEvent;
  const path = testInfo.outputPath('keyboard-authored.ggproj'); await download.saveAs(path);
  await page.locator('#open-project').setInputFiles(path);
  await expect.poll(() => page.evaluate(() => studioProbe.editor.save())).toEqual(authored);
  expect((await snapshot(page)).x).toBe(0);
  await page.locator('#run-editor').focus(); await page.keyboard.press('Enter');
  await expect.poll(async () => (await settled(snapshot, page)).x).toBe(9);
});

for (const mobile of [false, true]) test('GG-F7-SHELL: property Apply preserves focus/caret, invalid draft remains editable and Run returns focus (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}) => {
  test.setTimeout(120000); await open(page, mobile);
  await page.locator('#authoring-context').selectOption('webapp');
  const enable = page.getByRole('button', {name: 'Añadir aplicación web', exact: true});
  await enable.focus(); await enable.press('Enter');
  await expect(page.locator('#webapp-mode input:checked')).toBeFocused();
  const tools = page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Componentes web',exact:true});
  await tools.focus(); await tools.press('Enter');
  await expect(tools).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#webapp-tools-heading')).toBeVisible();
  await revealPanel(page,page.locator('#webapp-object'));await page.locator('#webapp-object').selectOption('web-input');
  const label = page.locator('#webapp-property-props-label'); await label.fill('Alumno accesible');
  await label.press('Home'); for (let count = 0; count < 3; count++) await page.keyboard.press('ArrowRight');
  await page.keyboard.down('Shift'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.up('Shift');
  const selection = await label.evaluate(input => [input.selectionStart, input.selectionEnd, input.selectionDirection]);
  await label.press('Enter'); await expect(label).toBeFocused();
  expect(await label.evaluate(input => [input.selectionStart, input.selectionEnd, input.selectionDirection])).toEqual(selection);
  await expect(page.locator('#webapp-error')).toBeEmpty();
  const before = await page.evaluate(() => studioProbe.capabilityUI.capture('webapp'));
  const id = page.locator('#webapp-property-id'); await id.fill('web-form'); await id.press('Home'); await id.press('ArrowRight');
  await id.press('Enter'); await expect(page.locator('#webapp-properties-feedback')).not.toBeEmpty();
  await expect(page.locator('#webapp-properties-feedback')).toHaveAttribute('role', 'alert'); await expect(id).toHaveValue('web-form'); await expect(id).toBeFocused();
  expect(await id.evaluate(input => input.selectionStart)).toBe(1);
  expect(await page.evaluate(() => studioProbe.capabilityUI.capture('webapp'))).toEqual(before);
  await id.fill('web-input'); await id.press('Enter'); await expect(page.locator('#webapp-error')).toBeEmpty(); await expect(id).toBeFocused();
  const run = page.locator('#webapp-run'); await run.focus(); await run.press('Enter');
  await expect(page.frameLocator('iframe[title="Aplicación web"]').getByLabel('Alumno accesible')).toBeVisible({timeout: 45000});
  await expect(run).toBeEnabled(); await expect(run).toBeFocused();
  await page.locator('#stop-result').focus(); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => studioProbe.capabilityExecution.state().contextId)).toBe(null);
  expect(await page.evaluate(() => studioProbe.capabilityUI.capture('webapp'))).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const mobile of [false, true]) test('GG-F7-SHELL: native skip links, named live console and keyboard diagnostic links retain useful focus (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}) => {
  await readOnlyBlockly(page); await open(page, mobile);
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', {name: 'Ir al programa', exact: true})).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#authoring-context')).toBeFocused();
  for (const [name, id] of [['Ir al escenario', 'scene-heading'], ['Ir a la consola', 'console-heading'], ['Ir al texto', 'text-heading']]) {
    const link = page.getByRole('link', {name, exact: true}); await link.focus(); await link.press('Enter'); await expect(page.locator('#' + id)).toBeFocused();
  }
  await selectContext(page,'2d');
  const help = page.getByText('Usar bloques con el teclado', {exact: true}); await help.focus(); await help.press('Enter');
  await expect(page.locator('#blockly-keyboard-help')).toBeVisible(); await expect(page.locator('#blockly-keyboard-help')).toContainText('Ctrl/Cmd + Z');
  await expect(page.getByRole('list', {name: 'Mensajes de consola', exact: true})).toHaveAttribute('aria-live', 'polite');
  // Diagnostic fixture only: the actual console renders and links to the real
  // source block through its normal public diagnostic presentation API.
  await page.evaluate(() => studioProbe.console.local({level: 'error', code: 'KEYBOARD_FOCUS', origin: 'generation', message: 'Revisa este bloque.', sourceBlockId: 'editable-start'}));
  const source = page.getByRole('button', {name: 'Ver bloque editable-start', exact: true, includeHidden: true}); await source.focus();
  await page.evaluate(() => studioProbe.console.local({level: 'info', code: 'KEYBOARD_FOCUS_NEXT', origin: 'shell', message: 'Otro diagnóstico.'}));
  await expect(source).toBeFocused(); await source.press('Enter');
  await expect.poll(async () => (await keyboardState(page)).blockId).toBe('editable-start');
  expect(await page.evaluate(() => document.querySelector('#blockly-editor').contains(document.activeElement))).toBe(true);
  await expect(page.locator('#console-selection')).toContainText('editable-start');
});
