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

// Shared drawing helpers for the sprites of wave 2.
function ellipse(rows, cx, cy, rx, ry, color) {
  rows.forEach((row, y) => row.forEach((_, x) => {
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) row[x] = color;
  }));
}

function stroke(rows, x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / (steps || 1)), y = Math.round(y0 + ((y1 - y0) * i) / (steps || 1));
    if (rows[y]?.[x] !== undefined) rows[y][x] = color;
  }
}

// Maya numerals: a dot is 1, a bar is 5 and the zero has its own shape. They differ by shape, not only by color.
function punto() {
  const rows = blank(8, 8);
  disc(rows, 3.5, 3.5, 3.9, BLACK);
  disc(rows, 3.5, 3.5, 2.7, 4);
  dots(rows, [[2, 2]], 5);
  return rows;
}

function barra() {
  const rows = blank(28, 7);
  box(rows, 0, 0, 28, 7, BLACK);
  box(rows, 1, 1, 26, 5, 4);
  box(rows, 2, 2, 24, 1, 5);
  dots(rows, [[0, 0], [27, 0], [0, 6], [27, 6]], CLEAR);
  return rows;
}

function cero() {
  const rows = blank(24, 13);
  ellipse(rows, 11.5, 6, 11.9, 6.4, BLACK);
  ellipse(rows, 11.5, 6, 10.3, 4.9, 4);
  for (const x of [7, 11, 15]) box(rows, x, 3, 1, 7, BLACK);
  box(rows, 5, 6, 14, 1, BLACK);
  return rows;
}

function flecha() {
  const rows = blank(16, 11);
  for (let x = 0; x < 16; x++) {
    const half = x < 9 ? 2 : 5 - Math.floor((x - 9) * 5 / 7);
    for (let y = 5 - half; y <= 5 + half; y++) rows[y][x] = BLACK;
    for (let y = 6 - half; y <= 4 + half; y++) if (x > 0 && x < 15 && y >= 0) rows[y][x] = 7;
  }
  for (let x = 0; x < 9; x++) { rows[3][x] = BLACK; rows[7][x] = BLACK; }
  box(rows, 1, 4, 9, 3, 7);
  return rows;
}

function casilla() {
  const rows = blank(14, 14);
  box(rows, 0, 0, 14, 14, BLACK);
  box(rows, 1, 1, 12, 12, WHITE);
  box(rows, 3, 3, 8, 8, 13);
  return rows;
}

// Icons of the wave-2 games, all simple shapes.
function arbol() {
  const rows = blank(24, 32);
  box(rows, 10, 18, 4, 14, 14);
  dots(rows, [[10, 22], [13, 26], [10, 29]], BLACK);
  disc(rows, 12, 9, 9, 6);
  disc(rows, 7, 13, 6.5, 6);
  disc(rows, 17, 13, 6.5, 6);
  disc(rows, 12, 7, 6.5, 7);
  disc(rows, 8, 11, 3.5, 7);
  disc(rows, 16, 14, 3, 7);
  return rows;
}

function brote() {
  const rows = blank(16, 16);
  ellipse(rows, 8, 14, 7.5, 2.5, 14);
  box(rows, 7, 6, 2, 8, 7);
  ellipse(rows, 4, 5, 3.6, 2.2, 7);
  ellipse(rows, 12, 4, 3.6, 2.2, 7);
  dots(rows, [[5, 6], [11, 5]], 6);
  return rows;
}

function gota() {
  const rows = blank(12, 16);
  disc(rows, 5.5, 10, 5.2, 8);
  for (let y = 0; y < 8; y++) {
    const half = Math.round((y / 8) * 4.5);
    for (let x = 5 - half; x <= 6 + half; x++) rows[y][x] = 8;
  }
  box(rows, 3, 9, 1, 3, 9);
  dots(rows, [[4, 8]], 9);
  return rows;
}

function huella() {
  const rows = blank(16, 16);
  ellipse(rows, 8, 11, 5, 4, 14);
  for (const [x, y] of [[2.5, 6], [6, 2.5], [10, 2.5], [13.5, 6]]) ellipse(rows, x, y, 1.9, 2.3, 14);
  return rows;
}

function carta() {
  const rows = blank(20, 14);
  box(rows, 0, 0, 20, 14, BLACK);
  box(rows, 1, 1, 18, 12, WHITE);
  stroke(rows, 1, 1, 10, 8, BLACK);
  stroke(rows, 18, 1, 10, 8, BLACK);
  stroke(rows, 1, 12, 7, 6, 11);
  stroke(rows, 18, 12, 12, 6, 11);
  return rows;
}

function moneda() {
  const rows = blank(14, 14);
  disc(rows, 6.5, 6.5, 6.5, BLACK);
  disc(rows, 6.5, 6.5, 5.4, 5);
  disc(rows, 6.5, 6.5, 3.6, 4);
  disc(rows, 6.5, 6.5, 2.6, 5);
  dots(rows, [[3, 3], [4, 3]], WHITE);
  return rows;
}

function nota() {
  const rows = blank(12, 16);
  ellipse(rows, 4, 12, 3.8, 2.8, BLACK);
  box(rows, 7, 1, 2, 12, BLACK);
  box(rows, 9, 1, 2, 2, BLACK);
  box(rows, 10, 3, 2, 3, BLACK);
  box(rows, 9, 5, 1, 1, BLACK);
  return rows;
}

function colibri() {
  const rows = blank(28, 20);
  for (let i = 0; i < 7; i++) ellipse(rows, 7 - i, 12 + i * 0.9, 1.6, 1.6, i % 2 ? 6 : 7);
  ellipse(rows, 13, 11, 8, 4.3, 7);
  ellipse(rows, 20, 7, 4, 3.6, 7);
  ellipse(rows, 20, 10, 3, 2, 2);
  stroke(rows, 24, 7, 27, 8, BLACK);
  stroke(rows, 24, 6, 27, 8, BLACK);
  dots(rows, [[21, 6]], BLACK);
  dots(rows, [[22, 6]], WHITE);
  for (let i = 0; i < 9; i++) stroke(rows, 10 + i * 0.4, 8 - i * 0.3, 11 + i, 1 + Math.min(i, 3) * 0.3, 6);
  ellipse(rows, 12, 6, 5, 2.4, 6);
  box(rows, 14, 14, 1, 3, BLACK);
  return rows;
}

function abeja() {
  const rows = blank(20, 14);
  ellipse(rows, 8, 5, 3.5, 3, 9);
  ellipse(rows, 12, 4, 3.5, 3, 9);
  ellipse(rows, 11, 9, 7, 3.8, 5);
  for (const x of [8, 12]) for (let y = 6; y <= 12; y++) if (rows[y][x] === 5) rows[y][x] = BLACK;
  ellipse(rows, 4, 9, 2.8, 2.8, BLACK);
  dots(rows, [[3, 8]], WHITE);
  dots(rows, [[18, 9], [19, 9]], BLACK);
  return rows;
}

function flor() {
  const rows = blank(20, 24);
  box(rows, 9, 10, 2, 14, 7);
  ellipse(rows, 5, 18, 3.8, 1.8, 7);
  ellipse(rows, 15, 15, 3.8, 1.8, 7);
  for (const [x, y] of [[10, 3.5], [16, 8], [14, 13], [6, 13], [4, 8]]) disc(rows, x - 0.5, y, 3.9, 3);
  disc(rows, 9.5, 8.5, 3, 5);
  dots(rows, [[9, 8], [10, 9]], 4);
  return rows;
}

function bromelia() {
  const rows = blank(24, 24);
  box(rows, 0, 19, 24, 5, 14);
  box(rows, 0, 19, 24, 1, BLACK);
  box(rows, 10, 6, 4, 13, 7);
  for (const x1 of [1, 5, 9]) stroke(rows, 12, 18, x1, 7, 7);
  for (const x1 of [23, 19, 15]) stroke(rows, 12, 18, x1, 7, 7);
  stroke(rows, 11, 18, 4, 11, 6);
  stroke(rows, 13, 18, 20, 11, 6);
  stroke(rows, 12, 18, 12, 5, 6);
  for (const [x, y] of [[12, 3], [11, 4], [13, 4], [12, 5]]) disc(rows, x, y, 1.6, 2);
  return rows;
}

function hongo() {
  const rows = blank(20, 20);
  ellipse(rows, 10, 10, 9.5, 8, BLACK);
  ellipse(rows, 10, 10, 8.6, 7.1, 14);
  box(rows, 0, 11, 20, 9, CLEAR);
  box(rows, 7, 11, 6, 9, BLACK);
  box(rows, 8, 11, 4, 8, 13);
  box(rows, 8, 11, 1, 8, 11);
  box(rows, 0, 11, 20, 1, BLACK);
  dots(rows, [[5, 7], [6, 7], [11, 5], [12, 5], [14, 8], [15, 8]], 13);
  return rows;
}

function garrapata() {
  const rows = blank(16, 14);
  for (const y of [3, 5, 8, 10]) {
    stroke(rows, 5, y + 1, 0, y - 1, BLACK);
    stroke(rows, 10, y + 1, 15, y - 1, BLACK);
  }
  ellipse(rows, 7.5, 7, 4.6, 5.2, BLACK);
  ellipse(rows, 7.5, 7.5, 3.5, 4.2, 14);
  box(rows, 6, 1, 3, 2, BLACK);
  dots(rows, [[6, 6], [9, 6]], 13);
  return rows;
}

function lombriz() {
  const rows = blank(28, 10);
  for (let x = 1; x < 27; x++) {
    const y = 4.5 + Math.sin(x / 3.2) * 2.8;
    ellipse(rows, x, y, 2, 2, BLACK);
  }
  for (let x = 1; x < 27; x++) {
    const y = 4.5 + Math.sin(x / 3.2) * 2.8;
    ellipse(rows, x, y, 1.1, 1.1, x % 4 < 2 ? 3 : 2);
  }
  return rows;
}

// A pictogram, with no skin color or features: it can be anyone.
function persona() {
  const rows = blank(16, 28);
  disc(rows, 7.5, 4.5, 4.4, BLACK);
  disc(rows, 7.5, 4.5, 3.4, 8);
  box(rows, 3, 10, 10, 9, BLACK);
  box(rows, 4, 11, 8, 7, 8);
  box(rows, 1, 11, 2, 8, BLACK);
  box(rows, 13, 11, 2, 8, BLACK);
  box(rows, 4, 19, 3, 8, BLACK);
  box(rows, 9, 19, 3, 8, BLACK);
  box(rows, 5, 19, 1, 7, 8);
  box(rows, 10, 19, 1, 7, 8);
  return rows;
}

export const SPRITES = {geeky: geeky(), manzana, banano, mango, mira: mira(), pollito: pollito(), perro: perro(), cabra: cabra(),
  punto: punto(), barra: barra(), cero: cero(), flecha: flecha(), casilla: casilla(), arbol: arbol(), brote: brote(), gota: gota(), huella: huella(),
  carta: carta(), moneda: moneda(), nota: nota(), colibri: colibri(), abeja: abeja(), flor: flor(), bromelia: bromelia(), hongo: hongo(),
  garrapata: garrapata(), lombriz: lombriz(), persona: persona()};

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

// Every game background leaves its middle (80..240 x 70..170) calm, at most three colors, because the
// games put text and sprites there. The scenery stays at the edges.
function plain(color) {
  const rows = blank(320, 240);
  box(rows, 0, 0, 320, 240, color);
  return rows;
}

function planks(rows, y, height, wood, line) {
  box(rows, 0, y, 320, height, wood);
  box(rows, 0, y, 320, 1, BLACK);
  for (let x = 0; x < 320; x += 40) box(rows, x, y + 1, 1, height - 1, line);
}

// The market: an awning with stripes, crates of fruit at the sides and a wooden counter.
function fondoMercado() {
  const rows = plain(13);
  for (let x = 0; x < 320; x++) box(rows, x, 0, 1, 26, Math.floor(x / 20) % 2 ? WHITE : 2);
  for (let n = 0; n < 16; n++) {
    disc(rows, n * 20 + 9.5, 26, 10, n % 2 ? WHITE : 2);
    for (let a = 0; a <= 20; a++) {
      const x = n * 20 + a, y = 26 + Math.round(Math.sqrt(Math.max(0, 100 - (a - 9.5) ** 2)));
      if (rows[y]?.[x] !== undefined) rows[y][x] = BLACK;
    }
  }
  box(rows, 0, 25, 320, 1, BLACK);
  for (const [left, tint] of [[6, 2], [262, 7]]) {
    box(rows, left, 156, 52, 44, 14);
    box(rows, left, 156, 52, 1, BLACK);
    for (let y = 168; y < 200; y += 12) box(rows, left, y, 52, 1, BLACK);
    box(rows, left, 156, 1, 44, BLACK);
    box(rows, left + 51, 156, 1, 44, BLACK);
    for (let i = 0; i < 4; i++) disc(rows, left + 8 + i * 12, 150, 5.6, i % 2 ? 5 : tint);
    for (let i = 0; i < 3; i++) disc(rows, left + 14 + i * 12, 143, 5.6, tint);
  }
  planks(rows, 200, 40, 14, BLACK);
  box(rows, 0, 201, 320, 3, 4);
  return rows;
}

// A cloud forest: canopy above, trunks with epiphytes at the sides, mist across the middle and ferns on the floor.
function fondoBosque() {
  const rows = plain(9);
  for (const [top, depth] of [[88, 14], [148, 10]]) {
    for (let y = top; y < top + depth; y++) for (let x = 0; x < 320; x++) {
      const edge = Math.min(y - top, top + depth - 1 - y);
      if (edge >= 3 ? (x + y) % 2 === 0 : edge >= 1 ? x % 2 === 0 && y % 2 === 0 : x % 4 === 0 && y % 2 === 0) rows[y][x] = WHITE;
    }
  }
  for (const [left, width] of [[0, 44], [276, 44]]) {
    box(rows, left, 30, width, 180, 14);
    for (let y = 44; y < 210; y += 9) box(rows, left + 6 + ((y * 5) % 24), y, 1, 6, BLACK);
    box(rows, left + (left ? 0 : width - 1), 30, 1, 180, BLACK);
    for (const y of [76, 118, 162]) {
      ellipse(rows, left + (left ? 6 : width - 6), y, 9, 5, 7);
      dots(rows, [[left + (left ? 3 : width - 8), y - 4], [left + (left ? 8 : width - 12), y - 5]], 3);
    }
  }
  for (let i = 0; i < 16; i++) {
    const x = i * 21 + ((i * 7) % 10);
    disc(rows, x, 20 + ((i * 11) % 14), 17, i % 2 ? 7 : 6);
    disc(rows, x + 8, 34 + ((i * 5) % 9), 11, i % 2 ? 6 : 7);
  }
  box(rows, 0, 196, 320, 44, 6);
  for (let x = 0; x < 320; x += 16) {
    stroke(rows, x + 8, 190, x + 2, 207, 7);
    stroke(rows, x + 8, 190, x + 14, 207, 7);
    stroke(rows, x + 8, 190, x + 8, 205, 7);
  }
  box(rows, 0, 214, 320, 26, 14);
  for (let x = 4; x < 320; x += 11) box(rows, x, 220 + ((x * 3) % 10), 4, 2, BLACK);
  return rows;
}

// Schematic latitude bands (not a map): polar, temperate and tropical, with dashed parallels and dotted meridians.
function fondoMundo() {
  const rows = blank(320, 240);
  for (let y = 0; y < 240; y++) {
    const lat = Math.abs(y - 120);
    box(rows, 0, y, 320, 1, lat <= 31 ? 5 : lat <= 88 ? 7 : WHITE);
  }
  for (let x = 40; x < 320; x += 40) for (let y = 0; y < 240; y += 4) rows[y][x] = BLACK;
  for (const y of [32, 89, 120, 151, 208]) for (let x = 0; x < 320; x++) if (x % 10 < 6) { rows[y][x] = BLACK; rows[y + 1][x] = BLACK; }
  return rows;
}

// A classroom wall: chalkboard on top, a bulletin board at the left and a wooden floor.
function fondoEscuela() {
  const rows = plain(13);
  box(rows, 66, 6, 188, 56, 14);
  box(rows, 70, 10, 180, 48, 6);
  box(rows, 66, 62, 188, 4, 4);
  box(rows, 66, 6, 188, 1, BLACK);
  box(rows, 6, 24, 54, 80, 14);
  box(rows, 9, 27, 48, 74, 4);
  for (const [x, y, c] of [[13, 31, WHITE], [34, 34, 5], [15, 55, 3], [37, 58, WHITE], [12, 80, 5], [35, 82, 9]]) {
    box(rows, x, y, 14, 16, BLACK);
    box(rows, x + 1, y + 1, 12, 14, c);
    box(rows, x + 6, y - 2, 2, 2, 2);
  }
  box(rows, 268, 28, 46, 46, 14);
  box(rows, 271, 31, 40, 40, 9);
  box(rows, 290, 31, 2, 40, 14);
  box(rows, 271, 50, 40, 2, 14);
  planks(rows, 196, 44, 11, 12);
  box(rows, 0, 197, 320, 3, 12);
  return rows;
}

// A school stage: red curtains at the sides, a light backdrop and a wooden floor.
function fondoMarimba() {
  const rows = plain(13);
  for (const [left, step] of [[0, 1], [284, -1]]) {
    box(rows, left, 0, 36, 200, 2);
    for (let x = 0; x < 36; x += 6) box(rows, left + x, 0, 2, 200, 14);
    box(rows, left + (step > 0 ? 35 : 0), 0, 1, 200, BLACK);
  }
  box(rows, 0, 0, 320, 14, 2);
  for (let x = 0; x < 320; x += 20) disc(rows, x + 10, 14, 10, 2);
  box(rows, 0, 14, 320, 1, 14);
  planks(rows, 200, 40, 14, BLACK);
  box(rows, 0, 201, 320, 3, 4);
  return rows;
}

export const FONDOS = {fondoPlano: fondoPlano(), fondoMercado: fondoMercado(), fondoBosque: fondoBosque(), fondoMundo: fondoMundo(),
  fondoEscuela: fondoEscuela(), fondoMarimba: fondoMarimba()};

export function jres(sprites = SPRITES, fondos = FONDOS) {
  const entries = Object.entries({...sprites, ...fondos}).map(([name, rows]) => [name, encodeF4(rows).toString('base64')]);
  return {'*': {namespace: 'sprites.gg', mimeType: 'image/x-mkcd-f4', dataEncoding: 'base64'}, ...Object.fromEntries(entries)};
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  writeFileSync('libs/gg-studio/gg.jres', `${JSON.stringify(jres(), null, 4)}\n`);
