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

Continuar [synced-code-views](../../openspec/changes/synced-code-views/tasks.md):

1. **4.2 micro:bit:** Static TypeScript sobre plantillas y contrato de dispositivo instalados. Antes de UI, demostrar mismo programa, todos los IDs/layout y HEX idéntico tras ida y vuelta sin cambios. Conservar TypeScript independiente y el `forever` propio de dispositivo.
2. **4.3 3D/web:** trabajar sobre IR1; no asumir que el parser IR0 soporta sus contratos. Registrar rechazo o bloques grises; el diseño propone rechazo por defecto.
3. **5.1 actividad:** revisión 2 de «De bloques a tu propio código», preservando revisión 1/progreso.
4. **5.2/5.3:** E2E por contexto, full con fuentes estables y documentación global. Marcar tareas solo con evidencia.

En 2D se confirmó mantener el subconjunto instalado: rechazar `while`, `forever` y funciones propias sin bloque; no ampliar IR0/runtimes aquí. Las copias independientes siguen disponibles. Multi-sprite, vocabulario y CodeMirror son cambios separados.

## Futuro de la plataforma

El [plan de maduración por feature](FEATURE-MATURATION-PLAN.md) sustituye la secuencia posterior a E4 del [plan E0–E6](PLAN-DE-ACCION-2026-10-22.md). Sus diagnósticos «hoy» son del 24/10; este estado recoge avances posteriores. Las propuestas restantes requieren alcance y aceptación propios.

| Ola | Resultado | Situación |
|---|---|---|
| 0 · Base | Compatibilidad de packs, repositorio/specs, pruebas escalables | Implementada. |
| 1 · 2D/texto | Multi-sprite, vocabulario, sincronización, CodeMirror, biblioteca y panel de objetos | Parcial; contrato y continuidad completos, sincronización en curso, resto pendiente. |
| 2 · Aprendizaje | Esquema v3, unidades, feedback parcial, contenido propio, catálogo CNB y experimento docente | Propuesta; observación humana pendiente. |
| 3 · Capacidades | Sensores/música/radio y prueba física; cobertura Scratch; bloques tipados y profundidad 3D/web | Propuesta. |
| 4 · Distribución/acceso | HTTPS con seis orígenes, cohortes opcionales, equipos escolares, lector humano e idioma | Pendiente. |
| 5 · Docente/Sócrates | Entrega, contrato de asignación/recibo/revisión, autoría y diseño avanzado | Propuesta; depende de evidencia y coordinación externa. |

Proyectos objetivo: «Atrapa la fruta», «Laberinto», diálogo entre personajes, dado/termómetro/radio, recolectar esferas/sistema solar y lista persistente/calculadora. Son criterios futuros, no capacidades completas ya entregadas.

Pendientes externos: currículo con docente, equipos/conectividad, observación de comprensión/continuidad, lector humano, placas V1/V2 y USB, despliegue real. Decisiones abiertas: D2 equipos, D3 uso comercial, D4 idiomas mayas y D7 alcance del editor 3D. D1 público, D5 multi-sprite, D6 CodeMirror, D8 archivo y D9 sincronización están resueltas documentalmente.

## Entrega y preview

No introducir cuentas, backend obligatorio, telemetría o IA educativa por inferencia. Sócrates es futuro; «Llevar o entregar» no lo integra. Preservar seis orígenes, autoría, ejecución explícita, Stop y compatibilidad.

La URL observada en **4583**, cohorte `35054db58fc468a2dec16e5981ff65f7c17e0c0afe2db6cf1656a20797077f2b`, es una release histórica del primer E4 2D, anterior al rework. No representa el árbol actual. No se verificó disponibilidad de otras previews durante el relevo: generar/verificar la preview del corte entregado.

Para retomar: [prompt de continuación](../engineering/AGENT-HANDOFF-PROMPT.md). Este encargo fue **documentar y preparar el relevo**: no implementa 4.2, no delega automáticamente y no hace commit/push.

## Validación del relevo documental (29/10/2026)

- `npm run spec:validate`: **35 elementos aprobados, 0 fallidos**, validación estricta. Registro local: `artifacts/handoff-20261029/spec-validation.log`.
- Diez enlaces Markdown locales de los dos documentos nuevos comprobados; destinos existentes.
- `git diff --check` sobre las cuatro entradas documentales modificadas: aprobado.
- Cambios de esta sesión: este archivo, el prompt, entradas en README/NEXT-SESSION/plan de maduración y corrección histórica en AGENTS. Sin cambios de runtime, pruebas de producto ni tareas OpenSpec. Las modificaciones anteriores del árbol se conservaron.
