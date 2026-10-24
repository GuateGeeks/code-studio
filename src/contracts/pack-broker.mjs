import {validateResourceView,getResourceCostume,getResourceSound} from './resources.mjs';
import {resolveCapabilities} from './packs.mjs';
import {validateProgram} from './program-contract.mjs';
import {validateLanguageRPC} from './language-runtime.mjs';
import {validateTextProgram} from './text-program.mjs';

const fail = message => { throw new Error('GG permissions: ' + message); };
const operationOf = Object.freeze({move: 'program.move', wait: 'program.wait', setVariable: 'program.setVariable',
  changeVariable: 'program.changeVariable', broadcastWait: 'program.broadcastAndWait', createClone: 'program.createClone',
  deleteClone: 'program.deleteClone', playSound: 'program.playSound', stopSounds: 'program.stopSounds', setCostume: 'program.setCostume'});
function defaults(variables, plan) {
  const result = structuredClone(variables ?? []);
  if (!Array.isArray(result)) fail('declaraciones inválidas');
  for (const variable of plan.variables) {
    const explicit = result.find(item => item?.id === variable.id);
    if (!explicit) result.push(structuredClone(variable));
    else if ((explicit.scope ?? 'local') !== variable.scope) fail('ámbito de variable en conflicto: ' + variable.id);
  }
  return result;
}
function permittedVariable(pack, id, variables) {
  const declaration = variables.find(item => item.id === id);
  if (!declaration) return false;
  const restriction = pack.manifest.permissions.variables;
  if (restriction === 'declared') return true;
  return restriction && id === pack.config[restriction.config] && (declaration.scope ?? 'local') === restriction.scope;
}
function resourceAllowed(restriction,id,kind,resourceView) {
 const descriptor=resourceView?(kind==='costumes'?getResourceCostume(resourceView,id,'hero'):getResourceSound(resourceView,id,'hero')):null;
 if(resourceView&&!descriptor)return false;
 if(Array.isArray(restriction))return restriction.includes(id);
 return !!resourceView&&restriction?.resource===kind&&restriction.ownerId==='hero'&&!!descriptor;
}
function authorize(plan, method, args, variables, principal = null,resourceView=null) {
  const packs = principal === null ? plan.packs : plan.packs.filter(pack => pack.manifest.id === principal);
  if (!packs.length) fail('cliente de pack desconocido');
  const variableIds = [];
  if (method === 'variables.get' || method === 'variables.set') variableIds.push(args[0]);
  if (method === 'program.setVariable' || method === 'program.changeVariable') variableIds.push(args[1]);
  const refs = method === 'program.compare' ? args.slice(2) :
    ['program.move', 'program.setVariable', 'program.changeVariable'].includes(method) ? [args.at(-1)] : [];
  for (const ref of refs) if (ref && typeof ref === 'object') variableIds.push(ref.variableId);
  const allowed = packs.some(pack => {
    const permissions = pack.manifest.permissions;
    if (!permissions.operations.includes(method) || variableIds.some(id => !permittedVariable(pack, id, variables))) return false;
    if (method.startsWith('sprite.') && !permissions.sprites.includes(args[0])) return false;
    if (method === 'program.playSound' && !resourceAllowed(permissions.sounds,args[1],'sounds',resourceView)) return false;
    if (method === 'program.setCostume' && !resourceAllowed(permissions.costumes,args[1],'costumes',resourceView)) return false;
    return true;
  });
  if (!allowed) fail('operación o recurso no declarado: ' + method);
}
export function authorizeProjectOperation(capabilities, method, args, {variables = [],resourceView} = {}) {
  const plan = resolveCapabilities(capabilities);
  if(resourceView)resourceView=validateResourceView(resourceView);
  let request;
  if (method === 'program.start') {
    if (!Array.isArray(args) || args.length !== 1) fail('programa inválido');
    const descriptor = validateTextProgram({...args[0], variables: defaults(args[0]?.variables, plan)});
    request = validateLanguageRPC(method, [descriptor]);
    variables = descriptor.variables;
  } else request = validateLanguageRPC(method, args);
  authorize(plan, request.method, request.args, variables,null,resourceView);
  return request;
}
export function authorizeProgram(capabilities, ir,{resourceView}={}) {
  if(resourceView)resourceView=validateResourceView(resourceView);
  const plan = resolveCapabilities(capabilities);
  const result = structuredClone(ir);
  if (plan.variables.length || Object.hasOwn(result, 'variables')) result.variables = defaults(result.variables, plan);
  validateProgram(result,{resourceView});
  const variables = result.variables ?? [];
  authorize(plan, 'program.start', [], variables,null,resourceView);
  function valueReference(value) {
    if (value?.kind === 'variable') authorize(plan, 'variables.get', [value.variableId], variables,null,resourceView);
    if (value?.kind === 'compare') { valueReference(value.left); valueReference(value.right); }
  }
  function statements(body) {
    for (const node of body) {
      if (node.kind === 'repeat') { statements(node.body); continue; }
      if (node.kind === 'if') { valueReference(node.condition); statements(node.body); statements(node.elseBody ?? []); continue; }
      const method = operationOf[node.kind];
      if (!method) fail('IR sin operación autorizable');
      const args = ['context'];
      if (['setVariable', 'changeVariable'].includes(node.kind)) args.push(node.variableId, node.value);
      else if (node.kind === 'playSound') args.push(node.sound, node.wait);
      else if (node.kind === 'setCostume') args.push(node.costume);
      else if (node.kind === 'move') args.push(node.steps);
      authorize(plan, method, args, variables,null,resourceView);
      valueReference(node.value); valueReference(node.steps);
    }
  }
  for (const script of result.scripts) statements(script.body);
  return result;
}
// The client principal is captured by trusted host code. No imported request
// field can choose a different pack or broaden the runner's project policy.
export function createCapabilityBroker({capabilities = null, call, getContext = () => ({})}) {
  const captured = capabilities == null ? null : structuredClone(resolveCapabilities(capabilities).capabilities);
  let declarations = [];
  let configuring = false;
  function invoke(method, args, principal = null) {
    const context = getContext();
    const variables = context.variables ?? declarations;
    const request = authorizeProjectOperation(captured, method, args, {variables,resourceView:context.resourceView});
    if (principal !== null) authorize(resolveCapabilities(captured), request.method, request.args,
      method === 'program.start' ? request.args[0].variables : variables, principal,context.resourceView);
    if (method !== 'program.start') return call(request.method, request.args);
    if (configuring) fail('activación de programa pendiente');
    configuring = true;
    let result;
    try { result = call(request.method, request.args); }
    catch (error) { configuring = false; throw error; }
    const committed = value => { declarations = structuredClone(request.args[0].variables); configuring = false; return value; };
    if (result && typeof result.then === 'function') return Promise.resolve(result).then(committed, error => { configuring = false; throw error; });
    return committed(result);
  }
  return Object.freeze({
    invoke: (method, args) => invoke(method, args),
    client: packId => {
      if (!resolveCapabilities(captured).packs.some(pack => pack.manifest.id === packId)) fail('pack no seleccionado');
      return Object.freeze({invoke: (method, args) => invoke(method, args, packId)});
    }
  });
}
