# Tasks

## 1. Contrato y decisiones técnicas

- [ ] 1.1 Definir el esquema de manifiesto `apiVersion: 2` con la tabla de lenguaje y el validador de reglas bloqueables (forma única, sin sobrecargas, enums cerrados, identificadores, espacios de nombres, reservadas); pruebas de herramientas que rechazan cada infracción con pack y entrada.
- [x] 1.2 Prueba técnica de llamadas sin `await`: decidido traducir la sintaxis v3 a API1/API2 en el origen del lenguaje (acorn / `ast`), sin dependencias nuevas; registrado en el punto 6 del diseño.
- [ ] 1.3 Consultar CodeGraph sobre generadores, adaptador Scratch, `device-program` y motores textuales; inventariar consumidores del texto generado y de `GG`.

## 2. Capa textual

Orden de entrega: primero 2D (API v3 → API1) con su generador y sus copias, que es lo visible para el alumno; después la tabla de lenguaje de los packs (sección 3) y 3D/web (API v3 → API2).


- [x] 2.1a API v3 de 2D: traductores JavaScript (`api-v3.mjs`, acorn) y Python (`api-v3-python.mjs`, `ast` en Pyodide) a API1 en el origen del lenguaje; generador v3 (`generateApi3ProgramSource`); la lectura derivada y las copias usan v3 (`runtime.api: 'api3'`, IDs de variables en `runtime.variableIds`); equivalencia exacta con API1 en todo el corpus para JavaScript y Python (`tests/integration/api-v3.test.mjs`); API1/API2 intactas.
- [ ] 2.1b API v3 de 3D y web (traducción a API2) y exportaciones autónomas.
- [x] 2.2 Implementar nombres de variable válidos y alias deterministas para variables existentes, conservando IDs y atomicidad de «cambiar en» (`api3Identifier`; `+=`/`-=` se traducen a `changeVariable`).

## 3. Migración de packs

- [ ] 3.1 Migrar `gg.score` a la tabla con su migración de manifiesto; corpus y fixtures equivalentes.
- [ ] 3.2 Migrar `gg.sprites` y `gg.assets` (2D) con bajada a opcodes VM revisados; corpus de equivalencia bloques/JS/Python y copia Scratch sin regresión.
- [ ] 3.3 Migrar las operaciones 3D y web a la tabla, incorporando los rótulos educativos; exportaciones autónomas JS/Python ejecutadas con Studio apagado.
- [ ] 3.4 Migrar `gg.microbit` a plantillas Static TypeScript; compilación a HEX idéntica para los programas existentes.

## 4. Generadores y pruebas

- [ ] 4.1 Sustituir los generadores por versiones genéricas dirigidas por la tabla, con mapa línea→bloque; «Ver bloque» e «Ir a línea» sin regresión.
- [ ] 4.2 Pasar las aserciones de texto literal a archivos de referencia por API; añadir la prueba «sin `GG.`/`ctx`/`gg_` en la lectura» para los seis contextos.
- [ ] 4.3 E2E de copia nueva API v3, copia API1/API2 anterior, lenguaje no disponible por pack y reapertura; `test:affected` y una `test:full`.
- [ ] 4.4 Actualizar `docs/sdk/EXTENSIONS.md`, ADR-004/005/009 (sustitución en ADR-011), resultados y evidencia con límites.
