import {validateCapabilities} from './packs.mjs';
import {validateResourceView} from './resources.mjs';
import {validateScene2DTextOwner} from './scene2d-identifiers.mjs';

const plain = value => value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
export function validateCodeViewRequest(input) {
  const fail = message => { throw Object.assign(new Error(message), {code: 'CV_REQUEST', lineNumber: 1, columnNumber: 1}); };
  if (!plain(input) || Object.keys(input).some(key => !['language','source','capabilities','resourceView','variableIds','variableNames','owner'].includes(key)))
    fail('Solicitud de conversión inválida.');
  if (!['javascript','python'].includes(input.language)) fail('Esta vista todavía no admite conversión en este contexto.');
  if (typeof input.source !== 'string' || new TextEncoder().encode(input.source).length > 65536)
    fail('El texto supera el límite de conversión.');
  if (new TextEncoder().encode(JSON.stringify(input)).length > 262144) fail('La solicitud supera el límite de conversión.');
  for (const key of ['variableIds','variableNames']) if (input[key] !== undefined) {
    if (!plain(input[key]) || Object.keys(input[key]).length > 16 ||
        Object.entries(input[key]).some(([name,value]) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ||
          typeof value !== 'string' || !value.trim() || value.length > 128)) fail('Metadatos de variables inválidos.');
  }
  if (input.owner !== undefined) validateScene2DTextOwner(input.owner, fail);
  if (input.capabilities != null) validateCapabilities(input.capabilities);
  if (input.resourceView != null) validateResourceView(input.resourceView);
  return structuredClone(input);
}
export const codeViewProtocol = Object.freeze({version: 1, responseBytes: 262144});
