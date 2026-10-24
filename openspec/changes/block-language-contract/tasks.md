# Tasks

## 1. Contrato y decisiones técnicas

- [ ] 1.1 Definir el esquema de manifiesto `apiVersion: 2` con la tabla de lenguaje y el validador de reglas bloqueables (forma única, sin sobrecargas, enums cerrados, identificadores, espacios de nombres, reservadas); pruebas de herramientas que rechazan cada infracción con pack y entrada.
- [ ] 1.2 Prueba técnica de llamadas sin `await` (QuickJS asyncify, Pyodide `run_sync`/JSPI): medir Stop, memoria y peso de cohorte frente a la línea base; registrar la decisión del punto 6 del diseño en este cambio.
- [ ] 1.3 Consultar CodeGraph sobre generadores, adaptador Scratch, `device-program` y motores textuales; inventariar consumidores del texto generado y de `GG`.

## 2. Capa textual

- [ ] 2.1 Implementar la capa API v3 en JavaScript y Python sobre el puente `GG` en `src/targets/text`, con contexto de invocación implícito y validación de dominio; API1/API2 intactas.
- [ ] 2.2 Implementar nombres de variable válidos y alias deterministas para variables existentes, conservando IDs y atomicidad de «cambiar en».

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
