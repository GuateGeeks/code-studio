import {createResourceView} from './resources.mjs';
import {localPackCatalog, latestPackVersions, localPackMigrations} from '../packs/catalog.mjs';
import {validatePackJSON,validatePackConfigSchema} from './pack-config-schema.mjs';
import {validateLocalPackConfig,validateLocalPackReferences,validateLocalPackFeatures} from './pack-config-validators.mjs';
import {findMigrationChain,transformWorkspace} from './pack-migrations.mjs';

export const packLimits = Object.freeze({packs: 16, configBytes: 16384, depth: 16});
// Manifest formats this release understands; later formats are added, never swapped.
export const supportedPackApiVersions = Object.freeze([1]);
const fail = message => { throw new Error(`GG packs: ${message}`); };
const own = (value, field) => Object.hasOwn(value, field);
export function canonicalPackData(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalPackData).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonicalPackData(value[key])).join(',') + '}';
}
function plain(value) { return value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value)); }
function fields(value, required, label) {
  if (!plain(value) || Object.keys(value).some(key=>!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value')) || Object.keys(value).length !== required.length || required.some(key => !own(value, key))) fail(label + ': propiedades inválidas');
}
function entry(id, version, catalog = localPackCatalog) {
  const found = catalog.find(item => item.manifest.id === id && item.manifest.version === version);
  if (!found) fail('pack/versión no instalado: ' + id + '@' + version + '. Este proyecto necesita ' + id + ' ' + version + '; ábrelo con una versión más reciente de Code Studio');
  return found;
}
export function validateCapabilities(capabilities, {catalog = localPackCatalog} = {}) {
  if (capabilities == null) return null;
  fields(capabilities, ['locks', 'config'], 'capabilities');
  if (!Array.isArray(capabilities.locks) || !capabilities.locks.length || capabilities.locks.length > packLimits.packs ||
      Object.keys(capabilities.locks).length !== capabilities.locks.length || !plain(capabilities.config)) fail('locks/config inválidos');
  for(let i=0;i<capabilities.locks.length;i++){if(!Object.hasOwn(capabilities.locks,i))fail('lock disperso');fields(capabilities.locks[i],['id','version','sha256'],'lock');}
  const budget=capabilities.locks.some(lock=>entry(lock.id,lock.version,catalog).manifest.configBudgetBytes===65536)?65536:packLimits.configBytes;
  validatePackJSON(capabilities.config,{maxDepth:packLimits.depth,maxBytes:budget});
  const seen = new Set();
  for (const lock of capabilities.locks) {
    fields(lock, ['id', 'version', 'sha256'], 'lock');
    if (typeof lock.id !== 'string' || !/^gg\.[a-z0-9][a-z0-9.-]{0,63}$/.test(lock.id) || seen.has(lock.id)) fail('ID de pack inválido/duplicado');
    if (typeof lock.version !== 'string' || lock.version.length > 32 || !/^\d+\.\d+\.\d+$/.test(lock.version) || typeof lock.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(lock.sha256)) fail('lock inválido');
    const installed = entry(lock.id, lock.version, catalog);
    if (installed.sha256 !== lock.sha256 || !supportedPackApiVersions.includes(installed.manifest.apiVersion)) fail('hash/API incompatible: ' + lock.id);
    if (!own(capabilities.config, lock.id)) fail('configuración ausente: ' + lock.id);
    validatePackJSON(capabilities.config[lock.id],{maxDepth:packLimits.depth,maxBytes:installed.manifest.configBudgetBytes??packLimits.configBytes});
    validatePackConfigSchema(capabilities.config[lock.id],installed.manifest.configSchema,lock.id);
    validateLocalPackConfig(installed.manifest.configValidator,capabilities.config[lock.id]);
    seen.add(lock.id);
  }
  if (Object.keys(capabilities.config).length !== seen.size || Object.keys(capabilities.config).some(id => !seen.has(id))) fail('configuración sin lock');
  if (!seen.has('gg.sprites')&&!capabilities.locks.some(lock=>entry(lock.id,lock.version,catalog).manifest.contextProvider===true)) fail('falta proveedor de contexto');
  for (const lock of capabilities.locks) {
    for (const dependency of entry(lock.id, lock.version, catalog).manifest.dependencies) {
      if (!capabilities.locks.some(item => item.id === dependency.id && item.version === dependency.version)) fail('dependencia incompatible: ' + dependency.id);
    }
  }
  for(const lock of capabilities.locks){const manifest=entry(lock.id,lock.version,catalog).manifest;validateLocalPackFeatures(manifest.featureValidator,capabilities.config[lock.id],mergeInstalledFeatures(capabilities.locks,manifest.context,catalog));}
  const result = structuredClone(capabilities);
  result.locks.sort((a, b) => a.id.localeCompare(b.id));
  return result;
}
export function createCapabilities(ids = ['gg.sprites'], {config = {}, versions = {}, catalog = localPackCatalog} = {}) {
  if (!Array.isArray(ids) || !ids.length || ids.length > packLimits.packs || Object.keys(ids).length !== ids.length || new Set(ids).size !== ids.length) fail('selección inválida');
  if (!plain(config) || !plain(versions)) fail('opciones de selección inválidas');
  const selected = new Map();
  function add(id, version) {
    if (selected.has(id)) { if (selected.get(id).manifest.version !== version) fail('dependencias en conflicto'); return; }
    const installed = entry(id, version, catalog); selected.set(id, installed);
    for (const dependency of installed.manifest.dependencies) add(dependency.id, dependency.version);
  }
  for (const id of ids) add(id, versions[id] ?? latestPackVersions[id]);
  if (Object.keys(config).some(id => !selected.has(id))) fail('configuración de pack no seleccionado');
  const locks = []; const configs = {};
  for (const [id, item] of selected) {
    locks.push({id, version: item.manifest.version, sha256: item.sha256});
    configs[id] = structuredClone(own(config, id) ? config[id] : item.manifest.defaults);
  }
  return validateCapabilities({locks, config: configs}, {catalog});
}
export function resolveCapabilities(capabilities = null, {catalog = localPackCatalog} = {}) {
  const resolved = capabilities == null ? createCapabilities(['gg.sprites'], {catalog}) : validateCapabilities(capabilities, {catalog});
  const packs = resolved.locks.map(lock => ({id: lock.id, version: lock.version, manifest: structuredClone(entry(lock.id, lock.version, catalog).manifest),
    config: structuredClone(resolved.config[lock.id])}));
  const variables = [];
  for (const pack of packs) for (const declaration of pack.manifest.variables) {
    const variable = Object.fromEntries(Object.entries(declaration).map(([field, value]) =>
      [field, value && typeof value === 'object' && own(value, 'config') ? pack.config[value.config] : value]));
    if (variables.some(item => item.id === variable.id)) fail('variables de packs en conflicto');
    variables.push(variable);
  }
  return {legacy: capabilities == null, capabilities: capabilities == null ? null : resolved, packs, variables,
    initialScene: resolved.config['gg.sprites']?structuredClone(resolved.config['gg.sprites'].initialScene):undefined};
}
// Walks the registered chain (manifest records and catalog records) one step at
// a time; each step renames config fields, transforms pack workspaces and must
// validate against the installed target version before the next step.
export function migrateCapabilities(capabilities, {id, toVersion}, {catalog = localPackCatalog, records = localPackMigrations} = {}) {
  let current = validateCapabilities(capabilities, {catalog});
  if (!current) fail('migración requiere capacidades explícitas');
  const lock = current.locks.find(item => item.id === id);
  if (!lock) fail('pack no seleccionado');
  if (lock.version === toVersion) return current;
  for (const step of findMigrationChain(id, lock.version, toVersion, {catalog, records})) {
    const target = entry(id, step.toVersion, catalog);
    const config = {...current.config[id]};
    for (const [from, to] of Object.entries(step.rename)) {
      if (!own(config, from) || own(config, to)) fail('migración ambigua');
      config[to] = config[from]; delete config[from];
    }
    current.config[id] = config;
    if (step.blocks) for (const [packId, packConfig] of Object.entries(current.config)) {
      if (plain(packConfig) && plain(packConfig.workspace) && Array.isArray(packConfig.workspace.nodes)) current.config[packId] = {...packConfig, workspace: transformWorkspace(packConfig.workspace, step.blocks).workspace};
    }
    current.locks = current.locks.map(item => item.id === id ? {id, version: step.toVersion, sha256: target.sha256} : item);
    current = validateCapabilities(current, {catalog});
  }
  return current;
}

// Policy authority comes only from the installed manifests, never archive data.
export function resolveResourcePolicy(capabilities) {
 const policies=[...new Set(resolveCapabilities(capabilities).packs.map(pack=>pack.manifest.resourcePolicy).filter(Boolean))];
 if(policies.length>1)throw new Error('GG packs: políticas de recursos incompatibles');
 return policies[0]??null;
}

export function validateCapabilityReferences(capabilities,{resources,textDocuments=[]}={}){for(const pack of resolveCapabilities(capabilities).packs){const contextId=pack.manifest.context;const resourceView=resources?createResourceView(resources,contextId?{contextId,documentId:pack.config.documentId}:{}):undefined;validateLocalPackReferences(pack.manifest.configValidator,pack.config,{resources,resourceView,textDocuments});}return capabilities;}

// Historical manifests remain exact. Context inheritance is resolved here from
// installed metadata; imported files cannot register providers or dependencies.
export function selectCapabilityLocksForContext(locks,contextId){
 if(!Array.isArray(locks))fail('locks inválidos');
 const entries=new Map(locks.map(lock=>{const found=entry(lock.id,lock.version);if(found.sha256!==lock.sha256)fail('hash incompatible');return[lock.id,found.manifest];}));
 function contexts(id,seen=new Set()){
  if(seen.has(id))return[];seen=new Set([...seen,id]);const manifest=entries.get(id);if(!manifest)return[];
  if(manifest.context)return[manifest.context];if(id==='gg.sprites')return['scratch-2d'];
  return [...new Set(manifest.dependencies.flatMap(dep=>contexts(dep.id,seen)))];
 }
 const selected=new Set();
 function include(id){if(selected.has(id))return;selected.add(id);for(const dependency of entries.get(id)?.dependencies??[])include(dependency.id);}
 // Shared contributions cannot manufacture an otherwise absent context.
 // First choose context roots/dependencies, then retain explicitly shared packs.
 for(const [id,manifest]of entries)if((manifest.context||!manifest.executionContexts)&&contexts(id).some(context=>context===contextId||contextId==='scratch-2d'&&context==='scratch-compatibility'))include(id);
 if(selected.size)for(const [id,manifest]of entries)if(manifest.executionContexts?.includes(contextId))include(id);
 return locks.filter(lock=>selected.has(lock.id)).map(lock=>structuredClone(lock));
}


function mergeInstalledFeatures(locks,contextId,catalog){
 const merged={};
 for(const lock of locks){const manifest=entry(lock.id,lock.version,catalog).manifest;if(manifest.context!==contextId||!manifest.featureSet)continue;
  for(const [name,value]of Object.entries(manifest.featureSet)){
   if(Array.isArray(value)){if(Object.hasOwn(merged,name)&&!Array.isArray(merged[name]))fail('funciones incompatibles');merged[name]=[...new Set([...(merged[name]??[]),...value])];}
   else if(typeof value==='boolean'){if(Object.hasOwn(merged,name)&&typeof merged[name]!=='boolean')fail('funciones incompatibles');merged[name]=Boolean(merged[name])||value;}
   else fail('declaración de funciones no instalada');
  }
 }
 return merged;
}
export function resolveCapabilityFeatures(capabilities,contextId,{catalog=localPackCatalog}={}){
 const profile=capabilities==null?createCapabilities(['gg.sprites'],{catalog}):validateCapabilities(capabilities,{catalog});
 return structuredClone(mergeInstalledFeatures(profile.locks,contextId,catalog));
}
