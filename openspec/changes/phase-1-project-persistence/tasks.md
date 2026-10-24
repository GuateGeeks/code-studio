# Tasks

## 1. Documento y archivo portable

- [x] 1.1 Implementar documento GGPROJ1, catálogo/locks y límites propios; verificar con pruebas Node round-trip y rechazo de versión, recurso, hash, referencia y metadatos desconocidos.
- [x] 1.2 Implementar ZIP STORE acotado; verificar en Node manifiesto/recursos y rechazo de truncado, CRC, rutas, duplicados, compresión y tamaños no soportados.
- [x] 1.3 Documentar esquema, catálogo permitido, límites y diferencia entre archivo ZIP y JSON de autosave; comprobar que diseño y documentación F1 coincidan con las APIs implementadas.

## 2. Apertura y reapertura desde el editor

- [x] 2.1 Preparar Blockly/IR antes de sustituir autoría y sesión; verificar en Chromium que un archivo inválido conserve workspace, fuente, escena y recuperación previos.
- [x] 2.2 Integrar descarga y apertura real; verificar en Chromium exportar, cerrar, abrir y ejecutar con los mismos IDs, recursos y comportamiento, sin ejecución automática al abrir.
- [x] 2.3 Añadir controles y estados de proyecto accesibles en escritorio/móvil; verificar etiquetas, captura y ausencia de desbordamiento, y documentar su uso en los resultados F1.

## 3. Autosave y recuperación local

- [x] 3.1 Implementar cola y transacción actual/anterior con confirmación al commit; verificar validación previa en Node y conservación atómica de copias ante fallo de escritura en IndexedDB real.
- [x] 3.2 Restaurar copia actual o respaldo válido al iniciar; verificar en Chromium recarga, corrupción actual y corrupción de ambas sin borrado ni sobrescritura automática antes de decidir.
- [x] 3.3 Mostrar denegación/cuota y permitir reintento, edición, ejecución y exportación; verificar los escenarios con errores inyectados en Chromium sin falso estado de guardado.
- [x] 3.4 Documentar debounce, revisión confirmada, recuperación y límites de cierre/almacenamiento; verificar que la UI distinga cambios pendientes de commit y que el informe no prometa guardar ediciones todavía pendientes.

## 4. Integración y evidencia

- [x] 4.1 Verificar Stop/reinicio con trabajo pendiente y rechazo de referencias antiguas sobre autoría recuperada; comprobar que ejecución y bindings no alteren las revisiones persistentes.
- [x] 4.2 Ejecutar build y regresiones completas Node/Chromium, comprobar línea base upstream, sincronizar CodeGraph, publicar evidencia F1 y validar OpenSpec estrictamente con resultados y límites actuales.

## Workflow follow-up

- Revisar la evidencia del corte persistente antes de archivar administrativamente el cambio.
- Conservar la evidencia F0 como histórica; el corte no completa toda F1 ni valida firmware físico, PWA de segunda visita o rendimiento escolar.
