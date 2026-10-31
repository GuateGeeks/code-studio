import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {publishGames} from './games.mjs';
import {fetchLocales, injectLocales} from './locales.mjs';
import {checkSite, finishSite} from './site.mjs';

const LANG = 'es-MX';
export const SIM_URL = 'https://registry.npmjs.org/pxt-arcade/-/pxt-arcade-4.2.1.tgz';
export const SIM_SHA256 = 'd403926da1c96dd71a696f0182dbdd82b97babb9d0de9281b8e2a6b67c57cf32';
const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

export function verifyTarball(buffer, expected) {
  const actual = createHash('sha256').update(buffer).digest('hex');
  if (actual !== expected) throw new Error(`sha256 inesperado: ${actual}`);
}

// The simulator source is private, so it comes from the published package.
async function fetchSimulator() {
  const response = await fetch(SIM_URL);
  if (!response.ok) throw new Error(`No se pudo descargar el simulador: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  verifyTarball(buffer, SIM_SHA256);
  const dir = mkdtempSync(join(tmpdir(), 'gg-sim-'));
  writeFileSync(join(dir, 'sim.tgz'), buffer);
  execFileSync('tar', ['xzf', 'sim.tgz'], {cwd: dir});
  mkdirSync(join(ROOT, 'built'), {recursive: true});
  for (const file of ['sim.js', 'sim-strings.json']) cpSync(join(dir, 'package/built', file), join(ROOT, 'built', file));
  rmSync(dir, {recursive: true});
}

export function parseJuego(argv) {
  const at = argv.indexOf('--juego');
  if (at < 0) return null;
  if (!argv[at + 1] || argv[at + 1].startsWith('--')) throw new Error('--juego necesita el id del juego');
  return argv[at + 1];
}

export async function build({skipTarget = false, juego = null} = {}) {
  // One game: the rest of the site is already built, so only that game and the finishing are redone.
  if (juego) {
    const site = join(ROOT, 'dist/site/code-studio');
    publishGames(ROOT, site, {only: [juego]});
    finishSite(site);
    checkSite(site);
    return;
  }
  await fetchSimulator();
  if (skipTarget) return;
  mkdirSync(join(ROOT, 'public'), {recursive: true});
  rmSync(join(ROOT, 'dist/site'), {recursive: true, force: true});
  execFileSync('node', ['node_modules/pxt-core/built/pxt.js', 'staticpkg', '--route', 'code-studio', '--output', 'dist/site'], {cwd: ROOT, stdio: 'inherit'});
  const site = join(ROOT, 'dist/site/code-studio');
  const {bundledpkgs} = JSON.parse(readFileSync(join(site, 'target.json'), 'utf8'));
  // "---" marks hardware variants, which share the strings of their base package.
  await fetchLocales(LANG, Object.keys(bundledpkgs).filter(name => !name.includes('---')), join(ROOT, 'locales'));
  injectLocales(site, LANG, join(ROOT, 'locales'));
  publishGames(ROOT, site);
  finishSite(site);
  checkSite(site);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await build({juego: parseJuego(process.argv)});
