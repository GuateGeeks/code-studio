import {parse} from 'acorn';
import {languageTables} from '../../packs/language-tables.mjs';
import {validateProgram, programLimits} from '../../contracts/program-contract.mjs';

// Feasibility-only inverse of the existing canonical 2D generator.
// No execution, UI integration or claim to parse the full blockable subset.
// Identity metadata is the current line→IR-node map, never a previous IR.
export function parseCanonicalCodeView(source, {sourceMap, variableIds = {}} = {}) {
  const fail = (message, node) => { throw Object.assign(new Error(message),
    node?.loc ? {lineNumber: node.loc.start.line, columnNumber: node.loc.start.column + 1} : {}); };
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > programLimits.bytes) fail('El texto excede el límite de conversión.');
  if (!Array.isArray(sourceMap) || sourceMap.length !== source.split('\n').length) fail('Falta el mapa lateral del texto canónico.');
  let ast;
  try { ast = parse(source, {ecmaVersion: 2022, sourceType: 'module', locations: true}); }
  catch (error) { throw Object.assign(new Error(error.message), {lineNumber: error.loc?.line, columnNumber: error.loc?.column + 1}); }
  const entries = languageTables['gg.sprites@0.1.0'];
  const name = node => node?.type === 'Identifier' ? node.name
    : node?.type === 'MemberExpression' && !node.computed && node.object.type === 'Identifier' && node.property.type === 'Identifier'
      ? node.object.name + '.' + node.property.name : null;
  const lookup = (node, kind) => entries.find(entry => entry.kind === kind &&
    (entry.target === 'sprite' ? 'hero.' : '') + entry.js === name(node));
  const variables = new Map(), scripts = [];
  const id = (node, offset = 0) => {
    const value = sourceMap[node.loc.start.line - 1]?.[offset];
    if (typeof value !== 'string' || !value) fail('No hay identidad lateral para este nodo canónico.', node);
    return value;
  };
  function literal(node) {
    if (node?.type === 'Literal' && ['number', 'string'].includes(typeof node.value)) return node.value;
    if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' && typeof node.argument.value === 'number') return -node.argument.value;
    fail('Se esperaba un literal del subconjunto canónico.', node);
  }
  function value(node, ids) {
    if (node?.type === 'Identifier' && variables.has(node.name)) {
      const model = variables.get(node.name), sourceBlockId = ids.shift();
      if (!sourceBlockId) fail('Falta la identidad de la lectura.', node);
      return {kind: 'variable', variableId: model.id, name: model.name, sourceBlockId};
    }
    const result = literal(node);
    if (typeof result !== 'number') fail('Se esperaba un valor numérico.', node);
    return result;
  }
  const slots = {move: 'steps', wait: 'seconds', broadcastWait: 'message', playSound: 'sound', setCostume: 'costume'};
  function body(block) {
    if (block?.type !== 'BlockStatement') fail('Se esperaba un cuerpo de evento o control.', block);
    return block.body.map(statement);
  }
  function statement(node) {
    const sourceBlockId = id(node), ids = [...sourceMap[node.loc.start.line - 1]].slice(1);
    if (node.type === 'ExpressionStatement') {
      const expression = node.expression;
      if (expression.type === 'CallExpression') {
        const entry = lookup(expression.callee, 'call');
        if (!entry || expression.arguments.length !== entry.args.length) fail('Llamada fuera del subconjunto canónico.', expression);
        const result = {kind: entry.lower.ir, sourceBlockId};
        if (slots[result.kind]) result[slots[result.kind]] = result.kind === 'move'
          ? value(expression.arguments[0], ids) : literal(expression.arguments[0]);
        if (entry.append !== undefined) result.wait = entry.append;
        return result;
      }
      if (expression.type === 'AssignmentExpression' && expression.left.type === 'Identifier' && variables.has(expression.left.name)) {
        const model = variables.get(expression.left.name);
        if (!['=', '+=', '-='].includes(expression.operator)) fail('Asignación fuera del subconjunto canónico.', expression);
        let number = value(expression.right, ids);
        if (expression.operator === '-=') {
          if (typeof number !== 'number') fail('Solo se convierte una resta literal canónica.', expression);
          number = -number;
        }
        return {kind: expression.operator === '=' ? 'setVariable' : 'changeVariable',
          variableId: model.id, name: model.name, value: number, sourceBlockId};
      }
    }
    if (node.type === 'ForStatement') {
      const declaration = node.init?.declarations?.[0], counter = declaration?.id?.name;
      if (node.init?.type !== 'VariableDeclaration' || node.init.kind !== 'let' || node.init.declarations.length !== 1 ||
        declaration.id.type !== 'Identifier' || literal(declaration.init) !== 0 ||
        node.test?.type !== 'BinaryExpression' || node.test.operator !== '<' || node.test.left.name !== counter ||
        node.update?.type !== 'UpdateExpression' || node.update.operator !== '++' || node.update.argument.name !== counter)
        fail('Repetición fuera del subconjunto canónico.', node);
      return {kind: 'repeat', count: literal(node.test.right), body: body(node.body), sourceBlockId};
    }
    if (node.type === 'IfStatement') {
      const operator = {'==': 'EQ', '<': 'LT', '>': 'GT'}[node.test?.operator];
      if (node.test?.type !== 'BinaryExpression' || !operator) fail('Comparación fuera del subconjunto canónico.', node.test);
      const comparisonId = ids.shift();
      return {kind: 'if', sourceBlockId,
        condition: {kind: 'compare', operator, sourceBlockId: comparisonId,
          left: value(node.test.left, ids), right: value(node.test.right, ids)},
        body: body(node.consequent), elseBody: node.alternate ? body(node.alternate) : []};
    }
    fail('Construcción fuera del subconjunto canónico.', node);
  }
  for (const node of ast.body) {
    if (node.type === 'VariableDeclaration') {
      if (node.kind !== 'let' || node.declarations.length !== 1) fail('Declaración no canónica.', node);
      const declaration = node.declarations[0], identifier = declaration.id?.name;
      if (declaration.id.type !== 'Identifier' || variables.has(identifier) || !Object.hasOwn(variableIds, identifier)) fail('Declaración sin identidad lateral.', node);
      const shared = declaration.init?.type === 'CallExpression' && name(declaration.init.callee) === 'shared';
      if (shared && declaration.init.arguments.length !== 1) fail('shared requiere un valor inicial.', declaration.init);
      const initialValue = literal(shared ? declaration.init.arguments[0] : declaration.init);
      if (typeof initialValue !== 'number') fail('La variable debe ser numérica.', node);
      variables.set(identifier, {id: variableIds[identifier], name: identifier, initialValue, ...(shared ? {scope: 'global'} : {})});
      continue;
    }
    if (node.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') fail('Solo se admiten eventos y declaraciones del subconjunto canónico.', node);
    const call = node.expression, entry = lookup(call.callee, 'event'), callback = call.arguments.at(-1);
    if (!entry || call.arguments.length !== (entry.option ? 2 : 1) ||
      !['ArrowFunctionExpression', 'FunctionExpression'].includes(callback?.type) || callback.async || callback.params.length)
      fail('Evento fuera del subconjunto canónico.', node);
    const script = {event: entry.lower.ir, sourceBlockId: id(node), body: body(callback.body)};
    if (entry.option) script[entry.option.toLowerCase()] = literal(call.arguments[0]);
    scripts.push(script);
  }
  return validateProgram({version: 0, scripts, ...(variables.size ? {variables: [...variables.values()].sort((a, b) => a.id.localeCompare(b.id))} : {})});
}
