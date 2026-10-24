import {validateTextRuntime} from '../text-documents.mjs';
// Owned language wire/data contract. No DOM or interpreter imports.
import {validateCapabilityRPC} from './capability-language.mjs';
import {validateTextProgramRPC} from './text-program.mjs';
export const languageRuntimeLimits = Object.freeze({
  sourceBytes: 65536, rpcBytes: 16384, pendingRPC: 64, logs: 100,
  message: 1024, executionMs: 120000, turnMs: 300, memoryBytes: 32 * 1024 * 1024, stackBytes: 512 * 1024
});
const encoder = new TextEncoder();
const fail = message => { throw new Error(`GG language: ${message}`); };
const text = (value, maximum) => typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
const documentId = value => typeof value === 'string' && /^text-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
function object(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Object.keys(value).length !== fields.length || fields.some(field => !Object.hasOwn(value, field))) fail('invalid object fields');
}
function number(value, maximum) { if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > maximum) fail('invalid numeric argument'); }
export function validateLanguageDocument(document) {
  object(document, ['id', 'name', 'language', 'source', 'runtime']);
  if (!documentId(document.id) || !text(document.name, 80) || /[\u0000-\u001f\u007f]/.test(document.name)) fail('invalid document identity');
  if (!['javascript', 'python'].includes(document.language) || typeof document.source !== 'string' || encoder.encode(document.source).length > languageRuntimeLimits.sourceBytes) fail('invalid language or source size');
  // Same runtime rules as GGPROJ: compatible interpreter versions, optional declared API (ADR-011).
  validateTextRuntime(document.language, document.runtime, () => fail('unsupported runtime lock'));
  return structuredClone(document);
}
export function validateLanguageScope(scope) {
  object(scope, ['runnerSessionId', 'revision', 'documentId']);
  if (!text(scope.runnerSessionId, 128) || !documentId(scope.documentId) || !Number.isSafeInteger(scope.revision) || scope.revision < 0) fail('invalid execution scope');
  return {...scope};
}
const arities = Object.freeze({'scene.get': 0, 'sprite.get': 1, 'sprite.move': 2, 'sprite.setPosition': 2, 'variables.get': 1, 'variables.set': 2, 'events.emit': 1});
export function validateLanguageRPC(method, args, {profile} = {}) {
  if(profile)return validateCapabilityRPC(method,args,profile);
  if (typeof method === 'string' && method.startsWith('program.')) return validateTextProgramRPC(method, args);
  if (!Object.hasOwn(arities, method) || !Array.isArray(args) || args.length !== arities[method]) fail('unsupported RPC method or arity');
  if (method.startsWith('sprite.') && args[0] !== 'hero') fail('unknown sprite');
  if (method === 'sprite.move') number(args[1], 480);
  if (method === 'sprite.setPosition') { object(args[1], ['x', 'y']); number(args[1].x, 240); number(args[1].y, 180); }
  if (method.startsWith('variables.') && (!text(args[0], 128) || ['__proto__', 'prototype', 'constructor'].includes(args[0]))) fail('invalid variable ID');
  if (method === 'variables.set') number(args[1], 1000000);
  if (method === 'events.emit' && !text(args[0], 64)) fail('invalid event name');
  if (encoder.encode(JSON.stringify({method, args})).length > languageRuntimeLimits.rpcBytes) fail('RPC size limit');
  return {method, args: structuredClone(args)};
}
export function validateLanguageWait(seconds) {
  number(seconds, 60);
  if (seconds < 0) fail('negative wait');
  return seconds;
}
export function createLanguageChannelGate({languageSessionId}) {
  if (!text(languageSessionId, 128)) fail('invalid language session');
  let sequence = -1;
  return Object.freeze({
    accept(message) {
      if (!message || typeof message !== 'object' || Array.isArray(message) ||
          message.protocolVersion !== 1 || message.languageSessionId !== languageSessionId ||
          !Number.isSafeInteger(message.seq) || message.seq < 0 || message.seq <= sequence) return false;
      sequence = message.seq;
      return true;
    }
  });
}
export function languageDiagnostic(error, document, code = 'LANGUAGE_ERROR') {
  const message = String(error?.message ?? error ?? 'Error de ejecución').slice(0, languageRuntimeLimits.message);
  const stack = String(error?.stack ?? '').slice(0, 8192);
  const filename = document.language === 'javascript' ? 'document.js' : 'document.py';
  const pattern = document.language === 'javascript' ? /document\.js:(\d+)(?::(\d+))?/g : /File "document\.py", line (\d+)/g;
  const matches = [...stack.matchAll(pattern)];
  const match = matches.at(-1);
  const line = Number(error?.lineNumber ?? match?.[1]);
  const column = Number(error?.columnNumber ?? match?.[2]);
  const location = Number.isSafeInteger(line) && line > 0 && line <= document.source.split('\n').length
    ? {documentId: document.id, line, ...(Number.isSafeInteger(column) && column > 0 && column <= 1000000 ? {column} : {})} : null;
  return {level: 'error', code, message: message || `Error en ${filename}`, origin: document.language,
    ...(location ? {sourceLocation: location} : {})};
}
