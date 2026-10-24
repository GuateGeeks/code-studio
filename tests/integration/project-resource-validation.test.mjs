import test from 'node:test';
import assert from 'node:assert/strict';
import {createResourceValidationQueue} from '../../src/studio/resource-validation.mjs';

const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};

test('GG-PROJECT: overlapping autosave/open resource reads never supersede an independent validation',async()=>{
  const entered=deferred(),release=deferred(),calls=[];
  let active=0,maximum=0;
  const validate=createResourceValidationQueue(async resources=>{
    calls.push(resources.id);active++;maximum=Math.max(maximum,active);
    try {
      if(resources.id==='autosave'){entered.resolve();await release.promise;}
      return {validated:resources.id};
    }finally{active--;}
  });
  const save=validate({id:'autosave'}),open=validate({id:'open'});
  await entered.promise;
  assert.deepEqual(calls,['autosave']);
  release.resolve();
  assert.deepEqual(await Promise.all([save,open]),[{validated:'autosave'},{validated:'open'}]);
  assert.equal(maximum,1);
  assert.deepEqual(calls,['autosave','open']);
});

test('GG-PROJECT: a genuine invalid-resource rejection reaches its caller and does not poison later reads',async()=>{
  const calls=[];
  const validate=createResourceValidationQueue(resources=>{
    calls.push(resources.id);
    if(resources.id==='invalid')throw new Error('Recurso inválido');
    return resources.id;
  });
  const invalid=assert.rejects(validate({id:'invalid'}),/Recurso inválido/);
  const valid=validate({id:'valid'});
  await invalid;
  assert.equal(await valid,'valid');
  assert.equal(await validate({id:'later'}),'later');
  assert.deepEqual(calls,['invalid','valid','later']);
});
