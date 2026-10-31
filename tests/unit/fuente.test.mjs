import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';

const juegos = readdirSync('games').filter(nombre => statSync(`games/${nombre}`).isDirectory());
const leer = (id, archivo) => readFileSync(`games/${id}/${archivo}`, 'utf8');
const plantilla = JSON.parse(readFileSync('libs/blocksprj/pxt.json', 'utf8'));

test('hay al menos un juego con carpeta', () => {
  assert.ok(juegos.length >= 1);
});

for (const id of juegos) {
  const codigo = leer(id, 'main.ts');

  test(`${id}: todo for tiene la forma permitida`, () => {
    const todos = codigo.match(/\bfor\s*\(/g) ?? [];
    const permitidos = codigo.match(/\bfor \(let \w+ = 0; \w+ < [^;]+; \w+\+\+\)/g) ?? [];
    assert.equal(permitidos.length, todos.length);
  });

  test(`${id}: sin APIs prohibidas`, () => {
    for (const api of ['askForString', 'drawLine', 'game.over']) assert.equal(codigo.includes(api), false, api);
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
