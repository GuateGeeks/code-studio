import {parse} from 'acorn';
import {createTextProgramSession,createCapabilityProgramSession, contextOperations, variableReference} from './program-session.mjs';
import {newQuickJSWASMModuleFromVariant, newVariant} from 'quickjs-emscripten-core';
import RELEASE_SYNC from '@jitl/quickjs-wasmfile-release-sync';
import {resolveLanguageProfile} from '../../contracts/capability-language.mjs';
import {compileApi3JavaScript} from './api-v3.mjs';
import {compileApi3Capability} from './api-v3-capability.mjs';
import {languageRuntimeLimits, validateLanguageDocument, validateLanguageRPC, validateLanguageWait} from '../../contracts/language-runtime.mjs';

// Acorn is syntax-only. The pinned QuickJS C wrapper mishandles module
// compileOnly results, so no student code enters the interpreter in preflight.
export function validateJavaScriptSource(document) {
  const candidate = validateLanguageDocument(document);
  if (candidate.language !== 'javascript') throw new Error('Documento JavaScript requerido.');
  let ast;
  try { ast = parse(candidate.source, {ecmaVersion: 2022, sourceType: 'module', locations: true}); }
  catch (error) {
    throw Object.assign(new Error(error.message), {lineNumber: error.loc?.line, columnNumber: error.loc ? error.loc.column + 1 : undefined});
  }
  const nodes = [ast];
  while (nodes.length) {
    const node = nodes.pop();
    if (!node || typeof node !== 'object') continue;
    if (node.type === 'ImportDeclaration' || node.type === 'ImportExpression' ||
        (['ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) ||
        (node.type === 'MetaProperty' && node.meta?.name === 'import')) {
      throw Object.assign(new Error('Los imports e import.meta no están disponibles en este subconjunto.'),
        {lineNumber: node.loc.start.line, columnNumber: node.loc.start.column + 1});
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) nodes.push(...value);
      else if (value && typeof value === 'object') nodes.push(value);
    }
  }
  return candidate;
}
export async function createQuickJSEngine(options = {}) {
  let instance = null;
  let closed = false;
  return Object.freeze({
    async prepare(document) {
      if (closed) throw new Error('Session stopped');
      const candidate = validateJavaScriptSource(document);
      if (!instance) {
        instance = await initializeQuickJSEngine(options);
        if (closed) { instance.dispose(); throw new Error('Session stopped'); }
      }
      return instance.prepare(candidate);
    },
    execute: () => instance && !closed ? instance.execute() : Promise.reject(new Error('El documento no está preparado.')),
    invoke: data => instance && !closed ? instance.invoke(data) : Promise.reject(new Error('Session stopped')),
    cancelInvocation: id => instance?.cancelInvocation(id),
    dispose() { closed = true; instance?.dispose(); }
  });
}

async function initializeQuickJSEngine({rpc, onDiagnostic, onProgramReady = () => {}, profile = null, wasmLocation = '/vendor/quickjs/emscripten-module.wasm'} = {}) {
  profile=profile===null?null:resolveLanguageProfile(profile);
  const QuickJS = await newQuickJSWASMModuleFromVariant(newVariant(RELEASE_SYNC, {wasmLocation}));
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(languageRuntimeLimits.memoryBytes);
  runtime.setMaxStackSize(languageRuntimeLimits.stackBytes);
  runtime.setModuleLoader(() => { throw new Error('Los módulos externos no están disponibles.'); });
  let deadline = 0;
  runtime.setInterruptHandler(() => Date.now() > deadline);
  const vm = runtime.newContext();
  let alive = true;
  let prepared = null;
  let finishExecution = null;
  let pumpTimer = null;
  const deferreds = new Set();
  const timers = new Map();
  const invocations = new Map();
  const program = createTextProgramSession({rpc, onReady: onProgramReady,
    invoke: invokeHandler, cancel: cancelHandler, release: handle => handle.dispose()});
  const capability=profile?createCapabilityProgramSession({profile,rpc,onReady:onProgramReady,invoke:invokeHandler,cancel:cancelHandler,release:handle=>handle.dispose()}):null;
  const json = vm.getProp(vm.global, 'JSON');
  const parseJSON = vm.getProp(json, 'parse'); json.dispose();
  const turn = () => { deadline = Date.now() + languageRuntimeLimits.turnMs; };
  function errorFrom(handle) {
    turn(); // Reading an error also enters QuickJS after a deadline interrupt.
    const value = vm.dump(handle);
    return Object.assign(new Error(String(value?.message ?? value ?? 'QuickJS no pudo procesar el módulo.')), {stack: value?.stack ?? '', lineNumber: value?.lineNumber});
  }
  function valueHandle(value) {
    const string = vm.newString(JSON.stringify(value ?? null));
    try { return vm.unwrapResult(vm.callFunction(parseJSON, vm.undefined, string)); }
    finally { string.dispose(); }
  }
  function requestPromise(action) {
    if (deferreds.size >= languageRuntimeLimits.pendingRPC) return {error: vm.newError('Límite de solicitudes pendientes.')};
    const deferred = vm.newPromise();
    deferreds.add(deferred);
    Promise.resolve().then(() => { if (!alive) throw new Error('Session stopped'); return action(); }).then(value => settle(false, value), error => settle(true, error));
    function settle(failed, value) {
      if (!alive) return;
      turn();
      let handle;
      try {
        handle = failed ? vm.newError(String(value?.message ?? value ?? 'QuickJS no pudo procesar el módulo.')) : valueHandle(value);
        if (failed) deferred.reject(handle); else deferred.resolve(handle);
      } catch (error) {
        const failure = vm.newError(String(error.message));
        try { deferred.reject(failure); } finally { failure.dispose(); }
      } finally {
        handle?.dispose(); deferred.dispose(); deferreds.delete(deferred); schedulePump();
      }
    }
    return deferred.handle;
  }
  function install(parent, name, callback) {
    const fn = vm.newFunction(name, (...handles) => {
      try { return callback(handles); } catch (error) { return {error: vm.newError(String(error.message))}; }
    });
    vm.setProp(parent, name, fn); fn.dispose();
  }
  const gg = vm.newObject();
  if(!profile){
  for (const [namespace, methods] of Object.entries({scene: ['get'], sprite: ['get', 'move', 'setPosition'], variables: ['get', 'set'], events: ['emit']})) {
    const object = vm.newObject();
    for (const name of methods) install(object, name, handles => {
      const call = validateLanguageRPC(`${namespace}.${name}`, handles.map(handle => vm.dump(handle)));
      program.assertLegacyAllowed(call.method);
      return requestPromise(() => { program.assertLegacyAllowed(call.method); return rpc(call.method, call.args); });
    });
    vm.setProp(gg, namespace, object); object.dispose();
  }
  install(gg, 'wait', handles => {
    if (handles.length !== 1) throw new Error('GG.wait requiere segundos.');
    const seconds = validateLanguageWait(vm.getNumber(handles[0]));
    return requestPromise(() => new Promise((resolve, reject) => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(null); }, seconds * 1000);
      timers.set(timer, reject);
    }));
  });
  install(gg, 'ref', handles => {
    if (handles.length !== 1) throw new Error('GG.ref requiere un ID.');
    return valueHandle(variableReference(vm.getString(handles[0])));
  });
  const programObject = vm.newObject();
  install(programObject, 'configure', handles => {
    if (handles.length !== 1) throw new Error('GG.program.configure requiere configuración.');
    program.configure(vm.dump(handles[0])); return vm.undefined;
  });
  vm.setProp(gg, 'program', programObject); programObject.dispose();
  const eventsObject = vm.getProp(gg, 'events');
  for (const [name, event, option] of [['onStart','start'],['onKey','key','key'],['onClick','click','target'],['onMessage','message','message'],['onClone','clone','target']]) {
    install(eventsObject, name, handles => {
      if (handles.length !== (option ? 2 : 1) || vm.typeof(handles.at(-1)) !== 'function') throw new Error('Registro de evento no válido.');
      const options = {};
      if (option) {
        const value = vm.getString(handles[0]);
        if (option === 'target') { if (value !== 'hero') throw new Error('Sprite desconocido.'); }
        else options[option] = value;
      }
      const callback = handles.at(-1).dup();
      try { return vm.newString(program.register(event, options, callback)); }
      catch (error) { callback.dispose(); throw error; }
    });
  }
  install(eventsObject, 'run', handles => {
    if (handles.length) throw new Error('GG.events.run no recibe argumentos.');
    return requestPromise(() => program.run());
  });
  eventsObject.dispose();
  }else{
    installCapabilityOperations(gg);
    const contextObject=vm.newObject();
    install(contextObject,'configure',handles=>{if(handles.length!==1)throw new Error('GG.context.configure requiere configuración.');capability.configure(vm.dump(handles[0]));return vm.undefined;});
    install(contextObject,'when',handles=>{
      if(handles.length!==2||vm.typeof(handles[1])!=='function')throw new Error('GG.context.when requiere evento y callback.');
      const callback=handles[1].dup();try{return vm.newString(capability.register(vm.dump(handles[0]),callback));}catch(error){callback.dispose();throw error;}
    });
    install(contextObject,'activate',handles=>{if(handles.length)throw new Error('GG.context.activate no recibe argumentos.');return requestPromise(()=>capability.activate());});
    vm.setProp(gg,'context',contextObject);contextObject.dispose();
  }
  vm.setProp(vm.global, 'GG', gg); gg.dispose();
  const consoleObject = vm.newObject();
  install(consoleObject, 'log', handles => {
    const message = handles.map(handle => {
      const value = vm.dump(handle);
      return typeof value === 'string' ? value : JSON.stringify(value) ?? String(value);
    }).join(' ').slice(0, languageRuntimeLimits.message);
    onDiagnostic({level: 'info', code: 'TEXT_LOG', origin: 'javascript', message: message || '(vacío)'});
    return vm.undefined;
  });
  vm.setProp(vm.global, 'console', consoleObject); consoleObject.dispose();

  function installCapabilityOperations(parent,invocationId=null){
    const namespaces=new Map();
    for(const descriptor of profile.operations){
      const [namespace,name]=descriptor.publicPath;
      let object=namespaces.get(namespace);if(!object){object=vm.newObject();namespaces.set(namespace,object);vm.setProp(parent,namespace,object);}
      install(object,name,handles=>{
        if(handles.length!==1)throw new Error('La operación requiere un objeto de argumentos.');
        const args=vm.dump(handles[0]);
        if(invocationId===null)capability.assertGlobalAllowed(descriptor.id);
        return requestPromise(()=>invocationId===null?capability.globalCall(descriptor.id,args):capability.call(invocationId,descriptor.id,args));
      });
    }
    for(const object of namespaces.values())object.dispose();
  }
  function invokeHandler(handler, data) {
    if (!alive) return Promise.reject(new Error('Session stopped'));
    const context = vm.newObject();
    const id = profile?valueHandle(data.targetId):vm.newString(data.targetId); vm.setProp(context, 'targetId', id); id.dispose();
    if(profile){
      installCapabilityOperations(context,data.invocationId);
      install(context,'wait',handles=>{if(handles.length!==1)throw new Error('ctx.wait requiere segundos.');const seconds=vm.dump(handles[0]);return requestPromise(()=>capability.wait(data.invocationId,seconds));});
    }else for (const [name, arity] of Object.entries(contextOperations)) install(context, name, handles => {
      if (handles.length !== arity) throw new Error('Argumentos contextuales no válidos.');
      const args = handles.map(handle => vm.dump(handle));
      return requestPromise(() => program.call(data.invocationId, name, args));
    });
    return new Promise((resolve, reject) => {
      turn();
      const event=profile?valueHandle(data.event):null;
      const result = profile?vm.callFunction(handler,vm.undefined,context,event):vm.callFunction(handler, vm.undefined, context);
      event?.dispose();context.dispose();
      if (result.error) { const error = errorFrom(result.error); result.error.dispose(); reject(error); return; }
      invocations.set(data.invocationId, {handle: result.value, resolve, reject});
      schedulePump();
    });
  }
  function cancelHandler(id) {
    const invocation = invocations.get(id);
    if (!invocation) return;
    invocations.delete(id); invocation.handle.dispose(); invocation.reject(new Error('Text invocation cancelled'));
  }
  function inspectInvocation(id, invocation) {
    const state = vm.getPromiseState(invocation.handle);
    if (state.type === 'pending') return;
    invocations.delete(id);
    if (state.type === 'rejected') {
      const error = errorFrom(state.error); state.error.dispose(); invocation.handle.dispose(); invocation.reject(error);
    } else {
      if (!state.notAPromise) state.value.dispose();
      invocation.handle.dispose(); invocation.resolve();
    }
  }
  let activeResult = null;
  function schedulePump() {
    if (!alive || !finishExecution || pumpTimer !== null) return;
    pumpTimer = setTimeout(() => { pumpTimer = null; pump(); }, 0);
  }
  function pump() {
    if (!alive || !finishExecution) return;
    try {
      turn();
      const jobs = runtime.executePendingJobs(64);
      if (jobs.error) {
        const error = errorFrom(jobs.error); jobs.error.dispose(); throw error;
      }
      for (const [id, invocation] of [...invocations]) inspectInvocation(id, invocation);
      const state = vm.getPromiseState(activeResult);
      if (state.type === 'rejected') {
        const error = errorFrom(state.error); state.error.dispose(); throw error;
      }
      if (state.type === 'fulfilled') {
        if (!state.notAPromise) state.value.dispose();
        if (!deferreds.size && !runtime.hasPendingJob()) { finishExecution(null, {completed: true}); return; }
      }
      if (runtime.hasPendingJob()) schedulePump();
    } catch (error) { finishExecution(error); }
  }
  function dispose() {
    if (!alive) return;
    if (finishExecution) finishExecution(new Error('Session stopped'));
    capability?.dispose();program.dispose();
    for (const id of invocations.keys()) cancelHandler(id);
    alive = false;
    clearTimeout(pumpTimer); pumpTimer = null;
    for (const [timer, reject] of timers) { clearTimeout(timer); reject(new Error('Session stopped')); }
    timers.clear();
    for (const deferred of deferreds) deferred.dispose();
    deferreds.clear();
    parseJSON.dispose(); vm.dispose(); runtime.dispose();
  }
  return Object.freeze({
    async prepare(document) {
      if (!alive) throw new Error('Session stopped');
      const candidate = validateLanguageDocument(document);
      if (candidate.language !== 'javascript') throw new Error('Documento JavaScript requerido.');
      // API v3 documents are translated to API1 here, inside the language origin (ADR-011).
      const metadata = {variableIds: candidate.runtime.variableIds ?? {}, targetIds: candidate.runtime.targetIds ?? {}};
      prepared = candidate.runtime.api !== 'api3' ? candidate
        : {...candidate, source: (profile ? compileApi3Capability(candidate.source, {profile, ...metadata}) : compileApi3JavaScript(candidate.source, metadata)).source};
      return {prepared: true};
    },
    execute() {
      if (!alive || !prepared || finishExecution) return Promise.reject(new Error('El documento no está preparado.'));
      return new Promise((resolve, reject) => {
        finishExecution = (error, result) => {
          activeResult?.dispose(); activeResult = null; finishExecution = null;
          if (error) reject(error); else resolve(result);
        };
        turn();
        const result = vm.evalCode(prepared.source, 'document.js', {type: 'module'});
        if (result.error) { const error = errorFrom(result.error); result.error.dispose(); finishExecution(error); return; }
        activeResult = result.value;
        schedulePump();
      });
    },
    invoke: data => capability?capability.dispatch(data):program.dispatch(data),
    cancelInvocation: id => capability?capability.cancelInvocation(id):program.cancelInvocation(id),
    dispose
  });
}
