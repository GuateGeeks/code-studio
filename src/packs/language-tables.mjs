// Language tables (ADR-011, block-language-contract): one declarative entry
// per block with its API v3 JavaScript/Python (or Static TypeScript) form and
// its lowering. Installed manifests are frozen by their hash, so the tables
// of published versions live here, keyed `pack@version`, like migrations and
// grants. Manifests with apiVersion 2 carry their own `language` table.
// Dependency-free: the unbundled Python worker imports it.
//
// kind: call (statement), event (hat with body), assign/change/read (program
// variable), control (core structure), value (literal/expression).
// target: 'sprite' → method of the sprite object (`hero.move`); absent → global.

const sprite2D = [
  {block: 'gg_when_start', kind: 'event', js: 'onStart', python: 'on_start', register: 'onStart', lower: {ir: 'start'}},
  {block: 'gg_when_key', kind: 'event', js: 'onKey', python: 'on_key', register: 'onKey', option: 'KEY', lower: {ir: 'key'}},
  {block: 'gg_when_clicked', kind: 'event', target: 'sprite', js: 'onClick', python: 'on_click', register: 'onClick', lower: {ir: 'click'}},
  {block: 'gg_when_message', kind: 'event', js: 'onMessage', python: 'on_message', register: 'onMessage', option: 'MESSAGE', lower: {ir: 'message'}},
  {block: 'gg_when_clone', kind: 'event', target: 'sprite', js: 'onCloneStart', python: 'on_clone_start', register: 'onClone', lower: {ir: 'clone'}},
  {block: 'gg_move', kind: 'call', target: 'sprite', js: 'move', python: 'move', ctx: 'move', args: ['STEPS'], lower: {ir: 'move'}},
  {block: 'gg_wait', kind: 'call', js: 'wait', python: 'wait', ctx: 'wait', args: ['SECONDS'], lower: {ir: 'wait'}},
  {block: 'gg_broadcast_wait', kind: 'call', js: 'broadcastAndWait', python: 'broadcast_and_wait', ctx: 'broadcastAndWait', args: ['MESSAGE'], lower: {ir: 'broadcastWait'}},
  {block: 'gg_create_clone', kind: 'call', js: 'createClone', python: 'create_clone', ctx: 'createClone', args: [], lower: {ir: 'createClone'}},
  {block: 'gg_delete_clone', kind: 'call', js: 'deleteClone', python: 'delete_clone', ctx: 'deleteClone', args: [], stops: true, lower: {ir: 'deleteClone'}},
  {block: 'gg_play_sound', kind: 'call', js: 'playSound', python: 'play_sound', ctx: 'playSound', args: ['SOUND'], append: false, lower: {ir: 'playSound'}},
  {block: 'gg_play_sound_wait', kind: 'call', js: 'playSoundUntilDone', python: 'play_sound_until_done', ctx: 'playSound', args: ['SOUND'], append: true, lower: {ir: 'playSound'}},
  {block: 'gg_stop_sounds', kind: 'call', js: 'stopSounds', python: 'stop_sounds', ctx: 'stopSounds', args: [], lower: {ir: 'stopSounds'}},
  {block: 'gg_set_costume', kind: 'call', target: 'sprite', js: 'setCostume', python: 'set_costume', ctx: 'setCostume', args: ['COSTUME'], lower: {ir: 'setCostume'}},
  {block: 'gg_set_global', kind: 'assign', args: ['VAR', 'VALUE'], lower: {ir: 'setVariable'}}
];
// gg.assets offers resource-backed versions of the same actions. When both
// packs are active the assets block is the one text maps back to.
const assets2D = [
  {block: 'gg_assets_set_costume', kind: 'call', target: 'sprite', js: 'setCostume', python: 'set_costume', ctx: 'setCostume', args: ['COSTUME'], supersedes: 'gg_set_costume', lower: {ir: 'setCostume'}},
  {block: 'gg_assets_play_sound', kind: 'call', js: 'playSound', python: 'play_sound', ctx: 'playSound', args: ['SOUND'], append: false, supersedes: 'gg_play_sound', lower: {ir: 'playSound'}},
  {block: 'gg_assets_play_sound_wait', kind: 'call', js: 'playSoundUntilDone', python: 'play_sound_until_done', ctx: 'playSound', args: ['SOUND'], append: true, supersedes: 'gg_play_sound_wait', lower: {ir: 'playSound'}}
];
// The score is a program variable named by the pack configuration (label).
const score2D = [
  {block: 'gg_score_set', kind: 'assign', variable: 'config', args: ['VALUE'], lower: {ir: 'setVariable'}},
  {block: 'gg_score_change', kind: 'change', variable: 'config', args: ['DELTA'], lower: {ir: 'changeVariable'}},
  {block: 'gg_score_value', kind: 'read', variable: 'config', args: [], lower: {ir: 'variable'}}
];
const microbit = [
  {block: 'gg_mb_start', kind: 'event', typescript: '{BODY}', lower: {device: 'start'}},
  {block: 'gg_mb_forever', kind: 'event', typescript: 'basic.forever(() => {BODY})', lower: {device: 'forever'}},
  {block: 'gg_mb_on_button', kind: 'event', typescript: 'input.onButtonPressed(Button.{BUTTON}, () => {BODY})', args: ['BUTTON'], lower: {device: 'button'}},
  {block: 'gg_mb_show_icon', kind: 'call', typescript: 'basic.showIcon(IconNames.{ICON})', args: ['ICON'], lower: {device: 'showIcon'}},
  {block: 'gg_mb_show_number', kind: 'call', typescript: 'basic.showNumber({NUMBER})', args: ['NUMBER'], lower: {device: 'showNumber'}},
  {block: 'gg_mb_show_leds', kind: 'call', typescript: 'basic.showLeds(`{LEDS}`)', args: ['LEDS'], format: {LEDS: 'led-matrix'}, lower: {device: 'showLeds'}},
  {block: 'gg_mb_plot', kind: 'call', typescript: 'led.plot({X}, {Y})', args: ['X', 'Y'], lower: {device: 'plot'}},
  {block: 'gg_mb_unplot', kind: 'call', typescript: 'led.unplot({X}, {Y})', args: ['X', 'Y'], lower: {device: 'unplot'}},
  {block: 'gg_mb_clear', kind: 'call', typescript: 'basic.clearScreen()', args: [], lower: {device: 'clear'}},
  {block: 'gg_mb_pause', kind: 'call', typescript: 'basic.pause({MS})', args: ['MS'], lower: {device: 'pause'}},
  {block: 'gg_mb_repeat', kind: 'control', typescript: 'for (let i = 0; i < {COUNT}; i++) {BODY}', args: ['COUNT'], lower: {device: 'repeat'}},
  {block: 'gg_mb_if_button', kind: 'control', typescript: 'if (input.buttonIsPressed(Button.{BUTTON})) {BODY} else {ELSE}', args: ['BUTTON'], lower: {device: 'ifButton'}}
];
// Core Blockly structures used by the 2D toolbox; owned by the core, not a pack.
export const coreLanguageEntries = Object.freeze([
  {block: 'controls_repeat_ext', kind: 'control', args: ['TIMES'], lower: {ir: 'repeat'}},
  {block: 'controls_if', kind: 'control', args: [], lower: {ir: 'if'}},
  {block: 'logic_compare', kind: 'value', args: ['A', 'B'], lower: {ir: 'compare'}},
  {block: 'math_number', kind: 'value', args: [], lower: {ir: 'number'}},
  {block: 'math_change', kind: 'change', args: ['VAR', 'DELTA'], lower: {ir: 'changeVariable'}},
  {block: 'variables_get', kind: 'read', args: ['VAR'], lower: {ir: 'variable'}},
  {block: 'variables_set', kind: 'assign', args: ['VAR', 'VALUE'], lower: {ir: 'setVariable'}}
].map(entry => Object.freeze(entry)));

export const languageTables = Object.freeze({
  'gg.sprites@0.1.0': Object.freeze(sprite2D),
  'gg.assets@0.1.0': Object.freeze(assets2D),
  'gg.assets@0.2.0': Object.freeze(assets2D),
  'gg.score@0.1.0': Object.freeze(score2D),
  'gg.score@0.2.0': Object.freeze(score2D),
  'gg.microbit@0.1.0': Object.freeze(microbit),
  'gg.sb3@0.1.0': Object.freeze([]),
  'gg.sb3@0.2.0': Object.freeze([])
});

// API v3 2D vocabulary for the translators and the generator, derived from
// the sprite and assets tables (one source of truth).
export function scene2DVocabularyFromTables(tables = languageTables) {
  const statements = {}, events = {};
  for (const entry of [...tables['gg.sprites@0.1.0'], ...tables['gg.assets@0.2.0']]) {
    const key = (entry.target === 'sprite' ? 'hero.' : '') + entry.js;
    const python = (entry.target === 'sprite' ? 'hero.' : '') + entry.python;
    if (entry.kind === 'call' && !statements[key]) statements[key] = {python, ctx: entry.ctx, arity: entry.args.length, ...(entry.append !== undefined ? {append: entry.append} : {}), ...(entry.stops ? {stops: true} : {})};
    if (entry.kind === 'event') events[key] = {python, register: entry.register, ...(entry.option ? {option: true} : {}), ...(entry.target === 'sprite' ? {target: 'hero'} : {})};
  }
  return {statements, events};
}
