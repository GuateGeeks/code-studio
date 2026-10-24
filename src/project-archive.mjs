import {resolveResourcePolicy} from './contracts/packs.mjs';
import {validateProject, projectLimits} from './project-format.mjs';

// GGPROJ v1/v2/v3 use the standard ZIP STORE subset. No decompressor is exposed to
// imported bytes: local/central sizes, CRC and exact entry paths are verified
// before interpreting JSON or materializing assets.
export const archiveLimits = Object.freeze({bytes: projectLimits.bytes, expandedBytes: projectLimits.bytes, entries: 33, manifestBytes: 512 * 1024, assetBytes: 512 * 1024});
const encode = new TextEncoder();
const decode = new TextDecoder('utf-8', {fatal: true});
const fail = message => { throw new Error(`GGPROJ ZIP: ${message}`); };
const crcTable = Uint32Array.from({length: 256}, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function concat(parts) {
  const size = parts.reduce((sum, part) => sum + part.byteLength, 0);
  if (size > archiveLimits.bytes) fail('archivo demasiado grande');
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
  return output;
}
const view = bytes => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
function pathFor(id, asset) { return `assets/${id}.${typeof asset === 'string' ? 'svg' : asset.format}`; }
function assetBytes(asset) {
  return typeof asset === 'string' ? encode.encode(asset) : Uint8Array.from(atob(asset.data), value => value.charCodeAt(0));
}
function base64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function utf8(bytes) {
  try { return decode.decode(bytes); } catch { fail('texto UTF-8 inválido'); }
}
function storedZip(entries) {
  const localParts = []; const centralParts = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const nameBytes = encode.encode(name); const crc = crc32(data);
    const local = new Uint8Array(30 + nameBytes.byteLength); const l = view(local);
    l.setUint32(0, 0x04034b50, true); l.setUint16(4, 20, true); l.setUint16(6, 0x800, true);
    l.setUint16(12, 0x21, true); l.setUint32(14, crc, true); l.setUint32(18, data.length, true); l.setUint32(22, data.length, true); l.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    const central = new Uint8Array(46 + nameBytes.byteLength); const c = view(central);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x800, true);
    c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nameBytes.length, true); c.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    localParts.push(local, data); centralParts.push(central);
    offset += local.length + data.length;
  }
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22); const e = view(end);
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, entries.length, true); e.setUint16(10, entries.length, true); e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
  return concat([...localParts, ...centralParts, end]);
}

export async function createProjectArchive(document, {catalog} = {}) {
  const validated = await validateProject(document, {catalog});
  const manifest = structuredClone(validated);
  const assets = [];
  manifest.resources.assets = Object.fromEntries(Object.entries(validated.resources.assets).map(([id, asset]) => {
    const isSvg = typeof asset === 'string'; const entry = pathFor(id, asset);
    assets.push([entry, assetBytes(asset)]);
    return [id, {entry, type: isSvg ? 'Image' : asset.type, format: isSvg ? 'svg' : asset.format, encoding: isSvg ? 'utf8' : 'binary'}];
  }));
  const manifestBytes = encode.encode(JSON.stringify(manifest, null, 2));
  if (manifestBytes.length > archiveLimits.manifestBytes || assets.some(([, data]) => data.length > archiveLimits.assetBytes)) fail('entrada demasiado grande');
  const entries = [['manifest.json', manifestBytes], ...assets];
  if (entries.length > archiveLimits.entries || entries.reduce((sum, [, data]) => sum + data.length, 0) > archiveLimits.expandedBytes) fail('límite de expansión o entradas');
  return storedZip(entries);
}

function readStoredZip(input, allowedPaths) {
  const bytes = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes || bytes.length < 22 || bytes.length > archiveLimits.bytes) fail('archivo truncado o demasiado grande');
  const data = view(bytes); const end = bytes.length - 22;
  if (data.getUint32(end, true) !== 0x06054b50 || data.getUint16(end + 20, true) !== 0) fail('fin ZIP inválido o comentarios no soportados');
  const count = data.getUint16(end + 10, true); const directorySize = data.getUint32(end + 12, true); const directoryOffset = data.getUint32(end + 16, true);
  if (data.getUint16(end + 4, true) || data.getUint16(end + 6, true) || data.getUint16(end + 8, true) !== count || count < 1 || count > archiveLimits.entries || directoryOffset + directorySize !== end) fail('directorio ZIP inválido, multipartes o ZIP64 no soportado');
  const records = []; const names = new Set();
  let cursor = directoryOffset; let expanded = 0;
  for (let index = 0; index < count; index++) {
    if (cursor + 46 > end || data.getUint32(cursor, true) !== 0x02014b50) fail('directorio central truncado');
    const flags = data.getUint16(cursor + 8, true); const method = data.getUint16(cursor + 10, true);
    const compressed = data.getUint32(cursor + 20, true); const size = data.getUint32(cursor + 24, true);
    const nameLength = data.getUint16(cursor + 28, true); const extraLength = data.getUint16(cursor + 30, true); const commentLength = data.getUint16(cursor + 32, true);
    const offset = data.getUint32(cursor + 42, true); const attributes = data.getUint32(cursor + 38, true);
    if (method !== 0) fail('compresión no soportada: GGPROJ requiere STORE');
    if (flags & ~0x800 || extraLength || commentLength || data.getUint16(cursor + 34, true) || (attributes & 0x10) || ![0, 0x8000].includes((attributes >>> 16) & 0xf000)) fail('cifrado, enlaces, extras o flags no soportados');
    if (nameLength < 1 || nameLength > 128 || cursor + 46 + nameLength > end || size !== compressed || offset >= directoryOffset) fail('tamaños o ruta ZIP inválidos');
    const name = utf8(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if ((allowedPaths?!allowedPaths.has(name):! /^(?:manifest\.json|assets\/(?:[a-f0-9]{32}|[a-f0-9]{64})\.(?:svg|png|wav|sb3|glb))$/.test(name)) || names.has(name)) fail('ruta no permitida o entrada duplicada');
    const limit = name === 'manifest.json' ? archiveLimits.manifestBytes : archiveLimits.assetBytes;
    expanded += size;
    if (size > limit || expanded > archiveLimits.expandedBytes) fail('límite de expansión o entrada excedido');
    names.add(name); records.push({name, offset, flags, size, crc: data.getUint32(cursor + 16, true), version: data.getUint16(cursor + 6, true)});
    cursor += 46 + nameLength;
  }
  if (cursor !== end || (allowedPaths&&names.size !== allowedPaths.size)) fail('entradas ausentes o directorio incoherente');
  const entries = new Map(); let localEnd = 0;
  for (const record of records.sort((a, b) => a.offset - b.offset)) {
    const offset = record.offset;
    if (offset !== localEnd || offset + 30 > directoryOffset || data.getUint32(offset, true) !== 0x04034b50) fail('cabecera local inválida o datos superpuestos');
    const nameLength = data.getUint16(offset + 26, true); const extraLength = data.getUint16(offset + 28, true);
    const start = offset + 30 + nameLength;
    if (![10, 20].includes(record.version) || data.getUint16(offset + 4, true) !== record.version || data.getUint16(offset + 6, true) !== record.flags || data.getUint16(offset + 8, true) !== 0 || extraLength || start + record.size > directoryOffset || data.getUint32(offset + 14, true) !== record.crc || data.getUint32(offset + 18, true) !== record.size || data.getUint32(offset + 22, true) !== record.size || utf8(bytes.subarray(offset + 30, start)) !== record.name) fail('cabecera local y central no coinciden');
    const content = bytes.subarray(start, start + record.size);
    if (crc32(content) !== record.crc) fail('CRC32 de entrada inválido');
    entries.set(record.name, content); localEnd = start + record.size;
  }
  if (localEnd !== directoryOffset) fail('datos ZIP adicionales no permitidos');
  return entries;
}

export async function parseProjectArchive(bytes, {catalog} = {}) {
  if (!catalog?.resources?.assets) fail('catálogo local no disponible');
  // Inventory/CRC verification is bounded and independent of archive authority.
  const entries = readStoredZip(bytes, null);
  let manifest;
  try { manifest = JSON.parse(utf8(entries.get('manifest.json'))); } catch { fail('manifest.json inválido o truncado'); }
  const modern=[1,2].includes(manifest?.resources?.version);
  if(modern&&(manifest.version<3||resolveResourcePolicy(manifest.capabilities)!=='gg-resources-v'+manifest.resources.version))fail('política de recursos no instalada/seleccionada');
  const manifestAssets = manifest?.resources?.assets;
  if (!manifestAssets || typeof manifestAssets !== 'object' || Array.isArray(manifestAssets)) fail('recursos del manifiesto ausentes');
  const resources = {}, paths=new Set(['manifest.json']);
  const ids=Object.keys(manifestAssets);
  if(!modern&&(ids.length!==Object.keys(catalog.resources.assets).length||ids.some(id=>!Object.hasOwn(catalog.resources.assets,id))))fail('recursos desconocidos');
  for (const id of ids) {
    const descriptor=manifestAssets[id],expected=modern?descriptor:catalog.resources.assets[id],svg=typeof expected==='string';
    if(!descriptor||typeof descriptor!=='object'||Array.isArray(descriptor)||Object.keys(descriptor).length!==4||
      !['entry','type','format','encoding'].every(key=>Object.hasOwn(descriptor,key)))fail('referencia de asset no soportada');
    if(modern) {
      if(!/^[a-f0-9]{64}$/.test(id)||!['Image/svg','Image/png','Sound/wav','Source/sb3',...(manifest.resources.version===2?['Model/glb']:[])].includes(descriptor.type+'/'+descriptor.format)||descriptor.encoding!=='binary')fail('descriptor moderno inválido');
    } else if(descriptor.type!==(svg?'Image':'Sound')||descriptor.format!==(svg?'svg':'wav')||descriptor.encoding!==(svg?'utf8':'binary'))fail('referencia de asset no soportada');
    const path=modern?`assets/${id}.${descriptor.format}`:pathFor(id,expected);
    if(descriptor.entry!==path||paths.has(path))fail('referencia de asset no soportada');
    if(!entries.has(path))fail('entradas ausentes');
    paths.add(path);const content=entries.get(path);
    resources[id]=!modern&&svg?utf8(content):{type:descriptor.type,format:descriptor.format,encoding:'base64',data:base64(content)};
  }
  if(paths.size!==entries.size)fail('entradas adicionales no permitidas');
  manifest.resources.assets=resources;
  return validateProject(manifest,{catalog});
}
