import {validateCodeViewRequest} from '../../contracts/code-view-conversion.mjs';
let started=false;
self.onmessage=async({data})=>{
  if(started)return;started=true;
  try {
    const request=validateCodeViewRequest(data);
    const parser=await import('/vendor/code-view-parser.bundle.mjs');
    const {source,language,...options}=request;
    const result=language==='python'
      ? await (await import('./code-view-python.mjs')).parsePythonCodeView(source,options,parser)
      : parser.parseJavaScriptCodeView(source,options);
    self.postMessage({type:'result',result,workerOrigin:self.location.origin});
  }catch(error){self.postMessage({type:'error',error:{message:String(error.message).slice(0,1024),
    code:error.code??'CV_PARSE',lineNumber:error.lineNumber??1,columnNumber:error.columnNumber??1}});}
};
