import {crc32} from './sb3-archive.mjs';

export const pngLimits = Object.freeze({bytes: 131072, side: 1024, pixels: 1048576, chunks: 256});
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
const fail = message => { throw new Error('PNG: ' + message); };
const join = parts => {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0; for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
};

// CRC and container preflight do not establish that pixels can be decoded.
// The isolated target must inflate idat with exact expectedInflatedBytes, reject
// scanline filters outside 0..4, then decode/normalize before resource commit.
export function sanitizePngContainer(input) {
  const bytes = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes || bytes.length < 45 || bytes.length > pngLimits.bytes || signature.some((byte, index) => bytes[index] !== byte)) fail('firma o tamaño inválido');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks = [bytes.slice(0, 8)], compressed = [];
  let width, height, colorType, channels, rowBytes, paletteEntries = 0;
  let cursor = 8, count = 0, hasHeader = false, hasPalette = false, hasTransparency = false, hasData = false, dataEnded = false, ended = false;
  while (cursor < bytes.length) {
    if (++count > pngLimits.chunks || cursor + 12 > bytes.length || ended) fail('chunks excesivos, truncados o posteriores a IEND');
    const length = data.getUint32(cursor), end = cursor + 12 + length;
    if (length > pngLimits.bytes || end > bytes.length) fail('longitud de chunk inválida');
    const type = String.fromCharCode(...bytes.subarray(cursor + 4, cursor + 8));
    if (!/^[A-Za-z]{4}$/.test(type) || type[2] !== type[2].toUpperCase() || crc32(bytes.subarray(cursor + 4, end - 4)) !== data.getUint32(end - 4)) fail('tipo o CRC de chunk inválido');
    const start = cursor + 8;
    if (!hasHeader && type !== 'IHDR') fail('IHDR debe ser el primer chunk');
    if (type === 'IHDR') {
      if (hasHeader || length !== 13) fail('IHDR inválido o duplicado');
      width = data.getUint32(start); height = data.getUint32(start + 4); colorType = bytes[start + 9];
      channels = ({0: 1, 2: 3, 3: 1, 4: 2, 6: 4})[colorType];
      if (!width || !height || width > pngLimits.side || height > pngLimits.side || width * height > pngLimits.pixels ||
          bytes[start + 8] !== 8 || !channels || bytes[start + 10] !== 0 || bytes[start + 11] !== 0 || bytes[start + 12] !== 0) fail('solo PNG bit8 sin entrelazado dentro de 1024×1024');
      rowBytes = width * channels;
      hasHeader = true; chunks.push(bytes.slice(cursor, end));
    } else if (type === 'PLTE') {
      if (hasPalette || hasData || hasTransparency || [0, 4].includes(colorType) || !length || length % 3 || length > 768) fail('paleta inválida');
      hasPalette = true; paletteEntries = length / 3; chunks.push(bytes.slice(cursor, end));
    } else if (type === 'tRNS') {
      if (hasTransparency || hasData || [4, 6].includes(colorType) ||
          (colorType === 3 && (!hasPalette || !length || length > paletteEntries)) ||
          (colorType === 0 && (length !== 2 || data.getUint16(start) > 255)) ||
          (colorType === 2 && (length !== 6 || [0, 2, 4].some(offset => data.getUint16(start + offset) > 255)))) fail('transparencia inválida');
      hasTransparency = true; chunks.push(bytes.slice(cursor, end));
    } else if (type === 'IDAT') {
      if (dataEnded || (colorType === 3 && !hasPalette)) fail('IDAT no contiguo o sin paleta');
      hasData = true; compressed.push(bytes.slice(start, start + length)); chunks.push(bytes.slice(cursor, end));
    } else if (type === 'IEND') {
      if (!hasData || length !== 0 || end !== bytes.length) fail('IEND inválido o datos adicionales');
      ended = true; chunks.push(bytes.slice(cursor, end));
    } else {
      if (['acTL', 'fcTL', 'fdAT'].includes(type)) fail('PNG animado no soportado');
      if (type[0] === type[0].toUpperCase()) fail('chunk crítico no soportado');
      // Ancillary metadata (including compressed profiles/text) is never sent
      // to the native decoder. Its CRC and bounds were still checked above.
      if (hasData) dataEnded = true;
    }
    cursor = end;
  }
  const idat = join(compressed);
  if (!ended || !idat.length) fail('PNG incompleto');
  return {bytes: join(chunks), width, height, idat, expectedInflatedBytes: (rowBytes + 1) * height,
    rowBytes, channels, bitDepth: 8, colorType};
}
