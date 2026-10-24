// Project reads are independent, unlike interactive imports that supersede
// earlier edits. Keep the bounded single-flight validator in order so an
// autosave and an open cannot cancel one another's resource inspection.
export function createResourceValidationQueue(prepare) {
  if(typeof prepare!=='function')throw new TypeError('La validación de recursos requiere una función.');
  let pending=Promise.resolve();
  return resources=>{
    const result=pending.then(()=>prepare(resources));
    pending=result.catch(()=>{});
    return result;
  };
}
