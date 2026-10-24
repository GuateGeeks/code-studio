// Bounded ZIP intake only. Imported bytes never choose a decoder or execute.
export const sb3ArchiveLimits = Object.freeze({bytes: 262144, expandedBytes: 524288, entries: 64,
  projectBytes: 131072, assetBytes: 131072, pathBytes: 128, extraBytes: 1024, commentBytes: 1024, chunkBytes: 16384});
const fail = message => { throw new Error('SB3 ZIP: ' + message); };
const decoder = new TextDecoder('utf-8', {fatal: true});
const crcTable = Uint32Array.from({length: 256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
export function crc32(bytes, previous = 0) {
  let crc = previous ^ 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function abortCheck(signal) {
  if (signal?.aborted) throw Object.assign(new Error('Importación SB3 cancelada.'), {name: 'AbortError'});
}
function text(bytes) { try { return decoder.decode(bytes); } catch { fail('nombre UTF-8 inválido'); } }
function pathName(bytes, flags) {
  if (!bytes.length || bytes.length > sb3ArchiveLimits.pathBytes || (!(flags & 0x800) && bytes.some(byte => byte > 127))) fail('nombre no soportado');
  const name = text(bytes);
  if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(name) || name.split('/').some(part => !part || part === '.' || part === '..' || ['__proto__', 'prototype', 'constructor'].includes(part))) fail('ruta no permitida');
  return name;
}
function extraFields(bytes) {
  if (bytes.length > sb3ArchiveLimits.extraBytes) fail('metadatos ZIP demasiado grandes');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let cursor = 0; cursor < bytes.length;) {
    if (cursor + 4 > bytes.length) fail('metadatos ZIP truncados');
    const tag = data.getUint16(cursor, true), size = data.getUint16(cursor + 2, true);
    if (tag === 1) fail('ZIP64 no soportado');
    cursor += 4 + size;
    if (cursor > bytes.length) fail('metadatos ZIP truncados');
  }
}
async function inflateEntry(compressed, options, inflateRaw) {
  const {signal} = options;
  abortCheck(signal);
  let rejectAbort;
  const aborted = new Promise((_, reject) => { rejectAbort = reject; });
  const abort = () => rejectAbort(Object.assign(new Error('Importación SB3 cancelada.'), {name: 'AbortError'}));
  signal?.addEventListener('abort', abort, {once: true});
  try {
    abortCheck(signal);
    return await Promise.race([Promise.resolve().then(() => inflateRaw(compressed, options)), aborted]);
  } finally { signal?.removeEventListener('abort', abort); }
}

export async function readSb3Archive(input, {inflateRaw, signal} = {}) {
  abortCheck(signal);
  const source = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!source || source.length < 22 || source.length > sb3ArchiveLimits.bytes) fail('archivo truncado o excede 256 KiB');
  const bytes = Uint8Array.from(source); // Also detaches Buffer/subarray views with a nonzero byteOffset.
  const data = new DataView(bytes.buffer);
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 22 - sb3ArchiveLimits.commentBytes); offset--) {
    if (data.getUint32(offset, true) === 0x06054b50 && offset + 22 + data.getUint16(offset + 20, true) === bytes.length) { end = offset; break; }
  }
  if (end < 0) fail('fin de directorio inválido');
  const count = data.getUint16(end + 10, true), centralSize = data.getUint32(end + 12, true), centralStart = data.getUint32(end + 16, true);
  if (data.getUint16(end + 4, true) || data.getUint16(end + 6, true) || count !== data.getUint16(end + 8, true) ||
      !count || count > sb3ArchiveLimits.entries || centralStart === 0xffffffff || centralSize === 0xffffffff || centralStart + centralSize !== end) fail('directorio multidisco, ZIP64 o límites inválidos');
  const records = [], names = new Set();
  let cursor = centralStart, declaredTotal = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || data.getUint32(cursor, true) !== 0x02014b50) fail('directorio central truncado');
    const version = data.getUint16(cursor + 6, true), flags = data.getUint16(cursor + 8, true), method = data.getUint16(cursor + 10, true);
    const crc = data.getUint32(cursor + 16, true), compressedSize = data.getUint32(cursor + 20, true), size = data.getUint32(cursor + 24, true);
    const nameLength = data.getUint16(cursor + 28, true), extraLength = data.getUint16(cursor + 30, true), commentLength = data.getUint16(cursor + 32, true);
    const attrs = data.getUint32(cursor + 38, true), offset = data.getUint32(cursor + 42, true);
    const next = cursor + 46 + nameLength + extraLength + commentLength;
    if (next > end || commentLength > sb3ArchiveLimits.commentBytes || data.getUint16(cursor + 34, true)) fail('entrada central inválida');
    // JSZip/Scratch also label DEFLATE as version 1.0; supported features remain explicitly bounded here.
    if (![0, 8].includes(method) || ![10, 20].includes(version) || flags & ~(method === 8 ? 0x80e : 0x808)) fail('compresión, cifrado o flags no soportados');
    if ((attrs & 0x10) || ![0, 0x8000].includes((attrs >>> 16) & 0xf000)) fail('directorios/enlaces no permitidos');
    if ([compressedSize, size, offset].includes(0xffffffff) || offset >= centralStart || compressedSize > sb3ArchiveLimits.bytes) fail('ZIP64 o rangos inválidos');
    const name = pathName(bytes.subarray(cursor + 46, cursor + 46 + nameLength), flags);
    if (names.has(name.toLowerCase())) fail('ruta duplicada');
    names.add(name.toLowerCase());
    extraFields(bytes.subarray(cursor + 46 + nameLength, cursor + 46 + nameLength + extraLength));
    const limit = name === 'project.json' ? sb3ArchiveLimits.projectBytes : sb3ArchiveLimits.assetBytes;
    declaredTotal += size;
    if (size > limit || declaredTotal > sb3ArchiveLimits.expandedBytes || (method === 0 && compressedSize !== size)) fail('cuota de descompresión excedida');
    records.push({name, version, flags, method, crc, compressedSize, size, offset});
    cursor = next;
  }
  if (cursor !== end || !records.some(record => record.name === 'project.json')) fail('project.json ausente o directorio incoherente');
  records.sort((a, b) => a.offset - b.offset);
  let previousEnd = 0;
  for (let index = 0; index < records.length; index++) {
    const record = records[index], offset = record.offset;
    if (offset !== previousEnd || offset + 30 > centralStart || data.getUint32(offset, true) !== 0x04034b50) fail('cabecera local solapada o inválida');
    const nameLength = data.getUint16(offset + 26, true), extraLength = data.getUint16(offset + 28, true), start = offset + 30 + nameLength + extraLength;
    const payloadEnd = start + record.compressedSize, boundary = records[index + 1]?.offset ?? centralStart;
    if (start > boundary || payloadEnd > boundary || data.getUint16(offset + 4, true) !== record.version || data.getUint16(offset + 6, true) !== record.flags || data.getUint16(offset + 8, true) !== record.method ||
        pathName(bytes.subarray(offset + 30, offset + 30 + nameLength), record.flags) !== record.name) fail('cabeceras local/central incoherentes');
    extraFields(bytes.subarray(offset + 30 + nameLength, start));
    const local = [data.getUint32(offset + 14, true), data.getUint32(offset + 18, true), data.getUint32(offset + 22, true)];
    const expected = [record.crc, record.compressedSize, record.size];
    if (record.flags & 8) {
      if (local.some((value, item) => value !== 0 && value !== expected[item])) fail('descriptor local incoherente');
      const length = boundary - payloadEnd, descriptor = payloadEnd + (length === 16 ? 4 : 0);
      if (![12, 16].includes(length) || (length === 16 && data.getUint32(payloadEnd, true) !== 0x08074b50) ||
          expected.some((value, item) => data.getUint32(descriptor + item * 4, true) !== value)) fail('descriptor ZIP inválido');
    } else if (payloadEnd !== boundary || local.some((value, item) => value !== expected[item])) fail('tamaños locales o datos adicionales inválidos');
    record.start = start; previousEnd = boundary;
  }
  if (previousEnd !== centralStart) fail('datos ZIP adicionales');
  const result = new Map(); let total = 0;
  for (const record of records) {
    abortCheck(signal);
    const compressed = bytes.subarray(record.start, record.start + record.compressedSize);
    let content;
    if (record.method === 0) { content = compressed.slice(); total += content.length; }
    else {
      if (typeof inflateRaw !== 'function') fail('decoder DEFLATE local no disponible');
      const chunks = []; let length = 0, accepting = true;
      const onData = chunk => {
        abortCheck(signal);
        if (!accepting || !(chunk instanceof Uint8Array) || chunk.length > sb3ArchiveLimits.chunkBytes || length + chunk.length > record.size || total + chunk.length > sb3ArchiveLimits.expandedBytes) fail('salida DEFLATE excede cuota');
        length += chunk.length; total += chunk.length; chunks.push(Uint8Array.from(chunk));
      };
      let finished;
      try { finished = await inflateEntry(compressed, {onData, signal, maxOutputBytes: record.size}, inflateRaw); }
      finally { accepting = false; }
      abortCheck(signal);
      if (finished?.finished !== true || finished.consumedBytes !== compressed.length || length !== record.size) fail('DEFLATE incompleto o datos sobrantes');
      content = new Uint8Array(length); let offset = 0;
      for (const chunk of chunks) { content.set(chunk, offset); offset += chunk.length; }
    }
    if (content.length !== record.size || total > sb3ArchiveLimits.expandedBytes || crc32(content) !== record.crc) fail('CRC o tamaño de salida inválido');
    result.set(record.name, content);
  }
  abortCheck(signal);
  return result;
}
