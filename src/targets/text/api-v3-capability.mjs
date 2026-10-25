import {parse} from 'acorn';
import {capabilityApi3Vocabulary, capabilityApi3Prelude, capabilityEventPath} from '../../contracts/api3-capability-vocabulary.mjs';

// API v3 for 3D and web (ADR-011): readable text translated to the existing
// API2 form inside the language origin. The vocabulary comes from the
// operation profile itself (operations with a target become methods of that
// target, the rest hang from `scene`/`app`), so no list is written by hand.
// Edits never add line breaks; the API2 helpers go on the first line.

function located(message, node) {
  return Object.assign(new Error(message), node?.loc ? {lineNumber: node.loc.start.line, columnNumber: node.loc.start.column + 1} : {});
}
const calleeParts = node => node?.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.property.type === 'Identifier' ? [node.object.name, node.property.name] : node?.type === 'Identifier' ? [null, node.name] : null;
function literalValue(node) {
  if (node?.type === 'Literal' && ['number', 'string', 'boolean'].includes(typeof node.value)) return {value: node.value};
  if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return {value: -node.argument.value};
  return null;
}
function children(node) {
  const out = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'start' || key === 'end') continue;
    if (Array.isArray(value)) out.push(...value.filter(item => item && typeof item.type === 'string'));
    else if (value && typeof value.type === 'string') out.push(value);
  }
  return out;
}
const isFunction = node => ['FunctionExpression', 'ArrowFunctionExpression', 'FunctionDeclaration'].includes(node?.type);
// Opening/separator/closing text that turns positional arguments into the
// nested argument object of an operation (`{"targetId": …, "delta": {"x": …}}`).
function objectLayout(paths, target) {
  const head = target !== undefined ? `"targetId": ${JSON.stringify(target)}` : '';
  if (!paths.length) return {open: `{${head}}`, between: [], close: ''};
  const opening = (path, from) => path.slice(from, -1).map(key => `${JSON.stringify(key)}: {`).join('') + `${JSON.stringify(path.at(-1))}: `;
  const common = (a, b) => { let index = 0; while (index < a.length - 1 && index < b.length - 1 && a[index] === b[index]) index++; return index; };
  const between = paths.slice(1).map((path, index) => { const previous = paths[index], shared = common(previous, path); return '}'.repeat(previous.length - 1 - shared) + ', ' + opening(path, shared); });
  return {open: '{' + head + (head ? ', ' : '') + opening(paths[0], 0), between, close: '}'.repeat(paths.at(-1).length - 1) + '}'};
}

export function compileApi3Capability(source, {profile, variableIds = {}, targetIds = {}} = {}) {
  const vocabulary = capabilityApi3Vocabulary(profile);
  let ast;
  try { ast = parse(source, {ecmaVersion: 2022, sourceType: 'module', locations: true}); }
  catch (error) { throw Object.assign(new Error(error.message), {lineNumber: error.loc?.line, columnNumber: error.loc ? error.loc.column + 1 : undefined}); }
  const edits = [], edit = (start, end, text) => edits.push({start, end, text});
  const blank = node => edit(node.start, node.end, source.slice(node.start, node.end).replace(/[^\n]/g, ' '));
  const variables = new Map();
  const targets = new Map(Object.entries(targetIds));
  for (const statement of ast.body) {
    if (statement.type !== 'VariableDeclaration' || statement.kind !== 'let') continue;
    const declared = statement.declarations.map(declaration => {
      const initial = declaration.id.type === 'Identifier' ? literalValue(declaration.init) : null;
      if (!initial) return null;
      if (targets.has(declaration.id.name) || declaration.id.name === vocabulary.namespace) throw located(`«${declaration.id.name}» ya nombra un objeto del contexto; elige otro nombre.`, declaration.id);
      return {name: declaration.id.name, value: initial.value};
    });
    if (declared.every(Boolean)) {
      for (const item of declared) variables.set(item.name, {id: Object.hasOwn(variableIds, item.name) ? variableIds[item.name] : item.name, name: item.name, type: typeof item.value, initialValue: item.value});
      blank(statement);
    }
  }
  const state = name => `gg_state[${JSON.stringify(variables.get(name).id)}]`;
  const handled = new Set();
  // Operation call: target method, namespace call or wait.
  function operationOf(call) {
    const parts = calleeParts(call.callee);
    if (!parts) return null;
    const [object, method] = parts;
    if (object === null && method === 'wait') return {kind: 'wait'};
    if (object === vocabulary.namespace) { const operation = vocabulary.global[method]; if (!operation) throw located(`${object} no tiene la acción ${method}.`, call); return {kind: 'operation', operation}; }
    if (object !== null && targets.has(object)) {
      if (vocabulary.events[method]?.target) return null;
      const operation = vocabulary.targeted[method];
      if (!operation) throw located(`${object} no tiene la acción ${method}.`, call);
      return {kind: 'operation', operation, target: targets.get(object)};
    }
    return null;
  }
  function translateCall(call) {
    const found = operationOf(call);
    if (!found) return false;
    handled.add(call);
    if (found.kind === 'wait') {
      if (call.arguments.length !== 1) throw located('wait recibe 1 valor.', call);
      edit(call.start, call.arguments[0].start, 'await ctx.wait(gg_seconds(');
      edit(call.arguments[0].end, call.end, '))');
      return true;
    }
    const {operation, target} = found;
    if (call.arguments.length !== operation.leaves.length) throw located(`${calleeParts(call.callee).filter(Boolean).join('.')} recibe ${operation.leaves.length} ${operation.leaves.length === 1 ? 'valor' : 'valores'}.`, call);
    const layout = objectLayout(operation.leaves.map(leaf => leaf.split('.')), target);
    const prefix = `(await ctx.${operation.publicPath.join('.')}(`;
    if (!call.arguments.length) { edit(call.start, call.end, prefix + layout.open + '))'); return true; }
    edit(call.start, call.arguments[0].start, prefix + layout.open);
    call.arguments.slice(1).forEach((argument, index) => edit(call.arguments[index].end, argument.start, layout.between[index]));
    edit(call.arguments.at(-1).end, call.end, layout.close + '))');
    return true;
  }
  // Generic walk inside a handler body.
  function visit(node, handler) {
    if (isFunction(node)) {
      const stack = [node.body];
      while (stack.length) { const current = stack.pop(); if (current.type === 'CallExpression' && operationOf(current)) throw located('Las acciones del programa van directamente dentro de un evento, no dentro de funciones propias.', current); stack.push(...children(current)); }
      return;
    }
    if (node.type === 'CallExpression' && !handled.has(node)) translateCall(node);
    if (node.type === 'AssignmentExpression' && node.left.type === 'Identifier' && variables.has(node.left.name)) {
      const variable = variables.get(node.left.name);
      if (node.operator === '=') {
        edit(node.left.start, node.right.start, `${state(node.left.name)} = ${variable.type === 'number' ? 'gg_number(' : '('}`);
        edit(node.right.end, node.right.end, ')');
      } else if (['+=', '-='].includes(node.operator) && variable.type === 'number') {
        edit(node.left.start, node.right.start, `${state(node.left.name)} = gg_number(gg_number(${state(node.left.name)}) ${node.operator[0]} gg_number(`);
        edit(node.right.end, node.right.end, '))');
      } else throw located(`Usa = con ${node.left.name}${variable.type === 'number' ? ', o += y -=' : ''}.`, node);
      visit(node.right, handler);
      return;
    }
    if (node.type === 'UpdateExpression' && node.argument.type === 'Identifier' && variables.has(node.argument.name)) {
      if (variables.get(node.argument.name).type !== 'number') throw located(`${node.argument.name} no es un número.`, node);
      edit(node.start, node.end, `(${state(node.argument.name)} = gg_number(gg_number(${state(node.argument.name)}) ${node.operator === '++' ? '+' : '-'} 1))`);
      return;
    }
    if (node.type === 'IfStatement' && node.test.type === 'BinaryExpression' && Object.hasOwn(vocabulary.compare, node.test.operator)) {
      const test = node.test;
      edit(test.start, test.left.start, `gg_compare(${JSON.stringify(vocabulary.compare[test.operator])}, `);
      edit(test.left.end, test.right.start, ', ');
      edit(test.right.end, test.right.end, ')');
      for (const child of [test.left, test.right, node.consequent, node.alternate].filter(Boolean)) visit(child, handler);
      return;
    }
    const root = node.type === 'MemberExpression' ? (node.object.type === 'MemberExpression' ? node.object.object : node.object) : null;
    if (handler.event && root?.type === 'Identifier' && root.name === handler.event) {
      const path = capabilityEventPath(node);
      if (!path) throw located(`Usa ${handler.event}.value, ${handler.event}.key, ${handler.event}.targetId o ${handler.event}.values["id"].`, node);
      edit(node.start, node.end, `gg_event(event, ${JSON.stringify(path)})`);
      return;
    }
    if (node.type === 'Identifier' && variables.has(node.name)) { edit(node.start, node.end, state(node.name)); return; }
    if (node.type === 'Identifier' && (targets.has(node.name) || node.name === vocabulary.namespace)) throw located(`Usa ${node.name} con una de sus acciones, por ejemplo ${node.name}.${Object.keys(targets.has(node.name) ? vocabulary.targeted : vocabulary.global)[0] ?? 'snapshot'}(…).`, node);
    for (const child of children(node)) {
      if (node.type === 'MemberExpression' && child === node.property && !node.computed) continue;
      if (node.type === 'Property' && child === node.key && !node.computed) continue;
      if (node.type === 'CallExpression' && child === node.callee && handled.has(node)) continue;
      if (node.type === 'VariableDeclarator' && child === node.id) continue;
      visit(child, handler);
    }
  }
  let events = 0;
  for (const statement of ast.body) {
    if (statement.type === 'VariableDeclaration' && edits.some(item => item.start === statement.start)) continue;
    const call = statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression' ? statement.expression : null;
    const parts = call ? calleeParts(call.callee) : null;
    const event = parts ? vocabulary.events[parts[1]] : null;
    const valid = event && (event.target ? parts[0] !== null && targets.has(parts[0]) : parts[0] === null);
    if (!valid) {
      const stack = [statement];
      while (stack.length) { const current = stack.pop(); if (current.type === 'CallExpression' && operationOf(current)) throw located('Las acciones del programa van dentro de un evento, como onStart(() => { … }).', current); stack.push(...children(current)); }
      continue;
    }
    const handler = call.arguments.at(-1);
    const expected = event.option ? 2 : 1;
    if (call.arguments.length !== expected || !['ArrowFunctionExpression', 'FunctionExpression'].includes(handler?.type)) throw located(`${parts.filter(Boolean).join('.')} recibe ${event.option ? 'un valor y ' : ''}una función.`, call);
    if (handler.params.length > 1 || (handler.params[0] && handler.params[0].type !== 'Identifier') || handler.async || handler.generator) throw located('La función del evento recibe como mucho un parámetro: event.', handler);
    if (event.option && !(call.arguments[0].type === 'Literal' && typeof call.arguments[0].value === 'string')) throw located('El primer valor del evento es un texto entre comillas.', call.arguments[0]);
    events++;
    const registration = {event: event.id, targetId: event.target ? targets.get(parts[0]) : null, ...(event.option ? {key: call.arguments[0].value} : {})};
    edit(call.start, handler.start, `GG.context.when(${JSON.stringify(registration)}, `);
    const eventName = handler.params[0]?.name;
    edit(handler.start, handler.body.start, handler.type === 'ArrowFunctionExpression' ? 'async (ctx, event) => ' : 'async function (ctx, event) ');
    const scope = {event: eventName};
    if (eventName && eventName !== 'event') {
      // The API2 handler parameter is literally `event`; another name is aliased.
      if (handler.body.type === 'BlockStatement') edit(handler.body.start + 1, handler.body.start + 1, ` const ${eventName} = event;`);
      else throw located('Usa el nombre event para el parámetro de un evento de una sola expresión.', handler);
    }
    visit(handler.body, scope);
  }
  if (!events && !variables.size) return {source, translated: false, variables: []};
  const ordered = edits.map((item, index) => ({...item, index})).sort((a, b) => b.start - a.start || b.end - a.end || b.index - a.index);
  let output = source;
  for (const item of ordered) output = output.slice(0, item.start) + item.text + output.slice(item.end);
  const declared = [...variables.values()];
  const initial = Object.fromEntries(declared.map(item => [item.id, item.initialValue]));
  const configure = {contextId: profile.contextId, documentId: profile.documentId, variables: declared};
  return {source: capabilityApi3Prelude + `const gg_state = ${JSON.stringify(initial)}; GG.context.configure(${JSON.stringify(configure)});` + output + '\n;await GG.context.activate();', translated: true, variables: declared};
}
