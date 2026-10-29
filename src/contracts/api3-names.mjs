// Identifiers valid in both JavaScript and Python for API v3 text (ADR-011).
// JavaScript and Python keywords and common builtins: never valid API names.
export const api3LanguageKeywords = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'await', 'enum', 'static', 'null', 'true', 'false', 'undefined', 'NaN', 'Infinity', 'and', 'as', 'assert', 'async', 'def', 'del', 'elif', 'except', 'from', 'global', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'None', 'True', 'False', 'print', 'input', 'range', 'len', 'list', 'str', 'int', 'float', 'type']);
// API v3 names and loop counters: not available as variable names.
const api3ApiNames = ['GG', 'ctx', 'hero', 'shared', 'scene', 'app', 'event', 'wait', 'broadcastAndWait', 'createClone', 'deleteClone', 'playSound', 'playSoundUntilDone', 'stopSounds', 'onStart', 'onKey', 'onMessage', 'stopAll', 'waitUntil', 'stop_all', 'wait_until', 'i', 'j', 'k'];
export const api3Keywords = new Set([...api3LanguageKeywords, ...api3ApiNames]);
export function api3Identifier(name, taken = new Set()) {
  let base = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'variable';
  if (/^[0-9]/.test(base)) base = 'v_' + base;
  if (api3Keywords.has(base)) base = base + '_';
  let candidate = base, suffix = 2;
  while (taken.has(candidate)) candidate = `${base}_${suffix++}`;
  taken.add(candidate);
  return candidate;
}
