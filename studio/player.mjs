import {CANAL, clearEstado, gameById, parseEstado, reflectEstado} from './experiencias.mjs';

// A game that loads but never reports is as broken as one that fails to download.
const SIN_SENAL_MS = 15000;
const AVISO = 'No pudimos abrir este juego. Tus proyectos siguen guardados. Vuelve a Experiencias e inténtalo otra vez.';
const $ = id => document.getElementById(id);
const sim = $('sim');
let driver = null;
let codigo = null;
let temporizador = null;

const marco = () => sim.querySelector('iframe');

// Focus must go down two frames: this page to the relay, and the relay to the opaque frame inside.
function enfocar() {
  const frame = marco();
  if (!frame) return;
  frame.focus();
  frame.contentWindow.postMessage({type: 'gg-focus'}, '*');
}

function fallar() {
  clearTimeout(temporizador);
  try { driver?.stop(); } catch { /* the driver may not have started */ }
  sim.replaceChildren();
  document.body.dataset.estado = 'error';
  $('player-error').textContent = AVISO;
  $('player-error').hidden = false;
  $('player-again').hidden = true;
  $('player-code').hidden = true;
}

function esperarSenal() {
  clearTimeout(temporizador);
  temporizador = setTimeout(fallar, SIN_SENAL_MS);
}

// The relay passes up only simulator traffic, and anything the game says is checked again here.
addEventListener('message', ({source, data}) => {
  if (data?.type !== 'messagepacket' || data.channel !== CANAL) return;
  if (!marco() || source !== marco().contentWindow) return;
  const estado = parseEstado(data.data);
  if (!estado) return;
  clearTimeout(temporizador);
  reflectEstado(document.body, estado);
  document.body.dataset.estado = 'jugando';
});

function jugar({reiniciar = false} = {}) {
  clearEstado(document.body);
  document.body.dataset.estado = 'cargando';
  driver.run(codigo, {aspectRatio: 4 / 3, autofocus: true, single: true, hideSimButtons: true});
  esperarSenal();
  // On the first run the frame takes focus when it reports ready; a restart has no new frame, and the click left the keyboard on the button.
  if (reiniciar) enfocar();
}

async function arrancar() {
  const id = new URLSearchParams(location.search).get('juego');
  const catalogo = await fetch('games/catalogo.json').then(respuesta => {
    if (!respuesta.ok) throw new Error(`Catálogo: ${respuesta.status}`);
    return respuesta.json();
  });
  const juego = gameById(catalogo, id);
  if (!juego) return fallar();
  $('player-back').onclick = () => location.assign('index.html?pantalla=experiencias');
  $('player-code').onclick = () => location.assign(`index.html?ver=${encodeURIComponent(juego.id)}`);
  $('player-again').onclick = () => jugar({reiniciar: true});
  document.title = `${juego.titulo} - GuateGeeks Code Studio`;
  const respuesta = await fetch(`games/${juego.id}.js`);
  if (!respuesta.ok) throw new Error(`Juego: ${respuesta.status}`);
  codigo = await respuesta.text();
  // The address must be absolute: a relative one resolves against the site root, not this page.
  driver = new pxsim.SimulatorDriver(sim, {simUrl: new URL('simulator.html', location.href).href, onSimulatorReady: enfocar});
  jugar();
}

$('player-back').onclick = () => location.assign('index.html?pantalla=experiencias');
arrancar().catch(fallar);
