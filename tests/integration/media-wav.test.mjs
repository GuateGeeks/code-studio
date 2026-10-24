import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectWavPcm16, editWavPcm16} from '../../src/contracts/media-wav.mjs';
function wav(samples, {channels = 1, rate = 8000} = {}) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write('RIFF'); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(channels, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * channels * 2, 28);
  bytes.writeUInt16LE(channels * 2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => bytes.writeInt16LE(sample, 44 + index * 2)); return bytes;
}
function samples(result) {
  const info = inspectWavPcm16(result.bytes), data = new DataView(result.bytes.buffer, result.bytes.byteOffset, result.bytes.byteLength);
  return Array.from({length: info.frames * info.channels}, (_, index) => data.getInt16(info.dataOffset + index * 2, true));
}
test('GG-MEDIA-WAV: PCM16 samples survive canonicalization and frame crop is end-exclusive for stereo', () => {
  const original = wav([-32768, 32767, -1, 1, 16000, -16000], {channels: 2}); const before = original.slice();
  assert.deepEqual(inspectWavPcm16(original), {channels: 2, sampleRate: 8000, frames: 3, duration: 3 / 8000, dataOffset: 44, dataBytes: 12});
  const same = editWavPcm16(original); assert.deepEqual(Buffer.from(same.bytes), original); assert.equal(same.clippedFrames, 0);
  const crop = editWavPcm16(original, {startFrame: 1, endFrame: 3}); assert.deepEqual(samples(crop), [-1, 1, 16000, -16000]); assert.equal(crop.frames, 2);
  assert.deepEqual(original, before); crop.bytes[44] ^= 1; assert.deepEqual(original, before);
});
test('GG-MEDIA-WAV: gain uses known samples, counts clipped frames once per stereo frame and permits silence', () => {
  const original = wav([-32768, 32767, -1, 1, 16000, -16000], {channels: 2});
  const gained = editWavPcm16(original, {gain: 2});
  assert.deepEqual(samples(gained), [-32768, 32767, -2, 2, 32000, -32000]); assert.equal(gained.clippedFrames, 1);
  assert.deepEqual(samples(editWavPcm16(original, {gain: 0})), [0, 0, 0, 0, 0, 0]);
  assert.deepEqual(samples(editWavPcm16(wav([-3, -1, 1, 3]), {gain: 0.5})), [-1, 0, 1, 2]);
});
test('GG-MEDIA-WAV: encoding, RIFF lengths, alignment, duplicate data and decoded duration fail before use', () => {
  const format = wav([1]); format.writeUInt16LE(3, 20);
  const bits = wav([1]); bits.writeUInt16LE(8, 34);
  const align = wav([1]); align.writeUInt16LE(3, 32);
  const lengths = wav([1]); lengths.writeUInt32LE(10000, 40);
  const byteRate = wav([1]); byteRate.writeUInt32LE(1, 28);
  const duplicate = Buffer.concat([wav([1]), Buffer.from('data'), Buffer.from([2, 0, 0, 0, 0, 0])]); duplicate.writeUInt32LE(duplicate.length - 8, 4);
  const duration = wav(Array(16001).fill(0));
  for (const input of [format, bits, align, lengths, byteRate, duplicate, duration, wav([1], {rate: 7999}), wav([1], {rate: 48001}), wav([1], {channels: 3}), new Uint8Array(131073)]) assert.throws(() => inspectWavPcm16(input), /WAV:/);
  assert.equal(inspectWavPcm16(wav(Array(16000).fill(0))).duration, 2);
});
test('GG-MEDIA-WAV: edit options reject empty/outside/fractional frames and nonfinite or excessive gain', () => {
  const original = wav([100, -100, 300]);
  for (const options of [{startFrame: 2, endFrame: 2}, {startFrame: -1}, {endFrame: 4}, {startFrame: 0.5}, {gain: NaN}, {gain: Infinity}, {gain: -1}, {gain: 4.01}, {gain: '2'}, {extra: true}, null]) assert.throws(() => editWavPcm16(original, options), /WAV:/);
});
