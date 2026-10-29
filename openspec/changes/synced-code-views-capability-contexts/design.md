# Design

## Context

Trabajo trasladado desde `synced-code-views` (4.2 y 4.3) el 29/10/2026. Se reutilizan el canal aislado de conversión, el estado `codeViews` (que ya admite la entrada `microbit` con `blocks|typescript`), los puntos de restauración y la UI de rechazo del corte 2D.

## Decisions

1. **micro:bit primero, con una puerta previa sin UI.** Antes de tocar la interfaz, ida y vuelta bloques → TypeScript → bloques sobre las plantillas instaladas: mismo programa, todos los IDs, layout y HEX idéntico con PXT real, sin editar. Se registran la variante y el entorno, y se conservan los intentos por separado.
2. **El texto es la fuente que compila PXT.** PXT incrusta la fuente en el HEX, así que un HEX idéntico exige un texto idéntico byte a byte. La vista se genera con `generateDeviceSource`, sin otro formateador.
3. **Evento «al iniciar» vacío.** No produce texto. Al volver se conserva el bloque existente, con su ID y su posición.
4. **Comentarios.** El grafo del dispositivo no los admite. Decisión pendiente: rechazarlos con su línea (sin pérdida y sin cambiar el contrato) o ampliar el contrato del grafo. Mientras no se decida, se rechazan.
5. **3D/web.** Rechazo por defecto fuera del subconjunto. Se registra la decisión sobre bloques grises antes de incorporarlos.

## Antecedente

Borrador del 29/10/2026, sin conectar ni probar: parser dirigido por plantillas con Acorn, correspondencia de IDs y `deviceGraphFromIR`. Se retiró de `src/` y se conserva en `artifacts/synced-code-views/microbit-20261029/draft/`. No acredita ninguna tarea.
