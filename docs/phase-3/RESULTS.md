# F3: packs, actividades y preparación offline

Fecha: 22 de octubre de 2026. Estado: software consolidado con full aprobado.

El cambio OpenSpec `phase-3-packs-lessons-offline` define los contratos antes de la implementación. Los packs locales declarativos `gg.sprites` y `gg.score` aportan bloques, variables y permisos; el editor consume contribuciones genéricas. GGPROJ3 fija versiones/hashes y configuración, con apertura validada y migración score reversible. GGPROJ1/2 conservan sus contratos.

El broker conserva autoridad del host, valida recursos/declaraciones antes de mutar el runner y rechaza permisos ajenos. No existe una API GG.score inventada: los bloques usan las operaciones de variables declaradas y autorizadas. La configuración inicial pertenece a la autoría; escena mutable, logs, progreso y caches no se guardan como autoría.

Tres actividades modificables cubren historia animada, contador y transición a texto. Las comprobaciones capturan proyecto, autoría, documento ejecutado y sesión/revisión. Stop o edición invalidan comprobaciones pendientes. El progreso histórico se guarda en otra base y no certifica el estado actual. Los reemplazos fallidos restauran incluso borradores textuales inválidos, foco y selección.

La preparación distribuye seis paquetes entre cuatro orígenes mediante snapshots inmutables, inventarios con hashes y verificaciones por origen. La selección actual/anterior se confirma con CAS en IndexedDB del shell. Cancelación, cuota e integridad conservan la selección vigente. Las versiones preparadas se retienen: no hay recolección automática de caches. Véanse [ADR006](../adr/006-cohorts-offline-por-origen.md) y [SDK experimental](../sdk/EXTENSIONS.md).

## Evidencia focal

- Quick: 171 pruebas Node, 38 de herramientas y tres smoke aprobados (`artifacts/f3-quick.log`).
- Nueve casos de packs/actividades aprobados con clics reales, edición, migración, permisos, guardado/reapertura y escritorio/móvil (`artifacts/f3-compact-lessons-browser.log`).
- Una prueba fría offline aprobada en54.9s: preparación A, candidato B corrupto rechazado, B válido, pestaña A conservada, rollback a A, cierre completo de Chromium y de los cuatro servidores, reapertura del perfil y ejecución de bloques/JS/Python/PXT, más HEX V1/V2/universal (`artifacts/f3-compact-offline-browser.log`, `artifacts/offline-second-visit.json`).
- El rewriter respeta las claves virtuales del compilador PXT: el worker conserva sus bytes y la compilación nativa posterior a simulación usa los hashes de firmware locales. Se corrigió la sustitución indiscriminada de literales; no se modificó PXT upstream.
- Capturas globales desktop1280 y móvil390, tres disclosures cerrados y sin overflow horizontal: `artifacts/f3-global-*.png` y `artifacts/f3-global-layout.json`.

La captura móvil con el escenario dentro del viewport muestra hero correctamente (artifacts/f3-mobile-scene-visible.png); la captura de página completa fuera de viewport podía omitir el canvas. La ubicación del escenario después de inspector/código/consola se conserva y se revisará con la accesibilidad global de F7.

Las pruebas de cuota/CAS/cancelación son deterministas Node; la segunda visita es evidencia real de Chromium. La primera prueba offline falló en compilación nativa y motivó el arreglo del rewriter. Otra corrida anterior requirió terminar el servidor de prueba que esperaba conexiones persistentes; el servidor ahora cierra sus conexiones y la corrida final de54.9s terminó por sí sola.

No se certifican hardware físico, lector de pantalla humano, Chromebook, presupuestos escolares ni piloto docente. Esos requieren evidencia externa. La siguiente implementación es F4, con dispositivo micro:bit y autoría contextual, manteniendo separados simulación, HEX y prueba física.

## Consolidación estable

Full aprobado sin modificaciones de fuentes/documentos durante la referencia: **171 Node,38 herramientas,3 smoke y77 regresiones (80 E2E)**. Duración total 681.736s; navegador650.964s. Las9 etapas del build se reutilizaron, sin force, en1491.927ms. OpenSpec9/9 y preservación de los tres upstreams aprobados; referencia de impacto escrita. CodeGraph sincronizado. [Acta JSON](packs-lessons-offline-evidence.json) conserva resultados, hashes y límites; reportes/capturas en artifacts/cuts/phase-3-packs-lessons-offline.

La segunda visita fría dentro de full aprobó en47.7s, sin intervención para terminar servidores. Las mediciones son del entorno local WSL/Chromium; no constituyen presupuestos escolares. F3 software cerrado; continuar F4–F7 sin archivar cambios OpenSpec anteriores.
