import {prepareAsset,validateResources,createResourceView} from '../../../src/contracts/resources.mjs';
import {buildSb3ResourceDescriptors,inspectSb3Project} from '../../../src/contracts/sb3-program.mjs';

export async function prepareFixture(fixture) {
 const resources={version:1,assets:{},integrity:{},costumes:[],sounds:[]},assetMap={};
 const put=prepared=>{resources.assets[prepared.id]=prepared.asset;resources.integrity[prepared.id]=prepared.integrity;return prepared.id;};
 const sourceAssetId=put(await prepareAsset(fixture.bytes,{type:'Source',format:'sb3'}));
 for(const [path,bytes]of fixture.assets){
  const format=path.split('.').at(-1),type=format==='wav'?'Sound':'Image';
  const assetId=put(await prepareAsset(bytes,{type,format}));assetMap[path]={assetId,type,format};
 }
 Object.assign(resources,buildSb3ResourceDescriptors(fixture.project,{sourceAssetId,assetMap}));
 const validated=await validateResources(resources),resourceView=createResourceView(validated);
 return {resources:validated,resourceView,sourceAssetId,assetMap,...inspectSb3Project(fixture.project,{sourceAssetId,assetMap,resourceView})};
}
