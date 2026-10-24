# Proposal

## Why

El editor de texto es un `<textarea>` sin resaltado, números de línea, autocompletado ni marcadores de error (H8). MakeCode y Code.org usan editores de código reales. Con la API v3 legible y las vistas sincronizadas próximas, el editor pasa a ser la superficie principal de la transición a texto. El usuario aprobó CodeMirror 6 con tamaño medido (D6, 24/10/2026).

## What Changes

- **CodeMirror 6** en la shell, solo para edición. La ejecución sigue en el origen del lenguaje.
- **Funciones del editor:** resaltado JavaScript/Python, números de línea, marcadores de error en la línea que devuelve el traductor o el intérprete, y autocompletado y firma de la API v3 generados desde la tabla de lenguaje.
- **Cajón de fragmentos** por categoría (las mismas que los bloques), que inserta código en el cursor.
- **Accesibilidad:** navegación por teclado y lector de pantalla al menos equivalentes al `textarea`, con mismo `id` y etiqueta visible.
- **Peso:** los bytes comprimidos añadidos a la cohorte offline se miden y se registran.

## Capabilities

### New Capabilities

- `text-editor`: edición de código con resaltado, diagnósticos en línea, autocompletado de la API y fragmentos, accesible y offline.

## Impact

`src/studio/index.html`, `text-documents-ui.mjs` y el editor de micro:bit (un único escritor), el build (nuevo bundle y la cohorte offline), `THIRD_PARTY_NOTICES` y el SBOM. Afecta a las suites de lenguajes, accesibilidad, zoom y offline. **Depende de** `block-language-contract`, porque el autocompletado sale de la tabla.

Fuera de alcance: depurador paso a paso, multiarchivo y formateo automático.
