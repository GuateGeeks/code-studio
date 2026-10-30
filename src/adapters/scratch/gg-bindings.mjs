// Scratch adapter for GG operations. Only this side knows VM/target internals.
function finite(value, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max) throw new Error('Invalid GG numeric argument');
}
const arities = Object.freeze({'scene.get': 0, 'sprite.get': 1, 'sprite.move': 2, 'sprite.setPosition': 2, 'variables.get': 1, 'variables.set': 2, 'events.emit': 1});
// getObjects: the scene's sprites [{id, name}] in configuration order (VM
// targets are named by ID). Without it the scene is the single hero.
const singleHero = Object.freeze([Object.freeze({id: 'hero', name: 'hero'})]);
export function createGGBindings(getVM, getObjects = () => singleHero) {
  const hero = id => {
    if (id !== 'hero') throw new Error('Unknown GG sprite');
    const target = getVM().runtime.getSpriteTargetByName('hero');
    if (!target?.isOriginal) throw new Error('GG sprite unavailable');
    return target;
  };
  const objects = () => getObjects() ?? singleHero;
  // The VM target is named by ID; the visible name is the object's, as in scene.get.
  const spriteDTO = target => ({id: 'hero', name: objects().find(object => object.id === 'hero')?.name ?? target.getName(), x: target.x, y: target.y});
  // scene2d-multi-sprite 2.1: a scene other than the single hero lists every
  // sprite with its visible name, and each local variable names its sprite.
  // Per-object GG calls (sprite.*, locals of other sprites) arrive with API v3
  // per object (2.2).
  function scene() {
    const list = objects();
    if (list.length === 1 && list[0].id === 'hero' && list[0].name === 'hero')
      return {sprites: [spriteDTO(hero('hero'))], variables: Object.entries(hero('hero').variables).filter(([, model]) => model.type === '').map(([id, model]) => variableDTO(id, model))};
    const targets = list.map(object => {
      const target = getVM().runtime.getSpriteTargetByName(object.id);
      if (!target?.isOriginal) throw new Error('GG sprite unavailable');
      return [object, target];
    });
    return {sprites: targets.map(([object, target]) => ({id: object.id, name: object.name, x: target.x, y: target.y})),
      variables: targets.flatMap(([object, target]) => Object.entries(target.variables).filter(([, model]) => model.type === '').map(([id, model]) => ({...variableDTO(id, model), targetId: object.id})))};
  }
  const variable = id => {
    if (typeof id !== 'string' || !id.trim() || ['__proto__', 'prototype', 'constructor'].includes(id)) throw new Error('Unknown GG numeric variable');
    const heroTarget = getVM().runtime.getSpriteTargetByName('hero');
    const owners = [heroTarget?.isOriginal ? heroTarget : null, getVM().runtime.getTargetForStage()];
    const matches = owners.filter(owner => owner && Object.hasOwn(owner.variables, id));
    if (matches.length > 1) throw new Error('Ambiguous GG numeric variable');
    const model = matches[0]?.variables[id];
    if (!model || model.type !== '' || model.isCloud) throw new Error('Unknown GG numeric variable');
    return model;
  };
  // Scratch stores numeric literals as strings until arithmetic coerces them.
  // The numeric GG contract presents a number without keeping another state.
  const variableDTO = (id, model) => {
    const value = Number(model.value); finite(value, 1_000_000);
    return {id, name: model.name, value};
  };
  return function call(method, args) {
    if (!Array.isArray(args)) throw new Error('Invalid GG argument list');
    if (typeof method !== 'string' || !Object.hasOwn(arities, method) || args.length !== arities[method]) throw new Error('Unsupported GG operation or arity');
    switch (method) {
      case 'scene.get': return scene();
      case 'sprite.get': return spriteDTO(hero(args[0]));
      case 'sprite.move': {
        finite(args[1], 480); const target = hero(args[0]);
        getVM().runtime._primitives.motion_movesteps({STEPS: args[1]}, {target});
        return spriteDTO(target);
      }
      case 'sprite.setPosition': {
        const position = args[1];
        if (!position || typeof position !== 'object' || Array.isArray(position) || Object.keys(position).sort().join(',') !== 'x,y') throw new Error('Invalid GG position');
        finite(position.x, 240); finite(position.y, 180);
        const target = hero(args[0]); target.setXY(position.x, position.y); return spriteDTO(target);
      }
      case 'variables.get': return variableDTO(args[0], variable(args[0]));
      case 'variables.set': {
        finite(args[1], 1_000_000); const model = variable(args[0]); model.value = args[1]; return variableDTO(args[0], model);
      }
      case 'events.emit': {
        if (typeof args[0] !== 'string' || args[0].length > 64) throw new Error('Invalid GG event');
        const message = getVM().runtime.getTargetForStage().lookupBroadcastMsg(null, args[0]);
        if (!message || message.type !== 'broadcast_msg') throw new Error('Unknown GG event');
        return {name: message.name, started: getVM().runtime.startHats('event_whenbroadcastreceived', {BROADCAST_OPTION: message.name}).length};
      }
    }
  };
}
