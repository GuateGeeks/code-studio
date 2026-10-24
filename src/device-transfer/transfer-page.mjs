import {WebUSB, DAPLink} from '/vendor/dapjs.bundle.mjs';
import {createUSBTransfer} from './usb-client.mjs';
import {exact, validateNonce, transferVersion} from './protocol.mjs';

const element = id => document.getElementById(id);
const connect = element('connect-device'), flash = element('flash-device'), cancel = element('cancel-transfer');
const status = element('transfer-status'), error = element('transfer-error'), progress = element('transfer-progress');
const labels = {empty: 'Esperando el firmware de Studio…', ready: 'Firmware verificado. Conecta la placa para continuar.',
  connecting: 'Esperando la placa…', connected: 'Placa reconocida. Confirma la transferencia.',
  transferring: 'Transfiriendo el programa…', complete: 'Transferencia terminada. Comprueba el programa en tu placa.',
  cancelled: 'Transferencia cancelada. Vuelve a Studio para preparar otra.',
  error: 'No se pudo completar la transferencia.'};
let port, nonce, received = false, live = true, artifactReady = false;
const supported = window.isSecureContext && !!navigator.usb?.requestDevice &&
  (!document.permissionsPolicy || document.permissionsPolicy.allowsFeature('usb'));
element('usb-support').textContent = supported ? 'WebUSB disponible. Solo se aceptan placas y firmware DAPLink reconocidos.'
  : 'Este navegador no permite WebUSB aquí. Conserva la descarga HEX desde Studio.';
function publish(state) {
  status.textContent = state.status === 'ready' && !supported
    ? 'Firmware verificado. Vuelve a Studio para descargar el HEX.' : labels[state.status] ?? labels.error;
  error.textContent = state.error ?? '';
  progress.hidden = state.status !== 'transferring';
  progress.value = state.progress ?? 0;
  connect.disabled = !live || !supported || !artifactReady || !['ready', 'error'].includes(state.status);
  flash.disabled = !live || state.status !== 'connected';
  cancel.disabled = !live || ['complete', 'cancelled'].includes(state.status);
  if (state.board) element('board-details').textContent = state.board.label + ' · DAPLink ' + state.board.firmware;
  if (port && ['ready', 'connecting', 'connected', 'transferring', 'complete', 'cancelled', 'error'].includes(state.status)) {
    port.postMessage({type: 'status', version: transferVersion, nonce, status: state.status,
      error: state.error, progress: state.progress});
  }
}
const client = createUSBTransfer({usb: navigator.usb, createTransport: device => new WebUSB(device),
  createDAPLink: transport => new DAPLink(transport), onChange: publish});
function revoke() {
  live = false; artifactReady = false; client.cancel(); port?.close(); port = null;
  connect.disabled = true; flash.disabled = true; cancel.disabled = true;
}
function report(problem) { publish({status: 'error', error: String(problem.message ?? problem).slice(0, 512), progress: null}); }
try {
  if (window.top !== window || !window.opener) throw new Error('Abre esta página desde la acción USB de Studio.');
  nonce = validateNonce(new URL(location.href).searchParams.get('nonce'));
  window.addEventListener('message', event => {
    if (port || !live || event.origin !== location.origin || event.source !== window.opener || event.ports.length !== 1) return;
    try { exact(event.data, ['type', 'version', 'nonce']); } catch { return; }
    if (event.data.type !== 'device-transfer-connect' || event.data.version !== transferVersion || event.data.nonce !== nonce) return;
    port = event.ports[0];
    port.onmessage = async event => {
      const message = event.data;
      if (!live) return;
      try {
        if (message?.type === 'cancel') {
          exact(message, ['type', 'version', 'nonce']);
          if (message.version !== transferVersion || message.nonce !== nonce) return;
          revoke(); return;
        }
        exact(message, ['type', 'version', 'nonce', 'artifact']);
        if (received || message.type !== 'artifact' || message.version !== transferVersion || message.nonce !== nonce) return;
        received = true;
        const value = await client.setArtifact(message.artifact);
        if (!live) return;
        artifactReady = true;
        element('artifact-variant').textContent = {v1: 'micro:bit V1', v2: 'micro:bit V2', universal: 'Universal V1 y V2'}[value.variant];
        element('artifact-hash').textContent = value.sha256;
        element('artifact-details').hidden = false;
        publish(client.state());
      } catch (problem) { if (live) report(problem); }
    };
    port.start();
  });
  window.opener.postMessage({type: 'device-transfer-ready', version: transferVersion, nonce}, location.origin);
} catch (problem) { live = false; report(problem); connect.disabled = true; flash.disabled = true; }
connect.addEventListener('click', () => { if (live && artifactReady) void client.connect().catch(problem => { if (live) report(problem); }); });
flash.addEventListener('click', () => { if (live && artifactReady) void client.flash().catch(problem => { if (live) report(problem); }); });
cancel.addEventListener('click', revoke);
window.addEventListener('pagehide', () => { revoke(); client.dispose(); });
