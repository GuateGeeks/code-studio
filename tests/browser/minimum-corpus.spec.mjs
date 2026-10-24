import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

async function load(page, name) {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  return page.evaluate(name => studioProbe.request('load-corpus', {name}), name);
}
const state = page => page.evaluate(() => studioProbe.request('snapshot'));
const start = page => page.evaluate(() => studioProbe.request('start-corpus'));

test('GG-SCRATCH-014: browser clone mutates shared Stage variable and only its own local copy', async ({page}) => {
  const before = await load(page, 'globalVariables');
  expect(Number(before.globalVariables['gg-global-score'].value)).toBe(0);
  await start(page);
  await expect.poll(async () => Number((await state(page)).globalVariables['gg-global-score'].value)).toBe(17);
  const during = await state(page);
  expect(during.targets).toHaveLength(2);
  expect(Number(during.targets.find(target => target.isOriginal).variables['gg-local-score'].value)).toBe(3);
  expect(Number(during.targets.find(target => !target.isOriginal).variables['gg-local-score'].value)).toBe(5);
  for (const target of during.targets) expect(target.variables['gg-global-score']).toBeUndefined();
  expect(during.authoringVariables['gg-local-score'][1]).toBe(0);
  await expect.poll(async () => (await state(page)).targets.length).toBe(1);
  const after = await state(page);
  expect(Number(after.globalVariables['gg-global-score'].value)).toBe(17);
  expect(Number(after.variables['gg-local-score'].value)).toBe(3);
  const reloaded = await page.evaluate(() => studioProbe.request('load-corpus', {name: 'globalVariables'}));
  expect(Number(reloaded.globalVariables['gg-global-score'].value)).toBe(0);
  expect(Number(reloaded.variables['gg-local-score'].value)).toBe(0);
  expect(reloaded.targets).toHaveLength(1);
  expect(reloaded.threads).toBe(0);
  await writeFile(artifactPath('corpus-global-variables.json'), JSON.stringify({before, during, after, reloaded}, null, 2));
});

test('GG-SCRATCH-016: two original local SVG costumes visibly switch and restore in the real renderer', async ({page}) => {
  const before = await load(page, 'costumes');
  expect(before.costume.name).toBe('hero');
  expect(before.pixels.count).toBeGreaterThan(300);
  expect(before.bluePixels).toBe(0);
  await start(page);
  await expect.poll(async () => (await state(page)).costume.name).toBe('hero-alt');
  const during = await state(page);
  expect(during.bluePixels).toBeGreaterThan(300);
  expect(during.pixels.count).toBe(0);
  expect(during.x).toBe(before.x);
  await page.screenshot({path: artifactPath('corpus-costume-alt.png')});
  await expect.poll(async () => (await state(page)).costume.name).toBe('hero');
  const after = await state(page);
  expect(after.pixels.count).toBe(before.pixels.count);
  expect(after.bluePixels).toBe(0);
  await writeFile(artifactPath('corpus-costumes.json'), JSON.stringify({before, during, after}, null, 2));
});

test('GG-SCRATCH-015: two concurrent hats overlap and short script finishes while long script waits', async ({page}) => {
  await load(page, 'concurrent');
  await start(page);
  await expect.poll(async () => {
    const snapshot = await state(page);
    return [Number(snapshot.variables['gg-long'].value), Number(snapshot.variables['gg-short'].value), snapshot.threads];
  }, {intervals: [25, 50, 100]}).toEqual([1, 1, 2]);
  const overlap = await state(page);
  await expect.poll(async () => Number((await state(page)).variables['gg-short'].value), {intervals: [25, 50, 100]}).toBe(2);
  const partial = await state(page);
  expect(Number(partial.variables['gg-long'].value)).toBe(1);
  expect(partial.threads).toBeGreaterThan(0);
  await expect.poll(async () => Number((await state(page)).variables['gg-long'].value)).toBe(2);
  const after = await state(page);
  expect(Number(after.variables['gg-short'].value)).toBe(2);
  expect(after.threads).toBe(0);
  await writeFile(artifactPath('corpus-concurrent.json'), JSON.stringify({overlap, partial, after}, null, 2));
});
