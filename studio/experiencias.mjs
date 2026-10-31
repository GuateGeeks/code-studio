import {readExperiencia} from './identity.mjs';

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

// CNB areas in the order the catalog shows them, with the names the curriculum gives them.
const AREAS = [
  ['mat', 'Matemáticas'], ['cnt', 'Ciencias Naturales y Tecnología'], ['ccss', 'Ciencias Sociales'],
  ['l1', 'Comunicación y Lenguaje L 1'], ['l3', 'Comunicación y Lenguaje L 3'], ['art', 'Expresión Artística'],
  ['ef', 'Educación Física'], ['fc', 'Formación Ciudadana'], ['pyd', 'Productividad y Desarrollo']
];

export async function loadCatalog(get = fetch) {
  const response = await get('games/catalogo.json');
  if (!response.ok) throw new Error(`Catálogo: ${response.status}`);
  return response.json();
}

export function groupByArea(catalog) {
  const known = AREAS.map(([area, nombre]) => ({area, nombre, juegos: catalog.filter(entry => entry.area === area)}));
  // A game of an area this list does not know must still be offered, not lost.
  const strays = catalog.filter(entry => !AREAS.some(([area]) => area === entry.area));
  const groups = known.filter(group => group.juegos.length);
  return strays.length ? [...groups, {area: 'otras', nombre: 'Otras', juegos: strays}] : groups;
}

const STUDENT_KEY = 'gg-estudiante';

export function rememberStudent(storage, name) {
  try {
    storage.setItem(STUDENT_KEY, name);
  } catch { /* without storage, the student picks again from the list */ }
}

export function recallStudent(storage, known) {
  try {
    const name = storage.getItem(STUDENT_KEY);
    return known.includes(name) ? name : null;
  } catch {
    return null;
  }
}

// The address comes from outside, so only values of the expected shape survive.
export function parseEntry(search) {
  const params = new URLSearchParams(search);
  const entry = {};
  if (params.get('pantalla') === 'experiencias') entry.pantalla = 'experiencias';
  const ver = params.get('ver');
  if (ver && /^[a-z0-9-]+$/.test(ver)) entry.ver = ver;
  return entry;
}

// The copy of an experience is the newest undeleted project carrying its mark. The name is the
// student's to change, and a mission or another project may share it.
export function findCopy(records, id) {
  return records
    .filter(record => !record.project.header.isDeleted && readExperiencia(record.project) === id)
    .sort((a, b) => b.at - a.at)[0];
}
