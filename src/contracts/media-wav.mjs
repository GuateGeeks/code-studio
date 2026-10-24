export const wavLimits = Object.freeze({bytes: 131072, channels: 2, minimumRate: 8000, maximumRate: 48000, seconds: 2, chunks: 64, maximumGain: 4});
const fail = message => { throw new Error('WAV: ' + message); };
function byteArray(input) {
  const bytes = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes || bytes.length < 44 || bytes.length > wavLimits.bytes) fail('archivo inválido o excede 128 KiB');
  return bytes;
}
const word = (bytes, offset) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
export function inspectWavPcm16(input) {
  const bytes = byteArray(input), data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (word(bytes, 0) !== 'RIFF' || word(bytes, 8) !== 'WAVE' || data.getUint32(4, true) !== bytes.length - 8) fail('RIFF/WAVE o longitud inválidos');
  let cursor = 12, count = 0, format = null, audio = null;
  while (cursor < bytes.length) {
    if (++count > wavLimits.chunks || cursor + 8 > bytes.length) fail('chunks excesivos o truncados');
    const name = word(bytes, cursor), length = data.getUint32(cursor + 4, true), start = cursor + 8, end = start + length;
    if (length > wavLimits.bytes || end + (length & 1) > bytes.length) fail('chunk fuera de límites');
    if (name === 'fmt ') {
      if (format || audio || length !== 16 || data.getUint16(start, true) !== 1 || data.getUint16(start + 14, true) !== 16) fail('solo WAV PCM16 con fmt de 16 bytes');
      const channels = data.getUint16(start + 2, true), sampleRate = data.getUint32(start + 4, true), align = data.getUint16(start + 12, true);
      if (![1, 2].includes(channels) || sampleRate < wavLimits.minimumRate || sampleRate > wavLimits.maximumRate || align !== channels * 2 || data.getUint32(start + 8, true) !== sampleRate * align) fail('canales, frecuencia o alineación inválidos');
      format = {channels, sampleRate, align};
    } else if (name === 'data') {
      if (!format || audio || !length || length % format.align) fail('datos PCM ausentes, duplicados o incompletos');
      audio = {dataOffset: start, dataBytes: length};
    } else if (!['JUNK', 'LIST', 'INFO', 'bext', 'fact'].includes(name)) fail('chunk WAV no soportado');
    cursor = end + (length & 1);
  }
  if (!format || !audio || cursor !== bytes.length) fail('WAV incompleto');
  const frames = audio.dataBytes / format.align, duration = frames / format.sampleRate;
  if (duration > wavLimits.seconds) fail('el audio excede 2 segundos');
  return {channels: format.channels, sampleRate: format.sampleRate, frames, duration, ...audio};
}
export function editWavPcm16(input, options = {}) {
  const bytes = byteArray(input), info = inspectWavPcm16(bytes);
  if (!options || typeof options !== 'object' || Array.isArray(options) || ![Object.prototype, null].includes(Object.getPrototypeOf(options)) || Object.keys(options).some(key => !['startFrame', 'endFrame', 'gain'].includes(key))) fail('opciones de edición inválidas');
  const {startFrame = 0, endFrame = info.frames, gain = 1} = options;
  if (!Number.isInteger(startFrame) || !Number.isInteger(endFrame) || startFrame < 0 || startFrame >= endFrame || endFrame > info.frames || typeof gain !== 'number' || !Number.isFinite(gain) || gain < 0 || gain > wavLimits.maximumGain) fail('recorte o ganancia fuera de límites');
  const frames = endFrame - startFrame, length = frames * info.channels * 2;
  const output = new Uint8Array(44 + length), data = new DataView(output.buffer), original = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const put = (offset, value) => output.set(Array.from(value, character => character.charCodeAt(0)), offset);
  put(0, 'RIFF'); data.setUint32(4, output.length - 8, true); put(8, 'WAVE'); put(12, 'fmt '); data.setUint32(16, 16, true);
  data.setUint16(20, 1, true); data.setUint16(22, info.channels, true); data.setUint32(24, info.sampleRate, true);
  data.setUint32(28, info.sampleRate * info.channels * 2, true); data.setUint16(32, info.channels * 2, true); data.setUint16(34, 16, true);
  put(36, 'data'); data.setUint32(40, length, true);
  let clippedFrames = 0;
  for (let frame = 0; frame < frames; frame++) {
    let clipped = false;
    for (let channel = 0; channel < info.channels; channel++) {
      const sample = original.getInt16(info.dataOffset + ((frame + startFrame) * info.channels + channel) * 2, true);
      const amplified = Math.round(sample * gain);
      if (amplified < -32768 || amplified > 32767) clipped = true;
      data.setInt16(44 + (frame * info.channels + channel) * 2, Math.max(-32768, Math.min(32767, amplified)), true);
    }
    if (clipped) clippedFrames++;
  }
  return {bytes: output, channels: info.channels, sampleRate: info.sampleRate, frames, duration: frames / info.sampleRate, clippedFrames};
}
