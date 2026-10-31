const READY = 'Listo para usar sin internet en esta computadora.';
const FAILED = 'No quedó listo para usar sin internet. Recarga la página con internet para intentarlo de nuevo.';
const AT_RISK = 'Este navegador podría borrar los datos si le falta espacio. Haz una copia de la clase al terminar.';

async function versionLabel() {
  const {version} = await (await fetch('sw-manifest.json')).json();
  return `Versión ${version.slice(0, 7)}.`;
}

function offerUpdate(worker, button) {
  button.hidden = false;
  button.onclick = () => {
    button.disabled = true;
    navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once: true});
    worker.postMessage('gg-update');
  };
}

// Offline is a bonus: whatever fails here, the studio still works online and the page says so.
export async function prepareOffline({status, update, storage}) {
  if (!('serviceWorker' in navigator)) return;
  navigator.storage?.persist?.().then(granted => { if (!granted) storage.textContent = AT_RISK; }, () => {});
  const {serviceWorker} = navigator;
  // Progress from downloads still in flight can arrive after the install has already failed.
  let failed = false;
  serviceWorker.addEventListener('message', ({data}) => {
    if (data?.type === 'gg-offline' && !failed) status.textContent = `Preparando el uso sin internet (${data.done} de ${data.total}).`;
  });
  const follow = worker => worker?.addEventListener('statechange', () => {
    if (worker.state === 'installed' && serviceWorker.controller) offerUpdate(worker, update);
    if (worker.state === 'redundant' && !serviceWorker.controller) {
      failed = true;
      status.textContent = FAILED;
    }
  });
  try {
    const registration = await serviceWorker.register('sw.js');
    if (registration.waiting && serviceWorker.controller) offerUpdate(registration.waiting, update);
    follow(registration.installing);
    registration.addEventListener('updatefound', () => follow(registration.installing));
    if (!serviceWorker.controller) await new Promise(resolve => serviceWorker.addEventListener('controllerchange', resolve, {once: true}));
    status.textContent = `${READY} ${await versionLabel()}`;
  } catch {
    status.textContent = FAILED;
  }
}
