// Local builders produce plain JSON data; no callback is part of a lesson.
const number = (id, value) => ({shadow: {type: 'math_number', id, fields: {NUM: value}}});
const move = (id, value) => ({type: 'gg_move', id, inputs: {STEPS: number(`${id}-n`, value)}});
const chain = (...blocks) => blocks.reduceRight((next, block) => next ? {...block, next: {block: next}} : block, null);
const hat = (type, id, body, fields = {}) => ({type, id, fields, x: 20, y: id.includes('key') ? 180 : 20, inputs: {DO: {block: body}}});
const workspace = (...blocks) => ({blocks: {languageVersion: 0, blocks}});
const originalLessons = [
  {
    version: 1, id: 'story', revision: 1, title: 'Una pequeña historia',
    introduction: 'Hero comienza un viaje. Modifica el recorrido, añade una pausa y observa su cambio de disfraz.',
    starter: {name: 'Actividad · Una pequeña historia', packIds: ['gg.sprites'], blockly: workspace(
      hat('gg_when_start', 'lesson-story-start', chain(move('lesson-story-first', 20),
        {type: 'gg_wait', id: 'lesson-story-wait', inputs: {SECONDS: number('lesson-story-wait-n', 0.2)}},
        {type: 'gg_set_costume', id: 'lesson-story-costume', fields: {COSTUME: 'hero-alt'}}, move('lesson-story-last', 20))))},
    steps: [
      {id: 'story-position', title: 'Llega hasta x=60', instructions: 'El ejemplo llega a x=40. Cambia uno de los movimientos y pulsa Ejecutar bloques. Después, comprueba la posición.',
        hints: ['Puedes cambiar el primer movimiento de 20 a 40 pasos.'], checks: [{kind: 'position', axis: 'x', equals: 60, tolerance: 0.01}]},
      {id: 'story-costume', title: 'Declara un cambio de disfraz', instructions: 'Conserva o añade el bloque para cambiar al disfraz hero-alt y observa el escenario. Aquí comprobamos que ese bloque está en tu programa; no comprobamos sus píxeles.',
        hints: ['Busca Cambiar disfraz en Apariencia.'], checks: [{kind: 'authored-operation', operation: 'setCostume', costume: 'hero-alt'}]}
    ]
  },
  {
    version: 1, id: 'score', revision: 1, title: 'Un juego de tres puntos',
    introduction: 'Usa la puntuación compartida del pack Score. Cada pulsación de espacio suma un punto y mueve a hero.',
    starter: {name: 'Actividad · Un juego de tres puntos', packIds: ['gg.sprites', 'gg.score'], blockly: workspace(
      hat('gg_when_start', 'lesson-score-start', {type: 'gg_score_set', id: 'lesson-score-reset', inputs: {VALUE: number('lesson-score-reset-n', 0)}}),
      hat('gg_when_key', 'lesson-score-key', chain({type: 'gg_score_change', id: 'lesson-score-change', inputs: {DELTA: number('lesson-score-change-n', 1)}},
        move('lesson-score-move', 5)), {KEY: 'space'}))},
    steps: [
      {id: 'score-three', title: 'Consigue tres puntos', instructions: 'Ejecuta los bloques, enfoca el escenario y pulsa espacio tres veces. Comprobaremos el valor real de Puntos.',
        hints: ['Si te pasas, Ejecutar bloques vuelve a comenzar desde cero.'], checks: [{kind: 'variable', variableId: 'gg-pack-score', equals: 3}]},
      {id: 'score-position', title: 'Avanza diez pasos por punto', instructions: 'El ejemplo avanza cinco pasos. Cámbialo para que tres puntos lleven a hero hasta x=30. Vuelve a ejecutar y consigue tres puntos.',
        hints: ['Cambia el movimiento del evento espacio a 10.'], checks: [{kind: 'position', axis: 'x', equals: 30, tolerance: 0.01}]}
    ]
  },
  {
    version: 1, id: 'text-transition', revision: 1, title: 'De bloques a tu propio código',
    introduction: 'Crea una copia JavaScript o Python, cambia su movimiento y conserva los bloques originales.',
    starter: {name: 'Actividad · De bloques a tu propio código', packIds: ['gg.sprites'], blockly: workspace(
      hat('gg_when_start', 'lesson-text-start', {type: 'controls_repeat_ext', id: 'lesson-text-repeat', inputs: {
        TIMES: number('lesson-text-repeat-n', 3), DO: {block: move('lesson-text-move', 4)}
      }}))},
    steps: [
      {id: 'text-copy', title: 'Crea una copia independiente', instructions: 'El ejemplo de bloques llega a x=12. Usa Crear copia JavaScript o Crear copia Python y ejecuta ese documento.',
        hints: ['La copia no se ejecuta al crearla. Usa Ejecutar documento.'], checks: [{kind: 'text-copy'}]},
      {id: 'text-blocks', title: 'Conserva los bloques', instructions: 'Edita únicamente el documento textual. Comparamos los bloques actuales con los que tenían al crear la copia.',
        hints: ['Editar la copia no sincroniza cambios hacia los bloques.'], checks: [{kind: 'blocks-unchanged'}]},
      {id: 'text-position', title: 'Llega a x=18 con tu código', instructions: 'Modifica el movimiento de la copia para llegar a x=18. Conserva los bloques y ejecuta el documento seleccionado para comprobar tu idea.',
        hints: ['Tres movimientos de seis pasos llegan a dieciocho.'], checks: [{kind: 'position', axis: 'x', equals: 18, tolerance: 0.01}]}
    ]
  }
];

const learning = {
  story: {
    objective: 'Explicar cómo se combinan dos movimientos y una pausa para construir un recorrido.',
    prerequisites: ['Reconocer el bloque Mover y editar un número.', 'Usar Ejecutar y Detener; pedir al docente una demostración si hace falta.'],
    prediction: 'El ejemplo inicial tiene dos movimientos de 20. ¿Hasta qué posición llegará hero? ¿Qué cambia durante la pausa?',
    reflection: 'Compara tu predicción con la posición observada. Explica qué movimiento cambiaste y qué hace la pausa. El check de disfraz verifica el bloque, no sus píxeles.',
    variant: {id: 'story-variant', title: 'Otro recorrido hasta x=80',
      instructions: 'Conserva tu historia y cambia los movimientos para llegar a x=80. Busca después otra combinación que llegue al mismo lugar; explica ambas al docente.',
      prediction: '¿Qué dos movimientos elegirás para llegar a x=80? Predice el resultado antes de ejecutarlos.',
      reflection: '¿Cómo pueden dos programas con números diferentes llegar al mismo lugar? Explica también qué no demuestra el check de posición.',
      hints: ['Observa los dos movimientos y la posición inicial.', 'La posición final reúne los pasos de ambos movimientos; la pausa no añade pasos.', 'Prueba dos movimientos de 40 y después busca una combinación distinta.'],
      checks: [{kind: 'position', axis: 'x', equals: 80, tolerance: 0.01}]}
  },
  score: {
    objective: 'Relacionar un evento de teclado con un cambio de puntos y de posición.',
    prerequisites: ['Enfocar el escenario y pulsar espacio; el docente puede mostrar cómo salir con Tab.', 'Distinguir los puntos de la posición de hero.'],
    prediction: '¿Cuántos puntos y pasos habrá después de tres pulsaciones? ¿Qué esperas que ocurra al ejecutar de nuevo?',
    reflection: 'Explica qué cambia en cada pulsación y qué vuelve a cero al ejecutar. Compara Puntos y posición sin confundirlos.',
    variant: {id: 'score-variant', title: 'Cuatro puntos, cuarenta pasos',
      instructions: 'Adapta el juego para que cuatro pulsaciones de espacio dejen Puntos en 4 y a hero en x=40. Ejecuta de nuevo antes de contar las pulsaciones.',
      prediction: '¿Cuánto debe avanzar hero por punto? Predice los puntos y la posición después de cada pulsación.',
      reflection: 'Explica por qué sumar puntos y mover son acciones distintas. ¿Qué ocurriría con cinco pulsaciones?',
      hints: ['Observa los bloques del evento espacio y el reinicio de Puntos.', 'Cuatro pulsaciones repiten cuatro veces el mismo movimiento.', 'Con un movimiento de 10, ejecuta de nuevo y pulsa espacio cuatro veces.'],
      checks: [{kind: 'variable', variableId: 'gg-pack-score', equals: 4}, {kind: 'position', axis: 'x', equals: 40, tolerance: 0.01}]}
  },
  'text-transition': {
    objective: 'Modificar y ejecutar una copia textual independiente, explicando por qué los bloques conservan su programa.',
    prerequisites: ['Reconocer una repetición y el movimiento que contiene.', 'Distinguir código derivado de solo lectura y documento editable; pedir una demostración si hace falta.'],
    prediction: 'Los bloques repiten tres movimientos de 4. ¿Qué cambiará al editar solo la copia? Nombra el documento que vas a ejecutar.',
    reflection: 'Compara el resultado del documento con el de los bloques. Explica por qué editar la copia no cambia el programa original.',
    variant: {id: 'text-variant', title: 'Tu copia llega a x=24',
      instructions: 'Conserva los bloques originales y adapta únicamente tu copia para llegar a x=24. Ejecuta el documento seleccionado y compara después con los bloques.',
      prediction: '¿Qué cambiarás en el documento para llegar a x=24? ¿Dónde esperas que terminen los bloques originales?',
      reflection: 'Explica qué documento produjo cada resultado y por qué la copia no sincroniza sus cambios hacia los bloques.',
      hints: ['Identifica el documento seleccionado y la repetición dentro de su código.', 'El movimiento del documento se repite tres veces; sus bloques siguen con su valor original.', 'Cambia el movimiento de la copia a 8 y ejecuta ese documento, conservando los bloques.'],
      checks: [{kind: 'text-copy'}, {kind: 'blocks-unchanged'}, {kind: 'position', axis: 'x', equals: 24, tolerance: 0.01}]}
  }
};
const hints = {
  'story-position': ['Observa los dos bloques Mover y lee la posición al terminar.', 'La posición final reúne ambos movimientos. La pausa cambia el tiempo, no la distancia.', 'Conserva el último movimiento en 20 y prueba el primero en 40.'],
  'story-costume': ['Observa qué ocurre después de la pausa.', 'El bloque de Apariencia declara el cambio de disfraz dentro del programa.', 'Busca Cambiar disfraz en Apariencia y selecciona hero-alt.'],
  'score-three': ['Lee Puntos y observa qué evento lo modifica.', 'Cada espacio suma un punto. Ejecutar vuelve a empezar desde cero.', 'Ejecuta, enfoca el escenario y pulsa espacio tres veces.'],
  'score-position': ['Compara los puntos con la distancia recorrida.', 'Tres pulsaciones repiten tres veces el movimiento del evento espacio.', 'Cambia ese movimiento a 10, ejecuta de nuevo y consigue tres puntos.'],
  'text-copy': ['Localiza el código derivado y las acciones para crear una copia.', 'La copia es otro documento y no se ejecuta al crearlo.', 'Usa Crear copia JavaScript o Crear copia Python y después Ejecutar documento.'],
  'text-blocks': ['Compara los bloques antes y después de editar el documento.', 'Los bloques y su copia tienen autoría independiente.', 'Conserva los bloques con los que creaste la copia y modifica únicamente el texto.'],
  'text-position': ['Busca el movimiento y cuántas veces se repite en el documento.', 'Tres repeticiones multiplican el avance de cada movimiento.', 'Cambia el movimiento de 4 a 6 en la copia y ejecuta el documento.']
};
// Presentation v2 keeps the original starter/check revision and stable IDs.
export const lessonDefinitions = originalLessons.map(lesson => ({...lesson, version: 2, learning: learning[lesson.id],
  steps: lesson.steps.map(step => ({...step, hints: hints[step.id]}))}));
