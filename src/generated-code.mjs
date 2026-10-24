import {validateProgram} from './contracts/program-contract.mjs';

// Educational notation derived from IR. It is never an executable language.
export const generatedCodeLimits = Object.freeze({bytes: 65536});

const quoted = value => JSON.stringify(value).replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const variable = node => `${quoted(node.name)} [${quoted(node.variableId)}]`;

export function generateCode(ir,options={}) {
  validateProgram(ir,options);
  const lines = [];
  const sourceMap = [];
  function line(text, ids = [], depth = 0) {
    lines.push('  '.repeat(depth) + text);
    sourceMap.push([...new Set(ids)]);
  }
  function expression(node, ids) {
    if (typeof node === 'number') return String(node);
    ids.push(node.sourceBlockId);
    if (node.kind === 'variable') return variable(node);
    const operator = {EQ: '=', LT: '<', GT: '>'}[node.operator];
    return `(${expression(node.left, ids)} ${operator} ${expression(node.right, ids)})`;
  }
  function statements(body, depth) {
    for (const node of body) {
      const ids = [node.sourceBlockId];
      switch (node.kind) {
        case 'move': line(`mover ${expression(node.steps, ids)} pasos`, ids, depth); break;
        case 'wait': line(`esperar ${node.seconds} segundos`, ids, depth); break;
        case 'repeat':
          line(`repetir ${node.count} veces`, ids, depth);
          statements(node.body, depth + 1);
          line('fin repetir', ids, depth);
          break;
        case 'broadcastWait': line(`enviar ${quoted(node.message)} y esperar receptores`, ids, depth); break;
        case 'createClone': line('crear clon de este sprite', ids, depth); break;
        case 'deleteClone': line('eliminar este clon', ids, depth); break;
        case 'setVariable': line(`fijar ${variable(node)} a ${expression(node.value, ids)}`, ids, depth); break;
        case 'changeVariable': line(`cambiar ${variable(node)} por ${expression(node.value, ids)}`, ids, depth); break;
        case 'if':
          line(`si ${expression(node.condition, ids)}`, ids, depth);
          statements(node.body, depth + 1);
          if (node.elseBody.length) {
            line('si no', [node.sourceBlockId], depth);
            statements(node.elseBody, depth + 1);
          }
          line('fin si', [node.sourceBlockId], depth);
          break;
        case 'playSound': line(`tocar sonido ${quoted(node.sound)}${node.wait ? ' y esperar' : ' sin esperar'}`, ids, depth); break;
        case 'stopSounds': line('detener sonidos', ids, depth); break;
        case 'setCostume': line(`cambiar disfraz a ${quoted(node.costume)}`, ids, depth); break;
      }
    }
  }
  line('# IR 2D · no ejecutable · solo lectura');
  line('# Derivado de bloques; la ejecución usa IR → adaptador.');
  for (const model of ir.variables ?? []) {
    line(`variable ${model.scope === 'global' ? 'global' : 'local'} ${variable({name: model.name, variableId: model.id})} = ${model.initialValue}`);
  }
  for (const script of ir.scripts) {
    line('');
    const event = script.event === 'key' ? `al pulsar tecla ${quoted(script.key)}`
      : script.event === 'message' ? `al recibir mensaje ${quoted(script.message)}`
        : {start: 'al iniciar', click: 'al hacer clic en este sprite', clone: 'al comenzar este clon'}[script.event];
    line(event, [script.sourceBlockId]);
    statements(script.body, 1);
    line('fin evento', [script.sourceBlockId]);
  }
  const text = lines.join('\n');
  if (new TextEncoder().encode(text).length > generatedCodeLimits.bytes) {
    throw new Error('Generated IR listing exceeds 65536 UTF-8 bytes');
  }
  return {text, sourceMap};
}
