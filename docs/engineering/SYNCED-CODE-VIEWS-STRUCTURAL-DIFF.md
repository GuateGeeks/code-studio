# Diff estructural de vistas de código

25 de octubre de 2026, Guatemala. Continuación sobre el commit local c1b8901.
Solo puerta 1.2 de synced-code-views; sin conversión o interfaz habilitada, commit,
archivo ni push. La puerta histórica 435/74/217 no acredita estas fuentes nuevas.

## Correspondencia

El módulo propio src/code-view-identity.mjs recibe IR anterior y candidata
validadas, identidad numérica y posiciones de eventos. No importa parsers,
Blockly ni runtimes. Ignora los IDs temporales del candidato al buscar identidad.

Alinea listas por distancia de edición de árboles: subárbol exacto, sustitución
compatible por tipo, inserción y eliminación. Usa claves ordenadas para que el
orden de propiedades JSON no afecte a la comparación. Los subárboles movidos
dentro de una lista pueden conservar identidad. Desciende por los dos brazos,
controles y expresiones. Una edición de valor conserva el bloque contenedor.
Los nodos nuevos y sus números reciben IDs reservados contra todos los IDs
anteriores, incluidos los eliminados. No se reciclan IDs numéricos eliminados.
Se conservan shadow/bloque y posición de raíces supervivientes. No se modifica
ninguna entrada ni la semántica candidata.

Los nodos indistinguibles se alinean de manera determinista por orden. Sin
proveniencia de edición no se puede inferir cuál de varias líneas idénticas quiso
eliminar el usuario; esta puerta no promete identificar esa intención oculta.
Las pruebas de vecinos idénticos sí comprueban que editar un valor conserva los
IDs de sus vecinos sin cambios.

## Prueba ejecutada

Prueba reproducible con semilla 0x5eed25 sobre los nueve programas 2D:

| Caso | Cantidad |
|---|---:|
| Ida y vuelta sin edición | 9 |
| Valores numéricos (cinco muestras por cada una de 38 entradas) | 190 |
| Inserción de instrucción en cada posición | 72 |
| Eliminación de instrucción hoja | 45 |
| Sustitución por otro tipo | 45 |
| Comentario o línea vacía en cada posición | 127 |
| Opción de evento | 3 |
| Total | 491 |

La generación del texto usa una IR oráculo; el parser recibe únicamente texto,
IDs temporales por línea y metadatos de variables, sin IR anterior ni IDs de
bloques anteriores. La correspondencia posterior recibe la IR anterior.
El controlador Node realiza la correspondencia y reconstrucción headless; no se
ha probado una interfaz de conversión. La misma matriz se analizó con Acorn en
un worker real de 127.0.0.1:4176,
separado de la shell de prueba en 127.0.0.1:4173.

**491/491 propiedades aprobadas; 5.291 nodos con identidad verificada**.
489 candidatos se reconstruyeron exactamente, incluidos números y posiciones.
Dos candidatos preservan identidad pero se rechazan antes de aplicar: eliminan
la única asignación global y dejan una declaración shared sin bloque global que
la represente. La validación inversa existente detecta el cambio de ámbito.
No se inventa un bloque ni se elimina esa declaración para hacerlos pasar.

También se verifican metadatos inválidos, vecinos iguales, reserva de IDs,
inmutabilidad y rechazo sin ejecución. La matriz es evidencia acotada al corpus,
las mutaciones descritas y la semilla; no prueba todo JavaScript ni contextos aún
no habilitados.

## Evidencia y reproducción

[Carpeta nueva de evidencia](../../artifacts/synced-code-views/structural-diff-20261025/),
[resultado del worker](../../artifacts/synced-code-views/structural-diff-20261025/browser-attempt-1/results.json)
y [entradas de las 491 mutaciones](../../artifacts/synced-code-views/structural-diff-20261025/browser-attempt-1/mutation-inputs.json).
Se conservan los intentos Node iniciales: dos rechazos de ámbito no clasificados
y comparación que dependía del orden JSON; las repeticiones aprobadas corrigen
esa comprobación y separan identidad de representabilidad, sin omitir casos.

Reproducir desde Ubuntu/WSL con el entorno del proyecto:

    node --test tests/integration/code-view-identity.test.mjs tests/integration/code-views-feasibility.test.mjs
    node spikes/synced-code-views/structural-property.mjs artifacts/synced-code-views/<carpeta-nueva>

La reproducción de navegador requiere verificar carga y puertos 4173/4176 antes;
el controlador rechaza sobrescribir una carpeta y no detiene servicios existentes.

## Continuación

1.2 acreditada. La tarea 2.1 requiere aclarar el alcance de while, forever y
funciones propias que enumera el diseño: no tienen representación en el núcleo
2D instalado (coreLanguageEntries, IR0 y traducción Blockly). Mantener el
subconjunto y explicar su rechazo o ampliar antes bloques/contratos/runtimes son
alternativas distintas. No se cambia el diseño ni se amplía el núcleo sin resolverlo.
2.2 y la interfaz permanecen pendientes. El trabajo de continuidad y 2D archivado
en c1b8901 se conserva.

## Controles del incremento

Quick aprobado: **445 Node, 74 herramientas, build incremental y 3 smoke de navegador**, sin fallos u omisiones; exitCode 0, baselineWritten false. OpenSpec estricto **35/35**, CodeGraph sincronizado y diff --check limpio. Se consultó affected --list: el módulo nuevo, aún sin integrar, activa la selección conservadora completa; no se ejecutó esa ampliación ni una full mientras se aclara 2.1. La puerta 1.2 se acredita con las propiedades focales y el parser en worker real; quick no se presenta como una regresión completa ni como prueba de UI sincronizada.

## Continuación del 26/10/2026: 2.1 y 2.2

El usuario confirmó mantener el subconjunto instalado y ajustar el diseño; se resuelve la aclaración anterior. Parser JavaScript dirigido por tablas/reglas instaladas, con causas y líneas; 491 casos en worker real (489 reconstrucciones y dos rechazos de ámbito). Preparación atómica en la shell, comentarios, posiciones y orden lateral de eventos; las operaciones e IR0 no se amplían. Canal aislado sin ejecución ni permiso para catálogos externos.

Se verificaron seis casos del producto: conversión y commit explícito con resultado activo; rechazo y análisis tardío; cancelación; edición entre preparación y commit; apertura de otro proyecto con contenido idéntico; orden de eventos y arrastre nativo. Cuatro casos están en [browser-3](../../artifacts/synced-code-views/conversion-20261026/browser-3.json), el caso de identidad entre proyectos en [project-switch-fixed](../../artifacts/synced-code-views/conversion-20261026/project-switch-fixed.json) y el de orden en [event-order](../../artifacts/synced-code-views/conversion-20261026/event-order.json). Son focales separados, no una full.

Quick previo a la última extensión de orden: 460 Node, 75 herramientas y tres smoke aprobados; se conserva el quick fallido por falta de registro de la suite y su corrección. El primer fixture A/B no normalizaba ambos recursos; el segundo reprodujo el fallo real, corregido mediante generación de carga del editor. Los primeros reportes focales usaron una variable incorrecta; se conservó el reporte real y se restauró la full histórica desde su copia exacta, sin avanzar baseline. Evidencia nueva: [conversion-20261026](../../artifacts/synced-code-views/conversion-20261026/).

3.1/3.2 en preparación: modelo de vistas y GGPROJ v5 para texto pendiente, orden y punto de restauración. La versión 4 ya corresponde a APIs textuales y sigue siendo legible. Aún no se declara interfaz habilitada ni continuidad de vistas verificada. Sin commit, archivo ni push.
