# Proposal

## Why

El contexto 2D solo trae un disfraz de demostración (`hero`, `hero-alt`), un fondo de cuadrícula y un tono. Para que una clase de 45 minutos con estudiantes de 10 a 12 años construya un juego o una historia (etapa E4 del [plan de estabilización 2D](../../../docs/product/STABILIZATION-PLAN-2D.md)), hacen falta dibujos y sonidos listos para usar que funcionen en el equipo escolar sin red. Hoy solo se pueden subir archivos propios, y la clase no siempre los tiene.

## What Changes

- **Biblioteca inicial propia**: 20 disfraces (personajes con pares para animar y objetos), 8 fondos y 10 sonidos. Son obra original del proyecto, generada de forma reproducible por una herramienta en `tools/` (SVG dibujado por código con la identidad de `DESIGN.md`; WAV PCM16 sintetizado de forma determinista). No se copia nada de Scratch, MakeCode ni Code.org.
- **Licencia y hashes**: el índice declara CC0-1.0, la atribución y el SHA-256 de cada medio; un archivo de bloqueo versionado fija los hashes y una prueba comprueba que la generación los reproduce. `THIRD_PARTY_NOTICES` y el SBOM de release mencionan la biblioteca.
- **Incluida en la preparación sin red**: el build publica un único paquete de la biblioteca en el origen del estudio, dentro de la cohorte offline existente. Se descarga solo al abrir la Biblioteca; en un equipo preparado, abrirla y añadir no necesitan red.
- **«Biblioteca» en Recursos**: sección desplegable con filtro Disfraces · Fondos · Sonidos, miniaturas, escucha previa y acciones reales con teclado, foco visible y diseño estrecho. Los nombres visibles están en español.
- **Lo que funciona hoy, sin ampliar IR ni bloques**: añadir un disfraz o un sonido al único objeto `hero` (aparecen en los menús «disfraz» y «sonido» de `gg.assets`), y usar un fondo como fondo inicial del escenario (sustituye el medio del disfraz del escenario, como ya hace «Reemplazar»). Volver al fondo inicial del catálogo es una acción explícita.
- Los medios añadidos pasan por los mismos contratos (`prepareAsset`, política `gg-resources-v1`), viajan en el GGPROJ y en la descarga portable.

## Capabilities

### New Capabilities

- `starter-resource-library`: biblioteca local de medios propios, su procedencia, integridad, disponibilidad sin red y la forma de copiarlos a un proyecto 2D.

### Modified Capabilities

Ninguna. Los contratos de medios (`sb3-resources` GG-ASSET-001…004), el formato GGPROJ y los packs no cambian; la biblioteca solo produce entradas ya admitidas por ellos.

## Impact

- Nuevo: `tools/resources/` (generador, bloqueo y hoja de contacto), `src/contracts/starter-library.mjs`, `src/studio/starter-library-ui.mjs`, pruebas Node/herramientas y `tests/browser/starter-library.spec.mjs`.
- Cambia: `src/studio/resources-ui.mjs`, y de forma mínima `src/studio/index.html` y `src/studio/style.css`; `tools/f0/build-browser.mjs` (etapa nueva), `tools/release/materials.mjs` (SBOM), `THIRD_PARTY_NOTICES`, `tools/test/impact.mjs`.
- No cambia: IR, bloques, packs, `contextual-workspace.mjs`, lectores GGPROJ v1–v5, migraciones, orígenes ni permisos.
- **Límite**: varios sprites y el bloque de cambio de fondo son E2 (`scene2d-multi-sprite`). Los fondos y sprites quedan como datos listos; E2 podrá añadir varios fondos por escenario y disfraces por objeto desde la misma biblioteca.
