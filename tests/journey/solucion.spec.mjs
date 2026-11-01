import {test, expect} from '@playwright/test';
import {execFile} from 'node:child_process';
import {readdirSync, readFileSync, existsSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {promisify} from 'node:util';
import {abrirJuego, abrirJuegoDesdePortada, editorDe, estadoJuego, jugar, registros} from './helpers.mjs';

// Full playthroughs take about 220 s, so they only run with GG_SOLUCIONES=1.
// The one exception is the @recorrido test of rescate-plano, which `npm run recorrido` must keep playing.
const juegos = readdirSync('games').filter(id => existsSync(`games/${id}/solucion.json`));
const solucion = id => JSON.parse(readFileSync(`games/${id}/solucion.json`, 'utf8'));
// With GG_CAPTURAS=<folder>, the final screen of each playthrough is saved there, to be read against the game's logic.
const capturar = (page, nombre) => process.env.GG_CAPTURAS ? page.screenshot({path: `${process.env.GG_CAPTURAS}/${nombre}.png`}) : undefined;

for (const id of juegos) {
  test(`${id} se termina con teclado`, {tag: id === 'rescate-plano' ? '@recorrido' : undefined}, async ({page}) => {
    test.skip(id !== 'rescate-plano' && !process.env.GG_SOLUCIONES, 'partidas completas solo con GG_SOLUCIONES=1');
    test.setTimeout(120000);
    await abrirJuego(page, id);
    await jugar(page, solucion(id).rondas);
    const estado = await estadoJuego(page);
    expect(estado).toMatchObject({final: 'true', aprobado: 'true', fase: 'reflexionar', total: '5', espera: 'final'});
    expect(Number(estado.aciertos)).toBeGreaterThanOrEqual(4);
    await capturar(page, `final-original-${id}`);
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

// «Ver cómo está hecho» rewrites main.ts when the copy turns to Blocks, with no help from the student.
// What the game promises is that this rewritten program still compiles and plays as the original does,
// so the text the editor really saves is compiled here and the solution is played with that binary.
const catalogo = () => JSON.parse(readFileSync('dist/site/code-studio/games/catalogo.json', 'utf8'));
const PXT = resolve('node_modules/pxt-core/built/pxt.js');
const regeneradoPor = async (page, id) => {
  await abrirJuegoDesdePortada(page, 'Beto', catalogo().find(juego => juego.id === id).titulo);
  await page.locator('#player-code').click();
  await editorDe(page).locator('.blocks-menuitem.active').waitFor({state: 'attached', timeout: 60000});
  await page.waitForTimeout(2000);
  // Leaving through the portal's own button makes it request a save first, the way a student leaves.
  await page.getByRole('button', {name: 'Cambiar de estudiante'}).click();
  await expect(page.locator('#students')).toBeVisible({timeout: 30000});
  const [copia] = await registros(page, 'Beto');
  return copia.project.text['main.ts'];
};
// Same depth as games/<id>, so the dependencies of the game's pxt.json resolve unchanged; built/ is ignored by git.
async function compilar(id, codigo) {
  const dir = resolve('built/ida-y-vuelta', id);
  rmSync(dir, {recursive: true, force: true});
  mkdirSync(dir, {recursive: true});
  writeFileSync(`${dir}/main.ts`, codigo);
  const config = readFileSync(`games/${id}/pxt.json`, 'utf8').replaceAll('file:../../libs', 'file:../../../libs');
  writeFileSync(`${dir}/pxt.json`, config);
  try {
    await promisify(execFile)(process.execPath, [PXT, 'build', '--local'], {cwd: dir, maxBuffer: 1 << 24});
  } catch (error) {
    const lineas = `${error.stdout}${error.stderr}`.split('\n').filter(linea => /error/i.test(linea));
    throw new Error(`La copia regenerada de ${id} no compila:\n${lineas.slice(0, 8).join('\n')}`);
  }
  return `${dir}/built/debug/binary.js`;
}

for (const id of juegos) {
  test(`${id}: la copia pasada a Bloques compila y se termina igual`, async ({page}) => {
    test.skip(!process.env.GG_SOLUCIONES, 'partidas completas solo con GG_SOLUCIONES=1');
    test.setTimeout(240000);
    const original = readFileSync(`games/${id}/main.ts`, 'utf8');
    const regenerado = await regeneradoPor(page, id);
    expect(regenerado).toContain('experiencias.comprobar');
    try {
      const binario = await compilar(id, regenerado);
      // The player now runs the regenerated program instead of the published one.
      await page.route(`**/games/${id}.js`, ruta => ruta.fulfill({contentType: 'text/javascript', path: binario}));
      await abrirJuego(page, id);
      await jugar(page, solucion(id).rondas);
      const estado = await estadoJuego(page);
      expect(estado, `el juego regenerado ${regenerado === original ? '(idéntico)' : ''} no termina`).toMatchObject({final: 'true', aprobado: 'true', fase: 'reflexionar', total: '5', espera: 'final'});
      expect(Number(estado.aciertos)).toBeGreaterThanOrEqual(4);
      await capturar(page, `final-copia-${id}`);

      // A game with `erradas` must also survive a failed series: some locals were only reset once, at their declaration.
      const {erradas, serieB} = solucion(id);
      if (erradas) {
        await abrirJuego(page, id);
        const tras = await jugar(page, erradas);
        expect(tras).toMatchObject({fase: 'aplicar', serie: 'B', aprobado: 'false', final: 'false', espera: expect.stringMatching(/^(confirmar|eleccion)$/)});
        expect(tras.aciertos).toBe('0');
        await jugar(page, serieB);
        expect(await estadoJuego(page)).toMatchObject({final: 'true', serie: 'B', aprobado: 'true', fase: 'reflexionar'});
      }
    } finally {
      rmSync(resolve('built/ida-y-vuelta', id), {recursive: true, force: true});
    }
  });
}
