# Resultados de estabilización del recorrido 2D

25 de octubre de 2026, Guatemala. Implementación conjunta de
`scene2d-journey-stabilization` y `project-continuity-model`, sobre `1235693`.
**Recorrido y continuidad implementados y verificados; puerta completa conjunta aprobada.** Estado al terminar la implementación: sin commit, archivo ni push; archivo posterior autorizado, registrado al final.

## Qué se verificó

La primera creación se inicia desde Inicio. La semilla canónica repetir-mover
(3×5) se prepara como archivo válido y se abre por UI; editar el valor a siete
produce x21. Detener y reabrir deja x0. La primera escena del producto conserva
su historia actual: no se cambió para adaptar la semilla de prueba.

Recuperación local confirmada y archivo portable real en perfil limpio conservan
modelo completo: nombre, identidad de proyecto/bloques/variables, IDs y condición
shadow, conexiones, posiciones, documentos independientes, recursos y locks.
Solo se normalizan revisión/fechas de project al comparar capturas. El estado
mutable de ejecución se comprueba aparte y no se guarda como autoría.

La exportación recibida ya utilizaba una captura coherente. La caracterización
con empaquetado retardado pasó sin modificar el serializador. Continuidad añade
la referencia por contenido y aísla resultados tardíos por proyecto; su
[acta](PROJECT-CONTINUITY-RESULTS.md) documenta implementación y compatibilidad.

## Matriz SJ y evidencia actual

| Caso | Prueba del checkout actual | Resultado |
|---|---|---|
| SJ-01/02/03 | project-persistence: SJ-01/02/03 | x21, Stop/reapertura x0, autoría completa, cierre local y perfil limpio |
| SJ-04 | SJ-04/GG-PROJECT-011, PC-03 | captura única, edición posterior, A→B→A y fallo de empaquetado |
| SJ-05 | atomic-rejections, entry GG-ENTRY-002/005, rollback Node | archivo inválido, cancelación de selección y protección fallida conservan trabajo y sesión |
| SJ-06 | unavailable/quota, PC-02 | edición/Run/copia, fallo local simultáneo y ambos reintentos UI |
| SJ-07 | damaged current, PC-04/06 | respaldo válido; ambas corruptas conservadas; registro separado |
| SJ-08 | stop-reopen y SJ-08 ten cycles | diez ciclos audio/espera Run/Stop, autoría igual y referencias antiguas rechazadas |
| SJ-09 | offline-recovery ampliada | Chromium cerrado, seis servidores apagados, recuperación, edición, ejecución, Stop y copia por teclado |
| SJ-10 | accessibility-shell y accessibility-zoom | teclado/foco, ancho reducido, zoom nativo 200/400%, sin overflow global |
| SJ-11 | PC-01/SJ-11 y PC-05/SJ-11 | commit A no anuncia B guardado; cierre abortado recupera solo revisión confirmada |
| SJ-12 | PC-01…07, PC-BLOCKED, PC-MEMORY | estados y copias coherentes, incluso recuperación bloqueada y memoria A→B→A |

Todas las filas aprobaron en
[affected-1-browser.json](../../artifacts/scene2d-journey-stabilization/implementation-20261025/affected-1-affected-browser.json).
No se atribuye al perfil afectado una aprobación full.

## Pruebas y procedencia

WSL con bash, `source ../scripts/env.sh`, `unset -f node npm npx`.
Un único escritor (code-studio-worker); coordinación en solo lectura. Base, diff
recibido, consultas CodeGraph, consumidores y matriz inicial en
[la carpeta de evidencia](../../artifacts/scene2d-journey-stabilization/implementation-20261025/).

| Verificación | Resultado |
|---|---|
| Caracterización recibida, segundo intento | 2/2 E2E |
| Node focal de estado/controlador/almacenamiento | 10/10 |
| Persistencia, primera integración | 17/17 E2E |
| Quick final de código, quick-2 | 435 Node, 74 herramientas, build y 3/3 smoke; exitCode 0 |
| Affected de desarrollo, cinco suites explícitas | 435 Node, 74 herramientas, build y 37/37 E2E; exitCode 0 |
| OpenSpec de affected | 36/36 |
| Plan del checkout completo | Selección full, 37 suites |
| Puerta completa conjunta | 435 Node, 74 herramientas, 3 smoke + 214 regresiones; specs 36/36, upstreams 3/3 |

Los JSON y TAP de quick/affected se copiaron a la carpeta nueva, sin avanzar
baseline (`baselineWritten: false`). El affected seleccionó explícitamente
persistencia, entrada, teclado, zoom y offline; no se presenta como el plan de
todos los archivos. El plan conservador total exige full y cubre también los
cambios previos de synced-code-views.

Antes de la puerta completa se registraron la huella de fuentes y puertos en
`full-attempt-1/`. La coordinadora liberó 4177/4178 por autorización expresa,
deteniendo solo lego-local-demo y lego-programs-demo tras revisar identidad.
El emulador de 4500 quedó intacto; se usó una partición. No se modificaron
puertos globales, timeouts, reintentos ni presupuestos de aceptación.

## Intentos no aprobados y correcciones

| Evidencia | Resultado y causa | Resolución |
|---|---|---|
| characterization.json/log | 0/2; Uint8Array entregado a setInputFiles | Buffer.from solo en el borde de test; repetición 2/2 |
| blocked-repro.json/log | 0/1; al editar con recoveryBlocked la copia quedaba vigente | invalidar hash/avisos sin habilitar autosave ni tocar registros dañados |
| continuity-2.json/log | 7/8; fixture previo devolvía 404 porque SW resolvía antes de page.route | bloquear SW solo en ese contexto de compatibilidad; CSP/producto intactos |
| memory-repro.json/log | 8/9; se olvidaba la copia temporal de A al volver desde B sin IndexedDB | memoria por projectId y tokens; repetir PC-MEMORY |

Los dos defectos de continuidad fueron reproducidos durante esta implementación,
no se atribuyen a la exportación recibida. Las repeticiones finales pasaron en
37/37; cada fallo conserva JSON, log, trazas y capturas. El lector antiguo sí
se ejecutó después de corregir su fixture, no solo se comprobó el número de DB.

## Archivos y límites

Fuentes principales: `src/project-continuity.mjs`, `src/autosave-store.mjs`,
`src/studio/project-ui.mjs`, cabecera/estilos. Pruebas Node y browser existentes
ampliadas; fixture exacto del store de 1235693; etiquetas de descarga actualizadas
sin debilitar aserciones. Documentación vigente, guía con capturas brutas y
[guion docente](../product/SCENE2D-CONTINUITY-TEACHER-OBSERVATION.md) preparados.

No cambian GGPROJ, IR, motores, dependencias ni upstreams. No hay multi-sprite,
vocabulario nuevo ni conversión activada. Synced-code-views conserva su
1.1 experimental aprobada en el working tree, con 1.2 y UI pendientes.
La puerta anterior de block-language-contract no certifica este corte.

El cierre abrupto garantiza solo la última revisión confirmada. Una solicitud
de copia no confirma archivo en disco ni envío académico. Las pruebas de
teclado/zoom/offline son de software en Chromium/WSL; no son observación docente,
lector humano, equipos escolares, placa física ni rendimiento de aula.

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

Tareas técnicas y documentales del cambio: **15/15 completas**, con estado OpenSpec `all_done`. Archivo posterior autorizado el 25/10/2026; observación humana pendiente. CodeGraph sincronizado al cierre.

## Archivo autorizado (25/10/2026, Guatemala)

Cambio archivado en [2026-10-25-scene2d-journey-stabilization](../../openspec/changes/archive/2026-10-25-scene2d-journey-stabilization/), con su delta consolidado en las especificaciones principales. Se prepara un índice selectivo para revisión y commit local por el coordinador, sin push. El trabajo experimental synced-code-views queda fuera del índice. Los conteos 435/74/217 corresponden al checkout conjunto congelado, no a una ejecución del commit separado. No se repiten suites por este archivo documental.
