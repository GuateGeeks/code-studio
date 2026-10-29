# Estado consolidado de Code Studio

Actualizado el **29 de octubre de 2026**, Guatemala. Relevo documental basado en el árbol local, tareas OpenSpec y actas. La última implementación documentada es del **26 de octubre**. Esta actualización no certifica software nuevo.

## Autoridad y lectura

Este es el punto de entrada al estado actual. Las actas mantienen sus fechas y resultados; no acreditan cambios posteriores. README, PRODUCT, NEXT-SESSION y el plan de maduración contienen antecedentes: «rework pendiente», «sin commits» o «solo copias independientes» en sus secciones antiguas no describen todo el árbol actual. Contrastar siempre este resumen con tareas, código y evidencia nueva. La presencia de una carpeta en `openspec/changes/` no demuestra que su implementación esté pendiente.

## Producto y público

Plataforma educativa alpha, local y basada en navegador, para creación con bloques y texto. Público del piloto confirmado: **primaria alta, 10–12 años, con docente**. Scratch y MakeCode orientan la experiencia; Code.org aporta referencias de progresión y CoSpaces de creación 3D. El contenido y los contratos son propios. Se conserva uso sin cuenta, ejecución explícita y offline preparado.

## Implementado

| Área | Estado y límites |
|---|---|
| Base F0–F7 | Motores/adaptadores, IR validada, persistencia, lenguajes, recursos/Scratch, 3D/web, offline, accesibilidad automatizada y distribución reproducible. Actas por fase históricas. |
| E1/E2 | Entrada guiada y espacio contextual en 2D, texto, micro:bit, Scratch importado, 3D y web. |
| E3 | Tres actividades: objetivo, predicción, pistas graduadas, reflexión y variante. Revisión docente y comprensión observada pendientes. |
| E4 y rework | Seis contextos integrados; cabecera compacta, programa/resultado próximos, pestañas reales, resultado ampliable, un Detener, identidad de edición/resultado y cambios sin ejecutar. Rework implementado por Claude y verificado en software. |
| Ingeniería | Baseline Git/specs consolidadas, versionado/migración de packs y escalado de pruebas aplicados. Ola 0 técnicamente completa. |
| Lenguaje | `block-language-contract` verificado y archivado: API3 legible y tablas por pack. Copias API1/API2 compatibles. Vocabulario adicional 2D trasladado a su propio cambio. |
| Recorrido/continuidad | `scene2d-journey-stabilization` y `project-continuity-model` implementados, verificados y archivados. Guardado local confirmado separado de solicitud de copia portable. «Llevar o entregar» solicita .ggproj; no acredita entrega académica ni escritura física del archivo. |
| Sincronización 2D | Bloques, JavaScript y Python del mismo programa dentro del subconjunto instalado; rechazo con causa/línea, tres salidas, Deshacer, IDs/layout, GGPROJ v5 y plantillas nuevas API3. En el árbol de trabajo; cierre global pendiente. |

## Estado Git y OpenSpec inspeccionado

- Rama `main`, HEAD `c1b890157f441c2b998c164ea8ac627f1be331c1` (recorrido/continuidad). Contrato de lenguaje en `1235693`.
- Numerosos archivos modificados/nuevos de sincronización, pruebas, documentación y diseño: **trabajo que conservar**, no residuos que limpiar.
- `synced-code-views`: **8/13 tareas completas**, sin commit ni archivo del cambio según acta y estado local.
- Propuestos sin tareas completas: `scene2d-multi-sprite` **0/10**, `scene2d-vocabulary-v2` **0/6**, `text-editor-codemirror` **0/5**.
- Ola 0: `repo-baseline-and-spec-consolidation` **9/9**, `pack-versioning-and-migrations` **10/10**, `test-gate-scaling` **9/9**. No repetir su implementación ni inferir publicación remota de estos conteos.

## Evidencia y límites

| Corte | Resultado histórico aprobado | Límite |
|---|---|---|
| Rework | 400 Node, 63 herramientas, 3 smoke + 177 regresiones = **180 navegador** | No aceptación humana. Algunas notas abreviadas citan 177 E2E sin sumar smoke. |
| Recorrido 2D + continuidad | 435 Node, 74 herramientas, 3 smoke + 214 regresiones = **217 navegador**; specs 36/36; upstreams 3/3; baseline avanzada | Incluyó trabajo experimental del checkout; no atribuir todo al commit separado ni al corte posterior. |
| Sincronización 2D | Viabilidad 9/9; diff 491/491; 469 Node, 76 herramientas y **85 E2E afectados**, build y specs 35/35; exitCode 0, baselineWritten false | **Full global pendiente**. La selección explícita afectada no cubre el plan global conservador. |

Fuentes:

- [Rework visual](VISUAL-REWORK-RESULTS.md).
- [Recorrido 2D](../engineering/SCENE2D-JOURNEY-STABILIZATION-RESULTS.md) y [continuidad](../engineering/PROJECT-CONTINUITY-RESULTS.md).
- [Sincronización 2D](../engineering/SYNCED-CODE-VIEWS-2D-RESULTS.md), [viabilidad](../engineering/SYNCED-CODE-VIEWS-VIABILITY.md) y [diff](../engineering/SYNCED-CODE-VIEWS-STRUCTURAL-DIFF.md).
- Evidencia local 2D: `artifacts/synced-code-views/views-20261026/affected-1/`.
- Full conjunta preservada: `artifacts/scene2d-journey-stabilization/implementation-20261025/full-attempt-1/`.

Los reportes de `artifacts/test-runs/` se reutilizan; preferir copias por corte. Artefactos ignorados pueden faltar en otro clon: las actas no sustituyen su reproducción allí. Este relevo documental no vuelve a ejecutar las suites de producto.

## Continuación inmediata

**Decisión del 29/10/2026:** estabilizar features y entregar valor con un piloto 2D en aula. Rige el [plan de estabilización 2D](STABILIZATION-PLAN-2D.md):

1. **E0 · Cerrar lo abierto:** `synced-code-views` se limita a 2D; micro:bit (4.2) y 3D/web (4.3) pasan a `synced-code-views-capability-contexts`, que no se implementa en este plan. Revisión 2 de la actividad de transición, modo piloto 2D (`pilot-2d-mode`), E2E 2D, full global, archivo y commit.
2. **E1–E4:** vocabulario 2D esencial, varios sprites, sensores y operadores, y recursos iniciales.
3. **E5 · Listo para aula:** unidad 2D, instalación local por equipo y observación docente.

Despliegue local en cada equipo (D2 resuelta). micro:bit, 3D, web y Scratch quedan congelados: sin funciones nuevas y con sus regresiones en la puerta.
