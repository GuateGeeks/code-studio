import {parse} from 'acorn';
import {resolveCapabilities} from '../../contracts/packs.mjs';
import {validateProgram, programLimits} from '../../contracts/program-contract.mjs';
import {validateLanguageTables, tablesForLocks, languageAvailability, offeredCoreStructures} from '../../contracts/language-table.mjs';
import {languageTables, coreLanguageEntries} from '../../packs/language-tables.mjs';
import {api3Keywords} from '../../contracts/api3-names.mjs';

const calleeName = node => node?.type === 'Identifier' ? node.name :
  node?.type === 'MemberExpression' && !node.computed && !node.optional && node.object.type === 'Identifier' &&
    node.property.type === 'Identifier' ? node.object.name + '.' + node.property.name : null;
const own = (object, key) => Object.hasOwn(object, key);
const plain = value => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));

// Parses data only. Loaded by the language-origin worker, never by the shell.
// Tables and installed declarative rules determine calls, fields and enums;
// only the installed core syntax is recognized here.
export function parseJavaScriptCodeView(source, {capabilities = null, resourceView,
  variableIds = {}, variableNames = {}, catalog} = {}) {
  const reject = (message, node, code = 'CV_UNSUPPORTED') => {
    throw Object.assign(new Error(message), {code, lineNumber: node?.loc?.start.line ?? 1,
      columnNumber: (node?.loc?.start.column ?? 0) + 1, construction: node?.type ?? 'Program'});
  };
  if (typeof source !== 'string' || new TextEncoder().encode(source).length > programLimits.bytes)
    reject('El texto supera el límite de 65.536 bytes.', null, 'CV_SOURCE_LIMIT');
  for (const map of [variableIds, variableNames]) if (!plain(map) || Object.keys(map).length > programLimits.variables ||
      Object.entries(map).some(([key, value]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ||
        typeof value !== 'string' || !value.trim() || value.length > 128))
    reject('Los metadatos de variables no son válidos.', null, 'CV_METADATA');
  const plan = resolveCapabilities(capabilities, catalog ? {catalog} : {});
  const packs = plan.packs.filter(pack => !pack.manifest.context || pack.manifest.context === 'scratch-2d');
  const manifests = Object.fromEntries(packs.map(pack => [pack.id + '@' + pack.version, pack.manifest]));
  const tables = tablesForLocks(packs.map(pack => ({id: pack.id, version: pack.version})), languageTables, manifests);
  validateLanguageTables({core: coreLanguageEntries, ...tables});
  const availability = languageAvailability(tables, {lowering: 'ir'}).javascript;
  if (!availability.available) reject(availability.reason, null, 'CV_LANGUAGE_UNAVAILABLE');
  const offered = offeredCoreStructures(packs);
  const forms = new Map();
  for (const pack of packs) for (const entry of tables[pack.id + '@' + pack.version] ?? []) {
    if (!entry.js || !['call', 'event'].includes(entry.kind) || !entry.lower.ir) continue;
    const category = entry.kind === 'event' ? 'hats' : 'statements';
    const rule = pack.manifest.contributions[category][entry.block];
    if (!rule || (rule.kind ?? rule.event) !== entry.lower.ir)
      reject('La tabla no coincide con la bajada instalada de ' + entry.block + '.', null, 'CV_TABLE');
    const key = (entry.target === 'sprite' ? 'hero.' : '') + entry.js;
    const previous = forms.get(key);
    if (!previous || entry.supersedes === previous.entry.block) forms.set(key, {entry, rule, config: pack.config});
  }
  const rawComments = [];
  let ast;
  try {
    ast = parse(source, {ecmaVersion: 2022, sourceType: 'module', locations: true,
      onComment: (block, text, start, end, loc, endLoc) => rawComments.push({block, text, start, end, loc, endLoc})});
  } catch (error) {
    reject('Revisa la sintaxis de JavaScript: ' + error.message,
      error.loc ? {loc: {start: error.loc}, type: 'SyntaxError'} : null, 'CV_SYNTAX');
  }
  const variables = new Map(), declarations = new Map(), sourceLocations = [];
  const reservedVariableIDs = new Set([...Object.values(variableIds), ...plan.variables.map(variable => variable.id)]);
  let variableSequence = 0;
  const newVariableID = () => { let id; do { id = 'cv-variable-' + variableSequence++; } while (reservedVariableIDs.has(id)); reservedVariableIDs.add(id); return id; };
  let sequence = 0;
  const identity = node => {
    if (sourceLocations.length >= programLimits.nodes) reject('El programa supera el límite de 300 bloques.', node, 'CV_NODE_LIMIT');
    const id = 'cv-node-' + sequence++;
    sourceLocations.push({sourceBlockId: id, line: node.loc.start.line, column: node.loc.start.column + 1,
      endLine: node.loc.end.line, endColumn: node.loc.end.column + 1});
    return id;
  };
  function literal(node) {
    if (node?.type === 'Literal' && ['number', 'string'].includes(typeof node.value) && !node.regex && !node.bigint) return node.value;
    if (node?.type === 'UnaryExpression' && node.operator === '-' && node.argument.type === 'Literal' &&
        typeof node.argument.value === 'number') return -node.argument.value;
    reject('Este valor necesita un literal numérico o de texto que tenga bloque.', node);
  }
  function number(node) {
    const value = literal(node);
    if (typeof value !== 'number' || !Number.isFinite(value)) reject('Este bloque necesita un número finito.', node);
    return value;
  }
  function expression(node) {
    if (node?.type === 'Identifier' && variables.has(node.name)) {
      const model = variables.get(node.name);
      return {kind: 'variable', variableId: model.id, name: model.name, sourceBlockId: identity(node)};
    }
    return number(node);
  }
  // Declarations are program state, not local JavaScript bindings.
  for (const node of ast.body) if (node.type === 'VariableDeclaration') {
    if (node.kind !== 'let') reject('Declara las variables del programa con let.', node);
    for (const declaration of node.declarations) {
      if (variables.size >= programLimits.variables) reject('El programa supera el límite de 16 variables.', declaration, 'CV_VARIABLE_LIMIT');
      const name = declaration.id?.name;
      if (declaration.id.type !== 'Identifier' || api3Keywords.has(name) || variables.has(name) || forms.has(name))
        reject('Usa un nombre de variable nuevo, sin palabras reservadas ni nombres de la API.', declaration.id);
      if (!declaration.init) reject('La variable necesita un valor inicial 0.', declaration);
      const shared = declaration.init?.type === 'CallExpression' && calleeName(declaration.init.callee) === 'shared';
      if (shared && declaration.init.arguments.length !== 1) reject('shared recibe un único valor inicial.', declaration.init);
      const initialValue = number(shared ? declaration.init.arguments[0] : declaration.init);
      const id = own(variableIds, name) ? variableIds[name] : newVariableID();
      if ([...variables.values()].some(variable => variable.id === id)) reject('Dos variables no pueden compartir identidad.', declaration);
      const supplied = plan.variables.find(variable => variable.id === id);
      if (supplied && (supplied.initialValue !== initialValue || (supplied.scope === 'global') !== shared))
        reject('Conserva el valor inicial y ámbito declarados por el pack; cambia su configuración desde bloques.', declaration.init);
      if (initialValue !== 0 && !supplied) reject('Los bloques inician las variables en 0; asigna otro valor dentro de un evento.', declaration.init);
      const model = {id, name: supplied?.name ?? (own(variableNames, name) ? variableNames[name] : name), initialValue,
        ...(shared ? {scope: 'global'} : {})};
      variables.set(name, model); declarations.set(model.id, declaration);
    }
  }
  for (const model of plan.variables) {
    const identifier = Object.keys(variableIds).find(name => variableIds[name] === model.id);
    if (!identifier || variables.has(identifier)) continue;
    variables.set(identifier, structuredClone(model));
  }
  function lower(call, kind, node) {
    const name = calleeName(call.callee), definition = forms.get(name);
    if (!definition || definition.entry.kind !== kind || call.optional)
      reject('La llamada «' + (name ?? 'dinámica') + '» no tiene un bloque instalado para esta posición.', call);
    const {entry, rule, config} = definition, arity = kind === 'event' ? (entry.option ? 2 : 1) : (entry.args ?? []).length;
    if (call.arguments.length !== arity) reject('«' + name + '» necesita ' + arity + ' argumentos.', call);
    const result = {[kind === 'event' ? 'event' : 'kind']: entry.lower.ir, sourceBlockId: identity(node)};
    const argumentsBySlot = new Map((kind === 'event' ? entry.option ? [entry.option] : [] : entry.args ?? [])
      .map((slot, index) => [slot, call.arguments[index]]));
    for (const [field, binding] of Object.entries(rule.values ?? rule.fields ?? {})) {
      if (own(binding, 'literal')) { result[field] = binding.literal; continue; }
      if (binding.config) { result[field] = config[binding.config]; continue; }
      const arg = argumentsBySlot.get(binding.input ?? binding.field);
      if (!arg) reject('La tabla no declara el argumento ' + field + '.', call, 'CV_TABLE');
      const value = binding.type === 'expression' ? expression(arg) : binding.type === 'number' ? number(arg) : literal(arg);
      if (binding.enum && !binding.enum.includes(value)) reject('Elige uno de estos valores: ' + binding.enum.join(', ') + '.', arg);
      if (binding.type === 'text' && (typeof value !== 'string' || value.length > 330 || /[\u0000-\u001f\u007f]/.test(value)))
        reject('Este bloque necesita un texto entre comillas, de hasta 330 caracteres y sin saltos de línea.', arg);
      if (binding.type === 'message' && (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 64))
        reject('El mensaje necesita texto de 1 a 64 caracteres, sin espacios en los extremos.', arg);
      if (binding.type === 'key' && (typeof value !== 'string' || !/^(space|up arrow|down arrow|left arrow|right arrow|[a-z0-9])$/.test(value)))
        reject('Esta tecla no tiene bloque: usa una letra, número, space o una flecha.', arg);
      if ((binding.minimum !== undefined && value < binding.minimum) || (binding.maximum !== undefined && value > binding.maximum))
        reject('El valor de ' + field + ' está fuera de los límites del bloque.', arg);
      result[field] = value;
    }
    return result;
  }
  const terminal = {forever: 'por siempre (while (true))', stopScript: 'return', stopAll: 'stopAll()'};
  function body(node, depth) {
    if (depth > programLimits.depth) reject('El programa supera la profundidad de bloques permitida.', node, 'CV_DEPTH_LIMIT');
    const statements = (node.type === 'BlockStatement' ? node.body : [node]).filter(item => item.type !== 'EmptyStatement');
    return statements.map((item, index) => {
      const result = statement(item, depth);
      if (Object.hasOwn(terminal, result.kind) && index < statements.length - 1)
        reject('Nada se ejecuta después de ' + terminal[result.kind] + ': su bloque termina la pila. Quita o mueve las instrucciones siguientes.', statements[index + 1]);
      return result;
    });
  }
  // ==, < or > between numbers or program variables (logic_compare).
  function comparison(test) {
    const operator = {'==': 'EQ', '<': 'LT', '>': 'GT'}[test?.operator];
    if (test?.type !== 'BinaryExpression' || !operator) reject('La comparación bloqueable usa ==, < o >.', test);
    return {kind: 'compare', operator, sourceBlockId: identity(test), left: expression(test.left), right: expression(test.right)};
  }
  const structureMissing = (node, what) => reject(what + ' no tiene bloque 2D instalado en este proyecto; actualiza sus packs o conserva una copia independiente.', node);
  function statement(node, depth) {
    if (node.type === 'ExpressionStatement') {
      const exp = node.expression;
      if (exp.type === 'CallExpression' && calleeName(exp.callee) === 'waitUntil' && !forms.has('waitUntil')) {
        if (!offered.has('waitUntil')) structureMissing(exp, '«waitUntil» (esperar hasta)');
        const condition = exp.arguments[0];
        if (exp.arguments.length !== 1 || condition.type !== 'ArrowFunctionExpression' || condition.params.length || condition.async || condition.body.type === 'BlockStatement')
          reject('Esperar hasta se escribe waitUntil(() => a > b), con una comparación ==, < o >.', exp);
        const sourceBlockId = identity(node);
        return {kind: 'waitUntil', sourceBlockId, condition: comparison(condition.body)};
      }
      if (exp.type === 'CallExpression') return lower(exp, 'call', node);
      if (['AssignmentExpression', 'UpdateExpression'].includes(exp.type)) {
        const target = exp.left ?? exp.argument, model = target?.type === 'Identifier' && variables.get(target.name);
        if (!model) reject('Solo se asignan variables numéricas declaradas del programa.', target);
        const operator = exp.operator;
        if (!['=', '+=', '-=', '++', '--'].includes(operator)) reject('Usa =, +=, -=, ++ o -- con una variable del programa.', exp);
        let value = exp.type === 'UpdateExpression' ? 1 : expression(exp.right);
        if (operator === '-=' || operator === '--') {
          if (typeof value !== 'number') reject('Restar una variable no tiene bloque; usa un cambio numérico literal.', exp.right);
          value = -value;
        }
        return {kind: operator === '=' ? 'setVariable' : 'changeVariable', variableId: model.id, name: model.name, value, sourceBlockId: identity(node)};
      }
    }
    if (node.type === 'ForStatement') {
      const declaration = node.init?.declarations?.[0], counter = declaration?.id?.name;
      if (node.init?.type !== 'VariableDeclaration' || node.init.kind !== 'let' || node.init.declarations.length !== 1 ||
          declaration.id.type !== 'Identifier' || !declaration.init || variables.has(counter) || number(declaration.init) !== 0 ||
          node.test?.type !== 'BinaryExpression' || node.test.operator !== '<' || node.test.left.type !== 'Identifier' ||
          node.test.left.name !== counter || node.update?.type !== 'UpdateExpression' || node.update.operator !== '++' ||
          node.update.argument.type !== 'Identifier' || node.update.argument.name !== counter)
        reject('La repetición bloqueable usa for (let i = 0; i < cantidad; i++).', node);
      const result = {kind: 'repeat', count: number(node.test.right), sourceBlockId: identity(node), body: body(node.body, depth + 1)};
      if (!Number.isInteger(result.count) || result.count < 0 || result.count > 1000) reject('Repite un número entero entre 0 y 1.000 veces.', node.test.right);
      return result;
    }
    if (node.type === 'IfStatement') {
      const test = node.test, operator = {'==': 'EQ', '<': 'LT', '>': 'GT'}[test.operator];
      if (test.type !== 'BinaryExpression' || !operator) reject('La comparación bloqueable usa ==, < o >.', test);
      const sourceBlockId = identity(node);
      const condition = {kind: 'compare', operator, sourceBlockId: identity(test), left: expression(test.left), right: expression(test.right)};
      return {kind: 'if', sourceBlockId, condition, body: body(node.consequent, depth + 1),
        elseBody: node.alternate ? body(node.alternate, depth + 1) : []};
    }
    // E1: while (true) is «por siempre»; while (!(a > b)) is «repetir hasta».
    if (node.type === 'WhileStatement' && (offered.has('forever') || offered.has('repeatUntil'))) {
      const test = node.test;
      if (test.type === 'Literal' && test.value === true && offered.has('forever')) {
        const sourceBlockId = identity(node);
        return {kind: 'forever', sourceBlockId, body: body(node.body, depth + 1)};
      }
      if (test.type === 'UnaryExpression' && test.operator === '!' && test.argument.type === 'BinaryExpression' && offered.has('repeatUntil')) {
        const sourceBlockId = identity(node), condition = comparison(test.argument);
        return {kind: 'repeatUntil', sourceBlockId, condition, body: body(node.body, depth + 1)};
      }
      reject('Solo dos bucles while tienen bloque: while (true) { … } (por siempre) y while (!(a > b)) { … } (repetir hasta que).', node);
    }
    if (node.type === 'ReturnStatement' && offered.has('stopScript')) {
      if (node.argument) reject('Detener este programa se escribe return; sin valor.', node.argument);
      return {kind: 'stopScript', sourceBlockId: identity(node)};
    }
    if (['WhileStatement', 'DoWhileStatement', 'ForOfStatement', 'ForInStatement'].includes(node.type))
      reject('Este bucle no tiene bloque 2D instalado; usa la repetición for del programa' + (offered.has('forever') ? ', while (true) o while (!(a > b))' : '') + ' o conserva una copia independiente.', node);
    if (node.type === 'FunctionDeclaration') reject('Las funciones propias no tienen bloque 2D instalado; conserva este texto como copia independiente.', node);
    reject('La construcción «' + node.type + '» no tiene bloque 2D instalado.', node);
  }
  const scripts = [];
  for (const node of ast.body) {
    if (['VariableDeclaration', 'EmptyStatement'].includes(node.type)) continue;
    if (node.type !== 'ExpressionStatement' || node.expression.type !== 'CallExpression') {
      if (node.type === 'FunctionDeclaration') reject('Las funciones propias no tienen bloque 2D instalado; conserva una copia independiente.', node);
      reject('Coloca las instrucciones dentro de un evento instalado.', node);
    }
    if (scripts.length >= programLimits.scripts) reject('El programa supera el límite de 16 eventos.', node, 'CV_SCRIPT_LIMIT');
    const call = node.expression, script = lower(call, 'event', node), callback = call.arguments.at(-1);
    if (!['ArrowFunctionExpression', 'FunctionExpression'].includes(callback?.type) || callback.async || callback.generator ||
        callback.params.length || callback.body.type !== 'BlockStatement' || callback.id)
      reject('El evento necesita una función sin nombre, parámetros ni async, con su cuerpo entre llaves.', callback ?? call);
    script.body = body(callback.body, 1); scripts.push(script);
  }
  const ir = {version: 0, scripts, ...(variables.size ? {variables: [...variables.values()].sort((a, b) => a.id.localeCompare(b.id))} : {})};
  const seenAssignments = new Set();
  const walk = items => { for (const item of items) { if (item.kind === 'setVariable') seenAssignments.add(item.variableId); if (item.body) walk(item.body); if (item.elseBody) walk(item.elseBody); } };
  scripts.forEach(script => walk(script.body));
  for (const model of variables.values()) if (model.scope === 'global' && declarations.has(model.id) && !plan.variables.some(variable => variable.id === model.id) && !seenAssignments.has(model.id))
    reject('La variable shared necesita una asignación global dentro de un evento para conservar su bloque.', declarations.get(model.id));
  try { validateProgram(ir, {resourceView}); }
  catch (error) {
    const location = sourceLocations.find(item => item.sourceBlockId === error.sourceBlockId);
    throw Object.assign(new Error('El programa no cumple los límites de sus bloques: ' + error.message),
      {code: 'CV_PROGRAM', lineNumber: location?.line ?? 1, columnNumber: location?.column ?? 1, sourceBlockId: error.sourceBlockId});
  }
  if (rawComments.length > 300) reject('El texto supera el límite de 300 comentarios.', {loc: {start: rawComments[300].loc}, type: 'Comment'}, 'CV_COMMENT_LIMIT');
  const comments = rawComments.filter(comment => !(comment.text.trim() === 'JavaScript de tus bloques. Crear una copia no cambia tus bloques.'))
    .map(comment => ({text: comment.text.trim(), line: comment.loc.line, column: comment.loc.column + 1,
      endLine: comment.endLoc.line, endColumn: comment.endLoc.column + 1}));
  return {ir, sourceLocations, comments};
}


// Python AST parsing shares the reviewed installed forms and JavaScript
// lowering validator; no API names are inferred from learner text.
export function pythonCodeViewVocabulary({capabilities=null,catalog}={}) {
  const plan=resolveCapabilities(capabilities,catalog?{catalog}:{});
  const packs=plan.packs.filter(pack=>!pack.manifest.context||pack.manifest.context==='scratch-2d');
  const manifests=Object.fromEntries(packs.map(pack=>[pack.id+'@'+pack.version,pack.manifest]));
  const tables=tablesForLocks(packs.map(pack=>({id:pack.id,version:pack.version})),languageTables,manifests);
  const available=languageAvailability(tables,{lowering:'ir'}).python;
  if(!available.available)throw new Error(available.reason);
  const result={};
  for(const entries of Object.values(tables))for(const entry of entries){
    if(!entry.python||!entry.js||!['call','event'].includes(entry.kind)||!entry.lower.ir)continue;
    const owner=entry.target==='sprite'?'hero.':'';
    result[owner+entry.python]={js:owner+entry.js,kind:entry.kind,option:Boolean(entry.option)};
  }
  // E1 core structures offered by the active packs (while True, while not, wait_until, return).
  result['$structures']=[...offeredCoreStructures(packs)].sort();
  return result;
}
