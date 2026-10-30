// Read-only Studio DTOs. No DOM, editor, transport or VM dependencies.
const fail = detail => { throw new Error(`Lectura de escena inválida: ${detail}`); };
function object(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(label);
  const keys = Object.keys(value);
  if (keys.length !== expected.length || keys.some(key => !expected.includes(key)) ||
      expected.some(key => !Object.hasOwn(value, key))) fail(`${label}: propiedades no admitidas`);
}
function text(value, limit, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > limit) fail(label);
}
function number(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1_000_000) fail(label);
}

// Same sprite ID syntax as gg.sprites@0.3.0 (scene2d-objects.mjs), kept local:
// this DTO module has no pack or contract imports.
const spriteId = value => typeof value === 'string' && /^[A-Za-z0-9:_-]{1,128}$/.test(value) && !['__proto__', 'prototype', 'constructor', 'stage'].includes(value);
const complete = (list, copy) => !copy.some((_, index) => !Object.hasOwn(list, index)) && Object.keys(copy).length === copy.length;
// Two shapes. The single hero (gg.sprites 0.1.0/0.2.0 and hero-only scenes):
// exactly as before. Objects (scene2d-multi-sprite 2.1): 1–8 sprites with
// their visible names, and every local variable names its sprite (targetId),
// at most 16 per sprite.
export function validateSceneSnapshot(snapshot) {
  object(snapshot, ['sprites', 'variables'], 'snapshot');
  if (!Array.isArray(snapshot.sprites) || snapshot.sprites.length < 1 || snapshot.sprites.length > 8) fail('se requiere entre 1 y 8 sprites');
  const first = snapshot.sprites[0];
  const legacy = snapshot.sprites.length === 1 && first?.id === 'hero' && first?.name === 'hero' && Array.isArray(snapshot.variables) &&
    snapshot.variables.every(variable => !variable || typeof variable !== 'object' || !Object.hasOwn(variable, 'targetId'));
  const spriteIds = new Set();
  const sprites = snapshot.sprites.map(sprite => {
    object(sprite, ['id', 'name', 'x', 'y'], 'sprite');
    if (legacy ? sprite.id !== 'hero' || sprite.name !== 'hero' : !spriteId(sprite.id)) fail('sprite no admitido');
    if (!legacy) text(sprite.name, 32, 'nombre de sprite');
    if (spriteIds.has(sprite.id)) fail('ID de sprite duplicado');
    spriteIds.add(sprite.id);
    number(sprite.x, 'posición x'); number(sprite.y, 'posición y');
    return {id: sprite.id, name: sprite.name, x: sprite.x, y: sprite.y};
  });
  if (!complete(snapshot.sprites, sprites)) fail('lista de sprites incompleta');
  if (!Array.isArray(snapshot.variables) || snapshot.variables.length > 16 * sprites.length) fail('límite de variables');
  const ids = new Set(), owned = new Map();
  const variables = snapshot.variables.map(variable => {
    object(variable, legacy ? ['id', 'name', 'value'] : ['id', 'name', 'value', 'targetId'], 'variable');
    text(variable.id, 128, 'ID de variable'); text(variable.name, 64, 'nombre de variable');
    number(variable.value, 'valor de variable');
    if (ids.has(variable.id)) fail('ID de variable duplicado');
    ids.add(variable.id);
    if (legacy) return {id: variable.id, name: variable.name, value: variable.value};
    if (!spriteIds.has(variable.targetId)) fail('variable de un sprite desconocido');
    owned.set(variable.targetId, (owned.get(variable.targetId) ?? 0) + 1);
    if (owned.get(variable.targetId) > 16) fail('límite de variables');
    return {id: variable.id, name: variable.name, value: variable.value, targetId: variable.targetId};
  });
  // map skips array holes; a wire DTO must contain actual variable records.
  if (!complete(snapshot.variables, variables)) fail('lista de variables incompleta');
  return {sprites, variables};
}

export function createSceneInspection({readScene, getScope, onChange = () => {}}) {
  if (typeof readScene !== 'function' || typeof getScope !== 'function' || typeof onChange !== 'function') {
    throw new TypeError('Scene inspection requires readScene, getScope and onChange functions');
  }
  let value = {snapshot: null, status: 'empty', error: null};
  let sequence = 0;
  const state = () => structuredClone(value);
  const notify = () => { onChange(state()); return state(); };
  function scope() {
    const current = getScope();
    return current && typeof current.sessionId === 'string' && current.sessionId.trim() &&
      Number.isSafeInteger(current.revision) && current.revision >= 0
      ? {sessionId: current.sessionId, revision: current.revision} : null;
  }
  function current(token, captured) {
    if (token !== sequence) return false;
    const latest = scope();
    return latest?.sessionId === captured.sessionId && latest.revision === captured.revision;
  }
  function invalidate() {
    sequence++;
    value = {snapshot: null, status: 'empty', error: null};
    return notify();
  }
  async function refresh() {
    const captured = scope();
    if (!captured) return invalidate();
    const token = ++sequence;
    value = {...value, status: 'loading', error: null};
    notify();
    try {
      const result = await readScene({...captured});
      if (!current(token, captured)) return state();
      const snapshot = validateSceneSnapshot(result);
      value = {snapshot, status: 'ready', error: null};
    } catch (error) {
      if (!current(token, captured)) return state();
      value = {...value, status: 'error', error: String(error?.message ?? error).slice(0, 1024)};
    }
    return notify();
  }
  return Object.freeze({refresh, invalidate, state});
}
