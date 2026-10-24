import {requestOfflineAgent, requestOfflineWorker} from './client.mjs';
import {releaseBase, installedOfflineRoles, validateDescriptor, installedOfflinePackIds} from './contracts.mjs';
const baseMatch = /^\/releases\/([a-f0-9]{64})\//.exec(location.pathname);
if (!baseMatch) throw new Error('Versioned offline agent required');
const cohort = baseMatch[1];
const config = await fetch(releaseBase(cohort) + 'config.json').then(response => { if (!response.ok) throw new Error('Offline config missing'); return response.json(); });
const role = installedOfflineRoles.find(role => config[role + 'Origin'] === location.origin);
const query = new URL(location.href).searchParams, nonce = query.get('nonce'), parentRole = query.get('parentRole');
if (!role || role === 'shell' || !/^[a-f0-9-]{36}$/.test(nonce ?? '') ||
    parentRole !== (role === 'simulator' ? 'runner' : 'shell')) throw new Error('Invalid offline parent');
let port, started = false, operation;
window.addEventListener('message', event => {
  const message = event.data;
  if (port || event.source !== parent || event.origin !== config[parentRole + 'Origin'] || event.ports.length !== 1 ||
      message?.type !== 'offline-agent-connect' || message.protocolVersion !== 1 || message.nonce !== nonce || message.role !== role) return;
  port = event.ports[0];
  port.onmessage = async event => {
    const data = event.data;
    if (data?.type === 'cancel' && operation?.id === data.operationId) { operation.controller.abort(); return; }
    if (started || data?.type !== 'request' || !['prepare', 'preflight'].includes(data.command)) return;
    try {
      validateDescriptor({cohort: data.cohort, manifestHash: data.manifestHash});
      if (data.cohort !== cohort || typeof data.operationId !== 'string' || data.operationId.length > 80 ||
          !Array.isArray(data.packs) || !data.packs.length || data.packs.length > installedOfflinePackIds.length) throw new Error('Invalid offline request');
      started = true;
      operation = {id: data.operationId, controller: new AbortController()};
      const options = {window, signal: operation.controller.signal, operationId: operation.id,
        onProgress: progress => { if (!operation.controller.signal.aborted) port.postMessage({type: 'progress', operationId: operation.id, progress}); }};
      const local = requestOfflineWorker(data.command, {operationId: operation.id, cohort, manifestHash: data.manifestHash, packs: data.packs}, options);
      let receipts;
      if (role === 'runner') {
        const selection = {cohort, manifestHash: data.manifestHash, releaseBase: releaseBase(cohort), origins: config, packs: data.packs};
        const [runner, simulator] = await Promise.all([local, requestOfflineAgent('simulator', selection, data.command, {...options, parentRole: 'runner'})]);
        receipts = {runner, ...simulator};
      } else receipts = {[role]: await local};
      if (!operation.controller.signal.aborted) port.postMessage({type: 'result', operationId: operation.id, receipts});
    } catch (error) {
      if (!operation?.controller.signal.aborted) port.postMessage({type: 'error', operationId: data?.operationId, error: String(error.message).slice(0, 1024)});
    }
  };
  port.start();
});
window.addEventListener('pagehide', () => operation?.controller.abort());
parent.postMessage({type: 'offline-agent-ready', protocolVersion: 1, nonce, role}, config[parentRole + 'Origin']);
