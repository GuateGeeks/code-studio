# Resultados de continuidad del proyecto

25 de octubre de 2026, Guatemala. Implementación conjunta con
[estabilización 2D](SCENE2D-JOURNEY-STABILIZATION-RESULTS.md), sobre `1235693` y el
diff recibido de synced-code-views. **Código y casos PC verificados; puerta completa conjunta aprobada.** Estado al terminar la implementación: sin commit, archivo ni push; archivo posterior autorizado, registrado al final.

## Implementación

`src/project-continuity.mjs` deriva dos dimensiones independientes: guardado
local y solicitud de copia portable. La huella SHA-256 usa una serialización
canónica de una captura validada completa: formato/versión, identidad y nombre,
autoría, contexto/capacidades, recursos y locks. Excluye únicamente revisión,
createdAt y updatedAt de project; conserva orden de arrays, IDs, conexiones,
posiciones, documentos y recursos. Nunca evalúa código ni envía la huella.

Una captura alimenta bytes, nombre y huella. El registro se crea después de activar
el enlace del navegador, con el mensaje **solicitada**, sin afirmar escritura en
disco ni envío académico. Tokens de proyecto/generación invalidan resultados
tardíos. La descarga no depende del autosave y no oculta su fallo.

Registro persistido opcional:
`{version:1, projectId:<UUID>, contentHash:<SHA-256 hexadecimal>, requestedAt:<ISO UTC>}`.
Clave `continuity:<projectId>`, store snapshots, base `gg-studio-projects`
**versión 1**, sin migración de snapshots. Lectura/escritura usa la cola del store
y no rota current/previous, cambia autoría ni incrementa revisiones. El registro
no se exporta a GGPROJ. El borrado local explícito retira también estas claves.

Con IndexedDB denegado o escritura fallida, un mapa de esta página conserva
registros por proyecto, incluso A→B→A, con aviso y reintento. Un dato ausente,
inválido o de otro proyecto no acredita una copia. El mapa se pierde al cerrar;
abrir en otro perfil no inventa registro. Recuperar previous compara su propio
contenido: una copia de current no acredita ese respaldo.

La cabecera muestra ambos mensajes con texto, sin depender de color y sin reloj
que repita anuncios. A 1280px se midió **48px** de alto; la ayuda detallada permanece
en Archivo. «Llevar o entregar» conserva un único manejador. Fallo local y fallo
del registro tienen reintentos separados. El recordatorio permite seguir
trabajando sin modal por edición. beforeunload se instala solo con cambios locales
pendientes y se retira al confirmar; es complementario, no una garantía de commit.

## Matriz PC y evidencia

| Caso | Prueba | Resultado en affected |
|---|---|---|
| PC-01 | Node de huella/estado; PC-01/06; commit A/edit B | sin falso guardado; revisión/fecha no vuelven anterior una copia igual |
| PC-02 | PC-02/06 | error local visible junto a copia real, fallos de metadato y ambos reintentos UI |
| PC-03 | SJ-04 y PC-03 | bytes/nombre/hash de captura única, edición posterior y empaquetado fallido |
| PC-04 | SJ-01/02/03, SJ-04, PC-04/06 y PC-MEMORY | perfil limpio, A→B→A y respaldo con contenido distinto |
| PC-05 | entrada/protección, PC-05/SJ-11 y PC-BLOCKED | cierre abortado, listener retirado tras commit, corrupción conservada con borrador editable |
| PC-06 | PC-01/06, PC-04/06, clear, Node | registro inválido/ausente/fallido, DB v1, lector previo y borrado explícito |
| PC-07 | accessibility-shell/zoom y offline-recovery | teclado, foco, ventana estrecha, zoom nativo 200/400% y nueva visita sin servidores |

Evidencia conjunta en
[implementation-20261025](../../artifacts/scene2d-journey-stabilization/implementation-20261025/).

| Verificación | Resultado |
|---|---|
| Node focal estado/store/controlador | 10/10 |
| Quick final quick-2 | 435 Node, 74 herramientas, build y 3/3 smoke |
| Affected de cinco suites | 435 Node, 74 herramientas y 37/37 E2E |
| OpenSpec de affected | 36/36 |
| Puerta completa conjunta | 435 Node, 74 herramientas, 3 smoke + 214 regresiones; specs 36/36, upstreams 3/3 |

Quick y affected tienen `exitCode: 0`, `baselineWritten: false`; no se suman
sus pruebas como full. La carpeta conserva planes, TAP, reportes, capturas y trazas.
La puerta completa incluyó los dos cambios y el estado previo de synced-code-views,
en serie y con fuentes/documentos congelados.

## Compatibilidad del lector anterior

Se ejecutó en Chromium
`tests/fixtures/legacy-autosave-store-1235693.mjs`, byte a byte igual a
`1235693:src/autosave-store.mjs`, SHA-256
`43b2d6fc366ecdae014c4edac426d76fae559e14f37e19fcb312317b641e76f3`.
Lee current con las claves continuity presentes y repite la escritura sin
cambios; se comparan snapshots y metadatos antes/después. Esto acredita el lector
de almacenamiento, no una ejecución completa de una release antigua.

La fuente se sirve solo por una ruta de prueba del mismo origen. Ese caso bloquea
service workers para no interceptar el fixture; el caso offline usa workers
reales y cierre frío. No se cambian CSP, servidor productivo ni formato de archivo.

## Fallos conservados

- Caracterización inicial 0/2: fixture Uint8Array en setInputFiles; Buffer.from
  corrigió el borde del test. Repetición del comportamiento recibido 2/2.
- PC-BLOCKED 0/1: changed retornaba por recoveryBlocked antes de invalidar hash
  y avisos. Se actualiza continuidad sin habilitar autosave ni alterar la corrupción.
- continuity-2, 7/8: importación del fixture previo 404 por el SW; se aisló solo
  su contexto. El lector real aprobó en la siguiente corrida y affected.
- PC-MEMORY, 8/9: copia de sesión de A olvidada al volver desde B con almacenamiento
  denegado. El mapa por proyecto y los tokens conservan la solicitud sin atribuirla a B.

Todos estos intentos permanecen fallidos en sus reportes. Las correcciones
aprobaron en el affected 37/37. La captura inicial de cabecera de 57px también
se conserva; el resumen de solicitud y la ayuda en Archivo restauran 48px,
comprobados por geometría y captura, sin cambiar tokens.

## Límites y entrega

La recuperación garantiza la última revisión confirmada; un cierre abrupto no
garantiza una edición pendiente. Solicitar copia no confirma escritura física.
No hay nube, envío escolar ni fusión de pestañas. Recursos y locks siguen
viajando con GGPROJ; logs y estado mutable de ejecución quedan fuera de autoría.

[Guía con capturas reales](../phase-7/TEACHER-GUIDE.md) y
[guion docente](../product/SCENE2D-CONTINUITY-TEACHER-OBSERVATION.md) preparados.
La observación de comprensión, lector humano, hardware y equipos escolares sigue
**pendiente**. Synced-code-views conserva 1.1 experimental aprobada, sin avanzar
su diff 1.2 ni UI. Sin commit, archivo ni push de este incremento.

## Puerta completa conjunta aprobada

La única puerta full de este corte aprobó el 25/10/2026 21:52:26–22:41:19 de Guatemala, con una partición.
**435/435 Node, 74/74 herramientas, build aprobado, 3/3 smoke y 214/214
regresiones E2E: 217 pruebas de navegador en total.** OpenSpec estricto **36/36**;
tres upstreams preservados (commit, diff versionado y lock): raspberrypi-blockly,
xcratch-scratch-editor y pxt-microbit. No hay omitidos, reintentos ni casos flaky
en los reportes de navegador; Node y herramientas tampoco tienen omitidos.

El [JSON full conservado](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/full-results.json) confirma
`exitCode: 0`, `baselineWritten: true` y ausencia de `changedDuringRun`.
El [reporte de regresión](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/browser-results.json), el
[smoke](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/full-smoke-browser.json), los TAP y
[log completo](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/full.log) corresponden a esa misma corrida.
La [preservación upstream](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/upstream-results.json) se extrajo de la salida
real del verificador; no se confunde con una copia histórica de baseline.

El [preflight](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/preflight.json) registró carga 1,36 / **4,25** / 3,42 y
los doce puertos libres; la media de cinco minutos fue menor de 6. Se congelaron
[44 archivos con SHA-256](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/source-hashes.json) y su
[comparación al terminar](../../artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/freeze-comparison.json) dio **0 cambios**.
La referencia previa se conserva en `../previous-full/`. La baseline se avanzó
solo tras completar toda la puerta; los cierres posteriores son documentales
y no exigen repetir suites aprobadas.

La aprobación acredita estos dos cortes y la regresión del checkout completo,
incluido el código previo de synced-code-views. No convierte su prototipo en una
interfaz de conversión ni completa sus tareas 1.2/UI. El guion docente sigue
preparado sin observación humana realizada. Estado al terminar la implementación: sin commit, archivo ni push; archivo posterior autorizado, registrado al final.

Tareas técnicas y documentales del cambio: **12/12 completas**, con estado OpenSpec `all_done`. Archivo posterior autorizado el 25/10/2026; observación humana pendiente. CodeGraph sincronizado al cierre.

## Archivo autorizado (25/10/2026, Guatemala)

Cambio archivado en [2026-10-25-project-continuity-model](../../openspec/changes/archive/2026-10-25-project-continuity-model/), con su delta consolidado en las especificaciones principales. Se prepara un índice selectivo para revisión y commit local por el coordinador, sin push. El trabajo experimental synced-code-views queda fuera del índice. Los conteos 435/74/217 corresponden al checkout conjunto congelado, no a una ejecución del commit separado. No se repiten suites por este archivo documental.

Se aclaró el contrato de registro conforme al diseño y PC-02/PC-MEMORY ya aprobados: ausencia o invalidez sin recuerdo válido implica estado desconocido; fallo de persistencia tras solicitud válida conserva memoria por proyecto, aviso de sesión y reintento, sin durabilidad. Sin cambios de implementación ni resultados nuevos.
