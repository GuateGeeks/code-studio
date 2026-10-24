# F1 — Inspector, toolbox y fuentes propias

**22 de octubre de 2026, Guatemala · Implementado y consolidado; corte F1 cerrado para el alcance acordado.**

Este corte combina `phase-1-scene-inspector` y `phase-1-runtime-extraction`. Conserva el informe de [persistencia](RESULTS.md), el de [código/consola](CODE-CONSOLE.md) y sus evidencias como hitos históricos independientes.

## Interfaz y autoría

El Inspector ofrece Escena 2D/hero y una lectura de las operaciones GG existentes. Distingue el estado inicial fijo de GGPROJ de la última lectura x/y/variables locales. No muestra globales Stage, clones o propiedades que el DTO todavía no ofrece. Actualizar consulta; no edita ni captura ejecución como autoría.

Las lecturas se validan, clonan y acotan; token/sesión/revisión impiden aplicar respuestas antiguas después de Stop, otra carga o una lectura más reciente. Un dato inválido conserva la última lectura válida con error visible. Cambios de posición agrupan solicitudes con debounce; no hay polling.

La toolbox permite crear Apariencia, Clones y Sonido con bloques ya implementados. La asignación global aparece en Variables cuando existe una variable numérica, sin crear variables solo por abrir el menú. Los recursos siguen limitados al catálogo hero/hero-alt/tone.

## Fronteras propias

| Fuente | Responsabilidad |
|---|---|
| src/contracts | IR validada y cliente GG propio |
| src/editor | Blockly y traducción a IR |
| src/adapters/scratch | Traducción nativa, bindings y VM/render/audio |
| src/studio | Shell, proyecto, consola e inspector |
| src/runtime | Transporte/coordinación, sin internals VM |
| src/targets/microbit | Compilador y simulador PXT |
| src/assets | Recursos propios fijados |

Persistencia, listado, consola y DTO de inspección permanecen como módulos propios en src. Los wrappers experimentales delegan a estas fuentes para mantener imports de pruebas/herramientas históricas. El editor no reexporta el adaptador. El build sirve módulos organizados bajo /app y conserva entradas /shell.js y /runner.js, orígenes y CSP anteriores.

Una prueba ejecutable de dependencias prohíbe imports de src hacia spikes, modelos hacia UI/motores, shell hacia internals de ejecución y acceso Scratch/PXT fuera de sus adaptadores autorizados. Las fuentes upstream no se cambian. La publicación independiente de los checkouts sigue como entrega de distribución posterior.

## Verificación

Las pruebas específicas cubren teclado/móvil, coincidencia de lectura con GG, autoría/autosave intactos, respuestas antiguas/DTO inválido y un bloque de disfraz añadido mediante arrastre real, conectado, guardado en GGPROJ y reabierto con ID y píxeles conservados.

La consolidación aprobó **62/62 Node, 27/27 herramientas y 46/46 E2E** (3 smoke y 43 regresiones), sin fallos, omisiones, flaky ni reintentos. El perfil full tomó 249,87 s; regresión Chromium 226,21 s. Se reutilizaron las siete etapas del build (0,57 s). OpenSpec valida seis cambios; los dos de este corte quedan con sus tareas completas. Se conservaron commits/diffs/locks de los tres upstreams y hashes de evidencias/cambios anteriores. [Evidencia propia](f1-completion-evidence.json) conserva fuentes, reportes y artefactos archivados para futuras fases. El inspector recibió revisión visual independiente de sus paneles escritorio/móvil: ship dentro de esas vistas. La revisión no sustituye las pruebas interactivas ni certifica estados no capturados.

## Continuación autorizada

El usuario autorizó continuar las demás implementaciones del plan sin nuevas preguntas rutinarias. Al cerrar F1 sigue F2: documentos textuales independientes y runtimes QuickJS/Pyodide aislados, con capacidades/corpus definidos antes de implementarlos. Ver [preparación F2](../engineering/F2-PREPARATION.md). Hardware, piloto escolar y evidencias presenciales se mantienen explícitos; no se dan por aprobados mediante pruebas de software.
