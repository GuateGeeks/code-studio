import {parse} from 'acorn';
const prefixes = ['/app/', '/vendor/', '/blockly-media/'];
const files = new Set(['/style.css', '/stage.css', '/simulator.css', '/editor.bundle.js', '/shell.js', '/runner.js', '/simulator.js', '/disable-embed.js',
  '/config.json', '/editable.blocks.json', '/project-catalog.json', '/project.json', '/program-resources.json', '/corpus.json', '/board.json', '/compiler-pack.json',
  '/compiler-worker.js', '/loop-worker.js']);
export function rewritePath(value, base) {
  return typeof value === 'string' && (files.has(value) || prefixes.some(prefix => value.startsWith(prefix))) ? base + value.slice(1) : value;
}
function memberName(node) { return node?.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier' ? node.property.name : null; }
function isURLValue(node, parent) {
  if (!parent) return false;
  if (['ImportExpression', 'ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(parent.type)) return parent.source === node;
  if (parent.type === 'CallExpression' && parent.arguments.includes(node)) {
    const callee = parent.callee;
    if (callee.type === 'Identifier' && ['fetch', 'importScripts'].includes(callee.name)) return true;
    if (['fetch', 'importScripts'].includes(memberName(callee)) && callee.object.type === 'Identifier' &&
        ['window', 'self', 'globalThis'].includes(callee.object.name)) return true;
  }
  if (parent.type === 'NewExpression' && parent.arguments[0] === node &&
      parent.callee.type === 'Identifier' && ['Worker', 'SharedWorker', 'Request', 'URL'].includes(parent.callee.name)) return true;
  // These reviewed defaults are URLs consumed indirectly by owned runtimes.
  if (parent.type === 'AssignmentPattern' && parent.right === node &&
      parent.left.type === 'Identifier' && ['indexURL', 'wasmLocation'].includes(parent.left.name)) return true;
  if (parent.type === 'Property' && parent.value === node && !parent.computed &&
      ['media', 'indexURL', 'wasmLocation', 'publicPath'].includes(parent.key.name ?? parent.key.value)) return true;
  // Webpack runtime publicPath is a URL base, unlike virtual filesystem keys.
  return parent.type === 'AssignmentExpression' && parent.right === node && memberName(parent.left) === 'p' &&
    parent.left.object.type === 'Identifier' && parent.left.object.name === '__webpack_require__';
}
export function rewriteJavaScript(text, base) {
  let ast;
  try { ast = parse(text, {ecmaVersion: 'latest', sourceType: 'module', allowReturnOutsideFunction: true}); }
  catch (error) { throw new Error('Cannot parse release JavaScript: ' + error.message); }
  const edits = [], pending = [{node: ast, parent: null}];
  while (pending.length) {
    const {node, parent} = pending.pop();
    if (isURLValue(node, parent)) {
      const value = node.type === 'Literal' && typeof node.value === 'string' ? node.value
        : node.type === 'TemplateLiteral' && node.expressions.length === 0 ? node.quasis[0].value.cooked : null;
      const next = rewritePath(value, base);
      if (next !== value) edits.push([node.start, node.end, JSON.stringify(next)]);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) for (const child of value) { if (child && typeof child.type === 'string') pending.push({node: child, parent: node}); }
      else if (value && typeof value.type === 'string') pending.push({node: value, parent: node});
    }
  }
  for (const [start, end, replacement] of edits.sort((a, b) => b[0] - a[0])) text = text.slice(0, start) + replacement + text.slice(end);
  return text;
}
export function rewriteHTML(text, base) {
  return text.replace(/\b(src|href)=(["'])([^"']*)\2/g, (match, name, quote, path) => name + '=' + quote + rewritePath(path, base) + quote);
}
export function rewriteAsset(path, bytes, base) {
  const text = bytes.toString('utf8');
  if (/\.(?:js|mjs)$/.test(path)) return Buffer.from(rewriteJavaScript(text, base));
  if (/\.html$/.test(path)) return Buffer.from(rewriteHTML(text, base));
  return bytes;
}
