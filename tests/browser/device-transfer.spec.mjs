import {origins} from './origins.mjs';
import {clickVisible} from './workspace-controls.mjs';
import {test, expect} from '@playwright/test';
import {artifactPath} from './artifacts.mjs';

async function firmware(page) {
  await page.goto('/');
  await expect(page.locator('#run')).toBeEnabled();
  await page.locator('#authoring-context').selectOption('microbit');
  await clickVisible(page.locator('#enable-device'));
  await expect(page.locator('#compile-device')).toBeEnabled();
  await clickVisible(page.locator('#compile-device'));
  await expect(page.locator('#download-device')).toBeEnabled();
  await expect(page.locator('#device-build-status')).toContainText('HEX universal listo');
}
async function openTransfer(page) {
  const popup = page.waitForEvent('popup');
  await clickVisible(page.locator('#transfer-device'));
  const transfer = await popup;
  await transfer.waitForLoadState('domcontentloaded');
  return transfer;
}
async function mockUSB(context) {
  // Test double for browser lifecycle only; no hardware or transport success.
  await context.addInitScript(() => {
    const state = {requests: 0, opens: 0, resolve: null};
    window.usbTransferTest = state;
    Object.defineProperty(navigator, 'usb', {configurable: true, value: {
      addEventListener() {}, removeEventListener() {},
      requestDevice() {
        state.requests++;
        return new Promise(resolve => { state.resolve = () => resolve({
          vendorId: 0x0d28, productId: 0x0204, serialNumber: '9901000012345678',
          async open() { state.opens++; }, async close() {}
        }); });
      }
    }});
  });
}

test('dedicated transfer popup verifies firmware, keeps USB opt-in and preserves HEX alternative on desktop/mobile', async ({page, context}) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'usb', {configurable: true, value: undefined}));
  await firmware(page);
  const transfer = await openTransfer(page);
  await expect(transfer.locator('#transfer-status')).toHaveText('Firmware verificado. Vuelve a Studio para descargar el HEX.');
  await expect(transfer.locator('#artifact-variant')).toHaveText('Universal V1 y V2');
  await expect(transfer.locator('#artifact-hash')).toHaveText(/^[a-f0-9]{64}$/);
  await expect(transfer.locator('#usb-support')).toContainText('Conserva la descarga HEX');
  await expect(transfer.locator('#connect-device')).toBeDisabled();
  await expect(transfer.locator('#flash-device')).toBeDisabled();
  const policy = (await transfer.request.get(transfer.url())).headers();
  expect(policy['permissions-policy']).toContain('usb=(self)');
  expect(policy['content-security-policy']).not.toContain('unsafe-eval');
  expect(policy['content-security-policy']).toContain("frame-ancestors 'none'");
  for (const origin of [origins.shellOrigin, origins.runnerOrigin, origins.simulatorOrigin, origins.languageOrigin]) {
    const headers = (await page.request.get(origin + '/')).headers();
    expect(headers['permissions-policy']).toContain('usb=()');
  }
  const descriptor = await (await page.request.get('/latest-release.json')).json();
  const releaseHeaders = (await page.request.get('/releases/' + descriptor.cohort + '/device-transfer.html')).headers();
  expect(releaseHeaders['permissions-policy']).toContain('usb=(self)');
  const moduleHeaders = (await page.request.get('/app/device-transfer/transfer-page.mjs')).headers();
  expect(moduleHeaders['permissions-policy']).toContain('usb=()');
  await transfer.screenshot({path: artifactPath('device-transfer-desktop.png'), fullPage: true});
  await transfer.setViewportSize({width: 390, height: 844});
  expect(await transfer.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await transfer.locator('#cancel-transfer').focus();
  await expect(transfer.locator('#cancel-transfer')).toBeFocused();
  await transfer.screenshot({path: artifactPath('device-transfer-mobile.png'), fullPage: true});
  await transfer.keyboard.press('Enter');
  await expect(transfer.locator('#transfer-status')).toContainText('cancelada');
  await expect(page.locator('#device-build-status')).toContainText('cancelada');
  await expect(page.locator('#download-device')).toBeEnabled();
  await transfer.close();
});

test('a modified artifact hash cannot enable a selector or transfer in the authenticated popup', async ({page, context}) => {
  await mockUSB(context);
  await context.route('**/app/device-transfer/opener.mjs', async route => {
    const response = await route.fetch();
    const source = await response.text();
    expect(source).toContain('artifact = validateArtifact(artifact);');
    // Inject a damaged transport DTO only in this test response, never product.
    await route.fulfill({response, body: source.replace('artifact = validateArtifact(artifact);',
      "artifact = validateArtifact(artifact); artifact = {...artifact,sha256:'0'.repeat(64)};")});
  });
  await firmware(page);
  const transfer = await openTransfer(page);
  await expect(transfer.locator('#transfer-error')).toContainText('no coincide con su hash');
  await expect(transfer.locator('#connect-device')).toBeDisabled();
  await expect(transfer.locator('#flash-device')).toBeDisabled();
  expect(await transfer.evaluate(() => usbTransferTest.requests)).toBe(0);
  await expect(page.locator('#download-device')).toBeEnabled();
  await transfer.close();
});

test('cancel while the browser selector is pending rejects its late selection without opening the device', async ({page, context}) => {
  await mockUSB(context);
  await firmware(page);
  const transfer = await openTransfer(page);
  await expect(transfer.locator('#connect-device')).toBeEnabled();
  expect(await transfer.evaluate(() => usbTransferTest.requests)).toBe(0);
  await clickVisible(transfer.locator('#connect-device'));
  await expect(transfer.locator('#transfer-status')).toContainText('Esperando la placa');
  expect(await transfer.evaluate(() => usbTransferTest.requests)).toBe(1);
  await clickVisible(transfer.locator('#cancel-transfer'));
  await expect(transfer.locator('#transfer-status')).toContainText('cancelada');
  await transfer.evaluate(() => usbTransferTest.resolve());
  await transfer.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await transfer.evaluate(() => usbTransferTest.opens)).toBe(0);
  await expect(transfer.locator('#transfer-status')).toContainText('cancelada');
  await expect(transfer.locator('#flash-device')).toBeDisabled();
  await transfer.close();
});

test('Stop revokes and closes a prepared transfer without opening USB; direct navigation has no artifact', async ({page, context}) => {
  await mockUSB(context);
  await firmware(page);
  const transfer = await openTransfer(page);
  await expect(transfer.locator('#connect-device')).toBeEnabled();
  expect(await transfer.evaluate(() => usbTransferTest.requests)).toBe(0);
  const closed = transfer.waitForEvent('close');
  await clickVisible(page.locator('#stop-result'));
  await closed;
  await expect(page.locator('#download-device')).toBeDisabled();
  await page.goto('/device-transfer.html?nonce=12345678-1234-1234-1234-123456789abc');
  await expect(page.locator('#transfer-error')).toContainText('Abre esta página');
  await expect(page.locator('#connect-device')).toBeDisabled();
  await expect(page.locator('#flash-device')).toBeDisabled();
  expect(await page.evaluate(() => usbTransferTest.requests)).toBe(0);
});
