import {createOfflineController} from './controller.mjs';
const output = document.querySelector('#offline-boot-status'), retry = document.querySelector('#offline-boot-retry');
const controller = createOfflineController();
let running = false;
async function boot() {
  if (running) return;
  running = true; retry.disabled = true;
  try {
    const state = await controller.init();
    if (!state.current) throw new Error('No hay una version preparada en este navegador.');
    let selection;
    try { selection = await controller.verify(state.current); }
    catch (error) {
      if (!state.previous) throw error;
      output.textContent = 'La version actual esta incompleta. Comprobando la anterior...';
      selection = await controller.rollback();
    }
    output.textContent = 'Version completa. Abriendo tu proyecto...';
    location.replace(selection.origins.shellOrigin + selection.releaseBase);
  } catch (error) {
    output.textContent = 'No se pudo abrir sin conexion: ' + String(error.message) + ' Conecta este equipo para preparar los paquetes faltantes.';
  } finally { running = false; retry.disabled = false; }
}
retry.addEventListener('click', boot);
boot();
