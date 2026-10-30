import {origins} from './origins.mjs';
import {selectContext,clickVisible} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
});

test('GG-RUN-005: runner cannot read host DOM/storage and another frame cannot connect', async ({page}) => {
  await page.evaluate(() => localStorage.setItem('private-marker', 'host-only-data'));
  const probe = await page.evaluate(() => studioProbe.request('isolation-probe'));
  expect(probe.dom).toEqual({blocked: true, error: 'SecurityError'});
  expect(probe.storage).toEqual({blocked: true, error: 'SecurityError'});
  const before = await page.evaluate(() => studioProbe.state());
  await page.evaluate(runnerOrigin => {
    const rogue = document.createElement('iframe');
    rogue.id = 'rogue';
    rogue.src = `${runnerOrigin}/?session=${studioProbe.state().sessionId}`;
    document.body.append(rogue);
  }, origins.runnerOrigin);
  await expect.poll(() => page.evaluate(() => studioProbe.state().rejectedMessages)).toBeGreaterThan(before.rejectedMessages);
  expect((await page.evaluate(() => studioProbe.state())).sessionId).toBe(before.sessionId);
  expect((await page.evaluate(() => studioProbe.run())).x).toBe(15);
});

test('GG-RUN-006: Stop replaces a frame with a blocked worker and rejects stale messages', async ({page}) => {
  const before = await page.evaluate(() => studioProbe.state());
  const oldFrame = page.frames().find(frame => frame.url().startsWith(origins.runnerOrigin + '/'));
  await page.evaluate(() => studioProbe.request('start-loop-worker'));
  expect(await page.evaluate(() => new Promise(resolve => setTimeout(() => resolve('responsive'), 30)))).toBe('responsive');
  await selectContext(page,'2d');
  await clickVisible(page.getByRole('button', {name:'Detener',exact:true}));
  await expect(page.locator('#run')).toBeEnabled();
  const after = await page.evaluate(() => studioProbe.state());
  expect(oldFrame.isDetached()).toBe(true);
  expect(after.generation).toBe(before.generation + 1);
  expect(after.sessionId).not.toBe(before.sessionId);
  expect(after.source).toBe(before.source);
  await page.evaluate(({oldSession, runnerOrigin}) => window.dispatchEvent(new MessageEvent('message', {
    origin: runnerOrigin, source: document.querySelector('#runner-slot iframe').contentWindow,
    data: {type: 'runner-ready', protocolVersion: 1, sessionId: oldSession}
  })), {oldSession: before.sessionId, runnerOrigin: origins.runnerOrigin});
  expect((await page.evaluate(() => studioProbe.state())).rejectedMessages).toBeGreaterThan(after.rejectedMessages);
  expect((await page.evaluate(() => studioProbe.run())).x).toBe(15);
});

test('GG-RUN-007: CSP blocks host-origin and external-worker fetches', async ({page}) => {
  const response = await page.request.get(origins.runnerOrigin + '/');
  expect(response.headers()['content-security-policy']).toContain("connect-src 'self'");
  const result = await page.evaluate(() => studioProbe.request('network-probe'));
  expect(result.blocked).toBe(true);
  expect(result.worker.blocked).toBe(true);
  expect(result.worker.violations.some(item => item.directive === 'connect-src')).toBe(true);
  expect(result.violations.some(item => item.directive === 'connect-src')).toBe(true);
});
