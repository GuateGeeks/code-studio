# Proposal

## Why

El contexto 2D tiene un único sprite `hero`, fijado en el formato (`projectInitialScene.spriteId`), en `gg.sprites@0.1.0` (`initialScene` constante), en el adaptador Scratch (target `hero`), en la API textual y en unos 30 archivos más. No se puede construir el proyecto típico de Scratch, con dos personajes que interactúan, ni los proyectos canónicos 2D del [plan de maduración](../../../docs/product/FEATURE-MATURATION-PLAN.md) («Atrapa la fruta», «Laberinto», «Diálogo»). Es la brecha estructural más grande frente a Scratch (H1).

El usuario aprobó el 24/10/2026 incluirlo en la Ola 1 (decisión D5). El público confirmado es primaria alta, de 10 a 12 años (D1).

## What Changes

- **`gg.sprites@0.2.0`**: escenario con fondos y una lista de hasta 8 sprites `{id, name, x, y, direction, size, visible, costume}`. Migración registrada desde 0.1.0 que convierte `initialScene` en el primer sprite `hero`, sin cambiar IDs ni comportamiento (usa `pack-versioning-and-migrations`).
- **Scripts por objeto**: cada sprite y el escenario tienen su workspace Blockly. La IR 2D lleva `targetId` por script y el adaptador crea un target VM por sprite.
- **Panel de objetos** bajo el resultado, al estilo Scratch: añadir, renombrar, duplicar y borrar sprites; seleccionar el objeto cuyos scripts se editan («Editando: Cesta»). Seleccionar no ejecuta.
- **Recursos por propietario**: los disfraces y sonidos ya llevan `ownerId`; la interfaz y los menús de bloques filtran por el objeto seleccionado.
- **API v3 por objeto**: `hero.move(10)` pasa a ser `<nombre>.move(10)`, con un identificador válido por sprite.
- Inspector, código derivado, actividades y copia Scratch pasan a funcionar por objeto.

## Capabilities

### New Capabilities

- `scene2d-objects`: varios sprites y escenario en el contexto 2D, con scripts, recursos y estado inicial propios por objeto.

### Modified Capabilities

Ninguna en este borrador. Al implementarse, la IR y el adaptador pasan de un target fijo a varios targets, y se añadirán deltas `MODIFIED` a `block-program`, `scratch-adapter` y `project-persistence` (consolidadas en `openspec/specs/`).

## Impact

`src/packs/gg.sprites/*`, `src/project-format.mjs`, `src/project-authoring.mjs`, `src/editor/*` (un workspace por objeto), `src/contracts/program-contract.mjs`, `src/adapters/scratch/*`, `src/generated-program-source.mjs` y `src/targets/text/api-v3*` (nombres por objeto), `src/studio/*` (panel de objetos; un único escritor), `src/scene-inspection.mjs` y las actividades (checks por objeto). Afecta a casi todas las suites 2D, a la copia Scratch y a la persistencia.

**Depende de:** `pack-versioning-and-migrations` (aplicado) y `block-language-contract` (API v3).

Fuera de alcance: vocabulario nuevo (`scene2d-vocabulary-*`), editor de pintura y biblioteca de recursos (cambios propios), más de 8 sprites, capas avanzadas y cámara.
