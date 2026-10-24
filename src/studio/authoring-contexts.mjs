export function createAuthoringContexts({selector,heading,status}) {
  const entries=new Map(),listeners=new Set();let selected=null;
  function render() {
    const current=entries.get(selected);if(!current)return;
    selector.value=selected;heading.textContent=current.title;status.hidden=selected!=='2d';
    for(const [id,entry] of entries)entry.setVisible(id===selected);
    for(const listener of listeners)listener(selected);
  }
  function select(id) {if(!entries.has(id))throw new Error('Contexto de autoría no instalado');selected=id;render();}
  selector.addEventListener('change',()=>{try{select(selector.value);}catch{render();}});
  return Object.freeze({
    register(entry) {
      if(!entry||!/^[-a-z0-9]+$/.test(entry.id)||entries.has(entry.id)||typeof entry.setVisible!=='function')throw new Error('Contexto de autoría inválido');
      entries.set(entry.id,entry);const option=selector.ownerDocument.createElement('option');option.value=entry.id;option.textContent=entry.label;
      if(entries.size===1)selector.replaceChildren();selector.append(option);
      if(selected===null)selected=entry.id;render();
    },select,current:()=>selected,render,
    subscribe(listener){listeners.add(listener);listener(selected);return()=>listeners.delete(listener);}
  });
}
