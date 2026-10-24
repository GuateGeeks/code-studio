// Test-only MV3 controller. No content scripts, external messaging or page hook.
// Host permissions only reveal localhost tab URLs; no broad "tabs" permission.
function localURL(value){
 const url=new URL(value);
 if(url.protocol!=='http:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.username||url.password)throw new Error('Zoom fixture accepts localhost HTTP tabs only');
 return url.href;
}
async function target(value){
 const url=localURL(value),matches=(await chrome.tabs.query({})).filter(tab=>tab.url===url);
 if(matches.length!==1||!Number.isInteger(matches[0].id))throw new Error('Expected exactly one matching local test tab');
 return matches[0];
}
globalThis.zoomFixture=Object.freeze({
 async set({url,factor}){
  if(![1,2,4].includes(factor))throw new Error('Unsupported test zoom');
  const tab=await target(url);
  await chrome.tabs.setZoomSettings(tab.id,{mode:'automatic',scope:'per-tab'});
  await chrome.tabs.setZoom(tab.id,factor);
  return {factor:await chrome.tabs.getZoom(tab.id),tabId:tab.id,url:tab.url};
 },
 async get({url}){
  const tab=await target(url);return {factor:await chrome.tabs.getZoom(tab.id),tabId:tab.id,url:tab.url};
 }
});
