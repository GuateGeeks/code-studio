import {validateWebAppConfig,validateWebInputValue} from '../../contracts/webapp-program.mjs';
import {validateCapabilityOperation,resolveOperationProfile} from '../../contracts/operations.mjs';
import {decodeResourceAsset} from '../../contracts/resources.mjs';
const tags={group:'section',form:'form',text:'p',input:'input',button:'button',list:'ul',image:'img'};
const clone=value=>structuredClone(value);
export function createWebAppAdapter({container,onEvent=()=>{},onDiagnostic=()=>{}}) {
  const candidates=new WeakMap(),pending=new Set();let live=null,closed=false;
  function disposeState(state){if(!state||state.disposed)return;state.disposed=true;pending.delete(state);state.signal?.removeEventListener('abort',state.abort);state.controller.abort();for(const url of state.urls)URL.revokeObjectURL(url);state.root.remove();}
  function emit(state,type,targetId,extra={}) {
    if(live!==state||closed)return;
    const now=performance.now();state.events=state.events.filter(t=>now-t<1000);
    if(state.events.length>=60)return;state.events.push(now);
    const values=Object.fromEntries([...state.elements].filter(([,item])=>item.node.type==='input').map(([id,item])=>[id,item.el.value.slice(0,1024)]));
    onEvent({type,targetId,...(type==='submit'?{values}:{}),...extra});
  }
  async function prepare(input,{resources,resourceView,signal}={}) {
    if(closed||signal?.aborted)throw new Error('WebApp preparation cancelled');
    const config=validateWebAppConfig(input,{resources,resourceView});
    const doc=container.ownerDocument,root=doc.createElement('div');
    for(const previous of [...pending])disposeState(previous);
    const state={config,root,elements:new Map(),urls:[],events:[],controller:new AbortController(),signal,disposed:false};
    state.abort=()=>disposeState(state);signal?.addEventListener('abort',state.abort,{once:true});pending.add(state);
    try {
      for(const node of config.app.nodes){
        const el=doc.createElement(tags[node.type]);el.dataset.targetId=node.id;el.id='gg-web-'+node.id;
        const props=node.props,record={node:clone(node),el,items:[]};state.elements.set(node.id,record);
        if(node.type==='input'){
          el.type=props.inputType;el.value=props.value;el.maxLength=1024;el.name=node.id;
          const label=doc.createElement('label');label.htmlFor=el.id;label.textContent=props.label;record.label=label;
          el.addEventListener('input',()=>emit(state,'input',node.id,{value:el.value.slice(0,1024)}),{signal:state.controller.signal});
        }
        if(['text','button'].includes(node.type))el.textContent=props.text;
        if(node.type==='button'){let ancestor=config.app.nodes.find(n=>n.id===node.parentId),form=false;while(ancestor){if(ancestor.type==='form'){form=true;break;}ancestor=config.app.nodes.find(n=>n.id===ancestor.parentId);}el.type=form?'submit':'button';}
        if(node.type==='list')setItems(record,props.items);
        if(node.type==='image'){
          const binding=resources?.bindings?.find(b=>b.id===props.assetBindingId&&b.owner?.contextId==='webapp'&&b.owner.documentId===config.documentId&&b.owner.targetId===node.id&&b.role==='web.image');
          if(!binding)throw new Error('WebApp image binding absent');
          const asset=resources.assets[binding.assetId];if(asset?.type!=='Image'||!['png','svg'].includes(asset.format))throw new Error('WebApp image resource invalid');
          const url=URL.createObjectURL(new Blob([decodeResourceAsset(asset)],{type:asset.format==='png'?'image/png':'image/svg+xml'}));
          state.urls.push(url);el.src=url;el.alt=props.alt;
        }
        for(const [key,value]of Object.entries(props.styles??{}))el.style[key]=['fontSize','gap'].includes(key)?value+'px':value;
        el.addEventListener('click',()=>emit(state,'click',node.id),{signal:state.controller.signal});
        if(node.type==='form')el.addEventListener('submit',event=>{event.preventDefault();emit(state,'submit',node.id);},{signal:state.controller.signal});
      }
      for(const node of config.app.nodes){
        const item=state.elements.get(node.id),parent=node.parentId===null?root:state.elements.get(node.parentId).el;
        if(item.label)parent.append(item.label);parent.append(item.el);
      }
      root.addEventListener('keydown',event=>{if(event.ctrlKey||event.metaKey||event.altKey||event.key==='Tab'||event.key==='Escape')return;emit(state,'key',null,{key:event.key===' '?'space':event.key});},{signal:state.controller.signal});
      if(signal?.aborted)throw new Error('WebApp preparation cancelled');
      const handle=Object.freeze({});candidates.set(handle,state);return handle;
    }catch(error){disposeState(state);throw error;}
  }
  function setItems(record,items){
    if(items.length>128||items.some(item=>typeof item!=='string'||item.length>1024))throw new Error('WebApp list limit');
    record.items=[...items];record.el.replaceChildren(...items.map(text=>{const li=container.ownerDocument.createElement('li');li.textContent=text;return li;}));
  }
  function snapshot(){return live?{contextId:'webapp',documentId:live.config.documentId,nodes:[...live.elements].map(([id,item])=>({id,type:item.node.type,visible:!item.el.hidden,...(item.node.type==='input'?{value:item.el.value}:{}),...(['text','button'].includes(item.node.type)?{text:item.el.textContent}:{}),...(item.node.type==='list'?{items:[...item.items]}:{})}))}:null;}
  return Object.freeze({
    prepare,
    commit(handle){const state=candidates.get(handle);if(!state||closed||state.disposed||state.signal?.aborted)throw new Error('WebApp invalid candidate');candidates.delete(handle);pending.delete(state);state.signal?.removeEventListener('abort',state.abort);const previous=live;live=state;container.replaceChildren(state.root);disposeState(previous);return snapshot();},
    disposePrepared(handle){const state=candidates.get(handle);if(state){candidates.delete(handle);disposeState(state);}},
    call(operationId,args){
      if(!live||closed)throw new Error('WebApp stopped');
      const profile=resolveOperationProfile({contextId:'webapp',documentId:live.config.documentId});
      ({args}=validateCapabilityOperation(profile,operationId,args));
      if(operationId==='webapp.snapshot')return snapshot();
      const item=live.elements.get(args.targetId);if(!item)throw new Error('WebApp unknown target');
      switch(operationId){
        case 'webapp.getValue':if(item.node.type!=='input')throw new Error('Target is not input');return item.el.value.slice(0,1024);
        case 'webapp.setValue':if(item.node.type!=='input')throw new Error('Target is not input');validateWebInputValue(item.node.props.inputType,args.value);item.el.value=args.value;break;
        case 'webapp.setText':if(!['text','button'].includes(item.node.type))throw new Error('Target has no text');item.el.textContent=args.text;break;
        case 'webapp.appendItem':if(item.node.type!=='list')throw new Error('Target is not list');setItems(item,[...item.items,args.text]);break;
        case 'webapp.clearItems':if(item.node.type!=='list')throw new Error('Target is not list');setItems(item,[]);break;
        case 'webapp.setVisible':item.el.hidden=!args.visible;if(item.label)item.label.hidden=!args.visible;break;
        default:throw new Error('WebApp unsupported operation');
      }
      return null;
    },snapshot,
    dispose(){closed=true;for(const state of [...pending])disposeState(state);disposeState(live);live=null;container.replaceChildren();}
  });
}
