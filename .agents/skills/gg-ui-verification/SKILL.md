---
name: gg-ui-verification
description: Verificar en el navegador un cambio de interfaz de Code Studio con geometría, capturas válidas, teclado y suites del proyecto. Usar al cerrar cambios visuales, de composición o de consulta, y al preparar la matriz de capturas de un incremento.
---

# Verificación de interfaz de Code Studio

Complementa [gg-design-system](../gg-design-system/SKILL.md) y [gg-browser-first](../gg-browser-first/SKILL.md). Esta skill dice cómo demostrar un cambio visual; no define el diseño ni sustituye a TESTING.

## Fuentes

- [TESTING](../../../docs/engineering/TESTING.md) para quick/affected/full y la referencia de impacto.
- Suites en `tests/browser/`: `accessibility-shell`, `accessibility-runner`, `accessibility-zoom`, `integrated-*-workspace`, `studio-contextual-workspace` y `workspace-presentation` cuando exista. Helpers en `tests/browser/workspace-controls.mjs` y `advanced-controls.mjs`.
- Aceptación vigente en el cambio OpenSpec activo y su brief (por ejemplo `docs/product/VISUAL-REWORK-BRIEF.md`).
- Puertos en `docs/engineering/NEXT-SESSION.md`. Las previews existentes de otros incrementos se conservan; usa un juego de puertos libre.

## Medir, no estimar

- Mide con `getBoundingClientRect()` tras entrar al proyecto y con el caso nominal cerrado. Para el resultado mide el canvas o documento **dentro** del iframe y su contenido efectivo (4:3 sin deformar), no solo el elemento iframe.
- Comprueba `document.scrollingElement.scrollWidth <= innerWidth` para overflow horizontal y que los controles medidos tengan área visible no recortada por un ancestro.
- Zoom real: usa `deviceScaleFactor`/viewport equivalentes y además zoom de página cuando la suite lo implemente (`accessibility-zoom`); 1280 al 400 % equivale a 320 CSS px.
- Viewports de referencia del rework: 1280×720, 1440×900, 1280×900, 390×844, 448×884 y 320 de ancho; repite los cambios de breakpoint.

## Capturas válidas

- Una captura demuestra apariencia, no ejecución, aislamiento ni persistencia. Acompáñala de la acción real que produjo el estado.
- Superficies WebGL/canvas pueden salir vacías por la herramienta. Si el contenido interno existe (draws, píxeles leídos en la página del iframe), recaptura encuadrando el iframe; no lo reportes como regresión ni ocultes el fallo con reemplazos.
- Usa perfiles temporales nuevos; nunca el perfil del usuario. No inyectes estilos ni overlays para la captura.
- Guarda capturas brutas en `artifacts/<incremento>/` y un resumen durable en `docs/product/*-evidence.json` con viewport, estado, ruta y medición.

## Interacción

- Usa controles reales: clic, teclado (Tab, flechas en pestañas, Esc en vistas ampliadas) y edición real de Blockly y del textarea compartido.
- Verifica foco visible tras cada cambio de panel/contexto, conservación de caret/selección/borradores y que navegar o consultar no ejecuta ni detiene.
- Errores: provócalos (sintaxis, ID duplicado, archivo inválido) y comprueba mensaje junto a su origen, detalle técnico disponible y autoría/sesión conservadas.

## Entrega

- Comandos ejecutados con resultado real, conteos y reportes separados por perfil; intentos fallidos aparte.
- Distingue: detector automático, revisión del agente, prueba de software y observación humana. No afirmes accesibilidad integral, comprensión del estudiante ni hardware físico desde E2E.
