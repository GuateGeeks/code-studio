import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const OWN_LIBS = ['libs/gg-experiencias', 'libs/gg-studio'];
const GENERATED = new Set(['built', '_locales', 'pxt_modules']);
const STAMP = 'built/fuente.sha256';
const BINARY = 'built/debug/binary.js';

export const readCatalog = root => JSON.parse(readFileSync(join(root, 'games/catalogo.json'), 'utf8'));
export const presentGames = root => readCatalog(root).filter(({id}) => existsSync(join(root, 'games', id, 'main.ts')));

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).sort().flatMap(name => {
    if (GENERATED.has(name)) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

// Everything that changes the compiled game, so an unchanged game is never rebuilt.
export function sourceHash(root, id) {
  const hash = createHash('sha256');
  const pxt = JSON.parse(readFileSync(join(root, 'node_modules/pxt-core/package.json'), 'utf8')).version;
  hash.update(`pxt-core ${pxt}\0`);
  const game = join(root, 'games', id);
  for (const path of [join(game, 'main.ts'), join(game, 'pxt.json'), ...OWN_LIBS.flatMap(lib => files(join(root, lib)))]) {
    hash.update(path.slice(root.length)).update('\0').update(readFileSync(path)).update('\0');
  }
  return hash.digest('hex');
}

// What compiles here must compile in the student's copy, which gets the template's dependencies.
export function checkGameConfig(root, id) {
  const template = JSON.parse(readFileSync(join(root, 'libs/blocksprj/pxt.json'), 'utf8')).dependencies;
  const config = JSON.parse(readFileSync(join(root, 'games', id, 'pxt.json'), 'utf8'));
  const names = Object.keys(config.dependencies ?? {}).sort();
  const same = JSON.stringify(names) === JSON.stringify(Object.keys(template).sort())
    && names.every(name => config.dependencies[name] === `file:../../libs/${name}`);
  if (!same) throw new Error(`Las dependencias de ${id} no son las de la plantilla`);
}

export function compileGame(root, id, run = execFileSync) {
  checkGameConfig(root, id);
  const game = join(root, 'games', id);
  const hash = sourceHash(root, id);
  const stamp = join(game, STAMP);
  if (existsSync(join(game, BINARY)) && existsSync(stamp) && readFileSync(stamp, 'utf8') === hash) return 'sin cambios';
  run(process.execPath, [join(root, 'node_modules/pxt-core/built/pxt.js'), 'build', '--local'], {cwd: game, stdio: 'inherit'});
  mkdirSync(join(game, 'built'), {recursive: true});
  writeFileSync(stamp, hash);
  return 'compilado';
}

// The catalog published is the one of games that exist, so adding a game never breaks the site check.
export function publishGames(root, site, {only, run = execFileSync, log = console.log} = {}) {
  const present = presentGames(root);
  const ids = only ?? present.map(({id}) => id);
  for (const id of ids) if (!present.some(game => game.id === id)) throw new Error(`Juego desconocido: ${id}`);
  const out = join(site, 'games');
  mkdirSync(out, {recursive: true});
  for (const id of ids) {
    log(`${id}: ${compileGame(root, id, run)}`);
    copyFileSync(join(root, 'games', id, BINARY), join(out, `${id}.js`));
    copyFileSync(join(root, 'games', id, 'main.ts'), join(out, `${id}.ts`));
  }
  writeFileSync(join(out, 'catalogo.json'), JSON.stringify(present, null, 2));
  return ids;
}
