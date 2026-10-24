import {validateProject} from './project-format.mjs';
import {migrateCapabilities, validateCapabilities} from './contracts/packs.mjs';
import {findMigrationChain, combineBlockTransforms, applyBlockTransforms} from './contracts/pack-migrations.mjs';
import {localPackCatalog, latestPackVersions, localPackMigrations} from './packs/catalog.mjs';

// Explicit, copy-on-write pack updates for a whole project (ADR-011). Nothing
// here runs a program; the caller commits the result atomically or not at all.
const fail = message => { throw new Error(`GGPROJ migración: ${message}`); };

export function availablePackUpdates(capabilities, {catalog = localPackCatalog, records = localPackMigrations, latest = latestPackVersions} = {}) {
  if (capabilities == null) return [];
  const current = validateCapabilities(capabilities, {catalog});
  return current.locks.flatMap(lock => {
    const toVersion = latest[lock.id];
    if (!toVersion || toVersion === lock.version) return [];
    try { findMigrationChain(lock.id, lock.version, toVersion, {catalog, records}); } catch { return []; }
    return [{id: lock.id, fromVersion: lock.version, toVersion}];
  });
}

export async function migrateProject(document, updates, {catalog, packCatalog = localPackCatalog, records = localPackMigrations, engineHistory} = {}) {
  const options = {catalog, ...(engineHistory ? {engineHistory} : {})};
  const original = await validateProject(document, options);
  if (original.version < 3 || !original.capabilities) fail('actualizar packs requiere capacidades explícitas');
  if (!Array.isArray(updates) || !updates.length) fail('no hay actualizaciones seleccionadas');
  let capabilities = original.capabilities;
  let blockly = original.authoring.blockly;
  const summary = [];
  for (const update of updates) {
    const lock = capabilities.locks.find(item => item.id === update?.id);
    if (!lock) fail('pack no seleccionado: ' + update?.id);
    const chain = findMigrationChain(lock.id, lock.version, update.toVersion, {catalog: packCatalog, records});
    const transforms = combineBlockTransforms(chain);
    const packWorkspaces = Object.values(capabilities.config).filter(config => config?.workspace && Array.isArray(config.workspace.nodes)).map(config => config.workspace);
    const packChanged = packWorkspaces.reduce((total, workspace) => total + applyBlockTransforms(workspace, transforms).changed.length, 0);
    capabilities = migrateCapabilities(capabilities, {id: lock.id, toVersion: update.toVersion}, {catalog: packCatalog, records});
    const step = applyBlockTransforms(blockly, transforms);
    blockly = step.workspace;
    summary.push({id: lock.id, fromVersion: lock.version, toVersion: update.toVersion, steps: chain.length, changedBlocks: step.changed.length + packChanged});
  }
  const candidate = structuredClone(original);
  candidate.capabilities = capabilities;
  candidate.authoring.blockly = blockly;
  return {document: await validateProject(candidate, options), summary};
}

export function describeMigrationSummary(summary) {
  return summary.map(item => `${item.id} ${item.fromVersion} → ${item.toVersion}` + (item.changedBlocks ? ` (${item.changedBlocks} ${item.changedBlocks === 1 ? 'bloque actualizado' : 'bloques actualizados'})` : '')).join('; ');
}
