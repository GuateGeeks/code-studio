// Injectable codec adapter. Pako's default accumulation is deliberately unused.
const chunkSize = 16384;
function abort(signal) { if (signal?.aborted) throw new DOMException('Procesamiento cancelado', 'AbortError'); }
function fail(message) { throw new Error('GG inflate: ' + message); }
export function createBoundedInflaters(Inflate) {
  if (typeof Inflate !== 'function') throw new TypeError('Inflater no instalado');
  async function inflateRaw(bytes, {onData, signal, maxOutputBytes} = {}) {
    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 2 * 1024 * 1024 || typeof onData !== 'function' ||
        !Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 0 || maxOutputBytes > 5 * 1024 * 1024) fail('entrada o cuota inválida');
    abort(signal);
    const stream = new Inflate({raw: true, chunkSize});
    let emitted = 0, consumed = 0, endedStatus = null;
    stream.onData = chunk => {
      abort(signal);
      if (!(chunk instanceof Uint8Array) || chunk.length > chunkSize || emitted + chunk.length > maxOutputBytes) fail('cuota de salida excedida');
      emitted += chunk.length;
      onData(chunk);
    };
    stream.onEnd = status => { endedStatus = status; stream.err = status; stream.msg = stream.strm.msg; };
    // Bound input turns as well as output chunks; the owning worker can also
    // be terminated by the host deadline even inside a synchronous codec call.
    for (let offset = 0; offset < bytes.length;) {
      abort(signal);
      const end = Math.min(offset + 4096, bytes.length);
      const accepted = stream.push(bytes.subarray(offset, end), end === bytes.length);
      consumed += stream.strm.next_in;
      if (!accepted || stream.err) fail(stream.msg || 'stream DEFLATE inválido');
      offset = end;
      if (stream.ended) {
        if (consumed !== bytes.length || offset !== bytes.length || endedStatus !== 0) fail('datos posteriores al stream');
        break;
      }
      // Permit an abort message between compressed chunks. No source or image
      // is published by this stage.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    abort(signal);
    if (!stream.ended || endedStatus !== 0 || consumed !== bytes.length) fail('stream truncado o incompleto');
    return {finished: true, consumedBytes: consumed, outputBytes: emitted};
  }
  async function inflateZlib(bytes, options = {}) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 6) fail('cabecera zlib truncada');
    const cmf = bytes[0], flg = bytes[1];
    if ((cmf & 15) !== 8 || cmf >>> 4 > 7 || ((cmf << 8) + flg) % 31 || flg & 32) fail('cabecera zlib no soportada');
    let a = 1, b = 0;
    const result = await inflateRaw(bytes.subarray(2, bytes.length - 4), {...options, onData: chunk => {
      for (const byte of chunk) { a = (a + byte) % 65521; b = (b + a) % 65521; }
      options.onData(chunk);
    }});
    const expected = new DataView(bytes.buffer, bytes.byteOffset + bytes.length - 4, 4).getUint32(0);
    if ((((b << 16) | a) >>> 0) !== expected) fail('checksum zlib inválido');
    return {...result, consumedBytes: bytes.length};
  }
  return Object.freeze({inflateRaw, inflateZlib});
}
