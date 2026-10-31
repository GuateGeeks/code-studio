import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPRITES, decodeF4, encodeF4, jres} from '../../tools/gg-art.mjs';

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
