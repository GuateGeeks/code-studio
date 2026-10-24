import {validateSimulatorDeviceScope, deviceRuntimeLimits} from '../../../contracts/device-runtime.mjs';

// This observes the simulator bus, including events raised by the PXT program.
// It does not assert a physical board or a trusted human gesture.
export function observeButtonBus({board, deviceScope, emit, now = () => performance.now()}) {
  const scope = validateSimulatorDeviceScope(deviceScope);
  const bus = board?.bus, buttons = board?.buttonPairState;
  const click = buttons?.props?.BUTTON_EVT_CLICK;
  if (typeof bus?.queue !== 'function' || !Number.isSafeInteger(click) || typeof emit !== 'function') throw new Error('Bus de botones no disponible');
  const names = new Map([[buttons.aBtn?.id, 'A'], [buttons.bBtn?.id, 'B'], [buttons.abBtn?.id, 'AB']]);
  if (names.size !== 3 || [...names.keys()].some(id => !Number.isSafeInteger(id))) throw new Error('Botones no disponibles');
  const original = bus.queue;
  let live = true, seq = 0, windowStart = now(), count = 0;
  function observedQueue(id, event, ...rest) {
    const result = original.call(this, id, event, ...rest);
    if (!live || this !== bus || event !== click || !names.has(id) || seq >= deviceRuntimeLimits.eventsPerRun) return result;
    const time = now();
    if (time - windowStart >= 1000) { windowStart = time; count = 0; }
    if (count >= deviceRuntimeLimits.eventsPerSecond) return result;
    count++;
    const message = {type: 'device-event', version: 1, session: scope.sessionId, deviceScope: {...scope},
      seq: ++seq, event: {kind: 'button', button: names.get(id), action: 'pressed'}};
    try { emit(message); } catch {} // A host transport failure must not alter PXT semantics.
    return result;
  }
  bus.queue = observedQueue;
  return () => {
    live = false;
    if (bus.queue === observedQueue) bus.queue = original;
  };
}
