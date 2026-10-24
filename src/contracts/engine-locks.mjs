// Engine versions a GGPROJ declares in `locks`. Data only: no engine imports.
// The current set is written on save; every set ever published stays in the
// history so projects saved by earlier releases keep opening (ADR-011).
export const currentEngineLocks = Object.freeze({blockly: '13.4.0', ir: 0, adapter: 'scratch-2d-v0', scratch: '12.3.1', scratchAudio: '2.0.268'});

// Append the previous set here when an engine is upgraded; never remove one.
export const engineLockHistory = Object.freeze([currentEngineLocks]);

function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
}

export function isCompatibleEngineLocks(locks, {current = currentEngineLocks, history = engineLockHistory} = {}) {
  const declared = canonical(locks);
  return declared === canonical(current) || history.some(item => canonical(item) === declared);
}

// Names the first declared engine the current release does not recognise.
export function describeUnsupportedEngineLocks(locks, {current = currentEngineLocks, history = engineLockHistory} = {}) {
  const known = [current, ...history];
  if (!locks || typeof locks !== 'object' || Array.isArray(locks)) return 'motores sin declarar';
  const unknown = Object.entries(locks).filter(([key, value]) => !known.some(item => Object.hasOwn(item, key) && item[key] === value));
  if (unknown.length) return unknown.map(([key, value]) => `${key} ${JSON.stringify(value)}`).join(', ');
  const missing = Object.keys(current).filter(key => !Object.hasOwn(locks, key));
  return missing.length ? `faltan ${missing.join(', ')}` : 'combinación de motores no publicada';
}
