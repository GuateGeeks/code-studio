import {selectContext,clickVisible,revealPanel} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

const heart = ['01010', '11111', '11111', '01110', '00100'].join('').split('').map(Number);
const simState = page => page.evaluate(() => studioProbe.request('simulator-snapshot'));
async function start(page, source) {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  return page.evaluate(source => studioProbe.request('simulate', {source}), source);
}

test('GG-PXT-006: generated JS executes the heart on the real board and SVG', async ({page}) => {
  const errors = [];
  const external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!['http://127.0.0.1:4173', 'http://127.0.0.1:4174', 'http://127.0.0.1:4175'].includes(new URL(request.url()).origin)) external.push(request.url()); });
  const result = await start(page, 'basic.showIcon(IconNames.Heart)');
  expect(result.success).toBe(true);
  expect(result.state.codeHash).toBe(result.compileHash);
  await expect.poll(async () => (await simState(page)).matrix).toEqual(heart);
  await expect.poll(async () => (await simState(page)).visual).toEqual(heart);
  await expect.poll(async () => (await simState(page)).finished).toBe(true);
  const state = await simState(page);
  expect(state.fault).toBeNull();
  expect(state.origin).toBe('http://127.0.0.1:4175');
  expect(state.parentBlocked).toBe(true);
  expect(state.physicalBoardValidated).toBe(false);
  const simulator = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4175/'));
  await simulator.evaluate(() => window.postMessage({type: 'run', id: 'rogue', code: '(function () { document.body.dataset.untrusted = "executed"; return function () {}; })'}, location.origin));
  // A following authenticated request also lets the rogue message event run.
  expect((await simState(page)).matrix).toEqual(heart);
  expect(await simulator.evaluate(() => document.body.dataset.untrusted ?? null)).toBeNull();
  const runnerPolicy = (await page.request.get('http://127.0.0.1:4174/')).headers()['content-security-policy'];
  const simPolicy = (await page.request.get('http://127.0.0.1:4175/')).headers()['content-security-policy'];
  expect(runnerPolicy).not.toContain('unsafe-eval');
  expect(simPolicy).toContain("script-src 'self' 'unsafe-eval'");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await page.screenshot({path: artifactPath('simulator-heart.png')});
  await writeFile(artifactPath('simulator-heart.json'), JSON.stringify({compileHash: result.compileHash, state, errors, external, runnerPolicy, simPolicy}, null, 2));
});

test('GG-PXT-007: button A delivers an event to compiled code and toggles a LED', async ({page}) => {
  const result = await start(page, 'input.onButtonPressed(Button.A, function () { led.toggle(0, 0) })\nbasic.clearScreen()');
  expect(result.success).toBe(true);
  await expect.poll(async () => (await simState(page)).finished).toBe(true);
  expect((await simState(page)).matrix).toEqual(Array(25).fill(0));
  const button = page.frameLocator('#runner-slot iframe').frameLocator('iframe').getByRole('button', {name: 'A', exact: true});
  await clickVisible(button);
  await expect.poll(async () => (await simState(page)).matrix[0]).toBe(1);
  await expect.poll(async () => (await simState(page)).visual[0]).toBe(1);
  const on = await simState(page);
  await clickVisible(button);
  await expect.poll(async () => (await simState(page)).matrix[0]).toBe(0);
  await expect.poll(async () => (await simState(page)).visual[0]).toBe(0);
  await writeFile(artifactPath('simulator-button.json'), JSON.stringify({compileHash: result.compileHash, on, off: await simState(page)}, null, 2));
});

test('GG-PXT-007: Stop destroys the simulator frame and new code has no residual LEDs', async ({page}) => {
  await start(page, 'basic.forever(function () { led.toggle(0, 0); basic.pause(50) })');
  await expect.poll(async () => (await simState(page)).matrix[0]).toBe(1);
  const oldSimulator = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4175/'));
  const previousSession = await page.evaluate(() => studioProbe.state().sessionId);
  const source = await page.locator('#source').inputValue();
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run')).toBeEnabled();
  expect(oldSimulator.isDetached()).toBe(true);
  expect(await page.locator('#source').inputValue()).toBe(source);
  expect(await page.evaluate(() => studioProbe.state().sessionId)).not.toBe(previousSession);
  const result = await page.evaluate(() => studioProbe.request('simulate', {source: 'basic.clearScreen()\nled.plot(4, 4)'}));
  const expected = Array(25).fill(0); expected[24] = 1;
  await expect.poll(async () => (await simState(page)).matrix).toEqual(expected);
  await expect.poll(async () => (await simState(page)).visual).toEqual(expected);
  await writeFile(artifactPath('simulator-stop.json'), JSON.stringify({previousContextDetached: oldSimulator.isDetached(), newCompileHash: result.compileHash, state: await simState(page)}, null, 2));
});

test('Browser preview controls run corpus examples and show micro:bit', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  await revealAdvanced(page);
  await revealPanel(page,page.locator('#fixture'));await page.locator('#fixture').selectOption('messages');
  await revealAdvanced(page);
  await clickVisible(page.getByRole('button', {name: 'Ejecutar ejemplo', exact: true}));
  await expect.poll(() => page.evaluate(() => studioProbe.request('snapshot').then(state => state.x))).toBe(13);
  await selectContext(page,'microbit');
  await clickVisible(page.locator('#device-document-tools > summary'));
  await clickVisible(page.getByRole('button', {name: 'Ver simulador', exact: true}));
  await expect(page.locator('#status')).toHaveText('Simulador micro:bit');
  await expect.poll(async () => (await simState(page)).visual).toEqual(heart);
});
