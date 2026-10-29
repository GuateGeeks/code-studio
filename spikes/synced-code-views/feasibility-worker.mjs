import {parseCanonicalCodeView} from '../../src/targets/text/code-views-feasibility.mjs';
// Dedicated experimental worker; served only by the viability probe on the
// language origin. It is not connected to the application's runtime protocol.
self.onmessage = ({data}) => {
  try { self.postMessage({requestId: data.requestId, ir: parseCanonicalCodeView(data.source, data.metadata), origin: self.location.origin, executed: self.__codeViewExecuted === true}); }
  catch (error) { self.postMessage({requestId: data.requestId, error: error.message, line: error.lineNumber, executed: self.__codeViewExecuted === true}); }
};
