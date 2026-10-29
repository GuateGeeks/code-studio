import {validateStarterLibrary,decodeStarterLibraryEntry,starterOwners,stageBackdropAssetId} from '../contracts/starter-library.mjs';

// Presentation of the installed starter library. It renders entries and emits
// intents; the resources UI owns the transaction, cancellation and messages.
// The bundle is requested only when the learner opens the section, never at
// startup, and lives in the Studio origin (offline studio-core pack).
export const starterLibraryURL=new URL('../../starter-library.json',import.meta.url);
const copy={
 costume:{label:'Disfraces de la biblioteca',scope:'Se añaden como disfraces de hero. Elígelos en el bloque «disfraz» de Recursos locales.',action:'Añadir',hidden:' a los disfraces',state:'En tu proyecto'},
 backdrop:{label:'Fondos de la biblioteca',scope:'El fondo elegido se ve detrás de tus objetos al ejecutar. Por ahora cada proyecto tiene un fondo.',action:'Usar de fondo',hidden:'',state:'Fondo actual'},
 sound:{label:'Sonidos de la biblioteca',scope:'Se añaden como sonidos de hero. Úsalos con «iniciar sonido» o «sonido … y esperar».',action:'Añadir',hidden:' a los sonidos',state:'En tu proyecto'}
};
// Envelope of the PCM16 samples: a picture of each sound, drawn from its own bytes.
function waveform(document,bytes){
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),samples=(bytes.length-44)/2,columns=96,parts=[];
 for(let column=0;column<columns;column++){
  let low=0,high=0;
  for(let index=Math.floor(column*samples/columns);index<Math.floor((column+1)*samples/columns);index++){const value=view.getInt16(44+index*2,true)/32768;low=Math.min(low,value);high=Math.max(high,value);}
  parts.push('M'+(column+0.5)+' '+(16-high*15).toFixed(1)+'V'+(16-low*15+0.5).toFixed(1));
 }
 svg.setAttribute('viewBox','0 0 96 32');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('class','library-wave');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 path.setAttribute('d',parts.join(''));svg.append(path);return svg;
}
async function defaultLoad(){
 const response=await fetch(starterLibraryURL,{cache:'no-cache'});
 if(!response.ok)throw new Error('respuesta '+response.status);
 return response.json();
}
export function createStarterLibraryUI({pick,onAdd,onRestore,onPreview,load=defaultLoad}){
 const details=pick('starter-library'),list=pick('starter-library-items'),status=pick('starter-library-status'),filter=pick('starter-library-filter');
 const document=details.ownerDocument,urls=new Map(),sounds=new Map(),cards=new Map();
 let library=null,loading=null,failed=false,kind='costume',state={ready:false,view:null,initialBackdrop:null},previewing=null;
 function say(text,tone='info'){status.textContent=text;status.dataset.tone=tone;}
 function button(text,hidden,handler){
  const element=document.createElement('button');element.type='button';element.append(text);
  if(hidden){const extra=document.createElement('span');extra.className='visually-hidden';extra.textContent=hidden;element.append(extra);}
  element.addEventListener('click',handler);return element;
 }
 function card(entry){
  const item=document.createElement('li'),thumb=document.createElement('div'),name=document.createElement('span'),note=document.createElement('span'),actions=document.createElement('div');
  item.className='library-item';item.dataset.entry=entry.id;thumb.className='library-thumb';name.className='library-name';note.className='library-state';actions.className='controls';
  name.textContent=entry.name;
  if(entry.kind==='sound'){
   thumb.append(waveform(document,sounds.get(entry.id)));
   const seconds=document.createElement('span');seconds.className='library-meta';seconds.textContent=(entry.frames/entry.sampleRate).toLocaleString('es',{maximumFractionDigits:1})+' s';
   actions.append(button('Escuchar',' '+entry.name,()=>togglePreview(entry)));
   item.append(thumb,name,seconds);
  }else{
   const image=document.createElement('img');image.alt='';image.width=entry.width;image.height=entry.height;image.decoding='async';image.src=urls.get(entry.id);
   thumb.append(image);item.append(thumb,name);
  }
  const words=copy[entry.kind],label=entry.kind==='backdrop'?' «'+entry.name+'» del escenario':' «'+entry.name+'»'+words.hidden;
  actions.append(button(words.action,label,()=>add(entry)));
  item.append(note,actions);cards.set(entry.id,{item,note,entry});return item;
 }
 function build(){
  stopPreview();cards.clear();
  list.dataset.kind=kind;list.setAttribute('aria-label',copy[kind].label);pick('starter-library-scope').textContent=copy[kind].scope;
  list.replaceChildren(...(library?.entries??[]).filter(entry=>entry.kind===kind).map(card));update();
 }
 function present(entry){
  const view=state.view;if(!view)return false;
  if(entry.kind==='backdrop')return stageBackdropAssetId(view)===entry.sha256;
  return (entry.kind==='sound'?view.sounds:view.costumes).some(item=>item.ownerId===starterOwners.sprite&&item.assetId===entry.sha256);
 }
 // Updates in place: the focused control survives every authoring change.
 function update(){
  filter.disabled=!library;
  for(const {item,note,entry} of cards.values()){
   const inProject=present(entry);
   if(inProject)item.dataset.state=entry.kind==='backdrop'?'current':'added';else delete item.dataset.state;
   note.textContent=inProject?copy[entry.kind].state:'';
   for(const control of item.querySelectorAll('button'))control.disabled=!state.ready;
  }
  const backdrop=stageBackdropAssetId(state.view);
  const restore=pick('restore-backdrop');restore.hidden=!library||kind!=='backdrop'||!state.initialBackdrop?.length||!backdrop||state.initialBackdrop.includes(backdrop);restore.disabled=!state.ready;
 }
 async function ensure(){
  if(library||loading)return loading;
  failed=false;pick('retry-starter-library').hidden=true;list.setAttribute('aria-busy','true');say('Cargando la biblioteca…');
  loading=(async()=>{
   try{
    const value=validateStarterLibrary(await load());
    for(const entry of value.entries)if(entry.kind!=='sound'){const bytes=await decodeStarterLibraryEntry(entry);urls.set(entry.id,URL.createObjectURL(new Blob([bytes],{type:'image/svg+xml'})));}
    else sounds.set(entry.id,await decodeStarterLibraryEntry(entry));
    library=value;say(value.entries.length+' recursos disponibles. Elige qué mostrar y añade los que quieras.');build();
   }catch(error){
    failed=true;say('No se pudo cargar la biblioteca. Si este equipo se preparó para usarse sin conexión, recarga la página; si no, comprueba que el servidor local sigue abierto. Tu proyecto no cambió. ('+error.message+')','error');
    pick('retry-starter-library').hidden=false;
   }finally{loading=null;list.setAttribute('aria-busy','false');}
  })();
  return loading;
 }
 async function add(entry){
  try{
   const result=await onAdd(entry);
   say(result.status==='present'?'«'+entry.name+'» ya está en tu proyecto.':entry.kind==='backdrop'?'«'+entry.name+'» es ahora el fondo del escenario. Se verá al ejecutar.':
    entry.kind==='sound'?'«'+entry.name+'» se añadió a los sonidos de hero. Úsalo con «iniciar sonido».':'«'+entry.name+'» se añadió a los disfraces de hero. Elígelo en el bloque «disfraz».');
  }catch(error){if(error.name!=='AbortError')say('No se pudo añadir «'+entry.name+'». '+error.message,'error');}
 }
 function stopPreview(){previewing?.stop();previewing=null;for(const {item,entry} of cards.values())if(entry.kind==='sound')item.querySelector('button').firstChild.textContent='Escuchar';}
 async function togglePreview(entry){
  const active=previewing?.id===entry.id;stopPreview();if(active)return;
  const control=cards.get(entry.id).item.querySelector('button');control.firstChild.textContent='Detener';
  const session={id:entry.id,stop:()=>{}};previewing=session;
  try{
   const stop=await onPreview(entry,()=>{if(previewing===session){previewing=null;control.firstChild.textContent='Escuchar';}});
   if(previewing===session)session.stop=stop;else stop();
  }
  catch(error){if(previewing===session){previewing=null;control.firstChild.textContent='Escuchar';say('No se pudo escuchar «'+entry.name+'». '+error.message,'error');}}
 }
 details.addEventListener('toggle',()=>{if(details.open)void ensure();else stopPreview();});
 pick('retry-starter-library').addEventListener('click',()=>{void ensure();});
 filter.addEventListener('change',event=>{if(event.target.name==='starter-library-kind'){kind=event.target.value;build();}});
 pick('restore-backdrop').addEventListener('click',async()=>{
  try{const result=await onRestore();say(result.status==='present'?'El escenario ya usa el fondo inicial.':'Volviste al fondo inicial del escenario. Se verá al ejecutar.');}
  catch(error){if(error.name!=='AbortError')say('No se pudo volver al fondo inicial. '+error.message,'error');}
 });
 build();
 return Object.freeze({
  render(next){state={...state,...next};update();},
  ensure,stopPreview,
  state:()=>({loaded:Boolean(library),failed,kind,entries:library?.entries.length??0}),
  dispose(){stopPreview();for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}
 });
}
