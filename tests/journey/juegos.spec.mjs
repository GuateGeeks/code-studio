import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {LOCAL, abrirJuego, estadoJuego, vigilarRed} from './helpers.mjs';

// The cases come from the published catalog, so every game added later is covered without touching this file.
const catalogo = JSON.parse(readFileSync('dist/site/code-studio/games/catalogo.json', 'utf8'));

for (const {id} of catalogo) {
  test(`${id} arranca sin errores ni salidas`, async ({page}) => {
    const salidas = vigilarRed(page, LOCAL);
    const errores = [];
    page.on('pageerror', error => errores.push(error.message));
    page.on('console', mensaje => { if (mensaje.type() === 'error') errores.push(mensaje.text()); });

    await abrirJuego(page, id);
    expect(await estadoJuego(page)).toMatchObject({estado: 'jugando', fase: 'explorar', final: 'false'});
    // The game reports through the player, so a game that only paints a frame would not get here.
    expect(Number((await estadoJuego(page)).paso)).toBeGreaterThanOrEqual(1);
    expect(salidas).toEqual([]);
    expect(errores).toEqual([]);
  });
}
