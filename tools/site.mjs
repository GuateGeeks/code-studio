import {cpSync, existsSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// staticpkg copies every pxt-core tool and page, whatever the target asks for.
const UNUSED = ['kiosk', 'kiosk.html', 'skillmap', 'skillmap.html', 'teachertool', 'teachertool.html', 'tutorialtool', 'tutorialtool.html', 'multiplayer', 'multiplayer.html', 'authcode', 'authcode.html', 'codeembed.html', 'rendertest.html', 'runnertest.html', 'multi.html', 'docs.html', 'hexcache', 'docfiles', 'ai.2.min.js', 'siminstructions.html', 'oauth-redirect.html', 'asseteditor.html', 'pxtasseteditor.js', 'run.html'];
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

// The portal takes the site root, so PXT's own page moves aside.
function publishPortal(site, studio) {
  if (!existsSync(join(site, 'editor.html'))) renameSync(join(site, 'index.html'), join(site, 'editor.html'));
  cpSync(studio, site, {recursive: true});
  const target = JSON.parse(readFileSync(join(site, 'target.json'), 'utf8'));
  const {config, files} = target.blocksprj;
  writeFileSync(join(site, 'project-template.json'), JSON.stringify({config, files, targetVersion: target.versions.target}));
}

export function finishSite(site, studio = STUDIO) {
  pruneSite(site);
  const sim = join(site, 'sim.js');
  if (existsSync(sim)) writeFileSync(sim, replaceProIcon(readFileSync(sim, 'utf8')));
  publishPortal(site, studio);
  const hits = foreignBrand(site);
  if (hits.length) throw new Error(`Marcas ajenas en lo publicado: ${hits.join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) finishSite(process.argv[2]);
