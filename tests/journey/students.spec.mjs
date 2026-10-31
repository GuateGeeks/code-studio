import {test, expect} from '@playwright/test';
import {LOCAL, abrirProyecto, entrarComo, escribir, leerCodigo, portada, vigilarRed} from './helpers.mjs';

const volver = page => page.getByRole('button', {name: 'Cambiar de estudiante'}).click();

test('dos estudiantes no se mezclan y reabren su trabajo', async ({page}) => {
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

test('salir justo después de editar conserva el cambio', async ({page}) => {
  await entrarComo(page, 'Marta');
  const editor = await abrirProyecto(page);
  await escribir(page, editor, 'info.setScore(33)\n');
  await volver(page);
  await page.reload();
  await entrarComo(page, 'Marta');
  await editorJs(page);
  expect(await leerCodigo(page)).toContain('setScore(33)');
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

test('el PNG lleva la identidad y se abre en otro perfil', async ({page, browser}) => {
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
  await expect.poll(async () => (await otra.evaluate(async () => {
    const {openStore} = await import('./store.mjs');
    return (await (await openStore()).list('Luis')).flatMap(r => [r.project.text['main.ts'], JSON.parse(r.project.text['pxt.json']).ggProject?.id]);
  })).join(' '), {timeout: 25000}).toMatch(/setScore\(44\).*gg-/s);
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
