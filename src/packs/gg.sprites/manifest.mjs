import {blocks, blocksV2} from './blocks.mjs';
import {spriteLanguage02} from '../language-tables.mjs';
import {scene2DObjectsSchema} from '../../contracts/scene2d-objects.mjs';
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

// gg.sprites@0.2.0 (scene2d-vocabulary-v2, tanda E1). Same scene, resources
// and configuration as 0.1.0, whose manifest above stays frozen by its hash.
// Adds single-sprite motion/looks blocks, «detener todo» and offers the core
// control structures forever / repeat until / wait until / stop this script.
// apiVersion 2: the manifest carries its language table. The 0.1.0 → 0.2.0
// migration (no block changes) is a catalog record; 0.2.0 satisfies
// dependencies declared on 0.1.0 (catalog compatibility data).
const numbers = entries => Object.fromEntries(entries.map(([name, value]) => [name, {shadow: {type: 'math_number', fields: {NUM: value}}}]));
const expression = input => ({input, type: 'expression'});
const seconds = (input, label) => ({input, type: 'number', minimum: 0, maximum: 60, label});
const message = {field: 'MESSAGE', type: 'text'};
const v1 = spritesPack.contributions;
const category = name => structuredClone(v1.toolbox.find(item => item.name === name));
export const spritesPack02 = {
  id: 'gg.sprites', version: '0.2.0', apiVersion: 2, dependencies: [], resources: ['stage', 'hero', 'hero-alt', 'tone'],
  configSchema: structuredClone(spritesPack.configSchema), defaults: {initialScene}, variables: [], migrations: [],
  permissions: {...structuredClone(spritesPack.permissions), operations: [...spritesPack.permissions.operations,
    'program.turnRight', 'program.turnLeft', 'program.pointInDirection', 'program.goTo', 'program.glide', 'program.changeX', 'program.setX',
    'program.changeY', 'program.setY', 'program.bounceOnEdge', 'program.say', 'program.sayFor', 'program.think', 'program.thinkFor',
    'program.nextCostume', 'program.changeSize', 'program.setSize', 'program.show', 'program.hide', 'program.stopAll']},
  language: spriteLanguage02,
  contributions: {
    blocks: [...blocks, ...blocksV2],
    variableFlyout: structuredClone(v1.variableFlyout),
    toolbox: [
      category('Eventos'),
      {kind: 'category', name: 'Movimiento', colour: 210, contents: [
        block('gg_move', number('STEPS', 10)), block('gg_turn_right', number('DEGREES', 15)), block('gg_turn_left', number('DEGREES', 15)),
        block('gg_go_to', numbers([['X', 0], ['Y', 0]])), block('gg_glide', numbers([['SECONDS', 1], ['X', 0], ['Y', 0]])),
        block('gg_point_direction', number('DIRECTION', 90)), block('gg_change_x', number('DX', 10)), block('gg_set_x', number('X', 0)),
        block('gg_change_y', number('DY', 10)), block('gg_set_y', number('Y', 0)), block('gg_bounce')]},
      {kind: 'category', name: 'Apariencia', colour: 290, contents: [
        block('gg_say_for', number('SECONDS', 2)), block('gg_say'), block('gg_think_for', number('SECONDS', 2)), block('gg_think'),
        block('gg_set_costume'), block('gg_next_costume'), block('gg_change_size', number('DELTA', 10)), block('gg_set_size', number('SIZE', 100)),
        block('gg_show'), block('gg_hide')]},
      {kind: 'category', name: 'Control', colour: 45, contents: [
        block('controls_repeat_ext', number('TIMES', 3)), block('gg_forever'), block('gg_wait', number('SECONDS', 0.2)),
        block('controls_if'), block('gg_wait_until'), block('gg_repeat_until'), block('logic_compare'), block('math_number'),
        block('gg_stop_all'), block('gg_stop_script')]},
      category('Clones'), category('Sonido'), category('Variables')
    ],
    hats: structuredClone(v1.hats),
    statements: {
      ...structuredClone(v1.statements),
      gg_turn_right: {kind: 'turnRight', values: {degrees: expression('DEGREES')}},
      gg_turn_left: {kind: 'turnLeft', values: {degrees: expression('DEGREES')}},
      gg_point_direction: {kind: 'pointDirection', values: {direction: expression('DIRECTION')}},
      gg_go_to: {kind: 'goTo', values: {x: expression('X'), y: expression('Y')}},
      gg_glide: {kind: 'glide', values: {seconds: seconds('SECONDS', 'glide'), x: expression('X'), y: expression('Y')}},
      gg_change_x: {kind: 'changeX', values: {dx: expression('DX')}},
      gg_set_x: {kind: 'setX', values: {x: expression('X')}},
      gg_change_y: {kind: 'changeY', values: {dy: expression('DY')}},
      gg_set_y: {kind: 'setY', values: {y: expression('Y')}},
      gg_bounce: {kind: 'bounce'},
      gg_say_for: {kind: 'sayFor', values: {message, seconds: seconds('SECONDS', 'say')}},
      gg_say: {kind: 'say', values: {message}},
      gg_think_for: {kind: 'thinkFor', values: {message, seconds: seconds('SECONDS', 'think')}},
      gg_think: {kind: 'think', values: {message}},
      gg_next_costume: {kind: 'nextCostume'},
      gg_change_size: {kind: 'changeSize', values: {delta: expression('DELTA')}},
      gg_set_size: {kind: 'setSize', values: {size: expression('SIZE')}},
      gg_show: {kind: 'show'}, gg_hide: {kind: 'hide'},
      gg_stop_all: {kind: 'stopAll'}
    },
    expressions: {}
  }
};

// gg.sprites@0.3.0 (scene2d-multi-sprite, E2). Same vocabulary, language table,
// resources and permissions as 0.2.0, whose manifest above stays frozen by its
// hash. The configuration holds the stage and a list of 1–8 sprites; the
// 0.2.0 → 0.3.0 migration (initialScene → sprites[0] «hero», no block changes)
// is a catalog record and 0.3.0 satisfies dependencies declared on 0.1.0
// (catalog compatibility data).
const hero = {id: 'hero', name: 'hero', x: initialScene.x, y: initialScene.y, direction: initialScene.direction, size: initialScene.size, visible: true, costume: initialScene.costume};
export const spritesPack03 = {
  id: 'gg.sprites', version: '0.3.0', apiVersion: 2, dependencies: [], resources: [...spritesPack02.resources],
  configSchema: structuredClone(scene2DObjectsSchema), configValidator: 'scene2d-objects-v1',
  defaults: {stage: {backdrop: 'stage'}, sprites: [hero]}, variables: [], migrations: [],
  permissions: structuredClone(spritesPack02.permissions),
  language: spriteLanguage02,
  contributions: structuredClone(spritesPack02.contributions)
};
