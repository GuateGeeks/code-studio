// Independent text authoring data. No interpreter, DOM, editor or engine imports.
export const textDocumentLimits = Object.freeze({documents: 8, name: 80, sourceBytes: 65536});
export const textDocumentRuntimes = Object.freeze({
  javascript: Object.freeze({engine: 'quickjs', version: '0.32.0'}),
  python: Object.freeze({engine: 'pyodide', version: '314.0.7'})
});
// Interpreter versions whose documents still open; saving writes the current one.
// Kept apart from textDocumentRuntimes, which new documents copy verbatim.
export const textDocumentCompatibleVersions = Object.freeze({
  javascript: Object.freeze(['0.32.0']),
  python: Object.freeze(['314.0.7'])
});
// Text API a document is written against (ADR-011). Declared only in GGPROJ v4;
// older documents take the API of the context that runs them.
export const textDocumentApis = Object.freeze(['api1', 'api2']);
const encoder = new TextEncoder();
const uuid = /^text-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = message => { throw new Error(`GGPROJ textos: ${message}`); };
function object(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${label}: objeto inválido`);
  const keys = Object.keys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key)) ||
      fields.some(key => !Object.hasOwn(value, key))) fail(`${label}: propiedades ausentes o no permitidas`);
}
function validateDocument(document) {
  object(document, ['id', 'name', 'language', 'source', 'runtime'], 'documento');
  if (typeof document.id !== 'string' || !uuid.test(document.id)) fail('ID de documento inválido');
  if (typeof document.name !== 'string' || !document.name.trim() ||
      document.name.length > textDocumentLimits.name || /[\u0000-\u001f\u007f-\u009f]/u.test(document.name)) fail('nombre de documento inválido');
  if (typeof document.language !== 'string' || !Object.hasOwn(textDocumentRuntimes, document.language)) fail('lenguaje no soportado');
  if (typeof document.source !== 'string' || encoder.encode(document.source).length > textDocumentLimits.sourceBytes) fail('fuente textual ausente o demasiado grande');
  object(document.runtime, Object.hasOwn(document.runtime ?? {}, 'api') ? ['engine', 'version', 'api'] : ['engine', 'version'], 'runtime');
  const expected = textDocumentRuntimes[document.language];
  if (document.runtime.engine !== expected.engine || !textDocumentCompatibleVersions[document.language].includes(document.runtime.version)) fail(`runtime o versión no soportados (${document.runtime.engine} ${document.runtime.version}). Ábrelo con una versión más reciente de Code Studio`);
  if (Object.hasOwn(document.runtime, 'api') && !textDocumentApis.includes(document.runtime.api)) fail('API textual no soportada: ' + document.runtime.api);
  return {id: document.id, name: document.name, language: document.language, source: document.source,
    runtime: {engine: expected.engine, version: expected.version, ...(Object.hasOwn(document.runtime, 'api') ? {api: document.runtime.api} : {})}};
}

export function validateTextDocuments(textDocuments, selectedTextDocumentId) {
  if (!Array.isArray(textDocuments) || textDocuments.length > textDocumentLimits.documents ||
      Object.keys(textDocuments).length !== textDocuments.length) fail('lista de documentos inválida o demasiado grande');
  const ids = new Set();
  const cloned = [];
  for (const document of textDocuments) {
    const valid = validateDocument(document);
    if (ids.has(valid.id)) fail('ID de documento duplicado');
    ids.add(valid.id);
    cloned.push(valid);
  }
  if (selectedTextDocumentId !== null &&
      (typeof selectedTextDocumentId !== 'string' || !ids.has(selectedTextDocumentId))) fail('selección textual inválida');
  return {textDocuments: cloned, selectedTextDocumentId};
}

export function createTextDocument({language, name, source = ''}) {
  if (typeof language !== 'string' || !Object.hasOwn(textDocumentRuntimes, language)) fail('lenguaje no soportado');
  return validateDocument({
    id: `text-${crypto.randomUUID()}`,
    name: name === undefined ? (language === 'javascript' ? 'Programa JavaScript' : 'Programa Python') : name,
    language, source, runtime: {...textDocumentRuntimes[language]}
  });
}

// Documents referenced by a capability context (3D, web) run with API2; the
// rest belong to 2D and run with API1, unless GGPROJ v4 declares otherwise.
export function resolveTextDocumentApi(document, capabilities) {
  if (Object.hasOwn(document?.runtime ?? {}, 'api')) return document.runtime.api;
  const referenced = Object.values(capabilities?.config ?? {}).some(config => config && typeof config === 'object' &&
    (config.selectedTextDocumentId === document?.id || config.documentId === document?.id) && Object.hasOwn(config, 'workspace') && !Object.hasOwn(config, 'deviceId'));
  return referenced ? 'api2' : 'api1';
}
