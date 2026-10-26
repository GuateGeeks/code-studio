# Tasks

## 1. Contrato y decisiones técnicas

- [x] 1.1 Esquema de tabla de lenguaje y validador de reglas bloqueables (`src/contracts/language-table.mjs`: forma canónica única salvo `supersedes`, identificadores, reservadas de JS/Python, plantillas con exactamente sus argumentos, bajada obligatoria); manifiestos `apiVersion: 2` aceptados solo con tabla válida; pruebas `tests/integration/language-table.test.mjs`.
- [x] 1.2 Prueba técnica de llamadas sin `await`: decidido traducir la sintaxis v3 a API1/API2 en el origen del lenguaje (acorn / `ast`), sin dependencias nuevas; registrado en el punto 6 del diseño.
- [x] 1.3 Consultar CodeGraph sobre generadores, adaptador Scratch, `device-program` y motores textuales; inventariar consumidores del texto generado y de `GG`.

## 2. Capa textual

Orden de entrega: primero 2D (API v3 → API1) con su generador y sus copias, que es lo visible para el alumno; después la tabla de lenguaje de los packs (sección 3) y 3D/web (API v3 → API2).


- [x] 2.1a API v3 de 2D: traductores JavaScript (`api-v3.mjs`, acorn) y Python (`api-v3-python.mjs`, `ast` en Pyodide) a API1 en el origen del lenguaje; generador v3 (`generateApi3ProgramSource`); la lectura derivada y las copias usan v3 (`runtime.api: 'api3'`, IDs de variables en `runtime.variableIds`); equivalencia exacta con API1 en todo el corpus para JavaScript y Python (`tests/integration/api-v3.test.mjs`); API1/API2 intactas.
- [x] 2.1b API v3 de 3D y web: vocabulario derivado del perfil de operaciones (`src/contracts/api3-capability-vocabulary.mjs`), traductores JS (`api-v3-capability.mjs`) y Python (`api3CapabilityPythonCompiler`) a API2, generador `generateApi3CapabilitySource`; lectura derivada y copias en v3 con `targetIds`; equivalencia exacta con API2 en JS y Python (`tests/integration/api-v3-capability.test.mjs`). Los bloques siguen ejecutándose por la vía interna API2; las exportaciones autónomas incluyen los traductores en el bundle del lenguaje.
- [x] 2.2 Implementar nombres de variable válidos y alias deterministas para variables existentes, conservando IDs y atomicidad de «cambiar en» (`api3Identifier`; `+=`/`-=` se traducen a `changeVariable`).

## 3. Migración de packs

- [x] 3.1 Tablas de `gg.score` (0.1/0.2), `gg.sprites` y `gg.assets` en `src/packs/language-tables.mjs` (por `pack@versión`, como migraciones y permisos, porque los manifiestos publicados están congelados por su hash); el vocabulario v3 2D se deriva de la tabla.
- [ ] 3.2 Bajada 2D a opcodes VM revisados desde la tabla (hoy la tabla declara la bajada a la IR0 existente); trasladada a `scene2d-vocabulary-v2` 1.1, fuera del cierre acordado de este cambio. No implementada aquí. El usuario aceptó explícitamente archivar con este traslado el 25/10/2026; la casilla se conserva sin marcar.
- [x] 3.3 3D y web: entradas derivadas de los descriptores de operaciones y bloques de capacidad (`capabilityLanguageEntries`), sin tabla manual; cobertura comprobada.
- [x] 3.4 `gg.microbit`: las sentencias se renderizan desde plantillas Static TypeScript de la tabla con texto idéntico al anterior (LANG-004); el control y los eventos siguen en el núcleo.

## 4. Generadores y pruebas

- [x] 4.1 Generadores v3 dirigidos por datos con mapa línea→bloque: las acciones 2D salen de la tabla de sprites, 3D/web del perfil de operaciones y las sentencias micro:bit de sus plantillas; asignaciones, eventos y control siguen en el núcleo.
- [x] 4.2 Prueba «sin `GG`/`ctx`/`await`/`gg_`» en la lectura de 2D, texto 2D, 3D y web (API3-001, API3-CAP-001) y aserciones E2E pasadas a la API v3. Límite: el TypeScript de micro:bit conserva el contador `gg_device_i_N`, porque cambiarlo altera el texto compilado a HEX; Scratch importado no tiene lectura derivada.
- [x] 4.3 Copias y reapertura: LCOPY-001 (2D JavaScript/Python API v3) y LCOPY-002 (3D API2 anterior); disponibilidad por pack en LANG-006 con tabla sintética, sin E2E de pack real sin formas porque no existe uno publicado. Foco 8/8; repetición de copias/presentación 14/14; `test:affected --list` completo y `test:full -- --partitions 2` aprobado (424 Node, 74 herramientas, 3 smoke + 202 E2E, 35 OpenSpec, 3 upstreams; referencia avanzada sin cambios durante la corrida). [Acta y límites](../../../../docs/engineering/BLOCK-LANGUAGE-CONTRACT-RESULTS.md).
- [x] 4.4 Verificados `docs/sdk/EXTENSIONS.md`, ADR-004/005/007/009 (sustitución parcial en ADR-011); [resultados de cierre](../../../../docs/engineering/BLOCK-LANGUAGE-CONTRACT-RESULTS.md), intentos fallidos y evidencia conservados en `artifacts/block-language-contract/verification-20261025/`. Límites explícitos: disponibilidad sintética, documentos nuevos API1 → synced-code-views 3.3, contador micro:bit y 3.2 trasladada.
