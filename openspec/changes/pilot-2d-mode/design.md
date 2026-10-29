# Design

## Decisions

1. **El perfil es del despliegue, no del navegador.** El despliegue es local en cada equipo (D2). Lo fija quien instala, con `GG_CONTEXTS` al arrancar el servidor. Un estudiante no puede cambiarlo desde la interfaz. Alternativa descartada: una opción en «Preparar para clase» guardada en el navegador, que cualquiera podría revertir y que no viajaría con la release preparada para uso sin red.
2. **Valor por defecto intacto.** Sin perfil, `config.json` no lleva `contexts` y las entradas de la cohorte conservan su forma (la cohorte cambia, como siempre, si cambian la herramienta o los archivos). Con perfil, la lista entra en el hash de la cohorte y en `config.json`, así que la preparación sin red conserva el perfil.
3. **Validación cerrada.** Solo se aceptan IDs conocidos (`2d`, `text`, `microbit`, `sb3`, `scene3d`, `webapp`), sin duplicados, y `2d` es obligatorio.
4. **Ocultar no es borrar.** Los participantes de autoría de todos los contextos siguen registrados: capturan, guardan y restauran igual. Solo cambian la lista del selector y la navegación. `select()` hacia un contexto oculto devuelve `false` y no cambia nada.
5. **Aviso honesto.** Si la autoría tiene micro:bit, Scratch, 3D o web, la banda de avisos lo dice y explica que se conservan.
