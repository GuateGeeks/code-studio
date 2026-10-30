import {sb3OpcodeDefinitions} from './sb3-program.mjs';

// Opcodes the 2D IR may lower to (scene2d-vocabulary-v2). The F5 matrix
// (sb3OpcodeDefinitions, docs/phase-5/OPCODE-MATRIX.md) is the reviewed base.
// E1 adds seven core Scratch opcodes reviewed on 29/10/2026 for the IR
// lowering only (docs/phase-5/OPCODE-MATRIX.md, «Revisión E1»): they are NOT
// added to the SB3 import allowlist, whose context stays frozen (E-1).
export const e1ReviewedOpcodes = Object.freeze({
  motion_glidesecstoxy: Object.freeze({inputs: ['SECS', 'X', 'Y'], fields: [], kind: 'statement'}),
  motion_ifonedgebounce: Object.freeze({inputs: [], fields: [], kind: 'statement'}),
  looks_say: Object.freeze({inputs: ['MESSAGE'], fields: [], kind: 'statement'}),
  looks_sayforsecs: Object.freeze({inputs: ['MESSAGE', 'SECS'], fields: [], kind: 'statement'}),
  looks_think: Object.freeze({inputs: ['MESSAGE'], fields: [], kind: 'statement'}),
  looks_thinkforsecs: Object.freeze({inputs: ['MESSAGE', 'SECS'], fields: [], kind: 'statement'}),
  control_stop: Object.freeze({inputs: [], fields: ['STOP_OPTION'], kind: 'statement', options: Object.freeze(['all', 'this script'])})
});
// E2 adds «ir a» and the backdrops (OPCODE-MATRIX, «Revisión E2», 30/10/2026),
// for the lowering only as well: the SB3 import allowlist does not change.
export const e2ReviewedOpcodes = Object.freeze({
  motion_goto: Object.freeze({inputs: ['TO'], fields: [], kind: 'statement'}),
  motion_goto_menu: Object.freeze({inputs: [], fields: ['TO'], kind: 'menu'}),
  looks_switchbackdropto: Object.freeze({inputs: ['BACKDROP'], fields: [], kind: 'statement'}),
  looks_backdrops: Object.freeze({inputs: [], fields: ['BACKDROP'], kind: 'menu'}),
  looks_nextbackdrop: Object.freeze({inputs: [], fields: [], kind: 'statement'})
});
export function isScene2DLoweringOpcode(opcode) {
  return Object.hasOwn(sb3OpcodeDefinitions, opcode) || Object.hasOwn(e1ReviewedOpcodes, opcode) || Object.hasOwn(e2ReviewedOpcodes, opcode);
}
