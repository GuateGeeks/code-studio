import {existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {fileURLToPath} from 'node:url';

// staticpkg copies every pxt-core tool and page, whatever the target asks for.
const UNUSED = ['kiosk', 'kiosk.html', 'skillmap', 'skillmap.html', 'teachertool', 'teachertool.html', 'tutorialtool', 'tutorialtool.html', 'multiplayer', 'multiplayer.html', 'authcode', 'authcode.html', 'codeembed.html', 'rendertest.html', 'runnertest.html', 'multi.html', 'docs.html', 'hexcache', 'docfiles', 'ai.2.min.js', 'siminstructions.html', 'oauth-redirect.html', 'asseteditor.html', 'pxtasseteditor.js', 'run.html'];
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

export function finishSite(site) {
  pruneSite(site);
  const hits = foreignBrand(site);
  if (hits.length) throw new Error(`Marcas ajenas en lo publicado: ${hits.join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) finishSite(process.argv[2]);
