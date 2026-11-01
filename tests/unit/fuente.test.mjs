import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';

const juegos = readdirSync('games').filter(nombre => statSync(`games/${nombre}`).isDirectory());
const leer = (id, archivo) => readFileSync(`games/${id}/${archivo}`, 'utf8');
// Arguments of every call to `nombre(`, split at the top level (strings and nested calls respected).
function llamadas(codigo, nombre) {
  const encontradas = [];
  for (let desde = codigo.indexOf(nombre); desde !== -1; desde = codigo.indexOf(nombre, desde + 1)) {
    let profundidad = 1;
    let cadena = false;
    let argumentos = [''];
    for (let i = desde + nombre.length; i < codigo.length && profundidad > 0; i++) {
      const c = codigo[i];
      if (cadena) {
        if (c === '\\') argumentos[argumentos.length - 1] += c + codigo[++i];
        else {
          if (c === '"') cadena = false;
          argumentos[argumentos.length - 1] += c;
        }
        continue;
      }
      if (c === '"') cadena = true;
      else if (c === '(' || c === '[') profundidad++;
      else if (c === ')' || c === ']') profundidad--;
      if (profundidad === 0) break;
      if (c === ',' && profundidad === 1) argumentos.push('');
      else argumentos[argumentos.length - 1] += c;
    }
    encontradas.push(argumentos.map(a => a.trim()));
  }
  return encontradas;
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
    for (const [linea] of codigo.matchAll(/^.*experiencias\.elegir\(.*$/gm)) {
      const lista = linea.match(/\[(.*)\]/);
      assert.ok(lista, `elegir debe llevar sus opciones en una línea: ${linea}`);
      const opciones = [...lista[1].matchAll(/"([^"]*)"/g)].map(m => m[1]);
      if (linea.includes('EjeEleccion.Vertical')) {
        // Vertical options are not wrapped: one line, less the two characters of the marker.
        for (const opcion of opciones) assert.ok(opcion.length <= 44, `Opción larga: ${opcion}`);
      } else {
        const ancho = Math.floor((Math.floor(296 / opciones.length) - 12) / 6);
        for (const palabra of opciones.flatMap(opcion => opcion.split(' '))) assert.ok(palabra.length <= ancho, `Palabra larga: ${palabra}`);
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
