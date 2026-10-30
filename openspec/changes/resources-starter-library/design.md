# Design

## Context

- Recursos: política `gg-resources-v1` (`src/contracts/resources.mjs`) con un almacén único (`src/resource-store.mjs`), descriptores `{id, ownerId, name, assetId, …}` y cuotas de 32 assets, 32 disfraces, 16 sonidos, 128 KiB por medio y 2 MiB por catálogo. El worker `asset-worker` normaliza con `prepareAsset` (SVG pasivo canónico, WAV PCM16 ≤ 2 s).
- El adaptador Scratch construye el escenario con los disfraces `ownerId: 'stage'` y el objeto con los de `ownerId: 'hero'`; el disfraz actual es el primero (`currentCostume: 0`).
- `gg.assets` ofrece «disfraz %1», «iniciar sonido %1» y «sonido %1 y esperar» con menús filtrados por `ownerId: 'hero'`. No hay bloque de fondo (E2).
- La release copia todo el árbol del rol `shell` en la cohorte, en el paquete offline `studio-core`.
- Ver proposal.md (Why) y specs/starter-resource-library (requisitos GG-LIB-001…008).

## Goals / Non-Goals

**Goals:** biblioteca propia reproducible y verificable; añadir sin red en un equipo preparado; reutilizar contratos y transacciones existentes; UI accesible mínima en Recursos.

**Non-Goals:** varios sprites, cambio de fondo en ejecución, bloques nuevos, editor de pintura, PNG en la biblioteca, búsqueda/etiquetas, biblioteca 3D/web.

## Decisions

1. **Generación por código en `tools/resources/starter-library.mjs`.** Cada dibujo es una función que emite geometría SVG del subconjunto admitido (rect, circle, ellipse, path, polygon, line, g); cada sonido es una síntesis determinista (senos, barridos, envolventes y ruido LCG con aritmética entera). La salida pasa por `sanitizeSvg` y por `inspectWavPcm16`, así los bytes publicados ya son canónicos y su SHA-256 es el ID que tendrá el recurso. *Alternativa descartada:* SVG dibujados a mano y versionados como binarios: más difíciles de revisar y de mantener coherentes.
2. **Bloqueo versionado `tools/resources/starter-library.lock.json`** con ID, tipo, nombre, bytes y SHA-256 por entrada y el hash del paquete. Una prueba regenera y compara; actualizarlo es un acto explícito (`--write-lock`). Los medios no se versionan como binarios: el build los produce desde el generador.
3. **Un solo paquete JSON publicado en el rol shell (`starter-library.json`)** con los medios en base64. Se descarga una vez, cuando la persona abre la Biblioteca (nunca en el arranque). Añadir no vuelve a pedir el paquete, pero el worker de recursos se descarga en cada operación: sin red, todo depende de la cohorte preparada (service worker), igual que el resto del estudio. Solo existe en el origen del estudio (no se replica en los seis roles como `app/`). Se resuelve con `new URL('../../starter-library.json', import.meta.url)`, válido en desarrollo y bajo `/releases/<cohorte>/`. *Alternativas:* un archivo por medio (más peticiones, añadir sin red dependería de cada archivo) o embebido en `src/` (se copiaría a los seis roles).
4. **Contrato inerte `src/contracts/starter-library.mjs`.** Valida el paquete (esquema cerrado, IDs, nombres, tipos, dimensiones, licencia, base64 canónico, SHA-256) y aplica una entrada a recursos v1 de forma pura: disfraz/sonido → `put-asset` + descriptor `hero` con ID legible (`gato`, sufijo `-2…` si choca); fondo → reemplaza el medio del primer disfraz `stage` conservando su ID. La UI sigue usando el worker (`prepare-media`) y exige que el ID preparado sea el SHA declarado. Mensajes de cuota en español antes de llegar a los límites técnicos.
5. **IDs legibles.** El ID del descriptor aparece en las vistas JavaScript/Python (`hero.setCostume("gato")`), por eso se usa el identificador ASCII de la entrada en vez de un UUID.
6. **Volver al fondo inicial** toma el fondo del catálogo del proyecto (`promoteLegacyResources(catalog)`), no de la biblioteca: el fondo de cuadrícula conserva su licencia y procedencia actuales.
7. **Licencia CC0-1.0**, como el corpus SB3 propio. Los medios terminan dentro de proyectos y exportaciones SB3 de estudiantes; CC0 no impone condiciones a esas obras. Se declara en el índice, en `THIRD_PARTY_NOTICES` y en una entrada `ownedContent` del SBOM. **Confirmada por el usuario el 29/10/2026.**
8. **UI.** `<details id="starter-library">` dentro de Recursos con filtro de radios nativo (`.mode-switch`), lista de tarjetas con miniatura, nombre y botones «Añadir»/«Usar de fondo»/«Escuchar», estado `aria-live`. El módulo `src/studio/starter-library-ui.mjs` solo renderiza y emite intenciones; `resources-ui.mjs` ejecuta la transacción con su `working()`/`replace()` existentes (cancelación, época y mensajes compartidos).
9. **Estética.** Paleta derivada de `DESIGN.md` y del `hero` de demostración (coral, azul, verdes, crema, tinta para contornos y ojos), contorno de 3 px redondeado, formas grandes y caras amables. Personajes 96×96, objetos 64×64, fondos 480×360 con tonos suaves para que los objetos destaquen. Revisión con hoja de contacto HTML capturada con Playwright.

## Risks / Trade-offs

- [El paquete añade bytes a la cohorte] → se mide sin comprimir y con gzip; solo el rol shell lo contiene; WAV a 22 050 Hz mono y ≤ 1,2 s.
- [Determinismo de `Math.sin/exp` entre versiones de Node] → la toolchain está fijada (`release/source-lock.json`); el bloqueo detecta cualquier deriva y se regenera explícitamente.
- [Cuotas por proyecto: 16 sonidos, 32 assets] → mensajes previos claros; no se añade nada parcial.
- [Fondo como sustitución del disfraz del escenario] → coherente con «Reemplazar» actual; E2 añadirá varios fondos y bloque de cambio. Documentado como límite.
- [Licencia elegida por el agente] → coherente con el precedente CC0 del corpus SB3; confirmada por el usuario el 29/10/2026.

## Migration Plan

Sin migración de proyectos: solo se añaden recursos admitidos por la política v1. Revertir el cambio deja abiertos los proyectos con recursos de biblioteca porque los medios viajan dentro del proyecto.
