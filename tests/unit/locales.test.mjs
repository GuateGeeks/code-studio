import test from 'node:test';
import assert from 'node:assert/strict';
import {addLocale, rebrand} from '../../tools/locales.mjs';

test('registra las cadenas en el paquete y en files de pxt.json', () => {
  const pkg = {'pxt.json': JSON.stringify({files: ['a.ts']})};
  addLocale(pkg, 'es-MX', 'game-strings.json', {x: 'y'});
  assert.deepEqual(JSON.parse(pkg['_locales/es-MX/game-strings.json']), {x: 'y'});
  assert.deepEqual(JSON.parse(pkg['pxt.json']).files, ['a.ts', '_locales/es-MX/game-strings.json']);
});
test('no registra archivos vacíos', () => {
  const pkg = {'pxt.json': JSON.stringify({files: []})};
  addLocale(pkg, 'es-MX', 'game-strings.json', {});
  assert.deepEqual(JSON.parse(pkg['pxt.json']).files, []);
});
test('quita las marcas ajenas de las traducciones', () => {
  assert.deepEqual(rebrand({a: 'Inicio de MakeCode', b: 'Microsoft MakeCode Arcade'}), {a: 'Inicio de Code Studio', b: 'Code Studio'});
});
