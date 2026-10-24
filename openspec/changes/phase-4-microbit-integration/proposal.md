# Micro:bit integrada con autoría contextual

## Why
F3 ya ofrece capacidades portables y preparación offline. El panel PXT existente conserva una fuente textual y demuestra compilación/simulación, pero todavía no representa un objeto dispositivo ni bloques contextuales, descargas de firmware o interacción con la escena.

## What Changes
Añadir gg.microbit local revisado, un dispositivo persistible, BlockGraph propio acotado, IR de firmware validada y Static TypeScript derivado de solo lectura. Conservar deviceSource como documento independiente. Incorporar simulación conjunta con puente de botones autenticado, diagnósticos por bloque, descarga HEX y transporte WebUSB explícito donde sea compatible.

## Impact
Modelos/packs, coordinación de autoría, editor contextual, target PXT/simulador, shell/diagnósticos, build e inventario offline. GGPROJ1/2 y el contenedor GGPROJ3 se conservan. No modificar motores upstream ni ampliar CSP. La prueba física requiere placa y no se sustituye por simulación o mocks.
