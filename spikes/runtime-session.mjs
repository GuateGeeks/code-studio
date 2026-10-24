import {randomUUID} from 'node:crypto';

// Session IDs are freshness markers, not authorization tokens or an origin boundary.
export class RuntimeSession {
  #sessionId = null;
  #lastSequence = -1;
  #worker = null;

  start(worker = null) {
    if (this.#sessionId || this.#worker) throw new Error('Stop the previous session before starting');
    this.#sessionId = randomUUID();
    this.#lastSequence = -1;
    this.#worker = worker;
    return this.#sessionId;
  }

  accept(message, apply) {
    if (!this.#sessionId || message.sessionId !== this.#sessionId || !Number.isSafeInteger(message.seq) || message.seq <= this.#lastSequence) return false;
    this.#lastSequence = message.seq;
    apply(message.payload);
    return true;
  }

  async stop() {
    this.#sessionId = null;
    const worker = this.#worker;
    this.#worker = null;
    if (worker) await worker.terminate();
  }
}
