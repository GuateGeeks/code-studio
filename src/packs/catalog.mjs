import {scene3DBasicPack} from './gg.3d-basic/manifest.mjs';
import {scene3DAdvancedPack} from './gg.3d-advanced/manifest.mjs';
import {webAppsPack} from './gg.webapps/manifest.mjs';
import {assetsPack,assetsPack02} from './gg.assets/manifest.mjs';
import {sb3Pack,sb3Pack02} from './gg.sb3/manifest.mjs';
import {microbitPack} from './gg.microbit/manifest.mjs';
import {spritesPack} from './gg.sprites/manifest.mjs';
import {scorePack01, scorePack02} from './gg.score/manifest.mjs';
// Build-reviewed, declarative packages. Imported projects never add entries.
function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freezeData(child);
    Object.freeze(value);
  }
  return value;
}
export const localPackCatalog = freezeData([
  {manifest: assetsPack02,sha256:'db061050ef37ea88a3b70cab92954f8bd03b8bf96e3a5abfce38af5ee1e59fc5'},
  {manifest: sb3Pack02,sha256:'068db95bb0c929d5cbb8197a62ce5ef3a0848907af9116b950d2aaff432772b0'},
  {manifest: scene3DBasicPack,sha256:'e597c1faa1d4b9c97ca71930fbf3d0bef28bf10380aacc060f5c0dbee22bdc23'},
  {manifest: scene3DAdvancedPack,sha256:'0b2a61673c534c088a00a5eca7570e6b851f99c45f6abd475d0dfc4c8e7214d7'},
  {manifest: webAppsPack,sha256:'c8b2c04ff6859981feca58286c49418551035d5ea22b20e837531629d698c50c'},
  {manifest: assetsPack, sha256: '672c544a81c4ff6a0f5cd85977e2116355d6ff9a946ce4244f2778347fff3027'},
  {manifest: sb3Pack, sha256: 'cf2e936cf0185471568039aca9efe5e2939133c111489b71a2f41e54794b9528'},
  {manifest: microbitPack, sha256: '1ce6214b23eb2a90a9c236bf5270fe61c69ec78ff9122690eb8800c0354d72cf'},
  {manifest: spritesPack, sha256: '225d6c992253966ac0645d9e73360c13da853787c0b02ff23c6cc9bdad6072d2'},
  {manifest: scorePack01, sha256: 'fae8b8a0f9095df052a3aec6b849c118603ae23a9e957f87f3e321559667348b'},
  {manifest: scorePack02, sha256: 'eeab7a5d0e90bf23f4fd5e55d056ce61434c85f7cc82984e59248b45ff73f53c'}
]);
export const latestPackVersions = Object.freeze({'gg.sprites': '0.1.0', 'gg.score': '0.2.0', 'gg.microbit':'0.1.0','gg.assets':'0.1.0','gg.sb3':'0.1.0','gg.3d-basic':'0.1.0','gg.3d-advanced':'0.1.0','gg.webapps':'0.1.0'});

export const localPackMigrations=freezeData([{id:'gg.assets',fromVersion:'0.1.0',toVersion:'0.2.0',rename:{}},{id:'gg.sb3',fromVersion:'0.1.0',toVersion:'0.2.0',rename:{}}]);
