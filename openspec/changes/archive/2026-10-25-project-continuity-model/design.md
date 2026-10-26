# Design

## Context

Revisión del plan el 25/10/2026, sin implementación. La motivación está en [proposal.md](proposal.md). El recorrido conjunto se define en [scene2d-journey-stabilization](../2026-10-25-scene2d-journey-stabilization/design.md).

`src/studio/project-ui.mjs` ya expone ready/id/revision/dirty/savedAt y recuperación. `flush` captura un contador de cambios y solo confirma la revisión correspondiente. La descarga genera un modelo con revision+1 aunque no se haya producido un nuevo commit. Por eso comparar únicamente revisión actual y última descargada no representa fiablemente igualdad de contenido.

`src/autosave-store.mjs` usa IndexedDB versión 1, store snapshots, claves current/previous y confirmación por transacción. La descarga funciona sin depender del almacenamiento. `visibilitychange` y `pagehide` ya intentan guardar; no garantizan un commit antes de cerrar. La garantía publicada en [GGPROJ](../../../../docs/phase-1/GGPROJ.md) es la última revisión confirmada.

Se rectifican dos puntos del plan anterior: ni beforeunload garantiza guardado ni el navegador confirma al sitio que el archivo solicitado se escribió en disco. El aviso nativo requiere condiciones del navegador, muestra texto genérico y puede no ocurrir. Fuentes: [MDN beforeunload](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) y [MDN download](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download).

## Goals / Non-Goals

**Goals:** estados locales y portables independientes, referencia exacta al contenido capturado, recuperación compatible y lenguaje comprensible para primaria alta.

**Non-Goals:** modificar GGPROJ, fusionar pestañas, añadir servicios, certificar archivos en disco, enviar entregas, cambiar formatos de vistas o tocar conversores. La lógica no exige que synced-code-views apruebe para existir.

## Decisions

### 1. Dos dimensiones, no tres estados excluyentes

Derivar un estado propio desde el controlador, sin inferirlo leyendo el texto del DOM. Propuesta de módulo puro `src/studio/project-continuity.mjs`; no importa Blockly ni internals de motores.

| Dimensión | Situación | Mensaje de referencia |
|---|---|---|
| Local | Cambios pendientes / guardando | «Cambios pendientes de guardar» / «Guardando…» |
| Local | Commit del contenido vigente | «Guardado en este navegador» |
| Local | Fallo o recuperación bloqueada | Mantener causa y acción de recuperación; no sustituirla por el mensaje de descarga |
| Portable | Registro ausente o inválido | «Sin registro de copia en este navegador» |
| Portable | Solicitud para contenido vigente | «Copia solicitada a las HH:mm. Comprueba tu carpeta de descargas» |
| Portable | Solicitud anterior | «Hay cambios desde la última solicitud de copia» |
| Portable | Registro no persistido | Mostrar la solicitud en esta sesión y avisar «No se pudo guardar el registro de la copia» |

Conservar el idioma, etiquetas y estado de recuperación existentes. Se prefiere «este navegador» a «este equipo» porque cambiar de perfil/origen no traslada el autosave. No se afirma «Sin cambios pendientes» mientras exista una edición aún no guardada.

Alternativa descartada: una etiqueta única que cambie de «Guardado» a «Descargado»; ocultaría un fallo de persistencia. La hora es informativa, no prueba de que el archivo exista. No hace falta un temporizador por minuto para este primer corte.

### 2. Identidad de contenido y descarga coherente

Construir una huella SHA-256 local a partir de una serialización canónica de la captura validada: formato/versión, id y nombre del proyecto, authoring, scene/capabilities, resources y locks. Excluir project.revision/createdAt/updatedAt; conservar orden de arrays e IDs/conexiones/layout. No enviar la huella fuera del navegador.

La revisión numérica y savedAt siguen existiendo para su propósito; no se reutilizan como igualdad de autoría. La huella identifica también cambios de nombre, documento independiente y recursos. Si cambia únicamente una fecha o revisión sin cambiar contenido, no se inventa una copia desactualizada. Si cambia contenido, marcar provisionalmente la copia como anterior mientras se recalcula; nunca mostrar «actual» sobre una captura invalidada.

Una sola captura alimenta modelo, bytes, nombre y huella de la exportación. Registrar `{version:1, projectId, contentHash, requestedAt}` solo después de empaquetar y activar la descarga; no registrar ante error. La entrega al navegador no equivale a finalización en disco. Si el usuario cancela posteriormente y la API no lo notifica, el mensaje permanece «solicitada», nunca «archivo guardado».

Conservar en cada operación un token de proyecto/captura. Los resultados asíncronos de A no actualizan el estado visible de B ni vuelven vigente una revisión anterior de A. La falta de IndexedDB no impide descargar una captura válida. Esta integración consume el contrato GG-PROJECT-011 del plan de recorrido; no requiere cambiar el formato del archivo.

Alternativa descartada: `lastDownloadedRevision` como única condición, por el incremento de revisión al exportar y la separación entre edición, captura y commit.

### 3. Metadato opcional, aislado del respaldo

Añadir al store existente una clave con espacio de nombres por proyecto, por ejemplo `continuity:<projectId>`, sin cambiar su versión ni la forma de current/previous. Validar schema, UUID, hash hexadecimal y fecha; un registro desconocido se ignora con estado «sin registro». No promover metadatos a GGPROJ ni a `authoring.capture()`.

Lecturas/escrituras usan la cola de almacenamiento sin rotar snapshots ni emitir cambios de autoría. La operación que actualiza el metadato escribe solo su clave; no llama a save con el proyecto. Un fallo permite reintento y no invalida la descarga ya solicitada ni un snapshot válido.

Si no hay almacenamiento, conservar temporalmente el registro en memoria con aviso de que no sobrevivirá al cierre. Al recuperar previous, comparar su contenido con la huella registrada: una copia de current no acredita el respaldo. Abrir otro archivo conserva su autoría; solo reutiliza un registro si coinciden proyecto y contenido, sin asumir que abrir equivale a descargar.

El borrado explícito de los datos locales retira también estos registros; una versión anterior del código ignora las claves adicionales. No ampliar este cambio a sincronización entre pestañas: una finalización local ajena se invalida por token; la coordinación multiusuario sigue fuera de alcance.

### 4. Acción y recordatorio

Reutilizar `#save-project` y su único manejador de descarga con el nombre visible «Llevar o entregar». La ayuda aclara «Descarga un archivo .ggproj para abrirlo en otra computadora». No hay transferencia a docentes ni backend.

El recordatorio dentro de Studio aparece si falta una solicitud del contenido actual. Permite descargar o seguir trabajando y no abre modales en cada edición. Las operaciones internas que reemplazan proyecto conservan la protección existente de `replacePrepared`; si guardar/proteger falla, no se reemplaza el trabajo.

Registrar beforeunload solo mientras haya cambios locales sin confirmar, retirándolo al confirmar. Su diálogo es nativo y complementario, sin botones personalizados ni descarga dentro del evento. No usarlo para garantizar una advertencia por falta de copia portable: ese aviso permanece dentro de la aplicación. Los intentos actuales al ocultar/salir siguen siendo complementarios.

Alternativa descartada: impedir salir siempre que falte una descarga; molestaría aun con autosave confirmado y seguiría sin resolver los cierres abruptos.

### 5. Coordinación y pruebas

Esta revisión modifica solamente proposal/design/spec/tasks de este cambio. `code-studio-worker` conserva synced-code-views y su evidencia. La futura implementación toca superficies de autoría/UI compartidas: obtener turno de escritura y ventana de pruebas siguiendo la tabla del [plan de recorrido](../2026-10-25-scene2d-journey-stabilization/design.md), no comenzar por inferencia de que los artefactos están completos.

| Caso | Comprobación | Nivel / relación |
|---|---|---|
| PC-01 | Cambiar después de guardar/descargar; guardar A mientras se edita B; horas/revisiones sin cambio de contenido | Derivador Node + E2E; SJ-11/12 |
| PC-02 | Denegación/cuota: fallo local visible junto a copia solicitada; reintento real | IndexedDB/navegador; SJ-06 |
| PC-03 | Empaquetado lento, edición posterior y fallo de preparación; bytes/huella coherentes | Archivo real/navegador; SJ-04 |
| PC-04 | Cambio A→B, reapertura de A, perfil limpio y respaldo con contenido diferente | Navegador; SJ-03/04/07 |
| PC-05 | Reemplazo protegido, cierre después del commit y cierre con transacción pendiente; sin garantía falsa de beforeunload | Navegador con fallos controlados; SJ-05/11 |
| PC-06 | Registro ausente/corrupto/error al persistir; current/previous intactos, sin nueva revisión; lector antiguo tolera claves | Almacenamiento y E2E |
| PC-07 | Teclado, foco, zoom real 200/400%, ancho reducido y preparación offline válida | Suites accesibilidad/offline; SJ-09/10/12 |

Reutilizar project-persistence y studio-entry-journey para los efectos reales; Node solo acredita derivación/validación, no durabilidad ni diálogo nativo. Para cierre pendiente, retener o abortar la transacción: verificar la revisión durable anterior sin ejecutar un flush de prueba. Para el diálogo, documentar las condiciones reales de Chromium y comprobar retirada del listener; no exigir que aparezca universalmente.

Cada grupo implementa y prueba su parte. Registrar los casos PC en el acta propia propuesta `docs/engineering/PROJECT-CONTINUITY-RESULTS.md`, con enlaces a la misma puerta conjunta de estabilización cuando corresponda. No ejecutar full concurrentes ni modificar fuentes/documentos durante uno. Solo cambios documentales requieren validación estricta, que es la única comprobación prevista en esta sesión.

## Risks / Trade-offs

- [Metadato sin persistir] → estado desconocido explicado al volver, nunca impedir exportar.
- [Huella de una captura antigua] → tokens y comprobación de contenido; no confiar en timestamp o revisión.
- [Hash sobre recursos tiene coste] → calcular por captura/cambio de autoría, cachear por generación y no bloquear Run/Stop; medir en el corte sin prometer rendimiento escolar.
- [Aviso nativo no aparece] → aviso dentro de Studio y garantía limitada al commit confirmado, conforme a MDN y GGPROJ.
- [Superficies compartidas con sincronización] → escritor único y revisión de compatibilidad antes de integrar; no añadir serialización propia de vistas.
- [Texto demasiado técnico] → usar mensajes de la tabla, accesibilidad automatizada y guion humano separado; no afirmar comprensión infantil por pasar tests.

## Migration Plan

Sin migración de archivos GGPROJ ni de snapshots. Registros locales antiguos sin clave de continuidad muestran «sin registro». Añadir claves opcionales de esquema 1; conservar current/previous. Revertir la presentación/lectura de continuidad deja la autoría recuperable por el código anterior. La limpieza de metadatos solo acompaña una acción explícita de borrado local, nunca una apertura fallida.

Primero derivación y almacenamiento; después captura/descarga y UI; finalmente accesibilidad/offline e integración con el recorrido. No implementar hasta un nuevo encargo. No se hace commit, archivo ni push al preparar este plan.

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
