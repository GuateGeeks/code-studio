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

export function validateSceneSnapshot(snapshot) {
  object(snapshot, ['sprites', 'variables'], 'snapshot');
  if (!Array.isArray(snapshot.sprites) || snapshot.sprites.length !== 1) fail('se requiere un sprite hero');
  const sprite = snapshot.sprites[0];
  object(sprite, ['id', 'name', 'x', 'y'], 'sprite');
  if (sprite.id !== 'hero' || sprite.name !== 'hero') fail('sprite no admitido');
  number(sprite.x, 'posición x'); number(sprite.y, 'posición y');
  if (!Array.isArray(snapshot.variables) || snapshot.variables.length > 16) fail('límite de variables');
  const ids = new Set();
  const variables = snapshot.variables.map(variable => {
    object(variable, ['id', 'name', 'value'], 'variable');
    text(variable.id, 128, 'ID de variable'); text(variable.name, 64, 'nombre de variable');
    number(variable.value, 'valor de variable');
    if (ids.has(variable.id)) fail('ID de variable duplicado');
    ids.add(variable.id);
    return {id: variable.id, name: variable.name, value: variable.value};
  });
  // map skips array holes; a wire DTO must contain actual variable records.
  if (variables.some((_, index) => !Object.hasOwn(snapshot.variables, index)) ||
      Object.keys(variables).length !== variables.length) fail('lista de variables incompleta');
  return {sprites: [{id: 'hero', name: 'hero', x: sprite.x, y: sprite.y}], variables};
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
