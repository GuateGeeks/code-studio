---
name: GuateGeeks Code Studio
description: Estación de creación educativa en español para programar, ejecutar y observar.
colors:
  ink: "#263c37"
  muted: "#4d6658"
  action: "#236146"
  action-strong: "#1b4e38"
  on-action: "#fff"
  surface: "#fff"
  ground: "#f2f5f2"
  toolbar: "#e5eee7"
  selected: "#d5e6da"
  border: "#c6d4cb"
  divider: "#dce4df"
  focus: "#bc4935"
  error: "#9f3127"
  error-surface: "#fbefed"
  note-surface: "#eef5f0"
  derived-surface: "#f4f6f5"
  selection: "#f8c3b6"
typography:
  title:
    fontFamily: "system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
  section:
    fontFamily: "system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
  body:
    fontFamily: "system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.55
  label:
    fontFamily: "system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  meta:
    fontFamily: "system-ui, sans-serif"
    fontSize: "12px"
  code:
    fontFamily: "ui-monospace, monospace"
    fontSize: "14px"
    lineHeight: 1.65
rounded:
  control: "6px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "24px"
  target: "44px"
  header: "48px"
components:
  button-run:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  app-bar:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    height: "{spacing.header}"
  transport-bar:
    backgroundColor: "{colors.toolbar}"
    textColor: "{colors.ink}"
    padding: "8px 12px"
  mode-switch-selected:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.control}"
  consultation-tab-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.action}"
  note:
    backgroundColor: "{colors.note-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  form-feedback:
    backgroundColor: "{colors.error-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
---

# Diseño de Code Studio

## Overview

**Creative North Star: "Estación de creación acompañada"**

Dirección implementada el 23 de octubre de 2026 en el cambio `studio-visual-workspace-rework`. El usuario confirmó conservar la identidad existente (verdes, superficies blancas, foco coral, tipografía del sistema) y organizar el espacio en la familia de Scratch y MakeCode. Es una dirección de producto documentada, **no una marca institucional aprobada**: no hay logotipo, mascota ni paleta oficial proporcionados. `hero.svg` sigue siendo un recurso de demostración.

Modo Operate. Público: principiantes acompañados por un docente. La pantalla sirve a un ciclo: reconocer qué se edita → predecir → modificar → ejecutar explícitamente → observar → corregir → detener → conservar. Programa y resultado son protagonistas; archivos, preparación docente y detalles técnicos son herramientas secundarias con acceso claro.

**Key Characteristics:**

- Programa a la izquierda; transporte, resultado y consulta a la derecha, juntos en un portátil de 1280×720.
- Una ejecución nombrada por su autoría y una única detención junto al resultado.
- «Editando…» y «Resultado de…» identifican siempre qué se edita y de dónde viene lo que se observa.
- Lenguaje educativo en español en el primer nivel; identificadores y mensajes originales como detalle técnico.
- Superficies planas, divisores discretos, controles nativos y foco coral visible.

## Colors

Verdes de interfaz y neutros claros con tinta oscura. Coral solo para foco. Rojo solo para errores con texto.

### Primary

- **Verde de acción** (`action`): cabecera, Ejecutar, selección del modo, pestaña de consulta seleccionada y acciones principales. `action-strong` para su hover.
- **Coral de foco** (`focus`): contorno de teclado de 3px. No comunica ejecución ni error.

### Neutral

- **Tinta** (`ink`) y **texto secundario** (`muted`, 6:1 sobre blanco): títulos, etiquetas y explicaciones.
- **Superficie** (`surface`), **fondo** (`ground`) y **barra** (`toolbar`): regiones, página y transporte/pestañas. `selected` para hover de pestañas.
- **Borde** (`border`) y **divisor** (`divider`): delimitan sin relieve.
- **Notas** (`note-surface`), **derivado** (`derived-surface`) y **error** (`error-surface`): distinguen aviso educativo, código de solo lectura y validación fallida.

**The Estado legible Rule.** Un estado se comunica con texto accesible; el color lo acompaña. **The Derived Rule.** Código derivado y campos de solo lectura usan `derived-surface`; un documento independiente lo dice con texto.

Las categorías de bloques de Blockly, los renderers 2D/3D, el simulador micro:bit y la aplicación web conservan sus propios colores.

## Typography

Familia del sistema para garantizar disponibilidad offline; monospace solo para código y rutas técnicas. Escala: título 18, sección 16, cuerpo 14, etiqueta 13 (semibold), meta 12 solo para detalle técnico. No hay fuente externa ni tipografía de exhibición. Las guías mantienen hasta 75ch. Los números de posición usan cifras tabulares.

## Layout

**Cabecera (48px):** marca, nombre del proyecto y dos estados de continuidad (guardado local y solicitud de copia portable); a la derecha Inicio, Archivo (descargar, abrir GGPROJ) y Preparar para clase (offline y capacidades) como menús desplegables. Los avisos de recuperación y error del proyecto aparecen en una franja propia que se puede reconocer con «Entendido» y reaparece si el texto cambia. «Empezar o continuar» se abre como banda bajo la cabecera y se cierra al empezar o continuar, al cambiar de contexto o al ejecutar/detener; editar no la cierra, para no mover controles bajo el puntero.

**Escritorio (desde 1024×640):** rejilla de dos columnas `1.35fr | minmax(400px, 1fr)` con alto `100dvh − cabecera − avisos visibles` (mínimo 600px): un aviso toma su altura de la estación y nunca empuja la consulta fuera de la pantalla. Izquierda: autoría con su barra (Qué programas, modo Bloques · JavaScript · Python, identidad «Editando…» y ayuda de teclado) y el editor flexible. Derecha, de arriba abajo: barra de transporte, resultado y consulta con desplazamiento propio. El resultado mide `clamp(340px, 100dvh − 380px, 560px)` y la consulta conserva al menos 140px: si una nota (cambios sin ejecutar, resultado de otro contexto) o un aviso no caben, el resultado cede altura (mínimo 200px) en vez de ocultar la consulta; dentro del runner los controles de objetos se compactan a una fila para que la imagen 4:3 alcance al menos 240px de alto a 1280×720. Blockly conserva al menos 300px y la fuente editable al menos 240px. Placa y escena micro:bit comparten esa misma altura para que la consulta siga visible; cuando el resultado pertenece a otro contexto, su escena de referencia cede 120px a la consulta. El pie queda bajo la estación.

**Vista ampliada:** transporte y resultado pasan a posición fija sobre un fondo; el resto queda `inert`. Esc o «Reducir» vuelven y devuelven el foco. El iframe no se mueve en el DOM.

**Flujo (menos de 1024 de ancho o 640 de alto, y zoom):** una columna. La barra de transporte es fija arriba con enlaces Programa · Resultado · Ayuda y, a 600px o menos, Ejecutar y Detener en una misma fila (el rótulo de Ejecutar puede ocupar dos líneas); con muy poca altura deja de ser fija. Las pestañas de consulta se fijan al inicio de su panel. Sin desbordamiento horizontal global.

## Elevation & Depth

Interfaz plana. Una sola sombra con desplazamiento para los menús desplegables de la cabecera; ninguna otra región se eleva. No se usan bordes laterales gruesos de color.

## Shapes

Controles con radio `control` de 6px, borde fino y altura mínima de 44px (36px en controles compactos de cabecera y segmentos). Las notas son rectángulos con borde de 1px y fondo tintado, no tarjetas anidadas. Iconos Ejecutar y Detener son SVG propios de trazo lleno (`currentColor`), no glifos Unicode.

## Motion

Duraciones `fast` 120ms para hover/estado y `panel` 200ms (tokens `--gg-duration-*` en CSS y en el sidecar) como máximo para paneles; nada supera 300ms. Solo color y fondo de controles cambian con transición. `prefers-reduced-motion: reduce` anula transiciones y conserva el cambio visible. Las animaciones del resultado (escena, placa, aplicación) pertenecen a la ejecución, no a este sistema.

## Components

### Continuidad

La cabecera distingue guardado local y copia portable mediante dos mensajes de
texto, sin depender de color. Archivo conserva una sola acción «Llevar o entregar»
que solicita el .ggproj; la ayuda pide comprobar descargas y explica que no envía
a un docente. Un fallo local permanece visible aunque se solicite una copia.
Los reintentos local y del registro de copia son independientes. El recordatorio
permite seguir trabajando, sin modal repetitivo. Se usan tipografía, colores y
espaciado existentes; en estrecho ambos estados envuelven dentro de la cabecera.

### Transporte

Un botón Ejecutar por contexto, nombrado por su autoría (Ejecutar bloques, Ejecutar documento 2D, Ejecutar dispositivo y escena, Ejecutar Scratch, Ejecutar escena 3D, Ejecutar aplicación web), y un único **Detener** (`#stop-result`), descrito por el rótulo del resultado. Detener invalida cualquier ejecución activa, también de otro contexto, y conserva la autoría. Compilar, descargar HEX, transferir por USB, ejemplos técnicos y copias tienen sus propios botones en la consulta, con su efecto explicado.

### Identidad y resultado

`Editando …` acompaña al título del programa. `Resultado de …` nombra el resultado y su estado. Si el resultado activo pertenece a otro contexto, una nota lo explica y dice qué hará cada acción. Si la autoría cambió después de ejecutar, una nota ofrece «Ejecutar con tus cambios»; nunca se ejecuta sola.

### Modo del programa

Grupo de radios nativo presentado como segmentos: Bloques · JavaScript · Python (2D, 3D, web) o Bloques de firmware · TypeScript independiente (micro:bit). En Escena 2D, elegir JavaScript o Python abre una vista editable del mismo programa; volver a Bloques valida el texto y conserva el resultado activo. El rechazo aparece junto al código con línea y tres salidas por teclado, y Deshacer recupera el programa previo. Texto 2D mantiene los documentos independientes; sus plantillas nuevas usan API3. Micro:bit y 3D/web conservan por ahora la selección de documentos independientes. La consulta de fuente derivada sigue siendo de lectura.

### Consulta

Pestañas reales (`tablist`, flechas, Inicio/Fin) sobre paneles montados: Propiedades, Código, Firmware, Original y copia, Objetos 3D, Código 3D, Componentes web, Código web, Actividad, Diagnósticos, Recursos y Ayuda, según el contexto. La selección se recuerda por contexto y vuelve a una herramienta válida al cambiar. Revelar un destino (diagnóstico, enlace de ayuda) selecciona su pestaña y abre el detalle necesario.

### Campos, propiedades y errores

Propiedades iniciales con rótulo educativo (por ejemplo «Estilo · Tamaño de letra») y la ruta técnica en monospace debajo. Una validación fallida se muestra dentro del formulario: causa, siguiente paso y detalle técnico desplegable, con `aria-invalid` en el campo identificable. El borrador sigue editable y la autoría y la ejecución anteriores no cambian. Los diagnósticos de consola muestran primero una explicación en español y conservan nivel, código, origen y mensaje en «Detalle técnico».

### Original Scratch

Junto a la importación, una nota de estado: sin original, revisando, «Se puede ejecutar y convertir», «Se puede ejecutar; no se puede convertir» o «Ejecución bloqueada», con la acción siguiente (crear copia editable, descargar original, ver qué bloques lo impiden). La cobertura detallada usa nombres educativos de bloques y guarda opcode e IDs como identificación técnica. No hay edición nativa del original.

### Actividad

Las actividades E3 se presentan como tutorial por pasos: objetivo, requisitos, predicción, pasos numerados, pistas graduadas, reflexión y Comprobar. Desde 3D, web, micro:bit o Scratch una nota indica que son recorridos de Escena 2D y que cargar protege y reemplaza el proyecto sin ejecutar.

## Do's and Don'ts

### Do:

- **Do** nombrar la autoría que se ejecutará y el origen del resultado.
- **Do** mantener una sola instancia de cada editor, documento y control de detención.
- **Do** conservar foco visible, enlaces directos y orden de documento al reducir el espacio.
- **Do** medir el canvas dentro del resultado, no solo su contenedor.

### Don't:

- **Don't** ejecutar al navegar, consultar, cambiar de modo, importar o reabrir.
- **Don't** presentar la consulta de código derivado como editable ni prometer sincronización en un contexto aún no habilitado.
- **Don't** usar glifos Unicode como iconos, bordes laterales gruesos ni tarjetas anidadas.
- **Don't** presentar una comprobación automática como medición de aprendizaje ni esta dirección como marca oficial.
