import {test, expect} from '@playwright/test';
import {LOCAL, abrirProyecto, editorDe, entrarComo, escribir, escribirSinEsperar, leerCodigo, portada, registros, vigilarRed} from './helpers.mjs';

const volver = page => page.getByRole('button', {name: 'Cambiar de estudiante'}).click();

test('dos estudiantes no se mezclan y reabren su trabajo', {tag: '@recorrido'}, async ({page}) => {
  const externos = vigilarRed(page, LOCAL);
  await entrarComo(page, 'Ana');
  await escribir(page, await abrirProyecto(page), 'info.setScore(11)\n');
  await volver(page);
  await entrarComo(page, 'Luis');
  const editor = await abrirProyecto(page);
  await escribir(page, editor, 'info.setScore(22)\n');
  await page.reload();
  await entrarComo(page, 'Ana');
  await editorJs(page);
  expect(await leerCodigo(page)).toContain('setScore(11)');
  expect(externos).toEqual([]);
});

async function editorJs(page) {
  await abrirProyecto(page);
  await page.waitForTimeout(3000);
}

test('salir justo después de editar conserva el cambio', {tag: '@recorrido'}, async ({page}) => {
  await entrarComo(page, 'Marta');
  const editor = await abrirProyecto(page);
  await escribirSinEsperar(page, editor, 'info.setScore(33)\n');
  await volver(page);
  await expect(page.locator('#students')).toBeVisible();
  expect((await registros(page, 'Marta'))[0].project.text['main.ts']).toContain('setScore(33)');
});

test('un nombre vacío se rechaza y el HTML se muestra como texto', async ({page}) => {
  await page.goto(portada(LOCAL));
  await page.getByLabel('Tu nombre').fill('   ');
  await page.getByRole('button', {name: 'Entrar'}).click();
  await expect(page.getByRole('alert')).toContainText('nombre');
  await page.getByLabel('Tu nombre').fill('<img src=x onerror=window.pwn=1>');
  await page.getByRole('button', {name: 'Entrar'}).click();
  await expect(page.getByRole('heading')).toContainText('<img src=x onerror=window.pwn=1>');
  expect(await page.evaluate(() => window.pwn)).toBeUndefined();
});

test('el PNG lleva la identidad y se abre en otro perfil', {tag: '@recorrido'}, async ({page, browser}) => {
  await entrarComo(page, 'Ana');
  const editor = await abrirProyecto(page);
  await escribir(page, editor, 'info.setScore(44)\n');
  const descarga = page.waitForEvent('download');
  await editor.locator('[aria-label="Guardar el proyecto"]').first().click();
  const archivo = await (await descarga).path();
  const otra = await browser.newPage();
  await entrarComo(otra, 'Luis');
  await otra.waitForTimeout(300);
  await otra.locator('#import-png').setInputFiles({name: 'juego.png', mimeType: 'image/png', buffer: (await import('node:fs')).readFileSync(archivo)});
  const original = (await registros(page, 'Ana'))[0].ggId;
  await expect.poll(async () => (await registros(otra, 'Luis')).map(r => r.ggId), {timeout: 25000}).toContain(original);
  const importado = (await registros(otra, 'Luis')).find(r => r.ggId === original);
  expect(importado.project.text['main.ts']).toContain('setScore(44)');
  await otra.close();
});

test('Version History restaura una versión anterior', async ({page}) => {
  await page.clock.install();
  await entrarComo(page, 'Sara');
  const editor = await abrirProyecto(page);
  await escribir(page, editor, 'info.setScore(1)\n');
  await page.clock.fastForward(6 * 60000);
  await page.waitForTimeout(1200);
  await escribir(page, editor, 'info.setScore(2)\n');
  await page.clock.fastForward(11 * 60000);
  await page.waitForTimeout(1200);
  await escribir(page, editor, 'info.setScore(3)\n');
  await editor.locator('[aria-label="Más..."], [aria-label="Configuración"], [title="Más..."], [title="Configuración"]').first().click();
  await editor.getByText('Historial de versiones').first().click();
  const linea = editor.locator('.time-machine-timeline');
  await expect(linea).toBeVisible({timeout: 8000});
  await linea.getByText(/m\.$/).nth(1).click();
  await page.waitForTimeout(3500);
  await editor.getByRole('button', {name: 'Restaurar'}).first().click();
  await page.waitForTimeout(800);
  await editor.locator('.common-modal .primary, .ui.modal.visible .approve').first().click({timeout: 2500}).catch(() => {});
  await expect.poll(() => leerCodigo(page).catch(() => ''), {timeout: 15000}).not.toContain('setScore(3)');
});

test('si no se puede guardar, avisa y no cierra el editor', async ({page}) => {
  await entrarComo(page, 'Nora');
  await abrirProyecto(page);
  await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('lleno', 'QuotaExceededError'); }; });
  const editor = editorDe(page);
  await escribirSinEsperar(page, editor, 'info.setScore(66)\n');
  await volver(page);
  await expect(page.locator('#save-warning')).toBeVisible({timeout: 8000});
  await expect(page.locator('#editor-frame')).toHaveCount(1);
  await expect(page.locator('#students')).toBeHidden();
  await expect(page.getByRole('button', {name: 'Descargar mi trabajo'})).toBeVisible();
});

test('la pantalla de otro estudiante no muestra proyectos ajenos', async ({page}) => {
  await entrarComo(page, 'Ana');
  await abrirProyecto(page);
  await volver(page);
  await entrarComo(page, 'Luis');
  await expect(page.locator('#projects-title')).toContainText('Luis');
  await expect(page.locator('.project')).toHaveCount(0);
});

test('si falta la plantilla, avisa y no crea nada', async ({page}) => {
  await page.route('**/project-template.json', route => route.fulfill({status: 404, body: 'no'}));
  await entrarComo(page, 'Eva');
  await page.getByRole('button', {name: 'Nuevo proyecto'}).click();
  await expect(page.locator('#alert')).toContainText('No pudimos');
  expect(await registros(page, 'Eva')).toEqual([]);
});

test('eliminar un proyecto vuelve a la lista sin aviso de fallo', async ({page}) => {
  await entrarComo(page, 'Iris');
  const editor = await abrirProyecto(page);
  await escribir(page, editor, 'info.setScore(77)\n');
  await editor.locator('[aria-label="Más..."], [aria-label="Configuración"], [title="Más..."], [title="Configuración"]').first().click();
  await editor.getByText('Eliminar Proyecto').first().click();
  await editor.locator('.common-modal .primary, .ui.modal.visible .approve, .ui.modal.visible .red').first().click();
  await expect(page.locator('#projects')).toBeVisible({timeout: 8000});
  await expect(page.locator('.project')).toHaveCount(0);
  expect((await registros(page, 'Iris'))[0].project.text['main.ts']).toContain('setScore(77)');
});
