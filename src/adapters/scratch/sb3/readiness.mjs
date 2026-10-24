// Pinned renderer internals stay behind this adapter. A transparent/hidden skin
// is valid; a color/pixel count is never a loading condition.
export async function awaitRenderReadiness({vm,renderer,signal,timeoutMs=5000}) {
  const end=performance.now()+timeoutMs;
  const costumes=vm.runtime.targets.filter(target=>target.isOriginal||target.isStage).flatMap(target=>target.getCostumes());
  for(;;){
    if(signal?.aborted)throw new Error('Scene preparation cancelled');
    let ready=true;
    for(const costume of costumes){
      const skin=renderer._allSkins[costume.skinId];
      if(!skin)throw new Error('Costume skin was not created');
      if(Object.hasOwn(skin,'_svgImageLoaded')&&!skin._svgImageLoaded){
        const image=skin._svgImage;
        if(image?.complete&&image.naturalWidth===0)throw new Error('SVG costume failed to decode');
        ready=false;continue;
      }
      const dimensions=renderer.getSkinSize(costume.skinId);
      if(!dimensions.every(value=>Number.isFinite(value)&&value>0&&value<=2048))throw new Error('Invalid decoded costume dimensions');
      skin.getTexture([100,100]);
    }
    if(ready){renderer.draw();return;}
    if(performance.now()>end)throw new Error('Costume decode timeout');
    await new Promise(resolve=>setTimeout(resolve,16));
  }
}

export async function awaitSceneStep(promise,{signal,timeoutMs=5000}={}) {
  if(signal?.aborted)throw new Error('Scene preparation cancelled');
  let timer,abort;
  try {
    return await Promise.race([promise,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Scene preparation timeout')),timeoutMs);
      abort=()=>reject(new Error('Scene preparation cancelled'));
      signal?.addEventListener('abort',abort,{once:true});
    })]);
  } finally {clearTimeout(timer);if(abort)signal?.removeEventListener('abort',abort);}
}
