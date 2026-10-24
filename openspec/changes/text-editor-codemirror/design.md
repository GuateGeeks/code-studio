# Design

## Context

Hoy hay dos `<textarea>`: el documento textual (`#text-source`) y el TypeScript de micro:bit. La shell es JavaScript modular sin framework. El build empaqueta los workers con webpack y sirve la shell como módulos.

## Decisions

1. **CodeMirror 6 con versiones fijadas**, empaquetado en un bundle propio de la shell (`webpack-editor-code`), con licencia y aviso en `THIRD_PARTY_NOTICES`. Solo los paquetes necesarios: `state`, `view`, `commands`, `lang-javascript`, `lang-python`, `autocomplete`, `lint`.
2. **Un adaptador `code-editor.mjs`** que expone la misma interfaz que usa hoy la shell (`value`, `focus`, eventos), para que los consumidores cambien lo mínimo. El `id` y la etiqueta visibles se conservan en el contenedor.
3. **Autocompletado desde la tabla de lenguaje**, por contexto y lenguaje, con firma y descripción en español.
4. **Diagnósticos** de los traductores (API v3) y de los intérpretes mostrados con `lint` en su línea, enlazados con «Ir a línea».
5. **Peso medido:** bytes comprimidos antes y después en la cohorte offline, registrados en el acta.

## Risks / Trade-offs

- [Accesibilidad peor que el `textarea`] → suites de accesibilidad y zoom, y revisión manual con lector antes de cerrar.
- [Peso offline] → bundle cargado bajo demanda al abrir un documento de texto.
