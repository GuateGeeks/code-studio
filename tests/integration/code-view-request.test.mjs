import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCodeViewRequest} from '../../src/contracts/code-view-conversion.mjs';
import {createCapabilities} from '../../src/contracts/packs.mjs';

test('CV-CHANNEL: conversion DTO accepts only data for a supported language and cannot inject a catalog, previous program or executable hook',()=>{
  const valid={language:'javascript',source:'onStart(()=>{hero.move(2)})',
    capabilities:createCapabilities(['gg.sprites']),variableIds:{},variableNames:{}};
  const copy=validateCodeViewRequest(valid);assert.deepEqual(copy,valid);assert.notEqual(copy,valid);
  for(const input of [null,[],{...valid,language:'typescript'},{...valid,language:'javascript',source:()=>'x'},
    {...valid,catalog:[]},{...valid,previousIR:{}},{...valid,script:'eval(x)'},{...valid,source:'x'.repeat(65537)},
    {...valid,variableIds:{score:0}},{...valid,variableNames:[]},{...valid,capabilities:{locks:[],config:{bad:{url:'https://example.com'}}}}])
    assert.throws(()=>validateCodeViewRequest(input));
});
