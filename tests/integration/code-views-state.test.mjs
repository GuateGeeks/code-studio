import test from 'node:test';
import assert from 'node:assert/strict';
import {createCodeViewsState,emptyCodeView,validateCodeViews} from '../../src/code-views-state.mjs';

test('CV-STATE: active views and exact text drafts are detached, validated portable authoring',()=>{
  const state=createCodeViewsState(),entry={...emptyCodeView('2d'),language:'javascript',source:'// exact\r\nonStart(()=>{})',baselineSource:'onStart(()=>{})'};
  state.set(entry);entry.source='changed externally';
  assert.equal(state.capture().entries[0].source,'// exact\r\nonStart(()=>{})');
  state.activate('scene3d');assert.equal(state.capture().activeContext,'scene3d');
  const copy=state.capture();copy.entries[0].source='other';
  assert.equal(state.get('2d').source,'// exact\r\nonStart(()=>{})');
  assert.deepEqual(validateCodeViews(state.capture()),state.capture());
});
test('CV-STATE: invalid imported state cannot replace current views or hide its pending text',()=>{
  const state=createCodeViewsState();state.set({...emptyCodeView('2d'),language:'javascript',source:'pending'});
  const before=state.capture();
  for(const input of [{version:9,activeContext:'2d',entries:[]},{...before,extra:true},
    {...before,entries:[before.entries[0],before.entries[0]]},{...before,entries:[{...before.entries[0],language:'typescript'}]},
    {...before,entries:[{...before.entries[0],restorePoint:{workspace:{},appliedHash:'not-a-hash'}}]}]){
    assert.throws(()=>state.commit(input));assert.deepEqual(state.capture(),before);
  }
});
test('CV-STATE: rollback preserves oversized in-memory drafts even while portable validation rejects them',()=>{
  const state=createCodeViewsState();state.set({...emptyCodeView('2d'),language:'javascript'});
  state.editSource('2d','x'.repeat(65537));
  const token=state.checkpoint();state.commit(null);state.restoreDraft(token);
  assert.equal(state.get('2d').source.length,65537);
  assert.throws(()=>validateCodeViews(state.capture()),/65.536/);
  assert.throws(()=>state.restoreDraft({}),/desconocido/);
});
