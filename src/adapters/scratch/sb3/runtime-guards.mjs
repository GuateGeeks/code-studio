import {sb3Limits} from '../../../contracts/sb3-program.mjs';
const size=value=>new TextEncoder().encode(typeof value==='string'?value:JSON.stringify(value)).length;
const scratchString=value=>String(value).replace(/\\n/g,'\n').replace(/\\t/g,'\t');
const scratchNumber=value=>{if(typeof value==='string')value=value.replace(/[０-９＋．ｅ]/g,char=>String.fromCharCode(char.charCodeAt(0)-0xFEE0)).replace(/[-－﹣−‐⁃‑‒–—﹘―⎯⏤ーｰ─━]/g,'-');const number=Number(value);return Number.isNaN(number)?0:number;};
export function installRuntimeGuards({vm,onViolation=()=>{},limits=sb3Limits}) {
  const runtime=vm.runtime,restore=[];let failed=false,disposed=false;
  const ref=util=>({sourceBlockId:util?.thread?.peekStack?.()??null,targetId:util?.target?.id??null});
  function violation(message,util) {
    if(!failed&&!disposed){failed=true;const source=ref(util);vm.stopAll();try{onViolation({code:'SB3_RUNTIME_LIMIT',message,...source});}catch{}}
    throw Object.assign(new Error(message),{ggRuntimeLimit:true});
  }
  function scalar(value,util) {
    if(typeof value==='string'){if(size(value)>limits.stringBytes)violation('Se alcanzó el límite de texto del proyecto.',util);}
    else if(typeof value==='number'){if(!Number.isFinite(value)||Math.abs(value)>1e12)violation('Número fuera del límite finito.',util);}
    else if(typeof value!=='boolean'&&value!==undefined)violation('Dato de ejecución no permitido.',util);
  }
  function totals(extraTarget=null) {
    let bytes=0,items=0;
    for(const target of [...runtime.targets,...(extraTarget?[extraTarget]:[])])for(const variable of Object.values(target.variables)){
      if(variable.type==='list'){items+=variable.value.length;bytes+=size(variable.value);}
      else bytes+=size(variable.value);
    }
    return {bytes,items};
  }
  function budget(extraBytes,extraItems,util) {
    const current=totals();
    if(current.bytes+extraBytes>limits.dataBytes||current.items+extraItems>limits.aggregateItems)violation('Se alcanzó el límite agregado de datos.',util);
  }
  function wrap(object,key,make) {
    const original=object[key];if(typeof original!=='function')return;
    const next=make(original);object[key]=next;
    restore.push(()=>{if(object[key]===next)object[key]=original;});
  }
  wrap(runtime,'_pushThread',original=>function(...args){
    if(failed||disposed)throw Object.assign(new Error('Ejecución detenida'),{ggRuntimeLimit:true});
    if(runtime.threads.length>=limits.threads)violation('Se alcanzó el límite de hilos.',{target:args[1],thread:{peekStack:()=>args[0]}});
    return original.apply(this,args);
  });
  wrap(runtime,'_step',original=>function(...args){
    if(failed||disposed)return;
    try{return original.apply(this,args);}catch(error){if(!error?.ggRuntimeLimit)throw error;}
  });
  const lookup=(util,field)=>util.target.lookupVariableById(field?.id);
  const preflight=(opcode,args,util)=>{
    for(const value of Object.values(args))if(value===null||typeof value!=='object')scalar(value,util);
    if(opcode==='operator_join'){
      if(size(scratchString(args.STRING1))+size(scratchString(args.STRING2))>limits.stringBytes)violation('La unión supera el límite de texto.',util);
    }
    if(opcode==='data_listcontents'){
      const list=lookup(util,args.LIST);
      if(list){const single=list.value.every(item=>typeof item==='string'&&item.length===1);
        const total=list.value.reduce((sum,item)=>sum+size(String(item)),0)+(single?0:Math.max(0,list.value.length-1));
        if(total>limits.stringBytes)violation('El contenido de la lista supera el límite de texto.',util);}
    }
    if(['data_addtolist','data_insertatlist','data_replaceitemoflist'].includes(opcode)){
      scalar(args.ITEM,util);const list=lookup(util,args.LIST);if(!list||list.type!=='list')violation('Lista no disponible.',util);
      if(opcode!=='data_replaceitemoflist'&&list.value.length>=limits.listItems)violation('Se alcanzó el límite de elementos de lista.',util);
      budget(size(args.ITEM)+3,opcode==='data_replaceitemoflist'?0:1,util);
    }
    if(opcode==='data_changevariableby'){const variable=lookup(util,args.VARIABLE);const result=scratchNumber(variable?.value)+scratchNumber(args.VALUE);scalar(result,util);budget(Math.max(0,size(result)-size(variable?.value??'')),0,util);}
    if(opcode==='data_setvariableto'){scalar(args.VALUE,util);const variable=lookup(util,args.VARIABLE);budget(Math.max(0,size(args.VALUE)-size(variable?.value??'')),0,util);}
    if(opcode==='control_create_clone_of'){
      if(runtime.targets.filter(target=>!target.isStage&&!target.isOriginal).length>=limits.clones)violation('Se alcanzó el límite de clones.',util);
      const target=scratchString(args.CLONE_OPTION)==='_myself_'?util.target:runtime.getSpriteTargetByName(scratchString(args.CLONE_OPTION));
      if(target){const before=totals(),after=totals(target);budget(after.bytes-before.bytes,after.items-before.items,util);}
    }
  };
  for(const opcode of Object.keys(runtime._primitives))wrap(runtime._primitives,opcode,original=>function(args,util){
    if(failed||disposed)throw Object.assign(new Error('Ejecución detenida'),{ggRuntimeLimit:true});
    preflight(opcode,args,util);
    const result=original.call(this,args,util);
    if(result&&typeof result.then==='function')return result.then(value=>{if(!failed&&!disposed)scalar(value,util);return value;});
    if(result!==undefined&&result!==null)scalar(result,util);
    return result;
  });
  // Clones start hats from initDrawable before runtime.addTarget. The thread
  // guard therefore lives on the runtime, not on a target-added listener.
  return Object.freeze({get failed(){return failed;},dispose(){if(disposed)return;disposed=true;for(const undo of restore.reverse())undo();}});
}
