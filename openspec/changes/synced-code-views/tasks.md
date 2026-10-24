# Tasks

## 1. Viabilidad

- [ ] 1.1 Prueba de ida y vuelta sobre el corpus 2D (bloques → JavaScript → IR → bloques) en el worker del lenguaje: mismo programa y mismos IDs en el 100 % del corpus; registrar el resultado y detener el cambio si no se alcanza.
- [ ] 1.2 Prueba de propiedad del diff estructural: mutaciones de una línea conservan los IDs no afectados.

## 2. Conversión

- [ ] 2.1 Implementar el parser genérico JavaScript (estructuras de control del núcleo y delegación a la tabla) en `src/targets/text`, con causas y líneas para cada rechazo.
- [ ] 2.2 Implementar la correspondencia estructural de IDs, comentarios de bloque y posiciones de eventos; aplicar la IR candidata solo tras validarla en la shell.

## 3. Experiencia

- [ ] 3.1 Convertir el selector Bloques · JavaScript · Python en vistas del mismo programa para 2D, con texto editable, aviso de formato regenerado y Ejecutar desde cualquier vista sin ejecución al cambiar.
- [ ] 3.2 Implementar el rechazo con tres salidas accesibles por teclado, puntos de restauración y Deshacer; guardar vista activa y texto pendiente en autosave y GGPROJ.

## 4. Extensión por contextos

- [ ] 4.1 Habilitar Python en 2D (análisis con `ast`, carga bajo demanda) con su corpus de ida y vuelta.
- [ ] 4.2 Habilitar TypeScript en micro:bit sobre las plantillas Static TypeScript; HEX idéntico tras ida y vuelta sin cambios.
- [ ] 4.3 Habilitar 3D y web; resolver la pregunta de bloques grises o rechazo y registrarla en este diseño.

## 5. Actividades, documentación y verificación

- [ ] 5.1 Publicar la revisión 2 de «De bloques a tu propio código» con checks de programa; conservar la revisión 1 y su progreso.
- [ ] 5.2 E2E por contexto: mirar y volver sin cambios, editar y volver, rechazo y copia, Deshacer, reapertura, teclado y zoom; `test:affected` y una `test:full`.
- [ ] 5.3 Actualizar `PRODUCT.md`, ADR-011 (estado implementado), guía docente, guion de observación del Exp. 1 y acta de resultados con límites.
