import {installedOfflineRoles, rolesForOrigins, releaseBase, validateDescriptor, checkedResponse, parseJSON, validateReleaseManifest} from './contracts.mjs';
export async function ensureOfflineWorker(window = globalThis.window) {
  if (!window?.navigator?.serviceWorker) throw new Error('Este navegador no admite preparacion sin conexion.');
  let registration = await window.navigator.serviceWorker.getRegistration('/');
  try {const updated=await window.navigator.serviceWorker.register('/offline-sw.js', {type:'module',scope:'/',updateViaCache:'none'});await updated.update?.();registration=updated;}
  catch(error){if(!registration?.active)throw error;}
  const installing=registration?.installing??registration?.waiting;
  if(installing&&installing.state!=='activated')await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{installing.removeEventListener('statechange',change);reject(new Error('No se pudo actualizar el soporte offline compatible.'));},15000);function change(){if(['activated','redundant'].includes(installing.state)){clearTimeout(timer);installing.removeEventListener('statechange',change);if(installing.state==='activated')resolve();else reject(new Error('Actualización offline descartada.'));}}installing.addEventListener('statechange',change);change();});
  if (!registration.active) registration = await window.navigator.serviceWorker.ready;
  if (!registration.active) throw new Error('El soporte sin conexion no esta activo.');
  return registration;
}
export async function requestOfflineWorker(command, data, {window = globalThis.window, signal, onProgress = () => {}} = {}) {
  if (signal?.aborted) throw new Error('Preparacion cancelada.');
  const registration = await ensureOfflineWorker(window);
  if (signal?.aborted) throw new Error('Preparacion cancelada.');
  const channel = new window.MessageChannel();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('El origen no respondio a la preparacion.')), 180000);
    function abort() {
      try { channel.port1.postMessage({type: 'cancel', operationId: data.operationId}); } catch {}
      finish(new Error('Preparacion cancelada.'));
    }
    function finish(error, result) {
      clearTimeout(timeout); signal?.removeEventListener('abort', abort);
      channel.port1.close();
      if (error) reject(error); else resolve(result);
    }
    channel.port1.onmessage = event => {
      const message = event.data;
      if (message?.operationId !== data.operationId) return;
      if (message.type === 'progress') onProgress(message.progress);
      else if (message.type === 'result') finish(null, message.result);
      else if (message.type === 'error') finish(new Error(String(message.error).slice(0, 1024)));
    };
    channel.port1.start();
    signal?.addEventListener('abort', abort, {once: true});
    registration.active.postMessage({protocolVersion: 1, command, ...data}, [channel.port2]);
  });
}
export async function readLatestRelease({window = globalThis.window, fetchImpl = window.fetch.bind(window)} = {}) {
  const descriptor = validateDescriptor(parseJSON(await checkedResponse(await fetchImpl('/latest-release.json', {cache: 'no-store'}), null, {maxBytes: 4096})));
  const bytes = await checkedResponse(await fetchImpl(releaseBase(descriptor.cohort) + 'release.json', {cache: 'no-store'}),
    {sha256: descriptor.manifestHash}, {maxBytes: 1048576});
  const manifest = validateReleaseManifest(parseJSON(bytes));
  if (manifest.cohort !== descriptor.cohort || manifest.origins.shellOrigin !== window.location.origin) throw new Error('Release de otro despliegue.');
  return {descriptor, manifest};
}
export function requestOfflineAgent(role, selection, command, {window = globalThis.window, signal, onProgress = () => {}, parentRole = 'shell', operationId} = {}) {
  if (!installedOfflineRoles.includes(role) || role === 'shell') return Promise.reject(new Error('Unknown offline agent'));
  const nonce = window.crypto.randomUUID();
  const origin = selection.origins[role + 'Origin'];
  const frame = window.document.createElement('iframe');
  frame.hidden = true;
  frame.title = 'Preparacion sin conexion: ' + role;
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  const address = new URL(origin + selection.releaseBase + 'offline-preparer.html');
  address.searchParams.set('nonce', nonce); address.searchParams.set('parentRole', parentRole);
  frame.src = address.href;
  let port;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('No respondio el preparador ' + role)), 180000);
    function finish(error, result) {
      clearTimeout(timeout); window.removeEventListener('message', ready); signal?.removeEventListener('abort', abort);
      try { port?.postMessage({type: 'cancel', operationId}); } catch {}
      port?.close(); frame.remove();
      if (error) reject(error); else resolve(result);
    }
    function abort() { finish(new Error('Preparacion cancelada.')); }
    function ready(event) {
      const message = event.data;
      if (port || event.source !== frame.contentWindow || event.origin !== origin || message?.type !== 'offline-agent-ready' ||
          message.protocolVersion !== 1 || message.nonce !== nonce || message.role !== role) return;
      const channel = new window.MessageChannel();
      port = channel.port1;
      port.onmessage = event => {
        const data = event.data;
        if (data?.operationId !== operationId) return;
        if (data.type === 'progress') onProgress(data.progress);
        else if (data.type === 'result') finish(null, data.receipts);
        else if (data.type === 'error') finish(new Error(String(data.error).slice(0, 1024)));
      };
      port.start();
      frame.contentWindow.postMessage({type: 'offline-agent-connect', protocolVersion: 1, nonce, role}, origin, [channel.port2]);
      port.postMessage({type: 'request', command, operationId, cohort: selection.cohort, manifestHash: selection.manifestHash, packs: selection.packs});
    }
    window.addEventListener('message', ready);
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) { abort(); return; }
    window.document.body.append(frame);
  });
}
export function createOfflineTransport({window = globalThis.window} = {}) {
  return Object.freeze({
    init: () => ensureOfflineWorker(window),
    async run(command, selection, operation) {
      const data = {operationId: operation.id, cohort: selection.cohort, manifestHash: selection.manifestHash, packs: selection.packs};
      const options = {window, operationId: operation.id, signal: operation.signal, onProgress: operation.onProgress};
      const roles = rolesForOrigins(selection.origins);
      const results = await Promise.all([
        requestOfflineWorker(command, data, options).then(shell => ({shell})),
        ...roles.filter(role => !['shell','simulator'].includes(role)).map(role => requestOfflineAgent(role, selection, command, options))
      ]);
      return Object.assign({}, ...results);
    }
  });
}
