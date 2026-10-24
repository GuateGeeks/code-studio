// Studio-owned bounded diagnostic data; no DOM, editor or engine dependencies.
export const diagnosticLimits = Object.freeze({entries: 100, message: 1024, sourceBlockId: 128, code: 64, line: 65537, column: 65537});
const levels = new Set(['info', 'warning', 'error']);
const origins = new Set(['generation', 'runner', 'shell', 'device', 'javascript', 'python', 'scene3d', 'webapp']);
const textOrigins = new Set(['javascript', 'python']);
const envelopeKeys = new Set(['type', 'protocolVersion', 'sessionId', 'revision', 'seq', 'diagnostic']);
const keys = new Set(['level', 'code', 'message', 'origin', 'sourceBlockId', 'sourceLocation']);
const documentId = /^text-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function boundedText(value, limit) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= limit;
}
function location(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      !Object.hasOwn(value, 'documentId') || !Object.hasOwn(value, 'line') ||
      Object.keys(value).some(key => !['documentId', 'line', 'column'].includes(key)) ||
      typeof value.documentId !== 'string' || !documentId.test(value.documentId) ||
      !Number.isSafeInteger(value.line) || value.line < 1 || value.line > diagnosticLimits.line ||
      (Object.hasOwn(value, 'column') && (!Number.isSafeInteger(value.column) || value.column < 1 || value.column > diagnosticLimits.column))) return null;
  return {documentId: value.documentId, line: value.line, ...(Object.hasOwn(value, 'column') ? {column: value.column} : {})};
}
function normalize(record, truncate) {
  if (!record || typeof record !== 'object' || Array.isArray(record) ||
      Object.keys(record).some(key => !keys.has(key)) ||
      !levels.has(record.level) || !origins.has(record.origin) ||
      !boundedText(record.code, diagnosticLimits.code) ||
      typeof record.message !== 'string' || !record.message.trim() ||
      (!truncate && record.message.length > diagnosticLimits.message) ||
      (record.sourceBlockId !== undefined && !boundedText(record.sourceBlockId, diagnosticLimits.sourceBlockId))) return null;
  let sourceLocation;
  if (record.sourceLocation !== undefined) {
    if (record.sourceBlockId !== undefined || !textOrigins.has(record.origin)) return null;
    sourceLocation = location(record.sourceLocation);
    if (!sourceLocation) return null;
  }
  return {
    level: record.level, code: record.code, message: record.message.slice(0, diagnosticLimits.message), origin: record.origin,
    ...(record.sourceBlockId !== undefined ? {sourceBlockId: record.sourceBlockId} : {}),
    ...(sourceLocation ? {sourceLocation} : {})
  };
}

export function createDiagnosticConsole() {
  let entries = [];
  let dropped = 0;
  let lastSequence = -1;
  function append(record) {
    entries.push(record);
    if (entries.length > diagnosticLimits.entries) { entries.shift(); dropped++; }
    return true;
  }
  function clear() { entries = []; dropped = 0; }
  return Object.freeze({
    add(record) {
      const normalized = normalize(record, true);
      return normalized ? append(normalized) : false;
    },
    // The shell additionally authenticates its MessagePort and bound session,
    // and checks the shared channel sequence before routing diagnostics here.
    // Textual channels are authenticated separately before their records use add.
    accept(envelope, {sessionId, revision, sourceIds} = {}) {
      if (!sessionId || !Number.isSafeInteger(revision) || revision < 0 ||
          !envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
          Object.keys(envelope).some(key => !envelopeKeys.has(key)) ||
          envelope.type !== 'diagnostic' || envelope.protocolVersion !== 1 ||
          envelope.sessionId !== sessionId || envelope.revision !== revision ||
          !Number.isSafeInteger(envelope.seq) || envelope.seq < 0 || envelope.seq <= lastSequence) return false;
      const record = normalize(envelope.diagnostic, false);
      if (!record || record.origin !== 'runner') return false;
      if (record.sourceBlockId !== undefined) {
        if (!(sourceIds instanceof Set || Array.isArray(sourceIds))) return false;
        if (!(sourceIds instanceof Set ? sourceIds.has(record.sourceBlockId) : sourceIds.includes(record.sourceBlockId))) return false;
      }
      lastSequence = envelope.seq;
      return append(record);
    },
    clear,
    reset() { clear(); lastSequence = -1; },
    invalidateSources(origin) {
      entries = entries.map(record => (record.sourceBlockId || record.sourceLocation) && (!origin || record.origin === origin)
        ? {...record, sourceStale: true} : record);
    },
    snapshot: () => ({entries: structuredClone(entries), dropped})
  });
}
