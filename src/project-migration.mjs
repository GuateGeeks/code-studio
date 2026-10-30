import {validateProject, scene2DObjectsOf, scene2DAuthoringFromBlockly} from './project-format.mjs';
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
  // GGPROJ v6 keeps one workspace per object: transforms apply to each one.
  let blockly = original.authoring.blockly, scene2d = original.authoring.scene2d ?? null;
  const summary = [];
  for (const update of updates) {
    const lock = capabilities.locks.find(item => item.id === update?.id);
    if (!lock) fail('pack no seleccionado: ' + update?.id);
    const chain = findMigrationChain(lock.id, lock.version, update.toVersion, {catalog: packCatalog, records});
    const transforms = combineBlockTransforms(chain);
    const packWorkspaces = Object.values(capabilities.config).filter(config => config?.workspace && Array.isArray(config.workspace.nodes)).map(config => config.workspace);
    const packChanged = packWorkspaces.reduce((total, workspace) => total + applyBlockTransforms(workspace, transforms).changed.length, 0);
    capabilities = migrateCapabilities(capabilities, {id: lock.id, toVersion: update.toVersion}, {catalog: packCatalog, records});
    let changedBlocks = packChanged;
    if (scene2d) {
      const step = applyBlockTransforms(scene2d.stage, transforms);
      const sprites = Object.entries(scene2d.sprites).map(([id, workspace]) => [id, applyBlockTransforms(workspace, transforms)]);
      changedBlocks += step.changed.length + sprites.reduce((total, [, item]) => total + item.changed.length, 0);
      scene2d = {stage: step.workspace, sprites: Object.fromEntries(sprites.map(([id, item]) => [id, item.workspace]))};
    } else {
      const step = applyBlockTransforms(blockly, transforms);
      blockly = step.workspace;
      changedBlocks += step.changed.length;
    }
    summary.push({id: lock.id, fromVersion: lock.version, toVersion: update.toVersion, steps: chain.length, changedBlocks});
  }
  const candidate = structuredClone(original);
  candidate.capabilities = capabilities;
  // Reaching gg.sprites@0.3.0 moves the single workspace to the first sprite
  // (hero), same block IDs, as GGPROJ v6 (scene2d-multi-sprite 1.3).
  const objects = scene2DObjectsOf(capabilities);
  if (objects && !scene2d) scene2d = scene2DAuthoringFromBlockly(blockly, objects);
  if (scene2d) {
    const {blockly: _single, scene2d: _previous, deviceSource, textDocuments, selectedTextDocumentId, codeViews} = candidate.authoring;
    candidate.version = 6;
    candidate.authoring = {scene2d, deviceSource, textDocuments, selectedTextDocumentId, ...(codeViews ? {codeViews} : {})};
  } else candidate.authoring.blockly = blockly;
  return {document: await validateProject(candidate, options), summary};
}

export function describeMigrationSummary(summary) {
  return summary.map(item => `${item.id} ${item.fromVersion} → ${item.toVersion}` + (item.changedBlocks ? ` (${item.changedBlocks} ${item.changedBlocks === 1 ? 'bloque actualizado' : 'bloques actualizados'})` : '')).join('; ');
}
