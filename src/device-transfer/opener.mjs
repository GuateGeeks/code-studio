import {exact, validateArtifact, validateNonce, transferVersion} from './protocol.mjs';

// This module has no USB or engine access. The explicit top-level host owns USB.
export function openDeviceTransfer({artifact, releaseBase = '/', window = globalThis.window, onChange = () => {}}) {
  artifact = validateArtifact(artifact);
  if (!/^\/(?:releases\/[a-f0-9]{64}\/)?$/.test(releaseBase)) throw new Error('Ruta de transferencia inválida');
  const nonce = validateNonce(window.crypto.randomUUID());
  const origin = window.location.origin;
  let live = true, connected = false, port, timer, resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  // Callers may use status callbacks only; an unopened popup is still reported.
  ready.catch(() => {});
  const update = (status, error = null, progress = null) => {
    try { onChange({status, error, progress}); } catch {}
  };
  const popup = window.open(origin + releaseBase + 'device-transfer.html?nonce=' + nonce, 'gg-device-transfer-' + nonce);
  function cleanup() { window.removeEventListener('message', receive); window.clearTimeout(timer); }
  function cancel() {
    if (!live) return;
    live = false; cleanup();
    try { port?.postMessage({type: 'cancel', version: transferVersion, nonce}); } catch {}
    port?.close(); artifact = null;
    rejectReady(new Error('Transferencia cancelada'));
    update('cancelled');
  }
  function close() { cancel(); popup?.close(); }
  function fail(message) {
    if (!live) return;
    live = false; cleanup();
    try { port?.postMessage({type: 'cancel', version: transferVersion, nonce}); } catch {}
    port?.close(); artifact = null;
    rejectReady(new Error(message)); update('error', message);
  }
  function receive(event) {
    if (!live || connected || event.origin !== origin || event.source !== popup || event.ports.length !== 0) return;
    try { exact(event.data, ['type', 'version', 'nonce']); } catch { return; }
    if (event.data.type !== 'device-transfer-ready' || event.data.version !== transferVersion || event.data.nonce !== nonce) return;
    connected = true; cleanup();
    const channel = new window.MessageChannel(); port = channel.port1;
    port.onmessage = message => {
      if (!live) return;
      const value = message.data;
      try { exact(value, ['type', 'version', 'nonce', 'status', 'error', 'progress']); } catch { return; }
      if (value.type !== 'status' || value.version !== transferVersion || value.nonce !== nonce ||
          !['ready', 'connecting', 'connected', 'transferring', 'complete', 'cancelled', 'error'].includes(value.status) ||
          !(value.error === null || typeof value.error === 'string' && value.error.length <= 512) ||
          !(value.progress === null || Number.isFinite(value.progress) && value.progress >= 0 && value.progress <= 1)) return;
      update(value.status, value.error, value.progress);
      if (value.status === 'ready') resolveReady();
      if (value.status === 'error') rejectReady(new Error(value.error ?? 'Error de transferencia'));
      if (['cancelled', 'complete'].includes(value.status)) { live = false; cleanup(); port.close(); artifact = null; }
    };
    port.start();
    popup.postMessage({type: 'device-transfer-connect', version: transferVersion, nonce}, origin, [channel.port2]);
    port.postMessage({type: 'artifact', version: transferVersion, nonce, artifact});
    artifact = null;
    timer = window.setTimeout(() => { fail('La transferencia venció. Abre una nueva desde Studio.'); }, 5 * 60 * 1000);
  }
  if (!popup) fail('El navegador bloqueó la ventana. Permite ventanas emergentes y vuelve a intentarlo.');
  else {
    update('opening');
    window.addEventListener('message', receive);
    timer = window.setTimeout(() => fail('La página de transferencia no respondió'), 30000);
  }
  return {ready, cancel, close};
}
