import {validateResourceView} from '../contracts/resources.mjs';
const views = new WeakMap(), menus = new Map();
export function getWorkspaceResourceView(workspace) { return views.get(workspace) ?? null; }
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
        const choices = (views.get(workspace)?.[menu.resource] ?? []).filter(item => item.ownerId === menu.ownerId);
        if (!choices.length) return [['Sin recursos disponibles','__gg_missing_resource__']];
        return choices.map(item => [item.name,item.id]);
      });
    };
    menus.set(key,encoded);
  }
}
