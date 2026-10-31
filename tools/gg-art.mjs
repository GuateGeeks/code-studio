// Draws the GuateGeeks sprites in the 16-color palette and writes libs/gg-studio/gg.jres.
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const CLEAR = 0, WHITE = 1, BLACK = 15;

// PXT's f4 image: 8-byte header, then columns of 4-bit pixels, each aligned to 4 bytes.
export function encodeF4(rows) {
  const height = rows.length, width = rows[0].length;
  const column = ((height * 4 + 31) >> 5) << 2;
  const out = Buffer.alloc(8 + width * column);
  out.set([0x87, 0x04, width & 255, width >> 8, height & 255, height >> 8]);
  for (let x = 0; x < width; x++)
    for (let y = 0; y < height; y++) {
      const at = 8 + x * column + (y >> 1);
      out[at] |= y & 1 ? rows[y][x] << 4 : rows[y][x];
    }
  return out;
}

export function decodeF4(data) {
  const width = data.readUInt16LE(2), height = data.readUInt16LE(4);
  const column = ((height * 4 + 31) >> 5) << 2;
  return Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => {
    const byte = data[8 + x * column + (y >> 1)];
    return y & 1 ? byte >> 4 : byte & 15;
  }));
}

const parse = lines => lines.map(line => [...line].map(c => (c === '.' ? CLEAR : parseInt(c, 16))));

function disc(rows, cx, cy, radius, color) {
  rows.forEach((row, y) => row.forEach((_, x) => {
    if ((x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2) row[x] = color;
  }));
}

// Geeky is the pair of round glasses from the logo, the right lens sitting higher.
function geeky() {
  const rows = Array.from({length: 24}, () => Array(36).fill(CLEAR));
  const lens = (cx, cy) => {
    disc(rows, cx, cy, 8.6, BLACK);
    disc(rows, cx, cy, 6.9, WHITE);
    disc(rows, cx + 1, cy + 1, 3.2, BLACK);
    rows[cy][cx + 2] = WHITE;
  };
  lens(9, 14);
  lens(26, 9);
  for (const [x, y] of [[17, 9], [18, 8], [19, 8], [17, 10]]) rows[y][x] = BLACK;
  return rows;
}

const manzana = parse([
  '.......e.77.....',
  '.......e777.....',
  '...2222e2222....',
  '..222222222222..',
  '.23322222222222.',
  '.23222222222222.',
  '.23222222222222.',
  '.22222222222222.',
  '.22222222222222.',
  '.22222222222222.',
  '..222222222222..',
  '..222222222222..',
  '...2222222222...',
  '....22222222....',
  '.....222.222....',
  '................'
]);

const banano = parse([
  '............e...',
  '...........55...',
  '..........555...',
  '..........555...',
  '.........5555...',
  '.........5555...',
  '........55554...',
  '........55554...',
  '.......555544...',
  '......555554....',
  '.....555554.....',
  '...5555554......',
  '.e5555554.......',
  'ee555544........',
  '..4444..........',
  '................'
]);

const mango = parse([
  '.........e......',
  '.........e77....',
  '.....44444777...',
  '...4444444477...',
  '..544444444222..',
  '.55444444422222.',
  '.55444444222222.',
  '.55544442222222.',
  '.55554442222222.',
  '..5554442222222.',
  '..5555444222222.',
  '...5554442222...',
  '....5544422.....',
  '.....54442......',
  '................',
  '................'
]);

const blank = (width, height) => Array.from({length: height}, () => Array(width).fill(CLEAR));

function box(rows, x, y, width, height, color) {
  for (let j = y; j < y + height; j++) for (let i = x; i < x + width; i++) if (rows[j]?.[i] !== undefined) rows[j][i] = color;
}

const dots = (rows, points, color) => points.forEach(([x, y]) => { rows[y][x] = color; });

// The brigade marker: a ring with a crosshair, hollow so the grid point under it stays visible.
function mira() {
  const rows = blank(15, 15);
  const RED = 2;
  rows.forEach((row, y) => row.forEach((_, x) => {
    const distance = Math.hypot(x - 7, y - 7);
    if (distance >= 5.2 && distance <= 7.2) row[x] = RED;
  }));
  for (let i = 3; i <= 11; i++) if (i < 6 || i > 8) { rows[7][i] = BLACK; rows[i][7] = BLACK; }
  rows[7][7] = BLACK;
  return rows;
}

// Three animals of the village, drawn from simple shapes.
function pollito() {
  const rows = blank(16, 16);
  disc(rows, 8, 10, 5.6, 5);
  disc(rows, 8, 4.5, 3.8, 5);
  dots(rows, [[6, 4]], BLACK);
  box(rows, 11, 4, 3, 2, 4);
  dots(rows, [[12, 6]], 4);
  box(rows, 6, 14, 1, 2, 4);
  box(rows, 10, 14, 1, 2, 4);
  dots(rows, [[5, 15], [9, 15], [11, 15]], 4);
  box(rows, 1, 8, 3, 4, 4);
  box(rows, 3, 9, 2, 3, 5);
  return rows;
}

// The dog is brown so it stands out on the tan map, with a light muzzle and chest.
function perro() {
  const rows = blank(16, 16);
  box(rows, 2, 6, 10, 6, 14);
  box(rows, 3, 12, 2, 4, 14);
  box(rows, 9, 12, 2, 4, 14);
  box(rows, 10, 1, 5, 6, 14);
  box(rows, 9, 1, 2, 5, BLACK);
  box(rows, 13, 4, 3, 3, 13);
  dots(rows, [[12, 3]], WHITE);
  dots(rows, [[15, 4]], BLACK);
  box(rows, 9, 8, 3, 4, 13);
  box(rows, 0, 3, 2, 6, 14);
  dots(rows, [[0, 3]], BLACK);
  return rows;
}

// The goat is white with dark horns, so it contrasts with the tan map.
function cabra() {
  const rows = blank(16, 16);
  box(rows, 2, 6, 10, 6, WHITE);
  box(rows, 3, 12, 2, 3, WHITE);
  box(rows, 9, 12, 2, 3, WHITE);
  box(rows, 3, 15, 2, 1, BLACK);
  box(rows, 9, 15, 2, 1, BLACK);
  box(rows, 10, 2, 5, 6, WHITE);
  dots(rows, [[10, 1], [10, 0], [11, 0], [13, 1], [13, 0], [14, 0]], 14);
  dots(rows, [[11, 4]], BLACK);
  dots(rows, [[15, 6]], BLACK);
  box(rows, 12, 8, 2, 3, 11);
  box(rows, 0, 6, 2, 2, WHITE);
  box(rows, 2, 6, 10, 1, 11);
  dots(rows, [[3, 11], [6, 11], [9, 11]], 11);
  return rows;
}

export const SPRITES = {geeky: geeky(), manzana, banano, mango, mira: mira(), pollito: pollito(), perro: perro(), cabra: cabra()};

// 3x5 glyphs for the axis labels, drawn double size so a 10-year-old can read them on a classroom screen.
const GLYPHS = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'], '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'], '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '001', '001', '001'], '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'], '-': ['000', '000', '111', '000', '000'], x: ['101', '101', '010', '101', '101'],
  y: ['101', '101', '010', '010', '010']
};
const SCALE = 2;

const labelWidth = text => text.length * 4 * SCALE - SCALE;

function label(rows, text, left, top, ink, paper) {
  box(rows, left - 1, top - 1, labelWidth(text) + 2, 5 * SCALE + 2, paper);
  [...text].forEach((char, n) => GLYPHS[char].forEach((line, j) => [...line].forEach((bit, i) => {
    if (bit === '1') box(rows, left + n * 4 * SCALE + i * SCALE, top + j * SCALE, SCALE, SCALE, ink);
  })));
}

// Rescue in the plane: x from -7 to 7 and y from -5 to 5, one cell per 20 pixels, origin at 160,120.
function fondoPlano() {
  const CELL = 20, OX = 160, OY = 120, PAPER = 13, GRID = 11, INK = 12;
  const rows = blank(320, 240);
  box(rows, 0, 0, 320, 240, PAPER);
  for (let x = -7; x <= 7; x++) box(rows, OX + x * CELL, 0, 1, 240, GRID);
  for (let y = -5; y <= 5; y++) box(rows, 0, OY - y * CELL, 320, 1, GRID);
  box(rows, 0, OY, 320, 1, BLACK);
  box(rows, OX, 0, 1, 240, BLACK);
  for (let x = -7; x <= 7; x++) if (x !== 0) label(rows, String(x), OX + x * CELL - Math.floor(labelWidth(String(x)) / 2), OY + 4, INK, PAPER);
  for (let y = -5; y <= 5; y++) if (y !== 0) label(rows, String(y), OX + 5, OY - y * CELL - 5, INK, PAPER);
  label(rows, '0', OX + 5, OY + 4, INK, PAPER);
  label(rows, 'x', 304, OY - 15, BLACK, PAPER);
  label(rows, 'y', OX - 15, 4, BLACK, PAPER);
  return rows;
}

export const FONDOS = {fondoPlano: fondoPlano()};

export function jres(sprites = SPRITES, fondos = FONDOS) {
  const entries = Object.entries({...sprites, ...fondos}).map(([name, rows]) => [name, encodeF4(rows).toString('base64')]);
  return {'*': {namespace: 'sprites.gg', mimeType: 'image/x-mkcd-f4', dataEncoding: 'base64'}, ...Object.fromEntries(entries)};
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  writeFileSync('libs/gg-studio/gg.jres', `${JSON.stringify(jres(), null, 4)}\n`);
