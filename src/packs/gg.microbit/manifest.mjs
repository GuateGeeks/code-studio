import {blocks,toolbox} from './blocks.mjs';
import {defaultDeviceGraph} from '../../contracts/device-program.mjs';
// Immutable default data is shared with the model; live drafts belong to the editor.
const workspace=defaultDeviceGraph;
export const microbitPack={
 id:'gg.microbit',version:'0.1.0',apiVersion:1,context:'microbit',
 dependencies:[{id:'gg.sprites',version:'0.1.0'}],resources:[],
 configSchema:{type:'object',required:['deviceId','variant','mode','workspace'],additionalProperties:false,properties:{
  deviceId:{type:'string',minLength:1,maxLength:64,pattern:'^[a-zA-Z0-9._:-]+$',notEnum:['__proto__','prototype','constructor']},
  variant:{type:'string',enum:['universal','v1','v2']},mode:{type:'string',enum:['blocks','typescript']},
  workspace:{type:'json',maxBytes:8192,maxDepth:12}
 }},configValidator:'device-program-v1',
 defaults:{deviceId:'microbit-main',variant:'universal',mode:'blocks',workspace},
 variables:[],migrations:[],
 permissions:{operations:[],variables:'declared',sprites:[],costumes:[],sounds:[]},
 contributions:{blocks,toolbox,hats:{},statements:{},expressions:{}}
};
