# ADR007: Autoría micro:bit y transferencia separada

Fecha:22 de octubre de2026. Estado: aceptada e implementada; software F4 consolidado. Prueba física pendiente.

> **Sustitución parcial (25 de octubre de 2026):** [ADR-011](011-contrato-de-lenguaje-y-vistas-sincronizadas.md) sustituye el `switch` fijo a Static TypeScript por plantillas declaradas en la tabla de `gg.microbit`, con texto idéntico al anterior. Se conservan los documentos independientes, la compilación en worker, la validación HEX y la transferencia USB.

GGPROJ3 fija gg.microbit del catálogo local con deviceId, variante, modo y BlockGraph plano. El workspace tiene48 nodos,8 hats, profundidad4 y8KiB; configuración agregada16KiB. deviceId usa ASCII de hasta64 caracteres; los IDs de bloques conservan128. Bloques y deviceSource son documentos independientes: alternar modo conserva ambos. StaticTS, sourceMap, binarioJS, HEX y estado mutable quedan fuera de autoría.

El coordinador inyecta participantes y materializa snapshots sin duplicar el grafo mutable. Prepara todos antes del commit y restaura checkpoints opacos, incluidos borradores inválidos. Las proyecciones de ejecución permiten usar 2D/texto aunque el borrador de dispositivo sea inválido. El contexto seleccionado es preferencia de interfaz. La consola usa origen además del ID para seleccionar el workspace correcto.

La IR propia contiene solo firmware revisado, con sourceBlockId original. El generador usa APIs basic/input/led reales; ningún campo aporta TS arbitrario. Los mapas UTF16/líneas se aplican solo a main.ts. Operaciones de sprites se diagnostican antes de invocar PXT. La compilación sigue en worker y usa core/radio/microphone y caches nativas locales; un paquete/hash ausente falla sin red.

Cada operación tiene sesión, dispositivo, revisión y petición. Simulación añade generación y revisión de escena. El runner valida de nuevo y regenera fuente; el textarea mostrado no concede autoridad ejecutable. La precompilación ocurre antes de reemplazar el runner para conservar la escena ante un fallo de firmware. Stop y edición revocan resultados y errores tardíos.

El bridge observa queue del bus de esa instancia del simulador, preservando su llamada y restaurándola al Stop. Incluye eventos que pueda elevar el propio programa PXT; no afirma gesto físico. Solo A/B/AB se traducen a microbit-A/B/AB. Scope, secuencia y cuotas20/s y1024/run se verifican en ambos extremos. No se inventa un GG dentro del firmware ni transporte conectado de sensores físicos.

El panel TypeScript legacy también revoca resultados y rechazos al editar su fuente. Sus errores de petición viajan por la respuesta autenticada y se reportan en Studio solo si el intento sigue vigente, evitando un diagnóstico paralelo sin revisión de fuente.

La descarga conserva bytes exactos de PXT y valida registros/checksums/variantes, con límite4MiB. La versión instalada puede añadir metadata inerte0E después de EOF y separadores vacíos: se aceptan sin normalizar el archivo; registros ejecutables posteriores y EOF duplicado se rechazan. Cada artefacto se liga a autoría/variante y SHA del compiler-pack real.

DAPjs2.3.0 se empaqueta localmente. Solo la página superior device-transfer.html recibe usb=(self); las demás rutas/iframes/workers mantienen usb=(), frame-ancestors none y CSP existente. Un canal autentica opener/origen/nonce y vuelve a verificar artifact/scope/hash. No hay selector automático: conectar y transferir requieren acciones explícitas. Cancelar/editar/Stop revoca pendientes; no se promete restaurar firmware anterior. El progreso se limita a101 estados por transferencia.

La allowlist de placa/firmware se basa en las versiones publicadas por la Fundación; otras combinaciones conservan la descarga. [DAPLink micro:bit](https://tech.microbit.org/firmware/daplink-interface/), [formato Universal HEX](https://tech.microbit.org/firmware/spec-universal-hex/), [DAPjs](https://github.com/ARMmbed/dapjs) y [WebUSB en MakeCode](https://makecode.microbit.org/device/usb/webusb) son referencias primarias. Las pruebas con doble de transporte no certifican flasheo ni autonomía de una placa. La aceptación física queda pendiente hasta evidencia real.

[OpenSpec F4](../../openspec/changes/archive/2026-10-24-phase-4-microbit-integration/design.md) y [resultados](../phase-4/RESULTS.md).
