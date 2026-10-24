import {generateCapabilityProgramSource} from './generated-capability-source.mjs';
import {validateProgram} from './contracts/program-contract.mjs';

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
