# Tasks

## 1. Línea base

- [ ] 1.1 Reunir fixtures de GGPROJ v1, v2 y v3 y de autosave de cada contexto desde las puertas anteriores; registrar su comportamiento esperado (estado final y trazas) como referencia.
- [ ] 1.2 Consultar CodeGraph sobre `validateProject`, `resolveOperationProfile`, `validateDocument` y sus consumidores; guardar la consulta en artefactos.

## 2. Formato y catálogo

- [ ] 2.1 Implementar lectura y escritura GGPROJ v4 con locks declarados; mantener lectura v1–v3 y comprobarla con los fixtures.
- [ ] 2.2 Implementar migraciones puras por pack (configuración y workspace) conservando IDs; pruebas Node por migración.
- [ ] 2.3 Derivar permisos de operaciones de la versión declarada; eliminar la constante `0.1.0` y probar grants por versión.
- [ ] 2.4 Implementar la cuarentena de pack o versión desconocidos con aviso, conservación de bytes y bloqueo solo del contexto afectado.

## 3. Documentos textuales

- [ ] 3.1 Añadir `runtime.api` y rango compatible de intérprete; asignar API1/API2 a documentos existentes y probar que su texto no cambia.

## 4. Demostración y verificación

- [ ] 4.1 Publicar un pack de prueba `@0.2.0` sin cambios visibles y demostrar apertura, migración, ejecución equivalente, guardado y reapertura desde archivo y autosave.
- [ ] 4.2 E2E de aviso de migración, migración imposible y pack desconocido, sin ejecución automática; `test:affected` con rutas reales y una `test:full`.
- [ ] 4.3 Actualizar `docs/phase-1/GGPROJ.md`, ADR-005 (sustitución registrada en ADR-011) y el acta de resultados con evidencia y límites.
