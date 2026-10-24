import {test, expect} from '@playwright/test';
import {clickVisible,selectContext,revealPanel} from './workspace-controls.mjs';
import {fileURLToPath} from 'node:url';
import {createProject} from '../../src/project-format.mjs';
import {triangleData, encodeGlb} from '../fixtures/scene3d/glb.mjs';

const texturedPath = fileURLToPath(new URL('../fixtures/scene3d/triangle-textured.glb', import.meta.url));
const snapshot = page => page.evaluate(() => studioProbe.capabilityExecution.snapshot());
const execution = page => page.evaluate(() => studioProbe.capabilityExecution.state());
const entity = (scene, id) => scene.entities.find(item => item.id === id);
const section = page => page.locator('#scene3d-authoring');
const runButton = page => page.getByRole('button', {name: 'Ejecutar escena 3D', exact: true});
const stopButton = page => page.getByRole('button', {name: 'Detener', exact: true});

async function click(control) {
  await clickVisible(control);
}
async function openAdvanced(page) {
  await page.goto('/');
  await page.evaluate(() => window.studioProbe?.project.ready());
  await expect.poll(() => page.evaluate(() => Boolean(window.studioProbe?.project.state().ready))).toBe(true);
  await selectContext(page,'scene3d');
  await click(section(page).getByRole('button', {name: 'Añadir escena 3D', exact: true}));
  await expect(page.locator('#scene3d-mode')).toBeVisible();
  await click(page.getByRole('tablist',{name:'Consulta'}).getByRole('tab',{name:'Objetos 3D',exact:true}));
  await expect(page.locator('#scene3d-tools-heading')).toBeVisible();
  await click(page.locator('#enable-3d-advanced'));
  await expect.poll(() => page.evaluate(() => studioProbe.project.capabilities()?.locks.some(lock => lock.id === 'gg.3d-advanced') ?? false)).toBe(true);
  await expect(page.locator('#import-glb')).toBeVisible();
  await expect(page.locator('#import-glb')).toBeEnabled();
}
async function properties(page, id, changes) {
  await revealPanel(page,page.locator('#scene3d-object'));await page.locator('#scene3d-object').selectOption(id);
  for (const [path, value] of Object.entries(changes)) {
    const input = page.locator('#scene3d-property-' + path.replaceAll('.', '-'));
    if (typeof value === 'boolean') await input.setChecked(value);
    else await input.fill(String(value));
  }
  await click(page.getByRole('button', {name: 'Aplicar propiedades', exact: true}));
  await expect(page.locator('#scene3d-error')).toBeEmpty();
}
async function projectContent(page) {
  return page.evaluate(async () => {
    const model = await studioProbe.project.capture();
    return {project: {id: model.project.id, name: model.project.name, createdAt: model.project.createdAt},
      authoring: model.authoring, capabilities: model.capabilities, resources: model.resources, locks: model.locks};
  });
}
async function installDeclarativeFixture(page, change) {
  const model = await page.evaluate(() => studioProbe.project.capture());
  const catalog = await page.evaluate(() => studioProbe.project.catalog());
  change(model.capabilities.config['gg.3d-basic']);
  const candidate = await createProject({...model.project, ...model.authoring, resources: model.resources, capabilities: model.capabilities, catalog});
  await page.evaluate(serialized => studioProbe.project.open(serialized), JSON.stringify(candidate));
  await expect(page.locator('#scene3d-error')).toBeEmpty();
}
async function run(page, assertion) {
  await click(runButton(page));
  await expect.poll(async () => {
    const current = await snapshot(page);
    return current ? assertion(current) : false;
  }, {timeout: 45000}).toBe(true);
  await expect(page.frameLocator('.context-preview:not([hidden]) iframe[title="Escena 3D"]').locator('canvas')).toBeVisible();
}
async function bluePixels(page) {
  // Read the actual preserved WebGL framebuffer. A hidden blue sphere cannot
  // satisfy this check: the textured GLB is the only visible blue geometry.
  await page.locator('.context-preview:not([hidden]) iframe[title="Escena 3D"]').scrollIntoViewIfNeeded();
  return page.frameLocator('.context-preview:not([hidden]) iframe[title="Escena 3D"]').locator('canvas').evaluate(async canvas => {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl || !canvas.width || !canvas.height) return 0;
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.finish(); gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let blue = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 2] > 50 && pixels[i + 2] > pixels[i] * 1.5 && pixels[i + 2] > pixels[i + 1] * 1.2 && pixels[i + 3] > 0) blue++;
    return blue;
  });
}

for (const mobile of [false, true]) test('GG-3D-ADVANCED: textured GLB, native hierarchy properties, real render, lights, Stop and portable reopen (' + (mobile ? 'mobile' : 'desktop') + ')', async ({page}, testInfo) => {
  test.setTimeout(180000);
  if (mobile) await page.setViewportSize({width: 390, height: 844});
  await openAdvanced(page);
  await page.locator('#import-glb').setInputFiles(texturedPath);
  await expect.poll(() => page.evaluate(() => studioProbe.capabilityUI.capture('scene3d').scene.entities.filter(item => item.kind === 'model').length)).toBe(1);
  await expect(page.locator('#scene3d-error')).toBeEmpty();
  const modelId = await page.evaluate(() => studioProbe.capabilityUI.capture('scene3d').scene.entities.find(item => item.kind === 'model').id);

  await revealPanel(page,page.locator('#scene3d-new-type'));await page.locator('#scene3d-new-type').selectOption('group');
  await click(page.getByRole('button', {name: 'Añadir objeto', exact: true}));
  const groupId = await page.locator('#scene3d-object').inputValue();
  await properties(page, groupId, {'name': 'Grupo girado', 'transform.position.x': 5, 'transform.rotationDegrees.z': 90,
    'transform.scale.x': 2, 'transform.scale.y': 2, 'transform.scale.z': 2});
  await properties(page, modelId, {'name': 'Triángulo azul CC0', 'parentId': groupId, 'transform.position.x': 1,
    'properties.collidable': false});
  await properties(page, 'sphere', {visible: false});

  // Camera has no property form. This validated fixture supplies camera and a
  // real block program; object transformations above remain native UI edits.
  await installDeclarativeFixture(page, config => {
    config.scene.cameraArc = {alpha: 90, beta: 90, radius: 8, target: {x: 4, y: 2, z: 0}};
    config.scene.entities.find(item => item.id === 'light').properties.direction = {x: 0, y: 0, z: 1};
    config.workspace = {version: 1, roots: ['advanced-start'], nodes: [
      {id: 'advanced-start', type: 'gg_cap_start', fields: {}, inputs: {DO: 'advanced-light'}, next: null, x: 20, y: 20},
      {id: 'advanced-light', type: 'gg_scene3d_setLight', fields: {targetId: 'light', intensity: .8, diffuse: '#ffffff'}, inputs: {}, next: null, x: 0, y: 0}
    ]};
  });
  const authoring = await projectContent(page);
  await run(page, current => entity(current, 'light')?.light?.intensity === .8);
  const actual = await snapshot(page), model = entity(actual, modelId), group = entity(actual, groupId);
  expect(actual.rightHanded).toBe(true);
  expect(model.geometry).toEqual({vertices: 3, indices: 3});
  expect(model.parentId).toBe(groupId);
  expect(model.local.position).toEqual({x: 1, y: 0, z: 0});
  expect(model.world.position.x).toBeCloseTo(5, 5); expect(model.world.position.y).toBeCloseTo(2, 5);
  expect(model.world.position.z).toBeCloseTo(0, 5); expect(model.world.matrix).toHaveLength(16);
  expect(group.local.rotationDegrees.z).toBeCloseTo(90, 5); expect(group.local.scale).toEqual({x: 2, y: 2, z: 2});
  expect(entity(actual, 'light').light.diffuse.toLowerCase()).toBe('#ffffff');
  await expect.poll(() => bluePixels(page), {timeout: 15000}).toBeGreaterThan(50);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path: testInfo.outputPath('scene3d-advanced-' + (mobile ? 'mobile' : 'desktop') + '.png'), timeout: 10000});

  const oldSession = (await execution(page)).sessionId;
  // Queue a real RPC in the Stop click's capture phase. The production Stop
  // handler disposes that frame before request() resumes its ready microtask.
  await stopButton(page).evaluate((button, targetId) => {
    button.addEventListener('click', () => {
      window.scene3dLateRequest = studioProbe.capabilityExecution.frameRequest('call', {
        operationId: 'scene3d.move', args: {targetId, delta: {x: 999, y: 0, z: 0}}
      }).then(() => ({accepted: true}), error => ({error: error.message}));
    }, {capture: true, once: true});
  }, modelId);
  await click(stopButton(page));
  await expect.poll(() => execution(page).then(state => state.contextId)).toBe(null);
  expect(await page.evaluate(() => window.scene3dLateRequest)).toEqual({error: 'Session stopped'});
  expect(await projectContent(page)).toEqual(authoring);
  const archive = await page.evaluate(async () => Array.from(await studioProbe.project.exportArchive()));
  await page.locator('#open-project').setInputFiles({name: 'advanced-3d.ggproj', mimeType: 'application/zip', buffer: Buffer.from(archive)});
  await expect.poll(() => page.evaluate(id => studioProbe.capabilityUI.capture('scene3d').scene.entities.some(item => item.id === id), modelId)).toBe(true);
  expect(await snapshot(page)).toBe(null);
  expect(await projectContent(page)).toEqual(authoring);
  await run(page, current => entity(current, 'light')?.light?.intensity === .8);
  expect((await execution(page)).sessionId).not.toBe(oldSession);
  // A transferred channel with an obsolete session cannot replace the renderer's
  // authenticated channel or authorize a late mutator in the reopened run.
  await page.evaluate(({oldSession, modelId}) => {
    const frame = document.querySelector('iframe[title="Escena 3D"]'), channel = new MessageChannel();
    frame.contentWindow.postMessage({type: 'context-connect', protocolVersion: 1, sessionId: oldSession}, new URL(frame.src).origin, [channel.port2]);
    channel.port1.postMessage({protocolVersion: 1, sessionId: oldSession, revision: 0, sequence: 999, requestId: 999,
      command: 'call', payload: {operationId: 'scene3d.move', args: {targetId: modelId, delta: {x: 999, y: 0, z: 0}}}});
    channel.port1.close();
  }, {oldSession, modelId});
  await expect.poll(async () => entity(await snapshot(page), modelId).local.position.x).toBe(1);
  await expect.poll(() => bluePixels(page)).toBeGreaterThan(50);
  await click(stopButton(page));
});

test('GG-3D-ADVANCED: real collision stops a sphere at a box and the native collision toggle permits free movement', async ({page}) => {
  test.setTimeout(120000); await openAdvanced(page);
  await revealPanel(page,page.locator('#scene3d-new-type'));await page.locator('#scene3d-new-type').selectOption('box');
  await click(page.getByRole('button', {name: 'Añadir objeto', exact: true}));
  const wallId = await page.locator('#scene3d-object').inputValue();
  await properties(page, wallId, {'name': 'Pared', 'transform.position.x': 3, 'transform.position.y': 1,
    'properties.width': 1, 'properties.height': 4, 'properties.depth': 4});
  await installDeclarativeFixture(page, config => {config.workspace.nodes.find(node => node.id === 'scene-move').fields['delta.x'] = 5;});
  await run(page, current => entity(current, 'sphere')?.local.position.x > 1.3);
  const blocked = entity(await snapshot(page), 'sphere');
  expect(blocked.world.position.x).toBeGreaterThan(1.3); expect(blocked.world.position.x).toBeLessThan(1.6);
  expect(entity(await snapshot(page), wallId).geometry.indices).toBeGreaterThan(0);
  await click(stopButton(page));
  await properties(page, 'sphere', {'properties.collidable': false});
  await run(page, current => entity(current, 'sphere')?.local.position.x === 5);
  expect(entity(await snapshot(page), 'sphere').world.position.x).toBeCloseTo(5, 5);
  expect((await page.evaluate(() => studioProbe.capabilityUI.capture('scene3d'))).scene.entities.find(item => item.id === 'sphere').transform.position.x).toBe(0);
  await click(stopButton(page));
});

test('GG-3D-ADVANCED: malformed GLB, foreign model ownership and forged operations preserve authoring and the live renderer', async ({page}) => {
  test.setTimeout(150000); await openAdvanced(page);
  await page.locator('#import-glb').setInputFiles(texturedPath);
  await expect.poll(() => page.evaluate(() => studioProbe.capabilityUI.capture('scene3d').scene.entities.some(item => item.kind === 'model'))).toBe(true);
  await run(page, current => entity(current, 'sphere')?.local.position.x === 1);
  const before = await projectContent(page), state = await execution(page), current = await snapshot(page);
  const forbiddenRequests = []; page.on('request', request => {if (request.url().includes('forbidden-glb.invalid')) forbiddenRequests.push(request.url());});
  const {document, binary} = triangleData({textured: true});
  document.images[0].uri = 'https://forbidden-glb.invalid/image.png';
  for (const [buffer, error] of [[Buffer.from('not a GLB'), /GLB: tamaño/], [Buffer.from(encodeGlb(document, binary)), /GLB: propiedades no soportadas/]]) {
    await page.locator('#import-glb').setInputFiles({name: 'invalid.glb', mimeType: 'model/gltf-binary', buffer});
    await expect(page.locator('#scene3d-error')).toHaveText(error);
    expect(await projectContent(page)).toEqual(before);
    expect((await execution(page)).sessionId).toBe(state.sessionId);
    expect(await snapshot(page)).toEqual(current);
  }
  expect(forbiddenRequests).toEqual([]);
  const model = await page.evaluate(() => studioProbe.project.capture());
  model.resources.bindings.find(binding => binding.role === 'mesh.geometry').owner.targetId = 'foreign-target';
  const rejected = await page.evaluate(serialized => studioProbe.project.open(serialized).then(() => null, error => error.message), JSON.stringify(model));
  expect(rejected).toMatch(/binding|pertenece|recurso|referencia/i);
  expect(await projectContent(page)).toEqual(before);
  expect((await execution(page)).sessionId).toBe(state.sessionId);
  expect(await snapshot(page)).toEqual(current);
  const badOperation = await page.evaluate(() => studioProbe.capabilityExecution.frameRequest('call', {
    operationId: 'scene3d.move', args: {targetId: 'sphere', delta: {x: 50, y: 0, z: 0}, principal: 'gg.3d-advanced'}
  }).then(() => null, error => error.message));
  expect(badOperation).toBeTruthy(); expect(await snapshot(page)).toEqual(current);
  await page.evaluate(() => studioProbe.capabilityExecution.frameRequest('call', {operationId: 'scene3d.setCamera', args: {alpha:45,beta:65,radius:12,target:{x:0,y:0,z:0}}}));
  await expect.poll(async () => (await snapshot(page)).cameraArc.radius).toBe(12);
  expect(await projectContent(page)).toEqual(before);
  await click(stopButton(page));
});

