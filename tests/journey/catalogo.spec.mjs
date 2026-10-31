import {test, expect} from '@playwright/test';
import {LOCAL, entrarComo, portada, todosLosRegistros} from './helpers.mjs';

const catalogo = page => page.locator('#catalog');

test('lista por área y abre el juego con una pulsación', {tag: '@recorrido'}, async ({page}) => {
  await entrarComo(page, 'Ana');
  await page.locator('#open-catalog').click();
  // Scoped to the catalog: the mission and the home screen use the same words.
  await expect(catalogo(page)).toBeVisible();
  await expect(catalogo(page).getByRole('heading', {name: 'Matemáticas'})).toBeVisible();
  const juego = catalogo(page).getByRole('button', {name: /Rescate en el plano/});
  await expect(juego).toHaveCount(1);
  await expect(juego).toContainText('Repite un tema de Sócrates');
  await juego.click();
  await expect(page).toHaveURL(/\/player\.html\?juego=rescate-plano$/);
  await expect(page.locator('body')).toHaveAttribute('data-estado', 'jugando', {timeout: 30000});
  expect(await page.evaluate(() => sessionStorage.getItem('gg-estudiante'))).toBe('Ana');
});

test('Volver a Experiencias conserva al estudiante', async ({page}) => {
  await entrarComo(page, 'Ana');
  await page.locator('#open-catalog').click();
  await catalogo(page).getByRole('button', {name: /Rescate en el plano/}).click();
  await expect(page.locator('body')).toHaveAttribute('data-estado', 'jugando', {timeout: 30000});
  await page.locator('#player-back').click();
  await expect(catalogo(page)).toBeVisible();
  await expect(page.locator('#students')).toBeHidden();
  await expect(page).toHaveURL(/\/code-studio\/$/);
  await page.locator('#catalog-back').click();
  await expect(page.locator('#projects-title')).toHaveText('Hola, Ana');
});

test('un estudiante que no está en la lista lleva a elegir de nuevo y no crea nada', async ({page}) => {
  await entrarComo(page, 'Ana');
  await page.evaluate(() => sessionStorage.setItem('gg-estudiante', 'Nadie'));
  for (const entrada of ['?ver=rescate-plano', '?pantalla=experiencias']) {
    await page.goto(`${portada(LOCAL)}${entrada}`);
    await expect(page.locator('#students')).toBeVisible();
    await expect(page.locator('#catalog')).toBeHidden();
    await expect(page.locator('#projects')).toBeHidden();
  }
  expect(await todosLosRegistros(page)).toEqual([]);
});

test('sin estudiante guardado, ?ver no crea nada y se ve la lista', async ({page}) => {
  await entrarComo(page, 'Ana');
  await page.evaluate(() => sessionStorage.clear());
  await page.goto(`${portada(LOCAL)}?ver=rescate-plano`);
  await expect(page.locator('#students')).toBeVisible();
  await expect(page.getByRole('button', {name: 'Ana', exact: true})).toBeVisible();
  expect(await todosLosRegistros(page)).toEqual([]);
});

test('si el catálogo no carga, lo dice y no deja a la persona sin salida', async ({page}) => {
  await entrarComo(page, 'Ana');
  await page.route('**/games/catalogo.json', ruta => ruta.abort());
  await page.locator('#open-catalog').click();
  await expect(page.locator('#alert')).toHaveText('No pudimos abrir las experiencias. Avísale a tu docente.');
  await expect(page.locator('#projects')).toBeVisible();
});
