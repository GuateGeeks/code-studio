import {test, expect} from '@playwright/test';
import {abrirJuegoDesdePortada, bloquesDe, editorDe, ejecutar, entrarComo, escribir, leerCodigo, registros, verCopia} from './helpers.mjs';

const JUEGO = /Rescate en el plano/;
const config = registro => JSON.parse(registro.project.text['pxt.json']);
// Leaving through the portal's own button makes it request a save first, the way a student leaves.
const salir = async page => {
  await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();
  await expect(page.locator('#students')).toBeVisible({timeout: 30000});
};

test('la copia cae en el estudiante correcto y se ve en bloques', {tag: '@recorrido'}, async ({page}) => {
  test.setTimeout(120000);
  await entrarComo(page, 'Ana');
  await page.locator('#change-from-projects').click();

  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await verCopia(page);

  expect(await registros(page, 'Ana')).toHaveLength(0);
  const [copia, ...otras] = await registros(page, 'Beto');
  expect(otras).toEqual([]);
  expect(config(copia).ggProject.experiencia).toBe('rescate-plano');
  expect(copia.project.header.name).toBe('Rescate en el plano');
  expect(copia.project.text['main.ts']).toContain('experiencias.comprobar');
  expect(await bloquesDe(page)).toBeGreaterThan(20);
  await expect(editorDe(page).locator('.blocks-menuitem').first()).toHaveClass(/active/);
});

test('el código sigue tras abrir, guardar y reabrir', async ({page}) => {
  test.setTimeout(150000);
  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await verCopia(page);
  await salir(page);
  await page.reload();

  const [guardada] = await registros(page, 'Beto');
  expect(guardada.project.text['main.ts']).toContain('experiencias.comprobar');
  expect(guardada.project.text['main.blocks']).toContain('<block');
  expect(config(guardada).ggProject.experiencia).toBe('rescate-plano');

  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await verCopia(page);
  expect(await bloquesDe(page)).toBeGreaterThan(20);
  expect(await registros(page, 'Beto')).toHaveLength(1);
  await ejecutar(page, editorDe(page));
});

test('pulsar otra vez abre la misma, con sus cambios, aunque esté renombrada', async ({page}) => {
  test.setTimeout(180000);
  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await verCopia(page);
  const [antes] = await registros(page, 'Beto');

  const editor = editorDe(page);
  await editor.locator('#fileNameInput2').fill('Mi versión del rescate');
  await editor.locator('#fileNameInput2').press('Enter');
  const javascript = editor.locator('.javascript-menuitem').first();
  await javascript.click();
  await page.waitForTimeout(4000);
  // `escribir` presses the tab again if it is not active, which would hide the view jumping back.
  await expect(javascript).toHaveClass(/active/);
  const cambio = 'let miContador = 7';
  await escribir(page, editor, `${await leerCodigo(page)}\n${cambio}\n`);
  await expect.poll(async () => (await registros(page, 'Beto'))[0].project.text['main.ts'], {timeout: 8000}).toContain(cambio);
  await salir(page);

  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  // The student left it in JavaScript, and that is where it reopens.
  await verCopia(page, {bloques: false});
  const registrosBeto = await registros(page, 'Beto');
  expect(registrosBeto).toHaveLength(1);
  expect(registrosBeto[0].project.header.id).toBe(antes.project.header.id);
  expect(registrosBeto[0].project.header.name).toBe('Mi versión del rescate');
  expect(registrosBeto[0].project.text['main.ts']).toContain('let miContador = 7');
  expect(config(registrosBeto[0]).ggProject.experiencia).toBe('rescate-plano');
  expect(await leerCodigo(page)).toContain('let miContador = 7');
});

test('pasar a JavaScript nada más ver los bloques no devuelve a Bloques ni pierde lo escrito', async ({page}) => {
  test.setTimeout(120000);
  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await page.locator('#player-code').click();
  const editor = editorDe(page);
  await expect(editor.locator('.blocks-menuitem').first()).toHaveClass(/active/, {timeout: 60000});

  const javascript = editor.locator('.javascript-menuitem').first();
  await javascript.click();
  // A late conversion pulled the view back seconds after this click, so the tab must stay.
  for (let i = 0; i < 16; i++) {
    await expect(javascript).toHaveClass(/active/);
    await page.waitForTimeout(500);
  }

  await editor.locator('.monaco-editor .view-lines').first().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('\n// mi cambio\n', {delay: 40});
  await expect.poll(async () => (await registros(page, 'Beto'))[0].project.text['main.ts'], {timeout: 10000}).toContain('// mi cambio');
  await salir(page);
  expect((await registros(page, 'Beto'))[0].project.text['main.ts']).toContain('// mi cambio');
});

test('una copia borrada no se reabre: se crea otra', async ({page}) => {
  test.setTimeout(150000);
  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await verCopia(page);
  await salir(page);
  const [vieja] = await registros(page, 'Beto');
  // What the editor does when the student deletes a project: it flags the header and saves.
  await page.evaluate(async clave => {
    const {openStore} = await import('./store.mjs');
    const store = await openStore();
    const registro = (await store.all()).find(r => r.key === clave);
    await store.put({...registro, project: {...registro.project, header: {...registro.project.header, isDeleted: true}}});
  }, vieja.key);

  await abrirJuegoDesdePortada(page, 'Beto', JUEGO);
  await verCopia(page);
  const todos = await registros(page, 'Beto');
  expect(todos).toHaveLength(2);
  const nueva = todos.find(r => !r.project.header.isDeleted);
  expect(nueva.project.header.id).not.toBe(vieja.project.header.id);
  expect(nueva.project.text['main.ts']).toContain('experiencias.comprobar');
});

test('un proyecto guardado sin la biblioteca sigue abriendo y ejecutándose', async ({page}) => {
  test.setTimeout(120000);
  await entrarComo(page, 'Ana');
  await page.evaluate(async () => {
    const {openStore} = await import('./store.mjs');
    const {newProject} = await import('./project.mjs');
    const plantilla = await (await fetch('project-template.json')).json();
    // A project made before the library existed: only the two original dependencies.
    plantilla.config.dependencies = {device: '*', 'gg-studio': '*'};
    const proyecto = newProject(plantilla, {name: 'Antiguo', id: 'gg-antiguo', headerId: 'h-antiguo', now: 1});
    await (await openStore()).put({key: 'Ana/h-antiguo', student: 'Ana', ggId: 'gg-antiguo', project: proyecto, at: Date.now()});
  });
  await page.reload();
  await entrarComo(page, 'Ana');
  await page.locator('.project', {hasText: 'Antiguo'}).click();
  const editor = editorDe(page);
  await editor.locator('.blocklyDraggable').first().waitFor({state: 'attached', timeout: 60000});
  await ejecutar(page, editor);
  expect(config((await registros(page, 'Ana'))[0]).dependencies).not.toHaveProperty('gg-experiencias');
});
