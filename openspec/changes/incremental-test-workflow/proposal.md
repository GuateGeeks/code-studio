# Proposal

## Why

La regresión Chromium de F1 tarda unos 156 segundos y el build actual reconstruye bundles aunque solo cambie un archivo estático. Necesitamos feedback corto durante la edición y una puerta completa al cerrar, con selección conservadora y evidencia que distinga una prueba parcial de una regresión total.

## What Changes

- Añadir `test:quick`, `test:affected` y `test:full` con planes explicables y códigos de salida fiables.
- Seleccionar E2E por archivos afectados; ampliar a cobertura completa ante cambios compartidos o desconocidos.
- Detectar cambios por contenido frente al último `test:full` exitoso, incluyendo archivos nuevos/eliminados sin requerir HEAD.
- Separar reportes de perfiles y actualizar la referencia de impacto solo después de completar toda la puerta full.
- Convertir el build del navegador en etapas incrementales con entradas y salidas verificadas por hash.
- Verificar selección, invalidación, no-op y recuperación de caché antes de una sola regresión final.

## Capabilities

### New Capabilities

- `test-workflow`: selección de verificación, referencia de cambios y reutilización verificable del build.

### Modified Capabilities

Ninguna canónica. Los contratos y la evidencia funcional de F0/F1 se conservan como entregas históricas.

## Impact

Scripts npm, herramientas de selección/build, configuración smoke de Chromium y pruebas propias de herramientas. No modifica la semántica del producto ni reduce las expectativas de sus E2E. No incorpora paralelismo por defecto a pruebas sensibles de audio/rendimiento ni convierte perfiles rápidos en validación completa. Las mediciones y resultados nuevos se publicarán separados de la evidencia histórica de F1.
