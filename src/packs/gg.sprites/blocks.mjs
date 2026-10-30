export const blocks = [
  {type: 'gg_when_start', message0: 'al iniciar %1', args0: [{type: 'input_statement', name: 'DO'}], colour: 45},
  {type: 'gg_move', message0: 'mover %1 pasos', args0: [{type: 'input_value', name: 'STEPS', check: 'Number'}], previousStatement: null, nextStatement: null, colour: 210},
  {type: 'gg_when_key', message0: 'al pulsar %1 %2', args0: [{type: 'field_input', name: 'KEY', text: 'space'}, {type: 'input_statement', name: 'DO'}], colour: 45},
  {type: 'gg_when_clicked', message0: 'al hacer clic %1', args0: [{type: 'input_statement', name: 'DO'}], colour: 45},
  {type: 'gg_when_message', message0: 'al recibir %1 %2', args0: [{type: 'field_input', name: 'MESSAGE', text: 'go'}, {type: 'input_statement', name: 'DO'}], colour: 45},
  {type: 'gg_when_clone', message0: 'al comenzar clon %1', args0: [{type: 'input_statement', name: 'DO'}], colour: 45},
  {type: 'gg_wait', message0: 'esperar %1 segundos', args0: [{type: 'input_value', name: 'SECONDS', check: 'Number'}], previousStatement: null, nextStatement: null, colour: 45},
  {type: 'gg_broadcast_wait', message0: 'enviar %1 y esperar', args0: [{type: 'field_input', name: 'MESSAGE', text: 'go'}], previousStatement: null, nextStatement: null, colour: 45},
  {type: 'gg_create_clone', message0: 'crear clon', previousStatement: null, nextStatement: null, colour: 45},
  {type: 'gg_delete_clone', message0: 'eliminar clon', previousStatement: null, nextStatement: null, colour: 45},
  {type: 'gg_play_sound_wait', message0: 'tocar %1 y esperar', args0: [{type: 'field_input', name: 'SOUND', text: 'tone'}], previousStatement: null, nextStatement: null, colour: 290},
  {type: 'gg_play_sound', message0: 'iniciar sonido %1', args0: [{type: 'field_input', name: 'SOUND', text: 'tone'}], previousStatement: null, nextStatement: null, colour: 290},
  {type: 'gg_stop_sounds', message0: 'detener sonidos', previousStatement: null, nextStatement: null, colour: 290},
  {type: 'gg_set_global', message0: 'fijar global %1 a %2', args0: [{type: 'field_variable', name: 'VAR', variable: 'global'}, {type: 'input_value', name: 'VALUE', check: 'Number'}], previousStatement: null, nextStatement: null, colour: 330},
  {type: 'gg_set_costume', message0: 'cambiar disfraz a %1', args0: [{type: 'field_dropdown', name: 'COSTUME', options: [['hero', 'hero'], ['hero-alt', 'hero-alt']]}], previousStatement: null, nextStatement: null, colour: 290}
];

// gg.sprites@0.2.0 (scene2d-vocabulary-v2, tanda E1): single-sprite motion and
// looks vocabulary. The 0.1.0 definitions above stay byte-identical (hash).
const number = name => ({type: 'input_value', name, check: 'Number'});
const statement = (type, message0, args0 = [], extra = {}) => ({type, message0, ...(args0.length ? {args0} : {}), previousStatement: null, nextStatement: null, ...extra});
const text = (name, value) => ({type: 'field_input', name, text: value});
export const blocksV2 = [
  statement('gg_turn_right', 'girar ↻ %1 grados', [number('DEGREES')], {colour: 210}),
  statement('gg_turn_left', 'girar ↺ %1 grados', [number('DEGREES')], {colour: 210}),
  statement('gg_point_direction', 'apuntar en dirección %1', [number('DIRECTION')], {colour: 210}),
  statement('gg_go_to', 'ir a x: %1 y: %2', [number('X'), number('Y')], {colour: 210, inputsInline: true}),
  statement('gg_glide', 'deslizar en %1 segs a x: %2 y: %3', [number('SECONDS'), number('X'), number('Y')], {colour: 210, inputsInline: true}),
  statement('gg_change_x', 'cambiar x por %1', [number('DX')], {colour: 210}),
  statement('gg_set_x', 'fijar x a %1', [number('X')], {colour: 210}),
  statement('gg_change_y', 'cambiar y por %1', [number('DY')], {colour: 210}),
  statement('gg_set_y', 'fijar y a %1', [number('Y')], {colour: 210}),
  statement('gg_bounce', 'rebotar si toca un borde', [], {colour: 210}),
  statement('gg_say_for', 'decir %1 durante %2 segundos', [text('MESSAGE', '¡Hola!'), number('SECONDS')], {colour: 290, inputsInline: true}),
  statement('gg_say', 'decir %1', [text('MESSAGE', '¡Hola!')], {colour: 290}),
  statement('gg_think_for', 'pensar %1 durante %2 segundos', [text('MESSAGE', 'Mmm…'), number('SECONDS')], {colour: 290, inputsInline: true}),
  statement('gg_think', 'pensar %1', [text('MESSAGE', 'Mmm…')], {colour: 290}),
  statement('gg_next_costume', 'siguiente disfraz', [], {colour: 290}),
  statement('gg_change_size', 'cambiar tamaño por %1', [number('DELTA')], {colour: 290}),
  statement('gg_set_size', 'fijar tamaño a %1 %', [number('SIZE')], {colour: 290}),
  statement('gg_show', 'mostrar', [], {colour: 290}),
  statement('gg_hide', 'esconder', [], {colour: 290}),
  // «detener todo» ends every script: like Scratch, nothing can follow it.
  {type: 'gg_stop_all', message0: 'detener todo', previousStatement: null, colour: 45}
];

// gg.sprites@0.3.0 (scene2d-multi-sprite 4.1). Their menus are filled by the editor:
// other objects by name (objectMenus) and the stage's backdrops (fieldMenus).
const menu = (name, label, value) => ({type: 'field_dropdown', name, options: [[label, value]]});
export const blocksV3 = [
  statement('gg_go_to_object', 'ir a %1', [menu('TARGET', 'elige un objeto', '__gg_missing_object__')], {colour: 210}),
  statement('gg_go_to_random', 'ir a una posición aleatoria', [], {colour: 210}),
  statement('gg_set_backdrop', 'cambiar fondo a %1', [menu('BACKDROP', 'Sin fondos', '__gg_missing_resource__')], {colour: 290}),
  statement('gg_next_backdrop', 'siguiente fondo', [], {colour: 290})
];
