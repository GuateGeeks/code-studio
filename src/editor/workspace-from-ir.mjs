import {programLimits} from '../contracts/program-contract.mjs';
import {authorizeProgram} from '../contracts/pack-broker.mjs';
import {canonicalPackData} from '../contracts/packs.mjs';
import {createContributions} from './contributions.mjs';
import {loadWorkspace, workspaceToIR} from './block-program.mjs';

const fail = (message, node) => { throw Object.assign(new Error('IR → Blockly: ' + message),
  node?.sourceBlockId ? {sourceBlockId: node.sourceBlockId} : {}); };
const plain = value => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

// Sidecar for numeric blocks erased by IR0's primitive numbers. Capture only
// identity/connections, never old values or executable workspace state.
export function captureNumericInputIdentity(workspace) {
  return workspace.getAllBlocks(false).filter(block => block.type === 'math_number').map(block => {
    const parent = block.getParent();
    const input = parent?.inputList.find(input => input.connection?.targetBlock() === block);
    if (!input) fail('bloque numérico sin entrada representable', {sourceBlockId: block.id});
    return {parentId: parent.id, inputName: input.name, id: block.id, shadow: block.isShadow()};
  }).sort((a, b) => a.id.localeCompare(b.id));
}

// Inverts only installed declarative rules. The real forward translator below
// is the final check: no newly invented initialization, event or coercion.
export function workspaceFromIR(input, {capabilities = null, resourceView = null, layout, numericInputIdentity, scriptOrder = null, ownerId = null} = {}) {
  const ir = authorizeProgram(capabilities, input, {resourceView, ownerId});
  const contributions = createContributions(capabilities);
  const declarations = new Map((ir.variables ?? []).map(variable => [variable.id, variable]));
  const usedIds = new Set(), sourceNodes = new Map(), fieldsUsed = new Set();
  function collect(value) {
    if (!value || typeof value !== 'object') return;
    if (value.sourceBlockId) { usedIds.add(value.sourceBlockId); sourceNodes.set(value.sourceBlockId, value); }
    for (const child of Object.values(value)) if (child && typeof child === 'object') collect(child);
  }
  collect(ir);
  const numericInputs = new Map();
  const inputKey = (parentId, inputName) => JSON.stringify([parentId, inputName]);
  const validID = id => typeof id === 'string' && id.length <= 128 && Boolean(id.trim());
  if (numericInputIdentity !== undefined) {
    if (!Array.isArray(numericInputIdentity) || numericInputIdentity.length > programLimits.nodes * 2)
      fail('mapa de identidad numérica inválido');
    for (const entry of numericInputIdentity) {
      if (!plain(entry) || Object.keys(entry).length !== 4 ||
          !['parentId', 'inputName', 'id', 'shadow'].every(key => Object.hasOwn(entry, key)) ||
          !validID(entry.parentId) || !validID(entry.inputName) || !validID(entry.id) ||
          typeof entry.shadow !== 'boolean' || !sourceNodes.has(entry.parentId) || usedIds.has(entry.id))
        fail('mapa de identidad numérica inválido');
      const key = inputKey(entry.parentId, entry.inputName);
      if (numericInputs.has(key)) fail('entrada duplicada en mapa de identidad numérica');
      numericInputs.set(key, entry);
      usedIds.add(entry.id); // Reserve even IDs consumed later, before allocating any new ones.
    }
  }
  const consumedNumericInputs = new Set();
  let numberId = 0;
  function numberInput(value, parentId, inputName) {
    const key = inputKey(parentId, inputName), entry = numericInputs.get(key);
    let id = entry?.id;
    if (entry) {
      if (consumedNumericInputs.has(key)) fail('entrada numérica reutilizada');
      consumedNumericInputs.add(key);
    } else {
      do { id = 'gg-number-' + numberId++; } while (usedIds.has(id));
      usedIds.add(id);
    }
    return {[entry?.shadow === false ? 'block' : 'shadow']: {type: 'math_number', id, fields: {NUM: value}}};
  }
  const attach = block => block ? {block} : undefined;
  const positions = new Map();
  if (layout !== undefined && layout !== null) {
    let entries;
    if (Array.isArray(layout)) entries = layout.map(item => {
      if (!plain(item) || Object.keys(item).length !== 3 || !Object.hasOwn(item, 'sourceBlockId') || !Object.hasOwn(item, 'x') || !Object.hasOwn(item, 'y')) fail('layout inválido');
      return [item.sourceBlockId, {x: item.x, y: item.y}];
    });
    else if (layout instanceof Map) entries = [...layout];
    else if (plain(layout)) entries = Object.entries(layout);
    else fail('layout inválido');
    for (const [id, point] of entries) {
      if (!sourceNodes.has(id) || positions.has(id) || !plain(point) || Object.keys(point).length !== 2 ||
          !['x', 'y'].every(key => Object.hasOwn(point, key) && typeof point[key] === 'number' && Number.isFinite(point[key]))) fail('posición de layout inválida', sourceNodes.get(id));
      positions.set(id, {x: point.x, y: point.y});
    }
  }
  function variableField(id) {
    if (!declarations.has(id)) fail('variable no declarada');
    fieldsUsed.add(id); return {id};
  }
  function reverse(node, type, contribution, category) {
    const {rule, config} = contribution, values = rule.values ?? rule.fields ?? {};
    if (category === 'hats' ? rule.event !== node.event : rule.kind !== node.kind) return null;
    const fields = {}, inputs = {};
    if (rule.variableField) {
      if (!declarations.has(node.variableId) || (rule.declaresGlobal && declarations.get(node.variableId).scope !== 'global')) return null;
      fields[rule.variableField] = {id: node.variableId};
    }
    for (const [key, source] of Object.entries(values)) {
      const value = node[key];
      if (Object.hasOwn(source, 'literal')) { if (value !== source.literal) return null; }
      else if (source.config) { if (value !== config[source.config]) return null; }
      else if (source.field) {
        if (source.enum && !source.enum.includes(value)) return null;
        if (source.resource && !(resourceView?.[source.resource] ?? []).some(item => item.id === value && item.ownerId === (ownerId ?? source.ownerId))) return null;
        fields[source.field] = value;
      } else if (!source.input) return null;
      if ((source.minimum !== undefined && value < source.minimum) || (source.maximum !== undefined && value > source.maximum)) return null;
    }
    // Only after matching constants/config may this candidate allocate IDs or
    // mark variable fields. Failed alternatives have no observable effects.
    if (rule.variableField) fields[rule.variableField] = variableField(node.variableId);
    for (const [key, source] of Object.entries(values)) if (source.input) {
      if (source.type === 'number' && typeof node[key] !== 'number') fail('entrada numérica no representable', node);
      inputs[source.input] = source.type === 'number' ? numberInput(node[key], node.sourceBlockId, source.input) : expression(node[key], node.sourceBlockId, source.input);
    }
    const result = {type, id: node.sourceBlockId};
    if (Object.keys(fields).length) result.fields = fields;
    if (Object.keys(inputs).length) result.inputs = inputs;
    return result;
  }
  function contributed(node, category) {
    // Config-bound reporters/statements retain their pack UI when representable.
    const candidates = [...contributions[category]].sort(([a, x], [b, y]) => {
      const configured = value => Object.values(value.rule.values ?? value.rule.fields ?? {}).some(source => source.config);
      return Number(configured(y)) - Number(configured(x)) || a.localeCompare(b);
    });
    for (const [type, contribution] of candidates) {
      const result = reverse(node, type, contribution, category);
      if (result) return {block: result, rule: contribution.rule};
    }
    return null;
  }
  function expression(value, parentId, inputName) {
    if (typeof value === 'number') return numberInput(value, parentId, inputName);
    const local = contributed(value, 'expressions');
    if (local) return {block: local.block};
    if (value.kind === 'variable') return {block: {type: 'variables_get', id: value.sourceBlockId, fields: {VAR: variableField(value.variableId)}}};
    if (value.kind === 'compare') return {block: {type: 'logic_compare', id: value.sourceBlockId, fields: {OP: value.operator},
      inputs: {A: expression(value.left, value.sourceBlockId, 'A'), B: expression(value.right, value.sourceBlockId, 'B')}}};
    fail('expresión no representable', value);
  }
  function statement(node) {
    if (node.kind === 'repeat') {
      const inputs = {TIMES: numberInput(node.count, node.sourceBlockId, 'TIMES')}, body = stack(node.body);
      if (body) inputs.DO = attach(body);
      return {type: 'controls_repeat_ext', id: node.sourceBlockId, inputs};
    }
    if (node.kind === 'if') {
      const inputs = {IF0: expression(node.condition, node.sourceBlockId, 'IF0')}, yes = stack(node.body), no = stack(node.elseBody);
      if (yes) inputs.DO0 = attach(yes);
      if (no) inputs.ELSE = attach(no);
      return {type: 'controls_if', id: node.sourceBlockId, extraState: {hasElse: true}, inputs};
    }
    // E1 core structures; the final workspaceToIR check rejects them where no pack offers them.
    if (node.kind === 'forever' || node.kind === 'repeatUntil') {
      const inputs = node.kind === 'repeatUntil' ? {CONDITION: expression(node.condition, node.sourceBlockId, 'CONDITION')} : {}, body = stack(node.body);
      if (body) inputs.DO = attach(body);
      return {type: node.kind === 'forever' ? 'gg_forever' : 'gg_repeat_until', id: node.sourceBlockId, ...(Object.keys(inputs).length ? {inputs} : {})};
    }
    if (node.kind === 'waitUntil') return {type: 'gg_wait_until', id: node.sourceBlockId, inputs: {CONDITION: expression(node.condition, node.sourceBlockId, 'CONDITION')}};
    if (node.kind === 'stopScript') return {type: 'gg_stop_script', id: node.sourceBlockId};
    const local = contributed(node, 'statements');
    if (local) return local.block;
    if (['setVariable', 'changeVariable'].includes(node.kind)) {
      const change = node.kind === 'changeVariable';
      return {type: change ? 'math_change' : 'variables_set', id: node.sourceBlockId,
        fields: {VAR: variableField(node.variableId)}, inputs: {[change ? 'DELTA' : 'VALUE']: expression(node.value, node.sourceBlockId, change ? 'DELTA' : 'VALUE')}};
    }
    fail('operación no representable mediante contribuciones instaladas', node);
  }
  function stack(body) {
    let first = null, previous;
    for (const node of body) {
      const block = statement(node);
      if (previous) previous.next = {block}; else first = block;
      previous = block;
    }
    return first;
  }
  const blocks = ir.scripts.map((script, index) => {
    const local = contributed(script, 'hats');
    if (!local) fail('evento no representable mediante contribuciones instaladas', script);
    const block = local.block, body = stack(script.body);
    if (body) block.inputs = {...block.inputs, [local.rule.body]: attach(body)};
    Object.assign(block, positions.get(script.sourceBlockId) ?? {x: 20, y: 20 + index * 220});
    return block;
  });
  if (consumedNumericInputs.size !== numericInputs.size)
    fail('entrada inexistente o no numérica en mapa de identidad numérica');
  const variables = (ir.variables ?? []).filter(variable => {
    const supplied = contributions.plan.variables.find(item => item.id === variable.id);
    return fieldsUsed.has(variable.id) || !supplied || canonicalPackData(supplied) !== canonicalPackData(variable);
  }).map(variable => ({id: variable.id, name: variable.name, type: ''}));
  const state = {blocks: {languageVersion: 0, blocks}, ...(variables.length ? {variables} : {})};
  const workspace = loadWorkspace(state, {capabilities, resourceView, ownerId});
  try {
    const restored = workspaceToIR(workspace, {capabilities, resourceView, scriptOrder, ownerId});
    const normalize = value => {
      const result = structuredClone(value);
      if (result.variables?.length) result.variables = result.variables.map(variable => ({...variable, scope: variable.scope ?? 'local'})).sort((a, b) => a.id.localeCompare(b.id));
      else delete result.variables;
      return canonicalPackData(result);
    };
    if (normalize(restored) !== normalize(ir)) fail('la autoría no admite un roundtrip exacto (iniciales, ámbito, texto o orden de scripts)');
  } finally { workspace.dispose(); }
  return state;
}
