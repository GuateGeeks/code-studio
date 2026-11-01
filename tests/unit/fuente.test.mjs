import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';

const juegos = readdirSync('games').filter(nombre => statSync(`games/${nombre}`).isDirectory());
const leer = (id, archivo) => readFileSync(`games/${id}/${archivo}`, 'utf8');
// Text between the brackets that open at `desde` (the index of the opener), strings respected.
function cuerpo(codigo, desde) {
  let profundidad = 0;
  let cadena = false;
  for (let i = desde; i < codigo.length; i++) {
    const c = codigo[i];
    if (cadena) {
      if (c === '\\') i++;
      else if (c === '"') cadena = false;
    } else if (c === '"') cadena = true;
    else if (c === '(' || c === '[') profundidad++;
    else if (c === ')' || c === ']') {
      profundidad--;
      if (profundidad === 0) return codigo.slice(desde + 1, i);
    }
  }
  throw new Error('paréntesis sin cerrar');
}

// Splits at the commas of the top level, so nested calls, brackets and strings stay whole.
function separar(texto) {
  const partes = [''];
  let profundidad = 0;
  let cadena = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (cadena) {
      if (c === '\\') partes[partes.length - 1] += c + texto[++i];
      else {
        if (c === '"') cadena = false;
        partes[partes.length - 1] += c;
      }
      continue;
    }
    if (c === '"') cadena = true;
    else if (c === '(' || c === '[') profundidad++;
    else if (c === ')' || c === ']') profundidad--;
    if (c === ',' && profundidad === 0) partes.push('');
    else partes[partes.length - 1] += c;
  }
  return partes.map(parte => parte.trim()).filter(parte => parte !== '');
}

// Arguments of every call to `nombre(`.
const llamadas = (codigo, nombre) => [...codigo.matchAll(new RegExp(nombre.replace(/[.(]/g, '\\$&'), 'g'))]
  .map(m => separar(cuerpo(codigo, m.index + nombre.length - 1)));

const literal = texto => texto.match(/^"((?:[^"\\]|\\.)*)"$/)?.[1];

// The strings of a top-level `const NOMBRE = [...]`, or null when there is no such array.
function arreglo(codigo, nombre) {
  const m = codigo.match(new RegExp(`^(?:export )?const ${nombre}(?:: [^=]+)? = \\[`, 'm'));
  return m ? separar(cuerpo(codigo, m.index + m[0].length - 1)).map(literal) : null;
}

// The options an `elegir` can show: its own strings, plus every string of the constant arrays it indexes or passes by name.
// What cannot be resolved is returned apart, so the test fails instead of skipping it.
function opcionesDe(codigo, lista) {
  const textos = [];
  const sinResolver = [];
  const elementos = lista.startsWith('[') ? separar(cuerpo(lista, 0)) : [lista];
  for (const elemento of elementos) {
    const nombre = elemento.match(/^(\w+)(?:\[.*\])?$/)?.[1];
    const valores = literal(elemento) !== undefined ? [literal(elemento)] : nombre ? arreglo(codigo, nombre) : null;
    if (valores && !valores.includes(undefined)) textos.push(...valores);
    else sinResolver.push(elemento);
  }
  // A list passed by name has as many options as the array; a list written out, as many as elements.
  return {textos, sinResolver, cuenta: lista.startsWith('[') ? elementos.length : textos.length};
}

const plantilla = JSON.parse(readFileSync('libs/blocksprj/pxt.json', 'utf8'));

test('hay al menos un juego con carpeta', () => {
  assert.ok(juegos.length >= 1);
});

for (const id of juegos) {
  const codigo = leer(id, 'main.ts');

  const textos = [...codigo.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map(m => m[1]);

  test(`${id}: sin Í mayúscula ni textos todo en mayúsculas`, () => {
    // At font8 size, Í reads as «f». The other capitals with accent are clear.
    assert.deepEqual(textos.filter(texto => texto.includes('Í')), []);
    assert.deepEqual(textos.filter(texto => /\p{Lu}{2,}\s+\p{Lu}{2,}/u.test(texto)), []);
  });

  test(`${id}: las opciones de elegir caben en su panel`, () => {
    for (const argumentos of llamadas(codigo, 'experiencias.elegir(')) {
      const [, lista, eje] = argumentos;
      const {textos, sinResolver, cuenta} = opcionesDe(codigo, lista);
      assert.deepEqual(sinResolver, [], `elegir con opciones que la prueba no puede medir: ${lista}`);
      if (eje === 'EjeEleccion.Vertical') {
        // Vertical options are not wrapped: one line, less the two characters of the marker.
        for (const opcion of textos) assert.ok(opcion.length <= 44, `Opción larga: ${opcion}`);
      } else {
        const ancho = Math.floor((Math.floor(296 / cuenta) - 12) / 6);
        for (const palabra of textos.flatMap(opcion => opcion.split(' '))) assert.ok(palabra.length <= ancho, `Palabra larga: ${palabra}`);
      }
    }
  });

  test(`${id}: sayText sin tiempo`, () => {
    // PXT keeps sayEndTime when a later sayText has no time, so the next bubble is erased on its first frame.
    for (const argumentos of llamadas(codigo, '.sayText(')) assert.equal(argumentos.length, 1, `sayText con tiempo: ${argumentos.join(', ')}`);
  });

  test(`${id}: todo for tiene la forma permitida`, () => {
    const todos = codigo.match(/\bfor\s*\(/g) ?? [];
    const permitidos = codigo.match(/\bfor \(let \w+ = 0; \w+ < [^;]+; \w+\+\+\)/g) ?? [];
    assert.equal(permitidos.length, todos.length);
  });

  test(`${id}: sin APIs prohibidas`, () => {
    for (const api of ['askForString', 'drawLine', 'game.over', '.charAt(', '.onButtonEvent(']) assert.equal(codigo.includes(api), false, api);
  });

  test(`${id}: sin if de una línea con llamada`, () => {
    assert.doesNotMatch(codigo, /^\s*if \(.+\) [^{\s].*\)\s*$/m);
  });

  test(`${id}: sin variables que difieran solo en mayúsculas`, () => {
    // Blockly does not tell variables apart by case, so the copy turned to Blocks would merge them: `tipo` and `TIPO` become one.
    const nombres = new Set([
      ...[...codigo.matchAll(/\b(?:let|const) (\w+)/g)].map(m => m[1]),
      ...[...codigo.matchAll(/\bfunction \w*\(([^)]*)\)/g)].flatMap(m => m[1].split(',').map(parametro => parametro.split(':')[0].trim()).filter(Boolean))
    ]);
    const porMinuscula = Map.groupBy([...nombres], nombre => nombre.toLowerCase());
    const choques = [...porMinuscula.values()].filter(grupo => grupo.length > 1);
    assert.deepEqual(choques, []);
  });

  test(`${id}: sin let local con valor por defecto`, () => {
    // The decompiler lifts locals to globals and drops `= false`, `= 0`, `= ""` and `= []`. The copy would then keep
    // the value of the last visit. A global declared once, and `x = false` written inside the function, survive.
    const perdidas = codigo.split('\n').map((linea, i) => ({linea, numero: i + 1}))
      .filter(({linea}) => /^\s+let \w+(?:: [^=]+)? = (?:false|0|""|\[\])\s*$/.test(linea))
      .map(({linea, numero}) => `${numero}: ${linea.trim()}`);
    assert.deepEqual(perdidas, []);
  });

  test(`${id}: dependencias iguales a la plantilla`, () => {
    const dependencias = JSON.parse(leer(id, 'pxt.json')).dependencies;
    assert.deepEqual(Object.keys(dependencias).sort(), Object.keys(plantilla.dependencies).sort());
    for (const [nombre, valor] of Object.entries(dependencias)) assert.equal(valor, `file:../../libs/${nombre}`);
  });

  test(`${id}: un solo archivo de código`, () => {
    const config = JSON.parse(leer(id, 'pxt.json'));
    assert.deepEqual(config.files, ['main.ts']);
    assert.equal(config.name, id);
  });
}
