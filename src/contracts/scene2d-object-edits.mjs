// What the objects panel does to a 2D project (scene2d-multi-sprite 3.1), as pure
// edits over {config, scene2d, codeViews, resources, mounted}. Each returns the
// parts it replaces, new objects, and never touches its input. The caller applies
// the result as one project transaction: nothing here mounts, saves or runs.
import {resolveCapabilities} from './packs.mjs';
import {copyResourceOwner, resourceLimits} from './resources.mjs';
import {normalizeScene2DSpriteName, scene2DObjectLimits, scene2DSpriteNameProblem, scene2DStageName, spriteNameKey, validateScene2DObjects} from './scene2d-objects.mjs';

const fail = message => { throw new Error(message); };
const spriteOf = (config, id) => config.sprites.find(sprite => sprite.id === id);
function requireSprite(config, id) { return spriteOf(config, id) ?? fail('Ese objeto no se puede cambiar: objeto desconocido.'); }
function checkedName(name, config, except = null) {
  const normalized = normalizeScene2DSpriteName(name), problem = scene2DSpriteNameProblem(normalized, {config, except});
  if (problem) fail(problem);
  return normalized;
}
function requireRoom(config) {
  if (config.sprites.length >= scene2DObjectLimits.sprites) fail(`Un proyecto puede tener hasta ${scene2DObjectLimits.sprites} objetos. Borra uno para añadir otro.`);
}
function requireResourceRoom(resources, costumes, sounds) {
  if (resources.costumes.length + costumes > resourceLimits.costumes) fail(`El proyecto ya tiene demasiados disfraces (hasta ${resourceLimits.costumes}). Borra un objeto con disfraces que no uses.`);
  if (resources.sounds.length + sounds > resourceLimits.sounds) fail(`El proyecto ya tiene demasiados sonidos (hasta ${resourceLimits.sounds}). Borra un objeto con sonidos que no uses.`);
}

// Which blocks declare a global variable and which fields name a resource,
// from the locked packs: data, not a list of block types.
export function scene2DObjectRules(capabilities) {
  const globals = new Map(), menus = new Map();
  for (const {manifest} of resolveCapabilities(capabilities).packs) {
    for (const [type, rule] of Object.entries(manifest.contributions?.statements ?? {})) if (rule.declaresGlobal) globals.set(type, rule.declaresGlobal);
    for (const menu of manifest.contributions?.fieldMenus ?? []) menus.set(menu.type, {field: menu.field, resource: menu.resource});
  }
  return {globals, menus};
}

// Every block of a workspace, shadows included, wherever it is connected.
function eachBlock(state, visit) {
  const connection = link => { for (const block of [link?.block, link?.shadow]) if (block) walk(block); };
  const walk = block => {
    visit(block);
    for (const input of Object.values(block.inputs ?? {})) connection(input);
    connection(block.next);
  };
  for (const block of state?.blocks?.blocks ?? []) walk(block);
}
// As in composeScene2DProgram: the stage's variables and those an object declares global.
function globalVariables(scene2d, rules) {
  const found = new Map();
  for (const model of scene2d.stage?.variables ?? []) found.set(model.id, model);
  for (const state of Object.values(scene2d.sprites)) {
    const declared = new Set();
    eachBlock(state, block => {
      const field = rules.globals.get(block.type);
      if (field) declared.add(block.fields?.[field]?.id);
    });
    for (const model of state.variables ?? []) if (declared.has(model.id) && !found.has(model.id)) found.set(model.id, model);
  }
  return found;
}
const programFromVariables = models => models.length ? {variables: models} : {};

// A free spot on the stage, so a new object does not hide under another.
const spots = [[-120, -60], [120, -60], [-120, 60], [120, 60], [0, -100], [0, 100], [-180, 0], [180, 0], [60, 0], [-60, 0]];
function freeSpot(config) {
  const [x, y] = spots.find(([x, y]) => !config.sprites.some(sprite => sprite.x === x && sprite.y === y)) ?? spots[0];
  return {x, y};
}
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export function newScene2DObjectId(config, createId = () => crypto.randomUUID().slice(0, 13), resources = null) {
  const owners = new Set([...(resources?.costumes ?? []), ...(resources?.sounds ?? [])].map(item => item.ownerId));
  for (;;) {
    const id = 'sprite-' + createId();
    if (!spriteOf(config, id) && !owners.has(id)) return id;
  }
}
// `name`, or the next «name N» that fits the limit and no object uses.
export function uniqueScene2DSpriteName(name, config) {
  const taken = new Set([scene2DStageName, ...config.sprites.map(sprite => sprite.name)].map(spriteNameKey));
  if (!taken.has(spriteNameKey(name))) return name;
  const stem = name.replace(/\s+\d+$/u, '');
  for (let number = 2; ; number++) {
    const suffix = ' ' + number, room = scene2DObjectLimits.nameLength - suffix.length;
    let kept = '';
    for (const character of stem) { if (kept.length + character.length > room) break; kept += character; }
    const candidate = kept.trimEnd().normalize('NFC') + suffix;
    if (!taken.has(spriteNameKey(candidate))) return candidate;
  }
}

export function renameSceneObject({config, scene2d, codeViews}, {id, name}) {
  const sprite = requireSprite(config, id), next = structuredClone(config);
  const normalized = checkedName(name, config, sprite.id);
  next.sprites.find(item => item.id === id).name = normalized;
  return {config: validateScene2DObjects(next), scene2d, codeViews, resources: null, id};
}

// A new object starts empty, with one costume of its source so that it can be
// seen: the costume of the selected sprite, or of the first one from the stage.
// It knows the scene's global variables, under the same IDs.
export async function addSceneObject({config, scene2d, codeViews, resources}, {id, name, sourceId, rules}) {
  requireRoom(config);
  const normalized = checkedName(name, config);
  const source = spriteOf(config, sourceId) ?? config.sprites[0];
  const candidates = [source, ...config.sprites].flatMap(sprite => resources.costumes.filter(item => item.ownerId === sprite.id)
    .sort((a, b) => Number(b.id === sprite.costume) - Number(a.id === sprite.costume)));
  const costume = candidates[0] ?? fail('No hay ningún disfraz que copiar para el objeto nuevo.');
  requireResourceRoom(resources, 1, 0);
  const copy = {...structuredClone(costume), id: id + ':c0', ownerId: id};
  const sprite = {id, name: normalized, ...freeSpot(config), direction: 90, size: 100, visible: true, costume: copy.id};
  return {id, config: validateScene2DObjects({...config, sprites: [...structuredClone(config.sprites), sprite]}), codeViews,
    scene2d: {stage: scene2d.stage, sprites: {...scene2d.sprites, [id]: programFromVariables([...globalVariables(scene2d, rules).values()])}},
    resources: {...structuredClone(resources), costumes: [...structuredClone(resources.costumes), copy]}};
}

// New IDs for every block and local variable: a program's block IDs are unique
// across objects, and a local shared by two objects would be rejected. Global
// variables keep theirs (the copy shares them), and resource menus follow `mapping`.
function copiedWorkspace(state, {id, globals, mapping, rules}) {
  const copy = structuredClone(state), blockIds = new Map(), variableIds = new Map();
  (copy.variables ?? []).forEach((model, index) => {
    if (globals.has(model.id)) return;
    const next = `${id}:v${index}`;
    variableIds.set(model.id, next);
    model.id = next;
  });
  eachBlock(copy, block => {
    const next = `${id}:b${blockIds.size}`;
    blockIds.set(block.id, next);
    block.id = next;
    for (const field of Object.values(block.fields ?? {})) if (field && typeof field === 'object' && variableIds.has(field.id)) field.id = variableIds.get(field.id);
    const menu = rules.menus.get(block.type);
    if (menu && Object.hasOwn(mapping[menu.resource], block.fields?.[menu.field])) block.fields[menu.field] = mapping[menu.resource][block.fields[menu.field]];
  });
  return {state: copy, blockIds};
}
function viewOrder(codeViews, mounted, id) {
  if (!codeViews) return null;
  return id === mounted ? codeViews.entries.find(entry => entry.contextId === '2d')?.scriptOrder ?? null : codeViews.objects?.[id]?.scriptOrder ?? null;
}
// Stored view of an object that is not the current one (codeViews version 2).
function withStoredView(codeViews, mounted, id, view) {
  return {version: 2, activeContext: codeViews.activeContext, entries: structuredClone(codeViews.entries), objectId: codeViews.objectId ?? mounted,
    objects: {...structuredClone(codeViews.objects ?? {}), [id]: view}};
}

// Like Scratch: the same program and every costume and sound, as a separate object.
export async function duplicateSceneObject({config, scene2d, codeViews, resources, mounted}, {id, name, sourceId, rules}) {
  const source = requireSprite(config, sourceId);
  requireRoom(config);
  const normalized = checkedName(name, config);
  const owned = kind => resources[kind].filter(item => item.ownerId === source.id).length;
  requireResourceRoom(resources, owned('costumes'), owned('sounds'));
  const copied = await copyResourceOwner(resources, source.id, id, {idPrefix: id});
  const {state, blockIds} = copiedWorkspace(scene2d.sprites[source.id], {id, globals: globalVariables(scene2d, rules), mapping: copied.mapping, rules});
  const sprite = {...structuredClone(source), id, name: normalized, x: clamp(source.x + 30, 240), y: clamp(source.y - 30, 180),
    costume: copied.mapping.costumes[source.costume] ?? Object.values(copied.mapping.costumes)[0]};
  const order = viewOrder(codeViews, mounted, source.id);
  return {id, config: validateScene2DObjects({...config, sprites: [...structuredClone(config.sprites), sprite]}), resources: copied.resources,
    scene2d: {stage: scene2d.stage, sprites: {...scene2d.sprites, [id]: state}},
    codeViews: order ? withStoredView(codeViews, mounted, id, {scriptOrder: order.map(block => blockIds.get(block) ?? block), restorePoint: null}) : codeViews};
}

// The panel selects another object first, through the views (R2): the object in
// the editor cannot go. Its bytes stay while another descriptor uses them.
export function deleteSceneObject({config, scene2d, codeViews, resources, mounted}, {id}) {
  const sprite = requireSprite(config, id);
  if (config.sprites.length === 1) fail('Un proyecto necesita al menos un objeto además del escenario.');
  if (id === mounted) fail('Elige otro objeto antes de borrar el objeto seleccionado.');
  const {[id]: removed, ...sprites} = scene2d.sprites;
  const costumes = resources.costumes.filter(item => item.ownerId !== sprite.id), sounds = resources.sounds.filter(item => item.ownerId !== sprite.id);
  const used = new Set([...costumes, ...sounds].map(item => item.assetId)), dropped = [...resources.costumes, ...resources.sounds].filter(item => item.ownerId === sprite.id && !used.has(item.assetId)).map(item => item.assetId);
  const left = next => Object.fromEntries(Object.entries(next).filter(([assetId]) => !dropped.includes(assetId)));
  const objects = {...structuredClone(codeViews?.objects ?? {})};
  delete objects[id];
  return {id, config: validateScene2DObjects({...config, sprites: config.sprites.filter(item => item.id !== id)}), scene2d: {stage: scene2d.stage, sprites},
    resources: {...structuredClone(resources), costumes, sounds, assets: left(resources.assets), integrity: left(resources.integrity)},
    codeViews: codeViews?.version === 2 ? {...structuredClone(codeViews), objects} : codeViews};
}
