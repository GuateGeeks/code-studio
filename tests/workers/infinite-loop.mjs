import {parentPort} from 'node:worker_threads';
parentPort.postMessage({ready: true});
while (true) { /* deliberately non-cooperative fixture */ }
