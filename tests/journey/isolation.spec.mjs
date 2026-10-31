import {test, expect} from '@playwright/test';
import {REMOTE, abrirEditor, editorDe, ejecutar, entrarComo, escribir, simulador, vigilarRed} from './helpers.mjs';

test('el juego corre en origen opaco en un dominio real', {tag: '@recorrido'}, async ({page}) => {
  const editor = await abrirEditor(page, REMOTE);
  await escribir(page, editor, 'info.setScore(7)\n');
  await ejecutar(page, editor);
  const acceso = await simulador(page).evaluate(() => {
    const probar = f => { try { f(); return 'permitido'; } catch (e) { return e.name; } };
    return {origin: self.origin, idb: probar(() => indexedDB.open('x')), ls: probar(() => localStorage.length), padre: probar(() => parent.document.title), top: probar(() => top.document.title)};
  });
  expect(acceso).toEqual({origin: 'null', idb: 'SecurityError', ls: 'SecurityError', padre: 'SecurityError', top: 'SecurityError'});
});

test('Detener y volver a ejecutar funcionan', async ({page}) => {
  const editor = await abrirEditor(page, REMOTE);
  await escribir(page, editor, 'info.setScore(7)\n');
  const boton = editor.locator('.play-button').first();
  await boton.click();
  await expect(boton).toHaveClass(/stop/, {timeout: 20000});
  await boton.click();
  await expect(boton).toHaveClass(/(^|\s)play(\s|$)/, {timeout: 10000});
  await boton.click();
  await expect(boton).toHaveClass(/stop/, {timeout: 20000});
});

test('el juego no puede controlar el editor ni cortar los guardados', async ({page}) => {
  const editor = await abrirEditor(page, REMOTE);
  await escribir(page, editor, 'info.setScore(7)\n');
  await ejecutar(page, editor);
  await simulador(page).evaluate(() => {
    const orden = {type: 'pxteditor', action: 'newproject', id: 'ataque'};
    parent.postMessage(orden, '*');
    parent.parent.postMessage(orden, '*');
    const {port2} = new MessageChannel();
    parent.parent.postMessage({type: 'iframeclientsetmessageport'}, '*', [port2]);
  });
  await page.waitForTimeout(2500);
  await escribir(page, editor, 'info.setScore(8)\n');
  await expect.poll(() => page.evaluate(() => saves.at(-1)), {timeout: 8000}).toContain('setScore(8)');
});

test('el juego no sale a la red y el escenario no queda en otra página', async ({page}) => {
  const salidas = vigilarRed(page, REMOTE);
  const editor = await abrirEditor(page, REMOTE);
  await escribir(page, editor, 'info.setScore(7)\n');
  await ejecutar(page, editor);
  const resultado = await simulador(page).evaluate(() => fetch('https://example.com/robo').then(() => 'salió', () => 'bloqueado'));
  expect(resultado).toBe('bloqueado');
  expect(salidas).toEqual([]);
  // A frame can always navigate itself, so the stage is destroyed once it does.
  await simulador(page).evaluate(() => { location = 'https://example.com/login'; }).catch(() => {});
  await expect.poll(() => page.frames().some(f => /srcdoc/.test(f.url())), {timeout: 8000}).toBe(false);
  await expect.poll(() => page.frames().some(f => f.url().includes('example.com')), {timeout: 8000}).toBe(false);
});

test('un script externo inyectado por el CDN no llega a cargarse', async ({page}) => {
  test.setTimeout(90000);
  // Playwright reports a request even when the policy stops it, so what counts is whether it loaded.
  const cargados = [];
  page.on('requestfinished', request => { if (request.url().includes('cloudflareinsights')) cargados.push(request.url()); });
  await page.route('**/beacon.min.js', route => route.fulfill({contentType: 'text/javascript', body: ''}));
  const inyectar = async route => {
    const response = await route.fetch();
    await route.fulfill({response, body: (await response.text()).replace('</head>', '<script defer src="https://static.cloudflareinsights.com/beacon.min.js"></script></head>')});
  };
  await page.route('**/code-studio/', inyectar);
  await page.route('**/editor.html*', inyectar);
  await page.route('**/simulator.html*', inyectar);
  await entrarComo(page, 'Lía');
  await page.getByRole('button', {name: 'Nuevo proyecto'}).click();
  const editor = editorDe(page);
  await editor.locator('.blocklyDraggable').first().waitFor({state: 'attached', timeout: 60000});
  await ejecutar(page, editor);
  expect(cargados).toEqual([]);
});
