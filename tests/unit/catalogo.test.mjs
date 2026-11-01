import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const catalogo = JSON.parse(readFileSync('games/catalogo.json', 'utf8'));
const cnb = new Set(JSON.parse(readFileSync('tests/fixtures/cnb-sexto-ids.json', 'utf8')));
const MECANICAS = ['moverse', 'ordenar', 'clasificar', 'decidir', 'leer'];

test('el fixture del CNB tiene 834 ids únicos', () => {
  assert.equal(cnb.size, 834);
});

test('hay 12 entradas con id único', () => {
  assert.equal(catalogo.length, 12);
  assert.equal(new Set(catalogo.map(juego => juego.id)).size, 12);
});

test('cada entrada trae todos sus campos', () => {
  for (const juego of catalogo) {
    for (const campo of ['id', 'titulo', 'area', 'situacion', 'mecanica', 'resultado']) assert.equal(typeof juego[campo], 'string', `${juego.id}.${campo}`);
    assert.match(juego.id, /^[a-z0-9-]+$/);
    assert.ok(MECANICAS.includes(juego.mecanica), juego.id);
    assert.ok(juego.contenidos.length > 0, juego.id);
  }
});

test('cumple las cuotas por área', () => {
  const cuenta = area => catalogo.filter(juego => juego.area === area).length;
  for (const area of ['mat', 'cnt', 'ccss']) assert.ok(cuenta(area) >= 2, area);
  assert.ok(cuenta('l1') + cuenta('l3') >= 2, 'idioma');
  for (const area of ['art', 'ef', 'fc', 'pyd']) assert.ok(cuenta(area) >= 1, area);
});

test('L 2 queda fuera', () => {
  assert.equal(catalogo.some(juego => juego.area === 'l2' || juego.contenidos.some(id => id.startsWith('l2:'))), false);
});

test('hay 25 contenidos y todos existen en el CNB', () => {
  const todos = catalogo.flatMap(juego => juego.contenidos);
  assert.equal(todos.length, 25);
  for (const id of todos) assert.ok(cnb.has(id), id);
});

test('area coincide con el prefijo de sus contenidos', () => {
  for (const juego of catalogo) for (const id of juego.contenidos) assert.equal(id.split(':')[0], juego.area, juego.id);
});

test('Rescate y Cuentas declaran que repiten Sócrates, y solo ellos', () => {
  const repiten = catalogo.filter(juego => juego.repiteSocrates === true).map(juego => juego.id);
  assert.deepEqual(repiten, ['rescate-plano', 'cuentas-mayas']);
});

test('las mecánicas cubren 1,5,8 / 2 / 4,7,10 / 3,6,11,12 / 9', () => {
  const de = mecanica => catalogo.flatMap((juego, i) => (juego.mecanica === mecanica ? [i + 1] : []));
  assert.deepEqual(de('moverse'), [1, 5, 8]);
  assert.deepEqual(de('ordenar'), [2]);
  assert.deepEqual(de('clasificar'), [4, 7, 10]);
  assert.deepEqual(de('decidir'), [3, 6, 11, 12]);
  assert.deepEqual(de('leer'), [9]);
});

// Result of reading each game against the text of its contents. A content left out is fully covered.
const COBERTURA = {
  'cuentas-mayas': {'mat:4.1.5': 'parcial', 'mat:4.1.7': 'parcial'},
  'vecinos-bosque': {'cnt:1.5.7': 'parcial'},
  'comunidad-preparada': {'ccss:1.3.1': 'parcial', 'ccss:1.3.2': 'parcial'},
  'detective-noticias': {'l1:4.3.2': 'parcial'},
  'lee-marimba': {'art:1.1.1': 'parcial', 'art:1.1.2': 'parcial'},
  'mediacion-recreo': {'fc:4.3.1': 'parcial', 'fc:4.3.2': 'parcial'},
  'puesto-feria': {'pyd:4.3.1': 'no cubre'},
};

test('el catálogo declara la cobertura que dio el cotejo con el CNB', () => {
  const declarada = Object.fromEntries(catalogo.filter(juego => juego.cobertura).map(juego => [juego.id, juego.cobertura]));
  assert.deepEqual(declarada, COBERTURA);
});

test('cada cobertura nombra un contenido del juego', () => {
  for (const juego of catalogo) {
    for (const [id, valor] of Object.entries(juego.cobertura ?? {})) {
      assert.ok(juego.contenidos.includes(id), `${juego.id} ${id}`);
      assert.ok(['parcial', 'no cubre'].includes(valor), `${juego.id} ${id}`);
    }
  }
});

test('la ficha dice la misma cobertura que el catálogo', () => {
  const fichas = readFileSync('docs/EXPERIENCIAS.md', 'utf8').split(/^## /m);
  for (const juego of catalogo) {
    const ficha = fichas.find(parte => parte.split('\n')[0].endsWith(`. ${juego.titulo}`));
    assert.ok(ficha, juego.titulo);
    const linea = ficha.split('\n').find(texto => texto.startsWith('- **Cobertura:**'));
    assert.ok(linea, `${juego.id} no tiene línea de cobertura`);
    if (!juego.cobertura) assert.ok(linea.startsWith('- **Cobertura:** Completa.'), `${juego.id}: ${linea}`);
    for (const id of juego.contenidos) {
      const valor = juego.cobertura?.[id];
      if (valor) assert.ok(linea.includes(`\`${id}\`: ${valor}.`), `${juego.id} ${id}: ${linea}`);
      else assert.ok(!linea.includes(`\`${id}\`: `), `${juego.id} ${id}: ${linea}`);
    }
  }
});

test('cada entrada tiene su carpeta y su solución', () => {
  for (const {id} of catalogo) {
    for (const archivo of ['main.ts', 'pxt.json', 'solucion.json']) assert.ok(existsSync(`games/${id}/${archivo}`), `games/${id}/${archivo}`);
  }
});

test('cada juego tiene ficha con sus contenidos', () => {
  const ficha = readFileSync('docs/EXPERIENCIAS.md', 'utf8');
  for (const juego of catalogo) {
    assert.ok(ficha.includes(juego.titulo), juego.titulo);
    for (const id of juego.contenidos) assert.ok(ficha.includes(id), `${juego.id} ${id}`);
  }
  assert.ok(ficha.includes('CC BY-SA 4.0'), 'CC BY-SA 4.0');
});
