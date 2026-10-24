// Public asynchronous GG vocabulary, independent of backend internals.
export function createGGClient(call) {
  return Object.freeze({
    scene: Object.freeze({get: () => call('scene.get', [])}),
    sprite: Object.freeze({get: id => call('sprite.get', [id]), move: (id, steps) => call('sprite.move', [id, steps]), setPosition: (id, position) => call('sprite.setPosition', [id, position])}),
    variables: Object.freeze({get: id => call('variables.get', [id]), set: (id, value) => call('variables.set', [id, value])}),
    events: Object.freeze({emit: name => call('events.emit', [name])})
  });
}
