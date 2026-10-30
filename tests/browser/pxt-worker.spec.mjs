import {origins} from './origins.mjs';
import {selectContext,clickVisible,revealPanel} from './workspace-controls.mjs';
import {artifactPath} from './artifacts.mjs';
import {test, expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const source = 'basic.showIcon(IconNames.Heart)';
function verifyHex(contents) {
  const lines = contents.trim().split(/\r?\n/);
  expect(lines.length).toBeGreaterThan(100);
  for (const line of lines) {
    assert.match(line, /^:[0-9a-f]+$/i);
    const bytes = Buffer.from(line.slice(1), 'hex');
    assert.equal(bytes.length, bytes[0] + 5);
    assert.equal(bytes.reduce((sum, byte) => sum + byte, 0) % 256, 0);
  }
}

test('GG-PXT-004: browser worker compiles simulator JS, native HEX and source diagnostics', async ({page}) => {
  const requests = [];
  page.context().on('request', request => requests.push({url: request.url(), method: request.method()}));
  await page.goto('/');
  await expect(page.locator('#compile')).toBeEnabled();
  const ready = await page.evaluate(() => studioProbe.request('prepare-compiler'));
  expect(ready.worker).toBe(true);
  expect(ready.origin).toBe(origins.runnerOrigin);
  const simulated = await page.evaluate(source => studioProbe.compile(source, false), source);
  expect(simulated.success).toBe(true);
  expect(simulated.environment.worker).toBe(true);
  expect(simulated.outfiles['binary.js']).toContain('showIcon');
  // Observe rejection immediately: editing revokes this legacy source attempt.
  const nativePromise = page.evaluate(source => studioProbe.compile(source, true).then(
    () => ({staleAccepted: true}), error => ({cancelled: error.message})), source);
  await selectContext(page,'microbit');
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill(`${source}\n// editable mientras compila`);
  expect(await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve('host-responsive'), 30)))).toBe('host-responsive');
  expect(await nativePromise).toEqual({cancelled: 'Session stopped'});
  await expect(page.locator('#compile-result')).toHaveText('Fuente modificada · compilación anterior descartada');
  const native = await page.evaluate(() => studioProbe.compile(document.querySelector('#source').value, true));
  expect(native.success).toBe(true);
  expect(native.hexRequests).toHaveLength(2);
  verifyHex(native.outfiles['mbdal-binary.hex']);
  verifyHex(native.outfiles['mbcodal-binary.hex']);
  expect(native.outfiles['binary.hex']).toContain('9900C0DE');
  expect(native.outfiles['binary.hex']).toContain('9903C0DE');
  expect(native.networkAttempts).toEqual([]);
  expect(native.physicalBoardValidated).toBe(false);
  const invalid = await page.evaluate(() => studioProbe.compile('basic.noSuchFunction()', false));
  expect(invalid.success).toBe(false);
  expect(invalid.diagnostics.some(item => item.fileName === 'main.ts')).toBe(true);
  expect(requests.every(item => item.method === 'GET' && [origins.shellOrigin, origins.runnerOrigin].includes(new URL(item.url).origin))).toBe(true);
  await writeFile(artifactPath('browser-pxt-evidence.json'), JSON.stringify({simulated: {...simulated, outfiles: Object.keys(simulated.outfiles)}, native: {...native, outfiles: Object.keys(native.outfiles)}, invalid, requests}, null, 2));
  await writeFile(artifactPath('browser-heart.hex'), native.outfiles['binary.hex']);
});

test('GG-PXT-005: preloaded compiler works while the browser context is offline', async ({page, context}) => {
  await page.goto('/');
  await expect(page.locator('#compile')).toBeEnabled();
  await page.evaluate(() => studioProbe.request('prepare-compiler'));
  await context.setOffline(true);
  const result = await page.evaluate(source => studioProbe.compile(source, true), source);
  expect(result.success).toBe(true);
  expect(result.environment.worker).toBe(true);
  expect(result.networkAttempts).toEqual([]);
  expect(result.hexRequests.every(item => item.available)).toBe(true);
  expect(result.physicalBoardValidated).toBe(false);
  await writeFile(artifactPath('browser-offline-evidence.json'), JSON.stringify({...result, outfiles: Object.keys(result.outfiles), contextOffline: true}, null, 2));
});

test('GG-PXT-008: obsolete bootstrap rejection is cancelled and a current compile failure stays visible', async ({page, context}) => {
  let entered;
  const blocked = new Promise(resolve => { entered = resolve; });
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const failed = [];
  page.on('requestfailed', request => failed.push({url: request.url(), error: request.failure()?.errorText}));
  await context.route('**/vendor/pxtworker.js', async route => {
    entered();
    await gate;
    await route.abort('failed');
  });
  await page.goto('/');
  await expect(page.locator('#compile')).toBeEnabled();
  const initialStatus = await page.locator('#status').textContent();
  // Keep a rejection observer and exercise the real button's showError listener.
  await page.evaluate(source => {
    window.obsoleteBootstrap = studioProbe.compile(source, true).then(
      () => ({accepted: true}), error => ({cancelled: error.message}));
  }, source);
  await selectContext(page,'microbit');
  await clickVisible(page.locator('#compile'));
  await blocked;
  await expect(page.locator('#compile-result')).toHaveText('Compilando…');
  await selectContext(page,'microbit');
  await revealPanel(page,page.locator('#source'));await page.locator('#source').fill(source + '\n// autoría nueva antes del fallo de bootstrap');
  await expect(page.locator('#compile-result')).toHaveText('Fuente modificada · compilación anterior descartada');
  release();
  const obsolete = await page.evaluate(() => window.obsoleteBootstrap);
  expect(obsolete).toEqual({cancelled: 'Session stopped'});
  // A following authenticated request drains responses from the failed attempts.
  await page.evaluate(() => studioProbe.request('snapshot'));
  await expect(page.locator('#compile-result')).toHaveText('Fuente modificada · compilación anterior descartada');
  await expect(page.locator('#status')).toHaveText(initialStatus);
  await expect(page.locator('#console-entries li[data-level="error"]')).toHaveCount(0);
  // The same rejected compiler bootstrap is a genuine failure for a NEW attempt.
  await selectContext(page,'microbit');
  await clickVisible(page.locator('#compile'));
  await expect(page.locator('#compile-result')).toContainText('No se pudo compilar:');
  await expect(page.locator('#console-entries li[data-level="error"]')).toHaveCount(1);
  await expect(page.locator('#console-entries li[data-level="error"]')).toContainText('SHELL_ERROR');
  expect(failed.some(request => request.url.endsWith('/vendor/pxtworker.js'))).toBe(true);
  await writeFile(artifactPath('legacy-compile-stale-rejection.json'), JSON.stringify({
    obsolete, failed, currentOutput: await page.locator('#compile-result').textContent(),
    currentStatus: await page.locator('#status').textContent(),
    console: await page.locator('#console-entries').textContent()
  }, null, 2));
});
