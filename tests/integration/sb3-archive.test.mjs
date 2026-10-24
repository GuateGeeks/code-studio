import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {Inflate} from 'pako';
import {deflateRawSync} from 'node:zlib';
import {readSb3Archive, crc32, sb3ArchiveLimits} from '../../src/contracts/sb3-archive.mjs';

const utf8 = value => new TextEncoder().encode(value);
const project = utf8('{"targets":[],"extensions":[]}');
function inflateRaw(bytes, {onData, signal}) {
  const decoder = new Inflate({raw: true, chunkSize: 16384});
  decoder.onData = chunk => { if (signal?.aborted) throw new Error('aborted'); onData(chunk); };
  decoder.push(bytes, true);
  if (decoder.err) throw new Error(decoder.msg);
  return {finished: decoder.ended, consumedBytes: decoder.strm.next_in};
}
function zip(items) {
  const entries = items.map(item => ({method: 0, flags: 0x800, content: utf8('asset'), ...item}));
  const locals = [], centrals = [], positions = []; let offset = 0;
  for (const item of entries) {
    const name = Buffer.from(item.name), content = item.content;
    const compressed = item.compressed ?? (item.method === 8 ? deflateRawSync(content) : content);
    const size = item.declaredSize ?? content.length, checksum = crc32(content), version = item.method === 8 ? 20 : 10;
    const extra = item.extra ?? Buffer.alloc(0), descriptor = item.flags & 8 ? Buffer.alloc(item.descriptorLength ?? 16) : Buffer.alloc(0);
    const local = Buffer.alloc(30 + name.length + extra.length);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(version, 4); local.writeUInt16LE(item.flags, 6); local.writeUInt16LE(item.method, 8);
    if (!(item.flags & 8)) {local.writeUInt32LE(checksum, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(size, 22);}
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(extra.length, 28); name.copy(local, 30); Buffer.from(extra).copy(local, 30 + name.length);
    if (descriptor.length) {
      const cursor = descriptor.length === 16 ? 4 : 0;
      if (cursor) descriptor.writeUInt32LE(0x08074b50);
      descriptor.writeUInt32LE(checksum, cursor); descriptor.writeUInt32LE(compressed.length, cursor + 4); descriptor.writeUInt32LE(size, cursor + 8);
    }
    const central = Buffer.alloc(46 + name.length + extra.length);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(version, 6); central.writeUInt16LE(item.flags, 8); central.writeUInt16LE(item.method, 10);
    central.writeUInt32LE(checksum, 16); central.writeUInt32LE(compressed.length, 20); central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28); central.writeUInt16LE(extra.length, 30); central.writeUInt32LE((item.attrs ?? 0) >>> 0, 38); central.writeUInt32LE(offset, 42);
    name.copy(central, 46); Buffer.from(extra).copy(central, 46 + name.length);
    positions.push({local: offset, payload: offset + local.length, central: 0});
    locals.push(local, compressed, descriptor); centrals.push(central); offset += local.length + compressed.length + descriptor.length;
  }
  const end = Buffer.alloc(22), centralSize = centrals.reduce((sum, item) => sum + item.length, 0);
  let cursor = offset; centrals.forEach((item, index) => {positions[index].central = cursor; cursor += item.length;});
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  return {bytes: Buffer.concat([...locals, ...centrals, end]), positions};
}
const archive = (...items) => zip([{name: 'project.json', content: project}, ...items]);
test('GG-SB3-ZIP: independent JSZip STORE/DEFLATE and streaming descriptors extract exact detached bytes', async () => {
  assert.equal(crc32(utf8('123456789')), 0xcbf43926);
  assert.equal(crc32(utf8('56789'), crc32(utf8('1234'))), 0xcbf43926);
  for (const compression of ['STORE', 'DEFLATE']) for (const streamFiles of [false, true]) {
    const original = new JSZip(); original.file('project.json', project); original.file('abc123.svg', utf8('<svg/>'));
    const bytes = await original.generateAsync({type: 'uint8array', compression, streamFiles, comment: 'Reviewed fixture'});
    const before = bytes.slice(); const result = await readSb3Archive(bytes, {inflateRaw});
    assert.deepEqual(result.get('project.json'), project); assert.equal(new TextDecoder().decode(result.get('abc123.svg')), '<svg/>');
    result.get('project.json')[0] = 0; assert.deepEqual(bytes, before);
  }
  const noSignature = zip([{name: 'project.json', content: project, method: 8, flags: 0x808, descriptorLength: 12}]);
  assert.deepEqual((await readSb3Archive(noSignature.bytes, {inflateRaw})).get('project.json'), project);
});
test('GG-SB3-ZIP: rejects unsafe paths, links, encryption, ZIP64 and duplicates before calling a decoder', async () => {
  const invalid = ['../evil.svg', '/absolute.svg', 'a/../evil.svg', 'a\\evil.svg', 'a%2f.svg', 'a//b.svg', 'constructor', 'a/'].map(name => archive({name}));
  invalid.push(archive({name: 'A.svg'}, {name: 'a.svg'}), archive({name: 'link.svg', attrs: 0xa1ff0000}), archive({name: 'directory', attrs: 0x10}),
    zip([{name: 'project.json', content: project, flags: 0x801}]), zip([{name: 'project.json', content: project, method: 12}]),
    zip([{name: 'project.json', content: project, extra: Uint8Array.of(1, 0, 0, 0)}]));
  let calls = 0;
  for (const item of invalid) await assert.rejects(readSb3Archive(item.bytes, {inflateRaw: () => { calls++; }}), /SB3 ZIP:/);
  assert.equal(calls, 0);
});
test('GG-SB3-ZIP: local/central disagreements, overlaps, CRC, missing project and trailing ZIP bytes fail', async () => {
  const corrupt = [];
  const localName = archive(); localName.bytes[30] = 120; corrupt.push(localName.bytes);
  const overlap = archive({name: 'a.svg'}); overlap.bytes.writeUInt32LE(0, overlap.positions[1].central + 42); corrupt.push(overlap.bytes);
  const badCRC = archive({name: 'a.svg'}); badCRC.bytes[badCRC.positions[1].payload] ^= 1; corrupt.push(badCRC.bytes);
  const badDescriptor = zip([{name: 'project.json', content: project, method: 8, flags: 0x808}]); badDescriptor.bytes[badDescriptor.positions[0].central - 8] ^= 1; corrupt.push(badDescriptor.bytes);
  corrupt.push(archive().bytes.subarray(0, -1), Buffer.concat([archive().bytes, Buffer.of(0)]), zip([{name: 'a.svg'}]).bytes);
  for (const bytes of corrupt) await assert.rejects(readSb3Archive(bytes, {inflateRaw}), /SB3 ZIP:/);
});
test('GG-SB3-ZIP: actual inflater output, complete stream and exact consumption are independently enforced', async () => {
  const bufferChunk = Buffer.from(project), exact = zip([{name: 'project.json', content: project, method: 8}]);
  const detached = await readSb3Archive(exact.bytes, {inflateRaw: (compressed, {onData}) => {
    onData(bufferChunk); bufferChunk.fill(0);
    return {finished: true, consumedBytes: compressed.length};
  }});
  assert.deepEqual(detached.get('project.json'), project);
  const bomb = zip([{name: 'project.json', content: utf8('x'.repeat(32000)), method: 8, declaredSize: 10}]);
  await assert.rejects(readSb3Archive(bomb.bytes, {inflateRaw}), /salida DEFLATE excede cuota/);
  const compressed = deflateRawSync(project);
  const trailing = zip([{name: 'project.json', content: project, method: 8, compressed: Buffer.concat([compressed, Buffer.of(0, 1)])}]);
  await assert.rejects(readSb3Archive(trailing.bytes, {inflateRaw}), /datos sobrantes/);
  const truncated = zip([{name: 'project.json', content: project, method: 8, compressed: compressed.subarray(0, -2)}]);
  await assert.rejects(readSb3Archive(truncated.bytes, {inflateRaw}), /DEFLATE incompleto|invalid|unexpected/i);
  await assert.rejects(readSb3Archive(zip([{name: 'project.json', content: project, method: 8}]).bytes), /decoder DEFLATE local/);
});
test('GG-SB3-ZIP: budgets and AbortSignal revoke pending extraction and late output', async () => {
  await assert.rejects(readSb3Archive(new Uint8Array(sb3ArchiveLimits.bytes + 1)), /256 KiB/);
  await assert.rejects(readSb3Archive(archive({name: 'large.svg', content: new Uint8Array(131073), method: 8}).bytes, {inflateRaw}), /cuota/);
  await assert.rejects(readSb3Archive(archive(...Array.from({length: 64}, (_, index) => ({name: index + '.svg'}))).bytes, {inflateRaw}), /directorio/);
  await assert.rejects(readSb3Archive(archive(...Array.from({length: 6}, (_, index) => ({name: index + '.svg', method: 8, content: new Uint8Array(100000)}))).bytes, {inflateRaw}), /cuota/);
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(readSb3Archive(archive().bytes, {signal: cancelled.signal}), {name: 'AbortError'});
  const controller = new AbortController(); let entered, lateData;
  const started = new Promise(resolve => {entered = resolve;});
  const pending = readSb3Archive(zip([{name: 'project.json', content: project, method: 8}]).bytes, {signal: controller.signal,
    inflateRaw: (_bytes, {onData}) => {lateData = onData; entered(); return new Promise(() => {});}});
  await started; controller.abort(); await assert.rejects(pending, {name: 'AbortError'});
  assert.throws(() => lateData(project), {name: 'AbortError'});
});
