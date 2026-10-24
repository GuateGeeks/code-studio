import {selectContext,clickVisible} from './workspace-controls.mjs';
import {expect} from '@playwright/test';
export async function revealAdvanced(page) {
  if(!['2d','text'].includes(await page.locator('#authoring-context').inputValue()))await selectContext(page,'2d');
  const panel = page.locator('#advanced-tools');
  if (!await panel.evaluate(element => element.open)) await clickVisible(panel.locator(':scope > summary'));
  await expect(panel).toHaveJSProperty('open',true);
}
