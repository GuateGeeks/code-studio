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

const NOMBRES_FONDOS = ['fondoBosque', 'fondoEscuela', 'fondoMarimba', 'fondoMercado', 'fondoMundo', 'fondoPlano'];
// Shared sprites for the games of wave 2; the first four are the numerals of the maya counting game.
const NOMBRES_COMPARTIDOS = ['punto', 'barra', 'cero', 'flecha', 'casilla', 'arbol', 'brote', 'gota', 'huella', 'carta', 'moneda', 'nota',
  'colibri', 'abeja', 'flor', 'bromelia', 'hongo', 'garrapata', 'lombriz', 'persona'];

test('cada fondo mide 320×240 y usa la paleta', () => {
  assert.deepEqual(Object.keys(FONDOS).sort(), NOMBRES_FONDOS);
  for (const [name, rows] of Object.entries(FONDOS)) {
    assert.equal(rows.length, 240, name);
    for (const row of rows) {
      assert.equal(row.length, 320, name);
      assert.ok(row.every(color => Number.isInteger(color) && color >= 0 && color < 16), name);
    }
  }
});

test('los fondos son opacos y sus pantallas no quedan lisas', () => {
  for (const [name, rows] of Object.entries(FONDOS)) {
    const colores = new Set(rows.flat());
    assert.ok(!colores.has(0), `${name} tiene huecos transparentes`);
    assert.ok(colores.size >= 4, `${name} es casi liso`);
  }
});

test('el mundo marca ecuador, trópicos y círculos polares con rayas', () => {
  const mundo = FONDOS.fondoMundo;
  const rayas = fila => mundo[fila].filter(color => color === 15).length;
  // Latitude 0, ±23,5 and ±66,5 degrees on 240 px: 120, 89, 151, 32, 208 (dashed, not solid).
  for (const fila of [120, 89, 151, 32, 208]) {
    assert.ok(rayas(fila) > 100 && rayas(fila) < 260, `fila ${fila}: ${rayas(fila)}`);
  }
  assert.notEqual(mundo[60][10], mundo[120][10], 'las franjas se distinguen entre templada y tropical');
  assert.notEqual(mundo[10][10], mundo[60][10], 'las franjas se distinguen entre polar y templada');
});

test('el centro de cada fondo de juego queda tranquilo para los textos', () => {
  // The games draw text and sprites there: no more than 3 colors inside the central 160x100 window.
  for (const name of NOMBRES_FONDOS.filter(n => n !== 'fondoPlano' && n !== 'fondoMundo')) {
    const colores = new Set();
    for (let y = 70; y < 170; y++) for (let x = 80; x < 240; x++) colores.add(FONDOS[name][y][x]);
    assert.ok(colores.size <= 3, `${name}: ${colores.size} colores`);
  }
});

test('todo fondo se declara con whenUsed y gg-fondo, sin la etiqueta gg', () => {
  const ts = readFileSync('libs/gg-studio/gg.ts', 'utf8');
  for (const name of NOMBRES_FONDOS) {
    const declaracion = ts.match(new RegExp(`((?://%[^\\n]*\\n\\s*)+)export const ${name} =`));
    assert.ok(declaracion, name);
    assert.match(declaracion[1], /whenUsed/, name);
    assert.match(declaracion[1], /tags="gg-fondo"/, name);
    assert.doesNotMatch(declaracion[1], /tags="gg( |")/, name);
  }
});

test('los sprites compartidos miden hasta 32×32, existen y se declaran con whenUsed', () => {
  const ts = readFileSync('libs/gg-studio/gg.ts', 'utf8');
  for (const name of NOMBRES_COMPARTIDOS) {
    const rows = SPRITES[name];
    assert.ok(rows, name);
    assert.ok(rows.length <= 32 && rows[0].length <= 32, `${name}: ${rows[0].length}x${rows.length}`);
    assert.ok(rows.flat().some(color => color !== 0), `${name} está vacío`);
    const declaracion = ts.match(new RegExp(`((?://%[^\\n]*\\n\\s*)+)export const ${name} =`));
    assert.ok(declaracion, name);
    assert.match(declaracion[1], /whenUsed/, name);
    assert.doesNotMatch(declaracion[1], /tags="gg( |")/, name);
  }
});

test('el numeral maya se dibuja con formas distintas', () => {
  // Dot, bar and zero must differ by shape, not only by color.
  assert.deepEqual([SPRITES.punto.length, SPRITES.punto[0].length], [8, 8]);
  assert.ok(SPRITES.barra[0].length > SPRITES.barra.length * 3, 'la barra es alargada');
  assert.ok(SPRITES.cero[0].length > SPRITES.cero.length, 'el cero es un óvalo');
  assert.notDeepEqual(SPRITES.punto.flat().slice(0, 40), SPRITES.barra.flat().slice(0, 40));
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
    if (['mira', 'pollito', 'perro', 'cabra', ...NOMBRES_COMPARTIDOS].includes(name) || name in FONDOS) {
      assert.match(declaracion[1], /whenUsed/, name);
      assert.doesNotMatch(declaracion[1], /tags="gg( |")/, name);
    }
  }
});
