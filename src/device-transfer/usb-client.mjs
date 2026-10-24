import {verifyArtifact} from './protocol.mjs';

const families = Object.freeze({
  '9900': {variant: 'v1', label: 'micro:bit V1.3', firmware: ['0249', '0253']},
  '9901': {variant: 'v1', label: 'micro:bit V1.5', firmware: ['0249', '0253']},
  '9903': {variant: 'v2', label: 'micro:bit V2.00', firmware: ['0255']},
  '9904': {variant: 'v2', label: 'micro:bit V2.00', firmware: ['0255']},
  '9905': {variant: 'v2', label: 'micro:bit V2.20', firmware: ['0256', '0257']},
  '9906': {variant: 'v2', label: 'micro:bit V2.21', firmware: ['0257']}
});
// Reviewed interface releases: tech.microbit.org/firmware/daplink-interface/.
// Unknown revisions remain downloadable; they do not gain transport permission.
export function recognizeMicrobit(device, firmware, serial = device?.serialNumber) {
  if (device?.vendorId !== 0x0d28 || device?.productId !== 0x0204 || typeof serial !== 'string' || !/^[a-f0-9]{8,128}$/i.test(serial)) throw new Error('Placa micro:bit no reconocida. Usa la descarga HEX.');
  const family = families[serial.slice(0, 4)];
  const version = typeof firmware === 'string' ? firmware.replace(/\0+$/, '').trim() : '';
  if (!family || !family.firmware.includes(version)) throw new Error('Firmware DAPLink no reconocido o no compatible. Usa la descarga HEX.');
  return {variant: family.variant, label: family.label, firmware: version};
}
export function createUSBTransfer({usb, createTransport, createDAPLink, onChange = () => {},
  hasGesture = () => globalThis.navigator?.userActivation?.isActive === true, timeoutMs = 15000,
  crypto = globalThis.crypto, schedule = setTimeout, cancelTimer = clearTimeout} = {}) {
  let state = {status: 'empty', error: null, progress: null, board: null};
  let artifact = null, operation = 0, transport = null, device = null, dap = null, disposed = false;
  const activeWaiters = new Set();
  const snapshot = () => ({...state, board: state.board ? {...state.board} : null});
  const update = (status, error = null, progress = null, board = state.board) => {
    state = {status, error, progress, board};
    try { onChange(snapshot()); } catch {}
  };
  const check = ticket => { if (disposed || ticket !== operation) throw new Error('Transferencia cancelada'); };
  const bounded = async (promise, ticket) => {
    let waiter;
    try {
      const result = await Promise.race([promise, new Promise((_, reject) => {
        waiter = {reject, timer: schedule(() => reject(new Error('La placa no responde. Desconecta y vuelve a conectar.')), timeoutMs)};
        activeWaiters.add(waiter);
      })]);
      check(ticket);
      return result;
    } finally { if (waiter) { cancelTimer(waiter.timer); activeWaiters.delete(waiter); } }
  };
  const abortWaiters = () => {
    for (const waiter of activeWaiters) { cancelTimer(waiter.timer); waiter.reject(new Error('Transferencia cancelada')); }
    activeWaiters.clear();
  };
  const release = async () => {
    const oldTransport = transport;
    transport = null; dap = null; device = null;
    if (!oldTransport) return;
    let timer;
    try {
      await Promise.race([oldTransport.close(), new Promise(resolve => { timer = schedule(resolve, Math.min(timeoutMs, 1000)); })]);
    } catch {} finally { cancelTimer(timer); }
  };
  const onDisconnect = event => {
    if (event.device !== device) return;
    ++operation; abortWaiters(); void release(); update('error', 'La placa se desconectó. Puedes volver a conectarla.');
  };
  usb?.addEventListener?.('disconnect', onDisconnect);
  async function setArtifact(value) {
    if (disposed || ['connecting', 'transferring'].includes(state.status)) throw new Error('Transferencia ocupada');
    const ticket = ++operation;
    await release();
    artifact = null;
    try {
      const prepared = await verifyArtifact(value, crypto);
      check(ticket); artifact = prepared; update('ready', null, null, null);
      return {...prepared, scope: {...prepared.scope}};
    } catch (error) {
      if (ticket === operation && !disposed) update('error', String(error.message).slice(0, 512), null, null);
      throw error;
    }
  }
  async function connect() {
    if (disposed || !artifact || !['ready', 'error'].includes(state.status)) throw new Error('Prepara un firmware antes de conectar');
    if (!usb?.requestDevice || !hasGesture()) throw new Error('Conectar requiere un clic en un navegador compatible con WebUSB');
    const ticket = ++operation;
    update('connecting', null, null, null);
    try {
      // Keep requestDevice before the first await so the explicit click is live.
      const selected = await bounded(usb.requestDevice({filters: [{vendorId: 0x0d28, productId: 0x0204}]}), ticket);
      check(ticket);
      if (selected.vendorId !== 0x0d28 || selected.productId !== 0x0204) throw new Error('Placa no compatible');
      device = selected;
      const raw = createTransport(selected);
      transport = raw;
      const guarded = {packetSize: raw.packetSize,
        open: async () => { check(ticket); await bounded(raw.open(), ticket); },
        read: async () => { check(ticket); return bounded(raw.read(), ticket); },
        write: async data => { check(ticket); await bounded(raw.write(data), ticket); },
        close: () => raw.close()};
      dap = createDAPLink(guarded);
      await bounded(dap.connect(), ticket);
      // DAP_Info 0x04 is the actual DAPLink firmware string used by pinned PXT.
      const firmware = await bounded(dap.dapInfo(0x04), ticket);
      const serial = selected.serialNumber || await bounded(dap.dapInfo(0x03), ticket);
      const board = recognizeMicrobit(selected, firmware, typeof serial === 'string' ? serial.replace(/\0+$/, '') : '');
      if (artifact.variant !== 'universal' && artifact.variant !== board.variant) throw new Error('La variante HEX no corresponde a la placa seleccionada');
      update('connected', null, null, board);
      return {...board};
    } catch (error) {
      if (ticket === operation && !disposed) { ++operation; await release(); update('error', String(error.message).slice(0, 512), null, null); }
      throw error;
    }
  }
  async function flash() {
    if (disposed || !artifact || state.status !== 'connected' || !dap || !hasGesture()) throw new Error('Transferir requiere una placa conectada y un clic explícito');
    const ticket = operation, target = dap;
    update('transferring', null, 0);
    // DAPjs consumes the full ArrayBuffer, so supply an exact owned buffer.
    const bytes = new TextEncoder().encode(artifact.hex);
    let lastPercent = 0;
    const progress = value => {
      if (ticket !== operation || state.status !== 'transferring' || !Number.isFinite(value)) return;
      const percent = Math.floor(Math.max(0, Math.min(1, value)) * 100);
      if (percent <= lastPercent) return;
      lastPercent = percent;
      update('transferring', null, percent / 100);
    };
    target.on(target.constructor.EVENT_PROGRESS, progress);
    try {
      await bounded(target.flash(bytes.buffer), ticket);
      await bounded(target.disconnect(), ticket);
      check(ticket); await release(); update('complete', null, 1);
    } catch (error) {
      if (ticket === operation && !disposed) { ++operation; await release(); update('error', String(error.message).slice(0, 512)); }
      throw error;
    } finally { target.removeListener?.(target.constructor.EVENT_PROGRESS, progress); }
  }
  function cancel() {
    ++operation; artifact = null; abortWaiters();
    void release();
    if (!disposed) update('cancelled', null, null, null);
  }
  function dispose() {
    cancel(); disposed = true;
    usb?.removeEventListener?.('disconnect', onDisconnect);
    abortWaiters();
  }
  return {setArtifact, connect, flash, cancel, dispose, state: snapshot};
}
