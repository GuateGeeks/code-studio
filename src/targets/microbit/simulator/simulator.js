import {validateSimulatorDeviceScope} from '../../../contracts/device-runtime.mjs';
import {observeButtonBus} from './button-observer.mjs';
// This context alone permits eval required by the real PXT Runtime.
// Do not start pxsim.Embed: its global message handler is not our capability protocol.
const config = await fetch('/config.json').then(response => response.json());
const boardDefinition = await fetch('/board.json').then(response => response.json());
const session = new URL(location.href).searchParams.get('session');
let port;
let runtime;
let codeHash;
let finished = false;
let fault = null;
let lastRequest = 0;
let epoch = 0;
let activeScope = null;
let detachButtons = () => {};
pxsim.Runtime.postMessage = message => {
  if (message.type === 'debugger' && message.subtype === 'breakpoint' && message.exceptionMessage) fault = String(message.exceptionMessage).slice(0, 2048);
};
function stop() {
  detachButtons(); detachButtons = () => {};
  activeScope = null;
  if (runtime) { runtime.kill(); runtime.board.kill(); }
  runtime = null;
}
function snapshot() {
  const matrix = runtime ? Array.from(runtime.board.ledMatrixState.image.data, value => value > 0 ? 1 : 0) : [];
  const visual = Array.from(document.querySelectorAll('.sim-led'), led => Number(led.style.opacity) > 0 ? 1 : 0);
  let parentBlocked = false;
  try { void parent.document.body; } catch (error) { parentBlocked = error.name === 'SecurityError'; }
  return {matrix, visual, finished, fault, dead: runtime?.dead ?? true, codeHash, origin: location.origin, parentBlocked,
    physicalBoardValidated: false, ...(activeScope ? {deviceScope: {...activeScope}} : {})};
}
function prepareRun(payload) {
  if (typeof payload.code !== 'string' || new TextEncoder().encode(payload.code).length > 2_000_000) throw new Error('Invalid simulator request');
  const scope = payload.deviceScope === undefined ? null : validateSimulatorDeviceScope(payload.deviceScope);
  if (scope && scope.sessionId !== session) throw new Error('Invalid simulator session');
  return {code: payload.code, scope};
}
async function handle(command, payload, ticket) {
  if (command === 'snapshot') return snapshot();
  if (command === 'stop') { stop(); return snapshot(); }
  if (command !== 'run') throw new Error('Invalid simulator request');
  const {code, scope} = prepareRun(payload);
  if (ticket !== epoch) throw new Error('Simulator request superseded');
  const nextHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))), byte => byte.toString(16).padStart(2, '0')).join('');
  if (ticket !== epoch) throw new Error('Simulator request superseded');
  stop(); finished = false; fault = null;
  codeHash = nextHash;
  const message = {type: 'run', id: session, code, boardDefinition, parts: [], builtinParts: [], partDefinitions: {}, fnArgs: {}, mute: true, theme: 'mbdal'};
  const candidate = new pxsim.Runtime(message);
  runtime = candidate;
  try {
    await candidate.board.initAsync(message);
    if (ticket !== epoch || runtime !== candidate) throw new Error('Simulator request superseded');
    pxsim.AudioContextManager.mute(true);
    activeScope = scope;
    if (scope) detachButtons = observeButtonBus({board: candidate.board, deviceScope: scope, emit: event => {
      if (ticket === epoch && runtime === candidate) port.postMessage(event);
    }});
    candidate.errorHandler = error => { if (runtime === candidate && ticket === epoch) fault = String(error).slice(0, 2048); };
    candidate.run(() => { if (runtime === candidate && ticket === epoch) finished = true; });
    return snapshot();
  } catch (error) {
    if (runtime === candidate) stop();
    else { candidate.kill(); candidate.board.kill(); }
    throw error;
  }
}
window.addEventListener('message', event => {
  const data = event.data;
  if (port || event.origin !== config.runnerOrigin || event.source !== parent || data?.type !== 'sim-connect' || data.session !== session || data.version !== 1 || event.ports.length !== 1) return;
  port = event.ports[0];
  let queue = Promise.resolve();
  port.onmessage = event => {
    const data = event.data;
    if (data?.session !== session || data.version !== 1 || !Number.isSafeInteger(data.id) || data.id <= lastRequest) return;
    lastRequest = data.id;
    let ticket = epoch;
    try {
      if (data.command === 'run') { prepareRun(data.payload ?? {}); ticket = ++epoch; }
      if (data.command === 'stop') { ticket = ++epoch; stop(); }
    } catch (error) { port.postMessage({session, version: 1, id: data.id, error: error.message}); return; }
    queue = queue.catch(() => {}).then(async () => {
      try { port.postMessage({session, version: 1, id: data.id, result: await handle(data.command, data.payload ?? {}, ticket)}); }
      catch (error) { port.postMessage({session, version: 1, id: data.id, error: String(error.message).slice(0, 2048)}); }
    });
  };
  port.start();
  port.postMessage({session, version: 1, ready: true});
});
window.addEventListener('pagehide', () => { ++epoch; stop(); port?.close(); });
parent.postMessage({type: 'sim-ready', session, version: 1}, config.runnerOrigin);
