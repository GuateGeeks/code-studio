import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdtempSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {addLocale, fetchLocales, rebrand} from '../../tools/locales.mjs';

const servidor = respuestas => async url => ({ok: true, json: async () => respuestas(new URL(url).searchParams.get('filename'))});

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
test('falla si una traducción esencial llega vacía y no la deja en caché', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gg-loc-'));
  await assert.rejects(fetchLocales('es-MX', ['game'], dir, servidor(() => ({}))), /strings\.json/);
  assert.equal(existsSync(join(dir, 'es-MX/strings.json')), false);
});
test('acepta paquetes secundarios vacíos y reescribe la marca al guardar', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gg-loc-'));
  await fetchLocales('es-MX', ['game', 'otro'], dir, servidor(f => /otro/.test(f) || /jsdoc/.test(f) ? {} : {a: 'MakeCode'}));
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'es-MX/game-strings.json'), 'utf8')), {a: 'Code Studio'});
});
