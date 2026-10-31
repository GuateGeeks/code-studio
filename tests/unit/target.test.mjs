import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const target = JSON.parse(readFileSync('pxtarget.json', 'utf8'));

test('la configuración visible no nombra marcas ajenas', () => {
  const {appTheme} = target;
  for (const key of ['thumbnailName', 'organizationShortText', 'organization', 'embedUrl', 'homeUrl', 'githubUrl', 'title', 'name'])
    assert.doesNotMatch(String(target[key] ?? appTheme[key] ?? ''), /microsoft|makecode/i, key);
});
test('sin menú de documentación ajena, VS Code ni extensiones', () => {
  assert.equal(target.appTheme.docMenu, undefined);
  assert.equal(target.appTheme.showOpenInVscode, false);
  assert.equal(target.appTheme.allowPackageExtensions, false);
});
