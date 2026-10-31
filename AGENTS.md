# GuateGeeks Code Studio

Fork del target `pxt-arcade`. Diseño: `docs/superpowers/specs/2026-10-30-code-studio-arcade-design.md`. Plan: `docs/superpowers/plans/2026-10-30-code-studio-arcade.md`.

## Reglas

- No modificar `pxt-core`. Si algo parece exigirlo, parar y consultar.
- Target y `sim.js` de la misma versión publicada.
- Compilar con `pxt staticpkg --route code-studio`. **Nunca `--githubpages`:** intenta publicar en `origin`.
- Sin datos de estudiantes en el repositorio. Sin marcas Microsoft o MakeCode en lo publicado.
- Sin push salvo petición expresa del usuario.

## Pruebas

- Mientras se programa: compilación y la prueba de lo que cambió, en menos de 1 minuto.
- Al cerrar una función: un recorrido de crear, ejecutar, detener, guardar y reabrir, en menos de 3 minutos.
- Antes de una clase: batería corta de menos de 10 minutos, si el usuario la autoriza.
- No probar PXT, solo lo que añadimos. Una revisión por hito, sin acta por tarea.
- Guardar, reabrir y recuperar siempre se prueban.
- En este WSL, inicia `npm start` antes de `npm run journey`: el sondeo de puerto de Playwright puede colgarse con el puerto cerrado.
