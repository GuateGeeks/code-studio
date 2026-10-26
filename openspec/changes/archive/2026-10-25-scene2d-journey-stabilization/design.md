# Design

## Context

Plan del 25/10/2026; solo documentación autorizada. Véase [proposal.md](proposal.md). La base consolidada es `1235693`; los cambios vivos de `synced-code-views` pertenecen a `code-studio-worker` y no están certificados por la puerta anterior.

La revisión de código encontró:

- `src/studio/project-ui.mjs`: contador de cambios separado de revisión; autosave a 400 ms; `flush` confirma tras guardar; descarga captura y empaqueta sin depender del autosave; `replacePrepared` protege contra ediciones durante preparación.
- `src/autosave-store.mjs`: IndexedDB con current/previous, rotación atómica, validación y reintento. Un cierre abrupto solo garantiza la última revisión confirmada.
- `src/project-authoring.mjs`: captura, preparación y checkpoints de autoría. Reutilizar esta frontera, sin serializar estado del runner.
- `tests/browser/project-persistence.spec.mjs` y `studio-entry-journey.spec.mjs` ya cubren descarga real, regreso local, archivos inválidos, cuota, respaldo y parte del recorrido. La ampliación debe cubrir huecos, no duplicar esas suites.
- `tests/fixtures/canonical/scene2d/repeat-move/` solo prueba iniciar, mover y detener. Se reutiliza como semilla determinista; no acredita un juego ni madurez N3.
- [GGPROJ](../../../../docs/phase-1/GGPROJ.md) ya limita la garantía al commit; la propuesta anterior de continuidad prometía guardado al cerrar. Se reconcilia en [project-continuity-model](../2026-10-25-project-continuity-model/design.md).

Estos son hechos observados y límites; no se presume una regresión actual de persistencia ni se atribuye la pérdida de IDs de la conversión experimental al archivo GGPROJ.

## Goals / Non-Goals

**Goals:** una entrega 2D de alcance acotado, reproducible desde controles visibles, con protección de autoría y continuidad comprensible. Distinguir aprobación técnica de observación docente.

**Non-Goals:** modificar conversores, identidad de texto→bloques, API textual, IR, formato portable, motores, packs o catálogo; alcanzar los proyectos Diálogo/Laberinto/Atrapa la fruta; mejorar CI o desplegar. No habilitar ni deshabilitar funcionalidades del worker como efecto secundario.

## Decisions

### 1. Dos cambios y una aceptación conjunta

Este cambio posee los escenarios de recorrido y coherencia de exportación (`project-persistence`). `project-continuity-model` posee el estado local/portable, metadatos y «Llevar o entregar» (`project-continuity`). No se duplican requisitos ni implementaciones.

Secuencia futura: caracterización del recorrido → coherencia de captura y defectos reproducidos → implementación de continuidad en su propio cambio → integración del recorrido → puerta completa estable. No existe dependencia técnica de la conversión para esos pasos. Alternativa descartada: esperar todas las vistas sincronizadas, que ampliaría innecesariamente el corte.

Las garantías antiguas de project-persistence, studio-entry-journey, integrated-2d-workspace, workspace-presentation y packs-lessons-offline se conservan. Solo GG-PROJECT-005 se amplía y GG-PROJECT-011 se añade aquí. Las copias independientes siguen siendo un caso de compatibilidad aunque el worker habilite otras vistas después.

### 2. Coordinación y propiedad de archivos

| Área | Responsable del trabajo futuro | Regla |
|---|---|---|
| `openspec/changes/scene2d-journey-stabilization/**` y `openspec/changes/project-continuity-model/**` | Esta planificación | Solo artefactos; todas las tareas quedan pendientes |
| `openspec/changes/synced-code-views/**`, `spikes/synced-code-views/**`, `src/targets/text/**`, `src/editor/workspace-from-ir.mjs`, sus pruebas y acta de viabilidad | code-studio-worker | No editarlos ni ejecutar su experimento desde este cambio |
| `src/studio/project-ui.mjs`, `src/project-authoring.mjs`, `src/autosave-store.mjs` | Un implementador acordado para continuidad/recorrido | Son superficies potencialmente compartidas con persistencia de vistas; tomar turno de escritura antes de implementar |
| `src/studio/index.html`, `style.css`, `contextual-workspace.mjs`, `shell.js` | Un único escritor acordado | No escribir en paralelo con una futura integración visual de synced-code-views |
| `tools/test/impact.mjs`, evidencia canónica, build, puertos y documentación de estado | Coordinación de ambas sesiones | Serializar escrituras y ejecución; ningún full mientras otra sesión escribe |

Durante este plan no se modifica código, pruebas, main specs, NEXT-SESSION, PRODUCT, README ni actas del worker. Se avisó a code-studio-worker del alcance documental y se notificará su congelación. No se declara que el worker aceptó un reparto futuro hasta obtener confirmación al iniciar implementación.

Antes de implementar: registrar revisión exacta y diff existente; acordar escritor/archivos y ventana de pruebas con el worker; consultar CodeGraph antes de cambiar fronteras. Si el worker sigue trabajando, realizar únicamente tareas sin solapamiento acordado. La nueva carpeta documental también afecta el inventario del full: al anunciar congelación, no escribir hasta terminar esa puerta.

### 3. Captura, identidad y recuperación

Comparar nombre, IDs de proyecto/bloques/variables, tipos, campos, conexiones, posiciones, documentos independientes, recursos y locks compatibles. Normalizar solamente orden de claves y metadatos de revisión/fechas esperados; nunca eliminar IDs/shadows para obtener igualdad. El valor final del runtime se verifica aparte.

La exportación captura una vez y utiliza ese mismo modelo para bytes, nombre y referencia de contenido. Cualquier edición posterior permanece pendiente respecto de esa copia. Si A se exporta y B pasa a ser activo, el resultado tardío de A no actualiza B. No se afirma que hoy exista una carrera defectuosa: se agrega una prueba controlada que retrase el empaquetado y, si falla, una corrección mínima.

No se reconstruye Blockly desde IR para guardar: se conserva el workspace de autoría. La comparación de todos los IDs aquí prueba persistencia, no la viabilidad de conversión del worker.

### 4. Matriz de aceptación y cobertura existente

Todas las filas son obligatorias para el cierre técnico; los identificadores SJ son del plan, no tests ya existentes. Reutilizar/ampliar pruebas por comportamiento; no crear una suite por cada fila.

| Caso | Recorrido y resultado exigido | Contrato y lugar de prueba |
|---|---|---|
| SJ-01 | Crear 2D desde Inicio, renombrar, editar valor, ejecutar, detener; resultado esperado y autoría intacta | GG-ENTRY-003/004, GG-PROJECT-005; studio-entry-journey |
| SJ-02 | Esperar commit, cerrar página y recuperar en el mismo perfil/origen; comparar autoría completa; nada ejecuta al volver | GG-PROJECT-005/006/007; project-persistence |
| SJ-03 | Descargar bytes reales y abrir en contexto limpio sin IndexedDB anterior; mismos IDs/recursos/documento independiente y comportamiento | GG-PROJECT-005; project-persistence, language-copies |
| SJ-04 | Retrasar exportación; editar A o cambiar a B; archivo coherente y ningún estado de copia falso | GG-PROJECT-011; project-persistence y casos PC-03/04 |
| SJ-05 | Archivo truncado/incompatible rechazado; cancelar selección o reemplazo conserva autoría, sesión y copias | GG-PROJECT-003/004, GG-ENTRY-002; project-persistence, studio-entry-journey |
| SJ-06 | IndexedDB denegado/cuota: aviso, edición/ejecución/descarga disponibles; reintento real no bloqueado | GG-PROJECT-006/008; project-persistence y PC-02 |
| SJ-07 | Current corrupto restaura previous con aviso; ambas corruptas se conservan y no se sobrescriben automáticamente | GG-PROJECT-007; project-persistence, studio-entry-journey |
| SJ-08 | Stop durante espera/audio; mensajes tardíos no afectan autoría, copia ni nueva ejecución; 10 ciclos acotados sin errores | GG-PROJECT-009, runtime-session; project-persistence y corpus existente |
| SJ-09 | Otra página reabre la preparación offline válida con servidores detenidos; recuperar, editar, ejecutar, detener, descargar | GG-ENTRY-009, packs-lessons-offline; offline-recovery |
| SJ-10 | Entrada, continuidad y descarga alcanzables por teclado, ancho reducido y zoom real 200/400%; foco y avisos útiles | GG-ENTRY-008, GG-PROJECT-010; accessibility-shell/zoom |
| SJ-11 | Editar durante guardado lento no muestra la revisión nueva como confirmada; cerrar antes/después del commit distingue garantía | GG-PROJECT-006/007; project-persistence y PC-01/05 |
| SJ-12 | Integrar estados y recordatorio de continuidad sin mutar autoría al consultar/descargar | Todos los requisitos project-continuity; casos PC-01…07 |

Para SJ-01, semilla repeat-move (3 repeticiones de 5 pasos = x15), editar el valor a 7 y comprobar x21; Stop vuelve a x0. Verificar los valores de la semilla al implementar. Agregar nombre propio y documento independiente en SJ-03 sin convertirlo. Para SJ-08 usar los fixtures de espera/audio ya existentes y su activación por gesto cuando corresponda.

Las acciones principales se ejercen mediante UI; probes sirven para observación y fallos controlados, no para saltarse el recorrido que se evalúa. En SJ-11 una transacción retenida/abortada permite probar el límite durable sin depender de cerrar a los 399 ms. No simular un cierre abrupto con un flush explícito previo.

### 5. Evidencia y política de pruebas

- Cada defecto necesita caso reproducible y prueba que falla antes y pasa después. Si un escenario ya está cubierto y pasa, enlazar la evidencia sin reescribir producto.
- Cada grupo añade sus pruebas y documentación junto con su cambio. Usar quick durante edición y affected con lista explícita de archivos; no confundirlos con full.
- No ejecutar ninguna suite ahora. En implementación, WSL con `source ../scripts/env.sh` y `unset -f node npm npx`; comprobar carga de cinco minutos menor de 6 antes de full y puertos según TESTING/NEXT-SESSION. No detener previews ajenos.
- Al integrar ambos cambios, una sola puerta completa puede acreditarlos si el inventario incluye ambos, los documentos y fuentes permanecen congelados, y ambas actas enlazan exactamente la misma corrida. No duplicar el full por cerrar documentos.
- Guardar en una carpeta nueva por intento bajo `artifacts/scene2d-journey-stabilization/`: commit base, diff o huella de fuentes, Node/navegador/entorno, comando, resultados, incidencias, capturas/trazas pertinentes y vínculo SJ/PC→prueba. Acta versionada propuesta: `docs/engineering/SCENE2D-JOURNEY-STABILIZATION-RESULTS.md`. No sobrescribir la evidencia histórica de otros cortes.
- Cierre técnico: SJ-01…12 y PC-01…07 cubiertos, full con exitCode 0 y fuentes estables, specs estrictas válidas y upstreams preservados. Ningún caso obligatorio omitido o fallido se presenta como aprobado. Un fallo intermitente conserva sus intentos y explicación; no se eleva un timeout sin diagnóstico.
- El acta separa software verificado de aceptación escolar pendiente. Preparar un guion: crear/modificar/recuperar y explicar «dónde está mi trabajo» y «qué llevo a otra computadora»; no se marca observación aprobada sin participantes.

## Risks / Trade-offs

- [Cambios concurrentes de autoría o UI] → acuerdo de escritor único y revisión de compatibilidad antes de integrar; no revertir archivos del worker.
- [Solo pasa el ejemplo fijo] → matrices de fallo/recuperación, ediciones durante operaciones y exportación en perfil limpio; no declarar expresividad N3.
- [Cierre abrupto o descarga cancelada por el navegador] → garantías limitadas a commit/captura y copy honesto en project-continuity.
- [Pruebas existentes ya cubren el problema] → reutilizar resultados actuales del corte y no añadir tests que repitan implementación.
- [WSL no representa aula] → declarar entorno y dejar hardware, lector humano y desempeño escolar pendientes.

## Migration Plan

No se planea migración GGPROJ ni cambio IR. La continuidad añade metadatos locales opcionales descritos en su diseño; proyectos anteriores siguen abiertos sin ejecutarse. Una reversión del código de continuidad debe ignorar esos metadatos sin eliminar current/previous.

Orden de entrega futuro: pruebas de caracterización y correcciones pequeñas → continuidad → integración estable → acta y actualización acotada de estado vigente (sin reescribir historia). Commit/archivo y cualquier publicación requieren el encargo correspondiente; este plan no los realiza.

## Encargo de implementación vigente

El usuario autorizó implementar este plan y el de continuidad/recorrido.
code-studio-worker mantiene el turno único de escritura; la coordinadora revisa
en solo lectura. Los avisos históricos de solo planificación corresponden al
encargo anterior. Se registran base, diff recibido, consumidores CodeGraph y
matriz inicial en `artifacts/scene2d-journey-stabilization/implementation-20261025/`.
Synced-code-views permanece en 1.1 aprobada, sin avanzar 1.2 ni su interfaz.

## Implementación y verificación antes de la puerta conjunta

El código y los casos SJ/PC aprobaron quick (435 Node, 74 herramientas, 3 smoke)
y affected focal (435 Node, 74 herramientas, 37 E2E y 36 especificaciones).
La fuente compartida de datos es `src/project-continuity.mjs`, fuera de Studio,
para que el store y la UI reutilicen validación/estado sin dependencias circulares.
La memoria temporal se conserva por projectId durante esta página; se invalida
por token al cambiar de proyecto. El lector de IndexedDB de 1235693 se ejecutó
como fixture exacto. La cabecera compacta usa resumen y conserva ayuda completa
en Archivo. Actas en `docs/engineering/SCENE2D-JOURNEY-STABILIZATION-RESULTS.md`
y `PROJECT-CONTINUITY-RESULTS.md`; full pendiente.

La puerta conjunta posterior aprobó 435 Node, 74 herramientas, 3 smoke y 214
regresiones E2E, specs 36/36 y upstreams 3/3; baseline avanzada y 44 huellas sin
cambios durante la corrida. Los resultados y límites están en las actas citadas.
No se hace commit ni archivo; la observación docente sigue pendiente.
