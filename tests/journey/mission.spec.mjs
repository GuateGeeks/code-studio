import {test, expect} from '@playwright/test';
import {LOCAL, ejecutar, editorDe, entrarComo, portada, registros, vigilarRed} from './helpers.mjs';

const siguiente = editor => editor.getByRole('button', {name: 'Ir al siguiente paso del tutorial.'}).last();
const iniciarMision = page => page.getByRole('button', {name: 'Misión: Atrapa la fruta'}).click();
const enMision = editor => editor.locator('.tutorial-container').waitFor({state: 'attached', timeout: 60000});
const avanzar = async (page, editor, pasos) => {
  for (let i = 0; i < pasos; i++) {
    await siguiente(editor).click();
    await page.waitForTimeout(300);
  }
};
const conMision = (records) => records.filter(r => r.project.header.tutorial || r.project.header.tutorialCompleted);

test('la misión filtra los bloques, se guarda con el estudiante y se retoma', {tag: '@recorrido'}, async ({page}) => {
  test.setTimeout(150000);
  const salidas = vigilarRed(page, LOCAL);
  await entrarComo(page, 'Ana');
  await iniciarMision(page);

  const editor = editorDe(page);
  await enMision(editor);
  await editor.getByRole('button', {name: 'Aceptar'}).click();

  // Only the categories the mission uses remain, and the stock block for art is translated.
  await expect(editor.locator('.blocklyTreeRow').first()).toBeVisible({timeout: 30000});
  await expect(editor.locator('.blocklyTreeRow', {hasText: 'Música'})).toHaveCount(0);
  await expect(editor.locator('.blocklyTreeRow', {hasText: 'Sprites'})).toHaveCount(1);
  await editor.locator('.blocklyTreeRow', {hasText: 'Sprites'}).click();
  await expect(editor.locator('.blocklyFlyout').getByText('destruir', {exact: true})).toBeVisible();
  await page.keyboard.press('Escape');

  await avanzar(page, editor, 2);
  await expect.poll(async () => conMision(await registros(page, 'Ana')).length, {timeout: 20000}).toBe(1);
  await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();

  await entrarComo(page, 'Ana');
  await expect(page.locator('.project')).toHaveCount(1);
  const [guardada] = await registros(page, 'Ana');
  expect(guardada.ggId).toMatch(/^gg-/);
  expect(guardada.project.header.name).toBe('Atrapa la fruta');
  expect(guardada.project.header.tutorial.tutorialStep).toBe(3);

  // Pressing the mission again continues it; it doesn't start over or duplicate it.
  await page.reload();
  await entrarComo(page, 'Ana');
  await iniciarMision(page);
  await enMision(editor);
  await expect(editor.locator('.tutorial-step-label:visible')).toContainText('Paso 4 de 10');

  await avanzar(page, editor, 6);
  await editor.getByRole('button', {name: 'Aceptar'}).click();
  await editor.getByRole('button', {name: 'Terminar el tutorial.'}).last().click();
  await expect.poll(async () => (await registros(page, 'Ana'))[0].project.header.tutorialCompleted, {timeout: 20000}).toBeTruthy();
  await ejecutar(page, editor);
  expect(await registros(page, 'Ana')).toHaveLength(1);
  expect(salidas).toEqual([]);
});

test('la misión también arranca si el estudiante ya tiene proyectos', async ({page}) => {
  test.setTimeout(90000);
  await entrarComo(page, 'Eva');
  await page.getByRole('button', {name: 'Nuevo proyecto'}).click();
  const editor = editorDe(page);
  await editor.locator('.blocklyDraggable').first().waitFor({state: 'attached', timeout: 60000});
  await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();

  await entrarComo(page, 'Eva');
  await iniciarMision(page);
  await enMision(editor);
  await editor.getByRole('button', {name: 'Aceptar'}).click();
  await expect(editor.locator('.blocklyTreeRow', {hasText: 'Sprites'})).toHaveCount(1);
  await avanzar(page, editor, 1);
  await expect.poll(async () => (await registros(page, 'Eva')).map(r => r.project.header.name).sort(), {timeout: 20000}).toEqual(['Atrapa la fruta', 'Mi juego 1']);
});

test('si la misión no se puede abrir, avisa y vuelve a los proyectos', async ({page}) => {
  test.setTimeout(90000);
  await page.route('**/missions/*.md', route => route.fulfill({contentType: 'text/markdown', body: '# Rota\n'}));
  await entrarComo(page, 'Rosa');
  await iniciarMision(page);
  // PXT stays silent on this markdown, so the failed answer comes from the editor frame itself.
  await expect.poll(() => page.frames().some(f => /ws=iframe/.test(f.url()))).toBe(true);
  await page.frames().find(f => /ws=iframe/.test(f.url())).evaluate(() => window.parent.postMessage({type: 'pxteditor', id: 'mission', success: false}, '*'));
  await expect(page.locator('#alert')).toContainText('No pudimos abrir la misión');
  await expect(page.getByRole('button', {name: 'Nuevo proyecto'})).toBeVisible();
  expect(await registros(page, 'Rosa')).toHaveLength(0);
});

test('la plantilla usa 320×240 sin bloque gris', async ({page}) => {
  test.setTimeout(90000);
  await page.goto(portada(LOCAL));
  const plantilla = await (await page.request.get(`${portada(LOCAL)}project-template.json`)).json();
  expect(plantilla.config.dependencies['gg-studio']).toBeTruthy();
  await entrarComo(page, 'Luis');
  await page.getByRole('button', {name: 'Nuevo proyecto'}).click();
  const editor = editorDe(page);
  await editor.locator('.blocklyDraggable').first().waitFor({state: 'attached', timeout: 60000});
  await expect(editor.locator('.blocklyDraggable[data-category="grey"], g[data-shapes="grey"]')).toHaveCount(0);
  const editorFrame = page.frames().find(f => /ws=iframe/.test(f.url()));
  expect(await editorFrame.evaluate(() => pxt.appTarget.runtime.screenSize)).toEqual({width: 320, height: 240});
  await ejecutar(page, editor);
  const ancho = await page.frames().find(f => /srcdoc/.test(f.url())).evaluate(() => document.getElementById('game-screen').width);
  expect(ancho).toBe(320);
});
