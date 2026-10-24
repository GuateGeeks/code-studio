import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {sanitizeSvg, svgLimits} from '../../src/contracts/media-svg.mjs';
const bytes = text => new TextEncoder().encode(text);
const svg = body => '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">' + body + '</svg>';
test('GG-MEDIA-SVG: existing reviewed images and passive geometry normalize idempotently without DOM', async () => {
  for (const name of ['hero.svg', 'hero-alt.svg', 'stage.svg']) {
    const original = new Uint8Array(await readFile(new URL('../../src/assets/' + name, import.meta.url)));
    const before = original.slice(), result = sanitizeSvg(original);
    assert.deepEqual(sanitizeSvg(result.bytes).bytes, result.bytes); assert.deepEqual(original, before);
    assert.equal(result.viewBox.length, 4); assert.ok(result.width <= 1024);
  }
  const result = sanitizeSvg(bytes(svg('<g transform="translate(2,3) rotate(30) scale(.5)"><path d="M1 2 l3-1 H8 v4 C1 2 3 4 5 6 q1 1 2 2 t2 2 A2 3 45 0 1 4 4z" fill="none" stroke="#AbC"/><polygon points="0,0 10,0 5,10"/><polyline points="0 0 10 10"/><line x1="0" y1="0" x2="2" y2="3"/><ellipse rx="3" ry="2"/></g>')));
  assert.deepEqual(result.viewBox, [0, 0, 48, 48]); assert.deepEqual(sanitizeSvg(result.bytes).bytes, result.bytes);
  assert.equal(sanitizeSvg(bytes('<svg viewBox="0 0 20 30"/>')).height, 30);
});
test('GG-MEDIA-SVG: active content, references, entities and alternate XML syntax fail closed', () => {
  const bodies = ['<script>alert(1)</script>', '<foreignObject/>', '<image href="https://example.com/a"/>', '<use href="#a"/>', '<defs/>', '<text>hello</text>', '<style/>', '<animate/>',
    '<rect width="1" height="1" onclick="x()"/>', '<path d="M0 0" fill="url(#x)"/>', '<g style="fill:red"/>', '<g xmlns:xlink="http://www.w3.org/1999/xlink"/>', '<g transform="url(https://x)"/>', '<svg width="1" height="1"/>', '<g><circle r="1"/></path>', '<rect width="1" width="2" height="1"/>'];
  for (const body of bodies) assert.throws(() => sanitizeSvg(bytes(svg(body))), /SVG:/, body);
  for (const source of ['<!DOCTYPE svg [<!ENTITY x "x">]>' + svg(''), '<?xml version="1.0"?>' + svg(''), svg('<!-- x -->'), svg('&#60;script/>'), svg('') + svg(''), '<svg:svg/>', '<svg width=48 height="48"/>']) assert.throws(() => sanitizeSvg(bytes(source)), /SVG:/);
  assert.throws(() => sanitizeSvg(Uint8Array.of(0xff)), /UTF-8/);
});
test('GG-MEDIA-SVG: path grammar, numeric bounds, cumulative transforms and complexity are enforced', () => {
  const invalid = ['L0 0', 'M0', 'M0 0 C1 2', 'M0 0 A1 2 0 2 0 2 2', 'M0 0 A-1 2 0 0 0 2 2', 'M0 0 Z1', 'M0 0 R1 1', 'M1e999 0', 'M16385 0', 'm16384 0 l1 0', 'M0,,0', 'M,0 0'];
  for (const d of invalid) assert.throws(() => sanitizeSvg(bytes(svg('<path d="' + d + '"/>'))), /SVG:/, d);
  assert.throws(() => sanitizeSvg(bytes(svg('<path d="M0 0 ' + 'L1 1 '.repeat(svgLimits.pathCommands) + '"/>'))), /excesivo/);
  assert.throws(() => sanitizeSvg(bytes(svg('<path d="M0 0 ' + '1 1 '.repeat(svgLimits.pathCommands) + '"/>'))), /excesivo/);
  const repeatedTransform = 'matrix(1 0 0 1 0 0) '.repeat(16).trim();
  assert.throws(() => sanitizeSvg(bytes(svg(('<g transform="' + repeatedTransform + '"/>').repeat(175)))), /demasiados números/);
  assert.throws(() => sanitizeSvg(bytes(svg('<g>'.repeat(17) + '</g>'.repeat(17)))), /nodo/);
  assert.throws(() => sanitizeSvg(bytes(svg('<g transform="scale(16)">'.repeat(5) + '</g>'.repeat(5)))), /transformación acumulada/);
  for (const source of ['<svg width="1025" height="1"/>', '<svg width="2%" height="1"/>', '<svg viewBox="0 0 0 2"/>', svg('<circle r="-1"/>'), svg('<g transform="scale(17)"/>')]) assert.throws(() => sanitizeSvg(bytes(source)), /SVG:/);
});
