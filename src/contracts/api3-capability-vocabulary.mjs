// API v3 vocabulary for 3D and web, derived from the operation profile.
// Dependency-free: the unbundled Python worker imports it too.
const snake = name => name.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
function leaves(schema, prefix = '') {
  if (schema?.type !== 'object') return [prefix];
  return Object.entries(schema.properties).flatMap(([name, child]) => leaves(child, prefix ? prefix + '.' + name : name));
}
const eventCatalog = [
  {js: 'onStart', python: 'on_start', id: 'start'},
  {js: 'onKey', python: 'on_key', id: 'key', option: true},
  {js: 'onClick', python: 'on_click', id: 'click', target: true},
  {js: 'onInput', python: 'on_input', id: 'input', target: true},
  {js: 'onSubmit', python: 'on_submit', id: 'submit', target: true}
];
export function capabilityApi3Vocabulary(profile) {
  if (!profile?.operations || !profile?.events) throw new Error('API v3: perfil de contexto ausente.');
  const namespace = profile.contextId === 'scene3d' ? 'scene' : 'app';
  const targeted = {}, global = {}, python = {targeted: {}, global: {}, events: {}};
  for (const operation of profile.operations) {
    const name = operation.id.split('.').at(-1);
    const all = leaves(operation.argsSchema).filter(Boolean);
    const entry = {id: operation.id, name, publicPath: operation.publicPath, leaves: all.filter(leaf => leaf !== 'targetId'), returns: operation.result !== 'void'};
    const hasTarget = all.includes('targetId');
    (hasTarget ? targeted : global)[name] = entry;
    (hasTarget ? python.targeted : python.global)[snake(name)] = entry;
  }
  const allowed = new Set(profile.events.map(event => event.id));
  const events = {};
  for (const event of eventCatalog) if (allowed.has(event.id)) { events[event.js] = event; python.events[event.python] = event; }
  return {namespace, targeted, global, events, python, compare: {'==': 'EQ', '===': 'EQ', '<': 'LT', '>': 'GT'}};
}
// event.value | event.key | event.targetId | event.values["id"] | event.values.id
export function capabilityEventPath(node) {
  if (node.type !== 'MemberExpression') return null;
  if (!node.computed && ['value', 'key', 'targetId'].includes(node.property.name) && node.object.type === 'Identifier') return node.property.name;
  if (node.object.type === 'MemberExpression' && !node.object.computed && node.object.property.name === 'values' && node.object.object.type === 'Identifier') {
    const key = node.computed ? (node.property.type === 'Literal' && typeof node.property.value === 'string' ? node.property.value : null) : node.property.name;
    return key && /^[-A-Za-z0-9:_]+$/.test(key) ? 'values.' + key : null;
  }
  return null;
}
export const capabilityApi3Prelude = 'const gg_number = value => { if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1000000) throw new Error("Número fuera del dominio finito ±1e6"); return value; }; const gg_seconds = value => { gg_number(value); if (value < 0 || value > 60) throw new Error("Espera fuera de 0..60 segundos"); return value; }; const gg_compare = (op,left,right) => { const same = typeof left === typeof right; if (op === "EQ") return same && left === right; if (!same || !["number","string"].includes(typeof left)) throw new Error("Comparación de tipos incompatibles"); return op === "LT" ? left < right : left > right; }; const gg_event = (event,path) => { let value=event; for (const part of path.split(".")) { if (!value || !Object.hasOwn(value,part)) throw new Error("Campo de evento ausente"); value=value[part]; } return value; }; ';
