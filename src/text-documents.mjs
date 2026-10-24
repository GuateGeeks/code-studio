// Independent text authoring data. No interpreter, DOM, editor or engine imports.
export const textDocumentLimits = Object.freeze({documents: 8, name: 80, sourceBytes: 65536});
export const textDocumentRuntimes = Object.freeze({
  javascript: Object.freeze({engine: 'quickjs', version: '0.32.0'}),
  python: Object.freeze({engine: 'pyodide', version: '314.0.7'})
});
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
  object(document.runtime, ['engine', 'version'], 'runtime');
  const expected = textDocumentRuntimes[document.language];
  if (document.runtime.engine !== expected.engine || document.runtime.version !== expected.version) fail('runtime o versión no soportados');
  return {id: document.id, name: document.name, language: document.language, source: document.source,
    runtime: {engine: expected.engine, version: expected.version}};
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
