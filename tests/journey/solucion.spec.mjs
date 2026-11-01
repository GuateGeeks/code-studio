import {test, expect} from '@playwright/test';
import {readdirSync, readFileSync, existsSync} from 'node:fs';
import {abrirJuego, estadoJuego, jugar} from './helpers.mjs';

// Full playthroughs take about 220 s, so they only run with GG_SOLUCIONES=1.
// The one exception is the @recorrido test of rescate-plano, which `npm run recorrido` must keep playing.
const juegos = readdirSync('games').filter(id => existsSync(`games/${id}/solucion.json`));
const solucion = id => JSON.parse(readFileSync(`games/${id}/solucion.json`, 'utf8'));

for (const id of juegos) {
  test(`${id} se termina con teclado`, {tag: id === 'rescate-plano' ? '@recorrido' : undefined}, async ({page}) => {
    test.skip(id !== 'rescate-plano' && !process.env.GG_SOLUCIONES, 'partidas completas solo con GG_SOLUCIONES=1');
    test.setTimeout(120000);
    await abrirJuego(page, id);
    await jugar(page, solucion(id).rondas);
    const estado = await estadoJuego(page);
    expect(estado).toMatchObject({final: 'true', aprobado: 'true', fase: 'reflexionar', total: '5', espera: 'final'});
    expect(Number(estado.aciertos)).toBeGreaterThanOrEqual(4);
  });
}

// A game with `erradas` also plays the failing path: every wrong answer gives «Todavía no», and the other series follows.
for (const id of juegos.filter(id => solucion(id).erradas)) {
  test(`${id} con errores da «Todavía no» y la serie B`, async ({page}) => {
    test.skip(!process.env.GG_SOLUCIONES, 'partidas completas solo con GG_SOLUCIONES=1');
    test.setTimeout(120000);
    const {erradas, serieB} = solucion(id);
    await abrirJuego(page, id);
    const tras = await jugar(page, erradas);
    expect(tras).toMatchObject({fase: 'aplicar', serie: 'B', aprobado: 'false', final: 'false', espera: expect.stringMatching(/^(confirmar|eleccion)$/)});
    expect(Number(tras.avisos)).toBeGreaterThanOrEqual(2);
    expect(tras.aciertos).toBe('0');

    await jugar(page, serieB);
    const final = await estadoJuego(page);
    expect(final).toMatchObject({final: 'true', serie: 'B', aprobado: 'true', fase: 'reflexionar'});
    expect(Number(final.aciertos)).toBeGreaterThanOrEqual(4);
  });
}
