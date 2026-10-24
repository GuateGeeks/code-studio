import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync, inflateSync} from 'node:zlib';
import {sanitizePngContainer} from '../../src/contracts/media-png.mjs';
import {crc32} from '../../src/contracts/sb3-archive.mjs';
import {validateCrop} from '../../src/contracts/image-edits.mjs';
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function chunk(type, payload = Buffer.alloc(0)) {
  const bytes = Buffer.alloc(12 + payload.length); bytes.writeUInt32BE(payload.length); bytes.write(type, 4, 'ascii'); Buffer.from(payload).copy(bytes, 8);
  bytes.writeUInt32BE(crc32(bytes.subarray(4, -4)), bytes.length - 4); return bytes;
}
function header({width = 2, height = 2, depth = 8, color = 6, interlace = 0} = {}) {
  const result = Buffer.alloc(13); result.writeUInt32BE(width); result.writeUInt32BE(height, 4); result[8] = depth; result[9] = color; result[12] = interlace; return chunk('IHDR', result);
}
function png({width = 2, height = 2, color = 6, depth = 8, interlace = 0, before = [], after = [], idat} = {}) {
  const channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color] ?? 4;
  const scanlines = Buffer.alloc((width * channels + 1) * height);
  return Buffer.concat([signature, header({width, height, color, depth, interlace}), ...before,
    chunk('IDAT', idat ?? deflateSync(scanlines)), ...after, chunk('IEND')]);
}
test('GG-MEDIA-PNG: CRC/order-checked bit8 containers expose exact scanline budget and strip decoder metadata', () => {
  for (const color of [0, 2, 3, 4, 6]) {
    const before = color === 3 ? [chunk('PLTE', Buffer.from([255, 0, 0])), chunk('tRNS', Buffer.of(100))] : [];
    const original = png({color, before: [...before, chunk('iCCP', Buffer.from('not a trusted compressed profile'))]});
    const preserved = original.slice(), result = sanitizePngContainer(original);
    assert.equal(result.width, 2); assert.equal(result.height, 2); assert.equal(result.bitDepth, 8);
    assert.equal(inflateSync(result.idat).length, result.expectedInflatedBytes);
    assert.equal(result.expectedInflatedBytes, (result.rowBytes + 1) * 2);
    assert.equal(Buffer.from(result.bytes).includes(Buffer.from('iCCP')), false);
    assert.deepEqual(sanitizePngContainer(result.bytes).bytes, result.bytes);
    result.idat[0] ^= 1; assert.deepEqual(original, preserved);
  }
});
test('GG-MEDIA-PNG: corrupt CRC, oversized dimensions, unsupported depth/interlace and critical chunks fail', () => {
  const corrupt = png(); corrupt[30] ^= 1;
  const trailing = Buffer.concat([png(), Buffer.of(0)]);
  const cases = [corrupt, trailing, png().subarray(0, -1), png({width: 1025}), png({depth: 16}), png({interlace: 1}),
    png({before: [chunk('NOPE')]}), png({before: [chunk('acTL', Buffer.alloc(8))]}),
    Buffer.concat([signature, header(), header(), chunk('IDAT', deflateSync(Buffer.alloc(18))), chunk('IEND')]),
    Buffer.concat([signature, chunk('IDAT', Buffer.of(0)), header(), chunk('IEND')])];
  for (const bytes of cases) assert.throws(() => sanitizePngContainer(bytes), /PNG:/);
});
test('GG-MEDIA-PNG: palette, transparency and contiguous IDAT constraints cannot be bypassed with metadata', () => {
  const cases = [png({color: 3}), png({color: 0, before: [chunk('PLTE', Buffer.of(0, 0, 0))]}),
    png({color: 6, before: [chunk('tRNS', Buffer.of(0))]}),
    png({color: 3, before: [chunk('PLTE', Buffer.of(0, 0, 0)), chunk('tRNS', Buffer.of(0, 1))]}),
    png({before: [chunk('PLTE', Buffer.of(0, 0, 0)), chunk('PLTE', Buffer.of(0, 0, 0))]}),
    png({after: [chunk('tEXt', Buffer.from('x')), chunk('IDAT', Buffer.of(0))]})];
  for (const bytes of cases) assert.throws(() => sanitizePngContainer(bytes), /PNG:/);
});
test('GG-MEDIA-PNG: preflight never claims zlib validation; target receives the strict expected output budget', () => {
  const lying = sanitizePngContainer(png({idat: deflateSync(Buffer.alloc(65536))}));
  assert.equal(lying.expectedInflatedBytes, 18);
  assert.equal(inflateSync(lying.idat).length, 65536);
  assert.equal(Object.hasOwn(lying, 'decoded'), false);
  // The target must reject this before createImageBitmap; no decoder or DOM is
  // invoked by this contract. Its isolated streaming tests cover the quota.
});
test('GG-MEDIA-CROP: integer rectangles are detached and must remain entirely inside the original pixels', () => {
  const rect = {x: 2, y: 1, width: 3, height: 4};
  const copy = validateCrop({width: 5, height: 5}, rect); copy.x = 0; assert.equal(rect.x, 2);
  assert.deepEqual(validateCrop({width: 1024, height: 1024}, {x: 0, y: 0, width: 1024, height: 1024}), {x: 0, y: 0, width: 1024, height: 1024});
  for (const bad of [{x: -1, y: 0, width: 1, height: 1}, {x: 4, y: 4, width: 2, height: 1}, {x: 0.5, y: 0, width: 1, height: 1}, {x: 0, y: 0, width: 0, height: 1}, {x: 0, y: 0, width: 1, height: Infinity}, {...rect, extra: true}]) assert.throws(() => validateCrop({width: 5, height: 5}, bad), /Recorte:/);
});
