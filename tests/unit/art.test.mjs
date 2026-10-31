import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FONDOS, SPRITES, decodeF4, encodeF4, jres} from '../../tools/gg-art.mjs';

test('codifica igual que una imagen real de PXT', () => {
  const {smallApple} = JSON.parse(readFileSync('libs/device/smallFood.jres', 'utf8'));
  const original = Buffer.from(smallApple, 'base64');
  assert.equal(encodeF4(decodeF4(original)).toString('base64'), smallApple);
});

test('los sprites son rectangulares y usan solo los 16 colores', () => {
  for (const [name, rows] of Object.entries(SPRITES))
    for (const row of rows) {
      assert.equal(row.length, rows[0].length, name);
      assert.ok(row.every(color => Number.isInteger(color) && color >= 0 && color < 16), name);
    }
});

test('gg.jres es lo que produce el dibujo', () => {
  assert.deepEqual(JSON.parse(readFileSync('libs/gg-studio/gg.jres', 'utf8')), jres());
});

test('los fondos miden 320x240 y usan solo los 16 colores', () => {
  assert.ok(Object.keys(FONDOS).includes('fondoPlano'));
  for (const [name, rows] of Object.entries(FONDOS)) {
    assert.equal(rows.length, 240, name);
    for (const row of rows) {
      assert.equal(row.length, 320, name);
      assert.ok(row.every(color => Number.isInteger(color) && color >= 0 && color < 16), name);
    }
  }
});

test('el plano pone el origen en 160,120 y los ejes en negro', () => {
  const fondo = FONDOS.fondoPlano;
  assert.equal(fondo[120][100], 15, 'eje x');
  assert.equal(fondo[40][160], 15, 'eje y');
  assert.equal(fondo[120][160], 15);
  assert.notEqual(fondo[100][100], 15);
});

test('los animales y la mira son sprites con su arte', () => {
  for (const name of ['mira', 'pollito', 'perro', 'cabra']) assert.ok(SPRITES[name], name);
  assert.equal(SPRITES.mira.length, 15);
  assert.equal(SPRITES.mira[0].length, 15);
  for (const name of ['pollito', 'perro', 'cabra']) assert.deepEqual([SPRITES[name].length, SPRITES[name][0].length], [16, 16], name);
});

test('cada imagen de gg.jres se declara en gg.ts, sin entrar en la galería de la misión', () => {
  const ts = readFileSync('libs/gg-studio/gg.ts', 'utf8');
  for (const name of Object.keys(jres()).filter(key => key !== '*')) {
    const declaracion = ts.match(new RegExp(`((?://%[^\\n]*\\n\\s*)+)export const ${name} =`));
    assert.ok(declaracion, name);
    if (['mira', 'pollito', 'perro', 'cabra'].includes(name) || name in FONDOS) {
      assert.match(declaracion[1], /whenUsed/, name);
      assert.doesNotMatch(declaracion[1], /tags="gg( |")/, name);
    }
  }
});
