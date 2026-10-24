const menu=(type,field,resource)=>({type,field,resource,ownerId:'hero'});
const sound=(type,wait)=>({kind:'playSound',values:{sound:{field:'SOUND',resource:'sounds',ownerId:'hero'},wait:{literal:wait}}});
export const assetsPack={
 id:'gg.assets',version:'0.1.0',apiVersion:1,dependencies:[{id:'gg.sprites',version:'0.1.0'}],
 resourcePolicy:'gg-resources-v1',resources:[],configSchema:{type:'object',required:[],properties:{},additionalProperties:false},defaults:{},variables:[],migrations:[],
 permissions:{operations:['program.setCostume','program.playSound'],variables:[],sprites:[],
  costumes:{resource:'costumes',ownerId:'hero'},sounds:{resource:'sounds',ownerId:'hero'}},
 contributions:{
  blocks:[
   {type:'gg_assets_set_costume',message0:'disfraz %1',args0:[{type:'field_dropdown',name:'COSTUME',options:[['Sin recursos','__none__']]}],previousStatement:null,nextStatement:null,colour:290},
   {type:'gg_assets_play_sound',message0:'iniciar sonido %1',args0:[{type:'field_dropdown',name:'SOUND',options:[['Sin recursos','__none__']]}],previousStatement:null,nextStatement:null,colour:290},
   {type:'gg_assets_play_sound_wait',message0:'sonido %1 y esperar',args0:[{type:'field_dropdown',name:'SOUND',options:[['Sin recursos','__none__']]}],previousStatement:null,nextStatement:null,colour:290}
  ],
  fieldMenus:[menu('gg_assets_set_costume','COSTUME','costumes'),menu('gg_assets_play_sound','SOUND','sounds'),menu('gg_assets_play_sound_wait','SOUND','sounds')],
  toolbox:[{kind:'category',name:'Recursos locales',colour:290,contents:[{kind:'block',type:'gg_assets_set_costume'},{kind:'block',type:'gg_assets_play_sound'},{kind:'block',type:'gg_assets_play_sound_wait'}]}],
  hats:{},expressions:{},statements:{gg_assets_set_costume:{kind:'setCostume',values:{costume:{field:'COSTUME',resource:'costumes',ownerId:'hero'}}},
   gg_assets_play_sound:sound('gg_assets_play_sound',false),gg_assets_play_sound_wait:sound('gg_assets_play_sound_wait',true)}
 }
};

// New policy is explicit; the historical manifest above stays byte-for-byte data.
export const assetsPack02={...structuredClone(assetsPack),version:'0.2.0',dependencies:[],executionContexts:['scratch-2d','scratch-compatibility','scene3d','webapp'],resourcePolicy:'gg-resources-v2',migrations:[{toVersion:'0.1.0',rename:{}}]};
