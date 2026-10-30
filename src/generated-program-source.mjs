import {generateCapabilityProgramSource} from './generated-capability-source.mjs';
import {validateProgram} from './contracts/program-contract.mjs';
import {textProgramLimits} from './contracts/text-program.mjs';
import {api3Identifier} from './contracts/api3-names.mjs';
import {languageTables} from './packs/language-tables.mjs';
import {scene2DCallForms} from './packs/scene2d-forms.mjs';
import {validateScene2DTextOwner, scene2DObjectIdentifiers} from './contracts/scene2d-identifiers.mjs';
import {scene2DBackdrops, scene2DStageAllows} from './contracts/scene2d-objects.mjs';
export {api3Identifier};

const sourceBytes = 65536;
const javascriptString = value => JSON.stringify(value).replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
function pythonString(value) {
  let result = '"';
  for (const character of value) {
    const point = character.codePointAt(0);
    if (character === '"' || character === '\\') result += '\\' + character;
    else if (point < 32 || (point >= 127 && point <= 159) || point === 0x2028 || point === 0x2029 ||
        (point >= 0xd800 && point <= 0xdfff)) result += '\\u' + point.toString(16).padStart(4, '0');
    else result += character;
  }
  return result + '"';
}

// A detached source view/copy, never an interpreter or a second authoring model.
// Contextual operations enforce the finite ±1e12 domain at runtime; arbitrary
// IR0 programs that overflow it are not claimed equivalent to Scratch.
export function generateProgramSource(ir, language,options={}) {
  if(ir?.version===1)return generateCapabilityProgramSource(ir,language,options);
  validateProgram(ir,options);
  if (!['javascript', 'python'].includes(language)) throw new Error('Unsupported generated language');
  const python = language === 'python';
  const quote = python ? pythonString : javascriptString;
  const lines = [];
  const sourceMap = [];
  const audio = new Set();
  const costumes = new Set(['hero']);
  let repeatIndex = 0;
  function line(text, ids = [], depth = 0) {
    lines.push('  '.repeat(depth) + text);
    sourceMap.push([...new Set(ids)]);
  }
  function expression(node, ids) {
    if (typeof node === 'number') return String(node);
    ids.push(node.sourceBlockId);
    return `GG.ref(${quote(node.variableId)})`;
  }
  function condition(node, ids) {
    ids.push(node.sourceBlockId);
    return `await ctx.compare(${quote(node.operator)}, ${expression(node.left, ids)}, ${expression(node.right, ids)})`;
  }
  function call(name, args, ids, depth) {
    line(`await ctx.${name}(${args.join(', ')})${python ? '' : ';'}`, ids, depth);
  }
  function statements(body, depth, parentId) {
    if (!body.length && python) line('pass', [parentId], depth);
    for (const node of body) {
      const ids = [node.sourceBlockId];
      switch (node.kind) {
        case 'move': call('move', [expression(node.steps, ids)], ids, depth); break;
        case 'wait': call('wait', [String(node.seconds)], ids, depth); break;
        case 'setVariable': case 'changeVariable':
          call(node.kind, [quote(node.variableId), expression(node.value, ids)], ids, depth);
          break;
        case 'repeat': {
          const counter = `gg_repeat_${repeatIndex++}`;
          line(python ? `for ${counter} in range(${node.count}):`
            : `for (let ${counter} = 0; ${counter} < ${node.count}; ${counter}++) {`, ids, depth);
          statements(node.body, depth + 1, node.sourceBlockId);
          if (!python) line('}', ids, depth);
          break;
        }
        case 'if':
          line(python ? `if ${condition(node.condition, ids)}:` : `if (${condition(node.condition, ids)}) {`, ids, depth);
          statements(node.body, depth + 1, node.sourceBlockId);
          if (node.elseBody.length) {
            line(python ? 'else:' : '} else {', [node.sourceBlockId], depth);
            statements(node.elseBody, depth + 1, node.sourceBlockId);
          }
          if (!python) line('}', [node.sourceBlockId], depth);
          break;
        case 'broadcastWait': call('broadcastAndWait', [quote(node.message)], ids, depth); break;
        case 'createClone': call('createClone', [], ids, depth); break;
        case 'deleteClone':
          line(python ? 'if await ctx.deleteClone():' : 'if (await ctx.deleteClone()) return;', ids, depth);
          if (python) line('return', ids, depth + 1);
          break;
        case 'playSound':
          audio.add(node.sound);
          call('playSound', [quote(node.sound), python ? node.wait ? 'True' : 'False' : String(node.wait)], ids, depth);
          break;
        case 'stopSounds': call('stopSounds', [], ids, depth); break;
        case 'setCostume':
          costumes.add(node.costume);
          call('setCostume', [quote(node.costume)], ids, depth);
          break;
        // E1 (gg.sprites@0.2.0): while loops yield one frame per turn, like the API v3 translators.
        case 'forever': case 'repeatUntil':
          line(python ? `while ${node.kind === 'forever' ? 'True' : `not (${condition(node.condition, ids)})`}:`
            : `while (${node.kind === 'forever' ? 'true' : `!(${condition(node.condition, ids)})`}) {`, ids, depth);
          statements(node.body, depth + 1, node.sourceBlockId);
          call('frame', [], [node.sourceBlockId], depth + 1);
          if (!python) line('}', ids, depth);
          break;
        case 'waitUntil':
          line(python ? `while not (${condition(node.condition, ids)}):` : `while (!(${condition(node.condition, ids)})) {`, ids, depth);
          call('frame', [], ids, depth + 1);
          if (!python) line('}', ids, depth);
          break;
        case 'stopScript': line(python ? 'return' : 'return;', ids, depth); break;
        default: {
          const form = scene2DCallForms.find(item => item.kind === node.kind && item.append === undefined);
          if (!form) throw Object.assign(new Error(`Unsupported generated operation: ${node.kind}`), {sourceBlockId: node.sourceBlockId});
          if (form.stops) {
            line(python ? `if await ctx.${form.js}():` : `if (await ctx.${form.js}()) return;`, ids, depth);
            if (python) line('return', ids, depth + 1);
            break;
          }
          call(form.js, form.args.map(arg => arg.type === 'expression' ? expression(node[arg.field], ids) : typeof node[arg.field] === 'number' ? String(node[arg.field]) : quote(node[arg.field])), ids, depth);
        }
      }
    }
  }
  const comment = python ? '#' : '//';
  line(`${comment} ${python ? 'Python' : 'JavaScript'} derivado de bloques. La copia se edita de forma independiente.`);
  line(`${comment} GG program API 1. Dominio contextual: números finitos entre -1e12 y 1e12.`);
  // Keep variable identity, display name, scope and initial value in the source.
  // Names are data, never identifiers in the generated language.
  line('GG.program.configure({');
  line(`${quote('variables')}: [`, [], 1);
  for (const model of ir.variables ?? []) {
    line(`{${quote('id')}: ${quote(model.id)}, ${quote('name')}: ${quote(model.name)}, ${quote('scope')}: ${quote(model.scope ?? 'local')}, ${quote('initialValue')}: ${model.initialValue}},`, [], 2);
  }
  line(']', [], 1);
  line(python ? '})' : '});');
  for (const [index, script] of ir.scripts.entries()) {
    line('');
    line(python ? `async def gg_handler_${index}(ctx):` : `async function gg_handler_${index}(ctx) {`, [script.sourceBlockId]);
    statements(script.body, 1, script.sourceBlockId);
    if (!python) line('}', [script.sourceBlockId]);
  }
  if (ir.scripts.length) line('');
  for (const [index, script] of ir.scripts.entries()) {
    const handler = `gg_handler_${index}`;
    const registration = script.event === 'start' ? `onStart(${handler})`
      : script.event === 'key' ? `onKey(${quote(script.key)}, ${handler})`
        : script.event === 'click' ? `onClick(${quote('hero')}, ${handler})`
          : script.event === 'message' ? `onMessage(${quote(script.message)}, ${handler})`
            : `onClone(${quote('hero')}, ${handler})`;
    line(`GG.events.${registration}${python ? '' : ';'}`, [script.sourceBlockId]);
  }
  const requirements = {apiVersion: 1, resources: {audio: [...audio].sort(), costumes: [...costumes].sort()}};
  line(`${comment} Recursos locales: audio=${JSON.stringify(requirements.resources.audio)}, disfraces=${JSON.stringify(requirements.resources.costumes)}.`);
  line(`await GG.events.run()${python ? '' : ';'}`);
  const text = lines.join('\n');
  if (new TextEncoder().encode(text).length > sourceBytes) throw new Error('Generated program source exceeds 65536 UTF-8 bytes');
  return {text, sourceMap, requirements};
}

// API v3 (ADR-011): readable JavaScript/Python for 2D programs. The language
// origin translates it back to API1 before running (targets/text/api-v3.mjs);
// variable IDs travel in the copy's metadata, never in the text.
// scene2d-multi-sprite 2.2 (R2): `owner` is the object whose program (IR0)
// this is, from scene2DTextOwner. Its sprite actions and sprite events use its
// identifier (`cesta.move(10)`, `cesta.onClick`); global events stay at the top
// level. The stage has no sprite actions and cannot clone itself. Without an
// owner the program is hero's, exactly as before. Only `resourceView` and the
// owner reach the validator: the generator stays closed to IR v1.
const heroOwner = Object.freeze({identifier: 'hero', kind: 'sprite', targetId: 'hero', others: Object.freeze({}), sprites: Object.freeze({hero: 'hero'})});
export function generateApi3ProgramSource(ir, language, options = {}) {
  const owner = options.owner === undefined ? heroOwner : validateScene2DTextOwner(options.owner);
  validateProgram(ir, {resourceView: options.resourceView, resourceOwnerId: owner.targetId});
  return writeApi3(ir, language, {owner, taken: [owner.identifier, ...Object.keys(owner.others)], sprites: owner.sprites, resourceView: options.resourceView});
}
// Copy of a whole gg.sprites@0.3.0 project from its IR 2D v1, the one route that
// opens the generator to the v1 (scene2d-multi-sprite 2.2): one text document,
// variables at the top, and every event names its object (`cesta.onStart`).
// runtime.targetIds keeps the ID of each object.
export function generateApi3SceneSource(ir, language, {config, resourceView} = {}) {
  validateProgram(ir, {resourceView, objects: true});
  if (ir.version !== 1) throw new Error('Unsupported generated program');
  const {objects, targetIds} = scene2DObjectIdentifiers(config);
  const owners = new Map(objects.map(object => [object.id, {identifier: object.identifier, kind: object.kind}]));
  for (const id of ir.sprites) if (!owners.has(id)) throw new Error('El programa nombra un objeto desconocido.');
  const written = writeApi3(ir, language, {owner: null, owners, taken: Object.keys(targetIds), sprites: Object.fromEntries(objects.filter(object => object.kind === 'sprite').map(object => [object.identifier, object.id])), resourceView});
  // One document runs under the limits of one text program.
  if (ir.scripts.length > textProgramLimits.handlers || Object.keys(written.variableIds).length > textProgramLimits.variables)
    throw new Error(`Una copia del proyecto admite hasta ${textProgramLimits.handlers} eventos y ${textProgramLimits.variables} variables. Crea la copia de cada objeto desde su vista de código.`);
  return {...written, targetIds: {...targetIds}};
}
function writeApi3(ir, language, {owner: documentOwner, owners = null, taken: objectIdentifiers, sprites = {}, resourceView = null}) {
  if (!['javascript', 'python'].includes(language)) throw new Error('Unsupported generated language');
  // The object of the script being written.
  let owner = documentOwner, stage = owner?.kind === 'stage', prefix = owner ? owner.identifier + '.' : '';
  const onStage = (what, node) => { throw Object.assign(new Error(`El escenario no puede usar «${what}»: es una acción de los sprites.`), {sourceBlockId: node.sourceBlockId}); };
  const python = language === 'python';
  const quote = python ? pythonString : javascriptString;
  const lines = [], sourceMap = [], audio = new Set(), costumes = new Set(['hero']);
  const line = (text, ids = [], depth = 0) => { lines.push((python ? '    ' : '  ').repeat(depth) + text); sourceMap.push([...new Set(ids.filter(Boolean))]); };
  // Object identifiers are taken: a variable never shadows an object.
  const taken = new Set(objectIdentifiers), names = new Map(), variableIds = {};
  for (const model of ir.variables ?? []) { const identifier = api3Identifier(model.name, taken); names.set(model.id, identifier); variableIds[identifier] = model.id; }
  // Pack-provided variables (e.g. gg.score) are added by the pack broker at
  // start, not declared in the IR: name them from their nodes, keep their ID
  // in metadata and leave their initial value to the pack, as blocks do.
  (function external(nodes) {
    for (const node of nodes ?? []) {
      for (const candidate of [node, node.value, node.steps, node.condition?.left, node.condition?.right, node.degrees, node.direction, node.x, node.y, node.dx, node.dy, node.size, node.delta]) {
        if (candidate && typeof candidate === 'object' && typeof candidate.variableId === 'string' && !names.has(candidate.variableId)) {
          const identifier = api3Identifier(candidate.name ?? candidate.variableId, taken); names.set(candidate.variableId, identifier); variableIds[identifier] = candidate.variableId;
        }
      }
      external(node.body); external(node.elseBody);
    }
  })(ir.scripts.flatMap(script => script.body));
  const value = (node, ids) => { if (typeof node === 'number') return String(node); ids.push(node.sourceBlockId); return names.get(node.variableId); };
  const loopNames = ['i', 'j', 'k'];
  const call = (js, py, args, ids, depth) => line(`${python ? py : js}(${args.join(', ')})${python ? '' : ';'}`, ids, depth);
  // Another object is written by its identifier and a backdrop by its name: what the student reads.
  const backdrops = new Map(scene2DBackdrops(resourceView).map(item => [item.id, item.label]));
  const objectText = (id, node) => Object.keys(sprites).find(identifier => sprites[identifier] === id) ?? (() => { throw Object.assign(new Error('Ese objeto ya no está en el proyecto. Elige otro en su bloque.'), {sourceBlockId: node.sourceBlockId}); })();
  const argument = (arg, node, ids) => arg.type === 'expression' ? value(node[arg.field], ids) : arg.type === 'object' ? objectText(node[arg.field], node)
    : arg.type === 'backdrop' ? quote(backdrops.get(node[arg.field]) ?? node[arg.field]) : typeof node[arg.field] === 'number' ? String(node[arg.field]) : quote(node[arg.field]);
  // Action names come from the sprite language table (ADR-011); playSound picks its variant by `wait`.
  const actions = languageTables['gg.sprites@0.3.0'].filter(entry => entry.kind === 'call');
  const action = (node, args, ids, depth) => {
    const entry = actions.find(item => item.lower.ir === node.kind && (item.append === undefined || item.append === Boolean(node.wait)));
    if (!entry) throw Object.assign(new Error(`Unsupported generated operation: ${node.kind}`), {sourceBlockId: node.sourceBlockId});
    if (stage && !scene2DStageAllows(entry.lower.ir)) onStage(entry.js, node);
    const self = entry.target === 'sprite' ? prefix : '';
    call(self + entry.js, self + entry.python, args, ids, depth);
  };
  function assigned(body, out = new Set()) {
    for (const node of body) {
      if (['setVariable', 'changeVariable'].includes(node.kind)) out.add(names.get(node.variableId));
      if (node.body) assigned(node.body, out);
      if (node.elseBody) assigned(node.elseBody, out);
    }
    return out;
  }
  function statements(body, depth, parentId, loopDepth) {
    if (!body.length && python) line('pass', [parentId], depth);
    for (const node of body) {
      const ids = [node.sourceBlockId];
      switch (node.kind) {
        case 'move': action(node, [value(node.steps, ids)], ids, depth); break;
        case 'wait': action(node, [String(node.seconds)], ids, depth); break;
        case 'setVariable': line(`${names.get(node.variableId)} = ${value(node.value, ids)}${python ? '' : ';'}`, ids, depth); break;
        case 'changeVariable': {
          const negative = typeof node.value === 'number' && node.value < 0;
          line(`${names.get(node.variableId)} ${negative ? '-=' : '+='} ${negative ? String(-node.value) : value(node.value, ids)}${python ? '' : ';'}`, ids, depth);
          break;
        }
        case 'repeat': {
          const counter = loopNames[loopDepth] ?? `i${loopDepth + 1}`;
          line(python ? `for ${counter} in range(${node.count}):` : `for (let ${counter} = 0; ${counter} < ${node.count}; ${counter}++) {`, ids, depth);
          statements(node.body, depth + 1, node.sourceBlockId, loopDepth + 1);
          if (!python) line('}', ids, depth);
          break;
        }
        case 'if': {
          ids.push(node.condition.sourceBlockId);
          const operator = {EQ: '==', LT: '<', GT: '>'}[node.condition.operator];
          const test = `${value(node.condition.left, ids)} ${operator} ${value(node.condition.right, ids)}`;
          line(python ? `if ${test}:` : `if (${test}) {`, ids, depth);
          statements(node.body, depth + 1, node.sourceBlockId, loopDepth);
          if (node.elseBody.length) { line(python ? 'else:' : '} else {', [node.sourceBlockId], depth); statements(node.elseBody, depth + 1, node.sourceBlockId, loopDepth); }
          if (!python) line('}', [node.sourceBlockId], depth);
          break;
        }
        case 'broadcastWait': action(node, [quote(node.message)], ids, depth); break;
        case 'createClone': case 'deleteClone': case 'stopSounds': action(node, [], ids, depth); break;
        case 'playSound': audio.add(node.sound); action(node, [quote(node.sound)], ids, depth); break;
        case 'setCostume': costumes.add(node.costume); action(node, [quote(node.costume)], ids, depth); break;
        // E1 core structures: while (true) / while not, waitUntil(lambda) and return.
        case 'forever': case 'repeatUntil': {
          let test = python ? 'True' : 'true';
          if (node.kind === 'repeatUntil') { ids.push(node.condition.sourceBlockId); test = python ? `not (${comparison(node.condition, ids)})` : `!(${comparison(node.condition, ids)})`; }
          line(python ? `while ${test}:` : `while (${test}) {`, ids, depth);
          statements(node.body, depth + 1, node.sourceBlockId, loopDepth);
          if (!python) line('}', ids, depth);
          break;
        }
        case 'waitUntil': ids.push(node.condition.sourceBlockId); line(python ? `wait_until(lambda: ${comparison(node.condition, ids)})` : `waitUntil(() => ${comparison(node.condition, ids)});`, ids, depth); break;
        case 'stopScript': line(python ? 'return' : 'return;', ids, depth); break;
        default: {
          // E1 calls: forms and argument order come from the table (scene2d-forms).
          const form = scene2DCallForms.find(item => item.kind === node.kind && item.append === undefined);
          if (!form) throw Object.assign(new Error(`Unsupported generated operation: ${node.kind}`), {sourceBlockId: node.sourceBlockId});
          if (stage && !scene2DStageAllows(form.kind)) onStage(form.js, node);
          const self = form.target === 'sprite' ? prefix : '';
          call(self + form.js, self + form.python, form.args.map(arg => argument(arg, node, ids)), ids, depth);
        }
      }
    }
  }
  function comparison(condition, ids) {
    return `${value(condition.left, ids)} ${{EQ: '==', LT: '<', GT: '>'}[condition.operator]} ${value(condition.right, ids)}`;
  }
  const comment = python ? '#' : '//';
  line(`${comment} ${python ? 'Python' : 'JavaScript'} de tus bloques. Crear una copia no cambia tus bloques.`);
  for (const model of ir.variables ?? []) {
    const initial = model.scope === 'global' ? `shared(${model.initialValue})` : String(model.initialValue);
    line(python ? `${names.get(model.id)} = ${initial}` : `let ${names.get(model.id)} = ${initial};`);
  }
  const handlerNames = new Set();
  for (const script of ir.scripts) {
    line('');
    // A project copy names the object of every event; a view is one object's.
    if (owners) { owner = owners.get(script.targetId); stage = owner.kind === 'stage'; prefix = owner.identifier + '.'; }
    const global = owners ? prefix : '';
    const event = {
      start: {js: `${global}onStart(() => {`, py: `@${global}on_start`, name: 'al_iniciar'},
      key: {js: `${global}onKey(${quote(script.key ?? '')}, () => {`, py: `@${global}on_key(${quote(script.key ?? '')})`, name: 'al_pulsar'},
      click: {js: `${prefix}onClick(() => {`, py: `@${prefix}on_click`, name: 'al_hacer_clic'},
      message: {js: `${global}onMessage(${quote(script.message ?? '')}, () => {`, py: `@${global}on_message(${quote(script.message ?? '')})`, name: 'al_recibir'},
      clone: {js: `${prefix}onCloneStart(() => {`, py: `@${prefix}on_clone_start`, name: 'al_empezar_clon'}
    }[script.event];
    if (stage && !scene2DStageAllows(script.event)) onStage('onCloneStart', script);
    if (python) {
      line(event.py, [script.sourceBlockId]);
      line(`def ${api3Identifier(event.name, handlerNames)}():`, [script.sourceBlockId]);
      const globals = [...assigned(script.body)].sort();
      if (globals.length) line(`global ${globals.join(', ')}`, [script.sourceBlockId], 1);
      statements(script.body, 1, script.sourceBlockId, 0);
    } else {
      line(event.js, [script.sourceBlockId]);
      statements(script.body, 1, script.sourceBlockId, 0);
      line('});', [script.sourceBlockId]);
    }
  }
  const text = lines.join('\n') + '\n';
  if (new TextEncoder().encode(text).length > sourceBytes) throw new Error('Generated program source exceeds 65536 UTF-8 bytes');
  sourceMap.push([]);
  return {text, sourceMap, variableIds, requirements: {apiVersion: 3, resources: {audio: [...audio].sort(), costumes: [...costumes].sort()}}};
}
