// Studio-owned textual event/context DTOs. No engine or DOM dependencies.
import {isScene2DSpriteId} from './scene2d-objects.mjs';
export const textProgramLimits = Object.freeze({
  variables: 16, handlers: 16, invocations: 64, clones: 64, pendingEvents: 64,
  bytes: 16384, number: 1_000_000_000_000, id: 128, message: 64, error: 1024
});
const fail = message => { throw new Error(`GG text program: ${message}`); };
function object(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('invalid object');
  const allowed = [...required, ...optional];
  if (Object.keys(value).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(value, key))) fail('invalid object fields');
}
export function validateTextProgramId(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > textProgramLimits.id ||
      ['__proto__', 'prototype', 'constructor'].includes(value)) fail('invalid identifier');
  return value;
}
function text(value, maximum) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) fail('invalid name');
}
export function validateTextProgramNumber(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > textProgramLimits.number) fail('numeric value outside finite ±1e12 domain');
  return value;
}
export function validateTextExpression(value) {
  if (typeof value === 'number') return validateTextProgramNumber(value);
  object(value, ['variableId']); validateTextProgramId(value.variableId);
  return {variableId: value.variableId};
}
function boundedJSON(value) {
  let encoded;
  try { encoded = JSON.stringify(value); } catch { fail('not JSON serializable'); }
  if (typeof encoded !== 'string' || new TextEncoder().encode(encoded).length > textProgramLimits.bytes) fail('size limit');
}
// The object a handler or local variable belongs to (scene2d-multi-sprite 2.2):
// a sprite ID or the stage; hero when absent.
export function validateTextProgramTarget(value) {
  if (value !== 'stage' && !isScene2DSpriteId(value)) fail('invalid target');
  return value;
}
export function validateTextProgram(program) {
  object(program, ['variables', 'handlers']); boundedJSON(program);
  if (!Array.isArray(program.variables) || program.variables.length > textProgramLimits.variables) fail('variable limit');
  if (!Array.isArray(program.handlers) || program.handlers.length > textProgramLimits.handlers) fail('handler limit');
  // Structured clone preserves sparse arrays; map() would silently skip holes
  // and leave an invalid descriptor to fail only after the VM commit began.
  for (const list of [program.variables, program.handlers]) {
    for (let index = 0; index < list.length; index++) if (!Object.hasOwn(list, index)) fail('sparse descriptor array');
  }
  const variableIds = new Set(); const handlerIds = new Set();
  const variables = program.variables.map(variable => {
    object(variable, ['id', 'name', 'initialValue'], ['scope', 'targetId']);
    validateTextProgramId(variable.id); text(variable.name, 64); validateTextProgramNumber(variable.initialValue);
    if (variable.scope !== undefined && !['local', 'global'].includes(variable.scope)) fail('invalid variable scope');
    if (Object.hasOwn(variable, 'targetId')) { validateTextProgramTarget(variable.targetId); if (variable.scope === 'global') fail('invalid variable scope'); }
    if (variableIds.has(variable.id)) fail('duplicate variable');
    variableIds.add(variable.id);
    return {...variable, scope: variable.scope ?? 'local'};
  });
  const handlers = program.handlers.map(handler => {
    const extra = handler?.event === 'key' ? ['key'] : handler?.event === 'message' ? ['message'] : [];
    object(handler, ['id', 'event', ...extra], ['targetId']); validateTextProgramId(handler.id);
    if (Object.hasOwn(handler, 'targetId')) validateTextProgramTarget(handler.targetId);
    if (!['start', 'key', 'click', 'message', 'clone'].includes(handler.event)) fail('invalid event');
    if (handler.event === 'clone' && handler.targetId === 'stage') fail('stage cannot clone');
    if (handler.event === 'key' && (typeof handler.key !== 'string' || !/^(space|up arrow|down arrow|left arrow|right arrow|[a-z0-9])$/.test(handler.key))) fail('unsupported key');
    if (handler.event === 'message') text(handler.message, textProgramLimits.message);
    if (handlerIds.has(handler.id)) fail('duplicate handler');
    handlerIds.add(handler.id);
    return {...handler};
  });
  return {variables, handlers};
}
const arities = Object.freeze({
  'program.start': 1, 'program.stop': 0, 'program.move': 2, 'program.wait': 2,
  'program.setVariable': 3, 'program.changeVariable': 3, 'program.compare': 4,
  'program.broadcastAndWait': 2, 'program.createClone': 1, 'program.deleteClone': 1,
  'program.playSound': 3, 'program.stopSounds': 1, 'program.setCostume': 2,
  // gg.sprites@0.2.0 (E1) and the core frame yield of while loops.
  'program.turnRight': 2, 'program.turnLeft': 2, 'program.pointInDirection': 2, 'program.goTo': 3, 'program.glide': 4,
  'program.changeX': 2, 'program.setX': 2, 'program.changeY': 2, 'program.setY': 2, 'program.bounceOnEdge': 1,
  'program.say': 2, 'program.think': 2, 'program.sayFor': 3, 'program.thinkFor': 3, 'program.nextCostume': 1,
  'program.changeSize': 2, 'program.setSize': 2, 'program.show': 1, 'program.hide': 1, 'program.stopAll': 1, 'program.frame': 1,
  // gg.sprites@0.3.0. Text names an object by identifier and a backdrop by its name; the scene resolves them.
  'program.goToObject': 2, 'program.goToRandom': 1, 'program.setBackdrop': 2, 'program.nextBackdrop': 1
});
// Arguments after the invocation ID that are numeric expressions (number or variable reference).
const expressionArguments = Object.freeze({'program.turnRight': [1], 'program.turnLeft': [1], 'program.pointInDirection': [1], 'program.goTo': [1, 2],
  'program.glide': [2, 3], 'program.changeX': [1], 'program.setX': [1], 'program.changeY': [1], 'program.setY': [1], 'program.changeSize': [1], 'program.setSize': [1]});
// Speech accepts text (≤ 330 characters, as Scratch shows) or a numeric expression.
export function validateTextMessage(value) {
  if (typeof value === 'string') { if (value.length > 330 || /[\u0000-\u001f\u007f]/.test(value)) fail('invalid message'); return value; }
  return validateTextExpression(value);
}
function validateSeconds(value) { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 60) fail('invalid duration'); }
export function validateTextProgramRPC(method, args) {
  if (typeof method !== 'string' || !Object.hasOwn(arities, method) || !Array.isArray(args) || args.length !== arities[method]) fail('unsupported operation or arity');
  boundedJSON({method, args});
  if (method === 'program.start') return {method, args: [validateTextProgram(args[0])]};
  if (method === 'program.stop') return {method, args: []};
  validateTextProgramId(args[0]);
  if (method === 'program.move') validateTextExpression(args[1]);
  if (method === 'program.wait' && (typeof args[1] !== 'number' || !Number.isFinite(args[1]) || args[1] < 0 || args[1] > 60)) fail('invalid wait');
  if (['program.setVariable', 'program.changeVariable'].includes(method)) {
    validateTextProgramId(args[1]); validateTextExpression(args[2]);
  }
  if (method === 'program.compare') {
    if (!['EQ', 'LT', 'GT'].includes(args[1])) fail('invalid comparison');
    validateTextExpression(args[2]); validateTextExpression(args[3]);
  }
  for (const index of expressionArguments[method] ?? []) validateTextExpression(args[index]);
  if (method === 'program.glide') validateSeconds(args[1]);
  if (['program.say', 'program.think', 'program.sayFor', 'program.thinkFor'].includes(method)) validateTextMessage(args[1]);
  if (['program.sayFor', 'program.thinkFor'].includes(method)) validateSeconds(args[2]);
  if (method === 'program.broadcastAndWait') text(args[1], textProgramLimits.message);
  if (method === 'program.playSound' && (typeof args[1]!=='string'||! /^[A-Za-z0-9:_-]{1,128}$/.test(args[1])||['__proto__','constructor','prototype'].includes(args[1])||typeof args[2] !== 'boolean')) fail('unsupported sound');
  if (method === 'program.goToObject' && (typeof args[1] !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(args[1]) || ['__proto__', 'constructor', 'prototype'].includes(args[1]))) fail('unsupported object');
  if (method === 'program.setBackdrop' && (typeof args[1] !== 'string' || !args[1].trim() || args[1].length > 128 || /[\u0000-\u001f\u007f]/.test(args[1]))) fail('unsupported backdrop');
  if (method === 'program.setCostume' && (typeof args[1]!=='string'||! /^[A-Za-z0-9:_-]{1,128}$/.test(args[1])||['__proto__','constructor','prototype'].includes(args[1]))) fail('unsupported costume');
  return {method, args: structuredClone(args)};
}
export function validateTextInvocation(invocation) {
  object(invocation, ['invocationId', 'handlerId', 'targetId', 'revision']);
  for (const field of ['invocationId', 'handlerId', 'targetId']) validateTextProgramId(invocation[field]);
  if (!Number.isSafeInteger(invocation.revision) || invocation.revision < 0) fail('invalid revision');
  return {...invocation};
}
export function validateTextInvocationResult(payload) {
  object(payload, ['invocationId', 'revision'], ['result', 'error']);
  validateTextProgramId(payload.invocationId);
  if (!Number.isSafeInteger(payload.revision) || payload.revision < 0 ||
      (Object.hasOwn(payload, 'error') && (typeof payload.error !== 'string' || payload.error.length > textProgramLimits.error)) ||
      (Object.hasOwn(payload, 'result') && Object.hasOwn(payload, 'error'))) fail('invalid invocation result');
  boundedJSON(payload);
  return structuredClone(payload);
}
