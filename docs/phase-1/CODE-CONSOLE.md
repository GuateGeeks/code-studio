# F1: código derivado y consola

**22 de octubre de 2026, Guatemala · Corte code-console.**

El cambio OpenSpec `phase-1-code-console` añade lectura de la autoría actual y diagnósticos vinculados a bloques. Mantiene GGPROJ v1, autosave, recuperación, ejecución por IR/adaptador y las fronteras de ADR-001/002. Los resultados de persistencia en [RESULTS](RESULTS.md) y los del [flujo de pruebas](../engineering/TEST-WORKFLOW-RESULTS.md) conservan sus corridas históricas.

## Uso

1. Editar un valor Blockly: **Código generado** actualiza la lectura del programa.
2. Pulsar **Ejecutar bloques**. La consola muestra nivel, código, origen y mensaje de inicio del motor. **Ver bloque …** centra, selecciona y enfoca el ID real; también funciona con Enter.
3. Editar invalida los enlaces anteriores. Los errores de generación con ID conocido enlazan al bloque actual. Si la autoría es inválida, el listado se vacía y la escena/sesión activa se conservan.
4. **Detener y reiniciar**, junto a Ejecutar bloques, invalida la sesión y vacía la consola. **Limpiar consola** conserva la protección contra replay.
5. Descargar/reabrir o recuperar autosave regenera el listado. Abrir no ejecuta. El archivo solo guarda autoría/recursos/locks; no contiene código derivado, mapas ni logs.

El listado es **IR 2D educativa no ejecutable**, no JavaScript/Python ni una API GG nueva. Cubre todos los eventos/operaciones/expresiones de la IR v0 validada: inicio, tecla/clic/mensaje/clon, movimiento, repetición, espera, mensajes con espera, variables locales/globales, comparación/condición, clones, disfraces y sonido local. GG operativo sigue ofreciendo `scene.get`, `sprite.get/move/setPosition`, `variables.get/set` y `events.emit`; el listado no inventa bindings para las demás operaciones.

## Contratos y límites

- Generador puro `src/generated-code.mjs`: usa el mismo `validateProgram`, devuelve texto y mapa de IDs por línea, máximo 65 536 bytes UTF-8, sin mutar ni evaluar autoría.
- `src/diagnostic-console.mjs`: máximo 100 registros, mensaje 1024 unidades UTF-16, código 64 e ID 128; retira los más antiguos e informa cantidad. Los errores locales se truncan; el canal rechaza valores excesivos y campos desconocidos.
- Diagnóstico runner: `{protocolVersion:1,sessionId,seq,type:'diagnostic',revision,diagnostic:{level,code,origin:'runner',message,sourceBlockId?}}`. Valida MessagePort autorizado, sesión, orden, revisión e ID de la IR enviada por el shell.
- Errores async mantienen revisión de inicio. Respuestas de compilación de una revisión sustituida no generan salida nueva de dispositivo. Stop sustituye también Run pendiente durante preparación.
- Mensajes se renderizan como texto. Los de dispositivo conservan archivo sin fingir ID Blockly. El mensaje SCRIPT_STARTED confirma envío de inicio al motor, no finalización ni trazado universal de la VM.

La interfaz conserva estilos del shell y scroll interno acotado. Consola está junto a autoría; Stop acompaña a Ejecutar bloques, evitando controles de este flujo después del iframe durante scroll. Las capturas altas se toman después de las aserciones de clic: Chromium puede redimensionar el viewport al capturar un elemento y desfasar su superficie OOPIF. La captura móvil de autoría se acompaña de otra del escenario visible con sprite real.

## Verificación

El full final aprobó **54/54 Node (3,34 s), 23/23 herramientas, 3/3 smoke (20,00 s) y 39/39 regresiones Chromium (232,11 s)**, sin fallos, omisiones, flaky ni reintentos. El perfil completo tomó 260,44 s y avanzó su referencia por contenido. El build reutilizó las siete etapas (0,47 s). OpenSpec valida cuatro cambios, este corte con 8/8 tareas; commits/diffs/locks de los tres upstreams y hashes de evidencia/cambios anteriores se conservaron. [Evidencia propia](code-console-evidence.json) registra reportes, fuentes, capturas y archivos portable.

El grupo afectado previo aprobó 22 casos. La revisión visual independiente confirmó la composición y, tras corregir pérdida de foco y singular de mensajes, dio por resueltos ambos hallazgos; Chromium comprueba el foco al llegar registros y al retirarse una fila por límite. Los intentos fallidos de desarrollo conservan reportes separados y no cuentan como corridas aprobadas. Las pruebas nuevas viven en `tests/integration/generated-code.test.mjs`, `diagnostic-console.test.mjs` y `tests/browser/code-console.spec.mjs`. El selector full incluye explícitamente la suite nueva; HTML/CSS selecciona también estos casos junto con audio, bindings y persistencia.

## Pendientes

Este corte no completa F1. Siguen inspector/selección de objetos y extracción de paquetes desde spikes, según prioridad del siguiente corte. F2 incorpora texto libre QuickJS/Pyodide y bindings de lenguaje. Hardware físico, segunda visita offline y perfil escolar continúan pendientes en sus fases.
