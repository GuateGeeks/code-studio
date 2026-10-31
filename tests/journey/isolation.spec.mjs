import {test, expect} from '@playwright/test';
import {REMOTE, abrirEditor, escribir, simulador} from './helpers.mjs';

test('el juego corre en origen opaco en un dominio real', async ({page}) => {
  const editor = await abrirEditor(page, REMOTE);
  await escribir(page, editor, 'info.setScore(7)\n');
  await editor.locator('.play-button').first().click();
  await expect.poll(() => simulador(page)?.evaluate(() => {
    const canvas = document.getElementById('game-screen');
    return canvas && !canvas.classList.contains('hidden');
  }).catch(() => false), {timeout: 20000}).toBe(true);
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
  await expect(boton).toHaveClass(/play/, {timeout: 10000});
  await boton.click();
  await expect(boton).toHaveClass(/stop/, {timeout: 20000});
});
