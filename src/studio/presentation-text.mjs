// Presentation only: educational Spanish for the first reading level. Paths,
// identifiers, opcodes, operations and serialized values are never rewritten;
// callers keep the original text available as technical detail.

const propertyWords = {
  id: 'Identificador', name: 'Nombre', kind: 'Tipo', type: 'Tipo', parentId: 'Dentro de', visible: 'Visible',
  text: 'Texto', label: 'Etiqueta', value: 'Valor inicial', inputType: 'Tipo de entrada', items: 'Elementos de la lista',
  assetBindingId: 'Recurso vinculado', bindingId: 'Modelo vinculado',
  styles: 'Estilo', color: 'Color', backgroundColor: 'Color de fondo', fontSize: 'Tamaño de letra', display: 'Disposición', gap: 'Separación',
  transform: 'Colocación', position: 'Posición', rotationDegrees: 'Giro en grados', scale: 'Tamaño relativo',
  diameter: 'Diámetro', segments: 'Segmentos', collidable: 'Choca con otros objetos', width: 'Ancho', height: 'Alto', depth: 'Profundidad',
  subdivisions: 'Subdivisiones', intensity: 'Intensidad', diffuse: 'Color de la luz', direction: 'Dirección',
  alpha: 'Ángulo horizontal', beta: 'Ángulo vertical', radius: 'Distancia', target: 'Punto de mira'
};
const containers = new Set(['props', 'properties']);

// ['props','styles','fontSize'] → 'Estilo · Tamaño de letra'. Axis names stay as x/y/z.
const objectTypeWords = {sphere: 'Esfera', group: 'Grupo', box: 'Caja', ground: 'Suelo', hemisphericLight: 'Luz ambiental', pointLight: 'Luz puntual',
  text: 'Texto', input: 'Campo de texto', button: 'Botón', list: 'Lista', form: 'Formulario'};
// Educational name first; the technical type stays visible for teachers and exports.
export function objectTypeLabel(type) {
  return objectTypeWords[type] ? objectTypeWords[type] + ' (' + type + ')' : type;
}
export function propertyLabel(path) {
  const words = path.filter(key => !containers.has(key)).map(key => propertyWords[key] ?? key);
  return words.length ? words.join(' · ') : path.join(' · ');
}

// The guide above the blocks, true of the object on screen. `owner`: its ID, null
// in a single-workspace profile; `blocks`: the types in its workspace.
export function creationGuide({owner, name, blocks}) {
  if (owner === 'stage') return blocks.length ? 'Cambia un bloque del escenario, cuéntale a tu docente qué esperas y compara con el resultado.'
    : 'El escenario no se mueve, pero cambia de fondo: añade un evento y un bloque de Apariencia, y compara con el resultado.';
  if (!blocks.length) return 'Empieza ' + (name ? 'el programa de ' + name : 'tu programa') + ': arrastra un evento, como «al iniciar», y ponle bloques dentro.';
  const move = blocks.includes('gg_move');
  return 'Cambia un bloque' + (move ? ' Mover' : '') + ', cuéntale a tu docente qué esperas y compara con el escenario.';
}

function technical(message) { return String(message ?? '').replace(/^GG capability: /, ''); }

// Validation of initial properties. Returns a cause and a next step.
export function explainValidation(error, {duplicateId = null, context = 'webapp'} = {}) {
  const message = technical(error?.message ?? error);
  const thing = context === 'scene3d' ? 'objeto' : 'componente';
  if (duplicateId !== null) return {title: `Ya existe otro ${thing} con el identificador «${duplicateId}».`, next: `Escribe un identificador distinto, por ejemplo «${duplicateId}-2», y vuelve a aplicar.`};
  if (/^ID inválido/.test(message)) return {title: 'El identificador no es válido.', next: 'Usa de 1 a 128 caracteres: letras sin tildes, números, guion (-), guion bajo (_) o dos puntos (:), sin espacios.'};
  if (/número fuera de dominio/.test(message)) return {title: 'Un número está fuera del rango permitido.', next: 'Revisa los valores numéricos; por ejemplo, un tamaño debe ser mayor que 0.'};
  if (/literal numérico inválido/.test(message)) return {title: 'Un número no se pudo leer.', next: 'Escribe solo cifras, con punto como separador decimal.'};
  if (/texto (inválido|fuera de esquema)/.test(message)) return {title: 'Un texto no tiene el formato esperado.', next: 'Revisa los colores (formato #RRGGBB) y los textos de más de 1024 caracteres.'};
  if (/Tipo de entrada web inválido/.test(message)) return {title: 'El tipo de entrada debe ser «text» o «number».', next: 'Escribe uno de esos dos valores y vuelve a aplicar.'};
  if (/no habilitada por los packs|no habilitado por los packs/.test(message)) return {title: 'Esta propiedad necesita jerarquías, modelos y luces.', next: 'Activa «Activar jerarquías, modelos y luces» o conserva el valor inicial.'};
  if (/jerarquía cíclica|árbol web cíclico/.test(message)) return {title: `Un ${thing} no puede quedar dentro de sí mismo ni a más de ocho niveles.`, next: 'Elige otro contenedor en «Dentro de».'};
  if (/Unexpected token|JSON/.test(message)) return {title: 'La lista no tiene el formato esperado.', next: 'Escríbela como ["uno", "dos"].'};
  if (/Selecciona un objeto/.test(message)) return {title: 'Selecciona un objeto antes de aplicar.', next: 'Elige un objeto en la lista superior.'};
  return {title: 'No se aplicaron los cambios.', next: 'Revisa el valor marcado y vuelve a aplicar. Tu proyecto y la ejecución activa no cambiaron.'};
}

const syntax = /Unexpected token|Unexpected end|SyntaxError|invalid syntax|Unterminated|expected/i;
// Console records keep code, origin and message in technical detail.
export function explainDiagnostic(record) {
  const line = record.sourceLocation?.line;
  const at = line ? ` cerca de la línea ${line}` : '';
  switch (record.code) {
    case 'LANGUAGE_PREPARE':
      return syntax.test(record.message)
        ? {title: 'Hay un error de escritura en el código.', next: `Revisa paréntesis, comillas, dos puntos y llaves${at}. El documento no se ejecutó.`}
        : {title: 'No se pudo preparar el documento.', next: `Revisa el código${at} y vuelve a ejecutar.`};
    case 'LANGUAGE_ERROR': return {title: 'El programa se detuvo por un error.', next: `Lee el detalle, corrige el código${at} y ejecuta de nuevo.`};
    case 'LANGUAGE_TIME_LIMIT': return {title: 'El programa tardó demasiado y se detuvo.', next: 'Revisa los bucles que no terminan o añade esperas.'};
    case 'LANGUAGE_WORKER_FAILED': return {title: 'El intérprete de texto se detuvo.', next: 'Ejecuta de nuevo. Tu documento se conserva.'};
    case 'LANGUAGE_LOG_LIMIT': case 'TEXT_LOG_LIMIT': return {title: 'El programa escribió demasiados mensajes.', next: 'Se dejaron de mostrar algunos; el programa sigue igual.'};
    case 'DEVICE_COMPILE': return {title: 'El firmware no se pudo compilar.', next: 'Revisa el bloque o la línea señalada y compila de nuevo.'};
    case 'DEVICE_ERROR': return {title: 'Hubo un problema con el programa del micro:bit.', next: 'Lee el detalle y revisa los bloques de firmware.'};
    case 'GENERATION_INVALID': return {title: 'Hay un bloque incompleto o que no se puede ejecutar.', next: 'Revisa el bloque señalado: completa sus valores o quítalo.'};
    case 'CONTEXT_AUTHORING': return explainValidation(record.message, {context: record.origin});
    case 'SCENE3D_RENDER': return {title: 'La escena 3D no pudo mostrar un elemento.', next: 'Revisa el objeto o modelo indicado en el detalle.'};
    case 'SB3_RUNTIME_LIMIT': return {title: 'El proyecto Scratch alcanzó un límite de ejecución.', next: 'Detén y vuelve a ejecutar; algunos proyectos superan los límites de este entorno.'};
    case 'RESOURCE_ERROR': return {title: 'No se completó la acción con el recurso.', next: 'Revisa el formato y el tamaño del archivo; tu proyecto se conserva.'};
    case 'TEXT_DOCUMENT': return {title: 'El documento de texto no es válido todavía.', next: 'Revisa que tenga nombre y que su código no supere el límite. Tu borrador se conserva.'};
    case 'TEXT_COPY_FAILED': return {title: 'No se pudo crear la copia de texto.', next: 'Revisa el bloque señalado y vuelve a intentarlo.'};
    case 'PROJECT_ERROR': return {title: 'Hubo un problema con el archivo del proyecto.', next: 'Tu proyecto actual se conserva. Revisa el detalle.'};
    case 'LESSON_ERROR': case 'LESSON_STALE': return {title: 'La actividad necesita atención.', next: 'Lee el detalle y vuelve a comprobar después de ejecutar.'};
    case 'SHELL_ERROR': return {title: 'No se completó la acción.', next: 'Lee el detalle; tu proyecto se conserva.'};
    default: return null;
  }
}

// Educational names for the Scratch 3 core opcodes shown in coverage.
const opcodes = {
  event_whenflagclicked: 'Al hacer clic en la bandera', event_whenkeypressed: 'Al presionar una tecla', event_whenthisspriteclicked: 'Al hacer clic en este objeto',
  event_whenstageclicked: 'Al hacer clic en el escenario', event_whenbroadcastreceived: 'Al recibir un mensaje', event_broadcast: 'Enviar mensaje',
  event_broadcastandwait: 'Enviar mensaje y esperar', event_whenbackdropswitchesto: 'Al cambiar el fondo', event_whengreaterthan: 'Cuando un valor supera otro',
  motion_movesteps: 'Mover pasos', motion_turnright: 'Girar a la derecha', motion_turnleft: 'Girar a la izquierda', motion_goto: 'Ir a', motion_gotoxy: 'Ir a x, y',
  motion_glideto: 'Deslizar hacia', motion_glidesecstoxy: 'Deslizar hasta x, y', motion_pointindirection: 'Apuntar en dirección', motion_pointtowards: 'Apuntar hacia',
  motion_changexby: 'Cambiar x', motion_setx: 'Fijar x', motion_changeyby: 'Cambiar y', motion_sety: 'Fijar y', motion_ifonedgebounce: 'Rebotar en el borde',
  motion_setrotationstyle: 'Fijar estilo de rotación', motion_xposition: 'Posición x', motion_yposition: 'Posición y', motion_direction: 'Dirección',
  looks_sayforsecs: 'Decir durante segundos', looks_say: 'Decir', looks_thinkforsecs: 'Pensar durante segundos', looks_think: 'Pensar',
  looks_switchcostumeto: 'Cambiar disfraz a', looks_nextcostume: 'Siguiente disfraz', looks_switchbackdropto: 'Cambiar fondo a', looks_nextbackdrop: 'Siguiente fondo',
  looks_changesizeby: 'Cambiar tamaño', looks_setsizeto: 'Fijar tamaño', looks_changeeffectby: 'Cambiar efecto', looks_seteffectto: 'Fijar efecto',
  looks_cleargraphiceffects: 'Quitar efectos gráficos', looks_show: 'Mostrar', looks_hide: 'Esconder', looks_gotofrontback: 'Ir al frente o al fondo',
  looks_goforwardbackwardlayers: 'Mover capas', looks_costumenumbername: 'Disfraz actual', looks_backdropnumbername: 'Fondo actual', looks_size: 'Tamaño',
  sound_play: 'Iniciar sonido', sound_playuntildone: 'Tocar sonido hasta terminar', sound_stopallsounds: 'Detener todos los sonidos',
  sound_changevolumeby: 'Cambiar volumen', sound_setvolumeto: 'Fijar volumen', sound_volume: 'Volumen', sound_changeeffectby: 'Cambiar efecto de sonido',
  sound_seteffectto: 'Fijar efecto de sonido', sound_cleareffects: 'Quitar efectos de sonido',
  control_wait: 'Esperar segundos', control_repeat: 'Repetir veces', control_forever: 'Por siempre', control_if: 'Si… entonces', control_if_else: 'Si… si no',
  control_wait_until: 'Esperar hasta que', control_repeat_until: 'Repetir hasta que', control_stop: 'Detener', control_start_as_clone: 'Al comenzar como clon',
  control_create_clone_of: 'Crear clon de', control_delete_this_clone: 'Eliminar este clon',
  sensing_touchingobject: '¿Tocando objeto?', sensing_touchingcolor: '¿Tocando color?', sensing_coloristouchingcolor: '¿Color tocando color?',
  sensing_distanceto: 'Distancia a', sensing_askandwait: 'Preguntar y esperar', sensing_answer: 'Respuesta', sensing_keypressed: '¿Tecla presionada?',
  sensing_mousedown: '¿Ratón presionado?', sensing_mousex: 'Posición x del ratón', sensing_mousey: 'Posición y del ratón', sensing_timer: 'Cronómetro',
  sensing_resettimer: 'Reiniciar cronómetro', sensing_of: 'Dato de otro objeto', sensing_current: 'Fecha u hora actual', sensing_dayssince2000: 'Días desde 2000',
  sensing_loudness: 'Volumen del micrófono', sensing_username: 'Nombre de usuario', sensing_setdragmode: 'Fijar modo de arrastre',
  operator_add: 'Sumar', operator_subtract: 'Restar', operator_multiply: 'Multiplicar', operator_divide: 'Dividir', operator_random: 'Número al azar',
  operator_gt: 'Mayor que', operator_lt: 'Menor que', operator_equals: 'Igual a', operator_and: 'Y', operator_or: 'O', operator_not: 'No',
  operator_join: 'Unir textos', operator_letter_of: 'Letra de', operator_length: 'Longitud de', operator_contains: 'Contiene', operator_mod: 'Resto',
  operator_round: 'Redondear', operator_mathop: 'Función matemática',
  data_variable: 'Variable', data_setvariableto: 'Fijar variable', data_changevariableby: 'Cambiar variable', data_showvariable: 'Mostrar variable',
  data_hidevariable: 'Esconder variable', data_listcontents: 'Lista', data_addtolist: 'Añadir a la lista', data_deleteoflist: 'Borrar de la lista',
  data_deletealloflist: 'Borrar toda la lista', data_insertatlist: 'Insertar en la lista', data_replaceitemoflist: 'Reemplazar elemento de la lista',
  data_itemoflist: 'Elemento de la lista', data_itemnumoflist: 'Posición en la lista', data_lengthoflist: 'Longitud de la lista',
  data_listcontainsitem: '¿La lista contiene?', data_showlist: 'Mostrar lista', data_hidelist: 'Esconder lista',
  procedures_definition: 'Definir bloque propio', procedures_call: 'Usar bloque propio', procedures_prototype: 'Forma de bloque propio'
};
const families = {motion: 'movimiento', looks: 'apariencia', sound: 'sonido', event: 'eventos', control: 'control', sensing: 'sensores',
  operator: 'operadores', data: 'variables y listas', procedures: 'bloques propios', pen: 'lápiz (extensión)', music: 'música (extensión)', videoSensing: 'video (extensión)'};
export function scratchOpcodeLabel(opcode) {
  if (typeof opcode !== 'string' || !opcode) return 'Elemento del proyecto';
  if (opcodes[opcode]) return opcodes[opcode];
  const family = families[opcode.split('_')[0]];
  return family ? 'Bloque de ' + family : 'Bloque no reconocido';
}
