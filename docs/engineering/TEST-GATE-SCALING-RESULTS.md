# Resultados: escalado de la puerta de pruebas

24 de octubre de 2026, Guatemala. Cambio OpenSpec `test-gate-scaling` (Ola 0 del [plan de maduración](../product/FEATURE-MATURATION-PLAN.md)). Cambia herramientas y pruebas; no cambia código de producto.

## Qué cambió

- **Particiones paralelas** (`tools/test/partitions.mjs`, `run.mjs --partitions N|auto`).
  - Partición 0: puertos por defecto y las 14 suites que fijan orígenes o levantan servidores.
  - Particiones *i* ≥ 1: puertos 4400 + 100·*i*, con release, resultados, informe y evidencia propios.
  - Reparto por duración histórica.
  - La referencia de impacto avanza solo si todas las particiones aprueban con fuentes estables.
  - Sin la opción, la puerta sigue en serie.
- **Política `--partitions auto`:** 2 particiones si hay al menos 6 GB de `MemAvailable` y la carga es menor que 8; en otro caso, serie.
- **Cobertura garantizada:** una puerta particionada incluye todos los archivos `tests/browser/*.spec.mjs` del disco. `test:tools` exige que todos estén inventariados en `normalBrowserFiles`.
  - La primera corrida particionada descubrió que `workspace-presentation.spec.mjs` (12 pruebas del rework) no estaba inventariado: `test:affected` nunca lo seleccionaba. Está corregido.
- **Impacto por contexto:** grupos `project-compatibility`, `scene3d`, `webapp`, `capability`, `microbit`, `scratch-import` y `canonical`.
- **Lecturas durante una ejecución:** helper `settled()` en las 84 llamadas `expect.poll(snapshot)` de 20 suites. Reintenta solo «Session stopped»; las aserciones no cambian.
- **Proyectos canónicos:** formato `tests/fixtures/canonical/`, ejecutor `canonical-projects.spec.mjs` y primer fixture 2D (repetir y mover).
- **Puertos portables:** `sb3-resources` dejó de fijar el puerto 4174 en su script inicial.
- **Pruebas sensibles al tiempo endurecidas**, con autorización del usuario:
  - `GG-SB3-005` pasa de un test de 240 s a 22 tests (corpus, uno por fixture con 90 s y la comprobación final de 3 bloqueados), con las mismas aserciones.
  - Las esperas de cohorte de `GG-OFFLINE` suben de 120 a 240 s.
- **Documentación:** `docs/engineering/TESTING.md`, sección «Particiones paralelas».

## Medición (tarea 1.1)

| Corrida | Particiones | E2E | Duración total | Memoria disponible mínima | Carga máxima | Resultado |
|---|---|---|---|---|---|---|
| Puerta en serie de referencia (pack-versioning, aprobada) | 1 | 177 | 41 min | — | — | Aprobada |
| 17:39Z | 3 | 167 de 179 (faltaba `workspace-presentation`) | 29 min | 0,7 GB | 36 | 4 fallos por tiempo |
| 20:04Z | 1 | 179 | 52 min | — | 18 | 178/179 (`GG-OFFLINE`) |
| 21:05Z | 2 | 179 (= serie) | 33 min | 7,0 GB | 20 | 178/179 (`GG-SB3-005`) |
| 22:15Z | 2 | 200 | 32 min | — | 20 | 199/200 (`GG-ASSET-003`, espera de 15 s con otra sesión al 480 % de CPU) |
| 22:56Z | 2 | 200 | 28 min | — | 12,8 | **Aprobada** (otras sesiones en pausa) |

La máquina se comparte con otras sesiones de Claude, que hoy ejecutaron grabaciones con Chromium, `tsc` y Vite. Las pruebas con presupuesto de tiempo ajustado fallaban en las corridas cargadas y aprobaban solas; por eso se endurecieron. Con 3 particiones la memoria cae por debajo de 1 GB, de ahí la política `auto` de 2.

## Verificación (tarea 4.1)

- **Misma cobertura:** la puerta en serie y la de 2 particiones ejecutaron las mismas 179 pruebas (p0 85 + p1 94). Con la división de `GG-SB3-005` el total pasa a 200.
- Herramientas: 73/73, incluidas 9 pruebas nuevas de particiones, impacto por contexto, inventario y la salvaguarda de imports del worker Python.

## Puerta final

**aprobada** el 24/10/2026, 22:56:57Z–23:24:58Z (`node tools/test/run.mjs full --partitions 2`, `artifacts/test-gate/full-p2-3.log`): 415 Node, 73 herramientas, 3 smoke y **200 E2E** (p0 85 en 21,3 min + p1 115 en 24,1 min), OpenSpec estricto 35/35 y tres upstreams preservados. Fuentes estables; la referencia de impacto avanzó. Antes, tres corridas completas cayeron cada una en una sola prueba distinta por tiempo agotado bajo carga externa: `GG-OFFLINE`, `GG-SB3-005` y `GG-ASSET-003`. La última aprobó con otras sesiones de Claude en pausa.

## Límites

- `auto` usa un umbral fijo medido en esta máquina; otras máquinas pueden necesitar otro.
- No se ejecutó `playwright test --list` con el reporter JSON después de una puerta, porque sobrescribe el informe canónico de duraciones (documentado en `TESTING.md`).
