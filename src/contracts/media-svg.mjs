// A closed passive geometry grammar, not an HTML sanitizer. Imported XML is
// never inserted in a DOM. Unsupported SVG remains only in the inert original.
export const svgLimits = Object.freeze({bytes: 131072, side: 1024, pixels: 1048576, nodes: 512, depth: 16,
  attributes: 4096, numbers: 16384, pathCommands: 2048, coordinate: 16384});
const fail = message => { throw new Error('SVG: ' + message); };
const numberPattern = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/;
const identity = [1, 0, 0, 1, 0, 0];
const geometry = {
  svg: ['xmlns', 'width', 'height', 'viewBox', 'version'], g: [], path: ['d'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'], circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points']
};
const common = ['fill', 'stroke', 'stroke-width', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'transform'];
const colors = new Set(['none', 'transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'gray', 'grey', 'silver', 'maroon', 'purple', 'fuchsia', 'lime', 'olive', 'navy', 'teal', 'aqua', 'orange']);
function multiply(a, b) {
  const result = [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
  if (result.some(value => !Number.isFinite(value) || Math.abs(value) > 65536)) fail('transformación acumulada fuera de límites');
  return result;
}
function escape(value) { return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;'); }

export function sanitizeSvg(input) {
  const bytes = input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : null;
  if (!bytes || !bytes.length || bytes.length > svgLimits.bytes) fail('tamaño inválido o excede 128 KiB');
  let text;
  try { text = new TextDecoder('utf-8', {fatal: true}).decode(bytes); } catch { fail('UTF-8 inválido'); }
  // Declarations, entities, comments, CDATA and processing instructions are not
  // part of this subset. In particular, do not expand entities or CSS escapes.
  if (/[&\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) || /<!|<\?/.test(text)) fail('declaraciones, entidades o controles no permitidos');
  let position = 0, nodes = 0, attributes = 0, numericCount = 0, pathCommands = 0, rootSeen = false, rootEnded = false;
  let width, height, viewBox;
  const stack = [], output = [];
  const transforms = new Map();
  function numeric(value) {
    if (++numericCount > svgLimits.numbers || value.length > 32) fail('demasiados números');
    const result = Number(value);
    if (!Number.isFinite(result) || Math.abs(result) > svgLimits.coordinate) fail('número fuera de límites');
    return result;
  }
  function tokens(value, allowCommands = false) {
    if (value.length > 65536) fail('atributo demasiado largo');
    const result = []; let cursor = 0, previousNumber = false;
    while (cursor < value.length) {
      while (/\s/.test(value[cursor] ?? '') && cursor < value.length) cursor++;
      if (cursor === value.length) break;
      if (value[cursor] === ',') {
        if (!previousNumber) fail('separador SVG inválido');
        cursor++;
        while (/\s/.test(value[cursor] ?? '') && cursor < value.length) cursor++;
        if (!numberPattern.test(value.slice(cursor))) fail('separador SVG inválido');
      }
      const match = numberPattern.exec(value.slice(cursor));
      if (match) { result.push(numeric(match[0])); cursor += match[0].length; previousNumber = true; }
      else if (allowCommands && /^[MmZzLlHhVvCcSsQqTtAa]$/.test(value[cursor])) {
        result.push(value[cursor++]); previousNumber = false;
      } else fail('valor SVG no soportado');
    }
    return result;
  }
  function numbers(value, count) {
    const result = tokens(value);
    if (!result.length || (count !== undefined && result.length !== count)) fail('cantidad de números inválida');
    return result;
  }
  function scalar(value) { return numbers(value, 1)[0]; }
  function transform(value, charge = true) {
    if (transforms.has(value)) {
      const cached = transforms.get(value);
      if (charge && (numericCount += cached.numbers) > svgLimits.numbers) fail('demasiados números');
      return cached;
    }
    const before = numericCount;
    let cursor = 0, matrix = identity, parts = [], count = 0;
    while (cursor < value.length) {
      while (/\s/.test(value[cursor] ?? '') && cursor < value.length) cursor++;
      if (cursor === value.length) break;
      const match = /^(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^()]*)\)/.exec(value.slice(cursor));
      if (!match || ++count > 16) fail('transformación no soportada');
      const name = match[1], args = numbers(match[2]); let next;
      if (name === 'matrix' && args.length === 6 && args.slice(0, 4).every(item => Math.abs(item) <= 16)) next = args;
      else if (name === 'translate' && [1, 2].includes(args.length)) next = [1, 0, 0, 1, args[0], args[1] ?? 0];
      else if (name === 'scale' && [1, 2].includes(args.length) && args.every(item => Math.abs(item) <= 16)) next = [args[0], 0, 0, args[1] ?? args[0], 0, 0];
      else if (name === 'rotate' && [1, 3].includes(args.length) && Math.abs(args[0]) <= 3600) {
        const radians = args[0] * Math.PI / 180, cosine = Math.cos(radians), sine = Math.sin(radians), x = args[1] ?? 0, y = args[2] ?? 0;
        next = [cosine, sine, -sine, cosine, x - x * cosine + y * sine, y - x * sine - y * cosine];
      } else if (['skewX', 'skewY'].includes(name) && args.length === 1 && Math.abs(args[0]) <= 80) {
        const tangent = Math.tan(args[0] * Math.PI / 180); next = name === 'skewX' ? [1, 0, tangent, 1, 0, 0] : [1, tangent, 0, 1, 0, 0];
      } else fail('parámetros de transformación inválidos');
      matrix = multiply(matrix, next); parts.push(name + '(' + args.join(' ') + ')'); cursor += match[0].length;
    }
    if (!parts.length) fail('transformación vacía');
    const result = {value: parts.join(' '), matrix, numbers: numericCount - before};
    transforms.set(value, result); transforms.set(result.value, result);
    return result;
  }
  function path(value) {
    const items = tokens(value, true);
    if (!['M', 'm'].includes(items[0])) fail('path debe comenzar con M');
    const arities = {M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0};
    let cursor = 0, x = 0, y = 0, startX = 0, startY = 0;
    const point = (px, py) => {
      if (Math.abs(px) > svgLimits.coordinate || Math.abs(py) > svgLimits.coordinate) fail('path acumulado fuera de límites');
    };
    while (cursor < items.length) {
      const command = items[cursor++];
      if (typeof command !== 'string') fail('comando path inválido');
      const code = command.toUpperCase(), relative = command !== code, arity = arities[code], start = cursor;
      while (cursor < items.length && typeof items[cursor] === 'number') cursor++;
      const count = cursor - start;
      if ((arity === 0 && count) || (arity && (!count || count % arity))) fail('argumentos path incompletos');
      if (code === 'Z') {
        if (++pathCommands > svgLimits.pathCommands) fail('comando path excesivo');
        x = startX; y = startY; continue;
      }
      for (let offset = start; offset < cursor; offset += arity) {
        if (++pathCommands > svgLimits.pathCommands) fail('comando path excesivo');
        const args = items.slice(offset, offset + arity), baseX = relative ? x : 0, baseY = relative ? y : 0;
        if (code === 'A') {
          if (args[0] < 0 || args[1] < 0 || ![0, 1].includes(args[3]) || ![0, 1].includes(args[4])) fail('arco inválido');
          x = baseX + args[5]; y = baseY + args[6];
        } else if (code === 'H') x = baseX + args[0];
        else if (code === 'V') y = baseY + args[0];
        else {
          for (let pair = 0; pair < args.length; pair += 2) point(baseX + args[pair], baseY + args[pair + 1]);
          x = baseX + args.at(-2); y = baseY + args.at(-1);
          if (code === 'M' && offset === start) { startX = x; startY = y; }
        }
        point(x, y);
      }
    }
    return items.join(' ');
  }
  function validateAttributes(tag, raw) {
    const cleaned = {}, numericAttrs = {};
    for (const [name, value] of Object.entries(raw)) {
      if (!geometry[tag].includes(name) && !common.includes(name)) fail('atributo no permitido: ' + name);
      if (name === 'xmlns') { if (value !== 'http://www.w3.org/2000/svg') fail('namespace no permitido'); cleaned[name] = value; }
      else if (name === 'version') { if (!['1.1', '2.0'].includes(value)) fail('versión SVG no soportada'); }
      else if (['fill', 'stroke'].includes(name)) {
        const color = value.toLowerCase();
        if (!colors.has(color) && !/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(color)) fail('color no permitido');
        cleaned[name] = color;
      } else if (name === 'd') cleaned[name] = path(value);
      else if (name === 'points') {
        const values = numbers(value);
        if (values.length % 2 || values.length < (tag === 'polygon' ? 6 : 4)) fail('puntos incompletos');
        cleaned[name] = values.join(' ');
      } else if (name === 'viewBox') {
        const values = numbers(value, 4);
        if (values[2] <= 0 || values[3] <= 0) fail('viewBox inválido');
        cleaned[name] = values.join(' '); viewBox = values;
      } else if (name === 'transform') cleaned[name] = transform(value).value;
      else if (name === 'fill-rule') { if (!['evenodd', 'nonzero'].includes(value)) fail('fill-rule inválido'); cleaned[name] = value; }
      else if (name === 'stroke-linecap') { if (!['butt', 'round', 'square'].includes(value)) fail('linecap inválido'); cleaned[name] = value; }
      else if (name === 'stroke-linejoin') { if (!['miter', 'round', 'bevel'].includes(value)) fail('linejoin inválido'); cleaned[name] = value; }
      else if (name === 'stroke-dasharray') {
        if (value === 'none') cleaned[name] = value;
        else { const values = numbers(value); if (values.length > 16 || values.some(item => item < 0 || item > 1024)) fail('dasharray inválido'); cleaned[name] = values.join(' '); }
      } else {
        const number = scalar(tag === 'svg' && ['width', 'height'].includes(name) ? value.replace(/px$/, '') : value);
        if (['opacity', 'fill-opacity', 'stroke-opacity'].includes(name) && (number < 0 || number > 1)) fail('opacidad inválida');
        if (['width', 'height', 'r', 'rx', 'ry', 'stroke-width', 'stroke-miterlimit'].includes(name) && number < 0) fail('dimensión negativa');
        if (['stroke-width', 'stroke-miterlimit'].includes(name) && number > 256) fail('trazo excesivo');
        numericAttrs[name] = number; cleaned[name] = String(number);
      }
    }
    for (const required of ({path: ['d'], rect: ['width', 'height'], circle: ['r'], ellipse: ['rx', 'ry'], line: ['x1', 'y1', 'x2', 'y2'], polyline: ['points'], polygon: ['points']})[tag] ?? []) if (!Object.hasOwn(raw, required)) fail('falta atributo ' + required);
    if (tag === 'svg') {
      width = numericAttrs.width ?? Math.ceil(viewBox?.[2] ?? 0); height = numericAttrs.height ?? Math.ceil(viewBox?.[3] ?? 0);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > svgLimits.side || height > svgLimits.side || width * height > svgLimits.pixels) fail('dimensiones exceden 1024×1024');
      viewBox ??= [0, 0, width, height];
      Object.assign(cleaned, {xmlns: 'http://www.w3.org/2000/svg', width: String(width), height: String(height), viewBox: viewBox.join(' ')});
    }
    return cleaned;
  }
  const skipSpace = () => { const start = position; while (position < text.length && /[\t\n\r ]/.test(text[position])) position++; return position > start; };
  const name = () => { const match = /^[A-Za-z][A-Za-z0-9-]*/.exec(text.slice(position)); if (!match) fail('nombre XML inválido'); position += match[0].length; return match[0]; };
  while (position < text.length) {
    skipSpace(); if (position === text.length) break;
    if (text[position++] !== '<' || rootEnded) fail('solo geometría XML y una raíz SVG');
    if (text[position] === '/') {
      position++; const tag = name(); skipSpace();
      if (text[position++] !== '>' || stack.at(-1)?.tag !== tag) fail('cierre XML incoherente');
      stack.pop(); output.push('</' + tag + '>'); if (!stack.length) rootEnded = true;
      continue;
    }
    const tag = name();
    if (!Object.hasOwn(geometry, tag) || ++nodes > svgLimits.nodes || stack.length >= svgLimits.depth ||
        (!rootSeen && tag !== 'svg') || (rootSeen && tag === 'svg') || (stack.length && !['svg', 'g'].includes(stack.at(-1).tag))) fail('nodo SVG no permitido');
    rootSeen = true;
    const raw = {}; let selfClosing = false;
    while (true) {
      const separated = skipSpace();
      if (text.slice(position, position + 2) === '/>') { position += 2; selfClosing = true; break; }
      if (text[position] === '>') { position++; break; }
      if (!separated || ++attributes > svgLimits.attributes) fail('atributos XML inválidos o excesivos');
      const attribute = name(); if (Object.hasOwn(raw, attribute)) fail('atributo duplicado');
      skipSpace(); if (text[position++] !== '=') fail('falta = en atributo'); skipSpace();
      const quote = text[position++]; if (!['"', "'"].includes(quote)) fail('atributo sin comillas');
      const end = text.indexOf(quote, position);
      if (end < 0 || text.slice(position, end).includes('<')) fail('atributo XML truncado');
      raw[attribute] = text.slice(position, end); position = end + 1;
    }
    const attrs = validateAttributes(tag, raw);
    const matrix = multiply(stack.at(-1)?.matrix ?? identity, attrs.transform ? transform(attrs.transform, false).matrix : identity);
    const serialized = Object.entries(attrs).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => ' ' + key + '="' + escape(value) + '"').join('');
    output.push('<' + tag + serialized + (selfClosing ? '/>' : '>'));
    if (!selfClosing) stack.push({tag, matrix}); else if (!stack.length) rootEnded = true;
  }
  if (!rootSeen || !rootEnded || stack.length) fail('SVG incompleto');
  const sanitized = new TextEncoder().encode(output.join(''));
  if (sanitized.length > svgLimits.bytes) fail('SVG normalizado demasiado grande');
  return {bytes: sanitized, width, height, viewBox: [...viewBox]};
}
