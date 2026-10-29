import {validateResourceView,getResourceCostume,getResourceSound} from './resources.mjs';
// Studio-owned wire contract; no Blockly, Scratch or DOM imports.
export const programLimits = Object.freeze({bytes: 65536, nodes: 300, depth: 8, scripts: 16, variables: 16});
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
export function validateProgram(ir,{resourceView,resourceOwnerId='hero'}={}) {
  if(resourceView)resourceView=validateResourceView(resourceView);
  let currentSourceBlockId = null;
  try {
  let encoded;
  try { encoded = JSON.stringify(ir); } catch { fail('not JSON serializable'); }
  if (!encoded || new TextEncoder().encode(encoded).length > programLimits.bytes) fail('size limit');
  object(ir, ['version', 'scripts'], ['variables']);
  if (ir.version !== 0) fail('unsupported version');
  const ids = new Set(); let nodes = 0;
  function source(node, depth) {
    currentSourceBlockId = node?.sourceBlockId ?? null;
    if (++nodes > programLimits.nodes || depth > programLimits.depth) fail('node/depth limit');
    text(node.sourceBlockId);
    if (ids.has(node.sourceBlockId)) fail(`duplicate source ID ${node.sourceBlockId}`);
    ids.add(node.sourceBlockId);
  }
  const variables = new Map();
  if (ir.variables !== undefined && (!Array.isArray(ir.variables) || ir.variables.length > programLimits.variables)) fail('variable limit');
  for (const model of ir.variables ?? []) {
    object(model, ['id', 'name', 'initialValue'], ['scope']); text(model.id); text(model.name, 64); number(model.initialValue);
    if (model.scope !== undefined && !['local', 'global'].includes(model.scope)) fail('unsupported variable scope');
    if (variables.has(model.id)) fail('duplicate variable');
    variables.set(model.id, model.name);
  }
  function reference(node) {
    text(node.variableId); text(node.name, 64);
    if (variables.get(node.variableId) !== node.name) fail(`unknown variable at ${node.sourceBlockId}`);
  }
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
        case 'playSound': object(node, [...common, 'sound', 'wait']); if (typeof node.wait !== 'boolean'||(resourceView?!getResourceSound(resourceView,node.sound,resourceOwnerId):node.sound!=='tone')) fail('unsupported sound'); break;
        case 'setCostume': object(node, [...common, 'costume']); if (resourceView?!getResourceCostume(resourceView,node.costume,resourceOwnerId):!['hero','hero-alt'].includes(node.costume)) fail('unsupported costume'); break;
        default: fail(`unsupported operation ${node.kind}`);
      }
    }
  }
  if (!Array.isArray(ir.scripts) || ir.scripts.length > programLimits.scripts) fail('script limit');
  for (const script of ir.scripts) {
    currentSourceBlockId = script?.sourceBlockId ?? null;
    const extra = script?.event === 'key' ? ['key'] : script?.event === 'message' ? ['message'] : [];
    object(script, ['event', 'sourceBlockId', 'body', ...extra]); source(script, 0);
    if (!['start', 'key', 'click', 'message', 'clone'].includes(script.event)) fail('unsupported event');
    if (script.event === 'message') text(script.message, 64);
    if (script.event === 'key' && (typeof script.key !== 'string' || !/^(space|up arrow|down arrow|left arrow|right arrow|[a-z0-9])$/.test(script.key))) fail('unsupported key');
    statements(script.body, 1);
  }
  return ir;
  } catch (error) {
    if (typeof currentSourceBlockId === 'string' && currentSourceBlockId.length <= 128 && currentSourceBlockId.trim()) error.sourceBlockId = currentSourceBlockId;
    throw error;
  }
}
