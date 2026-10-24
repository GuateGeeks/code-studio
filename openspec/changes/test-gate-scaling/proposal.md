# Proposal

## Why

La última puerta completa tardó unos 49 minutos (24/10, 06:54–07:43 UTC): 400 pruebas Node, 63 de herramientas, 3 smoke y 177 E2E. Los E2E corren en serie: `workers: 1`, `fullyParallel: false` y un único conjunto de servidores en 4173–4182. El [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) prevé unos 30 cambios que añadirán vocabulario, contextos y proyectos canónicos, cada uno con sus E2E. A este ritmo, la puerta crecerá más allá de una hora.

Además, `test:affected` clasifica como «frontera compartida» y amplía a la puerta completa los módulos nuevos que no conoce, como los contratos de operaciones o los futuros módulos de compatibilidad y tabla de lenguaje.

## What Changes

- **Ejecución E2E en particiones paralelas**, cada una con su propio conjunto de servidores y puertos (las variables `GG_*_PORT` ya existen), su directorio de artefactos y su perfil de navegador. Los reportes se fusionan en un único resultado.
- **La referencia de impacto avanza solo si todas las particiones aprueban** con fuentes estables, como hoy.
- **Mapa de impacto ampliado** con grupos por contexto (2D, texto, micro:bit, Scratch, 3D, web) y para los módulos de los cambios propuestos (compatibilidad de proyectos, tabla de lenguaje, vistas de código). Así un cambio acotado no dispara la puerta completa.
- **Base para proyectos canónicos**: carpeta de fixtures y un ejecutor común que abre el proyecto, ejecuta, comprueba el estado final y detiene. Las olas siguientes añadirán los proyectos.
- **Objetivo**: puerta completa por debajo de 30 minutos en la misma máquina o, si no se alcanza, la medición que lo explique.

## Capabilities

### New Capabilities

- `test-gate-scaling`: ejecución paralela y aislada de la puerta de navegador, selección de impacto por contexto y fixtures de proyectos canónicos. Complementa la capacidad `test-workflow` de `incremental-test-workflow`, que pasará a modificada cuando se consolide en `openspec/specs/`.

### Modified Capabilities

Ninguna consolidada todavía.

## Impact

`tools/test/run.mjs`, `tools/test/impact.mjs`, `playwright.config.mjs` (o una configuración por partición), `tools/f0/serve-browser.mjs` (solo parámetros de entorno ya admitidos) y `tests/tools/*`. Añade `tests/fixtures/canonical/` y un ejecutor de pruebas. No cambia código de producto, contratos ni lo que verifica cada prueba.

Fuera de alcance: CI remota, otros navegadores, cambiar las aserciones de las pruebas existentes y reducir cobertura para ganar tiempo.
