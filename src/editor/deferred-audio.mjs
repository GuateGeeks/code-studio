// Blockly 13 crea un AudioContext en el constructor de cada WorkspaceSvg
// (WorkspaceAudio), aunque el editor use `sounds: false`: doce al arrancar el
// estudio. Chromium construye cada AudioContext de forma síncrona contra el
// servicio de audio; si el dispositivo o el servidor de audio no responde, cada
// constructor bloquea el hilo principal ~20 s y el estudio queda minutos sin
// poder ejecutar (docs/engineering/STARTUP-HANG-INVESTIGATION.md).
//
// Mientras se crean los editores, WorkspaceAudio recibe un contexto diferido:
// el real se construye al primer sonido, que Blockly solo pide tras un gesto
// (pitido de error del teclado). Conserva solo lo que WorkspaceAudio usa.
class DeferredAudioContext {
  #Native; #context = null; #closed = false;
  constructor(Native) { this.#Native = Native; }
  #real() { this.#context ??= new this.#Native(); return this.#context; }
  get state() { return this.#context?.state ?? (this.#closed ? 'closed' : 'suspended'); }
  get currentTime() { return this.#real().currentTime; }
  get destination() { return this.#real().destination; }
  resume() { return this.#real().resume(); }
  close() { this.#closed = true; return this.#context ? this.#context.close() : Promise.resolve(); }
  createBufferSource() { return this.#real().createBufferSource(); }
  createGain() { return this.#real().createGain(); }
  createOscillator() { return this.#real().createOscillator(); }
  decodeAudioData(...args) { return this.#real().decodeAudioData(...args); }
}

export function withDeferredAudioContext(create, scope = globalThis) {
  const descriptor = Object.getOwnPropertyDescriptor(scope, 'AudioContext');
  if (!descriptor?.value) return create();
  const Native = descriptor.value;
  Object.defineProperty(scope, 'AudioContext', {...descriptor, value: function AudioContext() { return new DeferredAudioContext(Native); }});
  try { return create(); } finally { Object.defineProperty(scope, 'AudioContext', descriptor); }
}
