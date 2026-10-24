# Design

## Context

Ver `proposal.md`. El shell ya compone 2D con una barra común, autoría izquierda y resultado más consulta derecha. micro:bit mantiene controles y firmware dentro de una sección larga; su resultado combinado ocupa 650 px en vertical. Device UI posee modos, artefactos y guardas; el controlador de composición solo debe presentar sus instancias. No hay especificaciones consolidadas; se conservan los cambios previos sin archivar.

## Goals / Non-Goals

**Goals:** reutilizar la composición E4 y los controles existentes, proyectar una sola instancia TypeScript y hacer simultáneamente legibles simulador y escena.

**Non-Goals:** nuevos bloques o motores, conversión bidireccional, nuevas actividades, cambios de formato o transporte, integración visual SB3/3D/web, aceptación escolar o certificación física.

## Decisions

### Composición y propiedad

Mover Ejecutar/Detener al transporte común y firmware al dock sin cambiar IDs o listeners. Pasar la lectura y suscripción del dispositivo al controlador contextual. Mover el único panel TypeScript al área principal en modo texto y al dock en modo bloques; conservar nodo, valor, selección y foco. Se descarta duplicar editores porque introduce sincronización y ambigüedad de autoría. La consulta nunca cambia el modo ni llama al runtime.

### Resultado conjunto adaptable

Extender los selectores de composición a micro:bit. Dentro del iframe combinado, disponer escenario y placa en columnas cuando caben; mantener composición vertical en anchos menores. No mover ni recrear iframes de runtime. Se descarta reducir toda la simulación a una miniatura o sustituirla por captura estática. La geometría de puntero seguirá el rectángulo real de la imagen, conservando letterbox.

### Direction contract

1. **Escena y jerarquía:** Operate; principiantes acompañados, editar → predecir → ejecutar → comparar LEDs y escena. La barra identifica la acción; firmware es consulta secundaria.
2. **Mundo:** conservar PRODUCT.md y DESIGN.md, verde de acción, superficies claras, bordes finos y tipografía system-ui. Scratch/MakeCode orientan la proximidad espacial, no una copia de marca.
3. **Composición:** bloques o texto a la izquierda, resultado conjunto arriba a la derecha, herramientas desplazables debajo. En estrecho usar el orden natural, sin controles fijos que oculten autoría.
4. **Detalle:** controles nativos con nombres españoles completos, 44 px de objetivo, foco cálido existente, fuente derivada de solo lectura, estados de compilación explícitos.
5. **Interacción:** el documento y los runtimes conservan identidad; navegación no ejecuta. Sin animación añadida en una herramienta de trabajo; respetar reduced-motion, zoom y teclado.
6. **Verificación:** capturas de escritorio y estrecho, controles reales, modo independiente, Stop, recompilación, guardas, importación y offline; revisión fresca de Impeccable y documentación del mundo final.

Es una extensión local precisa fijada por el usuario. Aplica la excepción de `impeccable/reference/new-work.md §3`: no ejecutar semilla ni torneo de conceptos para una extensión local. El contrato es code-led sobre el mundo ya establecido; no requiere nuevos assets.

## Risks / Trade-offs

- [Reparentado del texto pierde foco] → conservar nodo y selección; restaurar foco solo si estaba dentro del panel.
- [Controles de firmware operables sin dispositivo] → mantener deshabilitado según disponibilidad y explicar el estado vacío.
- [Resultado pequeño o recortado] → CSS por ancho interno y comprobar LEDs, botones y movimiento reales, no solo cajas.
- [Cambio compartido afecta otros contextos] → selectores acotados, pruebas 2D/accesibilidad/zoom y puerta completa con upstreams preservados.
- [Simulación se interpreta como prueba física] → mantener diferencias explícitas y no acreditar hardware sin placa.

## Migration Plan

No hay migración de datos ni dependencias. Conservar una instantánea restaurable antes del cambio y la puerta aprobada 2D en artefactos. Generar una nueva release local aislada para revisión; la versión 2D anterior permanece disponible. Revertir solo estos archivos propios si la integración falla, sin limpiar upstreams.
