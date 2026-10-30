// Textual identifiers of the 2D objects (scene2d-multi-sprite 2.2, R3). Each
// sprite gets one identifier, valid in JavaScript and Python, derived from its
// visible name: the views write `cesta.move(10)` and the translators map the
// identifier back to the sprite ID (targetId), which never changes when the
// sprite is renamed. Pure and dependency-light: the language origin and the
// shell derive the same identifiers from the same configuration.
import {api3LanguageKeywords} from './api3-names.mjs';
import {scene2DVocabularyFromTables} from '../packs/language-tables.mjs';
import {isScene2DSpriteId, scene2DStageName} from './scene2d-objects.mjs';

export const scene2DStageIdentifier = 'stage';
export {scene2DStageName};
const syntax = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
// Global API names of both languages (onStart, on_start, wait, shared…), the
// runtime names and the loop counters the generator writes (i, j, k): a sprite
// named like them gets a trailing underscore. `hero` is not reserved here: it
// is the identifier of the sprite named hero.
const vocabulary = scene2DVocabularyFromTables();
const apiNames = new Set(['GG', 'ctx', 'shared', 'waitUntil', 'wait_until', 'scene', 'app', 'event', scene2DStageIdentifier, 'i', 'j', 'k',
  ...[...Object.entries(vocabulary.statements), ...Object.entries(vocabulary.events)].filter(([key]) => !key.includes('.')).flatMap(([key, entry]) => [key, entry.python])]);
export const scene2DReservedIdentifiers = Object.freeze(new Set([...api3LanguageKeywords, ...apiNames]));
export const isScene2DTextIdentifier = value => typeof value === 'string' && syntax.test(value) && !scene2DReservedIdentifiers.has(value);

// Name → identifier base: NFC, accents removed, lower case, every other run of
// characters becomes `_`. Names without Latin letters or digits fall back to
// `objeto`; a leading digit gets the prefix `objeto_`.
export function scene2DIdentifierBase(name) {
  let base = String(name).normalize('NFC').normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48).replace(/_+$/, '') || 'objeto';
  if (/^[0-9]/.test(base)) base = 'objeto_' + base;
  if (scene2DReservedIdentifiers.has(base)) base += '_';
  return base;
}

// Identifiers of every object of a gg.sprites@0.3.0 configuration, stable for
// the same names and order: collisions after normalization take `_2`, `_3`…
// in configuration order. The stage is always `stage`.
export function scene2DObjectIdentifiers(config) {
  if (!config || !Array.isArray(config.sprites) || !config.sprites.length || config.sprites.some(sprite => !isScene2DSpriteId(sprite?.id) || typeof sprite.name !== 'string'))
    throw new Error('Identificadores: objetos 2D inválidos.');
  const taken = new Set([scene2DStageIdentifier]);
  const objects = [{id: 'stage', kind: 'stage', name: scene2DStageName, identifier: scene2DStageIdentifier}];
  for (const sprite of config.sprites) {
    const base = scene2DIdentifierBase(sprite.name);
    let identifier = base, suffix = 2;
    while (taken.has(identifier)) identifier = `${base}_${suffix++}`;
    taken.add(identifier);
    objects.push({id: sprite.id, kind: 'sprite', name: sprite.name, identifier});
  }
  return Object.freeze({objects: Object.freeze(objects.map(object => Object.freeze(object))),
    identifierOf: Object.freeze(Object.fromEntries(objects.map(object => [object.id, object.identifier]))),
    targetIds: Object.freeze(Object.fromEntries(objects.map(object => [object.identifier, object.id])))});
}

// The owner a per-object view or copy is written for: its identifier, kind
// and sprite ID, the other objects ({identifier: visible name}) so that an
// action written for one of them is rejected naming it, and every sprite
// ({identifier: sprite ID}), because a block can name one (`cesta.goToObject(hero)`).
export function scene2DTextOwner(config, objectId) {
  const {objects} = scene2DObjectIdentifiers(config);
  const owner = objects.find(object => object.id === objectId);
  if (!owner) throw new Error('Identificadores: objeto desconocido.');
  return {identifier: owner.identifier, kind: owner.kind, targetId: owner.id,
    others: Object.fromEntries(objects.filter(object => object !== owner).map(object => [object.identifier, object.name])),
    sprites: Object.fromEntries(objects.filter(object => object.kind === 'sprite').map(object => [object.identifier, object.id]))};
}

// Owner descriptor carried by conversion requests and generator options.
export function validateScene2DTextOwner(owner, fail = message => { throw new Error(message); }) {
  const plain = value => value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
  if (!plain(owner) || !['identifier,kind,others,targetId', 'identifier,kind,others,sprites,targetId'].includes(Object.keys(owner).sort().join(','))) fail('Objeto de la vista inválido.');
  if (!['sprite', 'stage'].includes(owner.kind) || (owner.kind === 'stage') !== (owner.targetId === 'stage' && owner.identifier === scene2DStageIdentifier) ||
      (owner.kind === 'sprite' && (!isScene2DSpriteId(owner.targetId) || !isScene2DTextIdentifier(owner.identifier)))) fail('Objeto de la vista inválido.');
  if (!plain(owner.others) || Object.keys(owner.others).length > 8 || Object.hasOwn(owner.others, owner.identifier) ||
      Object.entries(owner.others).some(([identifier, name]) => !(identifier === scene2DStageIdentifier || isScene2DTextIdentifier(identifier)) ||
        typeof name !== 'string' || !name || name.length > 32)) fail('Objeto de la vista inválido.');
  const sprites = owner.sprites ?? {};
  if (!plain(sprites) || Object.keys(sprites).length > 8 || Object.entries(sprites).some(([identifier, id]) => !isScene2DTextIdentifier(identifier) || !isScene2DSpriteId(id))) fail('Objeto de la vista inválido.');
  return {identifier: owner.identifier, kind: owner.kind, targetId: owner.targetId, others: {...owner.others}, sprites: {...sprites}};
}
