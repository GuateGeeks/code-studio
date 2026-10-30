// Objects of the 2D context (scene2d-multi-sprite, gg.sprites@0.3.0): the stage
// and a list of 1–8 sprites with their initial state. Pure data checks and the
// reviewed configuration migration from the single-sprite initialScene. No
// Blockly, Scratch, DOM or storage.
const fail = message => { throw new Error('GG packs: ' + message); };

export const scene2DObjectLimits = Object.freeze({sprites: 8, nameLength: 32});
// Sprite and resource IDs share the resource owner syntax (resources.mjs);
// `stage` names the stage as resource owner and cannot be a sprite.
const resourceId = {type: 'string', pattern: '^[A-Za-z0-9:_-]+$', maxLength: 128, notEnum: ['__proto__', 'prototype', 'constructor']};
const number = (minimum, maximum) => ({type: 'number', minimum, maximum});
const spriteFields = ['id', 'name', 'x', 'y', 'direction', 'size', 'visible', 'costume'];
// Generic schema for the pack manifest (pack-config-schema.mjs); the rules it
// cannot express (unique IDs and names, names without control characters or
// surrounding spaces) live in validateScene2DObjects, the pack's configValidator.
export const scene2DObjectsSchema = {
  type: 'object', required: ['stage', 'sprites'], additionalProperties: false, properties: {
    stage: {type: 'object', required: ['backdrop'], additionalProperties: false, properties: {backdrop: resourceId}},
    sprites: {type: 'array', minItems: 1, maxItems: scene2DObjectLimits.sprites, items: {
      type: 'object', required: spriteFields, additionalProperties: false, properties: {
        id: {...resourceId, notEnum: [...resourceId.notEnum, 'stage']},
        name: {type: 'string', maxLength: scene2DObjectLimits.nameLength},
        // Same bounds as the IR literals (scene2d-vocabulary-v2 point 11) and Scratch's direction range.
        x: number(-240, 240), y: number(-180, 180), direction: number(-180, 180), size: number(0, 1000),
        visible: {type: 'boolean'}, costume: resourceId
      }}}
  }
};

const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function exact(value, fields, label) {
  if (!plain(value) || Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) fail(label + ': propiedades inválidas');
}
function id(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9:_-]{1,128}$/.test(value) || ['__proto__', 'prototype', 'constructor'].includes(value)) fail(label + ': ID inválido');
}
const between = (value, minimum, maximum) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
// Names are what the student sees and what a textual identifier is derived
// from (R3), so they are compared without case.
const spriteNameKey = name => name.toLocaleLowerCase('es');
export function validateScene2DObjects(config) {
  exact(config, ['stage', 'sprites'], 'objetos 2D');
  exact(config.stage, ['backdrop'], 'escenario');
  id(config.stage.backdrop, 'fondo');
  if (!Array.isArray(config.sprites) || config.sprites.length < 1 || config.sprites.length > scene2DObjectLimits.sprites) fail('se admiten entre 1 y ' + scene2DObjectLimits.sprites + ' sprites');
  const ids = new Set(), names = new Set();
  for (const sprite of config.sprites) {
    exact(sprite, spriteFields, 'sprite');
    id(sprite.id, 'sprite'); id(sprite.costume, 'disfraz');
    if (sprite.id === 'stage') fail('sprite: el ID stage es del escenario');
    if (typeof sprite.name !== 'string' || !sprite.name || sprite.name !== sprite.name.trim() || sprite.name.length > scene2DObjectLimits.nameLength || /[\u0000-\u001f\u007f]/.test(sprite.name)) fail('sprite: nombre inválido');
    if (!between(sprite.x, -240, 240) || !between(sprite.y, -180, 180) || !between(sprite.direction, -180, 180) || !between(sprite.size, 0, 1000) || typeof sprite.visible !== 'boolean') fail('sprite: estado inicial inválido');
    if (ids.has(sprite.id)) fail('sprite: ID repetido ' + sprite.id);
    if (names.has(spriteNameKey(sprite.name))) fail('sprite: nombre repetido ' + sprite.name);
    ids.add(sprite.id); names.add(spriteNameKey(sprite.name));
  }
  return config;
}

// Reviewed configuration migration gg.sprites 0.2.0 → 0.3.0: the single sprite
// of initialScene becomes sprites[0] with the same ID (hero), state and costume,
// visible as the adapter has always created it, on the stage's own backdrop.
// Returns a new object; the input is never modified.
export function scene2DObjectsFromInitialScene(config) {
  exact(config, ['initialScene'], 'configuración 0.2.0');
  const scene = config.initialScene;
  exact(scene, ['spriteId', 'x', 'y', 'direction', 'size', 'costume'], 'initialScene');
  return validateScene2DObjects({stage: {backdrop: 'stage'}, sprites: [{id: scene.spriteId, name: scene.spriteId, x: scene.x, y: scene.y,
    direction: scene.direction, size: scene.size, visible: true, costume: scene.costume}]});
}

// Single-sprite view (the initialScene shape) of the first sprite, for readers
// of the resolved profile that still know one sprite.
export function initialSceneOfObjects(config) {
  const [first] = config.sprites;
  return {spriteId: first.id, x: first.x, y: first.y, direction: first.direction, size: first.size, costume: first.costume};
}
