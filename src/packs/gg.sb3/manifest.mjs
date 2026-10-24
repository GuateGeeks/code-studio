export const sb3Pack={
 id:'gg.sb3',version:'0.1.0',apiVersion:1,context:'scratch-compatibility',
 dependencies:[{id:'gg.assets',version:'0.1.0'}],resources:[],
 configSchema:{type:'object',required:['sourceAssetId','mode'],properties:{
  sourceAssetId:{type:'string',allowEmpty:true,maxLength:64,pattern:'^(?:|[a-f0-9]{64})$'},mode:{const:'compatibility'}
 },additionalProperties:false},
 configValidator:'sb3-reference-v1',defaults:{sourceAssetId:'',mode:'compatibility'},variables:[],migrations:[],
 permissions:{operations:[],variables:[],sprites:[],costumes:[],sounds:[]},
 contributions:{blocks:[],toolbox:[],hats:{},statements:{},expressions:{}}
};

export const sb3Pack02={...structuredClone(sb3Pack),version:'0.2.0',dependencies:[{id:'gg.assets',version:'0.2.0'},{id:'gg.sprites',version:'0.1.0'}],migrations:[{toVersion:'0.1.0',rename:{}}]};
