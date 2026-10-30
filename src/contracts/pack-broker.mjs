import {validateResourceView,getResourceCostume,getResourceSound} from './resources.mjs';
import {resolveCapabilities} from './packs.mjs';
import {validateProgram} from './program-contract.mjs';
import {validateLanguageRPC} from './language-runtime.mjs';
import {validateTextProgram} from './text-program.mjs';

const fail = message => { throw new Error('GG permissions: ' + message); };
const operationOf = Object.freeze({move: 'program.move', wait: 'program.wait', setVariable: 'program.setVariable',
  changeVariable: 'program.changeVariable', broadcastWait: 'program.broadcastAndWait', createClone: 'program.createClone',
  deleteClone: 'program.deleteClone', playSound: 'program.playSound', stopSounds: 'program.stopSounds', setCostume: 'program.setCostume',
  turnRight: 'program.turnRight', turnLeft: 'program.turnLeft', pointDirection: 'program.pointInDirection', goTo: 'program.goTo', glide: 'program.glide',
  changeX: 'program.changeX', setX: 'program.setX', changeY: 'program.changeY', setY: 'program.setY', bounce: 'program.bounceOnEdge',
  say: 'program.say', sayFor: 'program.sayFor', think: 'program.think', thinkFor: 'program.thinkFor', nextCostume: 'program.nextCostume',
  changeSize: 'program.changeSize', setSize: 'program.setSize', show: 'program.show', hide: 'program.hide', stopAll: 'program.stopAll',
  goToObject: 'program.goToObject', goToRandom: 'program.goToRandom', setBackdrop: 'program.setBackdrop', nextBackdrop: 'program.nextBackdrop'});
// IR value fields and text RPC argument positions that may read a variable.
const expressionFields = Object.freeze({move: ['steps'], turnRight: ['degrees'], turnLeft: ['degrees'], pointDirection: ['direction'], goTo: ['x', 'y'],
  glide: ['x', 'y'], changeX: ['dx'], setX: ['x'], changeY: ['dy'], setY: ['y'], changeSize: ['delta'], setSize: ['size']});
const expressionArguments = Object.freeze(Object.fromEntries(Object.entries(expressionFields).map(([kind, fields]) =>
  [operationOf[kind], kind === 'glide' ? [2, 3] : fields.map((_, index) => index + 1)])));
// Yielding one frame is core control flow (loops), not a pack capability.
const coreOperations = new Set(['program.frame']);
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
// ownerId: the object whose script uses the resource (hero for IR0 by default).
// A pack restriction names its owner; with gg.sprites@0.3.0 (`objectResources`,
// scene2d-multi-sprite 3.2) that owner stands for the script's object, so what
// counts is that the object owns the resource. A text call names no object
// (ownerId null): any object's resource passes here and the scene refuses
// another object's, because it runs the call on the calling target.
const declaresObjectResources = plan => plan.packs.some(pack => pack.manifest.permissions?.objectResources === true);
function resourceAllowed(restriction,id,kind,resourceView,ownerId,perObject) {
 const owner=ownerId??undefined,descriptor=resourceView?(kind==='costumes'?getResourceCostume(resourceView,id,owner):getResourceSound(resourceView,id,owner)):null;
 if(resourceView&&!descriptor)return false;
 if(Array.isArray(restriction))return (ownerId===null||ownerId==='hero')&&restriction.includes(id);
 return !!resourceView&&restriction?.resource===kind&&(perObject||restriction.ownerId===ownerId)&&!!descriptor;
}
function authorize(plan, method, args, variables, principal = null,resourceView=null,ownerId='hero') {
  const perObject = declaresObjectResources(plan);
  const packs = principal === null ? plan.packs : plan.packs.filter(pack => pack.manifest.id === principal);
  if (!packs.length) fail('cliente de pack desconocido');
  const variableIds = [];
  if (method === 'variables.get' || method === 'variables.set') variableIds.push(args[0]);
  if (method === 'program.setVariable' || method === 'program.changeVariable') variableIds.push(args[1]);
  if (coreOperations.has(method)) return;
  const refs = method === 'program.compare' ? args.slice(2) :
    ['program.setVariable', 'program.changeVariable'].includes(method) ? [args.at(-1)] :
      Object.hasOwn(expressionArguments, method) ? expressionArguments[method].map(index => args[index]) : [];
  for (const ref of refs) if (ref && typeof ref === 'object') variableIds.push(ref.variableId);
  const allowed = packs.some(pack => {
    const permissions = pack.manifest.permissions;
    if (!permissions.operations.includes(method) || variableIds.some(id => !permittedVariable(pack, id, variables))) return false;
    if (method.startsWith('sprite.') && !permissions.sprites.includes(args[0])) return false;
    if (method === 'program.playSound' && !resourceAllowed(permissions.sounds,args[1],'sounds',resourceView,ownerId,perObject)) return false;
    if (method === 'program.setCostume' && !resourceAllowed(permissions.costumes,args[1],'costumes',resourceView,ownerId,perObject)) return false;
    // A backdrop is the stage's for every object. A text call names it as the
    // student reads it (ownerId null): the scene resolves that name.
    if (method === 'program.setBackdrop' && ownerId !== null && resourceView && !getResourceCostume(resourceView,args[1],'stage')) return false;
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
  authorize(plan, request.method, request.args, variables,null,resourceView,declaresObjectResources(plan)?null:'hero');
  return request;
}
// IR 2D v1 is accepted only with an explicit `objects: true` from a caller that
// runs every object (the simulator boundary for 0.3.0 scenes); the program
// must name exactly the configured objects, in order. IR0 stays accepted.
// ownerId: the object an IR0 belongs to (one workspace of a scene); hero by default.
export function authorizeProgram(capabilities, ir,{resourceView,objects=false,ownerId=null}={}) {
  if(resourceView)resourceView=validateResourceView(resourceView);
  const plan = resolveCapabilities(capabilities);
  const result = structuredClone(ir);
  if (plan.variables.length || Object.hasOwn(result, 'variables')) result.variables = defaults(result.variables, plan);
  validateProgram(result,{resourceView,objects:objects===true,...(ownerId?{resourceOwnerId:ownerId}:{})});
  if (result.version === 1) {
    const configured = plan.packs.find(pack => pack.manifest.id === 'gg.sprites')?.config?.sprites;
    if (!Array.isArray(configured) || configured.length !== result.sprites.length || configured.some((sprite, index) => sprite.id !== result.sprites[index]))
      fail('los objetos del programa no coinciden con los objetos del proyecto');
  }
  const variables = result.variables ?? [];
  authorize(plan, 'program.start', [], variables,null,resourceView);
  function valueReference(value) {
    if (value?.kind === 'variable') authorize(plan, 'variables.get', [value.variableId], variables,null,resourceView);
    if (value?.kind === 'compare') { valueReference(value.left); valueReference(value.right); }
  }
  let owner = 'hero';
  function statements(body) {
    for (const node of body) {
      if (node.kind === 'repeat' || node.kind === 'forever') { statements(node.body); continue; }
      if (node.kind === 'if') { valueReference(node.condition); statements(node.body); statements(node.elseBody ?? []); continue; }
      if (node.kind === 'repeatUntil') { valueReference(node.condition); statements(node.body); continue; }
      if (node.kind === 'waitUntil') { valueReference(node.condition); continue; }
      if (node.kind === 'stopScript') continue;
      const method = operationOf[node.kind];
      if (!method) fail('IR sin operación autorizable');
      const args = ['context'];
      if (['setVariable', 'changeVariable'].includes(node.kind)) args.push(node.variableId, node.value);
      else if (node.kind === 'playSound') args.push(node.sound, node.wait);
      else if (node.kind === 'setCostume') args.push(node.costume);
      else if (node.kind === 'setBackdrop') args.push(node.backdrop);
      else if (node.kind === 'goToObject') args.push(node.target);
      else if (node.kind === 'glide') args.push(node.seconds, node.x, node.y);
      else if (Object.hasOwn(expressionFields, node.kind)) args.push(...expressionFields[node.kind].map(field => node[field]));
      authorize(plan, method, args, variables,null,resourceView,owner);
      valueReference(node.value); for (const field of expressionFields[node.kind] ?? []) valueReference(node[field]);
    }
  }
  for (const script of result.scripts) { owner = script.targetId ?? ownerId ?? 'hero'; statements(script.body); }
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
      method === 'program.start' ? request.args[0].variables : variables, principal,context.resourceView,declaresObjectResources(resolveCapabilities(captured))?null:'hero');
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
