import test from 'node:test';
import assert from 'node:assert/strict';
import {localPackCatalog} from '../../src/packs/catalog.mjs';
import {languageTables, coreLanguageEntries, scene2DVocabularyFromTables} from '../../src/packs/language-tables.mjs';
import {validateLanguageTables, validateLanguageEntry, capabilityLanguageEntries, languageCoverage, languageAvailability, tablesForLocks} from '../../src/contracts/language-table.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';
import {generateDeviceSource} from '../../src/contracts/device-program.mjs';
import {scene2DApi3} from '../../src/targets/text/api-v3-vocabulary.mjs';

test('LANG-001: every installed block has exactly one language entry and the active tables of each context are blockable', () => {
  assert.deepEqual(languageCoverage(localPackCatalog, {tables: languageTables}), {missing: [], orphan: [], core: []});
  validateLanguageTables({core: coreLanguageEntries, 'gg.sprites@0.1.0': languageTables['gg.sprites@0.1.0'], 'gg.score@0.2.0': languageTables['gg.score@0.2.0'], 'gg.assets@0.2.0': languageTables['gg.assets@0.2.0']});
  validateLanguageTables({'gg.microbit@0.1.0': languageTables['gg.microbit@0.1.0']});
  for (const contextId of ['scene3d', 'webapp']) {
    const entries = capabilityLanguageEntries(contextId);
    validateLanguageTables({[contextId]: entries});
    const contributed = localPackCatalog.filter(item => item.manifest.context === contextId).flatMap(item => item.manifest.contributions.blocks.map(block => block.type));
    for (const type of contributed) assert.ok(entries.some(entry => entry.block === type), `${contextId}: ${type}`);
  }
});

test('LANG-002: the API v3 2D vocabulary is derived from the tables, not written twice', () => {
  const derived = scene2DVocabularyFromTables();
  assert.deepEqual(scene2DApi3.statements, derived.statements);
  assert.deepEqual(scene2DApi3.events, derived.events);
  // gg.sprites@0.2.0 (E1) adds its single-sprite vocabulary and stopAll to the 0.1.0 forms.
  assert.deepEqual(Object.keys(derived.statements).sort(), ['broadcastAndWait', 'createClone', 'deleteClone', 'hero.bounceOnEdge', 'hero.changeSize', 'hero.changeX', 'hero.changeY', 'hero.glide', 'hero.goTo', 'hero.hide', 'hero.move', 'hero.nextCostume', 'hero.pointInDirection', 'hero.say', 'hero.sayFor', 'hero.setCostume', 'hero.setSize', 'hero.setX', 'hero.setY', 'hero.show', 'hero.think', 'hero.thinkFor', 'hero.turnLeft', 'hero.turnRight', 'playSound', 'playSoundUntilDone', 'stopAll', 'stopSounds', 'wait']);
  for (const name of ['broadcastAndWait', 'createClone', 'deleteClone', 'hero.move', 'hero.setCostume', 'playSound', 'playSoundUntilDone', 'stopSounds', 'wait']) assert.ok(scene2DVocabularyFromTables({...languageTables, 'gg.sprites@0.2.0': languageTables['gg.sprites@0.1.0']}).statements[name], name);
});

test('LANG-003: blockable rules reject ambiguous, reserved or inconsistent entries', () => {
  const base = {block: 'gg_x_move', kind: 'call', js: 'move', python: 'move', args: ['STEPS'], lower: {ir: 'move'}};
  for (const [entry, message] of [
    [{...base, kind: 'macro'}, /tipo de entrada/],
    [{...base, js: 'for'}, /reservada/],
    [{...base, python: undefined}, /JavaScript y Python/],
    [{...base, lower: {}}, /bajada/],
    [{...base, code: 'x'}, /no permitida/],
    [{block: 'gg_x_led', kind: 'call', typescript: 'led.plot({X})', args: ['X', 'Y'], lower: {device: 'plot'}}, /exactamente sus argumentos/]
  ]) assert.throws(() => validateLanguageEntry(JSON.parse(JSON.stringify(entry))), message, JSON.stringify(entry));
  assert.throws(() => validateLanguageTables({a: [base], b: [{...base, block: 'gg_y_move'}]}), /misma forma js/);
  assert.throws(() => validateLanguageTables({a: [base], b: [{...base}]}), /aparece en a y en b/);
  validateLanguageTables({a: [base], b: [{...base, block: 'gg_y_move', supersedes: 'gg_x_move'}]});
});

test('LANG-004: micro:bit statements render from the table with exactly the previous Static TypeScript', () => {
  const statement = (sourceBlockId, kind, fields) => ({sourceBlockId, kind, ...fields});
  const ir = {version: 1, scripts: [{event: 'start', sourceBlockId: 'start', body: [
    statement('icon', 'showIcon', {ICON: 'Heart'}), statement('number', 'showNumber', {NUMBER: 7}), statement('leds', 'showLeds', {LEDS: '0101011111111110111000100'}),
    statement('plot', 'plot', {X: 1, Y: 2}), statement('unplot', 'unplot', {X: 3, Y: 4}), statement('clear', 'clear', {}), statement('pause', 'pause', {MS: 250})]}]};
  assert.equal(generateDeviceSource(ir).source, 'basic.showIcon(IconNames.Heart);\nbasic.showNumber(7);\nbasic.showLeds(`\n. # . # .\n# # # # #\n# # # # #\n. # # # .\n. . # . .\n`);\nled.plot(1, 2);\nled.unplot(3, 4);\nbasic.clearScreen();\nbasic.pause(250);\n');
});

test('LANG-005: an apiVersion 2 manifest is accepted only with a valid language table', () => {
  const sprites = localPackCatalog.find(item => item.manifest.id === 'gg.sprites');
  const next = structuredClone(sprites); next.manifest.apiVersion = 2; next.manifest.language = structuredClone(languageTables['gg.sprites@0.1.0']);
  const catalog = localPackCatalog.filter(item => item !== sprites).concat(next);
  // The synthetic manifest replaces 0.1.0; pin it, since 0.2.0 is the latest.
  assert.equal(createCapabilities(['gg.sprites'], {catalog, versions: {'gg.sprites': '0.1.0'}}).locks[0].id, 'gg.sprites');
  next.manifest.language = [...next.manifest.language, {...next.manifest.language.find(entry => entry.block === 'gg_move'), block: 'gg_move_again'}];
  assert.throws(() => createCapabilities(['gg.sprites'], {catalog, versions: {'gg.sprites': '0.1.0'}}), /misma forma/);
});

test('LANG-006: each context offers only the languages its active packs declare and names the pack that blocks one', () => {
  // Every published 2D pack declares both forms; micro:bit (TypeScript only) lowers to the device, not to 2D.
  const locks2D = ['gg.sprites@0.1.0', 'gg.assets@0.2.0', 'gg.score@0.2.0', 'gg.microbit@0.1.0'].map(key => { const [id, version] = key.split('@'); return {id, version}; });
  const current = languageAvailability(tablesForLocks(locks2D, languageTables), {lowering: 'ir'});
  assert.equal(current.javascript.available, true); assert.equal(current.python.available, true);
  assert.equal(current.python.reason, null);
  // 3D and web derive their pack entries from the operations: all readable.
  for (const context of ['scene3d', 'webapp']) {
    const operations = capabilityLanguageEntries(context).filter(entry => entry.lower.operation);
    const state = languageAvailability({[context]: operations}, {lowering: 'operation'});
    assert.equal(state.javascript.available && state.python.available, true, context);
  }
  // A pack whose 2D action has no text form makes both languages unavailable, naming the pack.
  const silent = {block: 'gg_example_glow', kind: 'call', target: 'sprite', args: [], lower: {ir: 'move'}};
  validateLanguageEntry(silent);
  const blocked = languageAvailability({'gg.sprites@0.1.0': languageTables['gg.sprites@0.1.0'], 'gg.example@1.0.0': [silent]}, {lowering: 'ir'});
  for (const language of ['javascript', 'python']) {
    assert.equal(blocked[language].available, false);
    assert.deepEqual(blocked[language].packs, ['gg.example@1.0.0']);
    assert.match(blocked[language].reason, /gg\.example@1\.0\.0 no declara forma (JavaScript|Python)/);
  }
  // Core syntax (assignments, reads, control) never blocks a language, nor do entries of another lowering.
  const coreOnly = languageAvailability({core: coreLanguageEntries, 'gg.score@0.2.0': languageTables['gg.score@0.2.0'], 'gg.microbit@0.1.0': languageTables['gg.microbit@0.1.0']}, {lowering: 'ir'});
  assert.equal(coreOnly.javascript.available && coreOnly.python.available, true);
  // apiVersion 2 manifests bring their own table; unknown locks contribute nothing.
  const own = tablesForLocks([{id: 'gg.example', version: '2.0.0'}, {id: 'gg.unknown', version: '9.9.9'}], languageTables, {'gg.example@2.0.0': {language: [silent]}});
  assert.deepEqual(Object.keys(own), ['gg.example@2.0.0']);
});
