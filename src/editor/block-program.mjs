import * as Blockly from 'blockly';
import 'blockly/blocks';

import {createContributions, registerContributions} from './contributions.mjs';
import {authorizeProgram} from '../contracts/pack-broker.mjs';
import {getWorkspaceResourceView,setWorkspaceResourceView} from './resource-menus.mjs';
import {registerCoreBlocks} from './core-blocks.mjs';
import {offeredCoreStructures} from '../contracts/language-table.mjs';
registerCoreBlocks(Blockly);
registerContributions(Blockly, createContributions());

function blockError(message, block) {
  return Object.assign(new Error(message), block?.id ? {sourceBlockId: block.id} : {});
}
function unsupported(block) {
  throw blockError(`Unsupported block ${block.type} (${block.id})`, block);
}

function numericInput(block, name) {
  const value = block.getInputTargetBlock(name);
  if (!value || value.type !== 'math_number') unsupported(value ?? block);
  const number = Number(value.getFieldValue('NUM'));
  if (!Number.isFinite(number)) throw blockError(`Invalid number at ${value.id}`, value);
  return number;
}

export function workspaceToIR(workspace, {capabilities = null, resourceView = getWorkspaceResourceView(workspace), scriptOrder = null} = {}) {
  const contributions = registerContributions(Blockly, createContributions(capabilities));
  // Scope belongs to the GG program, identified by the stable Blockly variable
  // ID. A global assignment declares that ID for all scripts and clone reads.
  const globalIds = new Set(workspace.getAllBlocks(false).filter(block => contributions.statements.get(block.type)?.rule.declaresGlobal).map(block => block.getFieldValue(contributions.statements.get(block.type).rule.declaresGlobal)));
  function variable(block) {
    const model = workspace.getVariableMap().getVariableById(block.getFieldValue('VAR'));
    if (!model || model.type !== '') throw blockError(`Invalid numeric variable at ${block.id}`, block);
    return {variableId: model.getId(), name: model.name};
  }
  function lower(block, contribution, readExpression) {
    const {rule, config} = contribution;
    const node = {kind: rule.kind, sourceBlockId: block.id};
    if (rule.variableField) {
      const model = workspace.getVariableMap().getVariableById(block.getFieldValue(rule.variableField));
      if (!model || model.type !== '') throw blockError('Invalid numeric variable at ' + block.id, block);
      node.variableId = model.getId(); node.name = model.name;
    }
    for (const [key, source] of Object.entries(rule.values ?? rule.fields ?? {})) {
      let value;
      if (Object.hasOwn(source, 'literal')) value = source.literal;
      else if (source.config) value = config[source.config];
      else if (source.input) value = source.type === 'number' ? numericInput(block, source.input) : readExpression(block.getInputTargetBlock(source.input));
      else if (source.field) {
        value = block.getFieldValue(source.field);
        if (source.type === 'message') {
          if (typeof value !== 'string' || !value.trim() || value.trim().length > 64) throw blockError('Invalid message at ' + block.id, block);
          value = value.trim();
        }
        if (source.type === 'key') {
          if (typeof value !== 'string') throw blockError('Invalid key at ' + block.id, block);
          value = value.toLowerCase();
          if (!/^(space|up arrow|down arrow|left arrow|right arrow|[a-z0-9])$/.test(value)) throw blockError('Invalid key at ' + block.id, block);
        }
        if (source.type === 'text' && (typeof value !== 'string' || value.length > 330 || /[\u0000-\u001f\u007f]/.test(value)))
          throw blockError('Texto no válido (hasta 330 caracteres, sin saltos de línea) en ' + block.id, block);
      } else throw blockError('Unsupported declarative lowering at ' + block.id, block);
      if (source.resource && !(resourceView?.[source.resource] ?? []).some(item => item.id === value && item.ownerId === source.ownerId)) throw blockError('Recurso no disponible en este objeto: ' + value,block);
      if (source.enum && !source.enum.includes(value)) throw blockError('Unsupported local ' + key + ' ' + value + ' at ' + block.id, block);
      if ((source.minimum !== undefined && value < source.minimum) || (source.maximum !== undefined && value > source.maximum)) throw blockError('Invalid ' + (source.label ?? key) + ' at ' + block.id, block);
      node[key] = value;
    }
    if (node.variableId) {
      const existing = workspace.getVariableMap().getVariableById(node.variableId);
      if (existing) node.name = existing.name;
    }
    return node;
  }
  function expression(block) {
    if (!block) throw new Error('Missing numeric expression');
    if (block.type === 'math_number') {
      const number = Number(block.getFieldValue('NUM'));
      if (!Number.isFinite(number)) throw blockError(`Invalid number at ${block.id}`, block);
      return number;
    }
    if (contributions.expressions.has(block.type)) return lower(block, contributions.expressions.get(block.type), expression);
    if (block.type === 'variables_get') return {kind: 'variable', ...variable(block), sourceBlockId: block.id};
    unsupported(block);
  }
  function condition(block) {
    if (block?.type !== 'logic_compare') unsupported(block ?? {type: 'missing condition', id: 'unknown'});
    const operator = block.getFieldValue('OP');
    if (!['EQ', 'LT', 'GT'].includes(operator)) throw blockError(`Unsupported comparison ${operator} at ${block.id}`, block);
    return {kind: 'compare', operator, left: expression(block.getInputTargetBlock('A')), right: expression(block.getInputTargetBlock('B')), sourceBlockId: block.id};
  }
  // E1 core structures exist only where an active pack offers them.
  const offered = offeredCoreStructures(contributions.plan.packs);
  const conditionOf = block => { const target = block.getInputTargetBlock('CONDITION'); if (!target) throw blockError('Falta la condición en ' + block.id, block); return condition(target); };
  const structure = block => { const kind = {gg_forever: 'forever', gg_repeat_until: 'repeatUntil', gg_wait_until: 'waitUntil', gg_stop_script: 'stopScript'}[block.type]; if (kind && !offered.has(kind)) unsupported(block); return kind; };
  function statements(first) {
    const nodes = [];
    for (let block = first; block; block = block.getNextBlock()) {
      const core = structure(block);
      if (core === 'forever') nodes.push({kind: 'forever', body: statements(block.getInputTargetBlock('DO')), sourceBlockId: block.id});
      else if (core === 'repeatUntil') nodes.push({kind: 'repeatUntil', condition: conditionOf(block), body: statements(block.getInputTargetBlock('DO')), sourceBlockId: block.id});
      else if (core === 'waitUntil') nodes.push({kind: 'waitUntil', condition: conditionOf(block), sourceBlockId: block.id});
      else if (core === 'stopScript') nodes.push({kind: 'stopScript', sourceBlockId: block.id});
      else if (block.type === 'controls_repeat_ext') {
        const count = numericInput(block, 'TIMES');
        if (!Number.isInteger(count) || count < 0) throw blockError(`Invalid repeat count at ${block.id}`, block);
        nodes.push({kind: 'repeat', count, body: statements(block.getInputTargetBlock('DO')), sourceBlockId: block.id});
      } else if (contributions.statements.has(block.type)) {
        nodes.push(lower(block, contributions.statements.get(block.type), expression));
      } else if (['variables_set', 'math_change'].includes(block.type)) {
        nodes.push({kind: block.type === 'math_change' ? 'changeVariable' : 'setVariable', ...variable(block), value: expression(block.getInputTargetBlock(block.type === 'math_change' ? 'DELTA' : 'VALUE')), sourceBlockId: block.id});
      } else if (block.type === 'controls_if') {
        if (block.getInput('IF1')) throw blockError(`Unsupported else-if at ${block.id}`, block);
        nodes.push({kind: 'if', condition: condition(block.getInputTargetBlock('IF0')), body: statements(block.getInputTargetBlock('DO0')), elseBody: statements(block.getInputTargetBlock('ELSE')), sourceBlockId: block.id});
      } else unsupported(block);
    }
    return nodes;
  }
  let roots = workspace.getTopBlocks(true);
  if (scriptOrder !== null && scriptOrder !== undefined) {
    const byID = new Map(roots.map(block => [block.id, block]));
    if (!Array.isArray(scriptOrder) || scriptOrder.length !== roots.length || scriptOrder.length > 16 ||
        new Set(scriptOrder).size !== scriptOrder.length || scriptOrder.some(id => !byID.has(id)))
      throw new Error('El orden de eventos no coincide con los bloques del programa.');
    roots = scriptOrder.map(id => byID.get(id));
  }
  const ir = {
    version: 0,
    scripts: roots.map(block => {
      const contribution = contributions.hats.get(block.type);
      if (!contribution) unsupported(block);
      const script = lower(block, {...contribution, rule: {kind: 'hat', fields: contribution.rule.fields}}, expression);
      delete script.kind;
      script.event = contribution.rule.event;
      script.body = statements(block.getInputTargetBlock(contribution.rule.body));
      return script;
    })
  };
  const variables = workspace.getVariableMap().getAllVariables();
  if (variables.some(model => model.type !== '')) throw new Error('Only numeric scalar variables are supported');
  if (variables.length) ir.variables = variables.map(model => ({id: model.getId(), name: model.name, initialValue: 0, ...(globalIds.has(model.getId()) ? {scope: 'global'} : {})})).sort((a, b) => a.id.localeCompare(b.id));
  return authorizeProgram(capabilities, ir, {resourceView});
}

export function validateWorkspaceResources(state, {capabilities = null,resourceView = null} = {}) {
  const definitions = createContributions(capabilities).fieldMenus ?? [];
  const byType = new Map(definitions.map(menu => [menu.type,menu]));
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { for (const item of value) visit(item); return; }
    const menu = byType.get(value.type);
    if (menu) {
      const id = value.fields?.[menu.field];
      if (typeof id !== 'string' || !(resourceView?.[menu.resource] ?? []).some(item => item.id === id && item.ownerId === menu.ownerId)) throw blockError('Recurso no disponible en este objeto: ' + String(id),value);
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(state);
}

export function loadWorkspace(state, {capabilities = null,resourceView = null} = {}) {
  registerContributions(Blockly, createContributions(capabilities));
  validateWorkspaceResources(state,{capabilities,resourceView});
  const workspace = new Blockly.Workspace();
  setWorkspaceResourceView(workspace,resourceView);
  try { Blockly.serialization.workspaces.load(state, workspace); }
  catch (error) { workspace.dispose(); throw error; }
  return workspace;
}

export function saveWorkspace(workspace) {
  return Blockly.serialization.workspaces.save(workspace);
}


