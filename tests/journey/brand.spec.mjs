import {test, expect} from '@playwright/test';
import {LOCAL, abrirEditor, escribir, vigilarRed} from './helpers.mjs';

const AJENO = /Microsoft|MakeCode/;
const textoVisible = editor => editor.locator('body').evaluate(body => [body.innerText, ...[...body.querySelectorAll('[title],[aria-label],[alt]')]
  .flatMap(el => [el.title, el.getAttribute('aria-label'), el.alt])].filter(Boolean).join('\n'));

test('el editor no muestra marcas ajenas ni sale a la red', async ({page}) => {
  const externos = vigilarRed(page, LOCAL);
  const rotos = [];
  page.on('response', r => { if (r.status() >= 400) rotos.push(r.url()); });
  const editor = await abrirEditor(page);
  await expect(editor.getByText('Controles', {exact: true})).toBeVisible();
  await expect(editor.locator('.blocklyTreeRow, [role=treeitem]').getByText('Escenario', {exact: true})).toBeVisible();
  expect(await textoVisible(editor)).not.toMatch(AJENO);
  await expect(editor.locator('.download-button:visible')).toHaveCount(0);
  await expect(editor.locator('[aria-label="Guardar el proyecto"]')).toBeVisible();
  expect(externos).toEqual([]);
  expect(rotos).toEqual([]);
});

test('no hay marcas ajenas en texto, ventana estrecha ni menús', async ({page}) => {
  const externos = vigilarRed(page, LOCAL);
  await page.setViewportSize({width: 900, height: 768});
  const editor = await abrirEditor(page);
  await escribir(page, editor, 'noExiste()\n');
  await page.waitForTimeout(2500);
  expect(await textoVisible(editor)).not.toMatch(AJENO);
  await expect(editor.getByText('Explicar con IA')).toHaveCount(0);
  await expect(editor.getByText('Abrir en código VS')).toHaveCount(0);
  expect(externos).toEqual([]);
});
