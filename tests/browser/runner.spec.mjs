import {origins} from './origins.mjs';
import {clickVisible} from './workspace-controls.mjs';
import {revealAdvanced} from './advanced-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';

test('GG-SCRATCH-004: actual sprite pixels move in a cross-origin runner', async ({page}) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  const before = await page.evaluate(() => studioProbe.request('snapshot'));
  expect(before.x).toBe(0);
  expect(before.pixels.count).toBeGreaterThan(300);
  await page.screenshot({path: artifactPath('browser-before.png')});
  await revealAdvanced(page);
  await clickVisible(page.getByRole('button', {name: 'Ejecutar ejemplo', exact: true}));
  await expect(page.locator('#position')).toHaveText('x = 15');
  const after = await page.evaluate(() => studioProbe.request('snapshot'));
  expect(after.origin).toBe(origins.runnerOrigin);
  expect(after.x).toBe(15);
  expect(after.pixels.centerX - before.pixels.centerX).toBeCloseTo(15, 0);
  expect(after.pixels.count).toBe(before.pixels.count);
  await page.screenshot({path: artifactPath('browser-after.png')});
  await writeFile(artifactPath('browser-render-evidence.json'), JSON.stringify({before, after, deltaPixels: after.pixels.centerX - before.pixels.centerX}, null, 2));
  expect(errors).toEqual([]);
});
