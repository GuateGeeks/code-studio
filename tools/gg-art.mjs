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

export const SPRITES = {geeky: geeky(), manzana, banano, mango};

export function jres(sprites = SPRITES) {
  const entries = Object.entries(sprites).map(([name, rows]) => [name, encodeF4(rows).toString('base64')]);
  return {'*': {namespace: 'sprites.gg', mimeType: 'image/x-mkcd-f4', dataEncoding: 'base64'}, ...Object.fromEntries(entries)};
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  writeFileSync('libs/gg-studio/gg.jres', `${JSON.stringify(jres(), null, 4)}\n`);
