# GuateGeeks Code Studio

Fork del target `pxt-arcade`. Diseño: `docs/superpowers/specs/2026-10-30-code-studio-arcade-design.md`. Plan: `docs/superpowers/plans/2026-10-30-code-studio-arcade.md`.

## Reglas

- No modificar `pxt-core`. Si algo parece exigirlo, parar y consultar.
- Target y `sim.js` de la misma versión publicada.
- Compilar con `pxt staticpkg --route code-studio`. **Nunca `--githubpages`:** intenta publicar en `origin`.
- Sin datos de estudiantes en el repositorio. Sin marcas Microsoft o MakeCode en lo publicado.
- Sin push salvo petición expresa del usuario.
- El service worker sirve el sitio desde caché: tras cambiar algo, cierra todas las pestañas del estudio para ver la versión nueva.
- `games/<id>/main.ts`: todo en un solo archivo; solo `for (let i = 0; i < n; i++)`, sin rangos negativos ni `if` de una línea con llamadas; sin `drawLine`, `askForString`, `game.over`, `.charAt`, `.onButtonEvent` ni `sayText` con tiempo (PXT borra la burbuja siguiente); sin `Í` ni textos en mayúsculas; opciones verticales de `elegir` de hasta 44 caracteres. `fuente.test` lo hace cumplir.
- Los bloques de `libs/gg-experiencias` solo se añaden: nunca se renombran ni se quitan.
- Cada archivo nuevo del sitio se guarda sin red salvo que `tools/site-files.txt` lo excluya.

## Pruebas

- Mientras se programa: compilación y la prueba de lo que cambió, en menos de 1 minuto.
- Al cerrar una función: `npm run recorrido`, en menos de 3 minutos.
- Al cerrar un hito o antes de una clase: `npm run journey` completo.
- Antes de una clase: batería corta de menos de 10 minutos, si el usuario la autoriza.
- No probar PXT, solo lo que añadimos. Una revisión por hito, sin acta por tarea.
- Guardar, reabrir y recuperar siempre se prueban.
- En este WSL, inicia `npm start` antes de `npm run journey`: el sondeo de puerto de Playwright puede colgarse con el puerto cerrado.
