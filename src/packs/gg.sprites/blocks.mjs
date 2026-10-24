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
