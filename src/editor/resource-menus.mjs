import {validateResourceView} from '../contracts/resources.mjs';
import {scene2DBackdrops} from '../contracts/scene2d-objects.mjs';
const views = new WeakMap(), owners = new WeakMap(), menus = new Map(), objects = new WeakMap(), objectMenus = new Map();
// The value of a menu with nothing to list: an object without sounds can still
// take the block. It loads, so the object can always be opened, and only fails
// when the program is lowered, on that block.
export const missingResource = '__gg_missing_resource__';
// The value of an object menu with no object: a deleted one, a block pasted from
// elsewhere or a project with one sprite. Such a block loads and saves, and only
// fails when the program is lowered, on that block.
export const missingObject = '__gg_missing_object__';
// A menu that names `stage` lists the stage's, whichever object asks: backdrops.
export const menuOwner = (source, owner) => source.ownerId === 'stage' ? 'stage' : owner ?? source.ownerId;
// The scene's sprites ({id, name}), for the menus that name another object.
export function setWorkspaceObjects(workspace, sprites) { objects.set(workspace, sprites ?? []); }
export function getWorkspaceResourceView(workspace) { return views.get(workspace) ?? null; }
// The object whose program this workspace holds (scene2d-multi-sprite 3.2). Null
// in a single-workspace profile: a menu then lists the owner its pack names.
export function getWorkspaceResourceOwner(workspace) { return owners.get(workspace) ?? null; }
export function setWorkspaceResourceOwner(workspace, ownerId) { owners.set(workspace, ownerId ?? null); }
export function setWorkspaceResourceView(workspace, resourceView) {
  if (resourceView != null) validateResourceView(resourceView);
  views.set(workspace,resourceView == null ? null : structuredClone(resourceView));
}
export function registerResourceMenus(Blockly, definitions) {
  for (const menu of definitions ?? []) {
    if (!menu || !['costumes','sounds'].includes(menu.resource) || typeof menu.type !== 'string' || typeof menu.field !== 'string' || typeof menu.ownerId !== 'string') throw new Error('Proveedor de recursos no instalado');
    const key = menu.type + ':' + menu.field, encoded = JSON.stringify(menu);
    if (menus.has(key)) {
      if (menus.get(key) !== encoded) throw new Error('Proveedor de menú incompatible');
      continue;
    }
    const definition = Blockly.Blocks[menu.type];
    if (!definition) throw new Error('Bloque de biblioteca no instalado');
    const original = definition.init;
    definition.init = function() {
      original.call(this);
      const field = this.getField(menu.field);
      if (!field?.setOptions) throw new Error('Campo de biblioteca no desplegable');
      field.setOptions(function() {
        const sourceWorkspace = this.getSourceBlock()?.workspace;
        const workspace = sourceWorkspace?.isFlyout ? sourceWorkspace.targetWorkspace : sourceWorkspace;
        const view = views.get(workspace);
        if (menu.ownerId === 'stage' && view) return scene2DBackdrops(view).map(item => [item.label,item.id]);
        const owner = menuOwner(menu,owners.get(workspace));
        const choices = (view?.[menu.resource] ?? []).filter(item => item.ownerId === owner);
        if (!choices.length) return [['Sin recursos disponibles',missingResource]];
        return choices.map(item => [item.name,item.id]);
      });
    };
    menus.set(key,encoded);
  }
}
// Other objects by name; the value is the stable ID, so a rename only changes
// what the menu shows. Blockly would keep any other option for a value it does
// not know, which would silently send the sprite somewhere else: here that value
// becomes the placeholder, which the menu lists only while it is the one chosen.
export function registerObjectMenus(Blockly, definitions) {
  for (const menu of definitions ?? []) {
    const key = menu.type + ':' + menu.field;
    if (objectMenus.has(key)) continue;
    const definition = Blockly.Blocks[menu.type];
    if (!definition) throw new Error('Bloque de objetos no instalado');
    const original = definition.init;
    definition.init = function() {
      original.call(this);
      const field = this.getField(menu.field);
      let placeholder = false;
      field.setOptions(function() {
        const sourceWorkspace = this.getSourceBlock()?.workspace;
        const workspace = sourceWorkspace?.isFlyout ? sourceWorkspace.targetWorkspace : sourceWorkspace;
        const own = owners.get(workspace), others = (objects.get(workspace) ?? []).filter(item => item.id !== own).map(item => [item.name,item.id]);
        if (!others.length) return [['añade otro objeto',missingObject]];
        return placeholder ? [...others,['elige un objeto',missingObject]] : others;
      });
      const accepts = field.doClassValidation_;
      field.doClassValidation_ = function(value) {
        placeholder = false;
        const known = accepts.call(this,value) === value && value !== missingObject;
        placeholder = !known;
        this.getOptions(false);
        return known ? value : missingObject;
      };
      field.setValue(field.getOptions(false)[0][1]);
    };
    objectMenus.set(key,true);
  }
}
