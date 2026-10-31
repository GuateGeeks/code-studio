import {test, expect} from '@playwright/test';
import {readdirSync, readFileSync, existsSync} from 'node:fs';
import {abrirJuego, estadoJuego, jugar} from './helpers.mjs';

// One game per mechanic is played by default; GG_SOLUCIONES=1 plays every game that has a solution.
const REPRESENTANTES = new Set(['rescate-plano', 'cuentas-mayas', 'vecinos-bosque', 'comunidad-preparada', 'lee-marimba']);
const juegos = readdirSync('games').filter(id => existsSync(`games/${id}/solucion.json`));
const solucion = id => JSON.parse(readFileSync(`games/${id}/solucion.json`, 'utf8'));

for (const id of juegos) {
  test(`${id} se termina con teclado`, {tag: id === 'rescate-plano' ? '@recorrido' : undefined}, async ({page}) => {
    test.skip(!REPRESENTANTES.has(id) && !process.env.GG_SOLUCIONES, 'solo los representantes, salvo GG_SOLUCIONES');
    test.setTimeout(120000);
    await abrirJuego(page, id);
    await jugar(page, solucion(id).rondas);
    const estado = await estadoJuego(page);
    expect(estado).toMatchObject({final: 'true', aprobado: 'true', fase: 'reflexionar', total: '5', espera: 'final'});
    expect(Number(estado.aciertos)).toBeGreaterThanOrEqual(4);
  });
}

test('rescate-plano con errores da «Todavía no» y la serie B', async ({page}) => {
  test.setTimeout(120000);
  const {erradas, serieB} = solucion('rescate-plano');
  await abrirJuego(page, 'rescate-plano');
  const tras = await jugar(page, erradas);
  expect(tras).toMatchObject({fase: 'aplicar', serie: 'B', aprobado: 'false', final: 'false', espera: 'confirmar'});
  expect(Number(tras.avisos)).toBeGreaterThanOrEqual(2);
  expect(tras.aciertos).toBe('0');

  await jugar(page, serieB);
  const final = await estadoJuego(page);
  expect(final).toMatchObject({final: 'true', serie: 'B', aprobado: 'true', fase: 'reflexionar'});
  expect(Number(final.aciertos)).toBeGreaterThanOrEqual(4);
});
