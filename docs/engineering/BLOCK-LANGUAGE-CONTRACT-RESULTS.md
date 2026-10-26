# Resultados: cierre de block-language-contract

25 de octubre de 2026, Guatemala. Verificación del cambio OpenSpec `block-language-contract` sobre `e24b391`, con los cambios previos sin commit. Continúa las actas de [fase 1](API3-2D-RESULTS.md) y [fase 2](API3-CAPABILITY-AND-TABLES-RESULTS.md), según [ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md).

La puerta completa **aprobó** el 25/10/2026, 15:18:38–15:48:25 de Guatemala (21:18:38.724Z–21:48:25.022Z), en dos particiones. Las tareas 4.3 y 4.4 quedan verificadas. La 3.2 sigue sin marcar y trasladada a `scene2d-vocabulary-v2` 1.1. El archivo y el commit local fueron autorizados después de esta verificación, aceptando expresamente el traslado de 3.2; véase el cierre de archivo al final de esta acta.

## Qué se verificó

- **Inventario 1.3:** consumidores de generadores 2D, 3D/web, micro:bit, adaptador Scratch y motores textuales, con consultas conservadas en [CodeGraph](../../artifacts/block-language-contract/codegraph/). Los traductores siguen en el origen del lenguaje; el inventario distingue el puente interno, panel técnico y documentos nuevos API1.
- **Disponibilidad:** `languageAvailability` y `tablesForLocks`, su conexión a lectura/copia en `code-console-ui.mjs` y los escenarios «Pack sin formas textuales» y «Estructuras del núcleo y otras bajadas». LANG-006 comprueba ambos lenguajes, pack/causa, estructuras del núcleo y exclusión de la bajada micro:bit.
- **LCOPY-001:** copias 2D JavaScript/Python con `runtime.api: 'api3'`, sin `GG.`, `ctx`, `await` ni `gg_`; ambas alcanzan `x = 12`. GGPROJ v4 conserva fuente y runtime de ambas al reabrir; abrir deja `x = 0` y la copia seleccionada vuelve a ejecutar hasta 12.
- **LCOPY-002:** copia 3D generada con API2 y sin `runtime.api`; conserva texto y ausencia de API declarada al guardar/reabrir, y la esfera alcanza `x = 1` antes y después.
- **Impacto:** la spec figura en el inventario completo y en los grupos `code-console`, `language-runtime` y `scene3d`. El [plan affected](../../artifacts/block-language-contract/verification-20261025/affected-plan.json) selecciona `full`.
- **Documentación:** secciones «Tabla de lenguaje» y «API textual del alumno» del SDK; sustitución parcial en ADR-004/005/007/009; tarea 3.3 de `synced-code-views` para documento en blanco y ayuda API1.

## Pruebas y evidencia

Todo se ejecutó en Ubuntu/WSL con bash y `source ../scripts/env.sh`. Se conservaron puertos y timeouts. Antes de cada E2E se consultó `/proc/loadavg`; la carga de cinco minutos al iniciar las puertas fue 1,64 y 4,06, ambas menores de 6.

| Verificación | Resultado |
|---|---|
| OpenSpec inicial, estricto | 35/35 |
| Tabla de lenguaje, LANG-001…006 | 6/6 Node |
| Herramientas focales | 74/74 |
| Build navegador | Aprobado |
| Copias + consola, foco inicial | 8/8 E2E |
| Copias + presentación, tras corregir la espera | 14/14 E2E |
| Affected `--list` | Selección completa |
| Puerta final: Node / herramientas | 424/424 / 74/74 |
| Puerta final: smoke | 3/3 |
| Puerta final: regresión | 202/202 E2E: p0 89, p1 113 |
| Puerta final: OpenSpec estricto | 35/35 |
| Preservación upstream | 3/3: commit, diff y lock intactos |

El total de navegador de la puerta es **205 pruebas: 3 smoke + 202 regresiones**; los focos no se suman a ese total. No hubo omitidos, reintentos ni casos flaky en los JSON de navegador de la puerta final.

El [JSON canónico](../../artifacts/test-runs/full-results.json) confirma `exitCode: 0`, `baselineWritten: true` y ausencia de `changedDuringRun`. Se conserva una [copia de ese JSON](../../artifacts/block-language-contract/verification-20261025/full-attempt-2/artifacts/test-runs/full-results.json), junto con plan, TAP, informes por partición, referencia de impacto, build y comprobación upstream. El [log aprobado](../../artifacts/block-language-contract/verification-20261025/full-attempt-2.log) conserva toda la corrida. Las modificaciones posteriores de cierre son documentales y se validan de nuevo con OpenSpec.

## Diff externo y fallos

El archivo `language-copies.spec.mjs` estaba **sin seguimiento**: `git diff -- tests/browser/language-copies.spec.mjs` no mostraba contenido y no existe una versión Git con la que atribuir cambios a la otra sesión. Se guardó su [contenido recibido](../../artifacts/block-language-contract/verification-20261025/language-copies.initial.mjs). Conservaba las aserciones de API, ausencia del puente, valores finales y reapertura descritas en el encargo.

Sí tenía una debilidad: ambos helpers absorbían **cualquier** error de snapshot y devolvían null. La [reproducción aislada](../../artifacts/block-language-contract/verification-20261025/snapshot-error-repro.log) confirmó que también ocultaban un error de protocolo inesperado. Se sustituyeron por `settled`, que solo reintenta «Session stopped» y propaga los demás errores.

El [primer intento completo de esta verificación](../../artifacts/block-language-contract/verification-20261025/full-attempt-1/artifacts/test-runs/full-results.json) **no aprobó**: 424 Node, 74 herramientas, 3 smoke y 200/202 E2E; `exitCode: 1`, `baselineWritten: false`. Se conservan [log](../../artifacts/block-language-contract/verification-20261025/full-attempt-1.log), JSON, trazas y capturas de ambos fallos:

1. **LCOPY-001, fragilidad de la spec nueva:** al hacer estricta la lectura apareció `GG scene loading` después de pulsar Ejecutar documento. La prueba consultaba la escena antes de completar su reemplazo. Se añadió la espera de «Documento activo · eventos disponibles» antes del snapshot. Se mantienen todas las aserciones, incluida `x = 12`, sin cambios en producto ni en el helper compartido.
2. **Presentación E4-02, arranque intermitente:** `#run-editor` no llegó a habilitarse en la espera existente de 15 s. Ocurrió bajo carga compartida elevada; no se reprodujo al repetir su spec completa y volvió a aprobar en la puerta final, sin modificar esa suite ni sus timeouts. La evidencia apunta a entorno/carga; no demuestra una regresión de este cambio.

Las dos specs repitieron **14/14** y después se ejecutó una puerta completa nueva. El [diff de revisión](../../artifacts/block-language-contract/verification-20261025/language-copies-review.diff) registra únicamente el helper estricto y la espera de preparación; no se debilitó ninguna aserción. El intento previo de fase 2 (`audioStop`, 199/200) permanece fallido en su acta y log originales; se copió su estado canónico previo a [previous-full](../../artifacts/block-language-contract/verification-20261025/previous-full/). No se borró evidencia histórica.

## Archivos y límites

En esta verificación se modificaron `tests/browser/language-copies.spec.mjs`, `openspec/changes/block-language-contract/tasks.md`, la primera sección de `docs/engineering/NEXT-SESSION.md` y esta acta. Los trece archivos ya modificados al recibir el encargo se conservaron; se comprobó su diff contra la captura inicial antes de la puerta final. No se encontraron cambios ajenos a la lista del encargo.

- No existe hoy un pack publicado sin formas textuales. La indisponibilidad se comprueba con tabla sintética en LANG-006; **no hay E2E de un pack real sin formas**.
- Documento en blanco y `#text-api-help` siguen en API1: decisión pendiente en `synced-code-views` 3.3. Las vistas sincronizadas todavía no están implementadas.
- micro:bit conserva el contador `gg_device_i_N` y el texto Static TypeScript anterior.
- La bajada 2D a opcodes VM de 3.2 corresponde a `scene2d-vocabulary-v2` 1.1; aquí sigue la IR0 existente. Se deja explícitamente pendiente, sin marcarla como implementada.
- La puerta valida tres upstreams; tampoco se modificó la fuente de PXT Core. No se tocaron otros proyectos, previews, dependencias, motores ni formatos.

## Cierre de archivo

El usuario autorizó archivar y hacer commit el 25/10/2026, aceptando expresamente el traslado de 3.2. El cambio se archivó en [2026-10-25-block-language-contract](../../openspec/changes/archive/2026-10-25-block-language-contract/), esquema `spec-driven`, conservando `.openspec.yaml`, los cuatro artefactos y la tarea 3.2 sin marcar (13/14 tareas completadas; la restante fue trasladada, no implementada).

Se consolidaron los siete requisitos y nueve escenarios en [block-language](../../openspec/specs/block-language/spec.md), con el propósito y los requisitos del delta conservados literalmente. La tarea [scene2d-vocabulary-v2 1.1](../../openspec/changes/scene2d-vocabulary-v2/tasks.md) recoge el traslado. Estos cambios de archivo son documentales; se valida OpenSpec sin repetir la puerta de ejecución ya aprobada. El cierre se incluye en el commit local autorizado, sin push.
