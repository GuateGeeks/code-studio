---
name: gg-browser-first
description: Revisar cambios de ejecución, persistencia, importación u offline de Code Studio para conservar el aislamiento local y la separación entre autoría y runtime.
---

# Arquitectura local de Code Studio

Aplica estas restricciones al comportamiento afectado; una edición de texto o estilo sin impacto en estas fronteras no requiere una auditoría completa.

## Contexto y fronteras

- Consulta el [README](../../../README.md), los [ADRs](../../../docs/adr/README.md) pertinentes y las actas actuales. F0/F1 son evidencia histórica; F6/F7 documentan la ampliación posterior.
- Conserva los seis roles con orígenes separados: shell, runner 2D, simulador micro:bit, lenguajes, escena 3D y app web. No fusiones orígenes para simplificar interfaz o servidor.
- Blockly produce autoría/IR; los adaptadores integran Scratch/PXT. QuickJS, Pyodide y su parser pertenecen a `src/targets/text`. Shell y renderers no evalúan texto libre del alumno.
- Consulta CodeGraph antes de cambiar fronteras y conserva consultas útiles. CLI es suficiente si el MCP no está disponible; configuración local no implica conexión activa.
- Una skill no justifica reemplazar motores, framework, formatos o versiones fijadas. Un cambio arquitectónico solicitado necesita decisiones y aceptación en el cambio correspondiente.

## Invariantes que preservar

- Autoría inicial, IDs, recursos y versiones se guardan; logs y estado mutable de ejecución no redefinen la autoría.
- Abrir, recuperar y crear una copia textual no ejecutan programas automáticamente. La ejecución requiere la acción correspondiente.
- La fuente derivada es de solo lectura. «Crear copia JavaScript/Python» crea un documento independiente sin sincronización bidireccional implícita.
- Mensajes y referencias conservan comprobaciones de origen, fuente, sesión, revisión y contexto. Stop invalida la ejecución anterior y conserva el trabajo.
- Las importaciones se validan antes del reemplazo. Un archivo o pack desconocido no concede permisos para descargar o ejecutar extensiones externas.

## Persistencia y uso sin conexión

- Conserva lectores, límites, locks y migraciones GGPROJ soportados. Consulta el [formato](../../../docs/phase-1/GGPROJ.md) y los [contextos F6](../../../docs/phase-6/RESULTS.md) para el alcance actual.
- «Guardado en este navegador» corresponde a una transacción confirmada; no promete nube, otro perfil ni ediciones pendientes dentro del debounce.
- Una importación inválida o recuperación fallida conserva el trabajo disponible y ofrece un siguiente paso. No elimines copias dañadas silenciosamente.
- Offline requiere preparar y verificar todos los roles/recursos del conjunto antes de seleccionarlo; una actualización parcial no sustituye al conjunto válido anterior.
- Comprueba segunda visita con proceso cerrado y servidores detenidos cuando cambie ese contrato. Una recarga con caché o prueba Node no demuestra esa capacidad.
- Autoría y recuperación no requieren cuenta. Justifica cualquier servicio obligatorio nuevo frente a ese comportamiento y al alcance autorizado.

## Evidencia proporcional

Ejecuta en WSL con `source ../scripts/env.sh` y sigue [TESTING](../../../docs/engineering/TESTING.md): caso que reproduce el cambio, `test:quick` durante edición, `test:affected -- --files <rutas>` por impacto y `test:full` al consolidar fuentes estables. Consulta `--list` si el alcance es incierto.

- Verifica dependencias/fronteras cuando cambien importaciones y sincroniza CodeGraph tras cambios de código relevantes.
- No presentes quick/affected como full ni sobrescribas actas históricas. Para cambios solo documentales valida especificaciones sin repetir suites aprobadas.
- Separa evidencia Node, navegador, offline frío, equipo escolar, lector humano y hardware físico. La [matriz de compatibilidad](../../../docs/phase-7/COMPATIBILITY.md) conserva esos límites.
- Registra en OpenSpec invariantes afectados, pruebas ejecutadas y pendientes reales; no añadas gates de servicios ajenos al cambio.