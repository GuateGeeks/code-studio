# Runner y compilador de navegador

**21 de octubre de 2026, Guatemala. Resultado: 6 pruebas Chromium y 11 regresiones headless aprobadas.**

Este informe conserva la primera entrega de navegador. Las continuaciones de [corpus y simulador](CORPUS-SIMULATOR-RESULTS.md), [audio/estado](AUDIO-STATE-RESULTS.md) y [bindings/Blockly editable](BINDINGS-EDITOR-RESULTS.md) amplían la suite a 23 pruebas Node y 22 E2E; [browser-evidence.json](browser-evidence.json) contiene la evidencia de la última ejecución completa.

El banco de prueba integra Scratch VM, Scratch Render y SVG locales dentro de un iframe de otro origen. PXT compila simulación y firmware en un worker del navegador con un Host local. OpenSpec contiene los requisitos, escenarios y tareas de esta entrega dentro del cambio `phase-0-integration-foundations`.

La [evidencia medida](browser-evidence.json) conserva versión de herramientas, métricas visuales, resultados de compilación, hashes del build y preservación upstream. Los resultados de la suite están en `artifacts/browser-results.json`; las capturas se encuentran en `artifacts/browser-before.png` y `browser-after.png`.

## Pruebas ejecutadas

| Requisito | Resultado observado |
|---|---|
| GG-SCRATCH-004 | Sprite coral real de 48×48; 984 píxeles identificables. Centro horizontal de 239.5 a 254.5: desplazamiento exacto de 15 píxeles, coincidente con x=15 de la VM |
| GG-RUN-005 | Lecturas de parent.document y parent.localStorage rechazadas con SecurityError; otro frame con el mismo ID de sesión no recibe el canal autorizado |
| GG-RUN-006 | Worker en bucle infinito; anfitrión disponible; Stop destruye el frame, conserva la fuente y recrea una sesión ejecutable. El mensaje de la sesión antigua se rechaza |
| GG-RUN-007 | CSP connect-src self en runner y worker bloquea fetch a otros orígenes; se observan eventos securitypolicyviolation de conexión en ambos |
| GG-PXT-004 | Compilación real en WorkerGlobalScope: JS de simulación, HEX por variante y HEX universal con marcas V1/V2. Registros con longitudes/checksums válidos y diagnósticos de main.ts ante una API inexistente. El anfitrión sigue editable durante la compilación |
| GG-PXT-005 | Pack precargado; contexto Chromium puesto sin conexión; compilación nativa satisfactoria, dos runtimes locales encontrados y cero intentos HTTP externos por el adaptador |

La suite completa de navegador observada terminó en unos 24 segundos. Las pruebas usan Playwright 1.64.1 y Chromium headless 156.0.8078.4, con renderizado WebGL por software habilitado para el entorno WSL. Esto no constituye un benchmark de equipos escolares ni una matriz de navegadores.

## Rutas y decisiones verificadas

- **Anfitrión:** `127.0.0.1:4173`; conserva fuente y controles. El runner usa `127.0.0.1:4174`, sandbox con scripts y su propio origen. Se valida origin, source, versión y sesión antes de transferir un MessagePort. Respuestas correlacionadas y secuencias crecientes evitan aplicar mensajes tardíos.
- **Recursos 2D:** SVG propios con hash de contenido. Scratch Storage 5.0.3 exporta una clase nombrada y createAsset no conserva por sí solo el recurso para futuras búsquedas; un Helper local entrega los assets sin web store remoto.
- **Carga del fixture:** scratch-parser usa AJV con funciones dinámicas. Se valida el fixture durante el build y se usa deserializeProject para el proyecto nativo fijo. No se habilitó unsafe-eval ni se admiten archivos SB3 arbitrarios por esta ruta.
- **Compilador PXT:** TypeScript y pxtworker se cargan mediante importScripts. El pack estático contiene target, configuración y cachés nativas. Se conserva el conjunto estándar core/radio/microphone y targetVersions.
- **Hook micro:bit:** PXT normalmente evalúa compilerExtension. Aquí se registra compilerHooks y se carga built/compiler.js como recurso estático; el build comprueba que coincide con la extensión del target, descontando su declaración global de ts. Las marcas 9900C0DE y 9903C0DE comprueban la combinación universal de variantes.
- **Compresión:** la heurística legacy de PXT confunde un worker sin window con Node. Se suministra el códec LZMA real de navegador a lzmaCompressAsync para mantener la fuente embebida del firmware, sin simular require ni DOM.
- **Distribución:** los servidores no compilan. Durante el flujo positivo todas las solicitudes HTTP registradas fueron GET a los dos orígenes locales. La compilación posterior a la precarga también funciona con la red desactivada.

Los bundles siguen siendo de desarrollo. La VM browser ocupa alrededor de 14 MB sin comprimir y el pack del compilador unos 5.2 MB; faltan reducción del catálogo/bundle, compresión de distribución y perfiles de memoria/arranque en equipos reales.

## Evidencia local

- `artifacts/browser-render-evidence.json`: conteo y posiciones de píxeles antes/después.
- `artifacts/browser-pxt-evidence.json`: entorno worker, salidas, diagnósticos y solicitudes HTTP.
- `artifacts/browser-offline-evidence.json`: resultado nativo con contextOffline=true.
- `artifacts/browser-heart.hex`: archivo universal generado dentro del navegador.
- `artifacts/browser/build-manifest.json`: SHA-256 y tamaños de los bundles estáticos; la continuación añade los del simulador.
- `artifacts/browser-test-results/`: trazas y capturas de fallos cuando corresponda.

## Fronteras que siguen abiertas

**Firmware físico:** no se flashearon placas ni se ejecutaron los HEX en hardware. Los resultados mantienen physicalBoardValidated=false. Falta comprobar V1/V2 reales, idealmente alimentadas sin conexión al equipo.

**Experiencia completa G1:** el sprite y el aislamiento ya están demostrados; faltan clic/teclado, esperas, mensajes, clones y audio en el corpus de navegador, además de persistencia GGPROJ. El JS de simulación micro:bit se compiló, pero no se ejecutó en su simulador de navegador.

**Offline de producto:** la prueba valida compilación con el worker y pack ya cargados en memoria. No valida cierre/reapertura offline, Service Workers, actualización de cachés ni instalación PWA.

**Seguridad y distribución:** se verificaron las fronteras concretas del spike. No hay cargador de extensiones arbitrarias ni importador SB3 general. La separación por puertos no aísla cookies del mismo hostname; producción requiere runner sin credenciales y una política de dominios/cookies propia. Faltan análisis adversarial amplio, cuotas completas, formatos hostiles y validación en otros navegadores.

**Texto y recursos avanzados:** el bundle SVG intenta insertar estilos de fuentes que la CSP bloquea; el fixture no contiene texto y se renderiza correctamente. Los estilos/fuentes de texto deben empaquetarse mediante una política explícita antes de admitir esa capacidad.

Los commits, lockfiles y diffs versionados de Blockly, Xcratch y micro:bit siguen iguales a la línea base. Los cambios previos de micro:bit se conservaron. Esta entrega completa las pruebas solicitadas de navegador; la fase 0 global continúa hasta resolver sus criterios restantes.
