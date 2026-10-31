import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {LOCAL, abrirProyecto, entrarComo, escribir, leerCodigo, portada} from './helpers.mjs';

const copiar = async page => {
  const descarga = page.waitForEvent('download');
  await page.locator('.class-tools summary').click();
  await page.getByRole('button', {name: 'Copia de la clase'}).click();
  return readFileSync(await (await descarga).path());
};
const restaurar = (page, name, buffer) => page.locator('#class-restore').setInputFiles({name, mimeType: 'application/json', buffer});

test('la copia de la clase devuelve proyecto e historial tras borrar los datos', {tag: '@recorrido'}, async ({page}) => {
  await entrarComo(page, 'Ana');
  await escribir(page, await abrirProyecto(page), 'info.setScore(55)\n');
  await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();
  const copia = await copiar(page);
  expect(JSON.parse(copia).records[0].project.text._history).toBeTruthy();
  await page.evaluate(() => new Promise(resolve => { const q = indexedDB.deleteDatabase('gg-studio'); q.onsuccess = q.onblocked = resolve; }));
  await page.reload();
  await expect(page.getByRole('button', {name: 'Ana', exact: true})).toHaveCount(0);
  await restaurar(page, 'copia.json', copia);
  await expect(page.getByRole('button', {name: 'Ana', exact: true})).toBeVisible();
  await entrarComo(page, 'Ana');
  await abrirProyecto(page);
  await expect.poll(() => leerCodigo(page).catch(() => ''), {timeout: 10000}).toContain('setScore(55)');
});

test('una copia inválida no cambia nada y explica por qué', async ({page}) => {
  await page.goto(portada(LOCAL));
  await page.getByLabel('Tu nombre').fill('Ana');
  await page.getByRole('button', {name: 'Entrar'}).click();
  await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();
  await page.locator('.class-tools summary').click();
  await restaurar(page, 'mala.json', Buffer.from('no es una copia'));
  await expect(page.locator('#class-status')).toContainText('no es una copia válida');
  await expect(page.getByRole('button', {name: 'Ana', exact: true})).toBeVisible();
});
