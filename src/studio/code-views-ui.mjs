import {createCodeViewService} from './code-view-service.mjs';
import {canonicalPackData,resolveCapabilities} from '../contracts/packs.mjs';
import {languageAvailability,tablesForLocks} from '../contracts/language-table.mjs';
import {scene2DBackdrops} from '../contracts/scene2d-objects.mjs';
import {languageTables} from '../packs/language-tables.mjs';

const name=language=>language==='javascript'?'JavaScript':language==='python'?'Python':'Bloques';
const digest=async(state,order)=>{
  const data=new TextEncoder().encode(canonicalPackData([state,order??null]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),byte=>byte.toString(16).padStart(2,'0')).join('');
};
// An error of the student's text, not of the tools that read it.
const textError=failure=>/^CV_/.test(failure.code??'')&&!['CV_PARSE','CV_LANGUAGE_UNAVAILABLE','CV_TABLE','CV_METADATA','CV_REQUEST'].includes(failure.code);
// objects (scene2d-multi-sprite 2.2, R2): {current():id|null, owner(id), mount(id,{scriptOrder})}.
// Views and copies belong to the current object; no hook means hero, as before.
export function createCodeViewsUI({state,editor,textDocuments,contexts,config,getProject,
  onRender=()=>{},onDiagnostic=()=>{},onCopy=()=>{},onSourceChanged=()=>{},canRun=()=>true,requirePack=()=>{},objects=null}) {
  const source=document.querySelector('#text-source'),errorOutput=document.querySelector('#text-error');
  const service=createCodeViewService({origin:config.languageOrigin,releaseBase:config.releaseBase??'/'});
  const known=new Map(),pointSnapshots=new Map(),notice=new Set(),carets=new Map();
  let ready=false,busy=false,error=null,warning='',attempt=0,epoch=0,staging=null,selfCommit=false,lastContext=contexts.current(),applyFailure={reason:'cancelled'};
  const supports=context=>context==='2d';
  const current=()=>state.get(contexts.current());
  const ownerOption=()=>{const id=objects?.current()??null;return id===null?{}:{owner:objects.owner(id)};};
  const captureSnapshot=()=>editor.codeViewSnapshot({inheritedGlobalIds:objects?.inheritedGlobalIds?.()??[]});
  const generate=(snapshot,language)=>GGEditor.generateCodeViewSource(snapshot,language,ownerOption());
  const same=(a,b)=>canonicalPackData(a)===canonicalPackData(b);
  const setText=(node,text)=>{if(node.textContent!==text)node.textContent=text;};
  function activeTables(){
    const plan=resolveCapabilities(editor.captureCapabilities());
    const packs=plan.packs.filter(pack=>!pack.manifest.context||pack.manifest.context==='scratch-2d');
    return tablesForLocks(packs.map(pack=>({id:pack.id,version:pack.version})),languageTables,
      Object.fromEntries(packs.map(pack=>[pack.id+'@'+pack.version,pack.manifest])));
  }
  function textHelp(language){
    const entries=Object.values(activeTables()).flat(),field=language==='python'?'python':'js';
    const events=entries.filter(entry=>entry.kind==='event'&&['onStart','onKey','onMessage'].includes(entry.js)).map(entry=>entry[field]).filter(Boolean);
    const examples=[],owner=ownerOption().owner;
    const move=entries.find(entry=>entry.lower?.ir==='move'),wait=entries.find(entry=>entry.ctx==='wait');
    if(owner?.kind!=='stage'&&move?.[field])examples.push((owner?.identifier??'hero')+'.'+move[field]+'(10)');
    if(wait?.[field])examples.push(wait[field]+'(1)');
    const backdrop=entries.find(entry=>entry.lower?.ir==='setBackdrop');
    if(backdrop?.[field]){
      const available=scene2DBackdrops(editor.resourceView());
      if(available.length)examples.push(backdrop[field]+'('+JSON.stringify(available[0].label)+')');
    }
    return 'Usa '+events.join(', ')+' en '+name(language)+'. Dentro de un evento: '+examples.join(', ')+'. Puedes usar variables, repetición y comparaciones. El texto fuera del subconjunto se puede conservar como copia independiente.';
  }
  function availability(context,language){
    if(!supports(context))return {editable:false,reason:'Este contexto todavía no tiene vistas sincronizadas.'};
    try{
      const result=languageAvailability(activeTables(),{lowering:'ir'})[language];
      return {editable:result.available,reason:result.reason};
    }catch(failure){return {editable:false,reason:failure.message};}
  }
  function render(){
    const context=contexts.current(),entry=current(),active=supports(context)&&entry.language!=='blocks';
    const actions=document.querySelector('#code-view-actions');
    actions.hidden=!active;
    document.querySelector('#code-view-edit').hidden=!active||!error;
    document.querySelector('#code-view-restore').hidden=!active||!error;
    document.querySelector('#code-view-copy').disabled=!ready||busy;
    const undoButton=document.querySelector('#code-view-undo'),undoHome=document.querySelector('#code-view-undo-home');
    const hasPoint=supports(context)&&Boolean(entry.restorePoint);
    undoButton.disabled=!ready||busy||!hasPoint;undoButton.hidden=!hasPoint;
    undoHome.hidden=active||!hasPoint;
    const undoSlot=active?actions:undoHome;if(undoButton.parentElement!==undoSlot)undoSlot.append(undoButton);
    document.querySelector('#code-view-format').hidden=!active||!notice.has(context);
    for(const input of document.querySelectorAll('#program-mode input'))if(context==='2d')input.disabled=!ready||busy;
    if(context==='2d')document.querySelector('#run-editor').disabled=!ready||busy||!canRun();
    onRender();
  }
  function clearPending(point){
    if(!point)return;
    if(point.epoch===epoch){
      const entry=state.get(point.context);
      if(entry.pendingRestorePoint?.id===point.id)state.set({...entry,pendingRestorePoint:null});
    }
    if(staging===point)staging=null;
  }
  function cancelAnalysis({discardStage=false}={}){
    attempt++;service.dispose();
    if(!discardStage)clearPending(staging);
    staging=null;busy=false;
  }
  function report(failure){
    error=failure;
    const line=Number.isInteger(failure.lineNumber)&&failure.lineNumber>0?failure.lineNumber:1;
    const message=failure.code==='CV_SYNTAX'?'Revisa los paréntesis, las comillas y las llaves de esta línea.':failure.message;
    setText(errorOutput,'Línea '+line+': '+message);
    if(current().language==='blocks')setText(document.querySelector('#editor-error'),message);
    source.setAttribute('aria-invalid','true');
    onDiagnostic({level:'error',code:failure.code??'CODE_VIEW_CONVERSION',origin:'shell',message:'Línea '+line+': '+failure.message});
    render();
  }
  function focusSource(line=1,column=1){
    const lines=source.value.split('\n'),index=Math.max(0,Math.min(lines.length-1,line-1));
    const start=lines.slice(0,index).reduce((sum,text)=>sum+text.length+1,0);
    source.focus({preventScroll:true});
    source.setSelectionRange(start+Math.min(lines[index].length,Math.max(0,column-1)),start+lines[index].length);
    source.scrollTop=index*parseFloat(getComputedStyle(source).lineHeight);
    source.scrollIntoView({block:'nearest'});
  }
  const ownerKey=()=>ownerOption().owner?.identifier??null;
  function trusted(context,entry){
    const baseline=known.get(context);
    // A rename changes the identifier the text must use, not the snapshot.
    return baseline&&baseline.language===entry.language&&baseline.source===entry.source&&baseline.owner===ownerKey()&&editor.isCodeViewCurrent(baseline.snapshot);
  }
  function hasPendingText(context,entry){
    if(entry.language==='blocks'||trusted(context,entry))return false;
    // Imported baseline metadata grants no trust. A fresh generation is safe
    // to compare because it comes from the currently validated workspace.
    try{return entry.source!==generate(captureSnapshot(),entry.language).text;}
    catch{return true;}
  }
  function remember(context,entry){
    known.set(context,{language:entry.language,source:entry.source,owner:ownerKey(),snapshot:captureSnapshot()});
  }
  async function apply(context){
    const entry=state.get(context);
    if(entry.language==='blocks')return true;
    if(trusted(context,entry))return true;
    const available=availability(context,entry.language);
    if(!available.editable){applyFailure={reason:'failed',message:available.reason};report(new Error(available.reason));focusSource();return false;}
    applyFailure={reason:'cancelled'};
    cancelAnalysis();const id=attempt,projectEpoch=epoch;
    busy=true;error=null;warning='';source.removeAttribute('aria-invalid');setText(errorOutput,'');render();
    let point=null;
    try{
      requirePack(entry.language==='python'?'python-stdlib':'javascript-quickjs');
      const snapshot=captureSnapshot(),generated=generate(snapshot,entry.language);
      const parsed=await service.convert({language:entry.language,source:entry.source,
        variableIds:generated.variableIds,variableNames:generated.variableNames,globalIds:snapshot.inheritedGlobalIds??[],
        capabilities:snapshot.capabilities,resourceView:snapshot.resourceView,...ownerOption()});
      if(id!==attempt||projectEpoch!==epoch)return false;
      const targetId=ownerOption().owner?.targetId,prepared=editor.prepareCodeView(parsed,snapshot,targetId?{targetId}:{});
      const changed=!same(prepared.ir,snapshot.ir)||!same(prepared.state,snapshot.state);
      if(changed){
        const hash=await digest(prepared.state,prepared.scriptOrder);
        if(id!==attempt||!editor.isCodeViewCurrent(snapshot))return false;
        point={context,id:crypto.randomUUID(),epoch:projectEpoch};
        const restorePoint={id:point.id,workspace:snapshot.state,scriptOrder:snapshot.scriptOrder,appliedHash:hash};
        staging=point;
        state.set({...state.get(context),pendingRestorePoint:restorePoint});
        try{await getProject().flush();}
        catch{warning='No se confirmó el punto antes del cambio. Comprueba el guardado y lleva una copia.';}
        if(id!==attempt||projectEpoch!==epoch||!editor.isCodeViewCurrent(snapshot)){clearPending(point);return false;}
        const checkpoint=editor.checkpoint(),before=state.get(context);
        selfCommit=true;
        try{
          editor.commit(prepared);
          state.set({...before,scriptOrder:prepared.scriptOrder,baselineSource:entry.source,
            restorePoint,pendingRestorePoint:null,editedInText:true});
        }catch(failure){
          editor.restoreDraft(checkpoint);state.set({...before,pendingRestorePoint:null});throw failure;
        }finally{selfCommit=false;}
        staging=null;notice.delete(context);
        const applied=captureSnapshot();
        pointSnapshots.set(context,{id:point.id,snapshot:applied});
        void digest(applied.state,applied.scriptOrder).then(actual=>{
          if(projectEpoch!==epoch)return;
          const latest=state.get(context);
          if(latest.restorePoint?.id!==point.id)state.correctStoredPoint(point.id,actual);
          else if(latest.restorePoint.appliedHash!==actual)
            state.set({...latest,restorePoint:{...latest.restorePoint,appliedHash:actual}});
        }).catch(()=>{});
      }else state.set({...state.get(context),baselineSource:entry.source});
      remember(context,{...state.get(context),source:entry.source});
      return true;
    }catch(failure){
      clearPending(point);
      // Only the text's own errors say so: a missing pack is not one.
      if(id===attempt&&projectEpoch===epoch){applyFailure=textError(failure)?{reason:'rejected'}:{reason:'failed',message:failure.message};report(failure);focusSource(failure.lineNumber,failure.columnNumber);}
      return false;
    }finally{if(id===attempt){busy=false;render();}}
  }
  async function select(language){
    if(!ready){render();return false;}
    if(!['blocks','javascript','python'].includes(language))return false;
    const context='2d',entry=state.get(context);
    if(entry.language===language){render();return true;}
    if(!await apply(context))return false;
    error=null;warning='';setText(errorOutput,'');source.removeAttribute('aria-invalid');
    if(language==='blocks'){
      state.set({...state.get(context),language:'blocks',source:'',baselineSource:'',scriptOrder:editor.codeViewOrder()});
      notice.delete(context);contexts.select(context);render();
      document.querySelector('#program-mode input[value=blocks]').focus();
      return true;
    }
    try{
      const snapshot=captureSnapshot(),generated=generate(snapshot,language);
      const next={...state.get(context),language,source:generated.text,baselineSource:generated.text,scriptOrder:snapshot.scriptOrder,formatNoticeShown:true};
      if(!entry.formatNoticeShown)notice.add(context);
      state.set(next);known.set(context,{language,source:generated.text,owner:ownerKey(),snapshot});
      state.activate(context);contexts.select(context);render();
      const caret=carets.get(context+':'+language);source.focus({preventScroll:true});
      if(caret){source.setSelectionRange(caret.start,caret.end,caret.direction);source.scrollTop=caret.scrollTop;source.scrollLeft=caret.scrollLeft;}
      else{source.setSelectionRange(0,0);source.scrollTop=0;}
      return true;
    }catch(failure){
      document.querySelector('#editor-error').textContent=failure.message;
      onDiagnostic({level:'error',code:'CODE_VIEW_GENERATION',origin:'shell',message:failure.message});render();return false;
    }
  }
  async function copy(){
    const context=contexts.current(),entry=state.get(context);
    cancelAnalysis();
    try{
      const snapshot=captureSnapshot(),generated=generate(snapshot,entry.language);
      // One object per copy: its owner travels in runtime.targetIds. The text of a
      // sprite still called hero is the default, so those copies keep their shape.
      const owner=ownerOption().owner,targetIds=owner&&(owner.identifier!=='hero'||owner.targetId!=='hero')?{[owner.identifier]:owner.targetId}:undefined;
      const created=textDocuments.add({language:entry.language,name:'Copia '+name(entry.language)+' del programa 2D',
        source:entry.source,api:'api3',variableIds:generated.variableIds,...(targetIds?{targetIds}:{})});
      onCopy(created);
      state.set({...state.get(context),language:'blocks',source:'',baselineSource:'',pendingRestorePoint:null});
      error=null;warning='';setText(errorOutput,'');source.removeAttribute('aria-invalid');
      contexts.select('text');render();source.focus();
    }catch(failure){report(failure);}
  }
  function restore(){
    const context=contexts.current(),entry=state.get(context);
    if(entry.source&&(!trusted(context,entry)||entry.source!==entry.baselineSource)&&
      !confirm('¿Volver a la última versión en bloques y descartar este texto? Puedes conservarlo primero como copia independiente.'))return;
    cancelAnalysis();error=null;warning='';source.removeAttribute('aria-invalid');setText(errorOutput,'');
    state.set({...state.get(context),language:'blocks',source:'',baselineSource:'',pendingRestorePoint:null,scriptOrder:editor.codeViewOrder()});
    render();document.querySelector('#program-mode input[value=blocks]').focus();
  }
  async function undo(){
    const context='2d',entry=state.get(context),point=entry.restorePoint;
    if(!point)return;
    if(hasPendingText(context,entry)&&!confirm('¿Descartar el texto pendiente y deshacer la última conversión? Puedes conservarlo primero como copia independiente.'))return;
    cancelAnalysis();error=null;
    try{
      const snapshot=captureSnapshot(),local=pointSnapshots.get(context);
      if(!(local?.id===point.id&&editor.isCodeViewCurrent(local.snapshot))){
        const hash=await digest(snapshot.state,snapshot.scriptOrder);
        if(!editor.isCodeViewCurrent(snapshot))throw new Error('La autoría cambió; vuelve a intentar Deshacer.');
        if(hash!==point.appliedHash&&!confirm('Hay cambios posteriores. ¿Descartarlos y recuperar el programa anterior a la conversión?'))return;
      }
      const prepared=editor.prepareCodeViewRestore(point,snapshot),checkpoint=editor.checkpoint();
      selfCommit=true;
      try{
        editor.commit(prepared);
        state.set({...state.get(context),language:'blocks',source:'',baselineSource:'',scriptOrder:point.scriptOrder,
          restorePoint:null,pendingRestorePoint:null});
      }catch(failure){editor.restoreDraft(checkpoint);throw failure;}finally{selfCommit=false;}
      known.delete(context);pointSnapshots.delete(context);render();
      document.querySelector('#program-mode input[value=blocks]').focus();
    }catch(failure){report(failure);}
  }
  // R2: changing object with pending text applies it, like returning to Blocks.
  // On rejection the object does not change, the text stays and its cause shows.
  // The result says what happened: {ok:true} (reason `current` if it was already
  // the object), or {ok:false,reason}: `unavailable` (one-object profile), `busy`
  // (a check is running), `rejected` (the text has an error; #text-error says it),
  // `cancelled` (a newer edit replaced the check) or `failed` (with `message`).
  // `step` says what failed: `text` (the object was never tried) or `mount`.
  async function settleText(){
    if(!ready||busy)return {ok:false,reason:'busy'};
    if(await apply('2d'))return {ok:true};
    return {ok:false,step:'text',...applyFailure};
  }
  async function selectObject(id){
    const from=objects?.current()??null;
    if(from===null)return {ok:false,reason:'unavailable'};
    if(from===id)return {ok:true,reason:'current'};
    const settled=await settleText();
    if(!settled.ok)return settled;
    if(objects.current()!==from)return {ok:false,reason:'cancelled'};
    const context='2d',language=state.get(context).language,stored=state.objectView(id),order=editor.codeViewOrder(),checkpoint=state.checkpoint();
    const previous=known.get(context);
    error=null;warning='';setText(errorOutput,'');source.removeAttribute('aria-invalid');
    selfCommit=true;
    try{
      objects.mount(id,{scriptOrder:stored.scriptOrder});
      state.switchObject(from,id,{scriptOrder:order});
      known.delete(context);pointSnapshots.delete(context);notice.delete(context);carets.delete(context+':'+language);
      if(language!=='blocks'){
        // Unfinished blocks have no text yet: that object opens in Blocks.
        try{
          const snapshot=captureSnapshot(),generated=generate(snapshot,language);
          const entry={...state.get(context),source:generated.text,baselineSource:generated.text};
          state.set(entry);known.set(context,{language,source:generated.text,owner:ownerKey(),snapshot});
        }catch{state.set({...state.get(context),language:'blocks',source:'',baselineSource:''});}
      }
    }catch(failure){
      try{if(objects.current()!==from)objects.mount(from,{scriptOrder:order});}finally{state.restoreDraft(checkpoint);}
      // The object and its text are back: the baseline holds again.
      if(previous)known.set(context,{...previous,snapshot:captureSnapshot()});
      // The text was not the cause: the panel says what failed, and it is logged.
      onDiagnostic({level:'error',code:'CODE_VIEW_OBJECT',origin:'shell',message:failure.message});
      render();return {ok:false,reason:'failed',step:'mount',message:failure.message};
    }finally{selfCommit=false;}
    render();return {ok:true};
  }
  // The live text after the objects changed (a rename, a delete): the identifiers
  // are others, the program is the same. The panel applied pending text first;
  // what was typed during the runner's restart is the student's, and stays.
  function refreshObjectText(){
    const context='2d',entry=state.get(context);
    if(objects?.current()==null||entry.language==='blocks'||entry.source!==entry.baselineSource)return;
    try{
      const snapshot=captureSnapshot(),generated=generate(snapshot,entry.language);
      state.set({...entry,source:generated.text,baselineSource:generated.text});
      known.set(context,{language:entry.language,source:generated.text,owner:ownerKey(),snapshot});
      render();
    }catch(failure){report(failure);}
  }
  function presentation(context){
    const entry=state.get(context);
    if(!supports(context)||entry.language==='blocks')return null;
    const available=availability(context,entry.language);
    const baseStatus=busy?(entry.language==='python'?'Preparando Python y comprobando el programa…':'Comprobando JavaScript…'):error?'Revisa el texto para volver a Bloques.':
      available.editable?(trusted(context,entry)?'Es el mismo programa.':'Texto pendiente de comprobar; se conserva con tu proyecto.'):available.reason;
    return {source:entry.source,language:entry.language,readOnly:!available.editable,
      status:baseStatus+(warning?' '+warning:''),
      destination:'Editas el mismo programa 2D. Cambiar de vista no ejecuta.',
      help:textHelp(entry.language),
      onInput:value=>{error=null;warning='';setText(errorOutput,'');source.removeAttribute('aria-invalid');
        state.editSource(context,value);cancelAnalysis();onSourceChanged();render();}};
  }
  document.querySelector('#code-view-edit').addEventListener('click',()=>focusSource(error?.lineNumber,error?.columnNumber));
  document.querySelector('#code-view-restore').addEventListener('click',restore);
  document.querySelector('#code-view-copy').addEventListener('click',()=>void copy());
  document.querySelector('#code-view-undo').addEventListener('click',()=>void undo());
  state.subscribe(reason=>{
    if(reason.type==='load'){
      epoch++;cancelAnalysis({discardStage:true});known.clear();pointSnapshots.clear();notice.clear();carets.clear();error=null;warning='';
      setText(errorOutput,'');source.removeAttribute('aria-invalid');
      const active=state.capture()?.activeContext;if(active)contexts.select(active);
    }
    render();
  });
  contexts.subscribe(()=>{
    if(lastContext!==contexts.current()){
      const previous=state.get(lastContext);
      if(supports(lastContext)&&previous.language!=='blocks')carets.set(lastContext+':'+previous.language,
        {start:source.selectionStart,end:source.selectionEnd,direction:source.selectionDirection,scrollTop:source.scrollTop,scrollLeft:source.scrollLeft});
      cancelAnalysis();error=null;warning='';lastContext=contexts.current();state.activate(lastContext);
      render();
      const entry=state.get(lastContext),caret=carets.get(lastContext+':'+entry.language);
      if(supports(lastContext)&&entry.language!=='blocks'&&caret){
        source.setSelectionRange(caret.start,caret.end,caret.direction);
        source.scrollTop=caret.scrollTop;source.scrollLeft=caret.scrollLeft;
      }
    }
  });
  editor.subscribe(()=>{
    if(selfCommit)return;
    known.delete('2d');
    const order=editor.codeViewOrder(),entry=state.get('2d');
    if((order!==null||state.capture()?.entries.some(item=>item.contextId==='2d'))&&!same(entry.scriptOrder,order))
      state.set({...entry,scriptOrder:order});
    render();
  });
  return Object.freeze({select,selectObject,settleText,refreshObjectText,applyForRun:()=>apply('2d'),presentation,
    mode:context=>supports(context)?state.get(context).language:null,
    setReady(value){ready=!!value;render();},cancelAnalysis,
    // A block of another object: that object is selected first, as with any other
    // change of object. If it cannot be, the reply says why.
    async revealBlock(id){
      const owner=objects?.ownerOf?.(id)??null;
      if(owner!==null&&owner!==objects.current()){
        const moved=await selectObject(owner);
        if(!moved.ok)return {ok:false,message:moved.reason==='rejected'?'Ese bloque es de otro objeto. Arregla el error del texto para ir a él.':'Ese bloque es de otro objeto y no se pudo abrir.'+(moved.message?' '+moved.message:'')};
      }
      const entry=state.get('2d');if(entry.language!=='blocks'&&!trusted('2d',entry))return false;
      if(entry.language!=='blocks')state.set({...entry,language:'blocks',source:'',baselineSource:''});contexts.select('2d');render();return editor.selectSource(id);
    },
    pendingSource(context){const entry=state.get(context);return supports(context)&&entry.language!=='blocks'&&entry.source!==entry.baselineSource?{language:entry.language,source:entry.source}:null;},
    status:()=>({busy,error:error?.message??null,warning,service:service.stats()})
  });
}
