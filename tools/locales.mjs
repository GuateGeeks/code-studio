import {cpSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const API = 'https://makecode.com/api/translations';
// Blocks the published translation leaves in English, by package.
const OVERRIDES = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'es-MX-overrides.json'), 'utf8'));
const SHARED = ['strings.json', 'arcade/target-strings.json'];
// The API answers 200 {} for anything it lacks, so emptiness is the only failure signal.
const ESSENTIAL = /^(strings|target-strings|game-strings)\.json$/;

export function rebrand(strings) {
  const clean = value => value.replace(/Microsoft MakeCode Arcade|MakeCode Arcade|Microsoft MakeCode|MakeCode/g, 'Code Studio').replace(/Microsoft/g, 'GuateGeeks');
  return Object.fromEntries(Object.entries(strings).map(([key, value]) => [key, clean(value)]));
}

export function addLocale(pkg, lang, file, strings) {
  if (!Object.keys(strings).length) return;
  const name = `_locales/${lang}/${file}`;
  pkg[name] = JSON.stringify(strings);
  const config = JSON.parse(pkg['pxt.json']);
  config.files = [...new Set([...config.files, name])];
  pkg['pxt.json'] = JSON.stringify(config);
}

async function download(lang, filename, get) {
  const url = `${API}?${new URLSearchParams({lang, filename, approved: 'true'})}`;
  const response = await get(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${filename}: ${response.status}`);
  return response.json();
}

// Translations stay out of git until their license is reviewed.
export async function fetchLocales(lang, packages, dir, get = fetch) {
  mkdirSync(join(dir, lang), {recursive: true});
  const files = [...SHARED, ...packages.flatMap(name => [`arcade/${name}-strings.json`, `arcade/${name}-jsdoc-strings.json`])];
  for (const file of files) {
    const name = file.split('/').pop();
    const target = join(dir, lang, name);
    if (existsSync(target)) continue;
    const strings = rebrand(await download(lang, file, get));
    if (ESSENTIAL.test(name) && !Object.keys(strings).length) throw new Error(`Traducción vacía: ${name}`);
    writeFileSync(`${target}.tmp`, JSON.stringify(strings));
    renameSync(`${target}.tmp`, target);
  }
}

export function injectLocales(siteDir, lang, dir, overrides = OVERRIDES) {
  const source = join(dir, lang);
  mkdirSync(join(siteDir, 'locales', lang), {recursive: true});
  for (const file of ['strings.json', 'target-strings.json']) cpSync(join(source, file), join(siteDir, 'locales', lang, file));
  // PXT asks for these two as well; published translations for them are empty.
  for (const file of ['bundled-strings.json', 'sim-strings.json']) writeFileSync(join(siteDir, 'locales', lang, file), '{}');
  const target = JSON.parse(readFileSync(join(siteDir, 'target.json'), 'utf8'));
  for (const [name, pkg] of Object.entries(target.bundledpkgs)) {
    for (const file of [`${name}-strings.json`, `${name}-jsdoc-strings.json`]) {
      const path = join(source, file);
      if (!existsSync(path) || !pkg['pxt.json']) continue;
      const own = file === `${name}-strings.json` ? overrides[name] : {};
      addLocale(pkg, lang, file, {...JSON.parse(readFileSync(path, 'utf8')), ...own});
    }
  }
  writeFileSync(join(siteDir, 'target.json'), JSON.stringify(target));
  writeFileSync(join(siteDir, 'target.js'), `var pxtTargetBundle = ${JSON.stringify(target)};\n`);
}
