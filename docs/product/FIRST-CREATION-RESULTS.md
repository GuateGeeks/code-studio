# Primer recorrido de creación

Cambio: `studio-guided-first-creation`. Público confirmado: principiantes con acompañamiento docente. Fecha: 22/10/2026, Guatemala.

Estado: implementado y verificado. La puerta completa aprobó y actualizó su referencia de impacto únicamente después de comprobar que las fuentes no cambiaron durante la corrida. La [evidencia de este corte](first-creation-evidence.json) conserva resultados y límites.

## Comportamiento implementado

- Entrada con primera escena 2D, exploración de actividad y apertura de GGPROJ; Continuar aparece después de recuperar o abrir una creación. La búsqueda de recuperación mantiene sus acciones deshabilitadas hasta disponer del estado real.
- Primera creación basada en el starter local de historia. La protección y la carga siguen en el controlador de proyecto; un fallo de almacenamiento impide reemplazar el trabajo. Crear, abrir y recuperar no ejecutan automáticamente.
- Guía breve para cambiar pasos, anticipar el resultado con el docente y contrastarlo. Los checks y la guía no se presentan como evidencia de aprendizaje humano.
- Editor y escenario preceden al inspector, los diagnósticos y las herramientas complementarias. Los editores 3D/web tienen un punto de inserción explícito dentro de autoría. Se conservan IDs, instancias y controladores.
- Corpus y controles GG bajo Herramientas avanzadas, con Ejecutar ejemplo diferenciado de Ejecutar bloques. Enlaces de vuelta al programa y a Detener con foco accesible.
- Guardado real, recuperación desde respaldo, errores y descarga portable visibles. Fuente derivada readonly y copias JavaScript/Python independientes.
- Contexto y criterios visuales documentados en PRODUCT.md y DESIGN.md; guía docente y contexto operativo OpenSpec actualizados.

## Verificación

Los reportes locales bajo `artifacts/` conservan perfiles separados. No se suman sus conteos como una sola suite.

| Puerta | Resultado disponible |
|---|---|
| Quick | 390 Node, 63 herramientas y 3 smoke aprobados en `e1-quick-2.log` |
| Nuevo recorrido | 8 E2E aprobados en `e1-entry-results.json` |
| Zoom real | 2 E2E aprobados: 200/400 %, escritorio y ventana estrecha, en `e1-zoom-2-results.json` |
| Regresión focal y visita offline | 50 E2E aprobados, sin omisiones ni reintentos, en `e1-regression-2-results.json` |
| Puerta completa | 390 Node, 63 herramientas y 136 E2E: 3 smoke + 133 regresiones. Sin fallos, omisiones ni reintentos |

La puerta completa se ejecutó el 22/10/2026 entre 15:34:19 y 16:02:59 de Guatemala. Aprobaron los 14 cambios OpenSpec con validación estricta y la preservación de commit, diff previo y lock de los tres repositorios upstream. Los 140 archivos de `src/` coinciden por SHA-256 con la referencia de esa puerta. Los resultados históricos F0–F7 no se regeneraron ni recibieron estos conteos.

La selección de impacto de HTML/CSS incluye ahora el recorrido y las tres suites de accesibilidad. Una prueba conductual comprueba esa selección y mantiene full para las fronteras compartidas. La puerta final se ejecuta con fuentes estables; full cubre también la selección conservadora del conjunto de cambios.

La visita offline recuperó el proyecto desde otro proceso de Chromium con los seis servidores detenidos, usó Continuar y conservó edición y ejecución con recursos preparados. Las pruebas de persistencia aprobaron almacenamiento no disponible, cuota, copia dañada y recuperación desde respaldo. Las comprobaciones focales de teclado, 3D/web y copias textuales también aprobaron.

## Preparación y revisión

La copia previa conserva 511 archivos en `artifacts/e1-baseline/source.tar.gz`, con SHA-256 por archivo y restauración de tres muestras en un directorio temporal. El inventario de cambios compara el árbol actual con esa base; no se depende de un diff Git vacío, pues el producto estaba sin seguimiento. No se modificaron checkouts upstream.

CodeGraph se consultó para proyecto, actividades y shell, y se sincronizó tras los cambios de código. Sus consultas y el registro de sincronización viven en `artifacts/e1-codegraph-*`.

El detector visual identificó dos observaciones: el padding de la ayuda de teclado se amplió; la imagen de recursos sin src es una previsualización oculta hasta seleccionar un recurso, no una imagen visible rota. Los escenarios de recursos y las capturas verifican su comportamiento real. No se añadieron hooks ni dependencias visuales.

El primer smoke falló porque aún buscaba directamente los controles GG que se movieron al panel cerrado. Se adaptó únicamente su acceso mediante el summary nativo. El zoom detectó que el selector podía quedar fuera de vista al cambiar contexto en automatización: la prueba ahora lo lleva a la vista y verifica ese acceso antes de actuar. Se conservan las comprobaciones de zoom nativo, interacción, foco, caret y desbordamiento; no se añadieron clics forzados ni reintentos.

Las reproducciones instrumentadas de diagnóstico se mantienen aparte de las puertas aprobadas. Una reproducción incluyó una lectura de bounding box sobre un botón ya oculto en la segunda iteración y terminó por timeout; no acredita un defecto pendiente ni se contabiliza como prueba aprobada.

## Reproducción

En Ubuntu/WSL, desde la raíz del producto, cargar `source ../scripts/env.sh`. Durante edición usar `npm run test:quick` y la selección explicada por `npm run test:affected -- --files <rutas> --list`. Los cambios de este corte seleccionaron full por sus fronteras compartidas: la única puerta completa final cubre también ese alcance, sin repetir dos suites completas equivalentes.

Para la consolidación se usó `npm run test:full`; los reportes canónicos son `artifacts/test-runs/full-results.json`, `full-integration.tap`, `full-tools.tap`, `full-smoke-browser.json` y `artifacts/browser-results.json`. La salida completa está en `artifacts/e1-full.log`. Las consultas CodeGraph, inventario de cambios y reportes focales permanecen separados bajo `artifacts/e1-*`.

PRODUCT.md, DESIGN.md y la guía docente describen los controles implementados. El cierre documental posterior no cambia las fuentes del runtime; la validación estricta de OpenSpec se comprueba de nuevo tras cerrar las tareas.

## Límites

La evidencia usa Chromium Linux/WSL, viewports de laboratorio y zoom nativo mediante la extensión de prueba existente. La prueba offline exige cierre de procesos y servidores detenidos. Ninguno de esos resultados acredita un piloto con docentes/estudiantes, un lector humano, equipos escolares concretos ni micro:bit/USB físicos.

Se preservan formatos, runtimes, versiones, seis orígenes y uso sin cuenta. No se integra Sócrates ni se cambia el esquema de las actividades en este corte.
