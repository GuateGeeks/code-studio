# Design

## Context

E3 tiene actividades locales y el shell E2 conserva instancias únicas de Blockly, texto y renderer. La interfaz es DOM/ES modules. Snapshot previo E4: `artifacts/e4-baseline`, con 541 archivos y tres muestras restauradas; puerta E3 preservada en `artifacts/e3-approved-gate`. Consulta CodeGraph previa sobre `createContextualWorkspace` confirma la frontera de composición.

## Goals / Non-Goals

**Goals:** integrar el ciclo 2D y su copia textual, conservar todas las herramientas, controles nativos, recuperación y contratos E1–E3; comprobar teclado, zoom, offline y regresiones.

**Non-Goals:** reemplazar Blockly/Scratch/PXT, rediseñar los otros contextos, cambiar GGPROJ, añadir cuentas, AI o permisos, afirmar aceptación escolar o hardware físico.

## Decisions

1. Conservar módulos y controles por ID; reorganizar una sola vez el DOM antes de crear los controladores. El renderer no se mueve después de arrancar. ResizeObserver de Blockly adapta su geometría.
2. En 2D/texto, programa a la izquierda y columna derecha con escenario arriba y consulta debajo. La barra común contiene contexto y transporte. Proyecto y entrada se compactan; el contenido de entrada puede plegarse explícitamente sin ocultar los avisos de recuperación.
3. Consulta desplazable con enlaces a secciones, sin pestañas ARIA que prometan ocultación: todas las herramientas permanecen en el árbol accesible. La navegación enfoca y desplaza dentro del panel, conserva actividad/pistas y no reconstruye controles. Así se evita una copia paralela de los formularios y de su estado.
4. Con poco ancho/altura o zoom se vuelve a flujo de documento sin contenedores atrapados; enlaces Editar/Ver resultado y transporte conservan su acceso. Los otros contextos usan el flujo existente.
5. Scratch aporta proximidad de programa, escenario y propiedades; MakeCode, transporte junto al resultado y ayuda contextual. Referencias oficiales: https://scratch.mit.edu/help/studio/tips/home/ y https://makecode.microbit.org/. Se conservan paleta y controles propios, sin afirmar equivalencia de capacidades.
6. La prueba propia mide geometría del primer viewport y conduce edición real, ejecución, paneles y persistencia. Las suites previas verifican los contratos compartidos; una puerta completa consolida fuentes estables. Dos tamaños de captura más 1440 y zoom real; revisión visual independiente según Impeccable.

## Risks / Trade-offs

- El panel de consulta tiene desplazamiento propio en escritorio; navegación con enlaces y retorno a edición reduce la búsqueda. En estrecho vuelve a documento.
- Canvas/iframes deben adaptarse sin perder instancia. Verificar Blockly, hits del renderer y audio con controles reales.
- La composición se valida técnicamente; comprensión y equipos escolares requieren observación docente pendiente de E3/E5.

## Direction contract

THESIS: operar una creación 2D con bloques y resultado juntos; sustituir la larga secuencia de formularios por un espacio de creación y consulta.

OWN-WORLD: superficies blancas, fondo verde claro, acción verde y foco coral del sistema existente; tipografía del sistema y controles nativos. Aula luminosa, principiantes acompañados por docente.

STORY: continuar o crear, predecir, cambiar un movimiento, ejecutar, comparar y consultar una pista sin abandonar el programa.

FIRST VIEWPORT: barra de proyecto compacta; contexto y ejecución arriba; programa ocupa aproximadamente tres quintos del ancho, escenario y consulta el resto. Interacción distintiva: cambiar un valor y contrastar el movimiento con la actividad visible en la misma estación.

FORM: composición fijada por la solicitud de integración 2D con referencia Scratch/MakeCode; extensión concreta del sistema existente, ejecución code-led sin torneo ni comp. Excepción explícita de Impeccable new-work §3: «Never run the script for a local extension or a precisely specified narrow request; shape those directly.» No se ejecutó concept-seed y no existe referencia de semilla que registrar.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
