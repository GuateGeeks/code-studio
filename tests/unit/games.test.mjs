import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compileGame, presentGames, publishGames, readCatalog, sourceHash} from '../../tools/games.mjs';
import {parseJuego} from '../../tools/build.mjs';

const escribir = (raiz, ruta, texto) => {
  mkdirSync(join(raiz, ruta, '..'), {recursive: true});
  writeFileSync(join(raiz, ruta), texto);
};

// A root with a catalog of two games, only "a" having a folder.
function raiz() {
  const dir = mkdtempSync(join(tmpdir(), 'gg-games-'));
  const dependencias = {device: '*', 'gg-studio': '*'};
  escribir(dir, 'libs/blocksprj/pxt.json', JSON.stringify({name: '{0}', dependencies: {device: 'file:../device', 'gg-studio': 'file:../gg-studio'}}));
  escribir(dir, 'libs/gg-studio/gg.ts', 'x');
  escribir(dir, 'libs/gg-studio/built/basura.js', 'x');
  escribir(dir, 'node_modules/pxt-core/package.json', JSON.stringify({version: '13.2.1'}));
  escribir(dir, 'games/catalogo.json', JSON.stringify([{id: 'a', titulo: 'A'}, {id: 'b', titulo: 'B'}]));
  escribir(dir, 'games/a/main.ts', 'let n = 1');
  escribir(dir, 'games/a/pxt.json', JSON.stringify({name: 'a', dependencies: {device: 'file:../../libs/device', 'gg-studio': 'file:../../libs/gg-studio'}, files: ['main.ts'], extra: dependencias}));
  return dir;
}

// Stands in for pxt: counts calls and leaves the compiled file where pxt leaves it.
function falso() {
  const llamadas = [];
  const run = (orden, args, opciones) => {
    llamadas.push({orden, args, cwd: opciones.cwd});
    escribir(opciones.cwd, 'built/debug/binary.js', `// compilado ${llamadas.length}`);
  };
  return {run, llamadas};
}

test('readCatalog y presentGames: solo cuentan los juegos con carpeta', () => {
  const dir = raiz();
  assert.equal(readCatalog(dir).length, 2);
  assert.deepEqual(presentGames(dir).map(juego => juego.id), ['a']);
});

test('sourceHash cambia si cambia main.ts y no si cambia built/', () => {
  const dir = raiz();
  const antes = sourceHash(dir, 'a');
  escribir(dir, 'games/a/built/debug/binary.js', 'otro');
  escribir(dir, 'libs/gg-studio/built/basura.js', 'otra');
  assert.equal(sourceHash(dir, 'a'), antes);
  escribir(dir, 'games/a/main.ts', 'let n = 2');
  assert.notEqual(sourceHash(dir, 'a'), antes);
});

test('sourceHash cambia con las bibliotecas propias y con la versión de pxt-core', () => {
  const dir = raiz();
  const base = sourceHash(dir, 'a');
  escribir(dir, 'libs/gg-experiencias/experiencias.ts', 'x');
  const conBiblioteca = sourceHash(dir, 'a');
  assert.notEqual(conBiblioteca, base);
  escribir(dir, 'node_modules/pxt-core/package.json', JSON.stringify({version: '13.3.0'}));
  assert.notEqual(sourceHash(dir, 'a'), conBiblioteca);
});

test('compileGame llama a pxt build --local en games/<id>', () => {
  const dir = raiz();
  const {run, llamadas} = falso();
  assert.equal(compileGame(dir, 'a', run), 'compilado');
  assert.equal(llamadas.length, 1);
  assert.deepEqual(llamadas[0].args.slice(-2), ['build', '--local']);
  assert.match(llamadas[0].args[0], /pxt-core\/built\/pxt\.js$/);
  assert.equal(llamadas[0].cwd, join(dir, 'games/a'));
});

test('compileGame no vuelve a compilar lo que no cambió, y sí si cambia o falta el binario', () => {
  const dir = raiz();
  const {run, llamadas} = falso();
  assert.equal(compileGame(dir, 'a', run), 'compilado');
  assert.equal(compileGame(dir, 'a', run), 'sin cambios');
  assert.equal(llamadas.length, 1);
  escribir(dir, 'games/a/main.ts', 'let n = 3');
  assert.equal(compileGame(dir, 'a', run), 'compilado');
  assert.equal(llamadas.length, 2);
  rmSync(join(dir, 'games/a/built/debug/binary.js'));
  assert.equal(compileGame(dir, 'a', run), 'compilado');
  assert.equal(llamadas.length, 3);
});

test('compileGame rechaza dependencias distintas de la plantilla', () => {
  const dir = raiz();
  escribir(dir, 'games/a/pxt.json', JSON.stringify({name: 'a', dependencies: {device: 'file:../../libs/device'}, files: ['main.ts']}));
  const {run, llamadas} = falso();
  assert.throws(() => compileGame(dir, 'a', run), /dependencias/);
  assert.equal(llamadas.length, 0);
});

test('publishGames copia .js y .ts y filtra el catálogo', () => {
  const dir = raiz();
  const sitio = mkdtempSync(join(tmpdir(), 'gg-sitio-'));
  const {run} = falso();
  const publicados = publishGames(dir, sitio, {run, log: () => {}});
  assert.deepEqual(publicados, ['a']);
  assert.equal(readFileSync(join(sitio, 'games/a.js'), 'utf8'), '// compilado 1');
  assert.equal(readFileSync(join(sitio, 'games/a.ts'), 'utf8'), 'let n = 1');
  assert.deepEqual(JSON.parse(readFileSync(join(sitio, 'games/catalogo.json'), 'utf8')).map(juego => juego.id), ['a']);
  assert.equal(existsSync(join(sitio, 'games/b.js')), false);
});

test('publishGames informa el resultado de cada compilación', () => {
  const dir = raiz();
  const sitio = mkdtempSync(join(tmpdir(), 'gg-sitio-'));
  const {run} = falso();
  const lineas = [];
  publishGames(dir, sitio, {run, log: linea => lineas.push(linea)});
  publishGames(dir, sitio, {run, log: linea => lineas.push(linea)});
  assert.match(lineas[0], /a: compilado/);
  assert.match(lineas[1], /a: sin cambios/);
});

test('publishGames rechaza un id desconocido o sin carpeta', () => {
  const dir = raiz();
  const sitio = mkdtempSync(join(tmpdir(), 'gg-sitio-'));
  assert.throws(() => publishGames(dir, sitio, {only: ['zzz'], run: falso().run, log: () => {}}), /Juego desconocido/);
  assert.throws(() => publishGames(dir, sitio, {only: ['b'], run: falso().run, log: () => {}}), /Juego desconocido/);
});

test('parseJuego lee --juego <id>', () => {
  assert.equal(parseJuego(['node', 'build.mjs', '--juego', 'rescate-plano']), 'rescate-plano');
  assert.equal(parseJuego(['node', 'build.mjs']), null);
  assert.throws(() => parseJuego(['node', 'build.mjs', '--juego']), /--juego/);
});
