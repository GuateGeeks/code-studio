import {createSceneInspection} from '../scene-inspection.mjs';

// Presentation of detached GG readings; never writes scene or project authoring.
export function createSceneInspectorUI({readScene, getScope, initialScene}) {
  const object = document.querySelector('#inspector-object');
  const button = document.querySelector('#refresh-inspector');
  const status = document.querySelector('#inspector-status');
  const initial = document.querySelector('#inspector-initial');
  const runtime = document.querySelector('#inspector-runtime');
  const variables = document.querySelector('#inspector-variables');
  const authored = {...initialScene};
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
    const snapshot = next.snapshot;
    const hero = snapshot?.sprites[0];
    // These authoring values stay distinct from the latest runtime reading.
    fields(initial, sceneSelected
      ? [['Sprites de autoría', 1], ['Sprite', authored.spriteId], ['Disfraz inicial', authored.costume]]
      : [['Sprite', authored.spriteId], ['x inicial', authored.x], ['y inicial', authored.y],
        ['Dirección inicial', authored.direction], ['Tamaño inicial (%)', authored.size], ['Disfraz inicial', authored.costume]]);
    fields(runtime, snapshot
      ? sceneSelected
        ? [['Sprites consultados', snapshot.sprites.length], ['Sprite', hero.name], ['x de hero', hero.x], ['y de hero', hero.y],
          ['Variables locales de hero', snapshot.variables.length]]
        : [['Sprite', hero.name], ['x', hero.x], ['y', hero.y]]
      : [['Lectura de ejecución', 'Sin lectura disponible']]);
    const items = [];
    if (!sceneSelected && snapshot) {
      for (const variable of snapshot.variables) {
        const item = document.createElement('li');
        item.textContent = `${variable.name}: ${variable.value} · local de hero · ID ${variable.id}`;
        items.push(item);
      }
    }
    if (!items.length) {
      const item = document.createElement('li');
      item.textContent = sceneSelected
        ? 'Selecciona hero para consultar sus variables locales.'
        : snapshot ? 'hero no tiene variables locales en esta lectura.' : 'Actualiza la lectura para consultar las variables locales de hero.';
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
  return Object.freeze({refresh, invalidate, scheduleRefresh, state: () => inspection.state()});
}
