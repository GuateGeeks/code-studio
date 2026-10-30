import {validateScene3DConfig,validateScene3DFeatures} from './scene3d-program.mjs';
import {validateWebAppConfig} from './webapp-program.mjs';
import {validateDeviceConfig} from './device-program.mjs';
import {validateScene2DObjects} from './scene2d-objects.mjs';
// Only installed, reviewed validators. Imported data names no executable module.
function validateSb3Reference(config) {
 if(!config||typeof config!=='object'||Array.isArray(config)||Object.keys(config).length!==2||
  !Object.hasOwn(config,'mode')||config.mode!=='compatibility'||typeof config.sourceAssetId!=='string'||!/^(?:|[a-f0-9]{64})$/.test(config.sourceAssetId))
  throw new Error('GG packs: referencia SB3 inválida');
 return structuredClone(config);
}
export const packConfigValidators=Object.freeze({'scene3d-program-v1':validateScene3DConfig,'webapp-program-v1':validateWebAppConfig,'device-program-v1':validateDeviceConfig,'sb3-reference-v1':validateSb3Reference,'scene2d-objects-v1':validateScene2DObjects});
export function validateLocalPackConfig(id,config) {
 if(id===undefined)return config;
 if(typeof id!=='string'||!Object.hasOwn(packConfigValidators,id))throw new Error('GG packs: validador local no instalado');
 return packConfigValidators[id](config);
}

export function validateLocalPackReferences(validator,config,{resources,resourceView,textDocuments=[]}={}) {
 const references={'scene3d-program-v1':validateScene3DConfig,'webapp-program-v1':validateWebAppConfig};
 if(Object.hasOwn(references,validator)){references[validator](config,{resourceView});if(config.selectedTextDocumentId!==null){const document=textDocuments.find(doc=>doc.id===config.selectedTextDocumentId);if(!document||config.mode!=='blocks'&&document.language!==config.mode)throw new Error('GG packs: documento textual ausente/incompatible');}}
 if(validator==='sb3-reference-v1'&&config.sourceAssetId&&(!resources?.assets[config.sourceAssetId]||resources.assets[config.sourceAssetId].type!=='Source'||resources.assets[config.sourceAssetId].format!=='sb3'))throw new Error('GG packs: original SB3 ausente');
 return config;
}


const packFeatureValidators=Object.freeze({'scene3d-features-v1':validateScene3DFeatures});
export function validateLocalPackFeatures(id,config,features){
 if(id===undefined)return config;
 if(typeof id!=='string'||!Object.hasOwn(packFeatureValidators,id))throw new Error('GG packs: validador de funciones no instalado');
 return packFeatureValidators[id](config,features);
}
