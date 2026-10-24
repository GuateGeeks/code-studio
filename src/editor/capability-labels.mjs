// Presentation of 3D/web blocks inside Blockly. Pack manifests, their SHA-256
// locks, block types, field names and order stay untouched: only the visible
// message of the already registered block is replaced in this editor.
const operationWords = {
  'scene3d.getEntity': 'leer datos del objeto %targetId',
  'scene3d.move': 'mover objeto %targetId · x %delta.x y %delta.y z %delta.z',
  'scene3d.setTransform': 'colocar objeto %targetId · posición x %transform.position.x y %transform.position.y z %transform.position.z · giro x %transform.rotationDegrees.x y %transform.rotationDegrees.y z %transform.rotationDegrees.z · tamaño x %transform.scale.x y %transform.scale.y z %transform.scale.z',
  'scene3d.setParent': 'poner objeto %targetId dentro de %parentId',
  'scene3d.setCamera': 'mover cámara · ángulo horizontal %alpha vertical %beta distancia %radius · mirar a x %target.x y %target.y z %target.z',
  'scene3d.setLight': 'cambiar luz %targetId · intensidad %intensity color %diffuse',
  'scene3d.snapshot': 'leer estado de la escena',
  'webapp.getValue': 'leer valor de %targetId',
  'webapp.setText': 'poner en %targetId el texto %text',
  'webapp.setValue': 'poner en el campo %targetId el valor %value',
  'webapp.appendItem': 'añadir %text a la lista %targetId',
  'webapp.clearItems': 'vaciar la lista %targetId',
  'webapp.setVisible': 'mostrar %targetId · visible %visible',
  'webapp.snapshot': 'leer estado de la aplicación'
};
const fixedWords = {
  gg_cap_start: 'al iniciar %1',
  gg_cap_click: 'al hacer clic en %1 %2',
  gg_cap_input: 'al escribir en %1 %2',
  gg_cap_submit: 'al enviar el formulario %1 %2',
  gg_cap_key: 'al pulsar la tecla %2 en %1 %3',
  gg_cap_variable: 'crear variable %1 nombre %2 tipo %3 valor inicial %4',
  gg_cap_setVariable: 'fijar variable %1 a %2',
  gg_cap_changeVariable: 'cambiar variable %1 en %2'
};
const placeholders = message => (message.match(/%\d+/g) ?? []).map(token => Number(token.slice(1))).sort((a, b) => a - b);
// Same placeholders as the original message, so jsonInit builds identical fields.
export function presentationMessage(definition, operations) {
  let message = fixedWords[definition.type] ?? null;
  if (!message) {
    const operation = operations.find(item => 'gg_' + item.id.replaceAll('.', '_') === definition.type);
    const template = operation && operationWords[operation.id];
    if (!template) return null;
    const paths = (definition.args0 ?? []).map(arg => arg.name);
    message = template.replace(/%([A-Za-z.]+)/g, (match, path) => paths.includes(path) ? '%' + (paths.indexOf(path) + 1) : match);
  }
  return JSON.stringify(placeholders(message)) === JSON.stringify(placeholders(definition.message0)) && !/%[A-Za-z]/.test(message) ? message : null;
}
export function applyCapabilityLabels(Blockly, definitions, operations) {
  for (const definition of definitions) {
    const message = presentationMessage(definition, operations);
    const block = Blockly.Blocks[definition.type];
    if (!message || !block || block.ggPresentation) continue;
    const presented = {...definition, message0: message};
    block.init = function init() { this.jsonInit(presented); };
    block.ggPresentation = true;
  }
}
