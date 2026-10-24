const identifier = {type: 'string', minLength: 1, maxLength: 128, notEnum: ['__proto__', 'prototype', 'constructor']};
const label = {type: 'string', minLength: 1, maxLength: 64, notEnum: ['__proto__', 'prototype', 'constructor']};
const initial = {type: 'number', minimum: -1000000, maximum: 1000000};
const blocks = [
  {type: 'gg_score_set', message0: 'fijar puntuación a %1', args0: [{type: 'input_value', name: 'VALUE', check: 'Number'}], previousStatement: null, nextStatement: null, colour: 20},
  {type: 'gg_score_change', message0: 'sumar %1 a puntuación', args0: [{type: 'input_value', name: 'DELTA', check: 'Number'}], previousStatement: null, nextStatement: null, colour: 20},
  {type: 'gg_score_value', message0: 'puntuación', output: 'Number', colour: 20}
];
function score(version, initialField, migration) {
  return {
    id: 'gg.score', version, apiVersion: 1, dependencies: [{id: 'gg.sprites', version: '0.1.0'}], resources: [],
    configSchema: {type: 'object', required: ['variableId', 'label', initialField],
      properties: {variableId: identifier, label, [initialField]: initial}, additionalProperties: false},
    defaults: {variableId: 'gg-pack-score', label: 'Puntos', [initialField]: 0},
    variables: [{id: {config: 'variableId'}, name: {config: 'label'}, scope: 'global', initialValue: {config: initialField}}],
    permissions: {operations: ['variables.get', 'variables.set', 'program.setVariable', 'program.changeVariable', 'program.compare'],
      variables: {config: 'variableId', scope: 'global'}, sprites: [], costumes: [], sounds: []},
    migrations: [migration],
    contributions: {
      blocks,
      toolbox: [{kind: 'category', name: 'Puntuación', colour: 20, contents: [
        {kind: 'block', type: 'gg_score_set', inputs: {VALUE: {shadow: {type: 'math_number', fields: {NUM: 0}}}}},
        {kind: 'block', type: 'gg_score_change', inputs: {DELTA: {shadow: {type: 'math_number', fields: {NUM: 1}}}}},
        {kind: 'block', type: 'gg_score_value'}
      ]}],
      hats: {},
      statements: {
        gg_score_set: {kind: 'setVariable', values: {variableId: {config: 'variableId'}, name: {config: 'label'}, value: {input: 'VALUE', type: 'expression'}}},
        gg_score_change: {kind: 'changeVariable', values: {variableId: {config: 'variableId'}, name: {config: 'label'}, value: {input: 'DELTA', type: 'expression'}}}
      },
      expressions: {gg_score_value: {kind: 'variable', values: {variableId: {config: 'variableId'}, name: {config: 'label'}}}}
    }
  };
}
export const scorePack01 = score('0.1.0', 'initial', {toVersion: '0.2.0', rename: {initial: 'initialValue'}});
export const scorePack02 = score('0.2.0', 'initialValue', {toVersion: '0.1.0', rename: {initialValue: 'initial'}});
