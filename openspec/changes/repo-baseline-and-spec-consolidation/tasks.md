# Tasks

## 1. Commit inicial

- [ ] 1.1 Confirmar con el usuario la autorización para commit, etiquetas y archivado (D8); revisar `git status`, exclusiones y los 20 archivos versionables más grandes.
- [ ] 1.2 Calcular la huella de `src/` y compararla con la registrada en la puerta del 24/10; registrar el resultado.
- [ ] 1.3 Crear el commit inicial y las etiquetas según la decisión 2 del diseño; verificar con `git rev-parse` y recalcular la huella desde el árbol del commit.

## 2. Consolidación

- [ ] 2.1 Archivar con la CLI los 22 cambios completos, uno a uno y en orden cronológico, validando después de cada uno.
- [ ] 2.2 Comprobar que `openspec/specs/` contiene las 26 capacidades con requisitos idénticos a los de sus deltas.

## 3. Enlaces y evidencia

- [ ] 3.1 Reescribir mecánicamente las rutas de enlaces Markdown y de `tests/tools/test-impact.test.mjs`; verificar que el diff solo contiene rutas.
- [ ] 3.2 Crear `openspec/changes/archive/INDEX.md` con rutas antiguas y nuevas para las evidencias JSON.

## 4. Verificación y acta

- [ ] 4.1 Ejecutar `spec:validate` y `test:tools`; comprobar los enlaces de README, PRODUCT, AGENTS, CLAUDE, NEXT-SESSION y actas.
- [ ] 4.2 Segundo commit con archivado y enlaces; registrar en un acta breve la huella, las etiquetas, los cambios archivados y los límites.
