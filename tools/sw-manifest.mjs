import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const RULES = readFileSync(new URL('site-files.txt', import.meta.url), 'utf8').split('\n').filter(line => line && !line.startsWith('#'));

function kept(file, rules) {
  if (rules.some(rule => rule.startsWith('!') && file.startsWith(rule.slice(1)))) return true;
  return !rules.some(rule => file.startsWith(rule));
}

export function swManifest(files, version, rules = RULES) {
  return {version, files: files.filter(file => kept(file, rules)).sort()};
}

export function siteVersion(site, files) {
  const hash = createHash('sha256');
  for (const file of [...files].sort()) hash.update(file).update(readFileSync(join(site, file)));
  return hash.digest('hex').slice(0, 16);
}
