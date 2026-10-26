# Tasks

Encargo de implementación completado con code-studio-worker como único escritor y coordinación de solo lectura. Archivo y preparación selectiva del índice autorizados posteriormente el 25/10/2026; el coordinador realizará el commit local, sin push. Evidencia en `artifacts/scene2d-journey-stabilization/implementation-20261025/`.

## 1. Base de implementación coordinada

- [x] 1.1 Acordar con code-studio-worker escritor único, archivos compartidos y ventana de pruebas antes de modificar código; registrar el acuerdo y comprobar que no hay un full concurrente.
- [x] 1.2 Registrar commit/diff y mapear SJ-01…12 a las pruebas existentes; entregar una matriz que distingue cobertura reutilizada, huecos y resultados todavía pendientes.
- [x] 1.3 Consultar CodeGraph de createProjectUI, createProjectAuthoring y createAutosaveStore antes de tocar sus fronteras; guardar consultas y una lista acotada de consumidores en la evidencia del cambio.

## 2. Recorrido actual y fallos reproducibles

- [x] 2.1 Ampliar entrada/persistencia solo donde falte cobertura para SJ-01/02/03; comprobar por UI x21 tras editar la semilla, x0 al detener/reabrir, autoría completa e IDs/shadows iguales en recuperación local y archivo real en perfil limpio.
- [x] 2.2 Cubrir SJ-04 y GG-PROJECT-011 con empaquetado retardado, edición posterior y cambio A→B; corregir solo fallos reproducidos y verificar que bytes, nombre y referencia de copia pertenecen a una única captura.
- [x] 2.3 Reutilizar/ampliar SJ-05/06/07/11 para archivo inválido/cancelación, cuota/denegación, respaldo y guardado lento; comprobar última revisión durable, conservación ante rechazo y reintento exitoso; registrar cualquier corrección junto a su reproducción.
- [x] 2.4 Cubrir SJ-08 con espera/audio y diez ciclos Run/Stop; comprobar autoría inmutable y ausencia de efectos tardíos en la nueva ejecución usando las suites existentes.
- [x] 2.5 Ejecutar quick y affected de los archivos modificados en este grupo, en ventana acordada; actualizar la matriz y los límites de recuperación en la documentación del corte, sin alterar evidencia histórica.

## 3. Continuidad y experiencia integrada

- [x] 3.1 Completar las tareas de [project-continuity-model](../2026-10-25-project-continuity-model/tasks.md) en su propio cambio antes de cerrar SJ-12; verificar los casos PC-01…07 y enlazar resultados sin reimplementar su indicador aquí.
- [x] 3.2 Verificar SJ-09 reutilizando offline-recovery: preparación válida, regreso sin servidores, recuperación, edición, Run/Stop y archivo portable; corregir únicamente regresiones demostradas y conservar el informe de navegador real.
- [x] 3.3 Verificar SJ-10 y SJ-12 con teclado, ancho reducido y zoom real 200/400%; comprobar foco, estados y «Llevar o entregar» sin introducir otro escritor de UI.
- [x] 3.4 Actualizar la guía del recorrido con capturas del corte verificado y garantías de guardado/descarga; comprobar que las instrucciones corresponden a controles reales y no prometen sincronización, envío escolar ni guardado al cierre abrupto.

## 4. Integración y cierre técnico

- [x] 4.1 Coordinar congelación de fuentes/documentos, comprobar carga de cinco minutos menor de 6 y puertos libres; ejecutar affected y una puerta full que incluya ambos cambios. Verificar exitCode 0, specs estrictas, upstreams preservados y ninguna fuente modificada durante la corrida.
- [x] 4.2 Consolidar el acta SCENE2D-JOURNEY-STABILIZATION-RESULTS con matriz SJ/PC, huella de código, comandos, resultados y límites; actualizar solo estado vigente de README/PRODUCT/NEXT-SESSION tras liberación de esos archivos por el worker, validar specs y sincronizar CodeGraph si cambió código.
- [x] 4.3 Entregar un guion de observación docente para crear, recuperar y explicar dónde está el trabajo; comprobar que diferencia software aprobado de observación humana pendiente y no marca comprensión como demostrada por E2E.

## Workflow follow-up

- Presentar la evidencia y los cambios implementados para revisión. Sin archivo, commit ni push en este encargo.
- La aceptación escolar requiere una sesión humana posterior; no bloquear ni falsificar el cierre técnico por esa evidencia externa.

Cierre técnico: puerta conjunta aprobada (435 Node, 74 herramientas, 3 smoke + 214 regresiones), specs 36/36, upstreams 3/3 y fuentes congeladas. Actas y huellas en `docs/engineering/` y `artifacts/scene2d-journey-stabilization/implementation-20261025/`. Observación humana pendiente.
