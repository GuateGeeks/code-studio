# Design

## Context

Véanse `proposal.md`, ADR-011 y `block-language-contract`, que deja una tabla bloqueable por pack y una API v3 legible. Piezas existentes reutilizables:

- `workspace-from-ir.mjs`: IR→Blockly con verificación por la traducción directa.
- `acorn`: ya se usa en el origen del lenguaje (`quickjs-engine.mjs:1`).
- Pyodide incluye el módulo `ast`.
- El selector Bloques · JavaScript · Python del rework, que hoy elige entre documentos independientes.
- Los mapas línea→bloque y el corpus de equivalencia.

## Goals / Non-Goals

**Goals:** edición en ambos sentidos dentro del subconjunto; rechazo explicado sin pérdida; IDs estables; sin ejecución al cambiar de vista; despliegue por contextos.

**Non-Goals:** convertir código arbitrario, sincronizar en tiempo real, cambiar motores, Static Python de micro:bit.

## Decisions

1. **Fuente de verdad única por momento.** En vista de bloques, la verdad es el workspace. En vista de texto sincronizada, la verdad es el texto. Al salir del texto se convierte. Mientras se edita texto, «Ejecutar» convierte primero; si la conversión falla, se muestra el rechazo y no se ejecuta. Alternativa descartada: conversión continua en cada pulsación, cara y fuente de saltos de cursor.
2. **Parser genérico dirigido por la tabla.**
   - El núcleo reconoce las estructuras instaladas en cada contexto y delega cada llamada, valor o enum a la tabla, por espacio de nombres y nombre. En 2D se convierten eventos con callback, variables y asignaciones numéricas, comparaciones, repeticiones e `if/else`. `while`, `forever` y funciones propias se rechazan en 2D con causa y línea porque no tienen bloque instalado; no se amplían IR, bloques ni runtimes dentro de este cambio. `forever` de micro:bit se conserva para la etapa 4.2.
   - JavaScript se analiza con `acorn` y Python con `ast`, ambos en el worker del origen del lenguaje. El worker devuelve una IR candidata serializable; la shell la valida y la aplica.
   - Python carga Pyodide bajo demanda, con estado «Preparando Python…».
3. **Identidad de bloques por correspondencia estructural.**
   - La generación anota cada nodo con el ID de su bloque en un mapa lateral, nunca en el texto.
   - Al volver se alinean los nodos por estructura y posición (diff de árboles). Coincidencia de tipo y ruta conserva el ID; un nodo nuevo recibe ID nuevo.
   - Las posiciones de los eventos raíz se conservan.
4. **Rechazo con tres salidas.** Seguir editando; volver a la última versión en bloques (con confirmación si hay texto sin guardar); guardar como copia independiente (documento API v3 con el texto exacto). El mensaje nombra la línea, la construcción y, si existe, el bloque más cercano.
5. **Puntos de restauración** en el autosave antes de aplicar una conversión, para que Deshacer recupere el estado previo exacto. La vista activa y el texto pendiente forman parte del estado de autoría guardado.
6. **Despliegue y prueba de viabilidad.** La primera tarea es una prueba de ida y vuelta sobre el corpus: bloques → JS → bloques debe dar el mismo programa y los mismos IDs en el 100 % del corpus 2D. Después se habilitan 2D JavaScript y 2D Python, cada uno con su puerta. micro:bit TypeScript y 3D/web se trasladaron a `synced-code-views-capability-contexts` (véase «Re-alcance a 2D»).
7. **3D/web con código fuera del subconjunto.** Trasladado con 3D/web: el cambio posterior parte del rechazo por defecto y registra allí la decisión sobre bloques grises.
8. **Actividad E3.** La revisión 2 de «De bloques a tu propio código» pide abrir JavaScript, cambiar el movimiento, volver a bloques y explicar qué cambió. Los checks son de programa (`position`, nuevo `edited-in-text`) y no de formato. La revisión 1 sigue disponible para el progreso existente.

## Risks / Trade-offs

- [El diff estructural asigna mal un ID] → prueba de propiedad: mutaciones aleatorias de una línea sobre el corpus deben conservar todos los IDs no afectados.
- [Pyodide (13 MB) en equipos lentos] → carga bajo demanda, JavaScript habilitado antes, medición en el Exp. 2.
- [Los estudiantes chocan con el límite del subconjunto] → mensajes concretos y salida a copia independiente; observación en el Exp. 1.
- [El formato regenerado desconcierta] → aviso la primera vez y conservación de comentarios.
- [Semántica Scratch bajo sintaxis JavaScript] → reglas documentadas en `block-language-contract` y explicadas en la ayuda del editor.

## Migration Plan

Sin migración de datos aparte de añadir la vista activa y el texto pendiente al estado de autoría (GGPROJ v5). La versión 4 ya declara APIs textuales y se conserva: la versión 5 añade codeViews sin reinterpretar los archivos 1–4. Los proyectos con copias independientes las conservan. Se habilita contexto a contexto; cada habilitación tiene su `test:affected` y la última, una `test:full`. Reversión: deshabilitar el modo sincronizado por contexto deja la lectura y la copia independiente como hoy.

## Open Questions

- ¿El modo sincronizado es el predeterminado o una opción que activa el docente? Propuesta: predeterminado, con la copia independiente como acción visible; confirmar en el Exp. 1.


## Resultado de viabilidad (25/10/2026)

Histórico: la primera prueba canónica en un worker real del origen de lenguaje conserva programa e IR (9/9) y posiciones de eventos (9/9), pero no todos los IDs del workspace (0/9): se regeneran 38 IDs de `math_number`. Los números primitivos de la IR y el mapa actual no conservan la identidad de esos bloques. Ese intento detuvo la implementación según el criterio de 1.1; la repetición se registra abajo. [Acta, reproducción y evidencia](../../../docs/engineering/SYNCED-CODE-VIEWS-VIABILITY.md).

Corrección aplicada en la repetición: ampliar el mapa lateral de correspondencia con IDs y conexiones de los bloques numéricos del workspace original, validarlo y conservar esos IDs al reconstruir, sin cambiar la IR0 ni insertar IDs en el texto. Repetir la puerta del 100 % antes de 1.2 o de habilitar vistas. No se considera suficiente comparar solamente los IDs que sobrevivieron en la IR.

## Identidad numérica lateral (corrección de viabilidad)

La IR0 conserva números primitivos. El editor captura aparte un mapa serializable
`numericInputIdentity`: por bloque numérico conectado, `{parentId, inputName, id, shadow}`.
No contiene valores anteriores: el valor reconstruido siempre procede de la IR
candidata del worker. El controlador conserva el mapa junto al layout; el parser
sigue recibiendo únicamente texto, sourceMap y variableIds.

`workspaceFromIR` admite este mapa como opción. Valida forma, tamaño, padre,
unicidad de IDs/entradas y ausencia de colisiones con IDs de la IR; reserva todos
los IDs antes de asignar nuevos. Reutiliza ID y condición shadow/bloque por
padre/entrada, incluso si cambia el número; rechaza entradas no consumidas en vez
de aplicarlas a otro bloque. Sin mapa conserva la asignación histórica
`gg-number-N`. No se cambia la IR0, el texto ni GGPROJ.

Esto resuelve la ida y vuelta canónica sin cambios y cambios de valor en la misma
entrada. No constituye el diff estructural de 1.2: inserciones, reordenamientos,
cambios de tipo y mapas antiguos requieren alineación antes de reconstruir.

La repetición de la puerta en el worker real aprobó: programa/IR, todos los IDs
(incluidos shadows) y posiciones 9/9, cero IDs perdidos, rechazo sin ejecución.
JSON: `artifacts/synced-code-views/numeric-identity-20261025/browser-attempt-2/results.json`.
La tarea 1.1 está completa; 1.2 y la interfaz siguen pendientes.

## Puerta del diff estructural (25/10/2026)

1.2 acreditada en [acta](../../../docs/engineering/SYNCED-CODE-VIEWS-STRUCTURAL-DIFF.md): 491/491 propiedades, 489 reconstrucciones exactas, dos rechazos explícitos por declaración global sin bloque representable y 5.291 nodos con identidad verificada. Correspondencia propia en src/code-view-identity.mjs; valores nuevos nunca se toman del mapa anterior. No hay integración/UI. El alcance de while/forever/funciones propias de 2.1 queda pendiente de aclaración frente al núcleo 2D instalado.

## Subconjunto confirmado por el usuario (25/10/2026)

El usuario eligió mantener el subconjunto actual y ajustar el diseño. La tarea 2.1 convierte las estructuras efectivamente instaladas, con rechazo explicado de las demás y conservación del texto para copia independiente. Una futura ampliación del núcleo será un cambio separado. Se resuelve así la aclaración pendiente al cerrar 1.2.

## Aplicación validada y orden lateral (26/10/2026)

La shell no importa el parser. Un iframe del origen de lenguaje autentica el canal y crea un worker de análisis por solicitud. El editor valida la IR candidata y prepara un workspace separado; una generación de carga invalida resultados anteriores incluso al abrir otro proyecto con autoría idéntica. El mapa lateral scriptOrder conserva el orden de registro del texto y las posiciones originales de los eventos, sin cambiar IR0 ni las operaciones. Solo se admite la lista exacta, única y completa de raíces; un arrastre nativo de raíces restablece el orden visual. GGPROJ v5 conserva este mapa junto con las vistas y puntos de restauración; los archivos anteriores mantienen el orden visual histórico.

## Re-alcance a 2D (29/10/2026)

El usuario decidió priorizar la estabilización de features para empezar a entregar valor en un piloto 2D en aula ([plan de estabilización 2D](../../../docs/product/STABILIZATION-PLAN-2D.md)). Este cambio se cierra con 2D: vistas JavaScript/Python (ya verificadas), la revisión 2 de la actividad de transición, los E2E 2D, una puerta full y la documentación. Las tareas 4.2 (micro:bit TypeScript, HEX idéntico) y 4.3 (3D/web, bloques grises o rechazo) se trasladan sin marcar a `synced-code-views-capability-contexts`, como se hizo con la tarea 3.2 de `block-language-contract`. micro:bit y 3D/web conservan su documento o copia independiente. La disponibilidad honesta por contexto ya presenta esas vistas como no sincronizadas con su causa.

El análisis previo para micro:bit, conservado como borrador fuera de `src/`, deja tres hallazgos para el cambio trasladado: el texto generado es exactamente la fuente que compila PXT, que además incrusta en el HEX, así que un HEX idéntico exige un texto byte a byte idéntico; un evento «al iniciar» vacío no tiene texto y hay que conservarlo al volver; y el grafo del dispositivo no admite comentarios, así que habrá que decidir entre rechazarlos con su línea o ampliar el contrato.
