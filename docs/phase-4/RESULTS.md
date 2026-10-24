# F4: micro:bit integrada

Fecha:22 de octubre de2026. Estado: software consolidado; puerta completa aprobada. La aceptación física se registra por separado.

El cambio OpenSpec phase-4-microbit-integration se definió y validó antes de implementar. CodeGraph se consultó para las fronteras de proyecto, editor y PXT. GGPROJ3 conserva formato base y añade gg.microbit local; GGPROJ1/2 no se promueven al abrir. [ADR007](../adr/007-autoria-de-dispositivo-y-transferencia-usb.md) documenta propiedad de autoría, scopes, límites y transferencia.

El editor contextual ofrece12 bloques: inicio/forever/botón, icono/número/matriz, plot/unplot/limpiar, pausa/repeat/condición de botón. Static TypeScript es readonly y deriva de IR propia validada; deviceSource permanece independiente. El starter distribuye los eventos en filas; importar no reordena layouts.

La acción conjunta precompila antes de sustituir, muestra escena y simulador y traduce el bus A/B/AB a mensajes2D cerrados. La selección de consola cambia al contexto correcto. Edición y Stop revocan fuente, diagnósticos, simulación, descargas y página USB de versiones anteriores. El coordinador central preserva los participantes y borradores ante fallo de commit.

HEX V1/V2/universal se descarga como archivo real, con registros/checksums validados y SHA/compilerPackHash ligados al scope. La página USB separada verifica nuevamente el artefacto; solo esa ruta obtiene acceso USB, mediante gestos explícitos y placa/firmware reconocidos. DAPjs es local, sin relajar CSP ni modificar motores upstream.

## Evidencia focal disponible

- Modelos/coordinador/UIscopes/fronteras:31 casos Node aprobados (artifacts/f4-models-focused.tap). Los diez casos UI usan producción JSDOM y peticiones diferidas; distinguen error actual de éxito/error obsoleto.
- Target/transferencia:16 Node focales y4 fronteras aprobados. El DAPjs real se usa con transporte doble; cancelación durante selector/escritura impide órdenes posteriores. Progreso limitado a101 estados. Esto no es hardware.
- Integración Chromium:6/6 casos aprobados, desktop29.8s/móvil21.5s, diagnósticos/importación inválida11.2s, edición durante compilación8.5s, replay/scopes/flood10.3s y Stop durante bootstrap8.3s. Edición real→TS readonly→botónA/LED/escena x10→Stop→HEX→GGPROJ→reapertura sin autorun→ejecución conservada.
- Transferencia Chromium:4/4 casos aprobados (6.7/7.0/6.3/6.4s): popup/política/fallback móvil, hash alterado, selector pendiente y revocación por Stop. Dispositivo simulado, sin afirmar flasheo físico.
- La revisión visual aprobó escena y placa completas en390px y desktop. El starter horizontal se corrigió a filas. Una discrepancia de copy del fallback USB se corrigió y verificó con clic/foco/Enter en desktop/móvil.
- La visita fría detectó campos no editables al activar el workspace inicialmente readonly. La corrección usa APIs públicas para actualizar edición y contexto ARIA sin recrear bloques, mover foco ni notificar autoría; cinco casos de editor aprobados y nueva primera activación fría comprobada.
- Node completo focal:221/221 y herramientas38/38 aprobados antes de la puerta completa. Sus reportes no sustituyen full.
- La validación HEX se ajustó al output real PXT (metadata0E después de EOF y separadores vacíos), preservando bytes y rechazo de datos ejecutables posteriores; se conservó la reproducción aislada artifacts/f4-hex-debug.log.

La primera puerta completa pasó221Node/38herramientas/3smoke y62 regresiones antes de detenerse en una expectativa histórica de PXT: pretendía devolver la compilación de fuente editada mientras estaba en curso. Se conserva el reporte fallido en artifacts/cuts/phase-4-microbit-integration/failed-legacy-pxt-expectation/. La prueba ahora observa inmediatamente el rechazo obsoleto, comprueba que no publica resultado y recompila la fuente actual; los dos casos PXT focales aprobaron en12.1s (incluido firmware nativo y contexto offline). No se relajó el contrato de invalidación.

La segunda puerta se detuvo tras36 regresiones en un sondeo de Stop/Python que no admitía la respuesta transitoria explícita GG scene loading. Se conserva artifacts/cuts/phase-4-microbit-integration/failed-language-loading-poll/. Esperar un texto breve de estado no sirve para un programa infinito con límite de turno de300ms; esa variante focal se rechazó. El sondeo ahora reintenta solamente las transiciones conocidas de sesión/revisión/carga y sigue fallando ante otros errores. Los dos casos Stop JS/Python aprobaron en26.7s, sin aumentar timeouts ni reintentos del runner.

La revisión del compilador legacy encontró además rechazo tardío que podía emitir dos errores sobre una fuente ya editada. Studio normaliza éxito/error obsoleto a cancelación; el runner entrega errores legacy por la respuesta autenticada y su propietario de intento decide la vigencia. Los errores actuales siguen visibles. La regresión GG-PXT-008 usa abort real de bootstrap retrasado, edición y clics reales; aprobó junto a los dos casos PXT existentes:3/3 en14.2s.

La tercera puerta aprobó69 regresiones y encontró una instrumentación antigua del test de arrastre: reemplazaba la primera llamada Blockly.inject del bundle y, desde F4, capturaba el workspace de dispositivo. El bloque sí se creó mediante arrastre real en2D, pero el sondeo contaba el workspace equivocado. Se conserva artifacts/cuts/phase-4-microbit-integration/failed-toolbox-drag/. La instrumentación se limita a createEditor y comprueba que su injectionDiv pertenece al contenedor2D, sin modificar conexiones, gestos ni timeouts. El caso focal aprobó en11.2s y el archivo completo de inspector4/4 en29.2s (artifacts/f4-inspector-complete.json). Los18 casos que no habían llegado a ejecutarse (simulador, corpus textual y equivalencia) se verificaron separadamente:18/18 en3.8min, incluyendo audio y espera contextual mayor de20s; reporte artifacts/f4-remaining-browser.json.

La matriz local artifacts/f4-native-matrix.json fija target9.1.1/PXT13.0.1, compiler-pack SHA b729774b7e1ab83d2dbd0207eb88e6ea40358b5bad9b2b869e2e282886b0f1af, dependencias core/radio/microphone y caches nativas disponibles. No equivale a cualquier extensión nativa offline.

La segunda visita fría aprobó en55.8s (56.6s incluyendo harness): Chromium cerrado, cuatro servidores apagados, restauración de autoría2D, JS/Python/PXT y activación/edición inicial de gg.microbit offline, ejecución combinada, HEX universal y Stop/guardado. Actualización corrupta, cohortes y rollback permanecen incluidos. Reporte artifacts/f4-offline-browser.log. El full se registra después de congelar fuentes.

La prueba física V1/V2 y autonomía, lector humano, perfil escolar y piloto docente continúan pendientes. El software de SB3 (F5), 3D/apps (F6) y preparación de release/piloto (F7) continúan después de este corte; no se archivan cambios previos.

## Consolidación aprobada

Full estable del22/10/2026,13:52:04.962–14:05:33.361UTC:221Node,38herramientas,3smoke y88regresiones (91E2E), sin skips/flaky/fallos. Duración total808.399s; etapa browser779.506s. Los10 cambios OpenSpec estrictos y la preservación de commit/diff/lock de los tres upstreams aprobaron. Se escribió la referencia de contenido. El build incremental reutilizó sus10 etapas sin force (580ms aproximadamente; valor exacto en acta).

[Acta JSON](microbit-integration-evidence.json) y reportes/capturas/hashes en artifacts/cuts/phase-4-microbit-integration/. Las corridas fallidas y sus causas se mantienen separadas. Cambios documentales posteriores se validan con OpenSpec, sin repetir full. Continúa F5; la prueba física no se declara aprobada.
