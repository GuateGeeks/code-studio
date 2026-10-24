# Design

## Context

Véanse `proposal.md`, ADR-011 y `block-language-contract`, que deja una tabla bloqueable por pack y una API v3 legible. Piezas existentes reutilizables:

- `workspace-from-ir.mjs`: IR→Blockly con verificación por la traducción directa.
- `acorn`: ya se usa en el origen del lenguaje (`quickjs-engine.mjs:1`).
- Pyodide incluye el módulo `ast`.
- El selector Bloques · JavaScript · Python del rework, que hoy elige entre documentos independientes.
- Los mapas línea→bloque y el corpus de equivalencia.

## Goals / Non-Goals

**Goals:** edición en ambos sentidos dentro del subconjunto; rechazo explicado sin pérdida; IDs estables; sin ejecución al cambiar de vista; despliegue por contextos.

**Non-Goals:** convertir código arbitrario, sincronizar en tiempo real, cambiar motores, Static Python de micro:bit.

## Decisions

1. **Fuente de verdad única por momento.** En vista de bloques, la verdad es el workspace. En vista de texto sincronizada, la verdad es el texto. Al salir del texto se convierte. Mientras se edita texto, «Ejecutar» convierte primero; si la conversión falla, se muestra el rechazo y no se ejecuta. Alternativa descartada: conversión continua en cada pulsación, cara y fuente de saltos de cursor.
2. **Parser genérico dirigido por la tabla.**
   - El núcleo reconoce las estructuras de control (eventos con callback, `if/else`, repeticiones, `forever`, `while`, funciones) y delega cada llamada, valor o enum a la tabla, por espacio de nombres y nombre.
   - JavaScript se analiza con `acorn` y Python con `ast`, ambos en el worker del origen del lenguaje. El worker devuelve una IR candidata serializable; la shell la valida y la aplica.
   - Python carga Pyodide bajo demanda, con estado «Preparando Python…».
3. **Identidad de bloques por correspondencia estructural.**
   - La generación anota cada nodo con el ID de su bloque en un mapa lateral, nunca en el texto.
   - Al volver se alinean los nodos por estructura y posición (diff de árboles). Coincidencia de tipo y ruta conserva el ID; un nodo nuevo recibe ID nuevo.
   - Las posiciones de los eventos raíz se conservan.
4. **Rechazo con tres salidas.** Seguir editando; volver a la última versión en bloques (con confirmación si hay texto sin guardar); guardar como copia independiente (documento API v3 con el texto exacto). El mensaje nombra la línea, la construcción y, si existe, el bloque más cercano.
5. **Puntos de restauración** en el autosave antes de aplicar una conversión, para que Deshacer recupere el estado previo exacto. La vista activa y el texto pendiente forman parte del estado de autoría guardado.
6. **Despliegue y prueba de viabilidad.** La primera tarea es una prueba de ida y vuelta sobre el corpus: bloques → JS → bloques debe dar el mismo programa y los mismos IDs en el 100 % del corpus 2D. Después se habilitan 2D JavaScript, 2D Python, micro:bit TypeScript (sobre plantillas Static TypeScript) y 3D/web, cada uno con su puerta.
7. **3D/web con código fuera del subconjunto.** Por defecto se rechaza, igual que en 2D. Los bloques grises de código (posibles porque estos contextos ejecutan en QuickJS) quedan como pregunta abierta.
8. **Actividad E3.** La revisión 2 de «De bloques a tu propio código» pide abrir JavaScript, cambiar el movimiento, volver a bloques y explicar qué cambió. Los checks son de programa (`position`, nuevo `edited-in-text`) y no de formato. La revisión 1 sigue disponible para el progreso existente.

## Risks / Trade-offs

- [El diff estructural asigna mal un ID] → prueba de propiedad: mutaciones aleatorias de una línea sobre el corpus deben conservar todos los IDs no afectados.
- [Pyodide (13 MB) en equipos lentos] → carga bajo demanda, JavaScript habilitado antes, medición en el Exp. 2.
- [Los estudiantes chocan con el límite del subconjunto] → mensajes concretos y salida a copia independiente; observación en el Exp. 1.
- [El formato regenerado desconcierta] → aviso la primera vez y conservación de comentarios.
- [Semántica Scratch bajo sintaxis JavaScript] → reglas documentadas en `block-language-contract` y explicadas en la ayuda del editor.

## Migration Plan

Sin migración de datos aparte de añadir la vista activa y el texto pendiente al estado de autoría (GGPROJ v4). Los proyectos con copias independientes las conservan. Se habilita contexto a contexto; cada habilitación tiene su `test:affected` y la última, una `test:full`. Reversión: deshabilitar el modo sincronizado por contexto deja la lectura y la copia independiente como hoy.

## Open Questions

- ¿Bloques grises de código en 3D/web o rechazo como en 2D?
- ¿El modo sincronizado es el predeterminado o una opción que activa el docente? Propuesta: predeterminado, con la copia independiente como acción visible; confirmar en el Exp. 1.
