# Proposal

## Why

micro:bit conserva una composición larga que separa el programa, el resultado conjunto y el firmware. Extender el editor integrado 2D permite a principiantes con docente cambiar un bloque, predecir LEDs y movimiento y contrastarlos sin abandonar el espacio de trabajo.

## What Changes

- Integrar bloques o el documento TypeScript existente en el área de autoría; conservar ambas versiones independientes.
- Situar Ejecutar/Detener en la barra común y mantener placa simulada y escena juntas en el resultado.
- Agrupar firmware, fuente derivada, descarga HEX y transferencia USB en la consulta lateral con ayuda contextual.
- Mantener navegación por teclado, composición estrecha y zoom real, recuperación sin autorun y revocación de artefactos obsoletos.
- Verificar el incremento con pruebas de controles reales, regresión completa y evidencia separada de simulación, offline y placa física.

## Capabilities

### New Capabilities

- `integrated-microbit-workspace`: composición contextual de autoría micro:bit, simulación conjunta y consulta de firmware sin alterar sus contratos de ejecución.

### Modified Capabilities

Ninguna especificación consolidada; el inventario de `openspec/specs` está vacío. Se conservan los contratos de los cambios previos sin archivar.

## Impact

Shell HTML/CSS y composición contextual, presentación del resultado combinado y controles de dispositivo. Se reutilizan Blockly, PXT y Scratch existentes, GGPROJ y los seis orígenes. Sin dependencias nuevas, cambios upstream ni nuevas actividades. Este corte no extiende la composición integrada a SB3, 3D o web ni acredita pruebas en una placa física o en aula.
