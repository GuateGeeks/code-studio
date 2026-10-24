importScripts('/vendor/typescript.js', '/vendor/pxtworker.js');
// PXT normally evals compilerExtension from target.json. Load the pinned target
// hook as a static script instead; keep eval forbidden by the worker CSP.
pxtc.compilerHooks = {};
importScripts('/vendor/microbit-compiler.js');
importScripts('/vendor/lzma.js');
// The legacy PXT environment heuristic treats a worker without window as Node.
// Provide the real browser LZMA codec for source embedding, not a require shim.
pxt.lzmaCompressAsync = text => new Promise((resolve, reject) => {
  LZMA.compress(text, 7, (bytes, error) => error ? reject(error) : resolve(new Uint8Array(bytes)));
});
const packPromise = fetch('/compiler-pack.json').then(async response => {
  if (!response.ok) throw new Error('Compiler pack unavailable');
  const bytes = await response.arrayBuffer();
  const compilerPackHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  return {...JSON.parse(new TextDecoder().decode(bytes)), compilerPackHash};
});
let queue = Promise.resolve();
let pending = 0;
const networkAttempts = [];
const policyViolations = [];
self.addEventListener('securitypolicyviolation', event => {
  if (policyViolations.length < 32) policyViolations.push({directive: event.effectiveDirective, blocked: String(event.blockedURI).slice(0, 256)});
});
pxt.debug = () => {};

// This is a classic importScripts worker. Keep this closed DTO equivalent to
// contracts/device-runtime.mjs; ESM imports would change the pinned PXT loader.
function deviceScope(value) {
  const keys = ['sessionId', 'deviceId', 'deviceRevision', 'requestId'];
  const id = (value, max) => typeof value === 'string' && value.length <= max &&
    /^[a-zA-Z0-9._:-]+$/.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key)) ||
      !id(value.sessionId, 128) || !id(value.deviceId, 64) ||
      !Number.isSafeInteger(value.deviceRevision) || value.deviceRevision < 0 ||
      !Number.isSafeInteger(value.requestId) || value.requestId < 1) throw new Error('Invalid compiler device scope');
  return {...value};
}
function diagnostic(item) {
  const result = {code: Number.isSafeInteger(item.code) ? item.code : 0,
    fileName: typeof item.fileName === 'string' ? item.fileName.slice(0, 256) : '',
    messageText: typeof item.messageText === 'string' ? item.messageText.slice(0, 2048) : 'Error del compilador PXT'};
  // PXT locations are zero based and refer to UTF-16 source offsets.
  for (const key of ['start', 'length', 'line', 'column']) {
    if (Number.isSafeInteger(item[key]) && item[key] >= 0 && item[key] <= 1_000_000) result[key] = item[key];
  }
  return result;
}
async function compile(source, native) {
  const pack = await packPromise;
  const hexRequests = [];
  pxt.setAppTarget(structuredClone(pack.target));
  pxt.webConfig = {...pxt.webConfig, isStatic: true, relprefix: ''};
  pxt.Cloud.downloadTargetConfigAsync = async () => pack.targetConfig;
  pxt.setupSimpleCompile({
    cacheGet: async () => '', cacheSet: async () => {},
    httpRequestAsync: async options => {
      if (networkAttempts.length < 32) networkAttempts.push(String(options.url).slice(0, 512));
      throw new Error('External HTTP blocked');
    },
    pkgOverrideAsync: async id => {
      const files = pxt.appTarget.bundledpkgs[id];
      if (!files) throw new Error(`Local package unavailable: ${id}`);
      return files;
    }
  });
  const files = {
    'pxt.json': JSON.stringify({name: 'gg-browser-heart', dependencies: {core: '*', radio: '*', microphone: '*'}, files: ['main.ts'], preferredEditor: 'tsprj', targetVersions: {...pxt.appTarget.versions, targetId: pxt.appTarget.id}}),
    'main.ts': source
  };
  class LocalHost extends pxt.SimpleHost {
    async getHexInfoAsync(info) {
      if (!/^[a-f0-9]{64}$/.test(info.sha)) throw new Error('Invalid native runtime hash');
      const hex = pack.hexCache[info.sha];
      hexRequests.push({sha: info.sha, variant: info.appVariant, available: Boolean(hex)});
      if (!hex) throw new Error(`Missing native runtime: ${info.sha}`);
      return {hex};
    }
  }
  const mainPackage = new pxt.MainPackage(new LocalHost(files));
  await mainPackage.loadAsync();
  const target = mainPackage.getTargetOptions();
  if (target.hasHex) target.isNative = native;
  const options = await mainPackage.getCompileOptionsAsync(target);
  pxt.patchTS(mainPackage.targetVersion(), options);
  const result = pxtc.compile(options);
  return {
    success: result.success, compilerPackHash: pack.compilerPackHash,
    diagnostics: result.diagnostics.slice(0, 128).map(diagnostic),
    outfiles: result.outfiles, hexRequests, networkAttempts: [...networkAttempts],
    environment: {worker: typeof document === 'undefined' && self instanceof WorkerGlobalScope, origin: location.origin},
    physicalBoardValidated: false
  };
}

self.onmessage = event => {
  const {id, command, source, native} = event.data ?? {};
  let scope;
  try {
    if (event.data?.deviceScope !== undefined) {
      scope = deviceScope(event.data.deviceScope);
      if (command !== 'compile') throw new Error('Invalid scoped compiler command');
    }
    if (!Number.isSafeInteger(id) || id < 1 || pending >= 32) throw new Error('Invalid or busy compiler request');
    if (command === 'compile' && (typeof source !== 'string' ||
        new TextEncoder().encode(source).length > 16384 || typeof native !== 'boolean')) throw new Error('Invalid compiler worker request');
  } catch (error) {
    self.postMessage({type: 'error', id, error: error.message, ...(scope ? {deviceScope: scope} : {})});
    return;
  }
  pending++;
  queue = queue.catch(() => {}).then(async () => {
    try {
      let result;
      if (command === 'compile') result = await compile(source, native);
      else if (command === 'network-probe') {
        let blocked = false;
        try { await fetch('https://example.invalid/blocked-worker-probe'); } catch { blocked = true; }
        await new Promise(resolve => setTimeout(resolve, 0));
        result = {blocked, violations: [...policyViolations]};
      } else throw new Error('Invalid compiler worker request');
      self.postMessage({type: 'result', id, result, ...(scope ? {deviceScope: scope} : {})});
    } catch (error) { self.postMessage({type: 'error', id, error: String(error.message).slice(0, 2048), ...(scope ? {deviceScope: scope} : {})}); }
    finally { pending--; }
  });
};
packPromise.then(() => self.postMessage({type: 'ready', origin: location.origin})).catch(error => { throw error; });
