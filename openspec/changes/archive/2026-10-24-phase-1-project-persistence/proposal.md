# Proposal

## Why

El runner ya conserva autoría durante Run/Stop, pero cerrar o recargar pierde el proyecto. El primer corte de F1 debe convertir esa autoría en un archivo portable y una revisión local recuperable, con importación validada antes de modificar el trabajo abierto.

## What Changes

- Implementar documento GGPROJ v1 y archivo ZIP acotado con manifiesto, Blockly, fuente de dispositivo, estado inicial, assets propios y locks.
- Integrar descarga/apertura en la UI existente, conservando IDs, nombre y comportamiento al reabrir, sin ejecución automática.
- Validar documento, recursos y workspace en preparación separada antes de sustituir autoría o invalidar el runner.
- Añadir autosave IndexedDB transaccional con revisión actual/anterior y recuperación tras recarga/cierre.
- Exponer errores de almacenamiento y recuperación sin bloquear edición, ejecución ni exportación.
- Probar importación inválida, corrupción, cuota, reapertura y Stop en Chromium y conservar las regresiones F0.

## Capabilities

### New Capabilities

- `project-persistence`: documento portable, importación atómica, autosave y recuperación de autoría.

### Modified Capabilities

Ninguna canónica. Se conservan los contratos del cambio F0 completado; no se modifica ni archiva su evidencia histórica.

## Impact

Módulos propios en `src/`, integración en el shell/editor y build estático existentes, pruebas Node/Chromium y documentación F1. Los motores upstream permanecen intactos. El alcance es el primer corte de persistencia de F1; no incluye editor general de assets, importación SB3, offline de segunda visita, consola completa ni lenguajes nuevos. GGPROJ v1 admite recursos del catálogo local fijado y ZIP sin compresión, con límites explícitos; no promete compatibilidad con formatos que aún no existen.
