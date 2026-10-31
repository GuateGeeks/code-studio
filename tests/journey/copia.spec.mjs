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
  // The code is read after the editor shows JavaScript: before that, the text it holds is not the copy's.
  await editor.locator('.javascript-menuitem').first().click();
  await page.waitForTimeout(4000);
  // In a full run the first write sometimes goes to a Monaco model the editor no longer shows (seen once in
  // four runs, cause not found), so it is repeated until it reaches the store. The attempts are recorded.
  const cambio = 'let miContador = 7';
  let intentos = 0;
  for (; intentos < 3; intentos++) {
    await escribir(page, editor, `${await leerCodigo(page)}\n${cambio}\n`);
    const llego = await expect.poll(async () => (await registros(page, 'Beto'))[0].project.text['main.ts'], {timeout: 8000}).toContain(cambio).then(() => true, () => false);
    if (llego) break;
  }
  test.info().annotations.push({type: 'intentos de escritura', description: String(intentos + 1)});
  expect(intentos).toBeLessThan(3);
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
