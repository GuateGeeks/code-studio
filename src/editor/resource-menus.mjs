import {validateResourceView} from '../contracts/resources.mjs';
const views = new WeakMap(), owners = new WeakMap(), menus = new Map();
// The value of a menu with nothing to list: an object without sounds can still
// take the block. It loads, so the object can always be opened, and only fails
// when the program is lowered, on that block.
export const missingResource = '__gg_missing_resource__';
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
        const owner = owners.get(workspace) ?? menu.ownerId;
        const choices = (views.get(workspace)?.[menu.resource] ?? []).filter(item => item.ownerId === owner);
        if (!choices.length) return [['Sin recursos disponibles',missingResource]];
        return choices.map(item => [item.name,item.id]);
      });
    };
    menus.set(key,encoded);
  }
}
