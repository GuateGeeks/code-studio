import {selectContext,clickVisible,revealPanel} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

const state = page => page.evaluate(() => studioProbe.request('snapshot'));
async function load(page, name) {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  await page.evaluate(name => studioProbe.request('load-corpus', {name}), name);
}
const playButton = page => page.frameLocator('#runner-slot iframe').getByRole('button', {name: 'Reproducir sonido', exact: true});

test('GG-SCRATCH-008: variables drive both branches, later events and rendered motion', async ({page}) => {
  await load(page, 'variables');
  const before = await state(page);
  expect(before.variables['gg-score'].value).toBe(0);
  await page.evaluate(() => studioProbe.request('start-corpus'));
  await expect.poll(async () => (await state(page)).x).toBe(21);
  await expect(page.locator('#position')).toHaveText('x = 21');
  const after = await state(page);
  expect(after.variables['gg-score']).toEqual({name: 'score', value: 3});
  expect(after.moves).toEqual([4, 11, 18, 21]);
  expect(after.pixels.centerX - before.pixels.centerX).toBeCloseTo(21, 0);
  expect(after.authoringVariables['gg-score']).toEqual(['score', 0]);
  expect(after.sourceMap['branch-loop-compare']).toBe('branch-loop-compare');
  const canvas = page.frameLocator('#runner-slot iframe').locator('#stage');
  await canvas.focus(); await canvas.press('Space');
  await expect.poll(async () => (await state(page)).x).toBe(19);
  const event = await state(page);
  expect(event.variables['gg-score'].value).toBe(2);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run')).toBeEnabled();
  await page.evaluate(() => studioProbe.request('load-corpus', {name: 'variables'}));
  const reset = await state(page);
  expect(reset.variables).toEqual(before.variables);
  expect(reset.x).toBe(0);
  await writeFile(artifactPath('corpus-variables.json'), JSON.stringify({before, after, event, reset}, null, 2));
});

test('GG-SCRATCH-009: local WAV produces real Web Audio signal and wait precedes movement', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Use the actual preview controls as well as the in-frame user gesture.
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  await revealAdvanced(page);
  await revealPanel(page,page.locator('#fixture'));await page.locator('#fixture').selectOption('audio');
  await revealAdvanced(page);
  await clickVisible(page.getByRole('button', {name: 'Ejecutar ejemplo', exact: true}));
  await expect(playButton(page)).toBeVisible();
  const before = await state(page);
  expect(before.audio.available).toBe(true);
  expect(before.x).toBe(0);
  expect(before.audio.rms).toBeLessThan(0.0001);
  expect(before.audio.sounds[0].duration).toBeCloseTo(1.2, 2);
  expect(before.audio.sounds[0].channels).toBe(1);
  await clickVisible(playButton(page));
  await expect.poll(async () => (await state(page)).audio.rms).toBeGreaterThan(0.01);
  const playing = await state(page);
  expect(playing.audio.contextState).toBe('running');
  expect(playing.audio.sounds[0].playing).toBe(true);
  expect(playing.audio.peakHz).toBeGreaterThan(400);
  expect(playing.audio.peakHz).toBeLessThan(480);
  expect(playing.x).toBe(0);
  await expect.poll(async () => (await state(page)).x).toBe(5);
  await expect(page.locator('#position')).toHaveText('x = 5');
  await expect.poll(async () => (await state(page)).audio.rms).toBeLessThan(0.0001);
  const after = await state(page);
  expect(after.audio.events.map(event => event.type)).toEqual(['play', 'stop']);
  expect(after.audio.events[1].at - after.audio.events[0].at).toBeGreaterThan(1.1);
  expect(after.audio.sounds[0].playing).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({path: artifactPath('corpus-audio.png')});
  await writeFile(artifactPath('corpus-audio.json'), JSON.stringify({before, playing, after, errors}, null, 2));
});

test('GG-SCRATCH-009: stop-sounds block silences a nonwaiting sound and script continues', async ({page}) => {
  await load(page, 'audioStop');
  await clickVisible(playButton(page));
  await expect.poll(async () => (await state(page)).audio.rms).toBeGreaterThan(0.01);
  const playing = await state(page);
  expect(playing.x).toBe(0);
  await expect.poll(async () => (await state(page)).x).toBe(3);
  await expect(page.locator('#position')).toHaveText('x = 3');
  await expect.poll(async () => (await state(page)).audio.rms).toBeLessThan(0.0001);
  const after = await state(page);
  expect(after.audio.sounds[0].playing).toBe(false);
  const duration = after.audio.events[1].at - after.audio.events[0].at;
  expect(duration).toBeGreaterThan(0.3);
  expect(duration).toBeLessThan(0.8);
  await writeFile(artifactPath('corpus-audio-block-stop.json'), JSON.stringify({playing, after, duration}, null, 2));
});

test('GG-SCRATCH-010: Stop silences pending audio, prevents continuation and permits a fresh gesture', async ({page}) => {
  await load(page, 'audio');
  const oldFrame = page.frames().find(frame => frame.url().startsWith('http://127.0.0.1:4174/'));
  const cdp = await page.context().newCDPSession(oldFrame);
  const contexts = [];
  const destroyed = [];
  const closed = [];
  cdp.on('WebAudio.contextCreated', event => contexts.push(event.context.contextId));
  cdp.on('WebAudio.contextWillBeDestroyed', event => destroyed.push(event.contextId));
  cdp.on('WebAudio.contextChanged', event => { if (event.context.contextState === 'closed') closed.push(event.context.contextId); });
  await cdp.send('WebAudio.enable');
  await expect.poll(() => contexts.length).toBeGreaterThan(0);
  const source = await page.locator('#source').inputValue();
  await clickVisible(playButton(page));
  await expect.poll(async () => (await state(page)).audio.rms).toBeGreaterThan(0.01);
  const playing = await state(page);
  await page.evaluate(() => studioProbe.request('stop-scene'));
  await expect.poll(async () => (await state(page)).audio.rms).toBeLessThan(0.0001);
  const stopped = await state(page);
  expect(stopped.audio.sounds[0].playing).toBe(false);
  await page.waitForTimeout(1300); // Outlast the original WAV and its waiting continuation.
  expect((await state(page)).x).toBe(0);
  expect((await state(page)).threads).toBe(0);
  // Destroy the frame during a second real playback, then repeat in a fresh one.
  await clickVisible(playButton(page));
  await expect.poll(async () => (await state(page)).audio.rms).toBeGreaterThan(0.01);
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run')).toBeEnabled();
  expect(oldFrame.isDetached()).toBe(true);
  await expect.poll(() => [...closed, ...destroyed]).toContain(contexts[0]);
  expect(await page.locator('#source').inputValue()).toBe(source);
  await page.evaluate(() => studioProbe.request('load-corpus', {name: 'audio'}));
  const fresh = await state(page);
  expect(fresh.audio.events).toEqual([]);
  expect(fresh.audio.rms).toBeLessThan(0.0001);
  await clickVisible(playButton(page));
  await expect.poll(async () => (await state(page)).audio.rms).toBeGreaterThan(0.01);
  await expect.poll(async () => (await state(page)).x).toBe(5);
  await writeFile(artifactPath('corpus-audio-stop.json'), JSON.stringify({playing, stopped, previousFrameDetached: oldFrame.isDetached(), contexts, closed, destroyed, fresh, rerun: await state(page)}, null, 2));
});
