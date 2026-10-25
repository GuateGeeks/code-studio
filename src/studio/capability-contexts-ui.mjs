import {createCapabilities,resolveCapabilityFeatures} from '../contracts/packs.mjs';
import {defaultScene3DConfig,validateScene3DConfig} from '../contracts/scene3d-program.mjs';
import {defaultWebAppConfig,validateWebAppConfig} from '../contracts/webapp-program.mjs';
import {generateApi3CapabilitySource} from '../generated-capability-source.mjs';
import {propertyLabel,explainValidation,objectTypeLabel} from './presentation-text.mjs';
const definitions=[
 {contextId:'scene3d',packId:'gg.3d-basic',title:'Escena 3D',runLabel:'Ejecutar escena 3D',addLabel:'Añadir escena 3D',defaults:defaultScene3DConfig,validate:validateScene3DConfig,collection:'entities',payload:'scene'},
 {contextId:'webapp',packId:'gg.webapps',title:'Aplicación web',runLabel:'Ejecutar aplicación web',addLabel:'Añadir aplicación web',defaults:defaultWebAppConfig,validate:validateWebAppConfig,collection:'nodes',payload:'app'}
];
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
function captureControlFocus(container){
 const element=container.ownerDocument.activeElement;if(!container.contains(element))return null;
 return {element,id:element.id,start:element.selectionStart,end:element.selectionEnd,direction:element.selectionDirection,scrollLeft:element.scrollLeft,scrollTop:element.scrollTop};
}
function restoreControlFocus(container,saved){
 if(!saved)return;const element=saved.element.isConnected?saved.element:container.ownerDocument.getElementById(saved.id);
 if(!element||!container.contains(element)||element.disabled||element.closest('[hidden]'))return;
 element.focus({preventScroll:true});
 if(typeof saved.start==='number'&&typeof element.setSelectionRange==='function')element.setSelectionRange(saved.start,saved.end,saved.direction);
 element.scrollLeft=saved.scrollLeft;element.scrollTop=saved.scrollTop;
}
export function createCapabilityContextsUI({contexts,getCapabilities,activate,textDocuments,onRun,onStop,onExport,onImportModel,onDiagnostic=()=>{}}){
 const entries=new Map(),listeners=new Set();let ready=false;
 const notify=()=>{for(const fn of listeners)fn();};
 const report=(entry,error)=>{entry.error.textContent=error.message;onDiagnostic({level:'error',code:'CONTEXT_AUTHORING',origin:entry.contextId,message:error.message,...(error.sourceBlockId?{sourceBlockId:error.sourceBlockId}:{})});};
 for(const def of definitions){
   const section=el('section');section.id=def.contextId+'-authoring';section.className='capability-authoring';section.hidden=true;
   const id=def.contextId,is3D=id==='scene3d';
   const h=el('h2',def.title),enable=el('button',def.addLabel),content=el('div'),mode=el('fieldset'),doc=el('select'),blocks=el('div'),output=el('textarea'),error=el('output'),status=el('output'),object=el('select'),properties=el('form'),codeLanguage=el('select');
   blocks.id=def.contextId+'-blockly-editor';blocks.className='capability-blockly';blocks.setAttribute('aria-label','Bloques de '+def.title.toLowerCase());blocks.setAttribute('aria-describedby','blockly-keyboard-help');
   section.append(h,enable,content,error);error.role='alert';error.id=def.contextId+'-error';status.id=def.contextId+'-status';status.setAttribute('aria-live','polite');
   const label=(text,input,id)=>{input.id=def.contextId+'-'+id;const l=el('label',text);l.htmlFor=input.id;return [l,input];};
   mode.id=id+'-mode';mode.className='mode-switch';mode.append(el('legend','Programa'));
   for(const [value,text]of [['blocks','Bloques'],['javascript','JavaScript'],['python','Python']]){const wrapper=el('label'),input=el('input');input.type='radio';input.name=id+'-mode';input.value=value;wrapper.append(input,text);mode.append(wrapper);}
   const modeValue=()=>mode.querySelector('input:checked')?.value??'blocks';
   const formFeedback=el('div');formFeedback.className='form-feedback';formFeedback.id=id+'-properties-feedback';formFeedback.setAttribute('role','alert');formFeedback.hidden=true;
   const createJS=el('button','Crear copia JavaScript'),createPy=el('button','Crear copia Python'),run=el('button'),exportButton=el('button','Descargar aplicación autónoma');
   const runIcon=document.createElementNS('http://www.w3.org/2000/svg','svg'),runPath=document.createElementNS('http://www.w3.org/2000/svg','path');runIcon.setAttribute('viewBox','0 0 16 16');runIcon.setAttribute('class','icon');runIcon.setAttribute('aria-hidden','true');runIcon.setAttribute('focusable','false');runPath.setAttribute('d','M4.5 2.6v10.8a.6.6 0 0 0 .9.5l8.4-5.4a.6.6 0 0 0 0-1L5.4 2.1a.6.6 0 0 0-.9.5z');runIcon.append(runPath);run.append(runIcon,def.runLabel);run.className='run';
   run.id=def.contextId+'-run';exportButton.id=def.contextId+'-export';
   const objectPanel=el('section'),codePanel=el('section');
     content.id=id+'-program';createJS.id=id+'-copy-javascript';createPy.id=id+'-copy-python';
     objectPanel.id=id+'-tools';codePanel.id=id+'-code';objectPanel.className=codePanel.className='capability-consultation';
     objectPanel.hidden=codePanel.hidden=true;
     const objectHeading=el('h2',is3D?'Estado inicial 3D':'Componentes iniciales web'),codeHeading=el('h2',is3D?'Código y exportación 3D':'Código y exportación web');
     objectHeading.id=id+'-tools-heading';codeHeading.id=id+'-code-heading';objectHeading.tabIndex=codeHeading.tabIndex=-1;
     objectPanel.setAttribute('aria-labelledby',objectHeading.id);codePanel.setAttribute('aria-labelledby',codeHeading.id);
     objectPanel.append(objectHeading,el('p',is3D?'Estas propiedades pertenecen al estado inicial guardado. Aplicarlas no ejecuta el programa ni representa la última escena en movimiento. Ejecuta de nuevo para observar los cambios.':'Estas propiedades pertenecen al estado inicial guardado. Aplicarlas no ejecuta ni modifica el formulario que está en uso. Los datos introducidos y la lista del resultado no cambian esta autoría. Ejecuta de nuevo para observar los cambios.'));
     const derived=el('p','El código derivado es de solo lectura. Crear una copia abre un documento independiente; editarlo conserva los bloques y no ejecuta.');derived.className='derived-note';
     codePanel.append(codeHeading,derived);
   output.readOnly=true;output.spellcheck=false;output.wrap='off';output.rows=14;
   for(const language of ['javascript','python']){const option=el('option',language==='javascript'?'JavaScript':'Python');option.value=language;codeLanguage.append(option);}
   const details=el('details'),summary=el('summary','Objetos y estado inicial'),addType=el('select'),add=el('button','Añadir objeto'),remove=el('button','Eliminar objeto'),apply=el('button','Aplicar propiedades');
   details.id=def.contextId+'-objects';details.open=true;
   for(const type of (def.contextId==='scene3d'?['sphere','group','box','ground','hemisphericLight','pointLight']:['text','input','button','list','group','form'])){const option=el('option',objectTypeLabel(type));option.value=type;addType.append(option);}
   properties.noValidate=true;apply.type='submit';apply.id=def.contextId+'-apply-properties';properties.append(apply);
   details.append(summary,...label('Objeto',object,'object'),...label('Tipo de objeto nuevo',addType,'new-type'),add,remove,properties);
   const codeControls=[...label('Leer código derivado',codeLanguage,'code-language'),...label('Código de bloques · solo lectura',output,'generated-source')];
   const exportHelp=el('p','Para crear el paquete autónomo deben estar disponibles los servicios locales de Studio. El paquete descargado se ejecuta después sin Studio ni internet.');
     const guide=el('p',is3D?'Antes de ejecutar, predice con tu docente hacia dónde se moverá un objeto. Cambia un valor, compara el resultado y prueba una variante.':'Antes de ejecutar, predice con tu docente qué añadirá el formulario a la lista. Cambia un valor, envía el formulario, compara el resultado y prueba una variante.');guide.id=id+'-guide';
     const programBar=el('div');programBar.className='capability-program-bar';const docField=el('div');docField.append(...label('Documento independiente',doc,'document'));programBar.append(mode,docField);
     content.append(programBar,guide,blocks,status);
     objectPanel.append(details);const copies=el('div');copies.className='controls';copies.append(createJS,createPy);
     codePanel.append(...codeControls,copies,exportButton,exportHelp);
     document.querySelector('#'+id+'-transport').append(run);document.querySelector('#dock-'+id+'-tools').append(objectPanel);document.querySelector('#dock-'+id+'-code').append(codePanel);
   if(def.contextId==='scene3d'){
     const advanced=el('button','Activar jerarquías, modelos y luces');advanced.id='enable-3d-advanced';
     const model=el('input');model.type='file';model.accept='.glb';model.id='import-glb';
     const modelLabel=el('label','Añadir modelo GLB estático · hasta 512 KiB');modelLabel.htmlFor=model.id;
     details.append(advanced,modelLabel,model);
     advanced.addEventListener('click',()=>enablePack('gg.3d-advanced').catch(e=>report(entry,e)));
     model.addEventListener('change',()=>{const file=model.files?.[0];if(file)onImportModel?.(file,entry.capture()).catch(e=>report(entry,e));model.value='';});
   }
   document.querySelector('#context-authoring').append(section);
   let config=null,muted=false,selectedId=null,busy=false,activating=false,features={entityKinds:['sphere','hemisphericLight'],hierarchy:false,rotation:false,scale:false};
   const blockEditor=GGEditor.createCapabilityEditor(blocks,{contextId:def.contextId,documentId:def.defaults().documentId});
   const checkpoints=new WeakMap();
   function capture(){return config?{...structuredClone(config),workspace:blockEditor.captureGraph()}:null;}
   function objects(){return config?.[def.payload][def.collection]??[];}
   function selected(){if(def.contextId==='scene3d'&&object.value==='$camera')return config.scene.cameraArc;return objects().find(item=>item.id===object.value)??objects()[0];}
   function renderProperties(){
     const focus=captureControlFocus(properties);
     let item=selected();selectedId=object.value||item?.id||null;properties.replaceChildren();remove.disabled=selectedId==='$camera';
     if(item&&def.contextId==='webapp')item={...item,props:{...item.props,styles:{color:'#17372e',backgroundColor:'#f5f9f4',fontSize:16,display:'block',gap:8,...item.props.styles}}};
     if(!item)return;
     const visit=(value,path=[])=>{for(const [key,child]of Object.entries(value)){
       const p=[...path,key];if(child&&typeof child==='object'&&!Array.isArray(child)){visit(child,p);continue;}
       const input=el('input');input.dataset.path=JSON.stringify(p);input.id=def.contextId+'-property-'+p.join('-');
       input.type=typeof child==='number'?'number':typeof child==='boolean'?'checkbox':'text';
       if(input.type==='number')input.step='any';if(input.type==='checkbox')input.checked=child;else input.value=Array.isArray(child)?JSON.stringify(child):child??'';
       if(def.contextId==='scene3d'&&(p[0]==='parentId'&&!features.hierarchy||p[0]==='transform'&&p[1]==='rotationDegrees'&&!features.rotation||p[0]==='transform'&&p[1]==='scale'&&!features.scale))input.disabled=true;
       input.dataset.kind=Array.isArray(child)?'array':child===null?'nullable':typeof child;
       const l=el('label',propertyLabel(p));const technicalPath=el('span',p.join('.'));technicalPath.className='technical';l.append(technicalPath);l.htmlFor=input.id;properties.append(l,input);
     }};
     visit(item);properties.append(formFeedback,apply);restoreControlFocus(properties,focus);
   }
   function render(){
     content.hidden=!config;enable.hidden=Boolean(config);enable.disabled=!ready||activating;
     run.disabled=!ready||!config||busy;objectPanel.hidden=codePanel.hidden=contexts.current()!==def.contextId||!config;
     for(const control of objectPanel.querySelectorAll('input[type="file"],#enable-3d-advanced'))control.disabled=!ready||activating;blockEditor.setReady(ready&&Boolean(config));blockEditor.setVisible(contexts.current()===def.contextId&&config?.mode==='blocks');
     if(!config)return;
     for(const input of mode.querySelectorAll('input'))input.checked=input.value===config.mode;doc.hidden=config.mode==='blocks';document.querySelector('label[for="'+doc.id+'"]').hidden=doc.hidden;
     const available=(textDocuments.capture()?.textDocuments??[]).filter(d=>d.language===config.mode);
     const options=[el('option','Selecciona un documento'),...available.map(d=>{const option=el('option',d.name);option.value=d.id;return option;})];options[0].value='';
     doc.replaceChildren(...options);doc.value=config.selectedTextDocumentId??'';blocks.hidden=config.mode!=='blocks';
     run.disabled=exportButton.disabled=!ready||busy;
     const ids=objects().map(x=>x.id).join('|');for(const option of addType.options)if(def.contextId==='scene3d')option.disabled=!features.entityKinds.includes(option.value);if(addType.selectedOptions[0]?.disabled)addType.value='sphere';if(object.dataset.ids!==ids){object.replaceChildren(...objects().map(item=>{const option=el('option',item.name??item.id);option.value=item.id;return option;}));object.dataset.ids=ids;if(def.contextId==='scene3d'){const camera=el('option','Cámara');camera.value='$camera';object.append(camera);}object.value=[...object.options].some(o=>o.value===selectedId)?selectedId:objects()[0]?.id??'';renderProperties();}
     // Readable API v3 (ADR-011); blocks still run through the internal API2 path.
     try{output.value=generateApi3CapabilitySource(blockEditor.program(),codeLanguage.value,{targets:objects().map(item=>item.id)}).text;}catch(e){output.value='';error.textContent=e.message;}
   }
   function changed(){if(muted)return;error.textContent='';status.textContent='Cambios sin ejecutar';render();notify();}
   blockEditor.subscribe(changed);
   mode.addEventListener('change',()=>{if(!config)return;config.mode=modeValue();config.selectedTextDocumentId=null;changed();});
   doc.addEventListener('change',()=>{if(!config)return;config.selectedTextDocumentId=doc.value||null;changed();});
   codeLanguage.addEventListener('change',render);
   // Validation stays next to the form: cause, next step and technical detail.
   function clearFormFeedback(){formFeedback.hidden=true;formFeedback.replaceChildren();for(const input of properties.querySelectorAll('[aria-invalid]')){input.removeAttribute('aria-invalid');input.removeAttribute('aria-describedby');}}
   function reportForm(error){
     clearFormFeedback();
     const explained=explainValidation(error,{duplicateId:error.duplicateId??null,context:def.contextId});
     const title=el('strong',explained.title),next=el('p',explained.next),detail=el('details'),summary=el('summary','Detalle técnico'),original=el('p',String(error.message));
     detail.append(summary,original);formFeedback.append(title,next,detail);formFeedback.hidden=false;
     // Keep the explanation in sight inside the consultation panel without moving the page.
     const scroller=formFeedback.closest('#dock-content');
     if(scroller&&scroller.scrollHeight>scroller.clientHeight){const box=formFeedback.getBoundingClientRect(),view=scroller.getBoundingClientRect();if(box.top<view.top||box.bottom>view.bottom)scroller.scrollTop+=box.top-view.top-8;}
     else formFeedback.scrollIntoView({block:'nearest'});
     if(error.input){error.input.setAttribute('aria-invalid','true');error.input.setAttribute('aria-describedby',formFeedback.id);}
     onDiagnostic({level:'error',code:'CONTEXT_AUTHORING',origin:def.contextId,message:error.message,...(error.sourceBlockId?{sourceBlockId:error.sourceBlockId}:{})});
   }
   object.addEventListener('change',()=>{clearFormFeedback();renderProperties();});
   properties.addEventListener('submit',event=>{
     event.preventDefault();if(!config)return;
     try{
       const next=capture(),index=objects().findIndex(i=>i.id===selectedId),item=selectedId==='$camera'?next.scene.cameraArc:next[def.payload][def.collection][index];if(!item)throw new Error('Selecciona un objeto');
       for(const input of properties.querySelectorAll('input[data-path]')){const path=JSON.parse(input.dataset.path);let cursor=item;for(const key of path.slice(0,-1))cursor=cursor[key]??=( {});const value=input.dataset.kind==='number'?Number(input.value):input.dataset.kind==='boolean'?input.checked:input.dataset.kind==='array'?JSON.parse(input.value):input.dataset.kind==='nullable'?(input.value||null):input.value;cursor[path.at(-1)]=value;}
       const idInput=properties.querySelector('input[data-path=\'["id"]\']');
       const duplicateId=idInput&&objects().some(other=>other.id===idInput.value&&other.id!==selectedId)?idInput.value:null;
       if(duplicateId!==null){const error=new Error('GG capability: identificador duplicado «'+duplicateId+'»');error.duplicateId=duplicateId;error.input=idInput;throw error;}
       config=def.validate(next);if(selectedId!=='$camera')selectedId=item.id;object.dataset.ids='';clearFormFeedback();changed();
     }catch(e){reportForm(e);}
   });
   add.addEventListener('click',()=>{
     if(!config)return;try{
       const next=capture(),id=def.contextId+'-'+crypto.randomUUID(),type=addType.value;
       let item;
       if(def.contextId==='scene3d'){
         const props={sphere:{diameter:1,segments:16,color:'#f0735a',collidable:true},box:{width:2,height:2,depth:2,color:'#568963',collidable:true},ground:{width:20,height:20,subdivisions:1,color:'#8d9d7f',collidable:true},group:{},hemisphericLight:{intensity:1,diffuse:'#ffffff',direction:{x:0,y:1,z:0}},pointLight:{intensity:1,diffuse:'#ffffff'}};
         item={id,name:type,kind:type,parentId:null,visible:true,transform:{position:{x:0,y:0,z:0},rotationDegrees:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}},properties:props[type]};
       }else{const props={text:{text:'Texto'},input:{label:'Entrada',value:'',inputType:'text'},button:{text:'Acción'},list:{items:[]},group:{},form:{}};item={id,type,parentId:next.app.rootId,props:props[type]};}
       next[def.payload][def.collection].push(item);config=def.validate(next);selectedId=id;object.dataset.ids='';changed();
     }catch(e){report(entry,e);}
   });
   remove.addEventListener('click',()=>{if(!config)return;try{const next=capture();next[def.payload][def.collection]=objects().filter(i=>i.id!==selectedId);config=def.validate(next);object.dataset.ids='';changed();}catch(e){report(entry,e);}});
   async function enablePack(id=def.packId){
     if(activating)return;const returnFocus=document.activeElement===enable;activating=true;render();
     try{const previous=getCapabilities(),ids=[...new Set([...(previous?.locks.map(l=>l.id)??['gg.sprites']),id])];
     await activate(createCapabilities(ids,{config:previous?.config??{},versions:{...Object.fromEntries((previous?.locks??[]).map(l=>[l.id,l.version])),'gg.assets':'0.2.0',...(previous?.locks.some(l=>l.id==='gg.sb3')?{'gg.sb3':'0.2.0'}:{})}}));}finally{activating=false;render();if(returnFocus&&config&&!section.hidden&&[document.body,enable].includes(document.activeElement))mode.querySelector('input:checked')?.focus({preventScroll:true});}
   }
   enable.addEventListener('click',()=>enablePack().catch(e=>report(entry,e)));
   function createCopy(language){try{const generated=generateApi3CapabilitySource(blockEditor.program(),language,{targets:objects().map(item=>item.id)});const document=textDocuments.add({language,name:def.title+' · '+(language==='javascript'?'JavaScript':'Python'),source:generated.text,api:'api3',variableIds:generated.variableIds,targetIds:generated.targetIds});config.mode=language;config.selectedTextDocumentId=document.id;changed();const input=section.ownerDocument.querySelector('#text-source');input.focus({preventScroll:true});input.scrollIntoView({block:'nearest'});}catch(e){report(entry,e);}}
   createJS.addEventListener('click',()=>createCopy('javascript'));createPy.addEventListener('click',()=>createCopy('python'));
   run.addEventListener('click',async()=>{if(busy)return;const returnFocus=document.activeElement===run;busy=true;run.disabled=true;status.textContent='Preparando ejecución…';try{await onRun(def.contextId);status.textContent='Ejecución activa';}catch(e){status.textContent='No se pudo iniciar esta ejecución';report(entry,e);}finally{busy=false;run.disabled=!ready;if(returnFocus&&!section.hidden&&document.activeElement===document.body)run.focus({preventScroll:true});}});
   exportButton.addEventListener('click',()=>onExport(def.contextId).catch(e=>report(entry,e)));
   const entry={...def,section,error,status,blockEditor,capture,render,setProfile(capabilities){features=resolveCapabilityFeatures(capabilities,def.contextId);const current=capture();blockEditor.setProfile(capabilities,{documentId:current.documentId});object.dataset.ids='';render();},
     setConfig(next){muted=true;try{config=next===null?null:def.validate(next);if(config)blockEditor.commit(blockEditor.prepare(config.workspace));object.dataset.ids='';}finally{muted=false;}render();notify();}
   };
   entry.participant={id:def.packId,context:def.contextId,
     captureConfig:capture,prepareConfig:(value,options)=>value===null?null:def.validate(value,options),
     commitConfig:entry.setConfig,hasAuthoring:()=>Boolean(config),checkpoint(){const token=Object.freeze({});checkpoints.set(token,{config:structuredClone(config),editor:blockEditor.checkpoint(),selectedId,inputs:[...properties.querySelectorAll('input')].map(i=>({path:i.dataset.path,value:i.value,checked:i.checked})),propertyFocus:captureControlFocus(properties),focused:document.activeElement?.id});return token;},
     restoreDraft(token){const saved=checkpoints.get(token);if(!saved)throw new Error('Context checkpoint absent');muted=true;try{config=saved.config;blockEditor.restoreDraft(saved.editor);selectedId=saved.selectedId;object.dataset.ids='';render();for(const input of properties.querySelectorAll('input')){const item=saved.inputs.find(i=>i.path===input.dataset.path);if(item){input.value=item.value;input.checked=item.checked;}}if(saved.propertyFocus)restoreControlFocus(properties,saved.propertyFocus);else document.getElementById(saved.focused)?.focus();}finally{muted=false;}notify();},
     subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
   };
   entries.set(def.contextId,entry);contexts.register({id:def.contextId,label:def.title,title:'Programa · '+def.title,setVisible(value){section.hidden=!value;render();}});
   render();
 }
 textDocuments.subscribe(()=>{for(const entry of entries.values())entry.render();});
 return Object.freeze({participants:[...entries.values()].map(e=>e.participant),get:id=>entries.get(id),capture:id=>entries.get(id)?.capture(),render(){for(const e of entries.values())e.render();},markStopped(){for(const entry of entries.values())if(entry.capture())entry.status.textContent='Detenido · autoría conservada';},refreshProfiles(authoring){for(const entry of entries.values()){const current=entry.capture();if(current)entry.setProfile(authoring.captureExecutionCapabilities(entry.contextId));entry.render();}},setReady(value){ready=Boolean(value);this.render();},selectSource(id,contextId){contexts.select(contextId);return entries.get(contextId)?.blockEditor.selectSource(id)??false;}});
}
