// Local continuity data, independent of DOM, Blockly and execution state.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateCopyRecord(value, projectId = value?.projectId) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== 4 || !['version', 'projectId', 'contentHash', 'requestedAt'].every(key => Object.hasOwn(value, key)) ||
      value.version !== 1 || typeof value.projectId !== 'string' || !uuid.test(value.projectId) || value.projectId !== projectId ||
      typeof value.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.contentHash) ||
      typeof value.requestedAt !== 'string' || !Number.isFinite(Date.parse(value.requestedAt)) ||
      new Date(value.requestedAt).toISOString() !== value.requestedAt) return null;
  return {...value};
}
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
}
export async function projectContentHash(model) {
  // Callers pass a validated, detached capture. Only project bookkeeping is
  // excluded; array order, IDs, connection/layout and document/resource data stay.
  const {revision, createdAt, updatedAt, ...identity} = model.project;
  const serialized = canonical({...model, project: identity});
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export function deriveContinuity({local = 'pending', projectId, contentHash = null, record = null, persisted = true} = {}) {
  const valid = validateCopyRecord(record, projectId);
  const portable = !valid ? 'unknown' : contentHash && valid.contentHash === contentHash ? 'current' : 'previous';
  const copyTime = valid ? new Intl.DateTimeFormat('es-GT', {hour: '2-digit', minute: '2-digit', hour12: false}).format(new Date(valid.requestedAt)) : '';
  const portableSummary = portable === 'unknown' ? 'Sin registro de copia en este navegador'
    : portable === 'previous' ? 'Hay cambios desde la última solicitud de copia' : 'Copia solicitada a las ' + copyTime;
  return {
    local, portable, record: valid, persisted: Boolean(persisted),
    localMessage: {
      recovering: 'Buscando una copia local…',
      new: 'Proyecto nuevo · guardado automático al editar',
      pending: 'Cambios pendientes de guardar',
      saving: 'Guardando…',
      saved: 'Guardado en este navegador',
      failed: 'Sin guardar en este navegador',
      blocked: 'No se pudo recuperar el guardado local'
    }[local] ?? 'Cambios pendientes de guardar',
    portableSummary,
    portableMessage: portable === 'current' ? portableSummary + '. Comprueba tu carpeta de descargas' : portableSummary,
    reminder: portable !== 'current'
  };
}
