// Corpus of the E1 2D vocabulary (scene2d-vocabulary-v2, tanda 1): one case
// per new block with its Blockly form, IR, reviewed opcode and canonical
// JavaScript/Python lines. Tests build workspaces and text from these data.
const number = (id, value) => ({shadow: {type: 'math_number', id, fields: {NUM: value}}});
const call = (type, id, inputs = {}, fields = {}) => ({type, id,
  ...(Object.keys(fields).length ? {fields} : {}),
  ...(Object.keys(inputs).length ? {inputs: Object.fromEntries(Object.entries(inputs).map(([name, value]) => [name, number(`${id}-${name.toLowerCase()}`, value)]))} : {})});

// Each case: block (Blockly), ir (statement without sourceBlockId), opcode,
// js/python (line inside the event), and `effect` read from the headless VM
// after running «al iniciar» with only that statement (renderer-free cases).
export const vocabularyCases = [
  {name: 'girar a la derecha', block: call('gg_turn_right', 'turn-right', {DEGREES: 15}), ir: {kind: 'turnRight', degrees: 15}, opcode: 'motion_turnright',
    js: 'hero.turnRight(15);', python: 'hero.turn_right(15)', effect: {direction: 105}},
  {name: 'girar a la izquierda', block: call('gg_turn_left', 'turn-left', {DEGREES: 30}), ir: {kind: 'turnLeft', degrees: 30}, opcode: 'motion_turnleft',
    js: 'hero.turnLeft(30);', python: 'hero.turn_left(30)', effect: {direction: 60}},
  {name: 'apuntar en dirección', block: call('gg_point_direction', 'point', {DIRECTION: -90}), ir: {kind: 'pointDirection', direction: -90}, opcode: 'motion_pointindirection',
    js: 'hero.pointInDirection(-90);', python: 'hero.point_in_direction(-90)', effect: {direction: -90}},
  {name: 'ir a x/y', block: call('gg_go_to', 'go-to', {X: 30, Y: -20}), ir: {kind: 'goTo', x: 30, y: -20}, opcode: 'motion_gotoxy',
    js: 'hero.goTo(30, -20);', python: 'hero.go_to(30, -20)', effect: {x: 30, y: -20}},
  {name: 'deslizar', block: call('gg_glide', 'glide', {SECONDS: 0.2, X: 50, Y: 10}), ir: {kind: 'glide', seconds: 0.2, x: 50, y: 10}, opcode: 'motion_glidesecstoxy',
    js: 'hero.glide(0.2, 50, 10);', python: 'hero.glide(0.2, 50, 10)', effect: {x: 50, y: 10}},
  {name: 'cambiar x', block: call('gg_change_x', 'change-x', {DX: 10}), ir: {kind: 'changeX', dx: 10}, opcode: 'motion_changexby',
    js: 'hero.changeX(10);', python: 'hero.change_x(10)', effect: {x: 10}},
  {name: 'fijar x', block: call('gg_set_x', 'set-x', {X: -30}), ir: {kind: 'setX', x: -30}, opcode: 'motion_setx',
    js: 'hero.setX(-30);', python: 'hero.set_x(-30)', effect: {x: -30}},
  {name: 'cambiar y', block: call('gg_change_y', 'change-y', {DY: 12}), ir: {kind: 'changeY', dy: 12}, opcode: 'motion_changeyby',
    js: 'hero.changeY(12);', python: 'hero.change_y(12)', effect: {y: 12}},
  {name: 'fijar y', block: call('gg_set_y', 'set-y', {Y: 20}), ir: {kind: 'setY', y: 20}, opcode: 'motion_sety',
    js: 'hero.setY(20);', python: 'hero.set_y(20)', effect: {y: 20}},
  // Bouncing and size need the renderer (bounds, costume size): Chromium verifies them.
  {name: 'rebotar en el borde', block: call('gg_bounce', 'bounce'), ir: {kind: 'bounce'}, opcode: 'motion_ifonedgebounce',
    js: 'hero.bounceOnEdge();', python: 'hero.bounce_on_edge()', effect: null, browserEffect: null},
  {name: 'decir', block: call('gg_say', 'say', {}, {MESSAGE: '¡Hola!'}), ir: {kind: 'say', message: '¡Hola!'}, opcode: 'looks_say',
    js: 'hero.say("¡Hola!");', python: 'hero.say("¡Hola!")', effect: {bubble: {type: 'say', text: '¡Hola!'}}},
  {name: 'decir por segundos', block: call('gg_say_for', 'say-for', {SECONDS: 0.1}, {MESSAGE: 'Hola'}), ir: {kind: 'sayFor', message: 'Hola', seconds: 0.1}, opcode: 'looks_sayforsecs',
    js: 'hero.sayFor("Hola", 0.1);', python: 'hero.say_for("Hola", 0.1)', effect: {bubble: null}},
  {name: 'pensar', block: call('gg_think', 'think', {}, {MESSAGE: 'Mmm'}), ir: {kind: 'think', message: 'Mmm'}, opcode: 'looks_think',
    js: 'hero.think("Mmm");', python: 'hero.think("Mmm")', effect: {bubble: {type: 'think', text: 'Mmm'}}},
  {name: 'pensar por segundos', block: call('gg_think_for', 'think-for', {SECONDS: 0.1}, {MESSAGE: 'Mmm'}), ir: {kind: 'thinkFor', message: 'Mmm', seconds: 0.1}, opcode: 'looks_thinkforsecs',
    js: 'hero.thinkFor("Mmm", 0.1);', python: 'hero.think_for("Mmm", 0.1)', effect: {bubble: null}},
  {name: 'siguiente disfraz', block: call('gg_next_costume', 'next-costume'), ir: {kind: 'nextCostume'}, opcode: 'looks_nextcostume',
    js: 'hero.nextCostume();', python: 'hero.next_costume()', effect: {costume: 1}},
  {name: 'cambiar tamaño', block: call('gg_change_size', 'change-size', {DELTA: 20}), ir: {kind: 'changeSize', delta: 20}, opcode: 'looks_changesizeby',
    js: 'hero.changeSize(20);', python: 'hero.change_size(20)', effect: null, browserEffect: {size: 120}},
  {name: 'fijar tamaño', block: call('gg_set_size', 'set-size', {SIZE: 50}), ir: {kind: 'setSize', size: 50}, opcode: 'looks_setsizeto',
    js: 'hero.setSize(50);', python: 'hero.set_size(50)', effect: null, browserEffect: {size: 50}},
  {name: 'esconder', block: call('gg_hide', 'hide'), ir: {kind: 'hide'}, opcode: 'looks_hide',
    js: 'hero.hide();', python: 'hero.hide()', effect: {visible: false}},
  {name: 'mostrar', block: call('gg_show', 'show'), ir: {kind: 'show'}, opcode: 'looks_show',
    js: 'hero.show();', python: 'hero.show()', effect: {visible: true}},
  {name: 'detener todo', block: call('gg_stop_all', 'stop-all'), ir: {kind: 'stopAll'}, opcode: 'control_stop',
    js: 'stopAll();', python: 'stop_all()', effect: {threads: 0}}
];

const variable = 'e1-n';
const read = id => ({block: {type: 'variables_get', id, fields: {VAR: {id: variable}}}});
const compare = (id, operator, value) => ({block: {type: 'logic_compare', id, fields: {OP: operator}, inputs: {A: read(`${id}-read`), B: number(`${id}-b`, value)}}});
const change = (id, value) => ({type: 'math_change', id, fields: {VAR: {id: variable}}, inputs: {DELTA: number(`${id}-n`, value)}});
const chain = (...blocks) => blocks.reduceRight((next, block) => next ? {...block, next: {block: next}} : block, null);
const hat = (type, id, body, extra = {}) => ({type, id, ...extra, inputs: {DO: {block: body}}});
const workspace = (blocks, variables = []) => ({blocks: {languageVersion: 0, blocks}, ...(variables.length ? {variables} : {})});
const declared = [{name: 'n', id: variable}];

// Core structures, each as a whole program with its text and observable result.
export const structureCases = [
  {name: 'por siempre', kind: 'forever',
    workspace: workspace([hat('gg_when_start', 'forever-start', {type: 'gg_forever', id: 'forever', inputs: {DO: {block: call('gg_change_x', 'forever-step', {DX: 10})}}}, {x: 20, y: 20})]),
    js: ['', 'onStart(() => {', '  while (true) {', '    hero.changeX(10);', '  }', '});'],
    python: ['', '@on_start', 'def al_iniciar():', '    while True:', '        hero.change_x(10)'],
    opcodes: ['control_forever'], effect: {minimumX: 30}},
  {name: 'repetir hasta', kind: 'repeatUntil',
    workspace: workspace([hat('gg_when_start', 'until-start', {type: 'gg_repeat_until', id: 'until', inputs: {CONDITION: compare('until-test', 'GT', 2),
      DO: {block: chain(change('until-change', 1), call('gg_change_x', 'until-step', {DX: 10}))}}}, {x: 20, y: 20})], declared),
    js: ['let n = 0;', '', 'onStart(() => {', '  while (!(n > 2)) {', '    n += 1;', '    hero.changeX(10);', '  }', '});'],
    python: ['n = 0', '', '@on_start', 'def al_iniciar():', '    global n', '    while not (n > 2):', '        n += 1', '        hero.change_x(10)'],
    opcodes: ['control_repeat_until'], effect: {x: 30, n: 3}},
  {name: 'esperar hasta', kind: 'waitUntil',
    workspace: workspace([
      hat('gg_when_start', 'wait-until-start', chain({type: 'gg_wait_until', id: 'wait-until', inputs: {CONDITION: compare('wait-until-test', 'GT', 2)}}, call('gg_set_x', 'wait-until-after', {X: 99})), {x: 20, y: 20}),
      hat('gg_when_start', 'counter-start', {type: 'controls_repeat_ext', id: 'counter', inputs: {TIMES: number('counter-times', 3), DO: {block: chain(change('counter-change', 1), {type: 'gg_wait', id: 'counter-wait', inputs: {SECONDS: number('counter-wait-n', 0.05)}})}}}, {x: 20, y: 240})
    ], declared),
    js: ['let n = 0;', '', 'onStart(() => {', '  waitUntil(() => n > 2);', '  hero.setX(99);', '});', '', 'onStart(() => {', '  for (let i = 0; i < 3; i++) {', '    n += 1;', '    wait(0.05);', '  }', '});'],
    python: ['n = 0', '', '@on_start', 'def al_iniciar():', '    wait_until(lambda: n > 2)', '    hero.set_x(99)', '', '@on_start', 'def al_iniciar_2():', '    global n', '    for i in range(3):', '        n += 1', '        wait(0.05)'],
    opcodes: ['control_wait_until'], effect: {x: 99, n: 3}},
  {name: 'detener este programa', kind: 'stopScript',
    workspace: workspace([hat('gg_when_start', 'stop-start', {type: 'controls_repeat_ext', id: 'stop-repeat', inputs: {TIMES: number('stop-times', 5), DO: {block: chain(
      call('gg_change_x', 'stop-step', {DX: 10}), change('stop-change', 1),
      {type: 'controls_if', id: 'stop-if', inputs: {IF0: compare('stop-test', 'GT', 1), DO0: {block: {type: 'gg_stop_script', id: 'stop-script'}}}})}}}, {x: 20, y: 20})], declared),
    js: ['let n = 0;', '', 'onStart(() => {', '  for (let i = 0; i < 5; i++) {', '    hero.changeX(10);', '    n += 1;', '    if (n > 1) {', '      return;', '    }', '  }', '});'],
    python: ['n = 0', '', '@on_start', 'def al_iniciar():', '    global n', '    for i in range(5):', '        hero.change_x(10)', '        n += 1', '        if n > 1:', '            return'],
    opcodes: ['control_stop'], effect: {x: 20, n: 2}}
];

export function singleBlockWorkspace(item) {
  return workspace([hat('gg_when_start', 'case-start', item.block, {x: 20, y: 20})]);
}
export function singleBlockSource(item, language) {
  return language === 'python' ? `@on_start\ndef al_iniciar():\n    ${item.python}\n` : `onStart(() => {\n  ${item.js}\n});\n`;
}
