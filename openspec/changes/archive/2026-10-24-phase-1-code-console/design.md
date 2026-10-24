## Context
ADR-001/002: Blockly es autoría; ejecución IR→adaptador Scratch; estado mutable en VM. GG operativo ofrece scene.get, sprite.get/move/setPosition, variables.get/set y events.emit. No ofrece scheduler, clones, audio ni broadcast-and-wait de lenguaje.
## Goals / Non-Goals
Listado educativo español «IR 2D · no ejecutable», nunca JavaScript GG ficticio. Cubre eventos start/key/click/message/clone; operaciones move/wait/repeat/broadcastWait/createClone/deleteClone/setVariable/changeVariable/if/playSound/stopSounds/setCostume; expresiones número/variable/comparación EQ/LT/GT; variables con ámbito/valor inicial. No añade APIs, inspector, eval, edición textual, QuickJS ni Pyodide.
## Decisions
- Generador puro recibe IR y el mismo validateProgram. Devuelve texto y mapa de IDs por línea; máximo 64 KiB UTF-8. Nombres/IDs citados con JSON. Un fallo retira listado previo para no presentarlo como actual, sin mutar autoría, sesión ni escena.
- Registro {level: info|warning|error, code, message, origin: generation|runner|shell|device, sourceBlockId?}. Máximo 100 entradas, mensaje 1024 unidades UTF-16, ID 128, code 64. Entradas malformadas/excesivas de canal se rechazan; errores locales se truncan. Se muestra contador de entradas retiradas; cadenas por textContent.
- Envelope runner existente protocolVersion/sessionId/seq con type=diagnostic, revision y registro. Exige sesión activa, secuencia creciente, revisión activa e ID perteneciente a IR ejecutada. El resultado de carga confirma revisión antes de start. El runner informa inicio por hat start con ID real y errores estructurados sin ID cuando no se pueden atribuir. No se promete traza de cada bloque ni captura universal de excepciones internas VM.
- Resultados/errores siguen correlacionados a solicitud. Diagnósticos de revisión sustituida se descartan. Stop invalida primero y limpia inmediatamente. Edición invalida todos los enlaces anteriores (también errores de generación) para evitar seleccionar otra autoría; los mensajes runner posteriores quedan sin enlace vigente hasta volver a ejecutar. Errores locales usan ID proporcionado por editor, nunca regex del mensaje.
- Código/mapas/logs no entran en GGPROJ/autosave. Selección y foco pasan por editor Blockly y verifican existencia. Contador aria-live, botones con nombres accesibles, lectura con límites de alto/ancho móvil. micro:bit conserva archivo/línea sin inventar IDs.
## Risks / Trade-offs
Listado educativo no es binding de lenguaje. Mensaje de inicio confirma orden al scheduler, no finalización de cada script. F2 definirá bindings/mapas textuales.
## Migration Plan
Aditivo, sin cambios GGPROJ v1/locks. Preservar evidencia histórica y no archivar cambios anteriores.
## Validation
Node: corpus completo, determinismo, mapas, escapes, rechazo/límites y aislamiento del registro. Chromium: edición DOM, ejecución real, selección clic/teclado, inválidos preservan escena, tráfico antiguo, límites, Stop y archivo portable en escritorio/móvil. Full final con fuentes estables.
