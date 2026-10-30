import {validateProgram, programLimits} from './contracts/program-contract.mjs';
import {scene2DNumericSlots} from './packs/scene2d-forms.mjs';

// Studio-owned correspondence over validated data, with no parser or editor
// internals. Candidate IDs are temporary and never trusted as prior identity.
const childKeys = ['body', 'elseBody', 'condition', 'left', 'right', 'steps', 'value', 'degrees', 'direction', 'x', 'y', 'dx', 'dy', 'size', 'delta'];
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).filter(key => key !== 'sourceBlockId').sort().map(key => [key, canonical(value[key])])) : value;
const signature = node => JSON.stringify(canonical(node));
const type = node => node.event ? 'event:' + node.event : node.kind + (node.kind === 'playSound' ? ':' + node.wait : '');
function nodes(root) {
  const out = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.sourceBlockId) out.push(value);
    for (const child of Object.values(value)) if (child && typeof child === 'object') visit(child);
  }
  visit(root); return out;
}
// Core slots, then the E1 sprite slots derived from the installed rules.
const numericSlots = node => ({
  move: {STEPS: node.steps}, wait: {SECONDS: node.seconds}, repeat: {TIMES: node.count},
  compare: {A: node.left, B: node.right}, setVariable: {VALUE: node.value}, changeVariable: {DELTA: node.value}
}[node.kind] ?? Object.fromEntries(Object.entries(scene2DNumericSlots[node.kind] ?? {}).map(([input, field]) => [input, node[field]])));

// Ordered tree edit distance: exact subtrees cost 0; a same-type edit costs 3;
// insertion/deletion costs 2. This prefers an exact anchor over two same-type
// replacements, while a single value edit retains the containing block.
function align(old, next) {
  const a = old.map(signature), b = next.map(signature);
  const cost = Array.from({length: old.length + 1}, () => new Uint16Array(next.length + 1));
  for (let i = old.length; i >= 0; i--) for (let j = next.length; j >= 0; j--) {
    if (i === old.length) cost[i][j] = 2 * (next.length - j);
    else if (j === next.length) cost[i][j] = 2 * (old.length - i);
    else cost[i][j] = Math.min(2 + cost[i + 1][j], 2 + cost[i][j + 1],
      (a[i] === b[j] ? 0 : type(old[i]) === type(next[j]) ? 3 : 10000) + cost[i + 1][j + 1]);
  }
  const pairs = [], usedOld = new Set(), usedNext = new Set();
  let i = 0, j = 0;
  while (i < old.length && j < next.length) {
    const edit = a[i] === b[j] ? 0 : type(old[i]) === type(next[j]) ? 3 : 10000;
    if (cost[i][j] === edit + cost[i + 1][j + 1]) {
      pairs.push([old[i], next[j]]); usedOld.add(i++); usedNext.add(j++);
    } else if (cost[i][j] === 2 + cost[i][j + 1]) j++;
    else i++;
  }
  // A moved exact subtree in the same list retains its identity as well.
  for (let n = 0; n < next.length; n++) if (!usedNext.has(n)) {
    const o = old.findIndex((_, k) => !usedOld.has(k) && a[k] === b[n]);
    if (o >= 0) { pairs.push([old[o], next[n]]); usedOld.add(o); usedNext.add(n); }
  }
  return pairs;
}

export function reconcileCodeViewIdentity(previous, candidate, {numericInputIdentity = [], layout = [], resourceView, idPrefix = '', ownerId = null} = {}) {
  const options = {resourceView, ...(ownerId ? {resourceOwnerId: ownerId, objectWorkspace: true} : {})};
  validateProgram(previous, options); validateProgram(candidate, options);
  const before = signature(candidate), ir = structuredClone(candidate);
  const oldNodes = nodes(previous), nextNodes = nodes(ir), oldIDs = new Set(oldNodes.map(node => node.sourceBlockId));
  if (!Array.isArray(numericInputIdentity) || numericInputIdentity.length > programLimits.nodes * 2) throw new Error('Identidad numérica inválida.');
  const reserved = new Set([...oldIDs, ...(previous.variables ?? []).map(v => v.id)]);
  const slots = new Set();
  for (const entry of numericInputIdentity) {
    const parent = oldNodes.find(node => node.sourceBlockId === entry?.parentId);
    const key = JSON.stringify([entry?.parentId, entry?.inputName]);
    if (!entry || Object.keys(entry).length !== 4 || !parent || typeof numericSlots(parent)[entry.inputName] !== 'number' ||
        typeof entry.id !== 'string' || !entry.id.trim() || entry.id.length > 128 ||
        typeof entry.shadow !== 'boolean' || slots.has(key) || reserved.has(entry.id)) throw new Error('Identidad numérica inválida.');
    slots.add(key); reserved.add(entry.id);
  }
  if (!Array.isArray(layout) || layout.length > programLimits.scripts) throw new Error('Posiciones de eventos inválidas.');
  const rootIDs = new Set(previous.scripts.map(script => script.sourceBlockId)), positions = new Set();
  for (const point of layout) {
    if (!point || Object.keys(point).length !== 3 || !rootIDs.has(point.sourceBlockId) || positions.has(point.sourceBlockId) ||
        !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Posiciones de eventos inválidas.');
    positions.add(point.sourceBlockId);
  }
  let sequence = 0;
  const fresh = () => { let id; do { id = 'gg-code-view-' + idPrefix + sequence++; } while (reserved.has(id)); reserved.add(id); return id; };
  // Names/scopes identify declarations; a new declaration receives fresh identity.
  const variableMap = new Map();
  for (const variable of ir.variables ?? []) {
    const old = (previous.variables ?? []).find(v => v.name === variable.name && (v.scope ?? 'local') === (variable.scope ?? 'local'));
    variableMap.set(variable.id, old?.id ?? fresh()); variable.id = variableMap.get(variable.id);
  }
  for (const node of nextNodes) if (node.variableId) node.variableId = variableMap.get(node.variableId) ?? node.variableId;
  const matched = new Set(), matches = [];
  function pair(old, next) {
    if (type(old) !== type(next)) return;
    matches.push({previousId: old.sourceBlockId, candidateId: next.sourceBlockId});
    next.sourceBlockId = old.sourceBlockId; matched.add(next);
    for (const key of childKeys) {
      if (Array.isArray(old[key]) && Array.isArray(next[key])) {
        for (const [a, b] of align(old[key], next[key])) pair(a, b);
      } else if (old[key]?.sourceBlockId && next[key]?.sourceBlockId) pair(old[key], next[key]);
    }
  }
  for (const [a, b] of align(previous.scripts, ir.scripts)) pair(a, b);
  for (const node of nextNodes) if (!matched.has(node)) node.sourceBlockId = fresh();
  const finalNodes = new Map(nextNodes.map(node => [node.sourceBlockId, node]));
  const numeric = [];
  const remembered = new Map(numericInputIdentity.map(entry => [JSON.stringify([entry.parentId, entry.inputName]), entry]));
  for (const node of finalNodes.values()) for (const [inputName, value] of Object.entries(numericSlots(node))) if (typeof value === 'number') {
    const entry = remembered.get(JSON.stringify([node.sourceBlockId, inputName]));
    numeric.push(entry ? {...entry} : {parentId: node.sourceBlockId, inputName, id: fresh(), shadow: true});
  }
  const roots = new Set(ir.scripts.map(script => script.sourceBlockId));
  const retainedLayout = layout.filter(point => roots.has(point.sourceBlockId)).map(point => ({...point}));
  const rootPoints = new Map(retainedLayout.map(point => [point.sourceBlockId, point]));
  for (let index = 0; index < ir.scripts.length;) {
    if (rootPoints.has(ir.scripts[index].sourceBlockId)) { index++; continue; }
    const start = index;
    while (index < ir.scripts.length && !rootPoints.has(ir.scripts[index].sourceBlockId)) index++;
    const before = start ? rootPoints.get(ir.scripts[start - 1].sourceBlockId) : null;
    const after = index < ir.scripts.length ? rootPoints.get(ir.scripts[index].sourceBlockId) : null;
    const count = index - start;
    for (let offset = 0; offset < count; offset++) {
      const fraction = (offset + 1) / (count + 1);
      const point = {sourceBlockId: ir.scripts[start + offset].sourceBlockId,
        x: before && after ? before.x + (after.x - before.x) * fraction : (before ?? after)?.x ?? 20,
        y: before && after ? before.y + (after.y - before.y) * fraction : before ? before.y + 220 * (offset + 1) :
          after ? after.y - 220 * (count - offset) : 20 + (start + offset) * 220};
      rootPoints.set(point.sourceBlockId, point); retainedLayout.push(point);
    }
  }
  validateProgram(ir, options);
  if (signature(ir) !== before) {
    // Variable IDs are identity too; compare semantics after normalizing them.
    const strip = value => JSON.stringify(value, (key, item) => ['sourceBlockId', 'variableId', 'id'].includes(key) ? undefined : item);
    if (strip(ir) !== strip(candidate)) throw new Error('La correspondencia alteró el programa candidato.');
  }
  return {ir, numericInputIdentity: numeric, layout: retainedLayout, matches, scriptOrder: ir.scripts.map(script => script.sourceBlockId)};
}
