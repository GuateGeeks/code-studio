import {createHash} from 'node:crypto';
import {currentEngineLocks} from '../../src/contracts/engine-locks.mjs';

// Build-owned resources only. Imported projects must match this catalog before
// their authoring reaches Blockly or their resources reach a runtime adapter.
export async function buildProjectCatalog(rawResources) {
  const resources = structuredClone(rawResources);
  if (!resources?.assets || !Array.isArray(resources.costumes) || !Array.isArray(resources.sounds)) throw new Error('Invalid build resource catalog');
  resources.integrity = Object.fromEntries(Object.entries(resources.assets).map(([id, asset]) => {
    const bytes = typeof asset === 'string' ? Buffer.from(asset, 'utf8') : Buffer.from(asset.data, 'base64');
    return [id, {bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')}];
  }));
  return {resources, locks: structuredClone(currentEngineLocks)};
}
