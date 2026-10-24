import {validateSb3Program} from '../../../contracts/sb3-program.mjs';
import {getResourceAsset, getResourceCostume, getResourceSound} from '../../../contracts/resources.mjs';

// Every native key is selected here. The raw archive/project never reaches VM.
export function toNativeSb3Project(candidate, resourceView) {
  const program=validateSb3Program(candidate,{resourceView});
  const targets=program.targets.map(target=>{
    const costumes=target.costumes.map(id=>{
      const costume=getResourceCostume(resourceView,id,target.id),asset=getResourceAsset(resourceView,costume.assetId);
      if(!costume||!asset)throw new Error('Disfraz canónico ausente');
      return {name:costume.id,assetId:costume.assetId,md5ext:costume.assetId+'.'+asset.format,dataFormat:asset.format,
        rotationCenterX:costume.centerX,rotationCenterY:costume.centerY,bitmapResolution:costume.bitmapResolution};
    });
    const sounds=target.sounds.map(id=>{
      const sound=getResourceSound(resourceView,id,target.id),asset=getResourceAsset(resourceView,sound.assetId);
      if(!sound||!asset)throw new Error('Sonido canónico ausente');
      return {name:sound.id,assetId:sound.assetId,md5ext:sound.assetId+'.wav',dataFormat:'wav'};
    });
    const {id,...owned}=target;
    return {...structuredClone(owned),costumes,sounds,
      ...(target.isStage?{videoTransparency:50,videoState:'off',textToSpeechLanguage:null}:{})};
  });
  return {projectVersion:3,targets,monitors:[],extensions:[],meta:{semver:'3.0.0',vm:'12.3.1',agent:'GuateGeeks reviewed compatibility v1'}};
}
