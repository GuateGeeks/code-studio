# Design

## Context

- **Repositorio:** la rama `main` no tiene commits. `.gitignore` ya excluye `node_modules/`, `.codegraph/`, `.cache/`, `artifacts/` (47 GB), `test-results/`, `playwright-report/`, `.impeccable/review/`, `*.log` y `.codex/config.toml`. Lo versionable ocupa unos 40 MB, de los que 9,2 MB son de `.impeccable/` (sin `review/`).
- **Cambios:** 22 cambios completos con 26 capacidades `ADDED`, sin nombres repetidos ni requisitos `MODIFIED` o `REMOVED`.
- **Enlaces:** el recuento inicial (84 referencias en 22 archivos) incluía evidencias JSON. Al aplicar se midieron 33 referencias en 17 documentos Markdown y un enlace relativo dentro de un cambio archivado. `tests/tools/test-impact.test.mjs` solo usa una ruta ficticia (`openspec/changes/x/`) y no requiere cambios.
- La identidad de Git configurada es la del usuario.

## Goals / Non-Goals

**Goals:** un commit y etiquetas que correspondan a la puerta aprobada; especificaciones consolidadas válidas; enlaces vivos; historia intacta.

**Non-Goals:** remoto, publicación, reescribir historia, versionar artefactos, reorganizar la documentación.

## Decisions

1. **Un solo commit inicial**, sin intentar reconstruir la historia F0–E4: las actas ya documentan esa historia con fecha y evidencia. Mensaje con la huella de `src/`, los conteos de la última puerta (400 Node, 63 herramientas, 177 E2E) y referencia al acta del rework.
2. **Comprobación de la huella antes de etiquetar.** Si `src/` cambió desde la puerta del 24/10 (por ejemplo, por cambios posteriores no verificados), se etiqueta solo `v0.1.0-alpha.1-wip` y se registra la diferencia, en lugar de atribuir la puerta a un árbol distinto.
3. **Archivado con la CLI** (`openspec archive <cambio> --yes`), uno a uno y en orden cronológico (F0 → rework), validando después de cada uno. Alternativa descartada: mover carpetas a mano, que no consolida las especificaciones.
4. **Enlaces: reescritura mecánica solo de rutas.** Un script reemplaza `openspec/changes/<cambio>/` por la ruta archivada en archivos Markdown y en la prueba de herramientas, y produce un diff revisable. Ninguna otra línea cambia. Las evidencias JSON no se tocan; `openspec/changes/archive/INDEX.md` relaciona rutas antiguas y nuevas.
5. **Segundo commit** con el archivado y los enlaces, para que el commit inicial represente exactamente la puerta aprobada.

## Risks / Trade-offs

- [El commit incluye algo sensible o enorme] → revisar `git status` y los 20 archivos más grandes antes de confirmar; ningún secreto conocido (`.codex/config.toml` ya excluido).
- [La reescritura de rutas toca algo más que enlaces] → diff limitado a rutas y comprobación de que el número de líneas cambiadas iguala el número de enlaces.
- [Se rompe la selección de `test:affected`] → ejecutar `test:tools` después del archivado.

## Migration Plan

Commit y etiquetas → archivado uno a uno con validación → reescritura de enlaces → `spec:validate` y `test:tools` → segundo commit → acta. Reversión: los cambios archivados pueden restaurarse desde el commit inicial; nada se publica.

## Open Questions

- ¿Se crea un remoto privado después? Fuera de este cambio; lo decide el usuario.
