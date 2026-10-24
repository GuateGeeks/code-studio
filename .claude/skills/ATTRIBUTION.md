# Skills de Claude Code en GuateGeeks Code Studio

23 de octubre de 2026. Procedencia, licencia y cambios locales de cada skill en `.claude/skills/`. Modelo tomado de `socrates.app/.claude/skills/ATTRIBUTION.md`; selección reducida según [el plan de ejecución](../../docs/product/VISUAL-REWORK-EXECUTION-PLAN.md) (desviaciones D1–D3).

## Skills propias (fuente canónica en `.agents/skills/`)

`gg-browser-first`, `gg-design-system`, `gg-learning-experience`, `gg-ui-verification` y las seis `openspec-*` viven en `.agents/skills/`, que lee Codex. `.claude/skills/` guarda copias byte a byte porque Claude Code no detecta directorios de skills enlazados. Edita siempre la copia canónica y resincroniza:

```bash
for s in .agents/skills/*/; do n=$(basename "$s"); rm -rf ".claude/skills/$n" && cp -r "$s" ".claude/skills/$n"; done
for s in .agents/skills/*/; do n=$(basename "$s"); diff -r "$s" ".claude/skills/$n" >/dev/null || echo "Difiere: $n"; done
```

Cambios del 23 de octubre: sección **Movimiento** añadida a `gg-design-system`; `gg-ui-verification` creada. Las `openspec-*` son generadas por OpenSpec 1.14.3 y no se modificaron.

## Skills de terceros

| Skill | Origen | Licencia | Cambios locales |
|---|---|---|---|
| `web-design-guidelines` | Vercel, vía `socrates.app/.claude/skills/` (idéntica a `/mnt/c/Users/adawolfs/.codex/skills/web-design-guidelines/SKILL.md`) | No declarada en el archivo (frontmatter `author: vercel`, v1.0.0) | Ninguno. Descarga las reglas vigentes de su URL al usarse. |
| `emil-design-eng` | [emilkowalski/skills](https://github.com/emilkowalski/skills) commit `e879241fab3cdb22e8d95587cdbf40b57a88d7da`, vía Sócrates | MIT — `LICENSE.txt` | El cambio M1 heredado de Sócrates/claude-webkit (sección `## Initial Response` sustituida por `## Attribution`, ver `NOTICE.md`). Ninguno adicional. |
| `review-animations` | Mismo upstream y commit | MIT — `LICENSE.txt` | Ninguno; conserva `disable-model-invocation: true`. |

Los ejemplos de `emil-design-eng` y `review-animations` mencionan React, Tailwind o librerías de movimiento. Code Studio usa módulos ES, Blockly y CSS propio: tómalos como ilustración del criterio, no como stack. No se editaron para no alterar el texto upstream; la precedencia está en [CLAUDE.md](../../CLAUDE.md).

Impeccable no se copia: se ejecuta desde `/mnt/c/Users/adawolfs/.codex/skills/impeccable/` (v4.7.0), donde el usuario la mantiene.

## No incorporadas, a propósito

`frontend-design`, `ui-ux-pro-max`, `apple-design`, `prototype`, `animate`, `animation-vocabulary`, `find-animation-opportunities` e `improve-animations` competirían con la dirección Operate única que dirige Impeccable. `vercel-react-best-practices` y `building-components` suponen React. `playwright-cli` no se instala: el proyecto usa `@playwright/test` 1.64.1 con sus configuraciones.
