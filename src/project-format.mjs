import {validateTextDocuments} from './text-documents.mjs';
import {validateResources,createResourceView,cloneValidatedResources,promoteLegacyResources,promoteResources2} from './contracts/resources.mjs';
import {validateCapabilities,resolveResourcePolicy,validateCapabilityReferences} from './contracts/packs.mjs';
import {engineLockHistory,isCompatibleEngineLocks,describeUnsupportedEngineLocks} from './contracts/engine-locks.mjs';

// Portable Studio data. No Blockly, Scratch, DOM or storage dependencies.
export const projectLimits = Object.freeze({bytes: 2 * 1024 * 1024, workspaceBytes: 65536, sourceBytes: 65536, nameLength: 80});
const encoder = new TextEncoder();
export const projectInitialScene = Object.freeze({spriteId: 'hero', x: 0, y: 0, direction: 90, size: 100, costume: 'hero'});
const scene = projectInitialScene;
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const fail = message => { throw new Error(`GGPROJ: ${message}`); };
const bytes = value => encoder.encode(value).byteLength;

function object(value, fields, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(`${path}: se esperaba un objeto`);
  const keys = Object.keys(value);
  if (keys.length !== fields.length || fields.some(key => !Object.hasOwn(value, key)) || keys.some(key => !fields.includes(key))) fail(`${path}: propiedades ausentes o no permitidas`);
}
function jsonTree(value, depth = 0) {
  if (depth > 64) fail('estructura demasiado profunda');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') { if (!Number.isFinite(value)) fail('número no finito'); return; }
  if (typeof value !== 'object') fail('se requieren datos JSON');
  if (Array.isArray(value)) { for (const item of value) jsonTree(item, depth + 1); return; }
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail('objeto no JSON');
  for (const key of Object.keys(value)) {
    if (forbidden.has(key)) fail(`propiedad no permitida: ${key}`);
    jsonTree(value[key], depth + 1);
  }
}
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}
function text(value, maximum, field) {
  if (typeof value !== 'string' || bytes(value) > maximum) fail(`${field}: texto ausente o demasiado grande`);
}
function timestamp(value, field) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${field}: fecha inválida`);
}
// Capabilities live in v3 and in v4 projects that had them; a v4 without them
// keeps the v2 shape (scene) and only adds declared text APIs.
export const hasCapabilityProfile = document => document?.version === 3 || (document?.version === 4 && Object.hasOwn(document, 'capabilities'));
function structure(document) {
  jsonTree(document);
  // Format and version first: a newer file is explained before its fields are checked.
  if (!document || typeof document !== 'object' || document.format !== 'ggproj') fail('formato o versión no soportada');
  if (Number.isSafeInteger(document.version) && document.version > 4) fail(`formato o versión no soportada: GGPROJ v${document.version} es de una versión más reciente de Code Studio; ábrelo con esa versión`);
  if (![1, 2, 3, 4].includes(document.version)) fail('formato o versión no soportada');
  object(document, hasCapabilityProfile(document) ? ['format', 'version', 'project', 'authoring', 'capabilities', 'resources', 'locks'] : ['format', 'version', 'project', 'authoring', 'scene', 'resources', 'locks'], 'documento');
  object(document.project, ['id', 'name', 'revision', 'createdAt', 'updatedAt'], 'project');
  const model = document.project;
  if (typeof model.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(model.id)) fail('ID de proyecto inválido');
  if (typeof model.name !== 'string' || !model.name.trim() || model.name !== model.name.trim() || model.name.length > projectLimits.nameLength || /[\u0000-\u001f\u007f]/.test(model.name)) fail('nombre de proyecto inválido');
  if (!Number.isSafeInteger(model.revision) || model.revision < 0) fail('revisión inválida');
  timestamp(model.createdAt, 'createdAt'); timestamp(model.updatedAt, 'updatedAt');
  if (Date.parse(model.updatedAt) < Date.parse(model.createdAt)) fail('updatedAt es anterior a createdAt');
  object(document.authoring, document.version === 1 ? ['blockly', 'deviceSource'] : ['blockly', 'deviceSource', 'textDocuments', 'selectedTextDocumentId'], 'authoring');
  if (document.version >= 2) validateTextDocuments(document.authoring.textDocuments, document.authoring.selectedTextDocumentId);
  // GGPROJ v4 is v3 plus a declared text API; it is written only when needed.
  if (document.version >= 2 && document.version < 4 && document.authoring.textDocuments.some(item => Object.hasOwn(item.runtime ?? {}, 'api'))) fail('la API textual declarada requiere GGPROJ v4');
  if (!document.authoring.blockly || typeof document.authoring.blockly !== 'object' || Array.isArray(document.authoring.blockly)) fail('workspace Blockly inválido');
  if (Object.keys(document.authoring.blockly).some(key => !['blocks', 'variables'].includes(key))) fail('metadatos de workspace no soportados');
  text(JSON.stringify(document.authoring.blockly), projectLimits.workspaceBytes, 'workspace Blockly');
  text(document.authoring.deviceSource, projectLimits.sourceBytes, 'fuente de dispositivo');
  if (hasCapabilityProfile(document)) {
    if (!validateCapabilities(document.capabilities)) fail('capacidades explícitas ausentes');
  } else {
    object(document.scene, Object.keys(scene), 'scene');
    if (canonical(document.scene) !== canonical(scene)) fail('estado inicial de escena no soportado');
  }
  object(document.resources, document.resources?.version===2?['version','assets','bindings','integrity']:document.resources?.version===1?['version','assets','costumes','sounds','integrity']:['assets', 'costumes', 'sounds', 'integrity'], 'resources');
  if (!document.resources.assets || typeof document.resources.assets !== 'object' || Array.isArray(document.resources.assets) || (document.resources.version===2?!Array.isArray(document.resources.bindings):!Array.isArray(document.resources.costumes)||!Array.isArray(document.resources.sounds))) fail('catálogo de recursos inválido');
  if (!document.resources.integrity || typeof document.resources.integrity !== 'object' || Array.isArray(document.resources.integrity)) fail('integridad de recursos ausente');
  if (!document.locks || typeof document.locks !== 'object' || Array.isArray(document.locks)) fail('locks inválidos');
  if (bytes(JSON.stringify(document)) > projectLimits.bytes) fail('archivo demasiado grande');
}
function decodeAsset(asset) {
  if (typeof asset === 'string') return encoder.encode(asset);
  object(asset, ['type', 'format', 'encoding', 'data'], 'asset');
  if (asset.type !== 'Sound' || asset.format !== 'wav' || asset.encoding !== 'base64' || typeof asset.data !== 'string' || asset.data.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(asset.data)) fail('asset de sonido inválido');
  let binary;
  try { binary = atob(asset.data); } catch { fail('asset base64 inválido'); }
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function validateProject(document, {catalog, engineHistory = engineLockHistory} = {}) {
  structure(document);
  if (!catalog?.resources || !catalog?.locks) fail('catálogo local no disponible');
  // Match the allowlist before hashing or interpreting imported resource data.
  // Object-key order is deliberately insignificant, unlike array ordering.
  // Earlier published engine sets stay accepted; saving writes catalog.locks.
  if (!isCompatibleEngineLocks(document.locks, {current: catalog.locks, history: engineHistory})) fail(`versiones o locks no soportados (${describeUnsupportedEngineLocks(document.locks, {current: catalog.locks, history: engineHistory})}). Ábrelo con una versión más reciente de Code Studio`);
  if([1,2].includes(document.resources.version)) {
    const policy=resolveResourcePolicy(document.capabilities);
    if(!hasCapabilityProfile(document)||policy!=='gg-resources-v'+document.resources.version)fail('política de recursos no instalada/seleccionada');
    const resources=await validateResources(document.resources,{policy});
    validateCapabilityReferences(document.capabilities,{resources,textDocuments:document.authoring.textDocuments});
    const result=structuredClone(document);result.resources=resources;return result;
  }
  
  if (canonical(document.resources) !== canonical(catalog.resources)) fail('recursos desconocidos, ausentes o modificados');
  const resourceIds = Object.keys(document.resources.assets);
  if (!resourceIds.length || canonical(resourceIds.sort()) !== canonical(Object.keys(document.resources.integrity).sort())) fail('integridad de recursos incompleta');
  for (const id of resourceIds) {
    if (!/^[a-f0-9]{32}$/.test(id)) fail('identificador de recurso inválido');
    const integrity = document.resources.integrity[id];
    object(integrity, ['bytes', 'sha256'], 'integrity');
    const content = decodeAsset(document.resources.assets[id]);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', content)), item => item.toString(16).padStart(2, '0')).join('');
    if (!Number.isSafeInteger(integrity.bytes) || integrity.bytes < 1 || integrity.bytes !== content.byteLength || integrity.sha256 !== hash) fail('hash o tamaño de recurso inválido');
  }
  const result=structuredClone(document);createResourceView(result.resources,{catalog});validateCapabilityReferences(result.capabilities,{resources:result.resources,textDocuments:result.authoring.textDocuments});return result;
}

export async function createProject({name, blockly, deviceSource, catalog, resources, capabilities, textDocuments, selectedTextDocumentId = null, id = crypto.randomUUID(), revision = 0, createdAt = new Date().toISOString(), updatedAt = new Date().toISOString()}) {
  const profile = capabilities == null ? null : validateCapabilities(capabilities);
  const textAuthoring = textDocuments === undefined ? (profile ? {textDocuments: [], selectedTextDocumentId: null} : null) : validateTextDocuments(textDocuments, selectedTextDocumentId);
  const declaresApi = Boolean(textAuthoring?.textDocuments.some(item => Object.hasOwn(item.runtime, 'api')));
  const document = {format: 'ggproj', version: declaresApi ? 4 : profile ? 3 : textAuthoring ? 2 : 1, project: {id, name, revision, createdAt, updatedAt},
    authoring: {blockly: structuredClone(blockly), deviceSource, ...(textAuthoring ?? {})},
    ...(profile ? {capabilities: profile} : {scene: {...scene}}), resources: structuredClone(resources??catalog?.resources), locks: structuredClone(catalog?.locks)};
  return validateProject(document, {catalog});
}

export function serializeProject(document) {
  structure(document);
  const serialized = JSON.stringify(document, null, 2);
  if (bytes(serialized) > projectLimits.bytes) fail('archivo serializado demasiado grande');
  return serialized;
}

export async function parseProject(serialized, {catalog, engineHistory} = {}) {
  if (typeof serialized !== 'string' || bytes(serialized) > projectLimits.bytes) fail('archivo demasiado grande o texto ausente');
  let document;
  try { document = JSON.parse(serialized); } catch { fail('JSON inválido o archivo truncado'); }
  return validateProject(document, {catalog, ...(engineHistory ? {engineHistory} : {})});
}

// Promotion is explicit and copy-on-write. Legacy documents remain exact until
// the UI commits this validated candidate, retaining its prior saved revision.
export async function upgradeProject(document, {capabilities, catalog} = {}) {
  const previous = await validateProject(document, {catalog});
  const profile = validateCapabilities(capabilities);
  if (!profile) fail('la actualización requiere capacidades explícitas');
  const declaresApi = (previous.authoring.textDocuments ?? []).some(item => Object.hasOwn(item.runtime, 'api'));
  const candidate = {...previous, version: declaresApi ? 4 : 3, capabilities: profile,
    authoring: {...previous.authoring, textDocuments: previous.authoring.textDocuments ?? [],
      selectedTextDocumentId: previous.authoring.selectedTextDocumentId ?? null}};
  delete candidate.scene;
  const policy=resolveResourcePolicy(profile);
  if(candidate.resources.version===2&&policy!=='gg-resources-v2')fail('downgrade de recursos requiere una copia explícita sin pérdida');
  if(['gg-resources-v1','gg-resources-v2'].includes(policy)&&!candidate.resources.version)candidate.resources=await promoteLegacyResources(catalog);
  if(policy==='gg-resources-v2'&&candidate.resources.version===1){const validated=await validateResources(candidate.resources);candidate.resources=await promoteResources2(validated);}
  return validateProject(candidate, {catalog});
}
