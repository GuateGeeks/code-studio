import {createTextProgramSession,createCapabilityProgramSession, contextOperations, variableReference} from './program-session.mjs';
import {resolveLanguageProfile} from '../../contracts/capability-language.mjs';
import {languageRuntimeLimits, validateLanguageDocument, validateLanguageRPC, validateLanguageWait} from '../../contracts/language-runtime.mjs';

export async function createPythonEngine({rpc, onDiagnostic, onProgramReady = () => {}, profile = null, indexURL = '/vendor/pyodide/'} = {}) {
  profile=profile===null?null:resolveLanguageProfile(profile);
  const {loadPyodide} = await import(`${indexURL}pyodide.mjs`);
  const pyodide = await loadPyodide({indexURL, packageBaseUrl: indexURL, jsglobals: Object.freeze({}), packages: []});
  let alive = true;
  let prepared = null;
  const timers = new Map();
  const invocationTasks = new Map();
  let invokePython;
  const program = createTextProgramSession({rpc, onReady: onProgramReady,
    invoke: invokeHandler,
    cancel: id => { invocationTasks.get(id)?.cancel(); },
    release: handler => handler.destroy()
  });
  const capability=profile?createCapabilityProgramSession({profile,rpc,onReady:onProgramReady,invoke:invokeHandler,cancel:id=>invocationTasks.get(id)?.cancel(),release:handler=>handler.destroy()}):null;
  async function invokeHandler(handler,data){
    const context={targetId:data.targetId};
    if(profile){
      Object.assign(context,capabilityOperations(data.invocationId));
      context.wait=seconds=>capability.wait(data.invocationId,plainCapability(seconds));
    }else for(const [name,arity]of Object.entries(contextOperations))context[name]=async(...values)=>{
      if(values.length!==arity)throw new Error('Argumentos contextuales no válidos.');
      return program.call(data.invocationId,name,values.map(plain));
    };
    const event=profile?pyodide.toPy(data.event):null;
    const task=profile?invokePython(handler,Object.freeze(context),event):invokePython(handler,Object.freeze(context));
    const retained=task.copy();invocationTasks.set(data.invocationId,retained);
    try{const result=await task;result?.destroy?.();}
    finally{invocationTasks.delete(data.invocationId);retained.destroy();event?.destroy?.();}
  }
  function capabilityOperations(invocationId=null){
    const result={};
    for(const descriptor of profile.operations){
      const [namespace,name]=descriptor.publicPath;result[namespace]??={};
      result[namespace][name]=(...values)=>{
        if(values.length!==1)throw new Error('La operación requiere un objeto de argumentos.');
        const args=plainCapability(values[0]);
        return invocationId===null?capability.globalCall(descriptor.id,args):capability.call(invocationId,descriptor.id,args);
      };
    }
    for(const namespace of Object.values(result))Object.freeze(namespace);
    return result;
  }
  pyodide.setStdin({error: true});
  const log = (level, output) => onDiagnostic({level, code: level === 'error' ? 'TEXT_STDERR' : 'TEXT_LOG',
    origin: 'python', message: String(output).slice(0, languageRuntimeLimits.message) || '(vacío)'});
  pyodide.setStdout({batched: output => log('info', output)});
  pyodide.setStderr({batched: output => log('error', output)});
  function plain(value) {
    if (value && typeof value.toJs === 'function') {
      try { return value.toJs({dict_converter: entries => Object.fromEntries(entries), create_proxies: false}); }
      finally { value.destroy(); }
    }
    return value;
  }
  function plainCapability(value){
    // Incoming Python arguments are borrowed by the FFI call. Destroy only an
    // owned copy: the bridge still needs the original when wrapping awaitables.
    const owned=value&&typeof value.copy==='function'?value.copy():value;
    const converted=plain(owned);
    function json(item){if(item===undefined)return null;if(item===null||typeof item!=='object')return item;if(Array.isArray(item))return item.map(json);return Object.fromEntries(Object.entries(item).map(([key,child])=>[key,json(child)]));}
    return json(converted);
  }
  const gg = {};
  if(!profile){
  for (const [namespace, methods] of Object.entries({scene: ['get'], sprite: ['get', 'move', 'setPosition'], variables: ['get', 'set'], events: ['emit']})) {
    gg[namespace] = {};
    for (const name of methods) gg[namespace][name] = async (...values) => {
      if (!alive) throw new Error('Session stopped');
      const call = validateLanguageRPC(`${namespace}.${name}`, values.map(plain));
      program.assertLegacyAllowed(call.method);
      return rpc(call.method, call.args);
    };
    Object.freeze(gg[namespace]);
  }
  gg.wait = seconds => {
    validateLanguageWait(seconds);
    if (!alive) return Promise.reject(new Error('Session stopped'));
    if (timers.size >= languageRuntimeLimits.pendingRPC) return Promise.reject(new Error('Límite de esperas pendientes.'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(null); }, seconds * 1000);
      timers.set(timer, reject);
    });
  };
  gg.ref = id => variableReference(id);
  gg.program = Object.freeze({configure: config => program.configure(plain(config))});
  const registrations = {onStart: ['start'], onKey: ['key', 'key'], onClick: ['click', 'target'], onMessage: ['message', 'message'], onClone: ['clone', 'target']};
  // Extend the previously frozen legacy namespace through a fresh owned object.
  gg.events = {...gg.events};
  for (const [name, [event, option]] of Object.entries(registrations)) gg.events[name] = (...values) => {
    if (values.length !== (option ? 2 : 1)) throw new Error('Registro de evento no válido.');
    const handler = values.at(-1);
    if (typeof handler !== 'function' || typeof handler.copy !== 'function') throw new Error('Se requiere un callback Python.');
    const options = {};
    if (option === 'target') { if (values[0] !== 'hero') throw new Error('Sprite desconocido.'); }
    else if (option) options[option] = values[0];
    const retained = handler.copy();
    try { return program.register(event, options, retained); }
    catch (error) { retained.destroy(); throw error; }
  };
  gg.events.run = (...values) => {
    if (values.length) throw new Error('GG.events.run no recibe argumentos.');
    return program.run();
  };
  Object.freeze(gg.events);
  }else{
    Object.assign(gg,capabilityOperations());
    gg.context=Object.freeze({
      configure:value=>capability.configure(plainCapability(value)),
      when:(descriptor,callback)=>{
        if(typeof callback!=='function'||typeof callback.copy!=='function')throw new Error('Se requiere callback Python.');
        const retained=callback.copy();try{return capability.register(plainCapability(descriptor),retained);}catch(error){retained.destroy();throw error;}
      },
      activate:(...values)=>{if(values.length)throw new Error('GG.context.activate no recibe argumentos.');return capability.activate();}
    });
  }
  pyodide.registerJsModule('GG', Object.freeze(gg));
  // Fixed host bootstrap; the student's source is transferred as a Python value.
  pyodide.runPython('import ast as __gg_ast\nimport inspect as __gg_inspect\nimport asyncio as __gg_asyncio\ndef __gg_invoke(callback, context, event=None):\n    return __gg_asyncio.ensure_future(callback(context) if event is None else callback(context, event))');
  invokePython = pyodide.globals.get("__gg_invoke");
  return Object.freeze({
    async prepare(document) {
      const candidate = validateLanguageDocument(document);
      if (!alive) throw new Error('Session stopped');
      if (candidate.language !== 'python') throw new Error('Documento Python requerido.');
      pyodide.globals.set('__gg_source', candidate.source);
      try {
        pyodide.runPython('__gg_code = compile(__gg_source, "document.py", "exec", flags=__gg_ast.PyCF_ALLOW_TOP_LEVEL_AWAIT, dont_inherit=True)');
      } finally { pyodide.globals.delete('__gg_source'); }
      prepared = candidate;
      return {prepared: true};
    },
    async execute() {
      if (!alive || !prepared) throw new Error('El documento no está preparado.');
      const result = await pyodide.runPythonAsync('__gg_namespace = {"__name__": "__main__", "GG": __import__("GG")}\n__gg_result = eval(__gg_code, __gg_namespace)\nif __gg_inspect.isawaitable(__gg_result):\n    await __gg_result', {filename: 'studio-bootstrap.py'});
      result?.destroy?.();
      return {completed: true};
    },
    invoke: data => capability?capability.dispatch(data):program.dispatch(data),
    cancelInvocation: id => capability?capability.cancelInvocation(id):program.cancelInvocation(id),
    dispose() {
      if (!alive) return;
      capability?.dispose();program.dispose();
      invokePython.destroy();
      alive = false;
      for (const [timer, reject] of timers) { clearTimeout(timer); reject(new Error('Session stopped')); }
      timers.clear();
      // Full interpreter memory is reclaimed by terminating this session worker.
      pyodide.globals.delete('__gg_code');
    }
  });
}
