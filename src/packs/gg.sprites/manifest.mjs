import {blocks} from './blocks.mjs';
const block = (type, inputs) => ({kind: 'block', type, ...(inputs ? {inputs} : {})});
const number = (name, value) => ({[name]: {shadow: {type: 'math_number', fields: {NUM: value}}}});
export const initialScene = Object.freeze({spriteId: 'hero', x: 0, y: 0, direction: 90, size: 100, costume: 'hero'});
export const spritesPack = {
  id: 'gg.sprites', version: '0.1.0', apiVersion: 1, dependencies: [], resources: ['stage', 'hero', 'hero-alt', 'tone'],
  configSchema: {type: 'object', required: ['initialScene'], properties: {initialScene: {const: initialScene}}, additionalProperties: false},
  defaults: {initialScene}, variables: [], migrations: [],
  permissions: {operations: ['scene.get', 'sprite.get', 'sprite.move', 'sprite.setPosition', 'variables.get', 'variables.set', 'events.emit',
    'program.start', 'program.stop', 'program.move', 'program.wait', 'program.setVariable', 'program.changeVariable', 'program.compare',
    'program.broadcastAndWait', 'program.createClone', 'program.deleteClone', 'program.playSound', 'program.stopSounds', 'program.setCostume'],
    variables: 'declared', sprites: ['hero'], costumes: ['hero', 'hero-alt'], sounds: ['tone']},
  contributions: {
    blocks,
    variableFlyout: [{type: 'gg_set_global', input: 'VALUE', field: 'VAR', initial: 0}],
    toolbox: [
      {kind: 'category', name: 'Eventos', colour: 45, contents: [block('gg_when_start'), block('gg_when_message'), block('gg_when_key'), block('gg_when_clicked'), block('gg_broadcast_wait')]},
      {kind: 'category', name: 'Movimiento', colour: 210, contents: [block('gg_move', number('STEPS', 10))]},
      {kind: 'category', name: 'Control', colour: 45, contents: [block('controls_repeat_ext', number('TIMES', 3)), block('gg_wait', number('SECONDS', 0.2)), block('controls_if'), block('logic_compare'), block('math_number')]},
      {kind: 'category', name: 'Apariencia', colour: 290, contents: [block('gg_set_costume')]},
      {kind: 'category', name: 'Clones', colour: 45, contents: [block('gg_create_clone'), block('gg_when_clone'), block('gg_delete_clone')]},
      {kind: 'category', name: 'Sonido', colour: 290, contents: [block('gg_play_sound_wait'), block('gg_play_sound'), block('gg_stop_sounds')]},
      {kind: 'category', name: 'Variables', colour: 330, custom: 'GG_VARIABLE'}
    ],
    hats: {
      gg_when_start: {event: 'start', body: 'DO'}, gg_when_key: {event: 'key', body: 'DO', fields: {key: {field: 'KEY', type: 'key'}}},
      gg_when_clicked: {event: 'click', body: 'DO'}, gg_when_message: {event: 'message', body: 'DO', fields: {message: {field: 'MESSAGE', type: 'message'}}},
      gg_when_clone: {event: 'clone', body: 'DO'}
    },
    statements: {
      gg_move: {kind: 'move', values: {steps: {input: 'STEPS', type: 'expression'}}},
      gg_wait: {kind: 'wait', values: {seconds: {input: 'SECONDS', type: 'number', minimum: 0, maximum: 60, label: 'wait'}}},
      gg_broadcast_wait: {kind: 'broadcastWait', values: {message: {field: 'MESSAGE', type: 'message'}}},
      gg_create_clone: {kind: 'createClone'}, gg_delete_clone: {kind: 'deleteClone'},
      gg_set_global: {kind: 'setVariable', variableField: 'VAR', declaresGlobal: 'VAR', values: {value: {input: 'VALUE', type: 'expression'}}},
      gg_set_costume: {kind: 'setCostume', values: {costume: {field: 'COSTUME', enum: ['hero', 'hero-alt']}}},
      gg_play_sound: {kind: 'playSound', values: {sound: {field: 'SOUND', enum: ['tone']}, wait: {literal: false}}},
      gg_play_sound_wait: {kind: 'playSound', values: {sound: {field: 'SOUND', enum: ['tone']}, wait: {literal: true}}},
      gg_stop_sounds: {kind: 'stopSounds'}
    },
    expressions: {}
  }
};
