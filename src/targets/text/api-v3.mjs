import {parse} from 'acorn';
import {scene2DApi3} from './api-v3-vocabulary.mjs';

// API v3 (ADR-011, block-language-contract): the readable surface students
// see. It is translated here, inside the language origin, to the existing
// API1 program form before evaluation, so sessions, Stop revocation, atomic
// variables and limits stay exactly those of ADR-004. Edits never add line
// breaks, so error lines still point at the student's text.

export {scene2DApi3};

const reserved = new Set(['GG', 'ctx', 'hero', 'shared', 'wait', 'broadcastAndWait', 'createClone', 'deleteClone', 'playSound', 'playSoundUntilDone', 'stopSounds', 'onStart', 'onKey', 'onMessage']);
function located(message, node) {
  return Object.assign(new Error(message), node?.loc ? {lineNumber: node.loc.start.line, columnNumber: node.loc.start.column + 1} : {});
}
const calleeName = node => node?.type === 'Identifier' ? node.name
  : node?.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.property.type === 'Identifier' ? `${node.object.name}.${node.property.name}` : null;
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
function containsAction(node, vocabulary) {
  const stack = [node];
  while (stack.length) {
    const current = stack.pop();
    if (current.type === 'CallExpression' && (Object.hasOwn(vocabulary.statements, calleeName(current.callee)) || Object.hasOwn(vocabulary.events, calleeName(current.callee)))) return current;
    stack.push(...children(current));
  }
  return null;
}

export function isApi3Source(source) {
  try {
    const ast = parse(source, {ecmaVersion: 2022, sourceType: 'module'});
    return ast.body.some(statement => statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression' && Object.hasOwn(scene2DApi3.events, calleeName(statement.expression.callee)));
  } catch { return false; }
}

// variableIds: identifier → stable variable ID kept in document metadata.
export function compileApi3JavaScript(source, {variableIds = {}, vocabulary = scene2DApi3} = {}) {
  let ast;
  try { ast = parse(source, {ecmaVersion: 2022, sourceType: 'module', locations: true}); }
  catch (error) { throw Object.assign(new Error(error.message), {lineNumber: error.loc?.line, columnNumber: error.loc ? error.loc.column + 1 : undefined}); }
  const edits = [];
  const edit = (start, end, text) => edits.push({start, end, text});
  const blank = node => edit(node.start, node.end, source.slice(node.start, node.end).replace(/[^\n]/g, ' '));
  const variables = new Map();
  let events = 0;
  // 1. Program variables: top-level `let name = literal` or `= shared(literal)`.
  for (const statement of ast.body) {
    if (statement.type !== 'VariableDeclaration' || statement.kind !== 'let') continue;
    const declared = statement.declarations.map(declaration => {
      if (declaration.id.type !== 'Identifier') return null;
      const sharedCall = declaration.init?.type === 'CallExpression' && calleeName(declaration.init.callee) === vocabulary.shared;
      if (sharedCall && declaration.init.arguments.length !== 1) throw located('shared() recibe un valor inicial.', declaration.init);
      const initial = literalValue(sharedCall ? declaration.init.arguments[0] : declaration.init);
      if (!initial || typeof initial.value !== 'number') return sharedCall ? (() => { throw located('El valor inicial de una variable del programa debe ser un número.', declaration.init); })() : null;
      if (reserved.has(declaration.id.name)) throw located(`«${declaration.id.name}» está reservado en Code Studio; elige otro nombre.`, declaration.id);
      return {node: declaration, name: declaration.id.name, scope: sharedCall ? 'global' : 'local', initialValue: initial.value};
    });
    if (declared.every(Boolean)) {
      for (const item of declared) variables.set(item.name, {id: Object.hasOwn(variableIds, item.name) ? variableIds[item.name] : item.name, name: item.name, scope: item.scope, initialValue: item.initialValue});
      blank(statement);
    }
  }
  // Identifiers in variableIds that are not declared here belong to packs
  // (their broker declares them at start): usable, but never configured.
  for (const [name, id] of Object.entries(variableIds)) if (!variables.has(name)) variables.set(name, {id, name, external: true});
  const allowed = new Set();
  const reference = node => { allowed.add(node); edit(node.start, node.end, `GG.ref(${JSON.stringify(variables.get(node.name).id)})`); };
  const isVariable = node => node?.type === 'Identifier' && variables.has(node.name);
  function argument(node) { if (isVariable(node)) reference(node); }
  // 2. Statements inside an event body.
  function statementInHandler(node) {
    if (node.type === 'ExpressionStatement') {
      const expression = node.expression;
      if (expression.type === 'CallExpression') {
        const name = calleeName(expression.callee);
        if (Object.hasOwn(vocabulary.events, name)) throw located('Los eventos se registran fuera de otros eventos.', expression);
        const action = Object.hasOwn(vocabulary.statements, name) ? vocabulary.statements[name] : null;
        if (action) {
          if (expression.arguments.length !== action.arity) throw located(`${name} recibe ${action.arity} ${action.arity === 1 ? 'valor' : 'valores'}.`, expression);
          if (action.stops) { edit(node.start, node.end, 'if (await ctx.deleteClone()) return;'); return; }
          allowed.add(expression);
          edit(expression.callee.start, expression.callee.end, `await ctx.${action.ctx}`);
          expression.arguments.forEach(argument);
          if (action.append !== undefined) edit(expression.arguments.at(-1).end, expression.arguments.at(-1).end, `, ${action.append}`);
          visit(expression, true);
          return;
        }
        if (expression.callee.type === 'MemberExpression' && expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'hero') throw located(`hero no tiene la acción ${expression.callee.property.name ?? ''}.`, expression);
      }
      if (expression.type === 'AssignmentExpression' && isVariable(expression.left)) {
        const id = JSON.stringify(variables.get(expression.left.name).id);
        allowed.add(expression.left);
        const operation = {'=': 'setVariable', '+=': 'changeVariable', '-=': 'changeVariable'}[expression.operator];
        if (!operation) throw located(`Usa =, += o -= con ${expression.left.name}.`, expression);
        edit(expression.start, expression.right.start, `await ctx.${operation}(${id}, ${expression.operator === '-=' ? '-(' : ''}`);
        argument(expression.right);
        edit(expression.right.end, expression.right.end, expression.operator === '-=' ? '))' : ')');
        visit(expression.right, true);
        return;
      }
      if (expression.type === 'UpdateExpression' && isVariable(expression.argument)) {
        allowed.add(expression.argument);
        edit(expression.start, expression.end, `await ctx.changeVariable(${JSON.stringify(variables.get(expression.argument.name).id)}, ${expression.operator === '++' ? 1 : -1})`);
        return;
      }
    }
    if (node.type === 'IfStatement') {
      const test = node.test;
      if (test.type === 'BinaryExpression' && Object.hasOwn(vocabulary.compare, test.operator) && (isVariable(test.left) || isVariable(test.right))) {
        edit(test.start, test.left.start, `await ctx.compare(${JSON.stringify(vocabulary.compare[test.operator])}, `);
        argument(test.left);
        edit(test.left.end, test.right.start, ', ');
        argument(test.right);
        edit(test.right.end, test.right.end, ')');
        for (const branch of [test.left, test.right]) visit(branch, true);
      } else visit(test, true);
      block(node.consequent);
      if (node.alternate) block(node.alternate);
      return;
    }
    if (['ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForOfStatement', 'ForInStatement'].includes(node.type)) {
      for (const part of [node.init, node.test, node.update, node.left, node.right]) if (part) visit(part, true);
      block(node.body);
      return;
    }
    if (node.type === 'BlockStatement') { node.body.forEach(statementInHandler); return; }
    if (node.type === 'VariableDeclaration') for (const declaration of node.declarations) if (declaration.id.type === 'Identifier' && variables.has(declaration.id.name)) throw located(`${declaration.id.name} ya es una variable del programa.`, declaration.id);
    visit(node, true);
  }
  function block(node) { if (node.type === 'BlockStatement') node.body.forEach(statementInHandler); else statementInHandler(node); }
  // Generic walk: nested functions may not use actions; program variables only in supported positions.
  function visit(node, inHandler) {
    if (isFunction(node)) { const action = containsAction(node.body, vocabulary); if (action) throw located('Las acciones del programa van directamente dentro de un evento, no dentro de funciones propias.', action); return; }
    if (node.type === 'Identifier' && variables.has(node.name) && !allowed.has(node)) throw located(`Usa ${node.name} directamente en una acción, en una asignación o en una comparación ==, < o >.`, node);
    if (node.type === 'CallExpression') {
      const name = calleeName(node.callee);
      if (inHandler && Object.hasOwn(vocabulary.statements, name) && !allowed.has(node)) throw located(`${name} se usa como instrucción propia, no dentro de una expresión.`, node);
    }
    for (const child of children(node)) {
      if (node.type === 'MemberExpression' && child === node.property && !node.computed) continue;
      if (node.type === 'Property' && child === node.key && !node.computed) continue;
      visit(child, inHandler);
    }
  }
  // 3. Event registrations at the top level.
  for (const statement of ast.body) {
    if (statement.type === 'VariableDeclaration' && edits.some(item => item.start === statement.start)) continue;
    const call = statement.type === 'ExpressionStatement' && statement.expression.type === 'CallExpression' ? statement.expression : null;
    const event = call && Object.hasOwn(vocabulary.events, calleeName(call.callee)) ? vocabulary.events[calleeName(call.callee)] : null;
    if (!event) {
      const action = containsAction(statement, vocabulary);
      if (action) throw located('Las acciones del programa van dentro de un evento, como onStart(() => { … }).', action);
      visit(statement, false);
      continue;
    }
    const handler = call.arguments.at(-1);
    const expected = event.option ? 2 : 1;
    if (call.arguments.length !== expected || !['ArrowFunctionExpression', 'FunctionExpression'].includes(handler?.type)) throw located(`${calleeName(call.callee)} recibe ${event.option ? 'un valor y ' : ''}una función: ${calleeName(call.callee)}(${event.option ? '"…", ' : ''}() => { … }).`, call);
    if (handler.params.length || handler.async || handler.generator) throw located('La función del evento no recibe parámetros.', handler);
    if (event.option && !(call.arguments[0].type === 'Literal' && typeof call.arguments[0].value === 'string')) throw located('El primer valor del evento es un texto entre comillas.', call.arguments[0]);
    events++;
    edit(call.callee.start, call.callee.end, `GG.events.${event.register}`);
    if (event.target) edit(handler.start, handler.start, `${JSON.stringify(event.target)}, `);
    const bodyStart = handler.body.start;
    edit(handler.start, bodyStart, handler.type === 'ArrowFunctionExpression' ? 'async (ctx) => ' : 'async function (ctx) ');
    if (handler.body.type === 'BlockStatement') handler.body.body.forEach(statementInHandler);
    else statementInHandler({type: 'ExpressionStatement', expression: handler.body, start: handler.body.start, end: handler.body.end, loc: handler.body.loc});
  }
  if (!events && ![...variables.values()].some(item => !item.external)) return {source, translated: false, variables: []};
  // Apply edits back to front; equal starts keep insertion order.
  const ordered = edits.map((item, index) => ({...item, index})).sort((a, b) => b.start - a.start || b.end - a.end || b.index - a.index);
  let output = source;
  for (const item of ordered) output = output.slice(0, item.start) + item.text + output.slice(item.end);
  const declared = [...variables.values()].filter(item => !item.external);
  const configure = `GG.program.configure(${JSON.stringify({variables: declared})});`;
  return {source: configure + output + '\n;await GG.events.run();', translated: true, variables: declared};
}
