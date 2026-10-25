# Plan de ejecución: rework visual de Code Studio

23 de octubre de 2026. Plan de sesión que integra el [encargo](CLAUDE-OPUS-VISUAL-REWORK-PROMPT.md) con el prompt de preparación de herramientas derivado de Sócrates. No es un backlog paralelo: requisitos y tareas siguen en `openspec/changes/archive/2026-10-24-studio-visual-workspace-rework/`; cada fase remite a sus IDs de tarea. Nada de este plan está implementado todavía.

## Decisiones del usuario (23 oct 2026)

| Tema | Decisión | Consecuencia |
|---|---|---|
| Identidad visual | Conservar la identidad actual de `DESIGN.md` (verdes, system-ui), refinada | No se aplica la paleta ni las fuentes GuateGeeks de Sócrates; sin fuentes nuevas ni activos de marca |
| Skills de dominio | Reutilizar `gg-*` y cubrir solo huecos | No se crean `codestudio-*`; sin fuentes competidoras |
| Distribución | Scratch + piezas de MakeCode | Programa a la izquierda; resultado arriba a la derecha con consulta debajo; de MakeCode, selector de modo, panel de tutorial y controles del simulador |
| Extras dentro del alcance | Aviso de cambios sin ejecutar; selector Bloques · JavaScript · Python; panel de actividad por pasos | Sin autorun, sin sincronización bloques↔texto, sin nuevas actividades ni catálogos |

Fuera de alcance, con razón documentada: reinicio automático al editar (la ejecución requiere acción explícita; predicción E3) y conversión texto→bloques (ADR 004/007, «sin sincronización bidireccional»). Pueden proponerse como cambios OpenSpec separados.

## Desviaciones del prompt de Sócrates y su resolución

| # | Prompt de preparación | Resolución |
|---|---|---|
| D1 | Seis skills `codestudio-*` | Duplicarían `gg-design-system`, `gg-browser-first` y `gg-learning-experience`. Se copian las `gg-*` a `.claude/skills/` y se añade solo `gg-ui-verification`; movimiento como sección de `gg-design-system` |
| D2 | ~15 skills UI/movimiento de Sócrates | Impeccable dirige; se añaden `web-design-guidelines`, `emil-design-eng` y `review-animations` como consulta. Se omiten `frontend-design`, `ui-ux-pro-max`, `apple-design`, `prototype` y el resto de movimiento por competir con la dirección Operate única |
| D3 | `vercel-react-best-practices`, `building-components` | Code Studio no usa React: se omiten |
| D4 | `docs/ux-rework/` con backlog JSON | Seguimiento en `tasks.md`, matriz E4 en `VISUAL-REWORK-RESULTS.md` y su JSON; capturas brutas en `artifacts/visual-rework/` |
| D5 | Viewports 320/390/1440, claro/oscuro, 200 % | Unión con el encargo: 1280×720, 1440×900, 1280×900, 390×844, 448×884, 320, zoom real 200/400 %, movimiento reducido. Sin tema oscuro |
| D6 | `@playwright/cli` en `.tools/` | No se instala sin necesidad concreta; se usa `@playwright/test` 1.64.1 existente |
| D7 | Pregunta de marca GuateGeeks | Resuelta: conservar identidad actual |
| D8 | «Foco #bc4935» | `DESIGN.md` lo declara, pero el CSS aún usa `#ef6b54`; se corrige en 3.3 |
| D9 | Prueba de tokens de movimiento CSS↔JS | No aplica: no hay duraciones en JS; se reporta |
| D10 | Contexto seguro en orígenes `http://` | Las suites usan `http://127.0.0.1`, contexto seguro; se clasifica con evidencia sin cambios |
| D11 | Reglas de movimiento en `CLAUDE.md` | Viven en `DESIGN.md`; `CLAUDE.md` solo remite |
| D12 | Rama vs producción | No aplica: `main` sin commits ni remoto |

## Fase 0 · Herramientas y línea base

Sin tocar fuentes del producto. `CLAUDE.md` y `.claude/` cuentan como documentación para `test:affected` (solo validación de specs).

- **0.1** SHA-256 de todos los archivos no ignorados (el árbol completo está sin seguimiento), snapshot tar recuperable, estado de upstreams y `artifacts/baseline/verification.json`. Sin reset/clean/stash/cambio de rama.
- **0.2** Copias idénticas de `gg-*` y `openspec-*` en `.claude/skills/` con script de comparación de hashes; `web-design-guidelines`, `emil-design-eng`, `review-animations` con `ATTRIBUTION.md` (procedencia, licencia, cambios). Impeccable se ejecuta desde `/mnt/c/Users/$USER/.codex/skills/impeccable/`.
- **0.3** `gg-ui-verification` (geometría y≤200, medición de canvas e imagen 4:3 dentro del iframe, recaptura de superficies GPU, una captura no prueba ejecución ni persistencia) y sección de movimiento en `gg-design-system`.
- **0.4** Subagentes en `.claude/agents/` y TOML en `.codex/agents/`: `gg-experience-reviewer`, `gg-continuity-reviewer`, `gg-browser-verifier` (solo lectura) y `gg-ui-implementer`. El coordinador es el único escritor de shell, tokens y componentes compartidos.
- **0.5** `CLAUDE.md` sin duplicar `AGENTS.md`. Precedencia: contratos/OpenSpec > `PRODUCT.md`/`DESIGN.md` > `gg-*` > Impeccable > guidelines > resto. Tabla de skills, subagentes y comandos.
- **0.6** Clasificar D9 y D10 con evidencia.
- **0.7** `spec:validate`, `test:quick` y `accessibility-shell`; demostrar por hashes que solo cambió la configuración.

## Fases 1–5 · Rework (tareas OpenSpec)

- **1.1** Reutiliza la línea base 0.1; inventario JSON de acciones e IDs; geometría base de la release 4983.
- **1.2** `impeccable context`, modo Operate, `craft-floor` antes de editar. Dirección: identidad actual refinada, distribución Scratch con piezas MakeCode. Registrar las decisiones de esta página en `design.md` del cambio y en `DESIGN.md` antes de implementar.
- **2.1** Barra de proyecto compacta (nombre, guardado, menú Archivo, Preparar para clase), barra de contexto/transporte, programa a la izquierda y resultado 4:3 arriba a la derecha con consulta debajo. Vista ampliada por CSS sin mover el iframe; Esc y foco recuperable.
- **2.2** Consulta con pestañas reales (`tablist`/`tab`/`tabpanel`, teclado), selección recordada por contexto con respaldo válido y diagnóstico→documento/línea.
- **2.3** «Editando…» / «Resultado de…»; ▶ Ejecutar y ■ Detener grandes, con texto, junto al resultado (sin bandera de Scratch). Unificar solo detenciones de efecto equivalente; IDs conservados. **Aviso de cambios sin ejecutar** con un clic para ejecutar, nunca automático.
- **2.4** Estrecho: barra fija Programa · Resultado · Ayuda con Detener alcanzable.
- **3.1** Rótulos educativos en bloques/propiedades y errores conocidos traducidos con detalle técnico; tema Blockly propio (API pública) con categorías más legibles. Tipos, campos, IDs y serialización intactos.
- **3.2** Error de ID duplicado y validación junto al campo, borrador y sesión conservados.
- **3.3** Tokens y componentes únicos; tipografía, foco, contraste y movimiento reducido; `DESIGN.md`, sidecar y brief.
- **4.1–4.6** Seis contextos sobre el shell común. **Selector Bloques · JavaScript · Python** al inicio de la autoría: JS/Python muestran la lectura derivada de solo lectura con «Crear copia editable · copia independiente: no cambia tus bloques».
- **4.7** **Panel de actividad por pasos** con las actividades E3 existentes (objetivo, predicción, pistas graduadas, comprobar, variante), destino visible antes de cargar.
- **5.1** Matriz de capturas (viewports de D5) con `gg-browser-verifier`; detector una vez; revisión Impeccable. Revisores en solo lectura al cerrar fases 2 y 4; cada hallazgo se verifica en código antes de aplicarlo.
- **5.2** `test:affected` con rutas reales, un `test:full`, `spec:validate`, offline frío, exportaciones, upstreams y CodeGraph.
- **5.3** `VISUAL-REWORK-RESULTS.md` y JSON con matriz E4-01…08, release local abierta y pendientes humanos/físicos. Sin archivar cambios ni hacer commit.
