# Matriz pública SB3 de F5

Los opcodes siguientes tienen una proyección revisada en la VM. Campos, slots, referencias, medios y cuotas también deben ser válidos. Un opcode no listado, cualquier extensión o elemento desconocido bloquea la ejecución completa. Tener un opcode admitido no promete conversión editable ni equivalencia textual.

La copia editable requiere la intersección IR0 completa y un roundtrip Blockly sin coerciones. Los otros packs activos también deben ser compatibles con esa copia; un conflicto rechaza la transacción y conserva el proyecto.

| Opcode | Clase | Inputs | Campos |
|---|---|---|---|
| control_create_clone_of | statement | CLONE_OPTION |  |
| control_create_clone_of_menu | menu |  | CLONE_OPTION |
| control_delete_this_clone | statement |  |  |
| control_forever | statement | SUBSTACK |  |
| control_if | statement | CONDITION, SUBSTACK |  |
| control_if_else | statement | CONDITION, SUBSTACK, SUBSTACK2 |  |
| control_repeat | statement | TIMES, SUBSTACK |  |
| control_repeat_until | statement | CONDITION, SUBSTACK |  |
| control_start_as_clone | hat |  |  |
| control_wait | statement | DURATION |  |
| control_wait_until | statement | CONDITION |  |
| data_addtolist | statement | ITEM | LIST |
| data_changevariableby | statement | VALUE | VARIABLE |
| data_deletealloflist | statement |  | LIST |
| data_deleteoflist | statement | INDEX | LIST |
| data_insertatlist | statement | ITEM, INDEX | LIST |
| data_itemnumoflist | reporter | ITEM | LIST |
| data_itemoflist | reporter | INDEX | LIST |
| data_lengthoflist | reporter |  | LIST |
| data_listcontainsitem | reporter | ITEM | LIST |
| data_listcontents | reporter |  | LIST |
| data_replaceitemoflist | statement | INDEX, ITEM | LIST |
| data_setvariableto | statement | VALUE | VARIABLE |
| data_variable | reporter |  | VARIABLE |
| event_broadcast | statement | BROADCAST_INPUT |  |
| event_broadcastandwait | statement | BROADCAST_INPUT |  |
| event_whenbroadcastreceived | hat |  | BROADCAST_OPTION |
| event_whenflagclicked | hat |  |  |
| event_whenkeypressed | hat |  | KEY_OPTION |
| event_whenstageclicked | hat |  |  |
| event_whenthisspriteclicked | hat |  |  |
| looks_changeeffectby | statement | CHANGE | EFFECT |
| looks_changesizeby | statement | CHANGE |  |
| looks_cleargraphiceffects | statement |  |  |
| looks_costume | menu |  | COSTUME |
| looks_hide | statement |  |  |
| looks_nextcostume | statement |  |  |
| looks_seteffectto | statement | VALUE | EFFECT |
| looks_setsizeto | statement | SIZE |  |
| looks_show | statement |  |  |
| looks_size | reporter |  |  |
| looks_switchcostumeto | statement | COSTUME |  |
| math_angle | literal |  | NUM |
| math_integer | literal |  | NUM |
| math_number | literal |  | NUM |
| math_positive_number | literal |  | NUM |
| math_whole_number | literal |  | NUM |
| motion_changexby | statement | DX |  |
| motion_changeyby | statement | DY |  |
| motion_direction | reporter |  |  |
| motion_gotoxy | statement | X, Y |  |
| motion_movesteps | statement | STEPS |  |
| motion_pointindirection | statement | DIRECTION |  |
| motion_setx | statement | X |  |
| motion_sety | statement | Y |  |
| motion_turnleft | statement | DEGREES |  |
| motion_turnright | statement | DEGREES |  |
| motion_xposition | reporter |  |  |
| motion_yposition | reporter |  |  |
| operator_add | reporter | NUM1, NUM2 |  |
| operator_and | reporter | OPERAND1, OPERAND2 |  |
| operator_contains | reporter | STRING1, STRING2 |  |
| operator_divide | reporter | NUM1, NUM2 |  |
| operator_equals | reporter | OPERAND1, OPERAND2 |  |
| operator_gt | reporter | OPERAND1, OPERAND2 |  |
| operator_join | reporter | STRING1, STRING2 |  |
| operator_length | reporter | STRING |  |
| operator_letter_of | reporter | LETTER, STRING |  |
| operator_lt | reporter | OPERAND1, OPERAND2 |  |
| operator_mod | reporter | NUM1, NUM2 |  |
| operator_multiply | reporter | NUM1, NUM2 |  |
| operator_not | reporter | OPERAND |  |
| operator_or | reporter | OPERAND1, OPERAND2 |  |
| operator_random | reporter | FROM, TO |  |
| operator_round | reporter | NUM |  |
| operator_subtract | reporter | NUM1, NUM2 |  |
| sound_changevolumeby | statement | VOLUME |  |
| sound_play | statement | SOUND_MENU |  |
| sound_playuntildone | statement | SOUND_MENU |  |
| sound_setvolumeto | statement | VOLUME |  |
| sound_sounds_menu | menu |  | SOUND_MENU |
| sound_stopallsounds | statement |  |  |
| sound_volume | reporter |  |  |
| text | literal |  | TEXT |

## Corpus propio CC0

Los hashes y la procedencia están en tests/fixtures/sb3/manifest.json. Las filas clasifican archivos completos.

| Archivo | Cobertura | Comportamiento esperado |
|---|---|---|
| 01-start.sb3 | gg-editable | {"status":"gg-editable","x":10} |
| 02-key.sb3 | gg-editable | {"status":"gg-editable","x":12,"trigger":"key"} |
| 03-click.sb3 | gg-editable | {"status":"gg-editable","x":7,"trigger":"click"} |
| 04-concurrent.sb3 | gg-editable | {"status":"gg-editable","x":13} |
| 05-repeat.sb3 | gg-editable | {"status":"gg-editable","x":12} |
| 06-variables.sb3 | gg-editable | {"status":"gg-editable","x":7,"variables":{"score":7}} |
| 07-broadcast.sb3 | gg-editable | {"status":"gg-editable","x":5} |
| 08-clones.sb3 | vm-compatible | {"status":"vm-compatible","x":0,"globalVariables":{"count":1}} |
| 09-sound.sb3 | gg-editable | {"status":"gg-editable","x":4,"audio":true} |
| 10-costumes.sb3 | gg-editable | {"status":"gg-editable","x":2,"costume":1} |
| 11-initial.sb3 | vm-compatible | {"status":"vm-compatible","x":7} |
| 12-two-sprites.sb3 | vm-compatible | {"status":"vm-compatible","sprites":{"Azul":10,"Verde":20}} |
| 13-lists.sb3 | vm-compatible | {"status":"vm-compatible","x":0,"lists":{"items":["C"]}} |
| 14-unicode.sb3 | vm-compatible | {"status":"vm-compatible","x":0,"variables":{"number":13,"text":"Guate ñ"}} |
| 15-effects.sb3 | vm-compatible | {"status":"vm-compatible","x":0,"effects":{"ghost":50,"color":30},"visible":false} |
| 16-transparent.sb3 | gg-editable | {"status":"gg-editable","x":6,"transparent":true} |
| 17-svg-audio.sb3 | vm-compatible | {"status":"vm-compatible","sprites":{"Azul":9},"audio":true} |
| 18-procedure.sb3 | unsupported | {"status":"unsupported"} |
| 19-extension.sb3 | unsupported | {"status":"unsupported"} |
| 20-unknown.sb3 | unsupported | {"status":"unsupported"} |

La lectura headless de VM comprueba scheduler/datos. Las pruebas Chromium añaden render, gestos de audio, copia de los diez editables, Stop y portabilidad. Véase [RESULTS](RESULTS.md) para la evidencia realmente consolidada.
