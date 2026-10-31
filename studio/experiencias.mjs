// Pure logic of the experiences. What a game sends is untrusted: only known fields and values pass.
export const CANAL = 'gg-experiencia';

const MAX_BYTES = 2048;
const LISTAS = {
  fase: ['explorar', 'construir', 'aplicar', 'comprobar', 'reflexionar'],
  serie: ['A', 'B'],
  espera: ['ninguna', 'dialogo', 'eleccion', 'confirmar', 'final']
};
const ENTEROS = ['aciertos', 'total', 'paso', 'avisos'];
const BOOLEANOS = ['aprobado', 'final'];
export const CAMPOS = [...Object.keys(LISTAS), ...ENTEROS, ...BOOLEANOS];

export function gameById(catalog, id) {
  if (typeof id !== 'string') return null;
  return catalog.find(entry => entry.id === id) ?? null;
}

export const playerUrl = id => `player.html?juego=${encodeURIComponent(id)}`;

export function parseEstado(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > MAX_BYTES) return null;
  let raw;
  try {
    raw = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
  } catch {
    return null;
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const estado = {};
  for (const [campo, lista] of Object.entries(LISTAS)) if (lista.includes(raw[campo])) estado[campo] = raw[campo];
  for (const campo of ENTEROS) if (Number.isSafeInteger(raw[campo]) && raw[campo] >= 0) estado[campo] = raw[campo];
  for (const campo of BOOLEANOS) if (typeof raw[campo] === 'boolean') estado[campo] = raw[campo];
  return estado;
}

export function reflectEstado(element, estado) {
  for (const [campo, valor] of Object.entries(estado)) element.dataset[campo] = String(valor);
}

export function clearEstado(element) {
  for (const campo of CAMPOS) delete element.dataset[campo];
}
