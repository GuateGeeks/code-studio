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
  function statements(body, depth) {
    if (!Array.isArray(body)) fail('expected statement list');
    for (const node of body) {
      if (!node || typeof node !== 'object') fail('expected statement');
      const common = ['kind', 'sourceBlockId']; source(node, depth);
      switch (node.kind) {
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
