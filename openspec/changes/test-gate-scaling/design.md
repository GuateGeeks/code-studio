# Design

## Context

- **Configuración actual:** `playwright.config.mjs` usa `workers: 1`, `fullyParallel: false`, `baseURL` 4173 y un `webServer` (`serve-browser.mjs`) que crea un snapshot de release en cada arranque (~9 s; `timeout` 60 s autorizado por el usuario).
- **Puertos:** `browser-policy.mjs` ya lee `GG_SHELL_PORT`, `GG_RUNNER_PORT`, `GG_SIMULATOR_PORT`, `GG_LANGUAGE_PORT`, `GG_SCENE3D_PORT` y `GG_WEBAPP_PORT`. La vista de desarrollo usa 5183–5192 y la release 5083–5092.
- **Runner de pruebas:** `tools/test/run.mjs` compone quick/affected/full y avanza la referencia solo con fuentes estables. `impact.mjs` clasifica rutas y envía a la puerta completa lo desconocido.
- **Volumen:** 38 archivos de navegador y 177 E2E.

## Goals / Non-Goals

**Goals:** particiones aisladas, misma cobertura, impacto por contexto, base de proyectos canónicos, tiempo medido.

**Non-Goals:** CI remota, otros navegadores, quitar o relajar pruebas.

## Decisions

1. **Particiones con `--shard` de Playwright, cada una en su proceso** con su propio `webServer` y puertos derivados de un índice: partición *i* usa `4273 + 100·i` para la shell y los desplazamientos actuales para los demás roles. Se descartan los workers de Playwright dentro de un mismo proceso, porque compartirían servidores y orígenes, y las pruebas de offline y aislamiento dependen de orígenes limpios.
2. **Número de particiones configurable** (por defecto 3) y limitado por la memoria medida. SwiftShader y Pyodide son pesados en WSL, así que la tarea 1 mide la memoria por partición antes de fijar el valor.
3. **Pruebas con estado global en una partición dedicada en serie.** Offline frío con servidores detenidos, exportaciones autónomas y `standalone-contexts`, que deja carpetas en `/tmp`, se agrupan en una partición en serie. Las demás se reparten por duración histórica (tomada de los JSON de reportes).
4. **Fusión de reportes** en `artifacts/test-runs/full-results.json` con el mismo esquema actual, más campos de partición y duración. La referencia de impacto se calcula con el snapshot anterior y posterior a toda la corrida.
5. **Impacto por contexto.** Nuevos grupos `scene2d`, `text`, `microbit`, `scratch`, `scene3d`, `webapp`, `project-compatibility`, `block-language` y `code-views`, con sus pruebas de navegador y una prueba de herramientas por grupo. Lo desconocido sigue yendo a la puerta completa.
6. **Fixtures canónicos** en `tests/fixtures/canonical/<contexto>/<proyecto>/` con `project.ggproj`, `expect.json` (estado final, trazas, tolerancias) y un ejecutor reutilizable en `tests/browser/canonical-projects.spec.mjs`. Este cambio incluye un fixture 2D mínimo; los proyectos de las olas siguientes se añaden a esa carpeta.

## Risks / Trade-offs

- [Pruebas que dependían del orden en serie] → ejecutar dos veces la puerta particionada con distinto orden antes de adoptarla; las dependencias que aparezcan se corrigen en la prueba, sin relajar su aserción.
- [Memoria insuficiente con varias particiones] → el número de particiones se fija por medición; la ejecución en serie sigue disponible.
- [Interferencia con vistas previas abiertas] → rango de puertos 4273+ distinto de 4173, 5083 y 5183, y comprobación de puertos libres antes de arrancar.

## Migration Plan

1. Medir la duración por archivo y la memoria por proceso con la puerta en serie actual.
2. Implementar particiones y fusión de reportes, conservando el modo en serie.
3. Ejecutar dos puertas particionadas y una en serie, y comparar la lista de pruebas.
4. Ampliar el mapa de impacto.
5. Añadir el ejecutor y el fixture canónico mínimo.

Reversión: volver al modo en serie, que sigue siendo una opción del runner.

## Open Questions

- ¿Número de particiones por defecto en la máquina del usuario? Lo decide la medición de la tarea 1.1.
