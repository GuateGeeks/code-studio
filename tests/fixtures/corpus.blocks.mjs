// Build-owned Blockly serialization fixtures, translated by the same IR path.
const number = (id, value) => ({shadow: {type: 'math_number', id, fields: {NUM: value}}});
const move = (id, steps) => ({type: 'gg_move', id, inputs: {STEPS: number(`${id}-n`, steps)}});
const wait = (id, seconds) => ({type: 'gg_wait', id, inputs: {SECONDS: number(`${id}-n`, seconds)}});
const chain = (...blocks) => blocks.reduceRight((next, block) => next ? {...block, next: {block: next}} : block, null);
const hat = (type, id, body, fields = {}) => ({type, id, fields, inputs: {DO: {block: body}}});
const fixture = (...blocks) => ({blocks: {languageVersion: 0, blocks}});
const variableId = 'gg-score';
const ref = id => ({block: {type: 'variables_get', id, fields: {VAR: {id: variableId}}}});
const set = (id, value, change = false) => ({type: change ? 'math_change' : 'variables_set', id, fields: {VAR: {id: variableId}}, inputs: {[change ? 'DELTA' : 'VALUE']: number(`${id}-n`, value)}});
const scopedSet = (id, variable, value, type = 'variables_set') => ({type, id, fields: {VAR: {id: variable}}, inputs: {[type === 'math_change' ? 'DELTA' : 'VALUE']: number(`${id}-n`, value)}});
const costume = (id, name) => ({type: 'gg_set_costume', id, fields: {COSTUME: name}});
const choose = (id, operator, threshold, yes, no) => ({type: 'controls_if', id, extraState: {hasElse: true}, inputs: {
  IF0: {block: {type: 'logic_compare', id: `${id}-compare`, fields: {OP: operator}, inputs: {A: ref(`${id}-read`), B: number(`${id}-n`, threshold)}}},
  DO0: {block: yes}, ELSE: {block: no}
}});
export const corpus = {
  events: fixture(
    hat('gg_when_start', 'start', chain(wait('wait-start', 0.2), move('move-start', 5))),
    hat('gg_when_key', 'key', move('move-key', 7), {KEY: 'space'}),
    hat('gg_when_clicked', 'click', move('move-click', 11))
  ),
  messages: fixture(
    hat('gg_when_start', 'start', chain(move('before', 1), {type: 'gg_broadcast_wait', id: 'send', fields: {MESSAGE: 'go'}}, move('after', 2))),
    hat('gg_when_message', 'receive', chain(wait('wait-receiver', 0.2), move('receiver-move', 10)), {MESSAGE: 'go'})
  ),
  clones: fixture(
    hat('gg_when_start', 'start', chain({type: 'gg_create_clone', id: 'create'}, move('original-move', 2))),
    hat('gg_when_clone', 'clone-start', chain(move('clone-move', 60), wait('wait-clone', 0.8), {type: 'gg_delete_clone', id: 'delete'}))
  ),
  variables: {...fixture(
    hat('gg_when_start', 'start', chain(set('reset-score', 0),
      {type: 'controls_repeat_ext', id: 'count-loop', inputs: {TIMES: number('count-n', 3), DO: {block: chain(set('increment-score', 1, true), choose('branch-loop', 'LT', 2, move('true-move', 4), move('false-move', 7)))}}},
      choose('branch-final', 'EQ', 3, {type: 'gg_move', id: 'move-score', inputs: {STEPS: ref('move-score-read')}}, move('unexpected-final', 100)))),
    hat('gg_when_key', 'key', chain(set('decrement-score', -1, true), choose('branch-key', 'GT', 2, move('unexpected-key', 100), move('key-move', -2))), {KEY: 'space'})
  ), variables: [{name: 'score', id: variableId}]},
  audio: fixture(hat('gg_when_start', 'start', chain({type: 'gg_play_sound_wait', id: 'play-wait', fields: {SOUND: 'tone'}}, move('after-sound', 5)))),
  audioStop: fixture(hat('gg_when_start', 'start', chain({type: 'gg_play_sound', id: 'play', fields: {SOUND: 'tone'}}, wait('wait-before-stop', 0.4), {type: 'gg_stop_sounds', id: 'stop-sounds'}, move('after-stop-sound', 3)))),
  globalVariables: {...fixture(
    hat('gg_when_start', 'scope-start', chain(scopedSet('global-reset', 'gg-global-score', 10, 'gg_set_global'), scopedSet('local-reset', 'gg-local-score', 3), {type: 'gg_create_clone', id: 'scope-clone'})),
    hat('gg_when_clone', 'scope-clone-start', chain(scopedSet('clone-global-change', 'gg-global-score', 7, 'math_change'), scopedSet('clone-local-change', 'gg-local-score', 2, 'math_change'), wait('scope-clone-wait', 0.8), {type: 'gg_delete_clone', id: 'scope-delete'}))
  ), variables: [{name: 'globalScore', id: 'gg-global-score'}, {name: 'localScore', id: 'gg-local-score'}]},
  costumes: fixture(hat('gg_when_start', 'costume-start', chain(costume('costume-alt', 'hero-alt'), wait('costume-wait', 0.8), costume('costume-original', 'hero')))),
  concurrent: {...fixture(
    hat('gg_when_start', 'concurrent-long', chain(scopedSet('long-start', 'gg-long', 1), wait('long-wait', 1.2), scopedSet('long-finish', 'gg-long', 2))),
    hat('gg_when_start', 'concurrent-short', chain(scopedSet('short-start', 'gg-short', 1), wait('short-wait', 0.4), scopedSet('short-finish', 'gg-short', 2)))
  ), variables: [{name: 'longScript', id: 'gg-long'}, {name: 'shortScript', id: 'gg-short'}]}
};

export const editableExample = {...fixture(
  {...hat('gg_when_start', 'editable-start', chain(set('editable-set', 1), {type: 'controls_repeat_ext', id: 'editable-repeat', inputs: {TIMES: number('editable-count', 3), DO: {block: move('editable-move', 4)}}})), x: 25, y: 30},
  {...hat('gg_when_message', 'editable-boost', chain(set('editable-change', 1, true), {type: 'gg_move', id: 'editable-event-move', inputs: {STEPS: ref('editable-read')}}), {MESSAGE: 'boost'}), x: 25, y: 260}
), variables: [{name: 'score', id: variableId}]};
