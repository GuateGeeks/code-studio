import {sceneIdFromScratchTargetName} from './scene-target-names.mjs';

// Runner-local controls. Runtime objects never cross the adapter boundary.
const clickOpcodes = ['event_whenthisspriteclicked', 'event_whenstageclicked'];
const arrows = {ArrowLeft: 'left arrow', ArrowRight: 'right arrow', ArrowUp: 'up arrow', ArrowDown: 'down arrow'};
const keyName = key => key === ' ' ? 'space' : arrows[key] ?? (/^[a-z0-9]$/i.test(key) ? key.toLowerCase() : null);
const keyLabel = key => ({space: 'espacio', 'left arrow': 'flecha izquierda', 'right arrow': 'flecha derecha', 'up arrow': 'flecha arriba', 'down arrow': 'flecha abajo', any: 'letras, números, espacio y flechas'})[key] ?? key;

export function stagePointerCoordinates(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height || !canvas.width || !canvas.height) return null;
  const scale = Math.min(rect.width / canvas.width, rect.height / canvas.height);
  const width = canvas.width * scale, height = canvas.height * scale;
  const x = clientX - rect.left - (rect.width - width) / 2, y = clientY - rect.top - (rect.height - height) / 2;
  if (!(x > 0 && x < width && y > 0 && y < height)) return null;
  // Scratch Mouse forwards x/y directly to renderer.pick(), which converts
  // using canvas.clientWidth/clientHeight, not the object-fit image dimensions.
  // Reproject the visible image into that same client coordinate system so
  // native picking and Mouse's own Scratch coordinates agree.
  const clientWidth = canvas.clientWidth || rect.width, clientHeight = canvas.clientHeight || rect.height;
  return {x: x / width * clientWidth, y: y / height * clientHeight, canvasWidth: clientWidth, canvasHeight: clientHeight};
}

export function createStageInput({canvas, container, vm, isCurrent, mode = 'native', objects = [], onError = () => {}}) {
  const doc = canvas.ownerDocument, view = doc.defaultView, runtime = vm.runtime;
  const controller = new view.AbortController(), signal = controller.signal;
  const root = doc.createElement('div'), label = doc.createElement('label'), select = doc.createElement('select');
  const help = doc.createElement('p'), status = doc.createElement('output');
  const held = new Map(), cloneNumbers = new WeakMap(), subscriptions = [];
  let targets = new Map(), keys = new Set(), action, actionHandler, stopped = false, disposed = false;
  let generation = 0, nextClone = 0, queued = false, mouseDown = false, signature = '', helpSignature = '';
  root.className = 'stage-input'; select.id = 'stage-target'; label.htmlFor = select.id; label.textContent = 'Objeto que recibe el clic';
  help.id = 'stage-input-help'; status.id = 'stage-input-status'; status.setAttribute('role', 'status');
  root.append(label, select, help, status); container.append(root); canvas.tabIndex = 0; canvas.setAttribute('aria-describedby', help.id);
  const live = () => !disposed && !stopped && isCurrent();
  const hats = target => target.blocks.getScripts().map(id => target.blocks.getBlock(id)).filter(Boolean);
  function releaseKeys() {
    for (const key of held.values()) vm.postIOData('keyboard', {key, isDown: false});
    held.clear();
  }
  function releaseMouse() {
    if (mouseDown) vm.postIOData('mouse', {x: -1, y: -1, canvasWidth: 480, canvasHeight: 360, isDown: false});
    mouseDown = false;
  }
  function release() {releaseKeys(); releaseMouse();}
  function name(target) {
    const id = sceneIdFromScratchTargetName(target.getName());
    const text = mode === 'scratch' ? target.getName() : objects.find(object => object.id === id)?.name ?? id;
    if (target.isStage) return mode === 'scratch' ? 'escenario ' + text : 'Escenario';
    if (target.isOriginal) return text;
    if (!cloneNumbers.has(target)) cloneNumbers.set(target, ++nextClone);
    return text + ' · clon ' + cloneNumbers.get(target);
  }
  function updateAction() {
    const target = targets.get(select.value);
    action.textContent = target ? 'Activar ' + name(target) : 'Activar objeto';
    action.disabled = !live() || !target || (!target.isStage && !target.visible);
  }
  function renewAction() {
    const previous = action, focused = doc.activeElement === previous;
    if (previous) previous.removeEventListener('click', actionHandler);
    const token = ++generation;
    action = doc.createElement('button'); action.type = 'button'; action.id = 'activate-stage-target';
    actionHandler = () => {
      if (!live() || token !== generation) return;
      const target = targets.get(select.value);
      if (!target || !runtime.targets.includes(target) || (!target.isStage && !target.visible) || !hats(target).some(block => clickOpcodes.includes(block.opcode))) {refresh(); return;}
      try {
        // Exact native Mouse._activateClickHats semantics, including Stage and
        // shared hats. Text mode reaches its native ggtext_callback primitive.
        for (const opcode of clickOpcodes) runtime.startHats(opcode, null, target);
        status.textContent = 'Clic enviado a ' + name(target) + '.';
        queueRefresh();
      } catch (error) {onError(error);}
    };
    action.addEventListener('click', actionHandler, {signal});
    if (previous) previous.replaceWith(action); else root.insertBefore(action, help);
    updateAction(); if (focused) action.focus();
  }
  function refresh() {
    if (disposed) return;
    const all = runtime.targets, available = all.filter(target => hats(target).some(block => clickOpcodes.includes(block.opcode)));
    targets = new Map(available.map(target => [target.id, target]));
    keys = new Set(all.flatMap(target => hats(target).filter(block => block.opcode === 'event_whenkeypressed').map(block => String(block.fields.KEY_OPTION?.value ?? '').toLowerCase())));
    const next = JSON.stringify(available.map(target => [target.id, name(target), target.isStage || target.visible]));
    if (signature !== next) {
      const previous = select.value; select.replaceChildren(...available.map(target => {
        const option = doc.createElement('option'); option.value = target.id; option.textContent = name(target) + (!target.isStage && !target.visible ? ' · oculto' : ''); return option;
      }));
      if (targets.has(previous)) select.value = previous;
      signature = next;
    }
    select.disabled = !live() || !available.length;
    const description = mode === 'scratch' ? 'Escenario del proyecto Scratch importado' : mode === 'text' ? 'Escenario 2D del documento de texto' : 'Escenario del programa 2D';
    canvas.setAttribute('aria-label', description);
    const nextHelp = (keys.size ? 'Teclas del programa: ' + [...keys].map(keyLabel).join(', ') + '. ' : 'Este programa no usa teclas. ') + 'Tab sale del escenario. Usa el selector y Activar para enviar un clic al objeto.';
    if (nextHelp !== helpSignature) {help.textContent = nextHelp; helpSignature = nextHelp;}
    updateAction();
  }
  function queueRefresh() {
    if (queued || disposed) return; queued = true;
    queueMicrotask(() => {queued = false; if (!disposed) refresh();});
  }
  renewAction();
  select.addEventListener('change', () => {refresh(); updateAction();}, {signal});
  select.addEventListener('focus', refresh, {signal});
  canvas.addEventListener('keydown', event => {
    if (!live()) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {releaseKeys(); return;}
    const key = keyName(event.key);
    if (!key || (!keys.has(key) && !keys.has('any'))) return;
    event.preventDefault(); held.set(event.code || event.key, event.key);
    vm.postIOData('keyboard', {key: event.key, isDown: true});
  }, {signal});
  canvas.addEventListener('keyup', event => {
    const code = event.code || event.key, key = held.get(code);
    if (key !== undefined) {held.delete(code); vm.postIOData('keyboard', {key, isDown: false});}
  }, {signal});
  for (const [type, isDown] of [['pointerdown', true], ['pointerup', false]]) canvas.addEventListener(type, event => {
    if (!live() || event.button !== 0) return;
    const position = stagePointerCoordinates(canvas, event.clientX, event.clientY);
    if (!position) {if (!isDown) releaseMouse(); return;}
    canvas.focus();
    if (isDown) {try {canvas.setPointerCapture(event.pointerId);} catch {}}
    mouseDown = isDown; vm.postIOData('mouse', {...position, isDown});
  }, {signal});
  canvas.addEventListener('pointercancel', releaseMouse, {signal}); canvas.addEventListener('blur', release, {signal});
  view.addEventListener('blur', release, {signal});
  doc.addEventListener('visibilitychange', () => {if (doc.hidden) release();}, {signal});
  function subscribe(event, callback) {runtime.on(event, callback); subscriptions.push([event, callback]);}
  subscribe('targetWasCreated', queueRefresh); subscribe('targetWasRemoved', queueRefresh); subscribe('TARGETS_UPDATE', queueRefresh);
  // A program's control_stop is not the adapter's external Stop. Native Scratch
  // permits a later sprite click to restart hats after PROJECT_STOP_ALL.
  subscribe('PROJECT_STOP_ALL', () => {release(); queueRefresh();});
  subscribe('PROJECT_START', () => {if (!stopped) {renewAction(); queueRefresh();}});
  // Clone hide does not emit TARGETS_UPDATE. Keep just the small control model
  // current; this does not step the VM, read pixels or reconstruct focused DOM.
  const timer = view.setInterval(refresh, 200);
  refresh();
  return Object.freeze({
    refresh, setMode(value) {mode = value; refresh();},
    stop() {if (disposed) return; stopped = true; generation++; release(); refresh();},
    resume() {if (disposed) return; stopped = false; renewAction(); refresh();},
    dispose() {
      if (disposed) return; disposed = true; generation++; release(); controller.abort(); view.clearInterval(timer);
      for (const [event, callback] of subscriptions) runtime.removeListener(event, callback);
      root.remove();
    }
  });
}
