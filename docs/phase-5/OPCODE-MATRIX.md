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

## Revisión E1 (29/10/2026): opcodes de la bajada 2D

El vocabulario esencial (`scene2d-vocabulary-v2`, tanda E1) baja la IR 2D a opcodes de esta matriz y a siete opcodes del núcleo de Scratch revisados para esa bajada. Esos siete **no** se añaden a la lista de importación SB3 (`sb3OpcodeDefinitions`): la importación Scratch es un contexto congelado (E-1 del [plan de estabilización 2D](../product/STABILIZATION-PLAN-2D.md)). `src/contracts/scene2d-opcodes.mjs` los declara y `toScratchProject` rechaza cualquier opcode fuera de la unión.

| Opcode | Entradas / campos | Primitiva de la VM local (`packages/scratch-vm`) | Comprobación |
|---|---|---|---|
| motion_glidesecstoxy | SECS, X, Y | `glide`: temporizador en el marco de pila; interpola y cede cada fotograma; con SECS ≤ 0 salta al destino | VOC-010 (Node) y E1-02 (Chromium). El adaptador textual ejecuta la misma primitiva una vez por paso de la VM |
| motion_ifonedgebounce | — | `ifOnEdgeBounce`: necesita los límites del renderer; sin renderer no hace nada | Solo Chromium: E1-03 compara la traza bloques/JS/Python |
| looks_say / looks_think | MESSAGE | Emite `SAY`; el estado `Scratch.looks` guarda tipo y texto; texto vacío borra el globo | VOC-010, E1-02 |
| looks_sayforsecs / looks_thinkforsecs | MESSAGE, SECS | Igual que decir/pensar y devuelve una promesa que borra el globo al terminar si no cambió; `PROJECT_STOP_ALL` borra globos | VOC-010, VOC-013 |
| control_stop | STOP_OPTION `all` / `this script` (mutación `hasnext: false`) | `all` → `runtime.stopAll()` (hilos y clones); `this script` → `stopThisScript()`. «otros programas del objeto» no se usa | VOC-010, VOC-013 |

Límites: el renderer recorta tamaño y posición («fence»); por eso tamaño y rebote se verifican en Chromium. Los literales de la IR quedan acotados (posición ±240/±180, giros ±3600, tamaño 0–1000, cambios ±480/±1000, segundos 0–60, texto ≤ 330 caracteres sin saltos de línea).

## Revisión E2 (30/10/2026): «ir a» y fondos

`gg.sprites@0.3.0` (`scene2d-multi-sprite`, tarea 4.1) baja «ir a objeto», «ir a una posición aleatoria», «cambiar fondo a» y «siguiente fondo» a cinco opcodes del núcleo revisados para esa bajada (`e2ReviewedOpcodes`). Como en E1, **no** se añaden a la lista de importación SB3, que sigue congelada.

| Opcode | Entradas / campos | Primitiva de la VM local (`packages/scratch-vm`) | Comprobación |
|---|---|---|---|
| motion_goto | TO | `goTo`: resuelve el menú con `getTargetXY`. `_random_` da un punto dentro del escenario; otro valor busca el sprite por nombre (los targets usan el ID del objeto, con nombres privados seguros para los IDs centinela) y, si no existe, no hace nada | MS-063, MS-064 (Node) y MS-BROWSER-033 (Chromium) |
| motion_goto_menu | campo TO | Menú sombra, como `looks_costume` | MS-063 |
| looks_switchbackdropto | BACKDROP | `switchBackdrop`: cambia el fondo del escenario desde cualquier objeto y arranca `event_whenbackdropswitchesto`, que no se usa | MS-063, MS-BROWSER-033 |
| looks_backdrops | campo BACKDROP | Menú sombra | MS-063 |
| looks_nextbackdrop | — | `nextBackdrop`: siguiente fondo, con vuelta al primero | MS-064 |

Los IDs válidos de sprite `_mouse_` y `_random_` se conservan en el proyecto. El adaptador los convierte a nombres privados de VM (`/gg/_mouse_` y `/gg/_random_`) tanto en los targets como en los destinos de bloques y texto; la barra no pertenece a la sintaxis de IDs, así que no colisionan con otro objeto válido. Solo «ir a una posición aleatoria» envía el centinela `_random_` a `motion_goto`. Los IDs de fondos no admiten espacios, por lo que no se confunden con `next backdrop`. MS-070/071 verifican ambos IDs en la VM real.
