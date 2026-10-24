# Registro de decisiones de arquitectura

**22 de octubre de 2026 · Alcance: salida de F0 y corte vertical F1.**

Una decisión aceptada aquí selecciona una dirección técnica. La entrada a F1 depende además del [acta de cierre F0](../phase-0/CLOSEOUT.md) y los [criterios de entrada](../phase-0/PHASE-1-ENTRY.md). No certifica el producto completo, otros navegadores, equipos escolares o firmware físico.

| ADR | Decisión | Estado |
|---|---|---|
| [001](001-motor-2d-scratch.md) | Scratch VM y Scratch Render como motor 2D del corte F1 | Aceptada para el alcance definido; entrada activada por el acta F0 |
| [002](002-estado-ir-sesiones-aislamiento.md) | Estado único en VM, IR propia y referencias por sesión/revisión; runner separado | Aceptada para F1; endurecimiento pendiente |
| [003](003-pxt-y-clasificacion-g2.md) | PXT encapsulado; compilación y simulación demostradas, G2 física pendiente | Aceptada; G2 no cerrada físicamente |

La [evidencia de navegador](../phase-0/browser-evidence.json), los [resultados](../phase-0/RESULTS.md), la [procedencia](../phase-0/provenance.json), el [mapa CodeGraph](../phase-0/INTEGRATION-MAP.md) y los [contratos OpenSpec](../../openspec/changes/phase-0-integration-foundations/specs/) sustentan estas decisiones. Los informes anteriores conservan su alcance histórico; el acta de cierre identifica la ejecución utilizada para cerrar F0.

Las decisiones se reabren al incumplir sus criterios, cambiar las fronteras o ampliar el alcance. Los cambios deben enlazar nueva evidencia y sustituir explícitamente el ADR previo; una limitación no se corrige cambiando silenciosamente el criterio de aceptación.

- [ADR004 — Contextos textuales y corpus](004-contextos-textuales-y-corpus.md).

- [ADR-005: packs locales y GGPROJ3](005-packs-declarativos-y-ggproj3.md)
- [ADR-006: cohorts offline por origen](006-cohorts-offline-por-origen.md)

- [ADR007: autoría de dispositivo y transferencia USB](007-autoria-de-dispositivo-y-transferencia-usb.md).
- [ADR008: recursos portables y compatibilidad SB3](008-recursos-y-compatibilidad-sb3.md).

- [ADR009: contextos y capacidades](009-contextos-capacidades.md).
- [ADR010: accesibilidad y fuentes de release](010-accesibilidad-y-fuentes-de-release.md).
- [ADR011: contrato de lenguaje de bloques y vistas sincronizadas](011-contrato-de-lenguaje-y-vistas-sincronizadas.md) — aceptada el 24/10/2026, implementación pendiente; sustituye partes de ADR004, 005, 007 y 009.
