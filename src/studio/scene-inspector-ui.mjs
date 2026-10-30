import {createSceneInspection} from '../scene-inspection.mjs';

// Presentation of detached GG readings; never writes scene or project authoring.
export function createSceneInspectorUI({readScene, getScope, initialScene, objects = () => null}) {
  const object = document.querySelector('#inspector-object');
  const button = document.querySelector('#refresh-inspector');
  const status = document.querySelector('#inspector-status');
  const initial = document.querySelector('#inspector-initial');
  const runtime = document.querySelector('#inspector-runtime');
  const variables = document.querySelector('#inspector-variables');
  const fallback = {...initialScene};
  // Until the per-object inspector (3.2) this reads hero or the first sprite, by name.
  function inspected() {
    const config = objects(), sprite = config?.sprites.find(item => item.id === 'hero') ?? config?.sprites[0];
    return {count: config?.sprites.length ?? 1, authored: sprite ? {spriteId: sprite.name, x: sprite.x, y: sprite.y, direction: sprite.direction, size: sprite.size, costume: sprite.costume} : fallback};
  }
  let timer = null;
  let visibleState = {snapshot: null, status: 'empty', error: null};

  function fields(container, values) {
    const nodes = [];
    for (const [label, value] of values) {
      const term = document.createElement('dt');
      term.textContent = label;
      const detail = document.createElement('dd');
      detail.textContent = String(value);
      nodes.push(term, detail);
    }
    container.replaceChildren(...nodes);
  }
  function render(next) {
    visibleState = next;
    const sceneSelected = object.value === 'scene';
    const snapshot = next.snapshot, {count, authored} = inspected(), name = authored.spriteId;
    object.querySelector('option[value=hero]').textContent = name + ' · Sprite';
    document.querySelector('#inspector-variables-heading').textContent = 'Variables locales de ' + name;
    // scene2d-multi-sprite 2.1: the scene lists every sprite; the object view
    // stays on hero (or the first sprite) until per-object inspection (3.2).
    // A single-hero reading renders exactly as before.
    const hero = snapshot?.sprites.find(sprite => sprite.id === 'hero') ?? snapshot?.sprites[0];
    const owned = snapshot?.variables.filter(variable => !variable.targetId || variable.targetId === hero.id) ?? [];
    // These authoring values stay distinct from the latest runtime reading.
    fields(initial, sceneSelected
      ? [['Sprites de autoría', count], ['Sprite', authored.spriteId], ['Disfraz inicial', authored.costume]]
      : [['Sprite', authored.spriteId], ['x inicial', authored.x], ['y inicial', authored.y],
        ['Dirección inicial', authored.direction], ['Tamaño inicial (%)', authored.size], ['Disfraz inicial', authored.costume]]);
    fields(runtime, snapshot
      ? sceneSelected
        ? [['Sprites consultados', snapshot.sprites.length], ...snapshot.sprites.flatMap(sprite => [['Sprite', sprite.name], [`x de ${sprite.name}`, sprite.x], [`y de ${sprite.name}`, sprite.y]]),
          [snapshot.sprites.length === 1 ? `Variables locales de ${hero.name}` : 'Variables locales de los sprites', snapshot.variables.length]]
        : [['Sprite', hero.name], ['x', hero.x], ['y', hero.y]]
      : [['Lectura de ejecución', 'Sin lectura disponible']]);
    const items = [];
    if (!sceneSelected && snapshot) {
      for (const variable of owned) {
        const item = document.createElement('li');
        item.textContent = `${variable.name}: ${variable.value} · local de ${hero.name} · ID ${variable.id}`;
        items.push(item);
      }
    }
    if (!items.length) {
      const item = document.createElement('li');
      item.textContent = sceneSelected
        ? `Selecciona ${name} para consultar sus variables locales.`
        : snapshot ? `${name} no tiene variables locales en esta lectura.` : `Actualiza la lectura para consultar las variables locales de ${name}.`;
      items.push(item);
    }
    variables.replaceChildren(...items);
    status.dataset.state = next.status;
    runtime.setAttribute('aria-busy', String(next.status === 'loading'));
    // Keep both controls available during overlapping reads: the controller
    // accepts only the newest request and owns all scope/error handling.
    button.disabled = false;
    if (next.status === 'loading') status.textContent = 'Leyendo ejecución…';
    else if (next.status === 'ready') status.textContent = 'Última lectura actualizada. Puede cambiar durante la ejecución.';
    else if (next.status === 'error') status.textContent = `No se pudo actualizar: ${next.error}${snapshot ? ' Se conserva la última lectura válida.' : ''}`;
    else status.textContent = 'Sin lectura de ejecución. Pulsa Actualizar lectura.';
  }

  const inspection = createSceneInspection({readScene, getScope, onChange: render});
  function clearScheduled() { if (timer !== null) { clearTimeout(timer); timer = null; } }
  function refresh() { clearScheduled(); return inspection.refresh(); }
  function invalidate() { clearScheduled(); return inspection.invalidate(); }
  function scheduleRefresh() {
    clearScheduled();
    timer = setTimeout(() => { timer = null; void inspection.refresh(); }, 100);
  }
  button.addEventListener('click', () => { void refresh(); });
  object.addEventListener('change', () => render(visibleState));
  render(inspection.state());
  return Object.freeze({refresh, invalidate, scheduleRefresh, objectsChanged: () => render(visibleState), state: () => inspection.state()});
}
