import {parseJavaScriptCodeView} from '../../src/targets/text/code-view-parser.mjs';
// Probe only: the product protocol is integrated separately after this gate.
self.onmessage = ({data}) => {
  try {
    const result = parseJavaScriptCodeView(data.source, data.metadata);
    self.postMessage({requestId: data.requestId, ...result, origin: self.location.origin, executed: self.__codeViewExecuted === true});
  } catch (error) {
    self.postMessage({requestId: data.requestId, error: error.message, line: error.lineNumber, code: error.code,
      origin: self.location.origin, executed: self.__codeViewExecuted === true});
  }
};
