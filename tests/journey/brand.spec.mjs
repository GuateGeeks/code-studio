import {test, expect} from '@playwright/test';
import {LOCAL, abrirEditor} from './helpers.mjs';

test('el editor no muestra marcas ajenas ni sale a la red', async ({page}) => {
  const externos = [];
  page.on('request', r => { if (r.url().startsWith('http') && !r.url().startsWith(LOCAL)) externos.push(r.url()); });
  const rotos = [];
  page.on('response', r => { if (r.status() >= 400) rotos.push(r.url()); });
  const editor = await abrirEditor(page);
  await expect(editor.getByText('Controles', {exact: true})).toBeVisible();
  await expect(editor.locator('.blocklyTreeRow, [role=treeitem]').getByText('Escenario', {exact: true})).toBeVisible();
  expect(await editor.locator('body').innerText()).not.toMatch(/Microsoft|MakeCode|Explicar con IA/);
  await expect(editor.locator('.download-button:visible')).toHaveCount(0);
  await expect(editor.locator('[aria-label="Guardar el proyecto"]')).toBeVisible();
  expect(externos).toEqual([]);
  expect(rotos).toEqual([]);
});
