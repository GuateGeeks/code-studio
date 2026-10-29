// Biblioteca inicial de GuateGeeks Code Studio: obra original generada por código.
// Cada dibujo emite geometría del subconjunto SVG pasivo admitido; cada sonido es una
// síntesis determinista PCM16. No se copian medios de Scratch, MakeCode ni Code.org.
// Uso: node tools/resources/starter-library.mjs [--check | --write-lock | --out <archivo> | --contact-sheet <carpeta>]
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sanitizeSvg} from '../../src/contracts/media-svg.mjs';
import {inspectWavPcm16} from '../../src/contracts/media-wav.mjs';

export const starterLibraryVersion = '1.0.0';
export const starterLibraryLicense = 'CC0-1.0';
export const starterLibraryAttribution = 'Biblioteca inicial de GuateGeeks Code Studio. Obra original del proyecto, generada por tools/resources/starter-library.mjs.';
export const starterLibraryLicenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/';
export const lockPath = resolve(dirname(fileURLToPath(import.meta.url)), 'starter-library.lock.json');

// Paleta: identidad de DESIGN.md (tinta, verdes, crema) y del hero de demostración (coral, azul).
const C = {
  ink: '#263c37', cream: '#fff9ed', white: '#ffffff', coral: '#ef6b54', coralDark: '#c9503c', blue: '#376fce', blueLight: '#9cc0f0',
  green: '#3f9a6b', greenDark: '#236146', leaf: '#7cc47f', mint: '#b9e3bb', yellow: '#f6c445', yellowDark: '#e0a526', orange: '#f29a4a',
  orangeDark: '#d9772c', purple: '#8a63c9', pink: '#f4a6b8', brown: '#b9824f', brownDark: '#86562f', gray: '#c6d4cb', steel: '#dbe6ef',
  red: '#e0503f', sand: '#f3dfb0', sky: '#cfeaf6', water: '#7fc6df'
};
const n = value => String(Math.round(value * 100) / 100);
function el(tag, attrs, children = '') {
  const text = Object.entries(attrs).filter(([, value]) => value !== undefined).map(([key, value]) => ` ${key}="${typeof value === 'number' ? n(value) : value}"`).join('');
  return children ? `<${tag}${text}>${children}</${tag}>` : `<${tag}${text}/>`;
}
const outline = body => el('g', {stroke: C.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, body);
const rect = (x, y, width, height, fill, extra = {}) => el('rect', {x, y, width, height, fill, ...extra});
const circle = (cx, cy, r, fill, extra = {}) => el('circle', {cx, cy, r, fill, ...extra});
const ellipse = (cx, cy, rx, ry, fill, extra = {}) => el('ellipse', {cx, cy, rx, ry, fill, ...extra});
const path = (d, fill, extra = {}) => el('path', {d, fill, ...extra});
const polygon = (points, fill, extra = {}) => el('polygon', {points: points.map(n).join(' '), fill, ...extra});
const line = (x1, y1, x2, y2, extra = {}) => el('line', {x1, y1, x2, y2, ...extra});
const flat = {stroke: 'none'};
// Extremidad con contorno: trazo de tinta ancho bajo un trazo de color.
const tube = (d, color, width = 8) => path(d, 'none', {'stroke-width': width + 6}) + path(d, 'none', {stroke: color, 'stroke-width': width});
// Ojo amable: pupila de tinta con brillo.
const eye = (x, y, r = 4) => circle(x, y, r, C.ink, flat) + circle(x - r * 0.35, y - r * 0.4, r * 0.38, C.white, flat);
const happyEye = (x, y, w = 4) => path(`M${n(x - w)} ${n(y + 1)} Q${n(x)} ${n(y - w)} ${n(x + w)} ${n(y + 1)}`, 'none', {'stroke-width': 2.6});
const smile = (x, y, w = 5, depth = 4) => path(`M${n(x - w)} ${n(y)} Q${n(x)} ${n(y + depth)} ${n(x + w)} ${n(y)}`, 'none', {'stroke-width': 2.6});
const cheek = (x, y, rx = 4, ry = 2.6) => ellipse(x, y, rx, ry, C.pink, {...flat, opacity: 0.75});
function svg(width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
}
function star(cx, cy, outer, inner, points = 5, rotation = -90) {
  const result = [];
  for (let index = 0; index < points * 2; index++) {
    const radius = index % 2 ? inner : outer, angle = (rotation + index * 180 / points) * Math.PI / 180;
    result.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  return result;
}
// Generador congruencial con aritmética entera: posiciones y ruido reproducibles.
function random(seed) {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

// ---------- Personajes (96×96) ----------
function cat(jumping) {
  const head = jumping ? 30 : 36;
  const tail = jumping ? 'M64 66 C84 58 86 34 76 26' : 'M64 76 C86 76 90 54 78 46';
  const limbs = jumping
    ? tube('M38 58 L24 42', C.orange, 8) + tube('M58 58 L72 42', C.orange, 8) + tube('M42 78 L37 87', C.orange, 9) + tube('M54 78 L59 87', C.orange, 9)
    : '';
  const body = jumping ? ellipse(48, 64, 17, 19, C.orange) : ellipse(48, 68, 21, 18, C.orange);
  const belly = jumping ? ellipse(48, 68, 9, 11, C.cream, flat) : ellipse(48, 72, 11, 10, C.cream, flat);
  const paws = jumping ? circle(23, 41, 5, C.orange) + circle(73, 41, 5, C.orange) : ellipse(39, 86, 8, 5, C.orange) + ellipse(57, 86, 8, 5, C.orange);
  const ears = polygon([28, head - 10, 30, head - 30, 44, head - 18], C.orange) + polygon([68, head - 10, 66, head - 30, 52, head - 18], C.orange) +
    polygon([31, head - 14, 32, head - 25, 40, head - 18], C.pink, flat) + polygon([65, head - 14, 64, head - 25, 56, head - 18], C.pink, flat);
  const face = (jumping ? happyEye(40, head, 4) + happyEye(56, head, 4) : eye(40, head) + eye(56, head)) +
    polygon([45, head + 6, 51, head + 6, 48, head + 9], C.coralDark, flat) +
    (jumping ? ellipse(48, head + 13, 4, 3.5, C.ink, flat) : path(`M43 ${head + 11} Q48 ${head + 15} 48 ${head + 9} Q48 ${head + 15} 53 ${head + 11}`, 'none', {'stroke-width': 2.2})) +
    cheek(34, head + 7) + cheek(62, head + 7) +
    line(22, head + 5, 32, head + 6, {'stroke-width': 1.8}) + line(22, head + 10, 32, head + 9, {'stroke-width': 1.8}) +
    line(74, head + 5, 64, head + 6, {'stroke-width': 1.8}) + line(74, head + 10, 64, head + 9, {'stroke-width': 1.8});
  const stripes = path(`M44 ${head - 19} L45 ${head - 13} M48 ${head - 20} L48 ${head - 13} M52 ${head - 19} L51 ${head - 13}`, 'none', {stroke: C.orangeDark, 'stroke-width': 2.4});
  return svg(96, 96, outline(tube(tail, C.orange, 7) + limbs + body + belly + paws + ears + ellipse(48, head, 24, 20, C.orange) + stripes + face));
}
function quetzal(wingsUp) {
  const tail = tube('M38 62 C28 72 20 80 9 88', C.green, 6) + tube('M42 64 C36 74 30 82 22 90', C.blue, 5);
  const wing = wingsUp
    ? path('M44 46 C36 30 34 18 40 8 C48 18 56 32 58 44 Z', C.greenDark)
    : path('M44 50 C34 60 30 70 32 82 C42 74 52 64 58 54 Z', C.greenDark);
  return svg(96, 96, outline(tail + ellipse(52, 54, 22, 17, C.green) +
    path('M58 70 C46 72 38 66 36 58 C46 60 58 58 70 52 C70 62 66 68 58 70 Z', C.red) +
    polygon([60, 24, 62, 14, 66, 22, 70, 12, 72, 22, 78, 16, 76, 26], C.green) +
    circle(68, 34, 15, C.green) + polygon([80, 31, 92, 36, 80, 41], C.yellow) + wing +
    eye(72, 32, 3.6) + cheek(70, 41, 3.6, 2.2) + tube('M46 70 L44 80', C.yellowDark, 3) + tube('M56 70 L56 80', C.yellowDark, 3)));
}
function robot(waving) {
  const arms = waving
    ? tube('M24 56 L14 70', C.steel, 7) + circle(13, 72, 5, C.coral) + tube('M72 54 L84 36', C.steel, 7) + circle(85, 32, 6, C.coral)
    : tube('M24 56 L14 70', C.steel, 7) + circle(13, 72, 5, C.coral) + tube('M72 56 L82 70', C.steel, 7) + circle(83, 72, 5, C.coral);
  return svg(96, 96, outline(line(48, 18, 48, 8) + circle(48, 7, 5, C.coral) + arms +
    rect(38, 76, 8, 14, C.steel, {rx: 2}) + rect(52, 76, 8, 14, C.steel, {rx: 2}) +
    rect(26, 48, 46, 32, C.blue, {rx: 8}) + rect(40, 58, 18, 12, C.blueLight, {rx: 4}) + circle(49, 64, 3, C.yellow, flat) +
    rect(24, 16, 48, 34, C.blue, {rx: 12}) + rect(31, 22, 34, 22, C.cream, {rx: 7}) +
    (waving ? happyEye(41, 32, 3.6) + happyEye(55, 32, 3.6) : eye(41, 31, 3.8) + eye(55, 31, 3.8)) + smile(48, 37, 5, 4) +
    circle(22, 33, 4, C.steel) + circle(74, 33, 4, C.steel)));
}
function fish(tailUp) {
  const angle = tailUp ? -20 : 16;
  return svg(96, 96, outline(
    el('g', {transform: `rotate(${angle} 26 50)`}, polygon([28, 50, 6, 32, 10, 50, 6, 68], C.coralDark)) +
    path('M44 30 C48 20 60 18 66 28 Z', C.coralDark) + ellipse(52, 50, 30, 21, C.coral) +
    path('M38 38 Q42 50 38 62 M48 34 Q52 50 48 66', 'none', {stroke: C.yellow, 'stroke-width': 3}) +
    path('M52 60 C56 70 64 70 66 62 Z', C.coralDark) +
    eye(68, 45, 4.5) + smile(72, 56, 4, 3) + cheek(64, 56, 3.5, 2.2)));
}
function dog() {
  return svg(96, 96, outline(tube('M66 74 C78 70 82 62 80 54', C.brown, 6) + ellipse(48, 70, 21, 17, C.brown) + ellipse(48, 74, 11, 9, C.cream, flat) +
    ellipse(39, 87, 8, 5, C.brown) + ellipse(57, 87, 8, 5, C.brown) +
    ellipse(48, 38, 22, 20, C.brown) + path('M28 26 C18 30 16 46 22 54 C30 50 32 38 32 30 Z', C.brownDark) + path('M68 26 C78 30 80 46 74 54 C66 50 64 38 64 30 Z', C.brownDark) +
    ellipse(48, 46, 12, 9, C.cream) + ellipse(48, 41, 5, 3.6, C.ink, flat) + path('M48 45 L48 49 M43 50 Q48 54 53 50', 'none', {'stroke-width': 2.4}) +
    eye(40, 34) + eye(56, 34) + path('M60 25 C64 22 68 24 68 28', 'none', {stroke: C.brownDark, 'stroke-width': 2.6}) +
    path('M45 52 Q48 60 51 52', C.coral, {'stroke-width': 2})));
}
function turtle() {
  const hexes = [[38, 48], [56, 48], [47, 38], [47, 58], [29, 58], [65, 58]].map(([x, y]) => polygon(star(x, y, 7, 7, 3, 0), C.leaf, {'stroke-width': 2}));
  return svg(96, 96, outline(ellipse(26, 72, 8, 6, C.leaf) + ellipse(66, 72, 8, 6, C.leaf) + tube('M14 62 L6 66', C.leaf, 5) +
    ellipse(80, 56, 12, 11, C.leaf) + eye(84, 52, 3.4) + smile(84, 60, 3, 2.4) + cheek(78, 60, 3, 2) +
    path('M14 66 C14 38 30 28 47 28 C64 28 80 38 80 66 Z', C.green) + hexes.join('') + path('M12 66 L82 66', 'none', {'stroke-width': 3})));
}
function rocket() {
  return svg(96, 96, outline(
    path('M40 78 C38 86 44 92 48 96 C52 92 58 86 56 78 Z', C.yellow) + path('M44 78 C44 84 46 88 48 90 C50 88 52 84 52 78 Z', C.orange, flat) +
    path('M34 56 L20 74 L34 72 Z', C.coral) + path('M62 56 L76 74 L62 72 Z', C.coral) +
    path('M48 4 C62 16 66 36 64 58 C64 68 62 76 60 80 L36 80 C34 76 32 68 32 58 C30 36 34 16 48 4 Z', C.cream) +
    path('M48 4 C56 10 60 18 62 24 L34 24 C36 18 40 10 48 4 Z', C.coral) + circle(48, 44, 9, C.blueLight) + circle(45, 41, 3, C.white, flat) +
    rect(44, 66, 8, 14, C.coral, {rx: 2})));
}

// ---------- Objetos ----------
function ball() {
  return svg(64, 64, outline(circle(32, 32, 26, C.blue) +
    path('M8 26 C22 32 42 32 56 22 L57 32 C42 42 22 42 7 34 Z', C.white, {'stroke-width': 2.4}) +
    path('M24 8 C30 22 30 42 22 58', 'none', {stroke: C.yellow, 'stroke-width': 5}) + circle(32, 32, 26, 'none') + circle(22, 16, 4, C.white, {...flat, opacity: 0.6})));
}
function starItem() {
  return svg(64, 64, outline(polygon(star(32, 34, 28, 13), C.yellow, {'stroke-width': 3.4}) + eye(26, 32, 3.2) + eye(38, 32, 3.2) + smile(32, 39, 4, 3) + cheek(21, 39, 3, 2) + cheek(43, 39, 3, 2)));
}
function heart() {
  return svg(64, 64, outline(path('M32 56 C18 46 6 36 6 22 C6 12 14 6 22 6 C27 6 30 9 32 13 C34 9 37 6 42 6 C50 6 58 12 58 22 C58 36 46 46 32 56 Z', C.coral) +
    ellipse(19, 20, 5, 7, C.white, {...flat, opacity: 0.55, transform: 'rotate(-30 19 20)'})));
}
function apple() {
  return svg(64, 64, outline(path('M32 14 C34 8 36 5 39 3', 'none', {stroke: C.brownDark, 'stroke-width': 3.4}) +
    path('M36 12 C42 4 52 4 56 8 C50 14 42 14 36 12 Z', C.leaf) +
    path('M32 18 C24 12 8 14 8 32 C8 48 20 60 28 60 C30 60 31 58 32 58 C33 58 34 60 36 60 C44 60 56 48 56 32 C56 14 40 12 32 18 Z', C.red) +
    ellipse(20, 30, 4, 7, C.white, {...flat, opacity: 0.5})));
}
function avocado() {
  return svg(64, 64, outline(path('M32 4 C42 4 46 16 48 26 C52 34 56 40 56 46 C56 56 46 62 32 62 C18 62 8 56 8 46 C8 40 12 34 16 26 C18 16 22 4 32 4 Z', C.greenDark) +
    path('M32 10 C39 10 42 20 43 28 C46 34 50 40 50 46 C50 53 42 57 32 57 C22 57 14 53 14 46 C14 40 18 34 21 28 C22 20 25 10 32 10 Z', C.mint, flat) +
    circle(32, 42, 10, C.brown) + circle(29, 39, 3, C.white, {...flat, opacity: 0.5}) + happyEye(26, 26, 2.6) + happyEye(38, 26, 2.6) + smile(32, 30, 3, 2.4)));
}
function basket() {
  const weave = [16, 28, 40, 52, 64].map(x => path(`M${x} 30 L${x - 2} 54`, 'none', {stroke: C.brownDark, 'stroke-width': 2.2})).join('');
  return svg(80, 60, outline(path('M14 26 C14 6 66 6 66 26', 'none', {stroke: C.brownDark, 'stroke-width': 5}) +
    path('M6 26 L74 26 L66 56 L14 56 Z', C.brown) + weave + path('M10 38 L70 38 M12 47 L68 47', 'none', {stroke: C.brownDark, 'stroke-width': 2.2}) +
    rect(4, 22, 72, 8, C.orangeDark, {rx: 4})));
}
function key() {
  return svg(64, 64, outline(el('g', {transform: 'rotate(-35 32 32)'},
    rect(28, 28, 32, 8, C.yellow, {rx: 3}) + rect(50, 34, 6, 10, C.yellow, {rx: 1.5}) + rect(42, 34, 5, 8, C.yellow, {rx: 1.5}) +
    circle(18, 32, 13, C.yellow) + circle(18, 32, 5, C.cream) + circle(13, 26, 2.6, C.white, {...flat, opacity: 0.7}))));
}
function coin() {
  return svg(64, 64, outline(circle(32, 32, 26, C.yellowDark) + circle(32, 32, 19, C.yellow, {'stroke-width': 2.4}) +
    polygon(star(32, 33, 11, 5), C.yellowDark, {'stroke-width': 2}) + path('M16 22 C20 14 26 11 32 11', 'none', {stroke: C.white, 'stroke-width': 3, opacity: 0.7})));
}
function wall() {
  const bricks = [];
  for (let row = 0; row < 4; row++) for (let column = -1; column < 3; column++) {
    const x = 4 + column * 28 + (row % 2 ? 14 : 0), y = 4 + row * 14, left = Math.max(4, x), right = Math.min(60, x + 28);
    if (right - left > 2) bricks.push(rect(left, y, right - left, 14, row % 2 ? C.coral : C.coralDark, {'stroke-width': 2.4}));
  }
  return svg(64, 64, outline(bricks.join('') + rect(4, 4, 56, 56, 'none')));
}

// ---------- Fondos (480×360, tonos suaves) ----------
const cloud = (x, y, s = 1) => ellipse(x, y, 34 * s, 16 * s, C.white, flat) + ellipse(x - 20 * s, y + 4 * s, 20 * s, 12 * s, C.white, flat) + ellipse(x + 22 * s, y + 5 * s, 22 * s, 11 * s, C.white, flat) + ellipse(x + 2 * s, y - 10 * s, 18 * s, 14 * s, C.white, flat);
function meadow() {
  const next = random(11), flowers = [];
  for (let index = 0; index < 18; index++) {
    const x = 20 + next() * 440, y = 270 + next() * 80, color = [C.white, C.yellow, C.pink][index % 3];
    flowers.push(circle(x, y, 4, color, flat) + circle(x, y, 1.6, C.yellowDark, flat));
  }
  return svg(480, 360, rect(0, 0, 480, 360, C.sky, flat) + circle(400, 70, 34, '#fbe7a1', flat) + cloud(110, 70) + cloud(300, 46, 0.8) +
    path('M0 230 C90 170 190 190 260 220 C330 190 420 170 480 200 L480 360 L0 360 Z', '#a8d8a2', flat) +
    path('M0 270 C120 240 260 250 480 268 L480 360 L0 360 Z', '#8ccb87', flat) + flowers.join(''));
}
function forest() {
  const trees = (count, base, height, color, seed) => {
    const next = random(seed); let out = '';
    for (let index = 0; index < count; index++) {
      const x = 10 + index * (480 / count) + next() * 20, h = height * (0.8 + next() * 0.4);
      out += rect(x - 5, base - 20, 10, 24, '#9b7653', flat) + polygon([x - h * 0.32, base - 16, x, base - h, x + h * 0.32, base - 16], color, flat);
    }
    return out;
  };
  return svg(480, 360, rect(0, 0, 480, 360, '#dcefe6', flat) + circle(80, 64, 26, '#fbe7a1', flat) + trees(9, 220, 150, '#a9cfae', 21) +
    rect(0, 220, 480, 140, '#b7dcb3', flat) + trees(6, 300, 200, '#6fae7a', 37) + rect(0, 296, 480, 64, '#8fc58c', flat) +
    ellipse(380, 330, 40, 10, '#7cb87b', flat) + ellipse(90, 340, 50, 10, '#7cb87b', flat));
}
function beach() {
  return svg(480, 360, rect(0, 0, 480, 360, C.sky, flat) + circle(380, 80, 40, '#fbe7a1', flat) + cloud(140, 60, 0.9) +
    rect(0, 170, 480, 90, C.water, flat) + path('M0 200 Q30 192 60 200 T120 200 T180 200 T240 200 T300 200 T360 200 T420 200 T480 200', 'none', {stroke: '#b7e1ee', 'stroke-width': 4}) +
    path('M0 230 Q30 222 60 230 T120 230 T180 230 T240 230 T300 230 T360 230 T420 230 T480 230', 'none', {stroke: '#b7e1ee', 'stroke-width': 4}) +
    path('M0 250 C120 236 300 244 480 236 L480 360 L0 360 Z', C.sand, flat) +
    path('M70 330 C66 290 64 250 76 200', 'none', {stroke: '#a77d55', 'stroke-width': 12, 'stroke-linecap': 'round'}) +
    path('M76 200 C56 186 34 190 20 204 C40 200 58 202 76 200 Z M76 200 C92 182 116 182 130 196 C110 194 92 196 76 200 Z M76 200 C70 178 52 168 36 170 C52 178 64 188 76 200 Z M76 200 C88 178 104 168 122 168 C106 178 92 188 76 200 Z', '#5fae6e', flat) +
    line(350, 330, 362, 236, {stroke: '#8d6447', 'stroke-width': 5, 'stroke-linecap': 'round'}) + ellipse(352, 334, 40, 7, '#e9cf98', flat) +
    path('M300 252 C314 210 400 204 424 236 Z', C.coral, flat) + path('M334 244 C344 218 372 214 384 238 Z', '#fff9ed', flat) + path('M352 244 C356 226 364 222 370 240 Z', C.coral, flat));
}
function space() {
  const next = random(5), stars = [];
  for (let index = 0; index < 60; index++) stars.push(circle(next() * 480, next() * 360, 0.8 + next() * 1.8, index % 7 ? '#ffffff' : '#fbe7a1', {...flat, opacity: 0.55 + next() * 0.45}));
  return svg(480, 360, rect(0, 0, 480, 360, '#22305a', flat) + stars.join('') + circle(110, 90, 34, '#e7e3f6', flat) + circle(100, 80, 6, '#cfc9ea', flat) + circle(122, 104, 9, '#cfc9ea', flat) +
    ellipse(370, 250, 70, 18, 'none', {stroke: '#f6c98a', 'stroke-width': 7, opacity: 0.9}) + circle(370, 250, 46, '#8a7bd1', flat) +
    path('M330 236 C350 230 390 230 410 238', 'none', {stroke: '#a597e0', 'stroke-width': 8, 'stroke-linecap': 'round'}) +
    path('M300 250 A70 18 0 0 0 440 250', 'none', {stroke: '#f6c98a', 'stroke-width': 7, opacity: 0.9}));
}
function colorfulStreet() {
  const colors = ['#f6c98a', '#9cc8e8', '#f4a6b8', '#b9e3bb', '#f8d77a', '#c9b6ea'];
  let houses = '';
  for (let index = 0; index < 6; index++) {
    const x = index * 80, top = 120 + (index % 2) * 16;
    houses += rect(x, top, 80, 200 - top + 60, colors[index], flat) + rect(x, top - 10, 80, 12, '#d9876a', flat) +
      path(`M${x + 28} 260 L${x + 28} 232 A12 12 0 0 1 ${x + 52} 232 L${x + 52} 260 Z`, '#8d6447', flat) +
      rect(x + 14, top + 26, 18, 22, '#ffffff', {...flat, opacity: 0.85}) + rect(x + 48, top + 26, 18, 22, '#ffffff', {...flat, opacity: 0.85}) +
      line(x + 23, top + 26, x + 23, top + 48, {stroke: '#ffffff'}) + rect(x, top + 70, 80, 4, '#ffffff', {...flat, opacity: 0.5});
  }
  return svg(480, 360, rect(0, 0, 480, 360, C.sky, flat) + path('M150 120 L240 30 L330 120 Z', '#b9c7d6', flat) + path('M222 48 L240 30 L258 48 L248 54 L240 46 L232 54 Z', '#ffffff', {...flat, opacity: 0.8}) +
    houses + rect(0, 260, 480, 100, '#cdbfae', flat) +
    [0, 1, 2, 3].map(row => path(`M0 ${276 + row * 22} L480 ${276 + row * 22}`, 'none', {stroke: '#b8a996', 'stroke-width': 2})).join(''));
}
function lakeVolcanoes() {
  return svg(480, 360, rect(0, 0, 480, 360, '#d6ecf5', flat) + cloud(400, 60, 0.7) +
    path('M-20 230 L110 70 C116 64 124 64 130 70 L240 200 Z', '#9fb7c9', flat) + path('M96 88 L110 70 C116 64 124 64 130 70 L142 84 L128 80 L120 88 L110 82 Z', '#ffffff', {...flat, opacity: 0.85}) +
    path('M150 230 L260 110 C266 104 274 104 280 110 L400 230 Z', '#8fa9bd', flat) + path('M248 124 L260 110 C266 104 274 104 280 110 L292 124 L280 120 L270 128 L260 120 Z', '#ffffff', {...flat, opacity: 0.85}) +
    path('M300 230 L390 130 C394 126 400 126 404 130 L500 230 Z', '#a7bfcf', flat) +
    path('M0 220 C100 210 200 214 480 210 L480 300 L0 300 Z', '#7fb9d6', flat) +
    path('M40 250 L160 250 M220 268 L360 268 M100 284 L190 284', 'none', {stroke: '#b2d8ea', 'stroke-width': 4, 'stroke-linecap': 'round'}) +
    path('M0 296 C140 284 320 292 480 286 L480 360 L0 360 Z', '#8fc58c', flat) +
    path('M340 250 L384 250 L376 260 L348 260 Z', '#b9824f', flat) + path('M362 250 L362 226 L378 248 Z', '#fff9ed', flat));
}
function underwater() {
  const next = random(17), bubbles = [];
  for (let index = 0; index < 14; index++) bubbles.push(circle(30 + next() * 420, 30 + next() * 220, 3 + next() * 7, 'none', {stroke: '#e3f5fb', 'stroke-width': 2, opacity: 0.8}));
  const weed = (x, h, color) => path(`M${x} 330 C${x - 14} ${330 - h * 0.3} ${x + 14} ${330 - h * 0.6} ${x} ${330 - h}`, 'none', {stroke: color, 'stroke-width': 9, 'stroke-linecap': 'round'});
  return svg(480, 360, rect(0, 0, 480, 360, '#8fd0e6', flat) + rect(0, 0, 480, 120, '#a9dcee', flat) +
    path('M0 40 L60 360 M120 0 L170 360 M260 0 L290 360', 'none', {stroke: '#bfe6f3', 'stroke-width': 26, opacity: 0.35}) + bubbles.join('') +
    weed(60, 120, '#5fae6e') + weed(84, 80, '#78bf7d') + weed(400, 140, '#5fae6e') + weed(424, 90, '#78bf7d') +
    path('M0 320 C120 300 360 312 480 300 L480 360 L0 360 Z', C.sand, flat) +
    ellipse(200, 330, 44, 18, '#b9c2c9', flat) + ellipse(300, 336, 28, 12, '#a6b0b8', flat) +
    path('M150 318 C152 300 160 296 164 308 C168 296 176 300 176 318 Z', '#f4a6b8', flat));
}
function theater() {
  const folds = x => [0, 1, 2].map(index => path(`M${x + 14 + index * 26} 20 C${x + 6 + index * 26} 140 ${x + 22 + index * 26} 220 ${x + 12 + index * 26} 300`, 'none', {stroke: '#a83f30', 'stroke-width': 4, opacity: 0.7})).join('');
  return svg(480, 360, rect(0, 0, 480, 360, '#5b4a7a', flat) + path('M150 26 L330 26 L420 296 L60 296 Z', '#6c5a8e', {...flat, opacity: 0.6}) + ellipse(240, 316, 150, 22, '#f6e3b0', {...flat, opacity: 0.4}) +
    rect(0, 290, 480, 70, '#c9965f', flat) + [304, 322, 340].map(y => path(`M0 ${y} L480 ${y}`, 'none', {stroke: '#b07f4b', 'stroke-width': 2})).join('') +
    path('M0 0 L110 0 C96 120 104 220 80 300 L0 300 Z', '#d2503d', flat) + folds(0) + path('M480 0 L370 0 C384 120 376 220 400 300 L480 300 Z', '#d2503d', flat) + folds(390) +
    rect(0, 0, 480, 26, '#b8402f', flat) + path('M0 26 Q30 46 60 26 T120 26 T180 26 T240 26 T300 26 T360 26 T420 26 T480 26', '#d2503d', flat));
}

// ---------- Sonidos (PCM16 mono 22 050 Hz) ----------
const rate = 22050;
function wav(samples) {
  const fade = Math.round(rate * 0.006), peak = samples.reduce((max, value) => Math.max(max, Math.abs(value)), 0) || 1;
  const output = new Uint8Array(44 + samples.length * 2), view = new DataView(output.buffer);
  const put = (offset, text) => { for (let index = 0; index < text.length; index++) output[offset + index] = text.charCodeAt(index); };
  put(0, 'RIFF'); view.setUint32(4, output.length - 8, true); put(8, 'WAVE'); put(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); put(36, 'data'); view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index++) {
    const ramp = Math.min(1, index / fade, (samples.length - 1 - index) / fade);
    view.setInt16(44 + index * 2, Math.round(samples[index] / peak * 0.6 * ramp * 32767), true);
  }
  return output;
}
function render(seconds, sample) { const result = new Array(Math.round(rate * seconds)); for (let index = 0; index < result.length; index++) result[index] = sample(index / rate, index); return result; }
// Osciladores con acumulador de fase para barridos sin saltos.
function sweep(seconds, frequency, shape = Math.sin, envelope = () => 1) {
  let phase = 0;
  return render(seconds, time => { phase += 2 * Math.PI * frequency(time) / rate; return shape(phase) * envelope(time); });
}
const triangle = phase => 2 / Math.PI * Math.asin(Math.sin(phase));
const softSquare = phase => Math.sin(phase) + Math.sin(3 * phase) / 3 + Math.sin(5 * phase) / 5;
const decay = rateValue => time => Math.exp(-time * rateValue);
function notes(list, shape = triangle) {
  const result = [];
  for (const [frequency, seconds, release = 6] of list) result.push(...sweep(seconds, () => frequency, shape, time => Math.min(1, time / 0.01) * Math.exp(-time * release)));
  return result;
}
function noise(seed) { const next = random(seed); return () => next() * 2 - 1; }
const sounds = {
  salto: () => sweep(0.38, time => 220 + 900 * time + 40 * Math.sin(time * 60), Math.sin, decay(5)),
  moneda: () => notes([[988, 0.08, 4], [1319, 0.4, 7]], softSquare),
  pop: () => sweep(0.14, time => 900 * Math.exp(-time * 22) + 180, Math.sin, decay(26)),
  campana: () => render(1.2, time => [[1, 1], [2, 0.5], [2.76, 0.35], [5.4, 0.18]].reduce((sum, [ratio, amplitude]) => sum + amplitude * Math.sin(2 * Math.PI * 880 * ratio * time) * Math.exp(-time * (2.6 + ratio)), 0)),
  tambor: () => {
    const hit = noise(7), body = sweep(0.5, time => 50 + 110 * Math.exp(-time * 18), Math.sin, decay(8));
    return body.map((value, index) => value + (index < rate * 0.04 ? hit() * 0.5 * (1 - index / (rate * 0.04)) : 0));
  },
  victoria: () => notes([[523.25, 0.12], [659.25, 0.12], [783.99, 0.12], [1046.5, 0.5, 3.5]]),
  ups: () => [...sweep(0.18, time => 392 - 30 * time, triangle, time => Math.min(1, time / 0.01) * Math.exp(-time * 4)), ...sweep(0.42, time => 294 - 50 * time, triangle, time => Math.min(1, time / 0.01) * Math.exp(-time * 4))],
  laser: () => sweep(0.32, time => 1800 * Math.exp(-time * 7) + 160, softSquare, decay(6)),
  clic: () => { const hit = noise(3); return render(0.06, time => (hit() * 0.6 + Math.sin(2 * Math.PI * 2200 * time)) * Math.exp(-time * 90)); },
  burbujas: () => {
    const result = new Array(Math.round(rate * 0.9)).fill(0), next = random(29);
    for (let index = 0; index < 6; index++) {
      const start = Math.round(rate * (0.04 + index * 0.13 + next() * 0.04)), base = 350 + next() * 300;
      const blip = sweep(0.08, time => base + 2600 * time, Math.sin, decay(30));
      for (let offset = 0; offset < blip.length && start + offset < result.length; offset++) result[start + offset] += blip[offset];
    }
    return result;
  }
};

// ---------- Catálogo ----------
export const starterLibraryDefinitions = Object.freeze([
  ['gato', 'costume', 'Gato', 'personaje', () => cat(false)], ['gato-saltando', 'costume', 'Gato saltando', 'personaje', () => cat(true)],
  ['quetzal', 'costume', 'Quetzal', 'personaje', () => quetzal(false)], ['quetzal-volando', 'costume', 'Quetzal volando', 'personaje', () => quetzal(true)],
  ['robot', 'costume', 'Robot', 'personaje', () => robot(false)], ['robot-saludando', 'costume', 'Robot saludando', 'personaje', () => robot(true)],
  ['pez', 'costume', 'Pez', 'personaje', () => fish(false)], ['pez-nadando', 'costume', 'Pez nadando', 'personaje', () => fish(true)],
  ['perro', 'costume', 'Perro', 'personaje', dog], ['tortuga', 'costume', 'Tortuga', 'personaje', turtle], ['cohete', 'costume', 'Cohete', 'personaje', rocket],
  ['pelota', 'costume', 'Pelota', 'objeto', ball], ['estrella', 'costume', 'Estrella', 'objeto', starItem], ['corazon', 'costume', 'Corazón', 'objeto', heart],
  ['manzana', 'costume', 'Manzana', 'objeto', apple], ['aguacate', 'costume', 'Aguacate', 'objeto', avocado], ['cesta', 'costume', 'Cesta', 'objeto', basket],
  ['llave', 'costume', 'Llave', 'objeto', key], ['moneda', 'costume', 'Moneda', 'objeto', coin], ['muro', 'costume', 'Muro', 'objeto', wall],
  ['pradera', 'backdrop', 'Pradera', null, meadow], ['bosque', 'backdrop', 'Bosque', null, forest], ['playa', 'backdrop', 'Playa', null, beach],
  ['espacio', 'backdrop', 'Espacio', null, space], ['calle-de-colores', 'backdrop', 'Calle de colores', null, colorfulStreet],
  ['lago-y-volcanes', 'backdrop', 'Lago y volcanes', null, lakeVolcanoes], ['fondo-del-mar', 'backdrop', 'Fondo del mar', null, underwater], ['teatro', 'backdrop', 'Teatro', null, theater],
  ['sonido-salto', 'sound', 'Salto', null, sounds.salto], ['sonido-moneda', 'sound', 'Moneda', null, sounds.moneda], ['sonido-pop', 'sound', 'Pop', null, sounds.pop],
  ['sonido-campana', 'sound', 'Campana', null, sounds.campana], ['sonido-tambor', 'sound', 'Tambor', null, sounds.tambor], ['sonido-victoria', 'sound', 'Victoria', null, sounds.victoria],
  ['sonido-ups', 'sound', 'Ups', null, sounds.ups], ['sonido-laser', 'sound', 'Láser', null, sounds.laser], ['sonido-clic', 'sound', 'Clic', null, sounds.clic],
  ['sonido-burbujas', 'sound', 'Burbujas', null, sounds.burbujas]
].map(([id, kind, name, category, draw]) => Object.freeze({id, kind, name, category, draw})));

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function buildStarterLibrary() {
  const entries = starterLibraryDefinitions.map(({id, kind, name, category, draw}) => {
    if (kind === 'sound') {
      const bytes = wav(draw()), info = inspectWavPcm16(bytes);
      return {id, kind, name, format: 'wav', bytes: bytes.length, sha256: sha256(bytes), sampleRate: info.sampleRate, frames: info.frames, data: Buffer.from(bytes).toString('base64')};
    }
    const media = sanitizeSvg(new TextEncoder().encode(draw()));
    if (sanitizeSvg(media.bytes).bytes.length !== media.bytes.length) throw new Error('SVG no idempotente: ' + id);
    return {id, kind, name, ...(category ? {category} : {}), format: 'svg', bytes: media.bytes.length, sha256: sha256(media.bytes),
      width: media.width, height: media.height, centerX: media.width / 2, centerY: media.height / 2, data: Buffer.from(media.bytes).toString('base64')};
  });
  const bundle = {format: 'gg-starter-library', schemaVersion: 1, version: starterLibraryVersion, license: starterLibraryLicense,
    licenseUrl: starterLibraryLicenseUrl, attribution: starterLibraryAttribution, entries};
  const bytes = Buffer.from(JSON.stringify(bundle));
  return {bundle, bytes, sha256: sha256(bytes)};
}
export function starterLibraryLock(built = buildStarterLibrary()) {
  return {format: 'gg-starter-library-lock', schemaVersion: 1, version: starterLibraryVersion, license: starterLibraryLicense,
    attribution: starterLibraryAttribution, bundle: {bytes: built.bytes.length, sha256: built.sha256},
    counts: Object.fromEntries(['costume', 'backdrop', 'sound'].map(kind => [kind, built.bundle.entries.filter(entry => entry.kind === kind).length])),
    entries: built.bundle.entries.map(({id, kind, name, format, bytes, sha256: hash}) => ({id, kind, name, format, bytes, sha256: hash}))};
}
export function readStarterLibraryLock() { return JSON.parse(readFileSync(lockPath, 'utf8')); }

// Envolvente mínima/máxima por columna para revisar los sonidos sin escucharlos.
function waveform(entry) {
  const bytes = Buffer.from(entry.data, 'base64'), samples = (bytes.length - 44) / 2, columns = 120, points = [];
  for (let column = 0; column < columns; column++) {
    let low = 0, high = 0;
    for (let index = Math.floor(column * samples / columns); index < Math.floor((column + 1) * samples / columns); index++) {
      const value = bytes.readInt16LE(44 + index * 2) / 32768; low = Math.min(low, value); high = Math.max(high, value);
    }
    points.push(`M${column} ${n(20 - high * 20)} L${column} ${n(20 - low * 20 + 0.5)}`);
  }
  return `<svg width="120" height="40" viewBox="0 0 120 40" role="img" aria-label="Forma de onda"><path d="${points.join(' ')}" stroke="#236146" stroke-width="1"/></svg>`;
}
function contactSheet(built) {
  const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
  const section = (title, kind, size) => `<h2>${title}</h2><div class="grid ${kind}">` + built.bundle.entries.filter(entry => entry.kind === kind).map(entry => {
    if (kind === 'sound') return `<figure class="sound"><b>${escape(entry.name)}</b>${waveform(entry)}<figcaption>${escape(entry.id)} · ${(entry.frames / entry.sampleRate).toFixed(2)} s · ${entry.bytes} B</figcaption></figure>`;
    const source = 'data:image/svg+xml;base64,' + entry.data;
    return `<figure><div class="frame"><img src="${source}" alt="${escape(entry.name)}" style="width:${size(entry)}px"></div><figcaption><b>${escape(entry.name)}</b> · ${entry.width}×${entry.height} · ${entry.bytes} B</figcaption></figure>`;
  }).join('') + '</div>';
  const stage = built.bundle.entries.find(entry => entry.id === 'pradera'), onStage = ['gato', 'quetzal-volando', 'robot-saludando', 'manzana', 'cesta', 'estrella'];
  const composed = `<h2>A tamaño de escenario (480×360, 1:1)</h2><div class="stage"><img src="data:image/svg+xml;base64,${stage.data}" alt="">` +
    onStage.map((id, index) => { const entry = built.bundle.entries.find(item => item.id === id); return `<img class="sprite" src="data:image/svg+xml;base64,${entry.data}" style="left:${30 + index * 74}px;top:${210 - (index % 2) * 40}px;width:${entry.width}px" alt="">`; }).join('') + '</div>';
  return `<!doctype html><html lang="es"><meta charset="utf-8"><title>Biblioteca inicial · hoja de contacto</title><style>
body{font:14px system-ui,sans-serif;color:#263c37;background:#f2f5f2;margin:24px}h1{font-size:18px}h2{font-size:16px;margin-top:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}.grid.backdrop{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
figure{margin:0;background:#fff;border:1px solid #c6d4cb;border-radius:6px;padding:8px}.frame{display:grid;place-items:center;height:120px;background:#f8faf9}
.backdrop .frame{height:auto}.backdrop img{width:100%!important}figcaption{font-size:12px;margin-top:6px}.sound .wave{display:block;font-weight:700;padding:16px 0}
.stage{position:relative;width:480px;height:360px;border:1px solid #c6d4cb}.stage img{position:absolute;left:0;top:0}.stage .sprite{position:absolute}
</style><h1>Biblioteca inicial · v${built.bundle.version} · ${built.bundle.license}</h1><p>${escape(built.bundle.attribution)} Paquete: ${built.bytes.length} bytes · SHA-256 ${built.sha256}</p>` +
    section('Disfraces · personajes y objetos (tamaño ×1.2)', 'costume', entry => Math.round(entry.width * 1.2)) + section('Fondos', 'backdrop', () => 250) + section('Sonidos', 'sound') + composed + '</html>';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, target] = process.argv.slice(2), built = buildStarterLibrary();
  if (command === '--write-lock') writeFileSync(lockPath, JSON.stringify(starterLibraryLock(built), null, 2) + '\n');
  else if (command === '--check') {
    if (JSON.stringify(readStarterLibraryLock()) !== JSON.stringify(starterLibraryLock(built))) { console.error('La biblioteca generada no coincide con starter-library.lock.json'); process.exitCode = 1; }
    else console.log('Biblioteca reproducida: ' + built.sha256);
  } else if (command === '--out' && target) { mkdirSync(dirname(resolve(target)), {recursive: true}); writeFileSync(resolve(target), built.bytes); }
  else if (command === '--contact-sheet' && target) { mkdirSync(resolve(target), {recursive: true}); writeFileSync(resolve(target, 'contact-sheet.html'), contactSheet(built)); }
  else throw new Error('Uso: starter-library.mjs --check | --write-lock | --out <archivo> | --contact-sheet <carpeta>');
  if (command !== '--check') console.log(`Biblioteca ${built.bundle.entries.length} entradas · ${built.bytes.length} bytes · ${built.sha256}`);
}
