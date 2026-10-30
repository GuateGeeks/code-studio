import {validateResourceView,getResourceCostume,getResourceSound} from './resources.mjs';
import {isScene2DSpriteId,scene2DObjectLimits} from './scene2d-objects.mjs';
// Studio-owned wire contract; no Blockly, Scratch or DOM imports.
export const programLimits = Object.freeze({bytes: 65536, nodes: 300, depth: 8, scripts: 16, variables: 16});
// IR 2D v1 (scene2d-multi-sprite 1.4): every script names its object
// (targetId: a sprite of `sprites` or `stage`). The IR0 limits apply per
// object; the stage holds the global variables, each sprite its own.
export const scene2DProgramLimits = Object.freeze({sprites: scene2DObjectLimits.sprites, scriptsPerObject: programLimits.scripts,
  nodesPerObject: programLimits.nodes, variablesPerObject: programLimits.variables, bytes: programLimits.bytes * (scene2DObjectLimits.sprites + 1)});
// As in Scratch, the stage does not move, speak, change size or clone itself;
// its backdrops arrive with their own blocks (tarea 3.2).
const stageEvents = new Set(['start', 'key', 'click', 'message']);
const stageStatements = new Set(['wait', 'repeat', 'forever', 'repeatUntil', 'waitUntil', 'if', 'broadcastWait', 'setVariable', 'changeVariable', 'playSound', 'stopSounds', 'stopAll', 'stopScript']);
const fail = message => { throw new Error(`Invalid GG program: ${message}`); };
function object(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected object');
  for (const key of Object.keys(value)) if (![...required, ...optional].includes(key)) fail(`unexpected property ${key}`);
  for (const key of required) if (!Object.hasOwn(value, key)) fail(`missing ${key}`);
}
function text(value, limit = 128) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit || ['__proto__', 'constructor', 'prototype'].includes(value)) fail('invalid identifier/name');
}
function number(value, maximum = 1_000_000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > maximum) fail('invalid numeric value');
}
// IR v1 is opt-in (`objects: true`): every consumer that only knows IR0 (the
// Scratch adapter and the simulator boundary, the broker, generators, the SB3
// export) keeps rejecting it by default instead of folding every object into
// hero. Multi-object consumers opt in as they gain support (T4/T5).
export function validateProgram(ir,{resourceView,resourceOwnerId='hero',objects:acceptObjects=false}={}) {
  if(resourceView)resourceView=validateResourceView(resourceView);
  // currentTargetId stays null for IR0, whose scripts all belong to resourceOwnerId.
  let currentSourceBlockId = null, currentTargetId = null;
  try {
  if (ir?.version === 1 && !acceptObjects) fail('unsupported version');
  const objects = ir?.version === 1;
  let encoded;
  try { encoded = JSON.stringify(ir); } catch { fail('not JSON serializable'); }
  if (!encoded || new TextEncoder().encode(encoded).length > (objects ? scene2DProgramLimits.bytes : programLimits.bytes)) fail('size limit');
  const targets = new Set(['stage']);
  if (objects) {
    object(ir, ['version', 'sprites', 'scripts'], ['variables']);
    if (!Array.isArray(ir.sprites) || ir.sprites.length < 1 || ir.sprites.length > scene2DProgramLimits.sprites) fail('sprite limit');
    for (const id of ir.sprites) {
      if (!isScene2DSpriteId(id)) fail('invalid sprite ID');
      if (targets.has(id)) fail(`duplicate sprite ${id}`);
      targets.add(id);
    }
  } else {
    object(ir, ['version', 'scripts'], ['variables']);
    if (ir.version !== 0) fail('unsupported version');
  }
  const ids = new Set(), nodes = new Map();
  function source(node, depth) {
    currentSourceBlockId = node?.sourceBlockId ?? null;
    const count = (nodes.get(currentTargetId) ?? 0) + 1; nodes.set(currentTargetId, count);
    if (count > programLimits.nodes || depth > programLimits.depth) fail('node/depth limit');
    text(node.sourceBlockId);
    if (ids.has(node.sourceBlockId)) fail(`duplicate source ID ${node.sourceBlockId}`);
    ids.add(node.sourceBlockId);
  }
  // Variable owner: null when every script may use it (IR0 and globals), else its sprite.
  const variables = new Map(), owned = new Map();
  if (ir.variables !== undefined && (!Array.isArray(ir.variables) || (!objects && ir.variables.length > programLimits.variables))) fail('variable limit');
  for (const model of ir.variables ?? []) {
    object(model, ['id', 'name', 'initialValue'], objects ? ['scope', 'targetId'] : ['scope']); text(model.id); text(model.name, 64); number(model.initialValue);
    if (model.scope !== undefined && !['local', 'global'].includes(model.scope)) fail('unsupported variable scope');
    const owner = !objects || model.scope === 'global' ? null : model.targetId;
    if (objects) {
      if (model.scope === 'global' ? Object.hasOwn(model, 'targetId') : !ir.sprites.includes(model.targetId)) fail('invalid variable owner');
      const count = (owned.get(owner) ?? 0) + 1; owned.set(owner, count);
      if (count > scene2DProgramLimits.variablesPerObject) fail('variable limit');
    }
    if (variables.has(model.id)) fail('duplicate variable');
    variables.set(model.id, {name: model.name, owner});
  }
  function reference(node) {
    text(node.variableId); text(node.name, 64);
    const variable = variables.get(node.variableId);
    if (variable?.name !== node.name) fail(`unknown variable at ${node.sourceBlockId}`);
    if (variable.owner !== null && variable.owner !== currentTargetId) fail(`variable of another object at ${node.sourceBlockId}`);
  }
  // Resources belong to the script's object in IR v1; without a resource view
  // only the built-in hero costumes and tone exist.
  const owner = () => objects ? currentTargetId : resourceOwnerId;
  const builtIn = (value, list) => (!objects || currentTargetId === 'hero') && list.includes(value);
  function expression(value, depth, comparison = false) {
    if (typeof value === 'number' && !comparison) { number(value); return; }
    if (value?.kind === 'variable' && !comparison) {
      object(value, ['kind', 'variableId', 'name', 'sourceBlockId']); source(value, depth); reference(value);
    } else if (value?.kind === 'compare' && comparison) {
      object(value, ['kind', 'operator', 'left', 'right', 'sourceBlockId']); source(value, depth);
      if (!['EQ', 'LT', 'GT'].includes(value.operator)) fail('unsupported comparison');
      expression(value.left, depth + 1); expression(value.right, depth + 1);
    } else fail('unsupported expression');
  }
  // E1 literals stay within the stage and Scratch-like ranges; variables are
  // checked at run time by the finite domain (and fenced by the engine).
  function bounded(value, minimum, maximum, label) { if (typeof value === 'number' && (value < minimum || value > maximum)) fail(`${label} outside ${minimum}..${maximum}`); }
  function message(value) { if (typeof value !== 'string' || value.length > 330 || /[\u0000-\u001f\u007f]/.test(value)) fail('invalid message text'); }
  function seconds(value) { number(value, 60); if (value < 0) fail('negative duration'); }
  function statements(body, depth) {
    if (!Array.isArray(body)) fail('expected statement list');
    for (const [index, node] of body.entries()) {
      if (!node || typeof node !== 'object') fail('expected statement');
      const common = ['kind', 'sourceBlockId']; source(node, depth);
      if (currentTargetId === 'stage' && !stageStatements.has(node.kind)) fail(`stage cannot ${node.kind}`);
      // «por siempre» and both «detener» end their stack, as in Scratch.
      if (['forever', 'stopScript', 'stopAll'].includes(node.kind) && index !== body.length - 1) fail(`${node.kind} must be the last statement`);
      switch (node.kind) {
        case 'turnRight': case 'turnLeft': object(node, [...common, 'degrees']); expression(node.degrees, depth + 1); bounded(node.degrees, -3600, 3600, 'degrees'); break;
        case 'pointDirection': object(node, [...common, 'direction']); expression(node.direction, depth + 1); bounded(node.direction, -3600, 3600, 'direction'); break;
        case 'goTo': object(node, [...common, 'x', 'y']); expression(node.x, depth + 1); expression(node.y, depth + 1); bounded(node.x, -240, 240, 'x'); bounded(node.y, -180, 180, 'y'); break;
        case 'glide': object(node, [...common, 'seconds', 'x', 'y']); seconds(node.seconds); expression(node.x, depth + 1); expression(node.y, depth + 1); bounded(node.x, -240, 240, 'x'); bounded(node.y, -180, 180, 'y'); break;
        case 'setX': object(node, [...common, 'x']); expression(node.x, depth + 1); bounded(node.x, -240, 240, 'x'); break;
        case 'setY': object(node, [...common, 'y']); expression(node.y, depth + 1); bounded(node.y, -180, 180, 'y'); break;
        case 'changeX': object(node, [...common, 'dx']); expression(node.dx, depth + 1); bounded(node.dx, -480, 480, 'dx'); break;
        case 'changeY': object(node, [...common, 'dy']); expression(node.dy, depth + 1); bounded(node.dy, -480, 480, 'dy'); break;
        case 'say': case 'think': object(node, [...common, 'message']); message(node.message); break;
        case 'sayFor': case 'thinkFor': object(node, [...common, 'message', 'seconds']); message(node.message); seconds(node.seconds); break;
        case 'setSize': object(node, [...common, 'size']); expression(node.size, depth + 1); bounded(node.size, 0, 1000, 'size'); break;
        case 'changeSize': object(node, [...common, 'delta']); expression(node.delta, depth + 1); bounded(node.delta, -1000, 1000, 'size change'); break;
        case 'bounce': case 'show': case 'hide': case 'nextCostume': case 'stopAll': case 'stopScript': object(node, common); break;
        case 'forever': object(node, [...common, 'body']); statements(node.body, depth + 1); break;
        case 'repeatUntil': object(node, [...common, 'condition', 'body']); expression(node.condition, depth + 1, true); statements(node.body, depth + 1); break;
        case 'waitUntil': object(node, [...common, 'condition']); expression(node.condition, depth + 1, true); break;
        case 'move': object(node, [...common, 'steps']); expression(node.steps, depth + 1); if (typeof node.steps === 'number') number(node.steps, 480); break;
        case 'wait': object(node, [...common, 'seconds']); number(node.seconds, 60); if (node.seconds < 0) fail('negative wait'); break;
        case 'repeat': object(node, [...common, 'count', 'body']); number(node.count, 1000); if (!Number.isInteger(node.count) || node.count < 0) fail('invalid repeat'); statements(node.body, depth + 1); break;
        case 'broadcastWait': object(node, [...common, 'message']); text(node.message, 64); break;
        case 'createClone': case 'deleteClone': case 'stopSounds': object(node, common); break;
        case 'setVariable': case 'changeVariable': object(node, [...common, 'variableId', 'name', 'value']); reference(node); expression(node.value, depth + 1); break;
        case 'if': object(node, [...common, 'condition', 'body', 'elseBody']); expression(node.condition, depth + 1, true); statements(node.body, depth + 1); statements(node.elseBody, depth + 1); break;
        case 'playSound': object(node, [...common, 'sound', 'wait']); if (typeof node.wait !== 'boolean'||(resourceView?!getResourceSound(resourceView,node.sound,owner()):!builtIn(node.sound,['tone']))) fail('unsupported sound'); break;
        case 'setCostume': object(node, [...common, 'costume']); if (resourceView?!getResourceCostume(resourceView,node.costume,owner()):!builtIn(node.costume,['hero','hero-alt'])) fail('unsupported costume'); break;
        default: fail(`unsupported operation ${node.kind}`);
      }
    }
  }
  if (!Array.isArray(ir.scripts) || ir.scripts.length > (objects ? scene2DProgramLimits.scriptsPerObject * targets.size : programLimits.scripts)) fail('script limit');
  const scripts = new Map();
  for (const script of ir.scripts) {
    currentSourceBlockId = script?.sourceBlockId ?? null; currentTargetId = null;
    const extra = script?.event === 'key' ? ['key'] : script?.event === 'message' ? ['message'] : [];
    object(script, [...(objects ? ['targetId'] : []), 'event', 'sourceBlockId', 'body', ...extra]);
    if (objects) {
      if (!targets.has(script.targetId)) fail(`unknown target ${String(script.targetId).slice(0, 128)}`);
      currentTargetId = script.targetId;
      const count = (scripts.get(currentTargetId) ?? 0) + 1; scripts.set(currentTargetId, count);
      if (count > scene2DProgramLimits.scriptsPerObject) fail('script limit');
    }
    source(script, 0);
    if (!['start', 'key', 'click', 'message', 'clone'].includes(script.event)) fail('unsupported event');
    if (currentTargetId === 'stage' && !stageEvents.has(script.event)) fail(`stage cannot ${script.event}`);
    if (script.event === 'message') text(script.message, 64);
    if (script.event === 'key' && (typeof script.key !== 'string' || !/^(space|up arrow|down arrow|left arrow|right arrow|[a-z0-9])$/.test(script.key))) fail('unsupported key');
    statements(script.body, 1);
  }
  return ir;
  } catch (error) {
    if (typeof currentSourceBlockId === 'string' && currentSourceBlockId.length <= 128 && currentSourceBlockId.trim()) error.sourceBlockId = currentSourceBlockId;
    if (currentTargetId !== null) error.targetId = currentTargetId;
    throw error;
  }
}

// IR0 (gg.sprites 0.1.0/0.2.0 and single-workspace projects) as IR v1: every
// script and local variable belongs to one sprite (hero); nodes, source IDs
// and order are unchanged. Returns a new object; validate it with the caller's
// resource view and `objects: true`.
export function programObjectsFromIR0(ir, {spriteId = 'hero'} = {}) {
  if (!ir || typeof ir !== 'object' || ir.version !== 0) fail('only IR version 0 can be lifted to objects');
  if (!isScene2DSpriteId(spriteId)) fail('invalid sprite ID');
  const variables = Array.isArray(ir.variables) ? {variables: ir.variables.map(({scope, ...model}) => ({...structuredClone(model), ...(scope === 'global' ? {scope} : {targetId: spriteId})}))} : {};
  return {version: 1, sprites: [spriteId], ...variables, scripts: Array.isArray(ir.scripts) ? ir.scripts.map(script => ({targetId: spriteId, ...structuredClone(script)})) : ir.scripts};
}

// Scene program of a gg.sprites@0.3.0 project (scene2d-multi-sprite 2.1): one
// IR0 per object (each workspace is lowered on its own) becomes one IR v1.
// Scripts keep their nodes and IDs: the stage's first, then each sprite in the
// configuration order. Variables follow Scratch: those of the stage and those
// declared global by any object are global (shared on the stage); the rest
// belong to the one sprite that uses them. A variable ID shared as a local by
// two objects, or with two names, is rejected instead of guessed. A missing
// object counts as empty. Returns a new object; validate it with the caller's
// resource view and `objects: true`.
export function composeScene2DProgram(config, {stage = null, sprites = {}} = {}) {
  if (!config || !Array.isArray(config.sprites) || !config.sprites.length || config.sprites.some(sprite => !isScene2DSpriteId(sprite?.id))) fail('objetos 2D inválidos');
  const ids = config.sprites.map(sprite => sprite.id);
  if (!sprites || typeof sprites !== 'object' || Array.isArray(sprites)) fail('programas de objetos inválidos');
  for (const id of Object.keys(sprites)) if (!ids.includes(id)) fail(`programa de un objeto desconocido ${String(id).slice(0, 128)}`);
  const empty = {version: 0, scripts: []};
  const variables = new Map(), scripts = [];
  for (const [targetId, input] of [['stage', stage ?? empty], ...ids.map(id => [id, Object.hasOwn(sprites, id) ? sprites[id] : empty])]) {
    if (!input || typeof input !== 'object' || input.version !== 0 || !Array.isArray(input.scripts)) fail(`cada objeto aporta una IR0 (${targetId})`);
    if (input.variables !== undefined && !Array.isArray(input.variables)) fail('variable limit');
    for (const {scope, targetId: ignored, ...model} of input.variables ?? []) {
      const isGlobal = targetId === 'stage' || scope === 'global';
      const known = variables.get(model.id);
      if (!known) { variables.set(model.id, {model: structuredClone(model), owner: isGlobal ? null : targetId}); continue; }
      if (known.model.name !== model.name) fail(`la variable ${String(model.id).slice(0, 128)} tiene nombres distintos en dos objetos`);
      if (isGlobal) known.owner = null;
      else if (known.owner !== null && known.owner !== targetId) fail(`la variable ${String(model.name).slice(0, 64)} es local de varios objetos; decláralo para todos los objetos`);
    }
    for (const script of input.scripts) scripts.push({targetId, ...structuredClone(script)});
  }
  const list = [...variables.values()].map(({model, owner}) => owner === null ? {...model, scope: 'global'} : {...model, targetId: owner})
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return {version: 1, sprites: ids, ...(list.length ? {variables: list} : {}), scripts};
}
