import {selectContext,clickVisible,clickStagePoint} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

async function load(page, name) {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  await page.evaluate(name => studioProbe.request('load-corpus', {name}), name);
}
const state = page => page.evaluate(() => studioProbe.request('snapshot'));

test('GG-SCRATCH-005: real scheduler wait, DOM keyboard and sprite click', async ({page}) => {
  await load(page, 'events');
  const before = await state(page);
  const startedAt = Date.now();
  await page.evaluate(() => studioProbe.request('start-corpus'));
  expect((await state(page)).x).toBe(0);
  await expect.poll(async () => (await state(page)).x).toBe(5);
  const elapsedToFirstMove = Date.now() - startedAt;
  expect(elapsedToFirstMove).toBeGreaterThanOrEqual(180);
  const canvas = page.frameLocator('#runner-slot iframe').locator('#stage');
  await canvas.focus();
  await canvas.press('Space');
  await expect.poll(async () => (await state(page)).x).toBe(12);
  await clickStagePoint(page,canvas,12);
  await expect.poll(async () => (await state(page)).x).toBe(23);
  const after = await state(page);
  expect(after.pixels.centerX - before.pixels.centerX).toBeCloseTo(23, 0);
  expect(after.moves).toEqual([5, 12, 23]);
  expect(after.sourceMap['move-key']).toBe('move-key');
  await writeFile(artifactPath('corpus-events.json'), JSON.stringify({before, after, elapsedToFirstMove, elapsedToFirstMoveMinimum: 180}, null, 2));
});

test('GG-SCRATCH-006: broadcast-and-wait resumes the emitter after the receiver', async ({page}) => {
  await load(page, 'messages');
  await page.evaluate(() => studioProbe.request('start-corpus'));
  await expect.poll(async () => (await state(page)).x).toBe(1);
  const during = await state(page);
  expect(during.moves).toEqual([1]);
  await expect.poll(async () => (await state(page)).x).toBe(13);
  const after = await state(page);
  expect(after.moves).toEqual([1, 11, 13]);
  await writeFile(artifactPath('corpus-messages.json'), JSON.stringify({during, after}, null, 2));
});

test('GG-SCRATCH-006: clone is a visible independent target and deletes itself', async ({page}) => {
  await load(page, 'clones');
  const before = await state(page);
  await page.evaluate(() => studioProbe.request('start-corpus'));
  await expect.poll(async () => (await state(page)).targets.length).toBe(2);
  const during = await state(page);
  expect(during.targets.find(target => target.isOriginal).x).toBe(2);
  expect(during.targets.find(target => !target.isOriginal).x).toBe(60);
  expect(during.pixels.count).toBe(2 * before.pixels.count);
  await page.screenshot({path: artifactPath('corpus-clones.png')});
  await expect.poll(async () => (await state(page)).targets.length).toBe(1);
  const after = await state(page);
  expect(after.x).toBe(2);
  expect(after.pixels.count).toBe(before.pixels.count);
  await writeFile(artifactPath('corpus-clones.json'), JSON.stringify({before, during, after}, null, 2));
});

test('GG-SCRATCH-007: Stop cancels waiting scripts and removes clones before rerun', async ({page}) => {
  await load(page, 'events');
  await page.evaluate(() => studioProbe.request('start-corpus'));
  const stoppedWait = await page.evaluate(() => studioProbe.request('stop-scene'));
  expect(stoppedWait.x).toBe(0);
  await page.waitForTimeout(300); // Beyond the 200 ms pending move, to detect a late continuation.
  expect((await state(page)).x).toBe(0);
  await page.evaluate(() => studioProbe.request('load-corpus', {name: 'clones'}));
  await page.evaluate(() => studioProbe.request('start-corpus'));
  await expect.poll(async () => (await state(page)).targets.length).toBe(2);
  await page.evaluate(() => studioProbe.request('stop-scene'));
  await expect.poll(async () => (await state(page)).targets.length).toBe(1);
  const stopped = await state(page);
  await page.waitForTimeout(900); // Outlast the clone's delayed deletion.
  expect((await state(page)).targets).toEqual(stopped.targets);
  const source = await page.locator('#source').inputValue();
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run')).toBeEnabled();
  expect(await page.locator('#source').inputValue()).toBe(source);
  expect((await state(page)).targets).toHaveLength(1);
  expect((await page.evaluate(() => studioProbe.run())).x).toBe(15);
  await writeFile(artifactPath('corpus-stop.json'), JSON.stringify({stoppedWait, stopped, rerun: await state(page)}, null, 2));
});
