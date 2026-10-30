import {scene2DObjectsOf} from '../project-format.mjs';
import {addSceneObject,deleteSceneObject,duplicateSceneObject,newScene2DObjectId,renameSceneObject,scene2DObjectRules,uniqueScene2DSpriteName} from '../contracts/scene2d-object-edits.mjs';
import {normalizeScene2DSpriteName,scene2DObjectLimits,scene2DSpriteNameProblem,scene2DStageName} from '../contracts/scene2d-objects.mjs';
import {decodeResourceAsset} from '../contracts/resources.mjs';

// The objects panel (scene2d-multi-sprite 3.1): the stage and the sprites as one
// single-select listbox, and the actions on the selected object. Changing object
// always goes through codeViews.selectObject (R2), never to the authoring: that
// keeps the mounted object and the views together. Nothing here runs a program.
// Selection does not follow focus: choosing can apply text, take a moment and be
// refused, so arrows only move focus and Enter, Space or a click choose (APG).
export function createObjectsUI({authoring,codeViews,contexts,resources,editObjects,onChanged=()=>{}}){
  const pick=id=>document.querySelector('#'+id);
  const panel=pick('objects-panel'),list=pick('objects-list'),status=pick('objects-status');
  const form=pick('object-name-form'),input=pick('object-name'),problem=pick('object-name-error');
  const buttons={add:pick('object-add'),rename:pick('object-rename'),duplicate:pick('object-duplicate'),delete:pick('object-delete')};
  const urls=new Map();
  let busy=false,formMode=null,opener=null,lastKey=null;
  const config=()=>{try{return scene2DObjectsOf(authoring.captureCapabilities());}catch{return null;}};
  const mounted=()=>authoring.mountedObject();
  const entries=objects=>[{id:'stage',name:scene2DStageName,ownerId:'stage'},...objects.sprites.map(sprite=>({id:sprite.id,name:sprite.name,ownerId:sprite.id,costume:sprite.costume}))];
  const nameOf=id=>entries(config()).find(item=>item.id===id)?.name??'';
  const optionOf=id=>list.querySelector('[data-object="'+CSS.escape(id)+'"]');
  const options=()=>[...list.querySelectorAll('[role=option]')];
  function say(text,tone='info'){status.textContent=text;status.dataset.tone=tone;}
  // A picture of the object's costume, so it is recognized before its name is read.
  function thumbnail(item,view){
    const owned=view.costumes.filter(costume=>costume.ownerId===item.ownerId);
    const costume=owned.find(entry=>entry.id===item.costume)??owned[0];
    const asset=costume&&resources.capture().assets[costume.assetId];
    if(!asset)return null;
    if(!urls.has(costume.assetId)){
      const svg=typeof asset==='string'||asset.format==='svg';
      urls.set(costume.assetId,URL.createObjectURL(new Blob([typeof asset==='string'?new TextEncoder().encode(asset):decodeResourceAsset(asset)],{type:svg?'image/svg+xml':'image/'+asset.format})));
    }
    return urls.get(costume.assetId);
  }
  function build(objects,selected){
    const view=resources.view(),focused=list.contains(document.activeElement)?document.activeElement.dataset.object:null;
    list.replaceChildren(...entries(objects).map(item=>{
      const node=document.createElement('div'),label=document.createElement('span'),url=thumbnail(item,view);
      node.setAttribute('role','option');node.id='object-option-'+item.id.replace(/[^A-Za-z0-9_-]/g,'-');node.dataset.object=item.id;node.className='object-option';
      node.setAttribute('aria-selected',String(item.id===selected));node.tabIndex=item.id===selected?0:-1;node.title=item.name;
      label.className='object-name';label.textContent=item.name;
      if(url){const image=document.createElement('img');image.alt='';image.src=url;image.width=image.height=28;node.append(image);}
      node.append(label);return node;
    }));
    if(focused)(optionOf(focused)??optionOf(selected))?.focus({preventScroll:true});
  }
  // aria-disabled, not disabled: the control stays reachable and pressing it says why.
  function blocked(action,objects,selected){
    const stage=selected==='stage',full=objects.sprites.length>=scene2DObjectLimits.sprites;
    if(action==='add')return full?'Un proyecto puede tener hasta '+scene2DObjectLimits.sprites+' objetos. Borra uno para añadir otro.':null;
    if(stage)return 'El escenario es único: no se puede '+(action==='rename'?'renombrar':action==='duplicate'?'duplicar':'borrar')+'. Elige un objeto.';
    if(action==='duplicate')return full?'Un proyecto puede tener hasta '+scene2DObjectLimits.sprites+' objetos. Borra uno para duplicar otro.':null;
    if(action==='delete')return objects.sprites.length===1?'Un proyecto necesita al menos un objeto además del escenario.':null;
    return null;
  }
  function render(){
    const objects=config(),visible=Boolean(objects)&&contexts.current()==='2d'&&mounted()!==null;
    panel.hidden=!visible;
    if(!objects)return;
    const selected=mounted(),view=resources.view();
    const key=JSON.stringify([objects.sprites.map(sprite=>[sprite.id,sprite.name,sprite.costume]),selected,view.costumes.map(item=>[item.ownerId,item.id,item.assetId])]);
    if(key!==lastKey){
      lastKey=key;build(objects,selected);
      for(const [action,button]of Object.entries(buttons))button.setAttribute('aria-disabled',String(Boolean(blocked(action,objects,selected))));
      onChanged();
    }
  }
  function explain(result,{target=null}={}){
    const here=nameOf(mounted()),stay=' Sigues en «'+here+'».';
    if(result.reason==='rejected')say('El texto tiene un error: arréglalo para '+(target?'cambiar a «'+target+'»':'continuar')+'.'+stay,'error');
    else if(result.reason==='busy')say('Espera un momento: se está comprobando el programa.'+stay);
    else if(result.reason==='cancelled')say('Cambiaste el texto mientras se comprobaba. Vuelve a intentarlo.'+stay);
    else say((target?'No se pudo abrir «'+target+'»':'No se pudo completar')+'.'+stay+(result.message?' '+result.message:''),'error');
  }
  // A failure leaves the project as it was; `fallback` takes the focus if the
  // control that had it went away (the name form).
  async function exclusive(action,fallback=null){
    if(busy){say('Espera un momento: hay otro cambio en curso.');return;}
    busy=true;list.setAttribute('aria-busy','true');
    try{await action();}
    catch(failure){say(failure.message,'error');fallback?.focus({preventScroll:true});}
    finally{busy=false;list.setAttribute('aria-busy','false');render();}
  }
  const focusSelected=()=>optionOf(mounted())?.focus({preventScroll:true});
  // Runs one panel action: pending text is applied first, as when changing object,
  // because the identifiers it uses may change; then the live text follows them.
  async function transact(edit){
    const settled=await codeViews.settleText();
    if(!settled.ok){explain(settled);return null;}
    const result=await editObjects(edit);
    codeViews.refreshObjectText();
    document.querySelector('#editor-status').textContent='Objetos actualizados · sin ejecutar';
    return result;
  }
  function choose(id){
    if(!form.hidden)closeForm({restore:false});
    return exclusive(async()=>{
      const target=nameOf(id),result=await codeViews.selectObject(id);
      if(!result.ok){explain(result,{target});return;}
      say('');render();optionOf(id)?.focus({preventScroll:true});
    });
  }
  function openForm(mode,trigger){
    formMode=mode;opener=trigger;
    pick('object-name-label').textContent=mode==='add'?'Nombre del objeto nuevo':'Nuevo nombre de «'+nameOf(mounted())+'»';
    pick('object-name-save').textContent=mode==='add'?'Añadir':'Guardar nombre';
    input.value=mode==='add'?uniqueScene2DSpriteName('Objeto '+(config().sprites.length+1),config()):nameOf(mounted());
    clearProblem();form.hidden=false;say('');input.focus();input.select();
  }
  function closeForm({restore=true}={}){
    form.hidden=true;formMode=null;clearProblem();
    if(restore)opener?.focus({preventScroll:true});
    opener=null;
  }
  function clearProblem(){problem.hidden=true;problem.textContent='';input.removeAttribute('aria-invalid');}
  function refuse(text){problem.textContent=text;problem.hidden=false;input.setAttribute('aria-invalid','true');input.focus();}
  function savedAs(typed,name){return typed.trim()===name?'':' Se guardó como «'+name+'».';}
  function submit(){
    const mode=formMode,typed=input.value,name=normalizeScene2DSpriteName(typed),objects=config();
    const reason=scene2DSpriteNameProblem(name,{config:objects,except:mode==='rename'?mounted():null});
    if(reason){refuse(reason);return;}
    const trigger=opener;
    closeForm({restore:false});
    return exclusive(async()=>{
      if(mode==='rename'){
        const id=mounted(),done=await transact(state=>renameSceneObject(state,{id,name}));
        if(done){render();focusSelected();say('El objeto se llama ahora «'+name+'».'+savedAs(typed,name));}
        return;
      }
      const id=newScene2DObjectId(objects,undefined,resources.view());
      const sourceId=mounted(),done=await transact(state=>addSceneObject(state,{id,name,sourceId,rules:scene2DObjectRules(state.capabilities)}));
      if(done)await finishNew(id,'«'+name+'» se añadió. Aparecerá en el escenario al ejecutar.'+savedAs(typed,name));
    },trigger);
  }
  // A new object becomes the selected one, through the views as always.
  async function finishNew(id,message){
    const result=await codeViews.selectObject(id);
    if(result.ok){render();focusSelected();say(message);}
    else explain(result,{target:nameOf(id)});
  }
  const duplicate=()=>exclusive(async()=>{
    const sourceId=mounted(),objects=config(),id=newScene2DObjectId(objects,undefined,resources.view()),name=uniqueScene2DSpriteName(nameOf(sourceId),objects);
    const done=await transact(state=>duplicateSceneObject(state,{id,name,sourceId,rules:scene2DObjectRules(state.capabilities)}));
    if(done)await finishNew(id,'«'+name+'» es una copia con sus scripts, disfraces y sonidos. Aparecerá en el escenario al ejecutar.');
  },buttons.duplicate);
  function remove(){
    const id=mounted(),name=nameOf(id);
    if(!confirm('¿Borrar «'+name+'»? Se borran sus scripts, disfraces y sonidos. No se puede deshacer.')){buttons.delete.focus();return;}
    return exclusive(async()=>{
      // The next sprite takes over first: the object in the editor cannot go.
      const sprites=config().sprites,index=sprites.findIndex(sprite=>sprite.id===id),next=(sprites[index+1]??sprites[index-1]).id;
      const moved=await codeViews.selectObject(next);
      if(!moved.ok){explain(moved,{target:nameOf(next)});return;}
      if(await transact(state=>deleteSceneObject(state,{id}))){render();focusSelected();say('«'+name+'» se borró. El escenario se actualiza al ejecutar.');}
    },buttons.delete);
  }
  const actions={add:trigger=>openForm('add',trigger),rename:trigger=>openForm('rename',trigger),duplicate,delete:remove};
  for(const [action,button]of Object.entries(buttons))button.addEventListener('click',()=>{
    if(busy){say('Espera un momento: hay otro cambio en curso.');return;}
    const reason=blocked(action,config(),mounted());
    if(reason){if(!form.hidden)closeForm({restore:false});say(reason);return;}
    if(!form.hidden)closeForm({restore:false});
    void actions[action](button);
  });
  list.addEventListener('click',event=>{const node=event.target.closest('[role=option]');if(node)void choose(node.dataset.object);});
  list.addEventListener('keydown',event=>{
    const node=event.target.closest('[role=option]');if(!node)return;
    const items=options(),index=items.indexOf(node);let next=null;
    if(event.key==='ArrowRight'||event.key==='ArrowDown')next=items[(index+1)%items.length];
    else if(event.key==='ArrowLeft'||event.key==='ArrowUp')next=items[(index-1+items.length)%items.length];
    else if(event.key==='Home')next=items[0];
    else if(event.key==='End')next=items.at(-1);
    else if(event.key==='Enter'||event.key===' '){event.preventDefault();void choose(node.dataset.object);return;}
    if(!next)return;
    event.preventDefault();
    node.tabIndex=-1;next.tabIndex=0;next.focus();next.scrollIntoView({block:'nearest',inline:'nearest'});
  });
  // Tab comes back to the selected option, not to the last one that had focus.
  list.addEventListener('focusout',event=>{
    if(list.contains(event.relatedTarget))return;
    const selected=mounted();for(const node of options())node.tabIndex=node.dataset.object===selected?0:-1;
  });
  form.addEventListener('submit',event=>{event.preventDefault();void submit();});
  input.addEventListener('input',clearProblem);
  form.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeForm();}});
  pick('object-name-cancel').addEventListener('click',()=>closeForm());
  authoring.subscribe(render);contexts.subscribe(render);
  return Object.freeze({render,selectedName:()=>{const objects=config(),id=mounted();return objects&&id?nameOf(id):null;},
    isSingleSprite:()=>{const objects=config();return !objects||(objects.sprites.length===1&&mounted()!=='stage');},dispose(){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();}});
}
