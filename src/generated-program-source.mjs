import {generateCapabilityProgramSource} from './generated-capability-source.mjs';
import {validateProgram} from './contracts/program-contract.mjs';
import {api3Identifier} from './contracts/api3-names.mjs';
import {languageTables} from './packs/language-tables.mjs';
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
        default: throw Object.assign(new Error(`Unsupported generated operation: ${node.kind}`), {sourceBlockId: node.sourceBlockId});
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
export function generateApi3ProgramSource(ir, language, options = {}) {
  validateProgram(ir, options);
  if (!['javascript', 'python'].includes(language)) throw new Error('Unsupported generated language');
  const python = language === 'python';
  const quote = python ? pythonString : javascriptString;
  const lines = [], sourceMap = [], audio = new Set(), costumes = new Set(['hero']);
  const line = (text, ids = [], depth = 0) => { lines.push((python ? '    ' : '  ').repeat(depth) + text); sourceMap.push([...new Set(ids.filter(Boolean))]); };
  const taken = new Set(), names = new Map(), variableIds = {};
  for (const model of ir.variables ?? []) { const identifier = api3Identifier(model.name, taken); names.set(model.id, identifier); variableIds[identifier] = model.id; }
  // Pack-provided variables (e.g. gg.score) are added by the pack broker at
  // start, not declared in the IR: name them from their nodes, keep their ID
  // in metadata and leave their initial value to the pack, as blocks do.
  (function external(nodes) {
    for (const node of nodes ?? []) {
      for (const candidate of [node, node.value, node.steps, node.condition?.left, node.condition?.right]) {
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
  // Action names come from the sprite language table (ADR-011); playSound picks its variant by `wait`.
  const actions = languageTables['gg.sprites@0.1.0'].filter(entry => entry.kind === 'call');
  const action = (node, args, ids, depth) => {
    const entry = actions.find(item => item.lower.ir === node.kind && (item.append === undefined || item.append === Boolean(node.wait)));
    if (!entry) throw Object.assign(new Error(`Unsupported generated operation: ${node.kind}`), {sourceBlockId: node.sourceBlockId});
    const owner = entry.target === 'sprite' ? 'hero.' : '';
    call(owner + entry.js, owner + entry.python, args, ids, depth);
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
        default: throw Object.assign(new Error(`Unsupported generated operation: ${node.kind}`), {sourceBlockId: node.sourceBlockId});
      }
    }
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
    const event = {
      start: {js: 'onStart(() => {', py: '@on_start', name: 'al_iniciar'},
      key: {js: `onKey(${quote(script.key ?? '')}, () => {`, py: `@on_key(${quote(script.key ?? '')})`, name: 'al_pulsar'},
      click: {js: 'hero.onClick(() => {', py: '@hero.on_click', name: 'al_hacer_clic'},
      message: {js: `onMessage(${quote(script.message ?? '')}, () => {`, py: `@on_message(${quote(script.message ?? '')})`, name: 'al_recibir'},
      clone: {js: 'hero.onCloneStart(() => {', py: '@hero.on_clone_start', name: 'al_empezar_clon'}
    }[script.event];
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
