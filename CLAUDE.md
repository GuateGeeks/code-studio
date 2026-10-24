# GuateGeeks Code Studio — guía para Claude

Las reglas del repositorio están en [AGENTS.md](AGENTS.md) y se aplican siempre; este archivo no las repite. Añade fuentes de diseño, skills, subagentes y precedencia para trabajo de interfaz.

## Fuentes de verdad

1. Contratos y cambio OpenSpec activo (`openspec/changes/<cambio>/`), ADRs en `docs/adr/` y actas de resultados.
2. [PRODUCT.md](PRODUCT.md) (público: principiantes acompañados por docente) y [DESIGN.md](DESIGN.md) con su sidecar `.impeccable/design.json`: única fuente de tokens, componentes y movimiento.
3. Skills propias `gg-*`.
4. Impeccable (`/mnt/c/Users/adawolfs/.codex/skills/impeccable/`, skill directora de diseño).
5. `web-design-guidelines`.
6. `emil-design-eng` y `review-animations`, solo como consulta.

Si discrepan, prevalece el número menor. Una skill no autoriza cambiar motores, formatos, permisos ni contratos.

Plan y decisiones vigentes del rework: [VISUAL-REWORK-EXECUTION-PLAN](docs/product/VISUAL-REWORK-EXECUTION-PLAN.md). Identidad actual de `DESIGN.md` conservada; distribución tipo Scratch con piezas de MakeCode; sin autorun.

Dirección posterior (24/10/2026): [ADR-011](docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md) aprueba vistas sincronizadas bloques↔texto dentro del subconjunto bloqueable, API textual legible sin `GG` visible y packs como contrato de lenguaje. Se implementa en `pack-versioning-and-migrations` → `block-language-contract` → `synced-code-views`; hasta entonces rige el comportamiento actual. Orden general en el [plan de maduración](docs/product/FEATURE-MATURATION-PLAN.md).

## Skills (`.claude/skills/`)

Las propias tienen fuente canónica en `.agents/skills/` (Codex) y copias idénticas aquí. Edita la canónica y resincroniza según [ATTRIBUTION](.claude/skills/ATTRIBUTION.md).

| Skill | Úsala para |
|---|---|
| `gg-design-system` | Jerarquía, componentes, lenguaje, estados y movimiento de la interfaz |
| `gg-browser-first` | Cambios que tocan ejecución, persistencia, importación u offline |
| `gg-learning-experience` | Actividades, pistas y feedback educativo |
| `gg-ui-verification` | Geometría, capturas válidas, teclado y suites al cerrar un cambio visual |
| `openspec-*` | Proponer, aplicar, actualizar o archivar cambios OpenSpec |
| `web-design-guidelines` | Revisar archivos contra las Web Interface Guidelines |
| `emil-design-eng`, `review-animations` | Criterio de movimiento; sus ejemplos React/Tailwind son ilustrativos |

Impeccable: ejecutar `/mnt/c/Users/adawolfs/.codex/skills/impeccable/scripts/impeccable context` una vez por sesión desde la raíz del producto y seguir sus directivas. No repares drift de Impeccable como efecto lateral.

## Subagentes (`.claude/agents/`, equivalentes en `.codex/agents/`)

| Subagente | Modo |
|---|---|
| `gg-experience-reviewer` | Solo lectura: fricciones priorizadas |
| `gg-continuity-reviewer` | Solo lectura: autoría, sesiones, GGPROJ, offline |
| `gg-browser-verifier` | Solo lectura: evidencia en navegador |
| `gg-ui-implementer` | Escribe solo los archivos asignados |

Un único escritor para `src/studio/index.html`, `src/studio/style.css`, `src/studio/contextual-workspace.mjs` y tokens: la sesión coordinadora. Verifica en el código cada hallazgo de un revisor antes de aplicarlo.

## Comandos

```bash
source ../scripts/env.sh
npm run test:quick
npm run test:affected -- --files <rutas> --list
npm run test:full
npm run spec:validate
```

Node y herramientas locales los pone en el PATH `../scripts/env.sh` (Node en `../.tools/`). Previews: puertos en `docs/engineering/NEXT-SESSION.md`; no detengas las de otros incrementos.
