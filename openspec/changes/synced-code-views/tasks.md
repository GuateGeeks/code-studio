# Tasks

## 1. Viabilidad

- [x] 1.1 Prueba de ida y vuelta sobre el corpus 2D (bloques → JavaScript → IR → bloques) en el worker del lenguaje: mismo programa y mismos IDs en el 100 % del corpus; registrar el resultado y detener el cambio si no se alcanza.

  Primer intento 25/10/2026: **no aprobada**. Worker real del origen de lenguaje: programa/IR y posiciones 9/9; todos los IDs 0/9 (38 IDs de bloques numéricos regenerados). Implementación detenida conforme a esta puerta; véanse [acta y propuesta de continuación](../../../docs/engineering/SYNCED-CODE-VIEWS-VIABILITY.md). El intento se conserva; no se habilitaron vistas.
  Repetición con identidad numérica lateral: **aprobada**, programa/IR, todos los IDs (incluidos shadows) y posiciones **9/9**, **0 IDs perdidos**, rechazo sin ejecución aprobado. Evidencia: `artifacts/synced-code-views/numeric-identity-20261025/browser-attempt-2/results.json` (`accepted: true`). Foco Node 12/12, incluidos 38 cambios de valor. Esta puerta no completa el diff estructural 1.2 ni la integración/UI.

- [x] 1.2 Prueba de propiedad del diff estructural: mutaciones de una línea conservan los IDs no afectados.

  Aprobada el 25/10/2026: 491/491 casos con worker real en el origen del lenguaje; 5.291 nodos con identidad verificada. 489 reconstrucciones exactas y dos rechazos de ámbito antes de aplicar, sin omitir la comprobación de identidad. Semilla 0x5eed25; [acta](../../../docs/engineering/SYNCED-CODE-VIEWS-STRUCTURAL-DIFF.md). No habilita parser genérico ni UI.

## 2. Conversión

- [x] 2.1 Implementar el parser genérico JavaScript (estructuras del núcleo instalado, según la decisión del 25/10/2026, y delegación a la tabla) en `src/targets/text`, con causas y líneas para cada rechazo.

  Verificado: parser dirigido por tablas y reglas instaladas, sin mapa de líneas previo; 8 pruebas focales y 491 casos en worker real (489 reconstrucciones y dos rechazos localizados de ámbito). Evidencia en artifacts/synced-code-views/javascript-parser-20261025/. La integración y aplicación atómica pertenecen a 2.2.
- [x] 2.2 Implementar la correspondencia estructural de IDs, comentarios de bloque y posiciones de eventos; aplicar la IR candidata solo tras validarla en la shell.

  Verificada el 26/10/2026: preparación separada y validación en la shell, comentarios y posiciones conservados; canal propio del origen de lenguaje sin ejecución. Seis casos reales de navegador (cuatro en browser-3, sustitución A/B idénticos en project-switch-fixed y orden lateral en event-order); se conservan los fallos iniciales y sus correcciones. Evidencia en artifacts/synced-code-views/conversion-20261026/. UI y continuidad de vistas siguen en 3.1/3.2.

## 3. Experiencia

- [x] 3.1 Convertir el selector Bloques · JavaScript · Python en vistas del mismo programa para 2D, con texto editable, aviso de formato regenerado y Ejecutar desde cualquier vista sin ejecución al cambiar.

  Verificada el 26/10/2026: JavaScript y Python editables del mismo programa, aviso de formato y ejecución validada desde ambas vistas sin autorun al navegar. Affected del corte 2D aprobado: 469 Node, 76 herramientas y 85 E2E; no es una full. [Acta](../../../docs/engineering/SYNCED-CODE-VIEWS-2D-RESULTS.md).
- [x] 3.2 Implementar el rechazo con tres salidas accesibles por teclado, puntos de restauración y Deshacer; guardar vista activa y texto pendiente en autosave y GGPROJ.

  Verificada: rechazo con línea y tres salidas por teclado, confirmación antes de descartar, puntos y Deshacer; autosave y GGPROJ v5 conservan vista y borrador, con lectores v1–v4. Zoom nativo 200/400 %, reapertura en perfil nuevo, fallo de almacenamiento y visita offline fría aprobados en el grupo afectado. Evidencia: artifacts/synced-code-views/views-20261026/affected-1/.
- [x] 3.3 Decidir y aplicar el documento nuevo en blanco y la ayuda textual (`text-documents-ui.mjs` y `#text-api-help` siguen en API1 con `GG`/`await`; hallazgo de `block-language-contract` 1.3): plantilla API v3 o vista del programa, migrando las pruebas E2E que escriben API1 en documentos nuevos.

  Decisión aplicada: plantillas nuevas API3 con eventos y hero.move, ayuda según la API del documento. Recorridos nuevos migrados a API3; los casos del puente API1 usan fixtures anteriores explícitos, sin sustituir la plantilla nueva por la API antigua. Copias API1/API2 preservadas; E2E de creación, ejecución, descarga y reapertura aprobados.

## 4. Extensión por contextos

- [x] 4.1 Habilitar Python en 2D (análisis con `ast`, carga bajo demanda) con su corpus de ida y vuelta.

  Verificada: ast de Pyodide cargado bajo demanda, nueve programas completos en worker real con IR, workspace, IDs y posiciones iguales; corpus AST local de 491 variantes con IDs no afectados, incluidos comentarios y dos rechazos explícitos de ámbito. Editar, ejecutar desde Python, rechazo y conversión offline fría aprobados. [Acta 2D](../../../docs/engineering/SYNCED-CODE-VIEWS-2D-RESULTS.md).
- [ ] 4.2 Habilitar TypeScript en micro:bit sobre las plantillas Static TypeScript; HEX idéntico tras ida y vuelta sin cambios. **Trasladada** a `synced-code-views-capability-contexts` 1.x, fuera del cierre de este cambio, por la decisión del usuario del 29/10/2026 de estabilizar primero 2D (plan de estabilización 2D). No implementada aquí; la casilla se conserva sin marcar. El borrador sin conectar ni probar de ese día se retiró de `src/` y se conserva en `artifacts/synced-code-views/microbit-20261029/draft/`.
- [ ] 4.3 Habilitar 3D y web; resolver la pregunta de bloques grises o rechazo y registrarla en este diseño. **Trasladada** a `synced-code-views-capability-contexts` 2.x por la misma decisión del 29/10/2026; no implementada aquí.

## 5. Actividades, documentación y verificación

- [x] 5.1 Publicar la revisión 2 de «De bloques a tu propio código» con checks de programa; conservar la revisión 1 y su progreso.

  Verificada el 29/10/2026: revisión 2 (`edited-in-text`, posición y movimiento en bloques) y revisión 1 seleccionable como `text-transition@1` con su progreso por revisión. Node 5/5 nuevas, suites existentes migradas a `@1`; navegador 3/3 focal y 3/3 dentro de la full intento 1 (fallida solo por un caso ajeno intermitente). [Acta E0](../../../docs/engineering/STABILIZATION-E0-RESULTS.md).
- [ ] 5.2 E2E por contexto habilitado (2D tras el re-alcance del 29/10/2026): mirar y volver sin cambios, editar y volver, rechazo y copia, Deshacer, reapertura, teclado y zoom; `test:affected` y una `test:full`.
- [ ] 5.3 Actualizar `PRODUCT.md`, ADR-011 (estado: implementada para 2D; micro:bit y 3D/web trasladados), guía docente, guion de observación del Exp. 1 y acta de resultados con límites.

  Nota de 5.3: documentación del corte 2D actualizada (PRODUCT, README, ADR-011 parcial, guía docente, guion Exp. 1 y acta). El estado implementado global de ADR-011 y el acta completa quedan pendientes de las extensiones, actividad y full.
