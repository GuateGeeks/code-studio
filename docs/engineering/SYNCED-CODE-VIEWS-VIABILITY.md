# Viabilidad de vistas sincronizadas: primera prueba 2D

25 de octubre de 2026, Guatemala. Cambio `synced-code-views`, tarea 1.1, sobre el commit `1235693`. **Primer intento: no aprobado; repetición con identidad numérica: aprobada (véase abajo).** No se habilitó ninguna vista sincronizada ni se modificó la interfaz.

## Prueba realizada

El prototipo analiza la forma JavaScript canónica de los nueve programas de `tests/fixtures/corpus.blocks.mjs`. El análisis usa Acorn en `src/targets/text/code-views-feasibility.mjs`, dirigido por las entradas de acciones y eventos de la tabla de sprites. Es un inversor experimental de la salida actual; no es todavía el parser genérico de la tarea 2.1.

`spikes/synced-code-views/viability.mjs` empaqueta un worker experimental con el webpack ya instalado, sin añadir dependencias ni modificar upstreams. Chromium abre una página en el origen 4173 con un iframe del origen de lenguaje 4176. Desde ese iframe se crea un Web Worker de módulo, servido con CSP `script-src 'self'; worker-src 'self'`.

El worker recibe **solo el texto y sus mapas laterales actuales** (`sourceMap` y `variableIds`), nunca la IR anterior. Devuelve una IR candidata serializable y su origen. El controlador de la prueba valida la candidata con `validateProgram`, la reconstruye mediante `workspaceFromIR` y vuelve a traducir el Blockly real. Se comparan el programa completo, los pares ID/tipo de **todos** los bloques, incluidos los numéricos shadow, y las posiciones de eventos. Una entrada fuera del subconjunto se rechaza con línea y sin evaluar el texto.

Esto demuestra análisis en un worker real del origen de lenguaje, no integración con el protocolo productivo de `language-worker.mjs`, ni edición o persistencia en Studio. El experimento no incorpora el parser a la shell.

## Resultado real

Carga antes de Chromium: 2,14 / 0,87 / 0,60 (1 / 5 / 15 minutos). El [JSON de navegador](../../artifacts/synced-code-views/viability-20261025/browser-attempt-1/results.json) contiene `accepted: false`; el proceso terminó con código 1.

| Programa | Programa/IR igual | Todos los IDs iguales | Posiciones iguales | IDs perdidos |
|---|---|---|---|---:|
| events | Sí | No | Sí | 4 |
| messages | Sí | No | Sí | 4 |
| clones | Sí | No | Sí | 3 |
| variables | Sí | No | Sí | 12 |
| audio | Sí | No | Sí | 1 |
| audioStop | Sí | No | Sí | 2 |
| globalVariables | Sí | No | Sí | 5 |
| costumes | Sí | No | Sí | 1 |
| concurrent | Sí | No | Sí | 6 |
| **Total** | **9/9** | **0/9** | **9/9** | **38** |

Los 38 IDs perdidos corresponden a `math_number`. Por ejemplo, `wait-start-n` se reconstruye con un nombre nuevo como `gg-number-0`. Los IDs representados en la IR siguen iguales, pero eso no satisface el requisito de conservar los IDs de todos los bloques.

## Causa y decisión de parada del primer intento

`workspaceToIR` baja los bloques numéricos a números primitivos, sin su ID. `generateApi3ProgramSource` solo conoce esos números y su mapa lateral incluye IDs de nodos IR, no los de los bloques numéricos. `workspaceFromIR` crea nuevos bloques `math_number` con contador `gg-number-N`.

Por tanto, reutilizar el mapa actual y el inversor existente conserva semántica pero pierde identidad aun sin editar una línea. La prueba existente de IR→Blockly verifica operaciones e IDs de la IR; no acredita la conservación completa del workspace que ahora exige `code-views`.

La [tarea 1.1](../../openspec/changes/synced-code-views/tasks.md) exige «mismo programa y mismos IDs en el 100 % del corpus; registrar el resultado y detener el cambio si no se alcanza». Se mantiene **sin marcar** y no se avanza a 1.2 ni a la habilitación de vistas.

## Propuesta inicial para continuar (histórica)

Ampliar la correspondencia lateral de identidad para incluir el workspace original completo: IDs de bloques numéricos y sus conexiones por bloque padre/entrada, además de los nodos ya representados en la IR. La reconstrucción debe reutilizar esos IDs cuando la entrada persiste, incluso al editar su valor, y crear IDs nuevos solo para bloques nuevos. Después hay que repetir esta misma puerta sin omitir shadows ni reducir el criterio de igualdad.

Esta vía conserva la IR0 y evita introducir IDs opacos en el texto. Debe concretarse en el diseño antes de continuar: cómo se valida el mapa, cómo se resuelven inserciones/reordenamientos y qué metadatos laterales se conservan. No se cambió GGPROJ, ningún contrato de ejecución, ni la bajada 2D trasladada a `scene2d-vocabulary-v2`.

## Evidencia y reproducción

- [Consultas CodeGraph](../../artifacts/synced-code-views/viability-20261025/codegraph/): generador e inversor.
- [Log de navegador](../../artifacts/synced-code-views/viability-20261025/browser-attempt-1.log), [resultado agregado](../../artifacts/synced-code-views/viability-20261025/browser-attempt-1/results.json) y JSON de cada programa con fuente, mapas, IR candidata e inventarios de bloques.
- Pruebas Node del parser: **2/2** en [segundo intento](../../artifacts/synced-code-views/viability-20261025/parser-attempt-2.tap). El [primer intento](../../artifacts/synced-code-views/viability-20261025/parser.tap) quedó en 1/2 por el texto del diagnóstico de rechazo, que se hizo explícito sobre el subconjunto canónico; se conserva como intento fallido.
- Las verificaciones de regresión del prototipo se registran separadamente de esta puerta de viabilidad, que sigue **no aprobada**. La puerta anterior de `block-language-contract` no certifica estos archivos nuevos.

Desde la raíz del producto, con puertos 4173 y 4176 libres; la prueba cierra únicamente los dos servidores que ella crea:

```bash
bash -c 'source ../scripts/env.sh && unset -f node npm npx && node --test tests/integration/code-views-feasibility.test.mjs'
bash -c 'source ../scripts/env.sh && unset -f node npm npx && node spikes/synced-code-views/viability.mjs artifacts/synced-code-views/otro-intento'
```

El destino de cada prueba de navegador debe ser nuevo para conservar la evidencia anterior. Se espera código 1 mientras no se resuelva la identidad completa. Sin commit, archivo ni push de este cambio.

## Repetición con identidad numérica lateral

Se corrigió la pérdida reproducida sin cambiar la IR0 ni incrustar IDs en el
texto. `captureNumericInputIdentity` guarda solo `{parentId, inputName, id, shadow}`
por número conectado. El controlador conserva este mapa junto al layout;
el worker recibe el mismo texto/sourceMap/variableIds y devuelve la candidata
sin recibir la IR anterior. `workspaceFromIR` valida y reserva los IDs, conserva
la distinción bloque/shadow y toma todos los valores de la nueva candidata.
Rechaza mapas malformados, IDs repetidos, colisiones y conexiones inexistentes.

Evidencia nueva en [numeric-identity-20261025](../../artifacts/synced-code-views/numeric-identity-20261025/):

- `numeric-repro.tap`: reproducción previa a la corrección, 2/3; falló la
  comparación de todos los IDs del primer programa. No se cuenta como aprobado.
- `focal-attempt-1.tap`: 9/9 tras la corrección inicial.
- `focal-attempt-2.tap`: 12/12, incluidos el corpus completo y 38 mutaciones
  individuales de números, mapas inválidos, no mutación de las entradas,
  bloques numéricos no shadow y reserva de IDs frente al asignador histórico.
- [Puerta Chromium/worker](../../artifacts/synced-code-views/numeric-identity-20261025/browser-attempt-2/results.json):
  `accepted: true`, proceso 0; programa/IR **9/9**, todos los IDs y condición
  shadow/bloque **9/9**, posiciones **9/9**, **0 IDs perdidos**. El rechazo de
  código ajeno al subconjunto sigue aprobado y no ejecuta texto. Carga previa:
  1,65 / 1,27 / 0,97. El intento inicial con 38 IDs perdidos se conserva intacto.

La tarea **1.1 está completa**. Las mutaciones numéricas cambian solo valores en
entradas existentes y no completan 1.2: faltan inserciones, eliminaciones,
reordenamientos y correspondencia estructural. El mapa rechaza conexiones
obsoletas en vez de reasignar sus IDs silenciosamente. El parser sigue siendo
canónico experimental, sin integración con el protocolo, la UI ni persistencia.
No se habilitaron vistas ni se amplió el alcance a otros lenguajes/contextos.

La regresión quick previa del prototipo terminó durante el build tras 426 Node
y 74 herramientas: es una corrida interrumpida, no una puerta aprobada. La
puerta completa anterior de block-language-contract no certifica esta corrección.

## Regresión de esta corrección y límites de consolidación

El [quick nuevo](../../artifacts/synced-code-views/numeric-identity-20261025/quick-results.json)
terminó con `exitCode: 0`: **430 Node**, **74 herramientas**, build incremental
aprobado y **3/3 smoke Chromium**, sin fallos. `baselineWritten: false`, como
corresponde al perfil quick. Se conservaron TAP, JSON de navegador y log
`quick-attempt-1.log` en la carpeta nueva. El arranque de Playwright tardó antes
de iniciar los smoke; completó los tres sin modificar pruebas ni timeouts.

El plan affected guardado selecciona **full**. No se ejecutó esa puerta:
al revisar el entorno, los puertos **4177 y 4178** requeridos por la prueba
offline estaban ocupados por demos de `socrates.app` (procesos ajenos a esta
sesión). No se detuvieron ni se reasignaron sus puertos. También había edición
documental concurrente en `scene2d-journey-stabilization` y
`project-continuity-model`; la primera validación global encontró la carpeta
del plan aún sin deltas (35 aprobados, 1 fallido), antes de que su autor terminara.
La validación estricta aislada de `synced-code-views` sí aprobó.

La tarea 1.1 queda acreditada por su propia puerta real y el quick se informa
separadamente. La consolidación completa del incremento sigue pendiente:
necesita los puertos offline libres, fuentes congeladas y `test:full` antes de
afirmar una puerta completa nueva. La tarea 5.2 sigue sin marcar, junto con las
tareas de diff estructural, protocolo, interfaz y demás contextos. Sin commit,
archivo ni push de este incremento.

## Regresión conjunta posterior

La puerta conjunta de estabilización 2D y continuidad incluyó este estado previo
del checkout y aprobó 435 Node, 74 herramientas, 3 smoke y 214 regresiones E2E,
con fuentes congeladas y baseline avanzada. Véase el
[acta conjunta](SCENE2D-JOURNEY-STABILIZATION-RESULTS.md).
Esto verifica regresión del código experimental presente; la única tarea de este
cambio completada sigue siendo 1.1. No se implementaron diff estructural 1.2 ni UI,
ni se habilitó conversión por pasar la puerta general.
