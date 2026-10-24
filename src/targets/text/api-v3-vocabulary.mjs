// API v3 vocabulary (ADR-011). Dependency-free: the unbundled Python worker
// imports it directly, so it must not pull in acorn or any package.
// One vocabulary for the translators (JS/Python) and the generator.
export const scene2DApi3 = Object.freeze({
  statements: Object.freeze({
    'hero.move': {python: 'hero.move', ctx: 'move', arity: 1},
    'hero.setCostume': {python: 'hero.set_costume', ctx: 'setCostume', arity: 1},
    wait: {python: 'wait', ctx: 'wait', arity: 1},
    broadcastAndWait: {python: 'broadcast_and_wait', ctx: 'broadcastAndWait', arity: 1},
    createClone: {python: 'create_clone', ctx: 'createClone', arity: 0},
    deleteClone: {python: 'delete_clone', ctx: 'deleteClone', arity: 0, stops: true},
    playSound: {python: 'play_sound', ctx: 'playSound', arity: 1, append: false},
    playSoundUntilDone: {python: 'play_sound_until_done', ctx: 'playSound', arity: 1, append: true},
    stopSounds: {python: 'stop_sounds', ctx: 'stopSounds', arity: 0}
  }),
  events: Object.freeze({
    onStart: {python: 'on_start', register: 'onStart', option: false},
    onKey: {python: 'on_key', register: 'onKey', option: true},
    onMessage: {python: 'on_message', register: 'onMessage', option: true},
    'hero.onClick': {python: 'hero.on_click', register: 'onClick', target: 'hero'},
    'hero.onCloneStart': {python: 'hero.on_clone_start', register: 'onClone', target: 'hero'}
  }),
  shared: 'shared',
  compare: Object.freeze({'==': 'EQ', '===': 'EQ', '<': 'LT', '>': 'GT'})
});

