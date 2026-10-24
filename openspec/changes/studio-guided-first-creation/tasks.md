# Tasks

Las tareas siguientes están completadas y respaldadas por los [resultados E1](../../../docs/product/FIRST-CREATION-RESULTS.md) y su evidencia. Los requisitos GG-ENTRY se encuentran en [la especificación](specs/studio-entry-journey/spec.md); las decisiones y límites están en [design.md](design.md).

## 1. Base revisable y contexto de implementación

- [x] 1.1 Capturar inventario y snapshot verificable del producto antes de editar, dado que el checkout aparece completo sin seguimiento Git; verificar hashes y recuperación de una muestra en una carpeta temporal, sin modificar upstreams ni evidencia F0–F7.
- [x] 1.2 Registrar en `PRODUCT.md` y `DESIGN.md` el público principiante con docente confirmado, decisiones existentes, hipótesis de jerarquía y pendientes de edad, equipos y marca; verificar trazabilidad a fuentes y que ninguna hipótesis se presente como aprobación del usuario.
- [x] 1.3 Observar la interfaz actual y registrar capturas de entrada/editor a 1280×900 y 390×844 junto con mapa de IDs y foco de los controles a mover; verificar inicio, recuperación, selección de actividad y ejecución actual con controles reales antes del cambio visual.
- [x] 1.4 Consultar CodeGraph sobre proyecto, actividades y composición del shell antes de modificar sus conexiones; guardar las consultas relevantes y comprobar que el mapa identifica sus controladores, pruebas y fronteras sin importar internals de runtimes.

## 2. Entrada y primera creación protegida

- [x] 2.1 Exponer el resultado real de recuperación mediante estado o notificación de solo lectura del controlador de proyecto, si su API actual no basta; verificar buscando/sin copia/recuperado/respaldo/bloqueado sin deducir estado de textos DOM ni crear almacenamiento nuevo (GG-ENTRY-001/005).
- [x] 2.2 Implementar la entrada con Continuar, primera creación 2D, actividad y Abrir usando los controladores y nodos existentes; verificar nombres accesibles, estados disponibles y ausencia de ejecución o reemplazo al navegar (GG-ENTRY-001/002).
- [x] 2.3 Conectar primera creación al starter 2D validado y al reemplazo protegido existente; verificar que un fallo de protección conserva autoría y borradores, y que una carga válida conduce al editor sin autoejecutar (GG-ENTRY-002/003).
- [x] 2.4 Añadir `tests/browser/studio-entry-journey.spec.mjs` con primera visita, regreso recuperado, selección informativa y archivo inválido; verificar mediante interacción real que los hashes/IDs de autoría se conservan cuando no se confirma una carga y que editar→ejecutar cambia el resultado previsto.
- [x] 2.5 Documentar la entrada y el significado de continuar/crear/cargar en la guía del recorrido o guía docente existente; contrastar las instrucciones con los controles implementados y los estados reales de recuperación.

## 3. Ejecución visible y herramientas avanzadas

- [x] 3.1 Reorganizar editor, resultado y transporte principal para identificar los bloques 2D activos, conservando `run-editor`, Stop y sus controladores; verificar Run→Stop→Run con autoría preservada y sin mensajes tardíos aplicados (GG-ENTRY-004).
- [x] 3.2 Agrupar corpus y diagnóstico GG bajo herramientas avanzadas manteniendo IDs, handlers y selección; verificar apertura/cierre por teclado, foco útil, funciones existentes y ausencia de ejecución por revelar el panel (GG-ENTRY-006).
- [x] 3.3 Ajustar mensajes y nombres contextuales de acciones afectadas, conservando código derivado de solo lectura y copias independientes; verificar transición de bloques a copia, edición sin sincronización inversa y navegación a micro:bit/3D/web (GG-ENTRY-004/007).
- [x] 3.4 Ampliar la suite del recorrido y adaptar únicamente las interacciones de acceso a controles movidos en las pruebas existentes; ejecutar casos focales de bindings, consola, equivalencia textual y contextos, y documentar la ubicación final de herramientas avanzadas.

## 4. Guardado, recuperación y continuidad local

- [x] 4.1 Mantener visibles guardado pendiente/confirmado/fallido, recuperación y descarga portable durante entrada y trabajo; comprobar commit real, cuota no disponible y recuperación desde respaldo con `project-persistence.spec.mjs` y los casos nuevos del recorrido (GG-ENTRY-005).
- [x] 4.2 Verificar que los nuevos elementos de presentación forman parte del build local y de la preparación offline existente sin añadir orígenes ni servicios; ejecutar el caso de visita preparada con navegador reiniciado y servidores apagados, y comprobar Continuar→editar→ejecutar en el recorrido (GG-ENTRY-009).
- [x] 4.3 Actualizar la ayuda de recuperación/offline afectada, conservando el límite de la edición aún no confirmada y la dependencia del perfil del navegador; verificar que la documentación coincide con los resultados de persistencia y offline del corte.

## 5. Accesibilidad y comprobación visual

- [x] 5.1 Ajustar orden de foco, enlaces de salto, redimensionamiento de Blockly y comportamiento de paneles tras la nueva composición; ejecutar `accessibility-shell.spec.mjs` y `accessibility-runner.spec.mjs` explícitamente y comprobar que la edición y salida del escenario funcionan con teclado (GG-ENTRY-008).
- [x] 5.2 Ejecutar `accessibility-zoom.spec.mjs` con Chromium completo a zoom real 200/400 % y revisar el recorrido a 1280×900 y 390×844; guardar capturas verificadas y corregir controles inaccesibles, foco oculto o desplazamiento horizontal global (GG-ENTRY-008).
- [x] 5.3 Comprobar los estados reales y cualquier movimiento añadido con `prefers-reduced-motion`; verificar que el recorrido conserva feedback comprensible sin animación y documentar los patrones efectivamente implementados en `DESIGN.md`.
- [x] 5.4 Actualizar `tools/test/impact.mjs` para incluir recorrido y suites de accesibilidad cuando cambia HTML/CSS de Studio, preservando selección conservadora para fronteras compartidas; añadir casos conductuales en `test-impact.test.mjs`, ejecutarlos y contrastar la salida de `test:affected -- --files src/studio/index.html src/studio/style.css --list`.

## 6. Integración y evidencia de cierre

- [x] 6.1 Consolidar el recorrido crear→editar→ejecutar→detener→descargar→cerrar→reabrir junto con recuperación, herramientas avanzadas y otros contextos; ejecutar el grupo afectado sobre las rutas finales y registrar resultados sin sumar corridas focales como una puerta completa.
- [x] 6.2 Con fuentes estables, ejecutar una vez `npm run test:full`, resolver cualquier fallo mediante reproducción focal y repetir la puerta solo cuando corresponda; verificar OpenSpec, preservación upstream, dependencias y reportes separados conforme a `docs/engineering/TESTING.md`.
- [x] 6.3 Sincronizar CodeGraph, comparar las modificaciones con el snapshot inicial y redactar el resultado del corte con requisitos comprobados, comandos, capturas y limitaciones; verificar que no se atribuyen pruebas humanas, escolares, físicas o de rendimiento ajeno a esta ejecución.

## Workflow follow-up

- El archivo administrativo del cambio no forma parte de este corte; conservar los cambios históricos sin archivarlos como efecto secundario.
- La aceptación con docentes/alumnos, equipos escolares y tecnologías de asistencia se registra por separado cuando exista evidencia real; las pruebas automatizadas no la sustituyen.
