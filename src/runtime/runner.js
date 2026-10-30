import {createScratchBrowserScene} from '../adapters/scratch/browser-scene.mjs';
import {validateCapabilities} from '../contracts/packs.mjs';
import {authorizeProgram, authorizeProjectOperation} from '../contracts/pack-broker.mjs';
import {prepareDeviceCompilation} from '../contracts/device-program.mjs';
import {validateDeviceScope, validateSimulatorDeviceScope, validateDeviceEvent, sameDeviceScope, sameSimulatorDeviceScope, deviceRuntimeLimits, deviceButtonMessages} from '../contracts/device-runtime.mjs';

import {createAssetProcessor} from '../import/asset-processor.mjs';
import {validateResources,createResourceView} from '../contracts/resources.mjs';
import {exportSb3Initial} from '../adapters/scratch/sb3/export.mjs';
const assetProcessor=createAssetProcessor();
const compatibilityCandidates=new Map();let compatibilityAttempt=0,projectResourceView=null;
function discardCompatibility(){compatibilityAttempt++;assetProcessor.cancel();for(const value of compatibilityCandidates.values())scene.disposePrepared(value.handle);compatibilityCandidates.clear();}
const config = await fetch('/config.json').then(response => response.json());
const sessionId = new URL(location.href).searchParams.get('session');
const canvas = document.querySelector('#stage');
let port = null;
let outputSequence = 0;
let lastInputSequence = 0;
let compiler;
let compilerReady;
let loopWorker;
let compilerRequestId = 0;
let projectRevision = 0;
let projectCapabilities = null;
let projectVariables = [];
const audioButton = document.querySelector('#play-audio');
let simulatorFrame;
let simulatorPort;
let simulatorReady;
let simulatorSequence = 0;
const simulatorPending = new Map();
const compilerPending = new Map();
let deviceWatermark = null;
let deviceSimulation = null;
let lastDeviceSequence = 0;
let deviceEventCount = 0;
let deviceWindowCount = 0;
let deviceWindowStart = 0;
let deviceFloodReported = false;
function currentDevice(scope) { return deviceWatermark?.deviceId === scope.deviceId && deviceWatermark?.deviceRevision === scope.deviceRevision && scope.sessionId === sessionId; }
function acceptDeviceScope(scope, simulation = false) {
  const candidate = simulation ? validateSimulatorDeviceScope(scope) : validateDeviceScope(scope);
  if (candidate.sessionId !== sessionId || (deviceWatermark && (candidate.deviceId !== deviceWatermark.deviceId || candidate.deviceRevision < deviceWatermark.deviceRevision))) throw new Error('Stale device session or revision');
  if (!deviceWatermark || candidate.deviceRevision > deviceWatermark.deviceRevision) deviceSimulation = null;
  deviceWatermark = {deviceId:candidate.deviceId,deviceRevision:candidate.deviceRevision};
  return candidate;
}
function deviceInput(raw) {
  let data; try { data = validateDeviceEvent(raw); } catch { return; }
  const scope = deviceSimulation;
  if (!scope || !currentDevice(scope) || !sameSimulatorDeviceScope(data.deviceScope,scope) || scope.sceneRevision !== projectRevision || data.seq <= lastDeviceSequence) return;
  lastDeviceSequence = data.seq;
  const now = performance.now();
  if (now-deviceWindowStart >= 1000) { deviceWindowStart=now;deviceWindowCount=0; }
  if (++deviceWindowCount > deviceRuntimeLimits.eventsPerSecond || ++deviceEventCount > deviceRuntimeLimits.eventsPerRun) {
    if (!deviceFloodReported) { deviceFloodReported=true;diagnostic('warning','DEVICE_EVENT_LIMIT','Se limitaron eventos del dispositivo.',undefined,scope.sceneRevision); } return;
  }
  const method='events.emit', args=[deviceButtonMessages[data.event.button]];
  try {
    const authorized=authorizeProjectOperation(projectCapabilities,method,args,{variables:projectVariables});
    Promise.resolve(scene.handle('gg-call',{...authorized,revision:scope.sceneRevision})).catch(error=>diagnostic('error','DEVICE_BRIDGE_FAILED',error.message,undefined,scope.sceneRevision));
    send({type:'device-input',deviceScope:scope,button:data.event.button,count:deviceEventCount});
  } catch (error) { diagnostic('error','DEVICE_BRIDGE_FAILED',error.message,undefined,scope.sceneRevision); }
}
const violations = [];
document.addEventListener('securitypolicyviolation', event => violations.push({directive: event.effectiveDirective, blocked: event.blockedURI}));

function diagnostic(level, code, message, sourceBlockId, revision = projectRevision) {
  send({type: 'diagnostic', revision, diagnostic: {level, code, origin: 'runner', message: String(message).slice(0, 1024), ...(sourceBlockId ? {sourceBlockId} : {})}});
}

function send(message) { port?.postMessage({protocolVersion: 1, sessionId, seq: outputSequence++, ...message}); }

const scene = createScratchBrowserScene({
  canvas, audioButton, getRevision: () => projectRevision, advanceRevision: () => ++projectRevision,
  onMove: x => send({type: 'scene-state', x}),
  onDiagnostic: diagnostic,
  onTextInvocation: invocation => send({type: 'text-invocation', ...invocation}),
  onTextCancel: cancellation => send({type: 'text-cancel', ...cancellation}),
  onError: error => send({type: 'error', requestId: 0, error})
});

function prepareSimulator(combined = null) {
  if(!simulatorReady&&combined===null)combined=false;
  if(combined!==null){document.body.classList.toggle('combined',combined);scene.setPresentation({combined});}
  if (simulatorReady) return simulatorReady;
  simulatorReady = new Promise((resolve, reject) => {
    simulatorFrame = document.createElement('iframe');
    simulatorFrame.title = 'Simulador micro:bit';
    simulatorFrame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    simulatorFrame.src = `${config.simulatorOrigin}${config.releaseBase ?? '/'}?session=${sessionId}`;
    const timer = setTimeout(() => { window.removeEventListener('message', connect); reject(new Error('Simulator bootstrap timeout')); }, 15000);
    function connect(event) {
      const data = event.data;
      if (event.origin !== config.simulatorOrigin || event.source !== simulatorFrame.contentWindow || data?.type !== 'sim-ready' || data.session !== sessionId || data.version !== 1) return;
      window.removeEventListener('message', connect);
      const channel = new MessageChannel();
      simulatorPort = channel.port1;
      simulatorPort.onmessage = event => {
        const data = event.data;
        if (data?.session !== sessionId || data.version !== 1) return;
        if(data.type==='device-event'){deviceInput(data);return;}
        if (data.ready === true) { clearTimeout(timer); resolve({ready: true}); return; }
        const pending = simulatorPending.get(data.id);
        if (!pending) return;
        simulatorPending.delete(data.id);
        clearTimeout(pending.timer);
        if (data.error) pending.reject(new Error(data.error)); else pending.resolve(data.result);
      };
      simulatorPort.start();
      simulatorFrame.contentWindow.postMessage({type: 'sim-connect', version: 1, session: sessionId}, config.simulatorOrigin, [channel.port2]);
    }
    window.addEventListener('message', connect);
    document.body.appendChild(simulatorFrame);
  });
  return simulatorReady;
}

async function simulatorCall(command, payload = {}, combined = null) {
  await prepareSimulator(combined);
  if(payload.deviceScope&&!currentDevice(payload.deviceScope))throw new Error('Device revision replaced');
  const id = ++simulatorSequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { simulatorPending.delete(id); reject(new Error('Simulator request timeout')); }, 15000);
    simulatorPending.set(id, {resolve, reject, timer});
    simulatorPort.postMessage({version: 1, session: sessionId, id, command, payload});
  });
}

function prepareCompiler() {
  if (compilerReady) return compilerReady;
  compilerReady = new Promise((resolve, reject) => {
    compiler = new Worker('/compiler-worker.js');
    compiler.onerror = event => reject(new Error(event.message));
    compiler.onmessage = event => {
      const message = event.data;
      if (message.type === 'ready') { resolve({ready: true, origin: message.origin, worker: true}); return; }
      const pending = compilerPending.get(message.id);
      if (!pending) return;
      compilerPending.delete(message.id);
      if (pending.deviceScope && !sameDeviceScope(message.deviceScope,pending.deviceScope)) { pending.reject(new Error('Compiler device scope mismatch')); return; }
      if (message.type === 'error') pending.reject(new Error(message.error));
      else pending.resolve(message.result);
    };
  });
  return compilerReady;
}

async function compilerCall(command, payload = {}) {
  await prepareCompiler();
  const id = ++compilerRequestId;
  return new Promise((resolve, reject) => {
    compilerPending.set(id, {resolve, reject, deviceScope:payload.deviceScope});
    compiler.postMessage({id, command, ...payload});
  });
}

async function handle(command, payload) {
  if (scene.loading && command !== 'shutdown') throw new Error('GG scene loading');
  switch (command) {
    case 'load-program': {
      const capabilities = payload.capabilities == null ? null : validateCapabilities(payload.capabilities);
      const resources=payload.resources?.version===1?await validateResources(payload.resources):null;
      const resourceView=resources?createResourceView(resources):null;
      // gg.sprites 0.3.0 scenes run IR 2D v1: the boundary opts in explicitly only
      // for a profile with objects, and the scene receives those validated objects
      // (never a payload field). Earlier profiles stay IR0-only.
      const spritesConfig = capabilities?.config?.['gg.sprites'];
      const objects = spritesConfig && Object.hasOwn(spritesConfig, 'sprites') ? spritesConfig : null;
      const ir = authorizeProgram(capabilities, payload.ir,{resourceView,objects:objects!==null});
      discardCompatibility();
      const result = await scene.handle(command, {...payload, ir, objects: ir.version === 1 ? structuredClone(objects) : null});
      projectCapabilities = capabilities;projectResourceView=resourceView; projectVariables = structuredClone(ir.variables ?? []);
      return result;
    }
    case 'gg-call': {
      const authorized = authorizeProjectOperation(projectCapabilities, payload.method, payload.args, {variables: projectVariables,resourceView:projectResourceView});
      const result = await scene.handle(command, {...payload, ...authorized});
      if (payload.method === 'program.start') projectVariables = structuredClone(authorized.args[0].variables);
      return result;
    }
    case 'export-sb3': return exportSb3Initial({ir:payload.ir,resources:await validateResources(payload.resources)});
    case 'prepare-compatibility': {
      if(payload.revision!==projectRevision)throw new Error('Program revision replaced');
      const capabilities=validateCapabilities(payload.capabilities),sourceAssetId=capabilities?.config['gg.sb3']?.sourceAssetId;
      if(!sourceAssetId||sourceAssetId!==payload.sourceAssetId)throw new Error('Scratch capability unavailable');
      discardCompatibility();const attempt=compatibilityAttempt,revision=projectRevision;
      const resources=await validateResources(payload.resources);
      const derived=await assetProcessor.process('derive-sb3',{sourceAssetId,resources});
      if(attempt!==compatibilityAttempt||revision!==projectRevision)throw new Error('Program revision replaced');
      if(derived.report.status==='unsupported'||!derived.report.candidate)throw new Error('Scratch execution blocked by coverage');
      const handle=await scene.prepareCompatibility({candidate:derived.report.candidate,resources});
      if(attempt!==compatibilityAttempt||revision!==projectRevision){scene.disposePrepared(handle);throw new Error('Program revision replaced');}
      const id=crypto.randomUUID();compatibilityCandidates.set(id,{handle,revision,capabilities,resources});
      return {id,revision,status:derived.report.status};
    }
    case 'commit-compatibility': {
      const candidate=compatibilityCandidates.get(payload.id);
      if(!candidate||candidate.revision!==projectRevision||payload.revision!==projectRevision)throw new Error('Program revision replaced');
      compatibilityCandidates.delete(payload.id);const result=scene.commitPrepared(candidate.handle);
      projectCapabilities=candidate.capabilities;projectVariables=[];projectResourceView=createResourceView(candidate.resources);return result;
    }
    case 'discard-compatibility': {const candidate=compatibilityCandidates.get(payload.id);if(candidate){scene.disposePrepared(candidate.handle);compatibilityCandidates.delete(payload.id);}return {discarded:Boolean(candidate)};}
    case 'start-compatibility': return scene.handle(command,payload);
    case 'load-corpus': {
      discardCompatibility();projectResourceView=null;
      const result = await scene.handle(command, payload);
      projectCapabilities = null; projectVariables = scene.declarations();
      return result;
    }
    case 'measure-performance': case 'snapshot': case 'start-corpus': case 'stop-scene': case 'text-invocation-result':
      return scene.handle(command, payload);
    case 'shutdown': {
      discardCompatibility();assetProcessor.dispose();deviceSimulation=null;deviceWatermark=null;
      // Keep cooperative shutdown order: stop VM, terminate workers, close audio.
      return scene.shutdown(() => { loopWorker?.terminate(); compiler?.terminate(); });
    }
    case 'invalidate-device': {
      const scope=acceptDeviceScope(payload.deviceScope);
      deviceSimulation=null;
      return {deviceScope:scope,invalidated:true};
    }
    case 'compile-device': case 'prepare-device': case 'simulate-device': {
      const simulation=command==='simulate-device';
      const scope=simulation?validateSimulatorDeviceScope(payload.deviceScope):validateDeviceScope(payload.deviceScope);
      const capabilities=validateCapabilities(payload.capabilities);
      const device=capabilities?.config['gg.microbit'];
      if (!device || device.deviceId!==scope.deviceId) throw new Error('Device capability unavailable');
      const prepared=prepareDeviceCompilation({config:device,deviceSource:payload.deviceSource});
      if (simulation && scope.sceneRevision!==projectRevision) throw new Error('Stale device scene revision');
      acceptDeviceScope(scope,simulation);
      // Re-derive in the target boundary. A host listing is never executable authority.
      const baseScope=validateDeviceScope({sessionId:scope.sessionId,deviceId:scope.deviceId,deviceRevision:scope.deviceRevision,requestId:scope.requestId});
      let compiled;
      try{compiled=await compilerCall('compile',{source:prepared.source,native:command==='compile-device',deviceScope:baseScope});}
      catch(error){if(!currentDevice(scope))throw new Error('Device revision replaced');throw error;}
      if (!currentDevice(scope)) throw new Error('Device revision replaced');
      const result={...compiled,deviceScope:scope,sourceMap:prepared.sourceMap};
      if (!simulation || !compiled.success) return result;
      if (scope.sceneRevision!==projectRevision) throw new Error('Device scene revision replaced');
      deviceSimulation=payload.combined===true?scope:null;
      lastDeviceSequence=0;deviceEventCount=0;deviceWindowCount=0;deviceWindowStart=performance.now();deviceFloodReported=false;
      const code=compiled.outfiles['binary.js'];
      const state=await simulatorCall('run',{code,deviceScope:scope},payload.combined===true);
      if(!currentDevice(scope)||scope.sceneRevision!==projectRevision)throw new Error('Device revision replaced');
      return {success:true,deviceScope:scope,sourceMap:prepared.sourceMap,state,compilerPackHash:compiled.compilerPackHash,physicalBoardValidated:false};
    }
    case 'simulate': {
      deviceSimulation=null;
      if (typeof payload.source !== 'string' || payload.source.length > 16384) throw new Error('Invalid simulation source');
      const compiled = await compilerCall('compile', {source: payload.source, native: false});
      if (!compiled.success) return {success: false, diagnostics: compiled.diagnostics};
      const code = compiled.outfiles['binary.js'];
      const compileHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code))), byte => byte.toString(16).padStart(2, '0')).join('');
      const state = await simulatorCall('run', {code}, false);
      return {success: true, compileHash, state, physicalBoardValidated: false};
    }
    case 'simulator-snapshot': return simulatorCall('snapshot');
    case 'simulator-stop': return simulatorCall('stop');
    case 'run': return scene.handle(command, payload);
    case 'prepare-compiler': return prepareCompiler();
    case 'compile': {
      if (typeof payload.source !== 'string' || payload.source.length > 16384 || typeof payload.native !== 'boolean') throw new Error('Invalid compile request');
      return compilerCall('compile', payload);
    }
    case 'start-loop-worker': {
      if (loopWorker) throw new Error('Loop worker already running');
      return new Promise((resolve, reject) => {
        loopWorker = new Worker('/loop-worker.js');
        loopWorker.onerror = event => reject(new Error(event.message));
        loopWorker.onmessage = () => resolve({started: true});
      });
    }
    case 'isolation-probe': {
      const result = {};
      for (const [name, read] of [['dom', () => parent.document.body.innerHTML], ['storage', () => parent.localStorage.getItem('private-marker')]]) {
        try { result[name] = {blocked: false, value: read()}; } catch (error) { result[name] = {blocked: true, error: error.name}; }
      }
      return result;
    }
    case 'network-probe': {
      let blocked = false;
      try { await fetch(`${config.shellOrigin}/private-sentinel`); } catch { blocked = true; }
      const worker = await compilerCall('network-probe');
      return {blocked, worker, violations};
    }
    default: throw new Error('Unknown runner command');
  }
}

window.addEventListener('message', async event => {
  const message = event.data;
  if (port || event.origin !== config.shellOrigin || event.source !== parent || message?.type !== 'connect' || message.protocolVersion !== 1 || message.sessionId !== sessionId || event.ports.length !== 1) return;
  port = event.ports[0];
  port.onmessage = async event => {
    const data = event.data;
    if (data?.protocolVersion !== 1 || data.sessionId !== sessionId || !Number.isSafeInteger(data.seq) || data.seq <= lastInputSequence || data.requestId !== data.seq) return;
    lastInputSequence = data.seq;
    const requestRevision = projectRevision;
    try { send({type: 'result', requestId: data.requestId, result: await handle(data.command, data.payload ?? {})}); }
    catch (error) {
      const staleDevice=data.command?.includes('device') && ((!currentDevice(data.payload?.deviceScope??{})) || /(?:Stale device|Device (?:revision|scene revision) replaced)/.test(error.message??''));
      // Legacy compile errors are reported by its source-attempt owner in Studio.
      // A scene revision cannot identify a subsequently edited device source.
      if(!staleDevice && data.command !== 'compile')diagnostic('error', 'RUNNER_COMMAND_FAILED', error instanceof Error ? error.message : String(error), undefined, requestRevision);
      send({type: 'error', requestId: data.requestId, error: error instanceof Error ? error.message : String(error)});
    }
  };
  port.start();
  try { await scene.setup(); projectVariables = scene.declarations(); send({type: 'ready', snapshot: scene.snapshot()}); }
  catch (error) { send({type: 'error', requestId: 0, error: error.message}); }
});
parent.postMessage({type: 'runner-ready', protocolVersion: 1, sessionId}, config.shellOrigin);
