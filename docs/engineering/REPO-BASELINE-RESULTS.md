# Resultados: línea base del repositorio y consolidación de especificaciones

24 de octubre de 2026, Guatemala. Cambio OpenSpec `repo-baseline-and-spec-consolidation`, aplicado con autorización del usuario. Es un cambio de repositorio y documentación: no modifica código de producto, pruebas de producto, upstreams ni release.

## Commit y etiquetas

- **Commit inicial:** `670ab200663aa10636e6d580ebcee8aad39d1452`, con 654 archivos. `artifacts/` (47 GB) y `node_modules/` quedan excluidos por `.gitignore`. El mayor archivo versionado es `docs/licenses/pxt-core-13.0.1-ThirdPartyNotice.txt` (1,5 MB) y no se detectaron secretos.
- **Etiquetas anotadas:** `v0.1.0-alpha.1` y `e4-visual-rework` sobre ese commit.
- **Correspondencia con la puerta aprobada:** se comparó el árbol con la referencia de impacto que escribió la puerta completa del 2026-10-24T07:43:18Z (`producer: test:full`).
  - Los 144 archivos de `src/` son idénticos y no cambió ningún upstream.
  - Las 37 diferencias son documentación y OpenSpec posteriores a la puerta: actas del rework, plan de maduración, ADR-011 y cinco cambios propuestos.
  - Por eso se usaron las etiquetas de versión aprobada y no la variante `-wip` prevista en el diseño.
- **Huella de `src/`** (método de la evaluación Code.org: `find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum`): `f768f8829fbee62c3a67163166e2f076c3b38918602a37eba50050ee1e9f8c3b`. Coincide al recalcularla desde el árbol del commit. Es distinta de la huella `55f5d54d…` de la evaluación, que se tomó a las 00:32Z, antes de terminar el rework.
- Git avisó de finales de línea CRLF en tres archivos ajenos a `src/` (`dapjs-2.3.0-LICENSE.txt`, `SKILLS-INVENTORY.json`, `standalone-contexts.spec.mjs`); el repositorio los guarda con LF según `.gitattributes`.

## Consolidación

- **22 cambios completos archivados** con la CLI en orden cronológico (F0 → rework), en `openspec/changes/archive/2026-10-24-<cambio>/`. El índice está en `openspec/changes/archive/INDEX.md`.
- **`openspec/specs/` contiene 26 capacidades.** Los requisitos de cada una son idénticos a los de su delta (comparación línea a línea, sin líneas vacías).
- **Incidencia:** 10 deltas no traían sección `Purpose` y el archivado dejó el texto provisional `TBD`. La validación estricta empezó a fallar desde el cuarto archivado. El script de archivado solo se detenía ante un fallo del propio archivado, no de la validación, así que los 22 se archivaron antes de detectarlo. Se redactó un `Purpose` para cada una (accessibility-release, capability-contexts, code-console, microbit-integration, packs-lessons-offline, production-boundaries, sb3-resources, scene-inspection, text-language-foundations, textual-equivalence) a partir de su propuesta, citando el cambio de origen. Los requisitos no se tocaron.
- Los cinco cambios activos (`repo-baseline-and-spec-consolidation`, `pack-versioning-and-migrations`, `test-gate-scaling`, `block-language-contract`, `synced-code-views`) siguen en `openspec/changes/`.

## Enlaces

- **33 referencias en 17 documentos Markdown** se reescribieron a la ruta archivada, y se corrigió un enlace relativo dentro de un cambio archivado que quedó un nivel más profundo. El recuento de la propuesta (84 en 22 archivos) incluía evidencias JSON, que no se modifican.
- **Solo cambiaron rutas:** para cada documento, el texto nuevo con las rutas revertidas es idéntico al del commit inicial.
- **Ningún enlace nuevo roto.** El comprobador de enlaces relativos solo marca `chatgpt-conversation://…` en el plan de acción, un enlace externo que ya existía.

## Verificación

| Comprobación | Resultado |
|---|---|
| `openspec validate --all --strict` | 31/31 (26 especificaciones + 5 cambios activos) |
| `npm run test:tools` | 63/63 |
| Puerta completa | No se repitió: no cambió código de producto; AGENTS.md pide solo validación de especificaciones para cambios documentales |

## Límites

No se creó remoto ni se publicó nada. Las actas históricas conservan su contenido y sus conteos; solo cambiaron rutas de enlaces. Las evidencias JSON siguen nombrando las rutas originales, que se traducen con el índice de archivo.
