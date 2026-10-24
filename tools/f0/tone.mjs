// Original deterministic audio fixture: 440 Hz PCM16 mono, 1.2 s, 10 ms ramps.
export function createTone() {
  const rate = 22050;
  const sampleCount = Math.round(rate * 1.2);
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(sampleCount * 2, 40);
  for (let i = 0; i < sampleCount; i++) {
    const ramp = Math.min(1, i / (rate * 0.01), (sampleCount - 1 - i) / (rate * 0.01));
    buffer.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / rate) * 0.25 * ramp * 32767), 44 + i * 2);
  }
  return {buffer, rate, sampleCount};
}
