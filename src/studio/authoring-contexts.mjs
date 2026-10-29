export function createAuthoringContexts({selector,heading,status,available=null}) {
  const entries=new Map(),listeners=new Set();let selected=null,listed=false;
  // An installation profile (pilot-2d-mode) hides contexts from navigation.
  // Hidden entries stay registered, so their authoring is still captured.
  const shown=id=>available===null||available.includes(id);
  function render() {
    const current=entries.get(selected);if(!current)return;
    selector.value=selected;heading.textContent=current.title;status.hidden=selected!=='2d';
    for(const [id,entry] of entries)entry.setVisible(id===selected);
    for(const listener of listeners)listener(selected);
  }
  function select(id) {
    if(!entries.has(id))throw new Error('Contexto de autoría no instalado');
    if(!shown(id))return false;
    selected=id;render();return true;
  }
  selector.addEventListener('change',()=>{try{select(selector.value);}catch{render();}});
  return Object.freeze({
    register(entry) {
      if(!entry||!/^[-a-z0-9]+$/.test(entry.id)||entries.has(entry.id)||typeof entry.setVisible!=='function')throw new Error('Contexto de autoría inválido');
      entries.set(entry.id,entry);
      if(!shown(entry.id))return;
      const option=selector.ownerDocument.createElement('option');option.value=entry.id;option.textContent=entry.label;
      if(!listed){selector.replaceChildren();listed=true;}
      selector.append(option);
      if(selected===null)selected=entry.id;render();
    },select,current:()=>selected,render,available:shown,
    subscribe(listener){listeners.add(listener);listener(selected);return()=>listeners.delete(listener);}
  });
}
