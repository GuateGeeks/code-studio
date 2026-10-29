# Tasks

## 1. Generador, bloqueo y hoja de contacto

- [x] 1.1 Crear `tools/resources/starter-library.mjs` con 20 disfraces, 8 fondos y 10 sonidos originales; verificar con `tests/tools/starter-library.test.mjs` que cada medio supera `sanitizeSvg`/`inspectWavPcm16` y ya es canónico
- [x] 1.2 Generar `tools/resources/starter-library.lock.json` y verificar que dos generaciones son idénticas y coinciden con el bloqueo
- [x] 1.3 Generar la hoja de contacto HTML y su captura Playwright en `artifacts/stabilization-2d/e4-resources/`; iterar los dibujos hasta que sean coherentes y legibles a tamaño de escenario

## 2. Contrato de biblioteca

- [x] 2.1 Implementar `src/contracts/starter-library.mjs` (validación del paquete y aplicación pura a recursos v1) y verificar con `tests/integration/starter-library.test.mjs`: entradas válidas, manipuladas, duplicados, cuotas, fondo y restauración

## 3. Build, cohorte offline y avisos

- [x] 3.1 Añadir la etapa `starter-library` a `tools/f0/build-browser.mjs` y verificar con `npm run browser:build` que `shell/starter-library.json` coincide con el bloqueo
- [x] 3.2 Verificar con una prueba de herramientas que la instantánea de release incluye el paquete en el rol shell y el paquete offline `studio-core`; registrar bytes sin comprimir y gzip
- [x] 3.3 Declarar licencia y atribución en `THIRD_PARTY_NOTICES` y `ownedContent` del SBOM; verificar con `npm run test:tools`

## 4. Interfaz Biblioteca

- [x] 4.1 Añadir la sección Biblioteca en Recursos (`index.html`, `style.css`, `starter-library-ui.mjs`, `resources-ui.mjs`) con filtro, miniaturas, escucha, añadir, usar fondo y volver al fondo inicial
- [x] 4.2 E2E `tests/browser/starter-library.spec.mjs`: añadir disfraz/sonido/fondo sin red tras cargar, menús `gg.assets`, ejecución sin autorun, duplicados, error de carga, GGPROJ reabierto en perfil nuevo; inventariar en `tools/test/impact.mjs`
- [x] 4.3 Verificación de interfaz: capturas escritorio/estrecho/zoom, teclado y foco, sin desbordamiento horizontal; detector Impeccable sobre los archivos cambiados

## 5. Integración y acta

- [x] 5.1 Ejecutar `npm test`, `npm run test:tools`, `npm run spec:validate` y las suites de navegador focales en puertos propios; registrar conteos
- [x] 5.2 Redactar `docs/engineering/RESOURCES-STARTER-LIBRARY-RESULTS.md` con decisiones, licencia, bytes, comandos, capturas, intentos fallidos, límites y suites para la puerta conjunta

## Workflow follow-up

- Puerta full conjunta (coordinador), incluida `offline-recovery` en partición 0.
- Confirmación del usuario sobre la licencia CC0-1.0 de la biblioteca.
- Archivar el cambio tras la puerta y la confirmación.
