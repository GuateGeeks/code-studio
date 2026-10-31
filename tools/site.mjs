import {copyFileSync, cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {fileDetails, siteVersion, swManifest} from './sw-manifest.mjs';

// staticpkg copies every pxt-core tool and page, whatever the target asks for.
const UNUSED = ['images/windowsstorebag.png', 'images/newvisualstudiocode.png', 'docs/static/configurations', 'docs/static/identity', 'kiosk', 'kiosk.html', 'skillmap', 'skillmap.html', 'teachertool', 'teachertool.html', 'tutorialtool', 'tutorialtool.html', 'multiplayer', 'multiplayer.html', 'authcode', 'authcode.html', 'codeembed.html', 'rendertest.html', 'runnertest.html', 'multi.html', 'docs.html', 'hexcache', 'docfiles', 'ai.2.min.js', 'siminstructions.html', 'oauth-redirect.html', 'asseteditor.html', 'pxtasseteditor.js', 'run.html'];
const STUDIO = resolve(fileURLToPath(new URL('../studio', import.meta.url)));
const TEXT = /\.(html|webmanifest)$/;
const FOREIGN = /microsoft|makecode/i;

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

export function pruneSite(site) {
  for (const name of UNUSED) rmSync(join(site, name), {recursive: true, force: true});
  const docs = join(site, 'docs');
  if (existsSync(docs)) for (const name of readdirSync(docs)) if (name !== 'static') rmSync(join(docs, name), {recursive: true});
  rmSync(join(docs, 'static/logo'), {recursive: true, force: true});
  const icon = join(docs, 'static/icons/favicon.ico');
  if (existsSync(icon)) copyFileSync(icon, join(site, 'favicon.ico'));
  const index = join(site, 'index.html');
  if (existsSync(index)) writeFileSync(index, readFileSync(index, 'utf8')
    .replace(/@cdnUrl@\/blob\/[0-9a-z]+\//g, '/code-studio/docs/')
    // pxt-core's in-context translation hook loads a third-party script on ?translate=1.
    .replace(/<script[^>]*>(?:(?!<\/script>)[\s\S])*_jipt(?:(?!<\/script>)[\s\S])*<\/script>/, ''));
}

export function foreignBrand(site) {
  return walk(site).map(path => relative(site, path)).filter(path => FOREIGN.test(path) || (TEXT.test(path) && FOREIGN.test(readFileSync(join(site, path), 'utf8'))));
}

// sim.js ships a muted-speaker icon under a paid Font Awesome license; ours is drawn in the same place.
const MUTED_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 24"><path d="M3 9h4l5-4v14l-5-4H3z"/><path d="m15 9 1-1 3 3 3-3 1 1-3 3 3 3-1 1-3-3-3 3-1-1 3-3z"/></svg>';

export function replaceProIcon(text) {
  return text.replace(/<svg[^>]*><!-- Font Awesome Pro[\s\S]*?<\/svg>/, MUTED_ICON);
}

// Cloudflare injects its analytics into every HTML page of the domain; this stops it from loading.
const EDITOR_POLICY = `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:">`;

function protectEditor(file) {
  const page = readFileSync(file, 'utf8');
  if (!page.includes('Content-Security-Policy')) writeFileSync(file, page.replace('<head>', `<head>${EDITOR_POLICY}`));
}

// The portal takes the site root, so PXT's own page moves aside.
function publishPortal(site, studio) {
  if (!existsSync(join(site, 'editor.html'))) renameSync(join(site, 'index.html'), join(site, 'editor.html'));
  protectEditor(join(site, 'editor.html'));
  cpSync(studio, site, {recursive: true});
  const target = JSON.parse(readFileSync(join(site, 'target.json'), 'utf8'));
  const {config, files} = target.blocksprj;
  writeFileSync(join(site, 'project-template.json'), JSON.stringify({config, files, targetVersion: target.versions.target}));
}

// The service worker carries the version, so any change to the site reaches the browser as an update.
function publishOffline(site) {
  const {files} = swManifest(walk(site).map(path => relative(site, path)).sort(), '');
  const version = siteVersion(site, files);
  writeFileSync(join(site, 'sw-manifest.json'), JSON.stringify({version, files, ...fileDetails(site, files)}));
  const worker = join(site, 'sw.js');
  if (existsSync(worker)) writeFileSync(worker, readFileSync(worker, 'utf8').replace('__GG_VERSION__', version));
}

const REQUIRED = ['index.html', 'editor.html', 'simulator.html', 'sim-inner.html', 'pxtsim.js', 'sim.js', 'project-template.json', 'missions/atrapa-la-fruta.md', 'games/catalogo.json', 'sw.js', 'sw-manifest.json'];

// Last gate before publishing: a bad service worker is much harder to take back than a bad page.
export function checkSite(site) {
  for (const file of REQUIRED) if (!existsSync(join(site, file))) throw new Error(`Falta ${file}`);
  if (readFileSync(join(site, 'sw.js'), 'utf8').includes('__GG_VERSION__')) throw new Error('sw.js sin sellar');
  if (readFileSync(join(site, 'sim.js'), 'utf8').includes('Font Awesome Pro')) throw new Error('sim.js conserva el icono de Font Awesome Pro');
  if (!JSON.parse(readFileSync(join(site, 'sw-manifest.json'), 'utf8')).files.length) throw new Error('El manifiesto está vacío');
  for (const {id} of JSON.parse(readFileSync(join(site, 'games/catalogo.json'), 'utf8'))) {
    for (const file of [`games/${id}.js`, `games/${id}.ts`]) if (!existsSync(join(site, file))) throw new Error(`Falta ${file}`);
  }
}

export function finishSite(site, studio = STUDIO) {
  pruneSite(site);
  const sim = join(site, 'sim.js');
  if (existsSync(sim)) writeFileSync(sim, replaceProIcon(readFileSync(sim, 'utf8')));
  publishPortal(site, studio);
  publishOffline(site);
  const hits = foreignBrand(site);
  if (hits.length) throw new Error(`Marcas ajenas en lo publicado: ${hits.join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) finishSite(process.argv[2]);
