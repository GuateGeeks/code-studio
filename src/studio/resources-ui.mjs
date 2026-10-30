import {createCapabilities, lockedPackVersions} from '../contracts/packs.mjs';
import {createProject,scene2DObjectsOf} from '../project-format.mjs';
import {promoteLegacyResources,validateResources,createResourceView,applyResourceEdit,copyResourceOwner,decodeResourceAsset} from '../contracts/resources.mjs';
import {inspectWavPcm16} from '../contracts/media-wav.mjs';
import {createAssetProcessor} from '../import/asset-processor.mjs';
import {scratchOpcodeLabel} from './presentation-text.mjs';
import {createStarterLibraryUI} from './starter-library-ui.mjs';
import {scene2DBackdrops,scene2DStageName} from '../contracts/scene2d-objects.mjs';
import {chooseSceneBackdrop} from '../contracts/scene2d-object-edits.mjs';
import {applyStarterLibraryEntry,restoreInitialBackdrop,decodeStarterLibraryEntry,starterLibraryMedia,stageBackdropAssetId} from '../contracts/starter-library.mjs';
export function createResourcesUI({store,contexts,getAuthoring,getProject,editor,runCompatibility,stop,exportSb3,getObjects=()=>null,onDiagnostic=()=>{}}) {
  const pick=id=>document.querySelector('#'+id),processor=createAssetProcessor(),listeners=new Set(),checkpoints=new WeakMap();
  let config=null,report=null,busy=false,ready=false,runnerReady=false,epoch=0,previewURL=null,previewAudio=null,previewIdentity=null,initialBackdrop=null,initialBackdropPending=null;
  function stopPreview(){previewAudio?.close().catch(()=>{});previewAudio=null;pick('resource-audio').textContent='Escuchar vista previa';}
  const notify=()=>{for(const listener of listeners)listener();};
  function error(failure){if(failure.name==='AbortError')return;pick('resources-status').textContent='No se completó la acción. Revisa el mensaje e inténtalo de nuevo.';pick('resources-error').textContent=failure.message;onDiagnostic({level:'error',code:'RESOURCE_ERROR',origin:'shell',message:failure.message});}
  function reference(){return config?.sourceAssetId??'';}
  // The scene's objects and the selected one (scene2d-multi-sprite 3.2): resources
  // are listed and added per object. Null in a single-workspace profile, whose
  // resources are hero's. Only readable once the project is ready.
  function sceneObjects(){
    if(!ready)return null;
    const authoring=getAuthoring(),id=authoring.mountedObject(),objects=scene2DObjectsOf(authoring.captureCapabilities());
    if(!objects||id===null)return null;
    const names=new Map([['stage',scene2DStageName],...objects.sprites.map(sprite=>[sprite.id,sprite.name])]);
    return {id,name:names.get(id),names,backdrop:objects.stage.backdrop};
  }
  function selection(){const value=pick('resource-list').value;const [kind,...rest]=value.split('|');return {kind,id:rest.join('|')};}
  function selected(){const {kind,id}=selection();return (store.view()[kind]??[]).find(item=>item.id===id);}
  function preview() {
    stopPreview();
    if(previewURL)URL.revokeObjectURL(previewURL);previewURL=null;
    const item=selected(),image=pick('resource-image'),audio=pick('resource-audio');
    image.hidden=audio.hidden=true;image.removeAttribute('src');audio.removeAttribute('src');
    const canEdit=Boolean(item)&&ready&&!busy;
    const identity=JSON.stringify(item??null),changed=identity!==previewIdentity;previewIdentity=identity;
    if(changed)pick('resource-name').value=item?.name??'';pick('resource-name').disabled=!canEdit;
    for(const id of ['rename-resource','replace-resource'])pick(id).disabled=!canEdit;
    const costume=selection().kind==='costumes';
    for(const id of ['center-x','center-y','set-resource-center'])pick(id).disabled=!canEdit||!costume;
    if(changed){pick('center-x').value=item?.centerX??0;pick('center-y').value=item?.centerY??0;}
    const resources=store.capture(),asset=item&&resources.assets[item.assetId];
    const metadata=store.view().assets.find(value=>value.id===item?.assetId);
    if(changed&&asset?.format==='png'){pick('crop-x').value=pick('crop-y').value=0;pick('crop-width').value=metadata.width;pick('crop-height').value=metadata.height;}
    if(asset?.format==='wav'){
      const info=inspectWavPcm16(decodeResourceAsset(asset));
      pick('resource-audio-info').textContent=info.frames+' muestras por canal · '+info.channels+' canal(es) · '+info.sampleRate+' Hz · '+info.duration.toFixed(3)+' s';
      if(changed){pick('audio-start').value=0;pick('audio-end').value=info.frames;pick('audio-gain').value=1;}
    }else pick('resource-audio-info').textContent='Selecciona un sonido WAV para editarlo.';
    pick('crop-resource').disabled=!canEdit||asset?.format!=='png';
    pick('edit-resource-audio').disabled=!canEdit||asset?.format!=='wav';
    if(asset) {
      previewURL=URL.createObjectURL(new Blob([typeof asset==='string'?new TextEncoder().encode(asset):decodeResourceAsset(asset)],{type:selection().kind==='sounds'?'audio/wav':'image/'+(typeof asset==='string'||asset.format==='svg'?'svg+xml':asset.format)}));
      if(costume){image.src=previewURL;image.hidden=false;}else{audio.hidden=false;}
    }
  }
  // State and next action of the original, next to its import. Coverage stays secondary.
  function renderOriginalState(entries,blocked) {
    const card=pick('sb3-state'),status=!reference()?'empty':busy||!report?'reviewing':report.status;
    const copy={
      empty:['Sin original importado','Importa un archivo SB3 para revisar qué puede hacer aquí. El original se conserva sin cambios.'],
      reviewing:['Revisando el original…','Espera a que termine la revisión. Nada se ejecuta automáticamente.'],
      'gg-editable':['Se puede ejecutar y convertir','Ejecútalo con «Ejecutar Scratch» junto al resultado, o crea una copia editable en bloques GG. La copia es independiente: el original no cambia.'],
      'vm-compatible':['Se puede ejecutar; no se puede convertir','Ejecútalo con «Ejecutar Scratch» junto al resultado. Usa bloques que GG no traduce a una copia editable; el original se conserva y puedes descargarlo.'],
      unsupported:['Ejecución bloqueada',blocked+' de '+entries.length+' elementos quedan fuera de lo que este entorno ejecuta. Revisa cuáles; puedes descargar el original sin cambios.']
    }[status]??['Original importado',''];
    card.dataset.state=status==='unsupported'?'blocked':status==='vm-compatible'?'runnable':status==='gg-editable'?'editable':status;
    pick('sb3-state-heading').textContent=copy[0];pick('sb3-state-detail').textContent=copy[1];
    pick('copy-sb3-blocks').hidden=status!=='gg-editable';
    pick('download-original-sb3').hidden=!reference();
    pick('sb3-review-coverage').hidden=status!=='unsupported';
  }
  function render() {
    const focused=document.activeElement;
    const view=store.view(),select=pick('resource-list'),previous=select.value,scene=sceneObjects();
    // Other objects' resources stay out; an imported original's (frozen) are not an object's.
    const listed=item=>!scene||item.ownerId===scene.id||!scene.names.has(item.ownerId);
    // A backdrop reads as in its menu: the built-in one is not called «stage».
    const backdrops=new Map(scene?scene2DBackdrops(view).map(item=>[item.id,item.label]):[]),title=(kind,item)=>(kind==='costumes'&&backdrops.get(item.id))||item.name;
    select.replaceChildren(...['costumes','sounds'].flatMap(kind=>view[kind].filter(listed).map(item=>{
      const option=document.createElement('option');option.value=kind+'|'+item.id;option.textContent=title(kind,item)+' · '+(scene?.names.get(item.ownerId)??item.ownerId);return option;
    })));
    pick('import-media-label').textContent=scene?.id==='stage'?'Subir una imagen como fondo, o un sonido':'Subir tu propia imagen o sonido';
    if([...select.options].some(option=>option.value===previous))select.value=previous;
    select.disabled=busy||!ready||!select.options.length;
    for(const id of ['import-sb3','import-media','export-sb3'])pick(id).disabled=!ready||busy;
    pick('cancel-resource-work').hidden=!busy;
    pick('download-original-sb3').disabled=busy||!reference();
    pick('run-sb3').disabled=busy||!ready||!runnerReady||!reference()||!report||report.status==='unsupported';
    pick('copy-sb3-blocks').disabled=busy||report?.status!=='gg-editable';
    pick('sb3-summary').textContent=!reference()?'Importa un archivo Scratch para revisar su cobertura.':!report?'Revisando el original…':({ 'gg-editable':'Compatible y convertible a una copia de bloques GG.','vm-compatible':'Compatible con ejecución Scratch; conserva su autoría original.','unsupported':'Ejecución bloqueada: el archivo usa bloques que este entorno no ejecuta.'}[report.status]);
    pick('sb3-original-id').textContent=reference()?'SHA-256 · '+reference():'Aún no hay un original guardado.';
    const entries=report?.coverage??[],blocked=entries.filter(item=>item.status==='unsupported').length;
    pick('sb3-coverage-count').textContent=!reference()?'Sin archivo para revisar.':!report?'Revisando la cobertura del original…':entries.length+' elementos revisados · '+blocked+' no disponibles en este entorno. Solo lectura; no modifica el original.';
    pick('sb3-review').setAttribute('aria-busy',String(busy));
    renderOriginalState(entries,blocked);
    const labels={'gg-editable':'Admite copia editable GG','vm-compatible':'Compatible con ejecución Scratch','unsupported':'No disponible en este entorno · ejecución bloqueada'};
    const coverage=pick('sb3-coverage');coverage.replaceChildren(...entries.slice(0,1000).map(item=>{
      const li=document.createElement('li');li.dataset.coverageStatus=item.status;
      const title=document.createElement('strong');title.textContent=scratchOpcodeLabel(item.opcode);
      const state=document.createElement('span');state.textContent=labels[item.status]??item.status;
      const owner=document.createElement('span');owner.textContent=report?.candidate?.targets.find(target=>target.id===item.targetId)?.name??(item.targetId?'Objeto '+(Number(item.targetId.match(/:t(\d+)$/)?.[1]??0)+1):'Proyecto');
      const details=document.createElement('details'),summary=document.createElement('summary'),identity=document.createElement('p');
      summary.textContent='Identificación técnica';identity.textContent=[item.opcode,item.targetId??'proyecto',item.blockId??'recurso'].join(' · ');details.append(summary,identity);
      li.append(title,owner,state);
      if(item.reason){const reason=document.createElement('span');reason.className='coverage-reason';reason.textContent=item.reason;li.append(reason);}
      li.append(details);return li;
    }));
    preview();
    renderLibrary();
    if(focused===pick('cancel-resource-work')&&focused.hidden){const destination=pick(contexts.current()==='sb3'?'import-sb3':'import-media');(destination.disabled?pick('authoring-context'):destination).focus({preventScroll:true});}
  }
  async function working(action) {
    if(busy)throw new Error('Espera o cancela la preparación actual.');
    const expected=epoch;busy=true;pick('resources-error').textContent='';pick('resources-status').textContent='Preparando…';render();
    try {const result=await action(()=>epoch===expected);pick('resources-status').textContent='Autoría actualizada · sin ejecutar';return result;}
    finally {busy=false;render();}
  }
  async function baseResources(){const resources=store.captureContext('scratch-2d');return resources.version===1?resources:promoteLegacyResources(getProject().catalog());}
  async function replace(resources,{sourceAssetId,blockly,isCurrent=()=>true}={}) {
    resources=await validateResources(resources);resources=await store.mergeContext(resources);const project=getProject();
    return project.replaceAuthoring(async()=>{
      const metadata=(await project.capture()).project;
      const captured=getAuthoring().capture(),previous=captured.capabilities;
      const ids=[...new Set([...(previous?.locks.map(lock=>lock.id)??['gg.sprites']),'gg.assets',...(sourceAssetId!==undefined?['gg.sb3']:[])])];
      const settings={...(previous?.config??{}),...(sourceAssetId!==undefined?{'gg.sb3':{sourceAssetId,mode:'compatibility'}}:{})};
      return createProject({...metadata,...captured,blockly:blockly??captured.blockly,resources,
        catalog:project.catalog(),capabilities:createCapabilities(ids,{config:settings,versions:{...lockedPackVersions(previous),...(resources.version===2?{'gg.assets':'0.2.0',...(ids.includes('gg.sb3')?{'gg.sb3':'0.2.0'}:{})}:{})}})});
    },{isCurrent});
  }
  // One transaction for the objects panel (scene2d-multi-sprite 3.1): `edit` gets
  // the live authoring and returns the parts it replaces. resources: null keeps
  // the project's, profile included. Same path as any resource change: the
  // runner restarts on the initial scene and nothing runs.
  async function objectsTransaction(edit,isCurrent) {
    const base=await baseResources(),project=getProject();let result=null;
    await project.replaceAuthoring(async()=>{
      const metadata=(await project.capture()).project,captured=getAuthoring().capture(),previous=captured.capabilities;
      result=await edit({capabilities:previous,config:previous.config['gg.sprites'],scene2d:captured.scene2d,codeViews:captured.codeViews??null,resources:base,mounted:getAuthoring().mountedObject()});
      const resources=result.resources?await store.mergeContext(await validateResources(result.resources)):captured.resources;
      const ids=[...new Set([...previous.locks.map(lock=>lock.id),...(result.resources?['gg.assets']:[])])];
      const {codeViews:ignored,...kept}=captured;
      return createProject({...metadata,...kept,blockly:undefined,scene2d:result.scene2d,...(result.codeViews?{codeViews:result.codeViews}:{}),resources,catalog:project.catalog(),
        capabilities:createCapabilities(ids,{config:{...previous.config,'gg.sprites':result.config},versions:{...lockedPackVersions(previous),...(resources.version===2?{'gg.assets':'0.2.0'}:{})}})});
    },{isCurrent,notice:''});
    return result;
  }
  function editObjects(edit){return working(isCurrent=>objectsTransaction(edit,isCurrent));}
  // A backdrop in the stage's list becomes the one the project starts with
  // (scene2d-multi-sprite 4.1). `resources` holds it if it is new.
  function startWithBackdrop(backdrop,resources,isCurrent){return objectsTransaction(state=>chooseSceneBackdrop(state,{resources,backdrop}),isCurrent);}
  async function refreshReport() {
    const sourceAssetId=reference();if(!sourceAssetId){report=null;render();return;}
    const expected=epoch;
    try{const result=await processor.process('derive-sb3',{sourceAssetId,resources:store.captureContext('scratch-2d')});if(epoch===expected&&reference()===sourceAssetId){report=result.report;render();}}
    catch(failure){if(epoch===expected){report=null;error(failure);render();}}
  }
  function download(bytes,name,type) {const url=URL.createObjectURL(new Blob([bytes],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function importSb3(bytes,{read}={}) {return working(async isCurrent=>{
    if(read)bytes=await read();if(!isCurrent())throw new Error('El proyecto cambió durante la lectura.');
    const result=await processor.process('import-sb3',{bytes,resources:await baseResources()});
    await replace(result.resources,{sourceAssetId:result.sourceAssetId,isCurrent});report=result.report;contexts.select('sb3');render();return result.report;
  });}
  pick('import-sb3').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>262144)throw new Error('El archivo Scratch excede256KiB.');await importSb3(null,{read:async()=>new Uint8Array(await file.arrayBuffer())});}catch(failure){error(failure);}finally{event.target.value='';}});
  async function importMedia(file,{replaceId=null}={}) {return working(async isCurrent=>{
    if(file.size>2097152)throw new Error('El medio excede2MiB.');
    const format=file.name.split('.').pop().toLowerCase(),type=format==='wav'?'Sound':'Image',ownerId=sceneObjects()?.id??'hero';
    const prepared=await processor.process('prepare-media',{bytes:new Uint8Array(await file.arrayBuffer()),type,format});
    let resources=await baseResources();resources=await applyResourceEdit(resources,{type:'put-asset',prepared:{id:prepared.id,asset:prepared.asset,integrity:prepared.integrity}});
    const kind=type==='Sound'?'sounds':'costumes',current=replaceId?resources[kind].find(item=>item.id===replaceId):null;
    if(replaceId&&!current)throw new Error('El recurso seleccionado cambió.');
    // On the stage an image is a new backdrop, named as the file so that it reads well in its menu.
    const backdrop=ownerId==='stage'&&type==='Image'&&!current;
    const descriptor=current?{...current,assetId:prepared.id}:{
      id:'GGasset:'+crypto.randomUUID(),ownerId,name:(backdrop&&file.name.replace(/\.[^.]+$/,'').trim()||file.name).slice(0,80),assetId:prepared.id,
      ...(type==='Image'?{centerX:prepared.width/2,centerY:prepared.height/2,bitmapResolution:1}:{})};
    if(current)resources[kind]=resources[kind].map(item=>item.id===current.id?descriptor:item);else resources[kind].push(descriptor);
    if(backdrop)await startWithBackdrop(descriptor.id,resources,isCurrent);else await replace(resources,{isCurrent});
    pick('resource-list').value=kind+'|'+descriptor.id;preview();
  });}
  pick('import-media').addEventListener('change',async event=>{const file=event.target.files?.[0];if(file)try{await importMedia(file);}catch(failure){error(failure);}event.target.value='';});
  pick('replace-resource').addEventListener('change',async event=>{const file=event.target.files?.[0],item=selected();if(file&&item)try{
    const expectedSound=selection().kind==='sounds';if(expectedSound!==(file.name.split('.').pop().toLowerCase()==='wav'))throw new Error('Selecciona un medio del mismo tipo.');
    await importMedia(file,{replaceId:item.id});
  }catch(failure){error(failure);}event.target.value='';});
  pick('resource-list').addEventListener('change',preview);
  pick('resource-audio').addEventListener('click',async()=>{
    if(previewAudio){stopPreview();return;}const item=selected();if(!item)return;
    const context=new AudioContext();previewAudio=context;pick('resource-audio').textContent='Detener vista previa';
    const resume=context.resume();
    try{const resources=await baseResources();const bytes=decodeResourceAsset(resources.assets[item.assetId]);await resume;const buffer=await context.decodeAudioData(bytes.slice().buffer);if(previewAudio!==context)return;
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);source.onended=()=>{if(previewAudio===context)stopPreview();};source.start();
    }catch(failure){if(previewAudio===context){stopPreview();error(failure);}}
  });
  function edit(action) {working(async isCurrent=>{let resources=await baseResources();resources=await action(resources,selected());await replace(resources,{isCurrent});}).catch(error);}
  pick('rename-resource').addEventListener('click',()=>{const name=pick('resource-name').value;edit((resources,item)=>applyResourceEdit(resources,{type:selection().kind==='costumes'?'rename-costume':'rename-sound',id:item?.id,name}));});
  pick('set-resource-center').addEventListener('click',()=>{const centerX=Number(pick('center-x').value),centerY=Number(pick('center-y').value);edit((resources,item)=>applyResourceEdit(resources,{type:'set-costume-center',id:item?.id,centerX,centerY}));});
  async function transform(command,options) {return working(async isCurrent=>{
    const item=selected();if(!item)throw new Error('Selecciona un recurso.');const kind=selection().kind,resources=await baseResources();
    const prepared=await processor.process(command,{bytes:decodeResourceAsset(resources.assets[item.assetId]),...options});
    const next=await applyResourceEdit(resources,{type:'put-asset',prepared:{id:prepared.id,asset:prepared.asset,integrity:prepared.integrity}});
    next[kind]=next[kind].map(value=>value.id===item.id?{...value,assetId:prepared.id,...(prepared.crop?{centerX:value.centerX-prepared.crop.x,centerY:value.centerY-prepared.crop.y}:{})}:value);
    await replace(next,{isCurrent});return prepared;
  });}
  pick('crop-resource').addEventListener('click',()=>transform('crop-png',{crop:Object.fromEntries(['x','y','width','height'].map(key=>[key,Number(pick('crop-'+key).value)]))}).catch(error));
  pick('edit-resource-audio').addEventListener('click',()=>transform('edit-wav',{options:{startFrame:Number(pick('audio-start').value),endFrame:Number(pick('audio-end').value),gain:Number(pick('audio-gain').value)}}).catch(error));
  pick('cancel-resource-work').addEventListener('click',()=>{epoch++;processor.cancel();pick('resources-status').textContent='Preparación cancelada · proyecto conservado';});
  pick('download-original-sb3').addEventListener('click',()=>{const asset=store.capture().assets[reference()];if(asset)download(decodeResourceAsset(asset),'original.sb3','application/zip');});
  pick('run-sb3').addEventListener('click',()=>runCompatibility().catch(error));
  pick('sb3-review-coverage').addEventListener('click',()=>{const panel=pick('sb3-coverage-panel');panel.open=true;panel.querySelector('summary').focus();});
  pick('copy-sb3-blocks').addEventListener('click',()=>working(async isCurrent=>{
    if(report?.status!=='gg-editable'||!report.editable)throw new Error('Este archivo no tiene una traducción completa a bloques GG.');
    const sourceAssetId=reference(),native=report.editable,owner='sb3:'+sourceAssetId+':t1';
    const copied=await copyResourceOwner(await baseResources(),owner,'hero',{idPrefix:'GGcopy:'+sourceAssetId+':',firstCostumeId:'hero'});
    const stage=await copyResourceOwner(copied.resources,'sb3:'+sourceAssetId+':t0','stage',{idPrefix:'GGcopy:'+sourceAssetId+':stage',firstCostumeId:copied.resources.costumes.find(item=>item.ownerId==='stage')?.id??'stage'});
    copied.resources=stage.resources;
    const ir=structuredClone(native.ir);
    function remap(value){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(typeof item==='string'&&(key==='costume'||key==='sound'))value[key]=copied.mapping[key==='costume'?'costumes':'sounds'][item]??item;else remap(item);}}
    remap(ir);const captured=getAuthoring().captureCapabilities();
    const capabilities=createCapabilities([...new Set([...(captured?.locks.map(lock=>lock.id)??['gg.sprites']),'gg.assets'])],{config:captured?.config??{},versions:lockedPackVersions(captured)});
    const blockly=GGEditor.workspaceFromIR(ir,{capabilities,resourceView:createResourceView(copied.resources),layout:native.layout});
    await replace(copied.resources,{blockly,isCurrent});contexts.select('2d');
  }).catch(error));
  pick('export-sb3').addEventListener('click',async()=>{try{const bytes=await exportSb3({ir:getAuthoring().exportProgram(),resources:await baseResources()});download(bytes,'programa-gg.sb3','application/zip');}catch(failure){error(failure);}});
  // Starter library: same worker normalization, contracts and transaction as an
  // uploaded medium; the prepared ID must equal the entry's declared SHA-256.
  function renderLibrary(){
    if(ready&&!initialBackdrop&&!initialBackdropPending)initialBackdropPending=promoteLegacyResources(getProject().catalog())
      .then(resources=>{
        // A project still on the legacy catalog view names the same backdrop by its MD5 ID.
        const catalog=getProject().catalog();
        initialBackdrop=[stageBackdropAssetId(createResourceView(resources)),stageBackdropAssetId(createResourceView(catalog.resources,{catalog}))].filter(Boolean);renderLibrary();}).catch(()=>{}).finally(()=>{initialBackdropPending=null;});
    const scene=sceneObjects();
    library.render({ready,view:store.view(),initialBackdrop,target:scene&&{id:scene.id,name:scene.name},backdrop:scene?.backdrop??null});
  }
  async function prepareLibraryMedia(entry){return processor.process('prepare-media',{bytes:await decodeStarterLibraryEntry(entry),...starterLibraryMedia(entry)});}
  async function addFromLibrary(entry){
    const result=await working(async isCurrent=>{
      const prepared=await prepareLibraryMedia(entry),target=sceneObjects()?.id??undefined;
      if(!isCurrent())throw new Error('El proyecto cambió durante la preparación. Inténtalo de nuevo.');
      if(target==='stage'&&entry.kind==='costume')throw new Error('El escenario no lleva disfraces. Elige un objeto.');
      // With objects the stage keeps its backdrops: blocks can name any of them.
      if(target&&entry.kind==='backdrop'){
        const applied=await applyStarterLibraryEntry(await baseResources(),entry,prepared,{keepBackdrops:true});
        if(applied.descriptorId===sceneObjects().backdrop)return applied;
        await startWithBackdrop(applied.descriptorId,applied.status==='present'?null:applied.resources,isCurrent);
        return {...applied,status:'backdrop'};
      }
      const applied=await applyStarterLibraryEntry(await baseResources(),entry,prepared,entry.kind==='backdrop'||!target?{}:{ownerId:target});
      if(applied.status!=='present')await replace(applied.resources,{isCurrent});
      return applied;
    });
    if(result.status==='present')pick('resources-status').textContent='Sin cambios de recursos';
    const kind=entry.kind==='sound'?'sounds':'costumes';
    if([...pick('resource-list').options].some(option=>option.value===kind+'|'+result.descriptorId)){pick('resource-list').value=kind+'|'+result.descriptorId;preview();}
    return result;
  }
  async function restoreBackdrop(){
    const result=await working(async isCurrent=>{
      const scene=sceneObjects(),restored=await restoreInitialBackdrop(await baseResources(),await promoteLegacyResources(getProject().catalog()),{keepBackdrops:Boolean(scene)});
      if(scene&&restored.descriptorId!==scene.backdrop){await startWithBackdrop(restored.descriptorId,restored.status==='present'?null:restored.resources,isCurrent);return {...restored,status:'restored'};}
      if(!scene&&restored.status!=='present')await replace(restored.resources,{isCurrent});
      return restored;
    });
    if(result.status==='present')pick('resources-status').textContent='Sin cambios de recursos';
    return result;
  }
  async function previewLibrarySound(entry,ended){
    const context=new AudioContext(),resume=context.resume();let closed=false;
    const stop=()=>{if(closed)return;closed=true;context.close().catch(()=>{});};
    try{
      const bytes=await decodeStarterLibraryEntry(entry);await resume;
      const source=context.createBufferSource();source.buffer=await context.decodeAudioData(bytes.slice().buffer);
      source.connect(context.destination);source.onended=()=>{stop();ended();};source.start();return stop;
    }catch(failure){stop();throw failure;}
  }
  const library=createStarterLibraryUI({pick,onAdd:entry=>addFromLibrary(entry).catch(failure=>{error(failure);throw failure;}),
    onAddObject:entry=>getObjects().addFromLibrary(entry,prepareLibraryMedia).catch(failure=>{error(failure);throw failure;}),
    onRestore:()=>restoreBackdrop().catch(failure=>{error(failure);throw failure;}),onPreview:previewLibrarySound});
  contexts.register({id:'sb3',label:'Scratch importado',title:'Proyecto Scratch',setVisible:value=>{pick('sb3-authoring').hidden=!value;if(value&&reference()&&!report&&!busy)void refreshReport();}});
  const participant={
    id:'gg.sb3',context:'scratch-compatibility',captureConfig:()=>config==null?null:structuredClone(config),
    prepareConfig:(value,{resources}={})=>{if(value==null)return null;if(value.sourceAssetId&&(resources?.assets[value.sourceAssetId]?.type!=='Source'||resources.assets[value.sourceAssetId].format!=='sb3'))throw new Error('Original SB3 no disponible');return structuredClone(value);},
    commitConfig:value=>{config=value;report=null;render();},
    checkpoint:()=>{const token=Object.freeze({});checkpoints.set(token,{config:structuredClone(config),report:structuredClone(report)});return token;},
    restoreDraft:token=>{const saved=checkpoints.get(token);if(!saved)throw new Error('Checkpoint Scratch inválido');config=saved.config;report=saved.report;render();},
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},hasAuthoring:()=>Boolean(reference())
  };
  render();
  return Object.freeze({participant,reference,importSb3,refreshReport,editObjects,render,setReady:value=>{ready=Boolean(value);render();},
    authoringChanged:()=>{epoch++;if(!busy)processor.cancel();},invalidate:()=>{epoch++;processor.cancel();stopPreview();library.stopPreview();},
    setRunnerReady:value=>{runnerReady=Boolean(value);pick('run-sb3').disabled=busy||!ready||!runnerReady||!reference()||!report||report.status==='unsupported';},
    state:()=>({busy,sourceAssetId:reference(),report:structuredClone(report),library:library.state()}),openLibrary:()=>library.ensure(),dispose:()=>{processor.dispose();library.dispose();if(previewURL)URL.revokeObjectURL(previewURL);listeners.clear();}});
}
