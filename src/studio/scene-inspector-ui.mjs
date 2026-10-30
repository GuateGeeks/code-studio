import {createSceneInspection} from '../scene-inspection.mjs';

// Presentation of detached GG readings; never writes scene or project authoring.
export function createSceneInspectorUI({readScene, getScope, initialScene, objects = () => null, selected = () => null, resources = () => null}) {
  const object = document.querySelector('#inspector-object');
  const button = document.querySelector('#refresh-inspector');
  const status = document.querySelector('#inspector-status');
  const initial = document.querySelector('#inspector-initial');
  const runtime = document.querySelector('#inspector-runtime');
  const variables = document.querySelector('#inspector-variables');
  const fallback = {...initialScene};
  // The student's name of a costume, never its ID. A costume that is gone falls
  // to the object's first one, as the scene does when it starts (design 15).
  function costumeName(ownerId, id) {
    const owned = resources()?.costumes.filter(item => item.ownerId === ownerId) ?? [];
    return (owned.find(item => item.id === id) ?? owned[0])?.name ?? 'Sin disfraz';
  }
  // The object selected in the panel (scene2d-multi-sprite 3.2); hero without objects.
  function inspected() {
    const config = objects(), id = selected();
    if (!config) return {count: 1, id: 'hero', name: fallback.spriteId, authored: fallback};
    if (id === 'stage') return {count: config.sprites.length, id, name: 'Escenario', stage: true, backdrop: costumeName('stage', config.stage.backdrop)};
    const sprite = config.sprites.find(item => item.id === id) ?? config.sprites[0];
    return {count: config.sprites.length, id: sprite.id, name: sprite.name,
      authored: {spriteId: sprite.name, x: sprite.x, y: sprite.y, direction: sprite.direction, size: sprite.size, costume: costumeName(sprite.id, sprite.costume)}};
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
    const snapshot = next.snapshot, {count, id, name, authored, stage, backdrop} = inspected();
    object.querySelector('option[value=hero]').textContent = name + (stage ? ' · Fondo' : ' · Sprite');
    document.querySelector('#inspector-variables-heading').textContent = stage ? 'Variables del escenario' : 'Variables locales de ' + name;
    // scene2d-multi-sprite 3.2: the object view follows the selected object; the
    // scene lists every sprite. A single-hero reading renders exactly as before.
    const reading = snapshot?.sprites.find(sprite => sprite.id === id) ?? null;
    const owned = reading ? snapshot.variables.filter(variable => !variable.targetId || variable.targetId === reading.id) : [];
    // These authoring values stay distinct from the latest runtime reading.
    fields(initial, stage
      ? [['Sprites de autoría', count], ['Fondo inicial', backdrop]]
      : sceneSelected
        ? [['Sprites de autoría', count], ['Sprite', authored.spriteId], ['Disfraz inicial', authored.costume]]
        : [['Sprite', authored.spriteId], ['x inicial', authored.x], ['y inicial', authored.y],
          ['Dirección inicial', authored.direction], ['Tamaño inicial (%)', authored.size], ['Disfraz inicial', authored.costume]]);
    fields(runtime, snapshot
      ? sceneSelected
        ? [['Sprites consultados', snapshot.sprites.length], ...snapshot.sprites.flatMap(sprite => [['Sprite', sprite.name], [`x de ${sprite.name}`, sprite.x], [`y de ${sprite.name}`, sprite.y]]),
          [snapshot.sprites.length === 1 ? `Variables locales de ${snapshot.sprites[0].name}` : 'Variables locales de los sprites', snapshot.variables.length]]
        : stage ? [['Lectura de ejecución', 'El escenario no tiene posición. Elige un sprite para verla.']]
          : reading ? [['Sprite', reading.name], ['x', reading.x], ['y', reading.y]]
            : [['Lectura de ejecución', `«${name}» no está en esta lectura. Ejecuta el programa para verlo.`]]
      : [['Lectura de ejecución', 'Sin lectura disponible']]);
    const items = [];
    if (!sceneSelected && snapshot) {
      for (const variable of owned) {
        const item = document.createElement('li');
        item.textContent = `${variable.name}: ${variable.value} · local de ${reading.name} · ID ${variable.id}`;
        items.push(item);
      }
    }
    if (!items.length) {
      const item = document.createElement('li');
      item.textContent = stage ? 'Las variables del escenario son de todos los objetos.' : sceneSelected
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
