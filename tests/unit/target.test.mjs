import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const target = JSON.parse(readFileSync('pxtarget.json', 'utf8'));

test('la configuración visible no nombra marcas ajenas', () => {
  const {appTheme} = target;
  for (const key of ['thumbnailName', 'organizationShortText', 'organization', 'embedUrl', 'homeUrl', 'githubUrl', 'title', 'name'])
    assert.doesNotMatch(String(target[key] ?? appTheme[key] ?? ''), /microsoft|makecode/i, key);
});
test('sin menú de documentación ajena, VS Code ni extensiones', () => {
  assert.deepEqual(target.appTheme.docMenu, []);
  assert.equal(target.appTheme.showOpenInVscode, false);
  assert.equal(target.appTheme.allowPackageExtensions, false);
});
test('la biblioteca de experiencias va en el target y en la plantilla de proyectos', () => {
  assert.ok(target.bundleddirs.includes('libs/gg-experiencias'));
  const plantilla = JSON.parse(readFileSync('libs/blocksprj/pxt.json', 'utf8'));
  assert.equal(plantilla.dependencies['gg-experiencias'], 'file:../gg-experiencias');
  for (const dir of target.bundleddirs) assert.ok(existsSync(`${dir}/pxt.json`), dir);
});
