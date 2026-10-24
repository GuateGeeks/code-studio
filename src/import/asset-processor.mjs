// Same-origin worker controller shared by Studio and the runner. It transfers
// only bounded data, never executable user source or browser object handles.
export const assetProcessingLimits = Object.freeze({milliseconds: 10000, pending: 1, inputBytes: 2 * 1024 * 1024});
export function createAssetProcessor({Worker: WorkerClass = globalThis.Worker,
  workerURL = new URL('../targets/assets/asset-worker.mjs', import.meta.url), milliseconds = assetProcessingLimits.milliseconds} = {}) {
  if (typeof WorkerClass !== 'function' || !Number.isSafeInteger(milliseconds) || milliseconds < 1 || milliseconds > 30000) throw new TypeError('Procesador de recursos no disponible');
  let active = null, sequence = 0, disposed = false;
  const cancelError = () => new DOMException('Procesamiento cancelado', 'AbortError');
  function cancel() { active?.finish(cancelError()); }
  function boundedPayload(payload) {
    let bytes = 0, nodes = 0;
    const seen = new Set(), encoder = new TextEncoder();
    function visit(value, depth = 0) {
      if (++nodes > 8192 || depth > 32) throw new Error('Estructura de recursos demasiado grande');
      if (typeof value === 'string') bytes += encoder.encode(value).byteLength;
      else if (value instanceof Uint8Array || value instanceof ArrayBuffer) bytes += value.byteLength;
      else if (value === null || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) bytes += 8;
      else if (value && typeof value === 'object' && (Array.isArray(value) || [Object.prototype,null].includes(Object.getPrototypeOf(value)))) {
        if (seen.has(value)) throw new Error('Los recursos deben ser datos sin ciclos');
        seen.add(value);
        if (Array.isArray(value) && (Object.keys(value).length !== value.length || value.some((_,index)=>!Object.hasOwn(value,index)))) throw new Error('Lista de recursos inválida');
        for (const key of Object.keys(value)) {
          if (['__proto__','prototype','constructor'].includes(key)) throw new Error('Clave de recursos inválida');
          bytes += encoder.encode(key).byteLength; visit(value[key],depth+1);
        }
        seen.delete(value);
      } else throw new Error('Se requieren datos portables de recursos');
      if (bytes > assetProcessingLimits.inputBytes) throw new Error('La preparación excede el límite de datos');
    }
    visit(payload);
  }
  function process(command, payload, {signal} = {}) {
    if (disposed) return Promise.reject(new Error('Procesador cerrado'));
    if (signal?.aborted) return Promise.reject(cancelError());
    if (!['import-sb3','validate-resources','derive-sb3','prepare-media','crop-png','edit-wav'].includes(command)) return Promise.reject(new Error('Operación de recursos no soportada'));
    try { boundedPayload(payload); } catch(error) { return Promise.reject(error); }
    cancel();
    const id = ++sequence;
    return new Promise((resolve,reject) => {
      let worker, timer, finished = false;
      const aborted = () => finish(cancelError());
      function finish(error, result) {
        if (finished) return;
        finished = true; clearTimeout(timer); signal?.removeEventListener('abort',aborted);
        worker?.terminate(); if (active?.id === id) active = null;
        if (error) reject(error); else resolve(result);
      }
      active = {id,finish};
      signal?.addEventListener('abort',aborted,{once:true});
      timer = setTimeout(() => finish(new Error('El procesamiento de recursos excedió su tiempo. Tu proyecto se conserva.')), milliseconds);
      try {
        worker = new WorkerClass(workerURL,{type:'module',name:'gg-assets'});
        worker.onerror = event => { event.preventDefault?.(); finish(new Error(String(event.message || 'No se pudo preparar el procesador local').slice(0,1024))); };
        worker.onmessage = event => {
          const data = event.data;
          if (finished || !data || data.id !== id || data.version !== 1 ||
              Object.keys(data).some(key => !['version','id','result','error'].includes(key))) return;
          if (typeof data.error === 'string') finish(new Error(data.error.slice(0,1024)));
          else if (Object.hasOwn(data,'result')) finish(null,data.result);
        };
        worker.postMessage({version:1,id,command,payload});
      } catch(error) { finish(error); }
    });
  }
  return Object.freeze({process,cancel,dispose(){disposed=true;cancel();},state:()=>({pending:active?1:0,sequence,disposed})});
}
