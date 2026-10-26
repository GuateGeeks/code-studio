# Tasks

Encargo de implementación completado con code-studio-worker como único escritor y coordinación de solo lectura. Archivo y preparación selectiva del índice autorizados posteriormente el 25/10/2026; el coordinador realizará el commit local, sin push. Evidencia en `artifacts/scene2d-journey-stabilization/implementation-20261025/`.

## 1. Estado y metadatos locales

- [x] 1.1 Acordar escritor de project-ui/autosave/UI y ventana de pruebas con code-studio-worker; verificar el acuerdo y registrar consultas CodeGraph de sus consumidores antes de modificar fronteras.
- [x] 1.2 Implementar el derivador de estados local/portable y la identidad por contenido, excluyendo fechas/revisión; verificar PC-01 con edición durante guardado, cambios de nombre/documentos/recursos y metadatos sin cambio de autoría.
- [x] 1.3 Implementar registro opcional de esquema 1 por proyecto en IndexedDB y degradación a memoria; verificar PC-06 con registro ausente/corrupto, fallo de escritura y lector previo, conservando current/previous y sin incrementar autoría.
- [x] 1.4 Documentar campos, alcance local y compatibilidad del registro en el acta del corte; verificar que no aparecen en GGPROJ exportado y ejecutar las pruebas focales de este grupo.

## 2. Descarga y presentación

- [x] 2.1 Integrar una sola captura para bytes/nombre/huella y registrar solo tras entrega al navegador; verificar PC-03 con descarga real, empaquetado retardado y fallo, respetando GG-PROJECT-011 del cambio de estabilización.
- [x] 2.2 Invalidar resultados asíncronos al cambiar de proyecto y resolver la vigencia al recuperar otra captura; verificar PC-04 con A→B, reapertura, perfil limpio y fallback a previous.
- [x] 2.3 Presentar ambos estados y renombrar la acción existente a «Llevar o entregar», sin duplicar manejadores; verificar PC-01/02 con autosave fallido, copia solicitada y reintento exitoso mediante UI.
- [x] 2.4 Añadir recordatorio dentro de Studio y aviso nativo complementario solo para cambios locales pendientes; verificar PC-05 con reemplazo bloqueado, cierre confirmado y transacción pendiente/abortada, sin exigir diálogo universal.
- [x] 2.5 Actualizar ayuda de continuidad y guía docente con límites de navegador/archivo y capturas del corte; comprobar que no prometen envío académico, archivo en disco ni guardado al cerrar, y ejecutar quick/affected de los archivos de este grupo.

## 3. Integración y evidencia

- [x] 3.1 Verificar PC-07 con teclado, foco, ancho reducido, zoom real 200/400% y preparación offline válida; conservar evidencia sin atribuirla a lector humano o equipos escolares.
- [x] 3.2 Ejecutar affected y la puerta completa en ventana y congelación acordadas, o enlazar la misma corrida conjunta de scene2d-journey-stabilization que cubra ambos inventarios; verificar PC-01…07, specs estrictas, exitCode 0 y upstreams preservados.
- [x] 3.3 Consolidar PROJECT-CONTINUITY-RESULTS con casos, huella de código, fallos y límites; verificar vínculos y sincronizar CodeGraph si cambió código. Mantener revisión docente como evidencia externa pendiente.

## Workflow follow-up

- Presentar implementación y evidencias completas para revisión. Sin archivo, commit ni push en este encargo.
- Archivo, commit y push no forman parte de la preparación del plan.

Cierre técnico: puerta conjunta aprobada (435 Node, 74 herramientas, 3 smoke + 214 regresiones), specs 36/36, upstreams 3/3 y fuentes congeladas. Actas y huellas en `docs/engineering/` y `artifacts/scene2d-journey-stabilization/implementation-20261025/`. Observación humana pendiente.
