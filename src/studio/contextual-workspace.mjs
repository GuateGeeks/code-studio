// Composition only. Navigation never owns authoring or a runtime session.
const definitions = {
  '2d': {name:'Escena 2D',result:'bloques 2D',run:'run-editor',help:'Cambia los bloques, predice el movimiento con tu docente y compara con el resultado. Propiedades distingue el estado inicial de la última lectura de ejecución.'},
  text: {name:'Texto para 2D',result:'documento 2D',run:'run-document',help:'Editas un documento independiente. Ejecutar documento 2D usa ese texto; volver a bloques conserva ambas versiones. Compara sus resultados después de ejecutarlas por separado.'},
  microbit: {name:'micro:bit y escena',result:'micro:bit y escena 2D',run:'run-device',help:'Los bloques de firmware o el documento TypeScript programan el dispositivo. Ejecutar dispositivo y escena inicia la simulación conjunta. Compilar y descargar HEX son acciones distintas; la placa requiere una prueba física.'},
  sb3: {name:'Scratch importado',result:'Scratch importado',run:'run-sb3',help:'Importa un SB3 y revisa qué puede hacer aquí antes de ejecutarlo. El original se conserva; crear una copia editable en bloques GG es una acción explícita.'},
  scene3d: {name:'Escena 3D',result:'escena 3D',run:'scene3d-run',help:'Selecciona bloques o un documento independiente. Objetos 3D permite editar la escena y la cámara iniciales; ejecutar aplica la autoría seleccionada al resultado 3D.'},
  webapp: {name:'Aplicación web',result:'aplicación web',run:'webapp-run',help:'Selecciona bloques o un documento independiente. Componentes web permite editar los elementos iniciales de la aplicación; ejecuta para observar y probar sus controles.'}
};
// Which consultation tools exist for each context. Hidden tools keep their nodes mounted.
const toolAvailability = {
  inspector:id=>['2d','text','microbit'].includes(id),
  code:id=>['2d','text'].includes(id),
  firmware:id=>id==='microbit',
  sb3:id=>id==='sb3',
  'scene3d-tools':(id,ui)=>id==='scene3d'&&Boolean(ui.capture('scene3d')),
  'scene3d-code':(id,ui)=>id==='scene3d'&&Boolean(ui.capture('scene3d')),
  'webapp-tools':(id,ui)=>id==='webapp'&&Boolean(ui.capture('webapp')),
  'webapp-code':(id,ui)=>id==='webapp'&&Boolean(ui.capture('webapp')),
  activity:()=>true,console:()=>true,resources:id=>['2d','text','sb3'].includes(id),help:()=>true
};
const languageName=language=>language==='javascript'?'JavaScript':language==='python'?'Python':'bloques';
export function createContextualWorkspace({contexts,textDocuments,capabilityUI,device,stopResult,getTextContext=()=>null,getAuthoringKey=()=>null,codeViews=null,is2DEnabled=()=>true,selectedObject=()=>null,canRestoreExample=()=>true,onError=()=>{}}) {
  const pick=selector=>document.querySelector(selector);
  const text=pick('.text-authoring'),inspector=pick('.scene-inspector'),generated=pick('.generated-panel');
  const tools=pick('#context-tools'),tabList=pick('#dock-tabs'),dock=pick('#dock-content');
  const tabs=[...tabList.querySelectorAll('[role=tab]')];
  const textHelp=pick('#text-api-help').textContent;
  const remembered=new Map();
  let rendering=false,result=null,pendingTimer=0,pendingLanguage='javascript',documentKey='';
  const tabFor=tool=>tabs.find(tab=>tab.dataset.tool===tool);
  const panelFor=tab=>pick('#'+tab.getAttribute('aria-controls'));
  const visibleTabs=()=>tabs.filter(tab=>!tab.hidden);
  function selectTool(tool,{focusTab=false,remember=true}={}) {
    const target=tabFor(tool);if(!target||target.hidden)return false;
    const changed=target.getAttribute('aria-selected')!=='true'||panelFor(target).hidden;
    for(const tab of tabs){const selected=tab===target;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;panelFor(tab).hidden=!selected;}
    if(remember)remembered.set(contexts.current(),tool);
    if(focusTab)target.focus({preventScroll:true});
    // Keep the selected tab inside the horizontally scrollable tab row only.
    if(changed||focusTab){const row=tabList.getBoundingClientRect(),box=target.getBoundingClientRect();if(box.left<row.left)tabList.scrollLeft-=row.left-box.left;else if(box.right>row.right)tabList.scrollLeft+=box.right-row.right;}
    if(changed)dock.scrollTop=0;
    return true;
  }
  const selectedTool=()=>tabs.find(tab=>tab.getAttribute('aria-selected')==='true')?.dataset.tool;
  // Reveal an element inside a consultation panel: select its tool, open
  // collapsed details and focus without moving the page or the program.
  function reveal(element,{focus=true}={}) {
    if(!element)return false;
    const panel=element.closest('[role=tabpanel]');
    if(panel){const tab=tabs.find(item=>item.getAttribute('aria-controls')===panel.id);if(tab&&!selectTool(tab.dataset.tool))return false;}
    for(let node=element.parentElement;node;node=node.parentElement)if(node.tagName==='DETAILS'&&!node.open&&node.querySelector(':scope > summary')!==element)node.open=true;
    if(element.tagName==='DETAILS'){element.open=true;element=element.querySelector(':scope > summary');}
    if(focus)element.focus({preventScroll:true});
    if(dock.contains(element)&&getComputedStyle(dock).overflowY==='auto')dock.scrollTop+=element.getBoundingClientRect().top-dock.getBoundingClientRect().top-12;
    else element.scrollIntoView({block:'nearest'});
    return true;
  }
  function go(target) {
    const element=pick(target);if(!element)return;
    if(element.closest('[role=tabpanel]')||element.closest('details'))reveal(element);
    else {element.focus({preventScroll:true});element.scrollIntoView({block:'nearest'});}
  }
  function tool(label,target) {
    const link=document.createElement('a');link.textContent=label;link.href=target;return link;
  }
  function editingLabel(id,def,config) {
    if(id==='2d')return 'bloques';
    if(id==='text'){const selected=textDocuments.selected();return selected?'el documento «'+selected.name+'» ('+languageName(selected.language)+')':'sin documento seleccionado';}
    if(id==='microbit'){const mode=device.config()?.mode;return mode==='typescript'?'el documento TypeScript independiente':mode?'bloques de firmware':'sin dispositivo añadido';}
    if(id==='sb3')return 'el original de solo lectura';
    if(!config)return 'sin añadir al proyecto';
    if(config.mode==='blocks')return 'bloques';
    const selected=textDocuments.selected();
    return selected?'el documento «'+selected.name+'» ('+languageName(config.mode)+')':'sin documento '+languageName(config.mode)+' seleccionado';
  }
  function renderResult() {
    const current=contexts.current(),other=pick('#result-other');
    const origin=result?.running?(definitions[result.context]?.name??(result.context==='microbit-document'?definitions.microbit.name:'un ejemplo técnico 2D')):null;
    const foreign=Boolean(origin)&&result.context!==current&&!(result.context==='microbit-document'&&current==='microbit');
    const idle=!result?.running&&['microbit','sb3','scene3d','webapp'].includes(current);
    other.hidden=!foreign&&!idle;
    const runLabel=()=>pick('#'+definitions[current].run)?.textContent.trim();
    if(foreign)other.textContent='Estás editando '+definitions[current].name+'. Este resultado sigue siendo de '+origin+': Detener lo detiene y Ejecutar '+definitions[current].name+' lo reemplaza.';
    else if(idle&&current==='microbit')other.textContent=device.config()
      ? 'Todavía no has ejecutado micro:bit y escena. Aquí se ve la escena 2D inicial; la placa aparece al pulsar «'+runLabel()+'».'
      : 'micro:bit aún no está en el proyecto. Aquí se ve la escena 2D inicial.';
    else if(idle&&current==='sb3')other.textContent=pick('#run-sb3')?.disabled
      ? 'Aquí se ve la escena 2D inicial. Un original Scratch se muestra aquí solo cuando su cobertura permite ejecutarlo.'
      : 'Todavía no has ejecutado el original Scratch. Aquí se ve la escena 2D inicial hasta que pulses «'+runLabel()+'».';
    else if(idle)other.textContent=capabilityUI.capture(current)
      ? 'Todavía no has ejecutado '+definitions[current].name+'. Aquí se ve la escena 2D inicial hasta que pulses «'+runLabel()+'».'
      : definitions[current].name+' aún no está en el proyecto. Aquí se ve la escena 2D inicial.';
    schedulePending();
  }
  function schedulePending(){clearTimeout(pendingTimer);pendingTimer=setTimeout(updatePending,200);}
  function updatePending() {
    const notice=pick('#result-pending');
    const stale=Boolean(result?.running&&definitions[result.context]&&result.key!==null&&result.context===contexts.current()&&getAuthoringKey(result.context)!==result.key);
    notice.hidden=!stale;
  }
  function renderTabs(id) {
    for(const tab of tabs)tab.hidden=!toolAvailability[tab.dataset.tool](id,capabilityUI);
    const wanted=remembered.get(id);
    const next=[wanted,selectedTool(),'help'].find(candidate=>candidate&&!tabFor(candidate)?.hidden);
    selectTool(next,{remember:false});
  }
  function renderModeSwitch(id) {
    const fieldset=pick('#program-mode');fieldset.hidden=!['2d','text'].includes(id);if(fieldset.hidden)return;
    const selected=textDocuments.selected();
    const value=id==='2d'?(codeViews?.mode(id)??'blocks'):selected?.language??pendingLanguage;
    for(const input of fieldset.querySelectorAll('input'))input.checked=input.value===value;
    const empty=pick('#text-empty');
    empty.hidden=!(id==='text'&&!selected);
    if(!empty.hidden){
      pick('#text-empty-message').textContent='No hay un documento '+languageName(pendingLanguage)+' seleccionado. Elige uno, crea uno nuevo o haz una copia independiente de tus bloques.';
      pick('#text-copy-from-blocks').textContent='Crear copia '+languageName(pendingLanguage)+' desde tus bloques';
    }
  }
  function render() {
    if(rendering)return;rendering=true;
    try {
      const id=contexts.current(),def=definitions[id];if(!def)return;
      const synchronized=codeViews?.presentation(id)??null;
      textDocuments.presentCodeView?.(synchronized);
      pick('#scene-blockly-surface').hidden=id!=='2d'||!is2DEnabled()||Boolean(synchronized);
      document.body.dataset.workspaceContext=id;
      pick('#blocks-transport').hidden=id!=='2d';
      pick('#text-transport').hidden=id!=='text';
      pick('#device-transport').hidden=id!=='microbit';
      pick('#device-firmware-panel').hidden=id!=='microbit';
      pick('#sb3-transport').hidden=pick('#sb3-tools-panel').hidden=id!=='sb3';
      pick('#scene3d-transport').hidden=id!=='scene3d';
      pick('#webapp-transport').hidden=id!=='webapp';
      // The example is a sprite's program: its IDs fit only a project of one sprite.
      pick('#restore-editor').hidden=id!=='2d'||Boolean(synchronized)||!canRestoreExample();
      const active=document.activeElement;
      const feedback=pick('#resource-feedback'),feedbackSlot=pick(id==='sb3'?'#sb3-feedback-slot':'#resource-feedback-home');
      if(feedback.parentElement!==feedbackSlot){
        const preserveFocus=feedback.contains(active);feedbackSlot.append(feedback);
        if(preserveFocus)active.focus({preventScroll:true});
      }
      const config=capabilityUI.capture(id),capabilityText=Boolean(config&&config.mode!=='blocks');
      document.body.dataset.workspaceMode=synchronized?.language??config?.mode??(id==='text'?'text':'blocks');
      text.hidden=id!=='text'&&!capabilityText&&!synchronized;
      textDocuments.present(capabilityText?{documentId:config.selectedTextDocumentId,language:config.mode}:{});
      pick('#new-javascript').hidden=pick('#new-python').hidden=capabilityText;
      // Selecting an existing document preserves incomplete drafts in the model.
      const is2D=['2d','text','microbit'].includes(id);
      inspector.hidden=!is2D;
      generated.hidden=!['2d','text'].includes(id);
      pick('.resource-tools').hidden=!['2d','text','sb3'].includes(id);
      const deviceText=id==='microbit'&&device.config()?.mode==='typescript';
      const devicePanel=pick('#device-text-authoring');
      const deviceSlot=pick(deviceText?'#device-text-slot':'#device-text-secondary');
      if(devicePanel.parentElement!==deviceSlot){
        const preserveFocus=devicePanel.contains(active);
        deviceSlot.append(devicePanel);
        if(preserveFocus)active.focus({preventScroll:true});
      }
      pick('.keyboard-help').hidden=id==='text'||id==='sb3'||capabilityText||deviceText||Boolean(synchronized);
      pick('#advanced-tools').hidden=!['2d','text'].includes(id);
      pick('#position').hidden=!is2D;
      pick('#text-run-status').hidden=pick('#text-run-document').hidden=capabilityText||Boolean(synchronized);
      pick('#text-api-help').textContent=capabilityText
        ? `Esta copia conserva los eventos y las operaciones de ${def.name}. Cambia sus valores y ejecútala con los controles de este contexto. Los errores se muestran en Diagnósticos.`
        : textDocuments.helpText?.()??textHelp;
      pick('#text-context-actions').hidden=!capabilityText;
      if(capabilityText){
        pick('#text-context-run').href='#'+id+'-run';
        pick('#text-context-run').textContent='Ir a Ejecutar '+def.name;
      }
      pick('#text-destination').textContent=synchronized?synchronized.destination:capabilityText
        ? `Destino: ${def.name}. Documento independiente; ejecuta con el botón de este contexto. Editarlo no cambia los bloques.`
        : 'Destino: escena 2D. Documento independiente; editarlo no modifica los bloques.';
      const object=id==='2d'?selectedObject():null;
      const editing=id==='sb3'?'Revisando el original · solo lectura':object?'Editando: '+object+' · '+languageName(synchronized?.language):synchronized?'Editando '+languageName(synchronized.language)+' del programa':'Editando '+editingLabel(id,def,config);
      // A live region: only a real change is announced.
      if(pick('#editing-context').textContent!==editing)pick('#editing-context').textContent=editing;
      pick('#run-editor-label').textContent=synchronized?'Ejecutar programa':'Ejecutar bloques';
      pick('#workspace-help-heading').textContent='Ayuda y herramientas · '+def.name;
      pick('#workspace-guidance').textContent=synchronized?'Editas el mismo programa en texto. Predice el cambio con tu docente y vuelve a Bloques para comprobarlo. Ejecutar usa el texto validado; cambiar de vista conserva el resultado activo.':def.help;
      const activityElsewhere=!['2d','text'].includes(id);
      pick('#activity-pointer').textContent=activityElsewhere
        ? 'Las actividades guiadas disponibles son recorridos de Escena 2D. Consultarlas no cambia este programa; cargar una protege tu proyecto, lo reemplaza y abre Escena 2D sin ejecutar.'
        : 'Actividad ofrece tres recorridos guiados de Escena 2D con predicción, pistas graduadas y comprobación.';
      const destination=pick('#activity-destination');destination.hidden=!activityElsewhere;
      destination.textContent='Estás editando '+def.name+'. Estas actividades pertenecen a Escena 2D: leerlas no cambia tu programa. «Cargar ejemplo» protege y reemplaza el proyecto actual y abre Escena 2D sin ejecutar.';
      const links=[];
      if(is2D)links.push(tool('Inspeccionar estado 2D','#inspector-heading'));
      if(['2d','text'].includes(id))links.push(tool('Leer código de bloques 2D y crear copia','#generated-heading'));
      if(['2d','text','sb3'].includes(id))links.push(tool('Biblioteca de disfraces y sonidos','#resources-panel'));
      if(config){
        links.push(tool(id==='scene3d'?'Objetos y estado inicial':'Componentes y estado inicial','#'+id+'-objects'));
        links.push(tool('Código, copias y exportación','#'+id+'-code-heading'));
      }
      if(id==='microbit')links.push(tool('Firmware, HEX y placa','#device-firmware-heading'),tool('Documento TypeScript','#source'));
      if(id==='sb3')links.push(tool('Importación y estado del original','#import-sb3'),tool('Original y copia editable','#sb3-tools-heading'),tool('Leer cobertura','#sb3-coverage-panel'));
      links.push(tool('Actividad con tu docente','#lesson-select'));
      tools.replaceChildren(...links);
      renderTabs(id);
      renderModeSwitch(id);
      renderResult();
      if(active?.closest('[hidden]'))go('#authoring-context');
    } finally {rendering=false;}
  }
  // Tabs: click or Enter/Space selects; arrows, Home and End follow the APG pattern.
  tabList.addEventListener('click',event=>{const tab=event.target.closest('[role=tab]');if(tab)selectTool(tab.dataset.tool);});
  tabList.addEventListener('keydown',event=>{
    const tab=event.target.closest('[role=tab]');if(!tab)return;
    const list=visibleTabs(),index=list.indexOf(tab);let next=null;
    if(event.key==='ArrowRight')next=list[(index+1)%list.length];
    else if(event.key==='ArrowLeft')next=list[(index-1+list.length)%list.length];
    else if(event.key==='Home')next=list[0];
    else if(event.key==='End')next=list.at(-1);
    if(!next)return;
    event.preventDefault();selectTool(next.dataset.tool,{focusTab:true});
  });
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target.closest('a[href^="#"]');if(!link)return;
    const target=link.getAttribute('href');
    if(target==='#text-heading')contexts.select('text');
    if(!pick(target))return;
    event.preventDefault();
    if(link.dataset.tool)selectTool(link.dataset.tool);
    go(target);
  });
  // Other modules ask for a consultation element without knowing the dock.
  document.addEventListener('gg-reveal',event=>{reveal(event.detail?.element,{focus:event.detail?.focus!==false});});
  pick('#stop-result').addEventListener('click',()=>Promise.resolve(stopResult()).catch(onError));
  // Expanded result: the same iframe grows in place; nothing is remounted.
  const expand=pick('#expand-result');
  const outside=()=>[pick('.app-bar'),pick('.authoring'),pick('#workspace-dock'),pick('.project-notices'),pick('#entry-panel'),pick('.release-footer'),pick('.skip-links')];
  function setExpanded(value,{restoreFocus=true}={}) {
    document.body.classList.toggle('result-expanded',value);
    for(const node of outside())node.inert=value;
    expand.setAttribute('aria-pressed',String(value));expand.textContent=value?'Reducir':'Ampliar';
    if(!value&&restoreFocus)expand.focus({preventScroll:true});
  }
  expand.addEventListener('click',()=>setExpanded(!document.body.classList.contains('result-expanded')));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.body.classList.contains('result-expanded')){event.preventDefault();setExpanded(false);}});
  pick('#run-pending').addEventListener('click',()=>{const def=definitions[result?.context];if(def)pick('#'+def.run)?.click();});
  // The 2D selector presents synchronized views. The independent Text
  // context keeps its document picker and its existing copies.
  pick('#program-mode').addEventListener('change',event=>{
    const value=event.target.value;
    if(codeViews&&contexts.current()==='2d'){void codeViews.select(value).catch(onError);return;}
    if(value==='blocks'){if(codeViews)void codeViews.select('blocks').then(ok=>{if(ok)contexts.select('2d');}).catch(onError);else contexts.select('2d');return;}
    pendingLanguage=value;
    const picker=pick('#text-document'),selected=textDocuments.selected();
    contexts.select('text');
    if(selected?.language!==value){
      const match=(textDocuments.capture()?.textDocuments??[]).find(document=>document.language===value);
      picker.value=match?.id??'';picker.dispatchEvent(new Event('change'));
    }
    render();
  });
  pick('#text-copy-from-blocks').addEventListener('click',()=>pick(pendingLanguage==='python'?'#copy-python':'#copy-javascript').click());
  // Header menus behave as disclosures: an outside click or Esc closes them,
  // and Esc returns focus to the menu button.
  document.addEventListener('click',event=>{for(const menu of document.querySelectorAll('header details.app-menu[open]'))if(!menu.contains(event.target))menu.open=false;});
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const menu=event.target.closest?.('header details.app-menu[open]');if(menu){menu.open=false;menu.querySelector(':scope > summary').focus();}});
  // Project notices stay until acknowledged; new text shows the band again.
  const notices=pick('.project-notices');
  const noticeText=()=>[...notices.querySelectorAll('output')].map(node=>node.textContent).join('\n');
  let dismissed=null;
  pick('#dismiss-notices').addEventListener('click',()=>{dismissed=noticeText();notices.hidden=true;pick('#authoring-context').focus({preventScroll:true});});
  new MutationObserver(()=>{if(notices.hidden&&noticeText()!==dismissed)notices.hidden=false;}).observe(notices,{subtree:true,childList:true,characterData:true});
  const fitStation=()=>{const shown=notices.getClientRects().length>0;document.documentElement.style.setProperty('--gg-notices-height',shown?notices.offsetHeight+parseFloat(getComputedStyle(notices).marginBottom)+'px':'0px');};
  new ResizeObserver(fitStation).observe(notices);fitStation();
  contexts.subscribe(render);
  for(const participant of capabilityUI.participants)participant.subscribe(render);
  device.participant.subscribe(render);
  textDocuments.subscribe(()=>{
    // A context's document picker and shared source editor describe one selection.
    const id=contexts.current(),config=capabilityUI.capture(id);
    if(config&&config.mode!=='blocks'&&!rendering){
      const picker=pick('#'+id+'-document'),selected=textDocuments.selected();
      if(selected?.language===config.mode&&picker.value!==selected.id){picker.value=selected.id;picker.dispatchEvent(new Event('change'));}
    }
    // Re-render on selection or name changes only; typing keeps its caret.
    const selected=textDocuments.selected(),key=selected?selected.id+'\u0000'+selected.name:'';
    if(key!==documentKey&&!rendering){documentKey=key;render();}
    schedulePending();
  });
  // Importing an original or adding the device changes what an idle result means.
  const idleSources=[pick('#run-sb3'),pick('#device-configured')].filter(Boolean);
  if(idleSources.length){const watch=new MutationObserver(()=>renderResult());for(const node of idleSources)watch.observe(node,{attributes:true,attributeFilter:['disabled','hidden']});}
  return Object.freeze({render,reveal,selectTool,
    // label names the result; context and running identify its authoring.
    result(label,{context=null,running=false}={}){
      result=context?{context,running,key:running?getAuthoringKey(context):null}:null;
      pick('#result-context').textContent=label;
      // The 2D position means nothing beside a 3D scene or a web application.
      pick('#position').hidden=['scene3d','webapp'].includes(context);
      renderResult();
    },
    authoringChanged:schedulePending,
    revealText(documentId){
      const executionContext=getTextContext(documentId);
      if(executionContext)contexts.select(executionContext);
      const id=contexts.current(),config=capabilityUI.capture(id);
      if(!config||config.mode==='blocks'||(documentId&&config.selectedTextDocumentId!==documentId))contexts.select('text');
      render();
    }});
}
