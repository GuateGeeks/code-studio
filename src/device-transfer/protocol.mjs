import {validateDeviceScope, validateFirmwareHex} from '../contracts/device-runtime.mjs';

export const transferVersion = 1;
export function exact(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new Error('Mensaje de transferencia inválido');
}
export function validateNonce(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value)) throw new Error('Canal de transferencia inválido');
  return value;
}
export function validateArtifact(value) {
  exact(value, ['scope', 'variant', 'hex', 'sha256', 'compilerPackHash']);
  const scope = validateDeviceScope(value.scope);
  if (![value.sha256, value.compilerPackHash].every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash))) throw new Error('Identidad del firmware inválida');
  validateFirmwareHex(value.hex, {variant: value.variant});
  // Pinned DAPjs classifies the first 100 bytes. Real PXT firmware is larger;
  // reject tiny HEX stubs before a selector rather than padding signed bytes.
  if (new TextEncoder().encode(value.hex).length < 100) throw new Error('Firmware demasiado corto para WebUSB; usa la descarga HEX');
  return {scope, variant: value.variant, hex: value.hex, sha256: value.sha256, compilerPackHash: value.compilerPackHash};
}
export async function verifyArtifact(value, crypto = globalThis.crypto) {
  const artifact = validateArtifact(value);
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(artifact.hex))), byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== artifact.sha256) throw new Error('El firmware no coincide con su hash');
  return artifact;
}
