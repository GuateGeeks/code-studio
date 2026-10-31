import {test, expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {LOCAL, abrirJuego, estadoJuego, jugar, pasarDialogos, pulsar, vigilarRed} from './helpers.mjs';

const AVISO = 'No pudimos abrir este juego. Tus proyectos siguen guardados. Vuelve a Experiencias e inténtalo otra vez.';
const pasoDe = async page => Number((await estadoJuego(page)).paso);
const {rondas} = JSON.parse(readFileSync('games/rescate-plano/solucion.json', 'utf8'));

test('abre sin editor ni salidas externas', {tag: '@recorrido'}, async ({page}) => {
  const salidas = vigilarRed(page, LOCAL);
  const pedidas = [];
  const errores = [];
  page.on('response', respuesta => pedidas.push(respuesta.url()));
  page.on('pageerror', error => errores.push(error.message));
  page.on('console', mensaje => { if (mensaje.type() === 'error') errores.push(mensaje.text()); });

  await abrirJuego(page, 'rescate-plano');
  expect(await estadoJuego(page)).toMatchObject({estado: 'jugando', fase: 'explorar'});

  expect(salidas).toEqual([]);
  expect(pedidas.filter(url => /editor\.html|\/main\.js|\/target\.js|monaco/.test(url))).toEqual([]);
  expect(pedidas.some(url => url.endsWith('/games/rescate-plano.js'))).toBe(true);
  expect(errores).toEqual([]);

  const barra = await page.locator('#player-bar').boundingBox();
  const marco = await page.locator('#sim iframe').boundingBox();
  const libre = page.viewportSize().height - (barra.y + barra.height);
  expect(marco.height).toBeGreaterThanOrEqual(libre * 0.9);
  await expect(page.locator('#player-error')).toBeHidden();
});

test('las teclas llegan al juego sin clic', async ({page}) => {
  await abrirJuego(page, 'rescate-plano');
  const antes = await pasoDe(page);
  await pulsar(page, 'A');
  await expect.poll(() => pasoDe(page)).toBeGreaterThan(antes);
});

test('un id desconocido muestra el aviso y no pide ningún juego', async ({page}) => {
  const pedidas = [];
  page.on('request', pedido => pedidas.push(new URL(pedido.url()).pathname));
  for (const id of ['../../x', 'no-existe', '']) {
    await page.goto(`${LOCAL}/code-studio/player.html?juego=${encodeURIComponent(id)}`);
    await expect(page.locator('#player-error')).toHaveText(AVISO);
    await expect(page.locator('body')).toHaveAttribute('data-estado', 'error');
    await expect(page.locator('#player-code')).toBeHidden();
    await expect(page.locator('#player-again')).toBeHidden();
  }
  expect(pedidas.filter(ruta => /\/games\/[^/]+\.js$/.test(ruta))).toEqual([]);
});

test('si el juego no descarga, muestra el aviso', async ({page}) => {
  await page.route('**/games/rescate-plano.js', ruta => ruta.abort());
  await page.goto(`${LOCAL}/code-studio/player.html?juego=rescate-plano`);
  await expect(page.locator('#player-error')).toHaveText(AVISO);
  await expect(page.locator('body')).toHaveAttribute('data-estado', 'error');
  await expect(page.locator('#player-back')).toBeVisible();
});

test('si el juego no dice nada en 15 segundos, muestra el aviso', async ({page}) => {
  await page.clock.install();
  // A game that loads but never reports: a wrong or empty file must not leave a blank screen.
  await page.route('**/games/rescate-plano.js', ruta => ruta.fulfill({contentType: 'text/javascript', body: 'void 0;'}));
  await page.goto(`${LOCAL}/code-studio/player.html?juego=rescate-plano`);
  await expect(page.locator('body')).toHaveAttribute('data-estado', 'cargando');
  await expect(page.locator('#player-error')).toBeHidden();
  await page.clock.fastForward(16000);
  await expect(page.locator('#player-error')).toHaveText(AVISO);
  await expect(page.locator('body')).toHaveAttribute('data-estado', 'error');
});

test('la barra lleva a Experiencias y a «Ver cómo está hecho»', async ({page}) => {
  // The portal rewrites its address on arrival, so the request is what proves where the button went.
  await abrirJuego(page, 'rescate-plano');
  const codigo = page.waitForRequest(pedido => /\/index\.html\?ver=rescate-plano$/.test(pedido.url()));
  await page.locator('#player-code').click();
  await codigo;
  await abrirJuego(page, 'rescate-plano');
  const atras = page.waitForRequest(pedido => /\/index\.html\?pantalla=experiencias$/.test(pedido.url()));
  await page.locator('#player-back').click();
  await atras;
});

test('Jugar otra vez reinicia desde la pantalla final y deja el foco en el juego', async ({page}) => {
  test.setTimeout(90000);
  await abrirJuego(page, 'rescate-plano');
  await jugar(page, rondas);
  expect(await estadoJuego(page)).toMatchObject({final: 'true', aciertos: '5'});
  const pasoFinal = await pasoDe(page);
  expect(pasoFinal).toBeGreaterThan(30);

  await page.locator('#player-again').click();
  // The state is the new run's: it starts over, it is not the one left on the final screen.
  await expect.poll(() => estadoJuego(page)).toMatchObject({estado: 'jugando', fase: 'explorar', final: 'false', aciertos: '0', espera: 'dialogo'});
  expect(await pasoDe(page)).toBeLessThan(5);

  // No click on the game: the keyboard must already be there.
  const antes = await pasoDe(page);
  await pulsar(page, 'A');
  await expect.poll(() => pasoDe(page)).toBeGreaterThan(antes);
});

test('la tecla de menú, B y las teclas del sistema no sacan del juego ni lo reinician', async ({page}) => {
  test.setTimeout(60000);
  await abrirJuego(page, 'rescate-plano');
  const caja = await page.locator('#sim iframe').boundingBox();
  const pantalla = () => page.screenshot({clip: caja});
  const intactos = async (tecla, referencia) => {
    await pulsar(page, tecla);
    await page.waitForTimeout(400);
    expect(Buffer.compare(await pantalla(), referencia), `${tecla} cambió la pantalla`).toBe(0);
  };

  // Waiting for the student: the screen is still, so any change is the key's doing.
  const espera = await pasarDialogos(page);
  expect(espera.espera).toBe('confirmar');
  await page.waitForTimeout(500);
  const referencia = await pantalla();
  expect(Buffer.compare(await pantalla(), referencia), 'la pantalla debe estar quieta para que la prueba valga').toBe(0);
  const pasoAntes = Number((await estadoJuego(page)).paso);

  // Backquote is the menu, Enter and X are B, Backspace restarts, P takes a screenshot and R records.
  for (const tecla of ['Backquote', 'Enter', 'KeyX', 'Backspace', 'KeyP', 'KeyR']) await intactos(tecla, referencia);
  expect(page.url()).toContain('player.html?juego=rescate-plano');
  expect(await estadoJuego(page)).toMatchObject({estado: 'jugando', fase: 'explorar', espera: 'confirmar', paso: String(pasoAntes)});

  // And the game still answers: A confirms the exploration and the next dialog comes.
  await pulsar(page, 'A');
  await expect.poll(() => estadoJuego(page)).toMatchObject({fase: 'construir', espera: 'dialogo'});
  expect(await pasoDe(page)).toBeGreaterThan(pasoAntes);
});
