// Reviewed Blockly data only; never downloaded from a project.
const button=()=>({type:'field_dropdown',name:'BUTTON',options:[['A','A'],['B','B'],['A+B','AB']]});
const number=(name,value,min,max,precision=1)=>({type:'field_number',name,value,min,max,precision});
const input=name=>({type:'input_statement',name});
const statement=(type,message,args=[])=>({type,message0:message,...(args.length?{args0:args}:{}),previousStatement:null,nextStatement:null,colour:190});
export const blocks=[
 {type:'gg_mb_start',message0:'micro:bit al iniciar %1',args0:[input('DO')],colour:45},
 {type:'gg_mb_forever',message0:'micro:bit para siempre %1',args0:[input('DO')],colour:45},
 {type:'gg_mb_on_button',message0:'al pulsar botón %1 %2',args0:[button(),input('DO')],colour:45},
 statement('gg_mb_show_icon','mostrar icono %1',[{type:'field_dropdown',name:'ICON',options:[['Corazón','Heart'],['Corazón pequeño','SmallHeart'],['Sí','Yes'],['No','No'],['Feliz','Happy'],['Triste','Sad']]}]),
 statement('gg_mb_show_number','mostrar número %1',[number('NUMBER',0,-9999,9999,0)]),
 statement('gg_mb_show_leds','mostrar matriz 25 bits %1',[{type:'field_input',name:'LEDS',text:'0101011111111110111000100'}]),
 statement('gg_mb_plot','encender LED x %1 y %2',[number('X',0,0,4),number('Y',0,0,4)]),
 statement('gg_mb_unplot','apagar LED x %1 y %2',[number('X',0,0,4),number('Y',0,0,4)]),
 statement('gg_mb_clear','limpiar pantalla'),
 statement('gg_mb_pause','pausa %1 milisegundos',[number('MS',100,0,60000)]),
 statement('gg_mb_repeat','repetir %1 veces %2',[number('COUNT',3,0,1000),input('DO')]),
 statement('gg_mb_if_button','si botón %1 está pulsado %2 si no %3',[button(),input('DO'),input('ELSE')])
];
const entry=type=>({kind:'block',type});
export const toolbox=[
 {kind:'category',name:'Eventos micro:bit',colour:45,contents:blocks.slice(0,3).map(block=>entry(block.type))},
 {kind:'category',name:'Pantalla',colour:190,contents:blocks.slice(3,9).map(block=>entry(block.type))},
 {kind:'category',name:'Control',colour:45,contents:blocks.slice(9).map(block=>entry(block.type))}
];
