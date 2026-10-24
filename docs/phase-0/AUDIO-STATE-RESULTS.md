# Audio, variables y condicionales en el runner

**22 de octubre de 2026, Guatemala.** La fase 0 incorpora estado numérico, decisiones y audio real al corpus Blockly→IR→Scratch VM. Los contratos y tareas están en el [cambio OpenSpec](../../openspec/changes/archive/2026-10-24-phase-0-integration-foundations/tasks.md); los resultados medidos completos están en [browser-evidence.json](browser-evidence.json).

**Resultado final:** 38 pruebas aprobadas, 20 Node y 18 Chromium, sin fallos ni omisiones. OpenSpec pasa validación estricta. Los tres upstreams conservan commits, diffs versionados y lockfiles respecto a la línea base.

Este informe conserva esa entrega. La [continuación con bindings y Blockly editable](BINDINGS-EDITOR-RESULTS.md) amplía la suite a 23 pruebas Node y 22 E2E; el JSON de evidencia enlazado refleja la última ejecución completa.

## Evidencia de esta entrega

| Requisito | Resultado comprobado |
|---|---|
| GG-BLOCK-004 | Round-trip de variables, audio y detener sonidos. IDs estables para declaraciones, lecturas, comparaciones y ambas ramas. Rechazo explícito de LTE y sonido ajeno al fixture |
| GG-SCRATCH-008 | Contador local 0→1→2→3. Ramas verdadera/falsa producen movimientos 4→11→18→21; el desplazamiento visual es 21 píxeles. Espacio reduce el contador a 2 y mueve a x=19. Reiniciar restaura contador 0 y x=0 |
| GG-SCRATCH-009, espera | WAV propio decodificado por Scratch Audio: mono, 1,2 s. Contexto running, RMS no nulo y pico espectral cercano a 440 Hz; x permanece en 0 durante el sonido y pasa a 5 después de terminar. La salida vuelve a silencio |
| GG-SCRATCH-009, detener bloque | Inicio de sonido sin espera; detener sonidos interrumpe la reproducción antes de su duración completa y permite mover a x=3 |
| GG-SCRATCH-010 | Stop durante sound_playuntildone devuelve la salida a silencio e impide el movimiento posterior, incluso esperando más que la duración original. Al reemplazar el runner, Chromium informa el AudioContext cerrado; el frame anterior queda separado y una nueva activación reproduce correctamente |

El WAV fuente contiene 26 460 muestras PCM16 a 22 050 Hz, con tono de 440 Hz y rampas de 10 ms. Ocupa 52 964 bytes. Chromium lo remuestrea al formato del AudioContext; la prueba observa un buffer mono de 1,2 s a 44 100 Hz. El FFT de 2048 muestras ubica el pico alrededor de 430,66 Hz, dentro de su resolución. La medición está en la salida real del grafo de audio, después de los efectos del motor.

Se mide señal Web Audio, no percepción acústica ni salida de altavoces físicos. Los E2E no falsifican AudioContext, SoundPlayer ni temporizadores; tampoco añaden flags que desactiven autoplay o solicitan micrófono.

## Cambios de integración

La IR admite variables numéricas locales del sprite, asignación, incremento/decremento y lectura como entrada de movimiento. Los bloques Blockly variables_set, math_change, variables_get, logic_compare y controls_if se traducen a opcodes nativos Scratch. Se admiten EQ/LT/GT y una rama alternativa opcional; else-if, otros operadores y otros tipos de expresión se rechazan explícitamente. La autoría se clona antes de deserializar y conserva los valores iniciales mientras la VM mantiene el estado ejecutado.

`tools/f0/tone.mjs` genera el WAV propio determinista. El build lo identifica por contenido, incluye sus metadatos y lo incorpora como asset Sound en los fixtures de audio. El Helper local de Scratch Storage distingue SVG y WAV y no utiliza un web store. Se empaqueta Scratch Audio 2.0.268 desde la dependencia fijada del checkout Xcratch, conservando el bundle y hashes en el manifiesto. Son diez bundles de terceros contando compilador, VM, render, storage, audio y simulador.

Scratch Audio se adjunta antes de deserializar los sonidos. Su salida se conecta a un AnalyserNode y al destino Web Audio. Se inspeccionan RMS, frecuencia, duración decodificada, estado de SoundPlayer y eventos play/stop. El contexto se crea solo al cargar un fixture con audio y se reanuda desde un botón dentro del runner, durante un gesto real del usuario.

El primer intento de observar la destrucción desde CDP del anfitrión no aportó un evento de cierre; separar un frame por sí solo no demuestra ese estado. La implementación solicita ahora shutdown por el puerto existente, después de invalidar la sesión y rechazar peticiones pendientes. El runner detiene VM/workers y cierra AudioContext. El anfitrión espera como máximo 150 ms y retira el frame aunque no reciba respuesta. La prueba usa CDP del frame de audio y observa contextChanged=closed antes de comprobar su separación. Las regresiones conservan Stop con worker bloqueado y rechazo de mensajes antiguos.

## Ver y reproducir

Con la preparación del [README](../../README.md) completada, desde Ubuntu/WSL:

```bash
source ../scripts/env.sh
npm run browser:build
npm run browser:serve
```

Abrir `http://127.0.0.1:4173`. En Ejemplo 2D seleccionar Contador y decisiones, Sonido y espera o Detener sonidos y pulsar Ejecutar. En los dos ejemplos de sonido aparece Reproducir sonido dentro del escenario: pulsarlo para autorizar audio. Detener y reiniciar conserva el programa micro:bit del anfitrión.

La vista previa puede coexistir con los tests usando puertos 4183/4184/4185 como describe el [informe anterior](CORPUS-SIMULATOR-RESULTS.md). Debe permanecer ejecutándose el servidor local.

```bash
npm test > artifacts/integration.tap
npm run browser:build
npm run test:browser
node tools/f0/verify-baseline.mjs
node tools/f0/provenance.mjs
node tools/f0/browser-evidence.mjs
npm run spec:validate
```

La suite completa contiene 20 pruebas Node y 18 de navegador. `artifacts/corpus-variables.json`, `corpus-audio.json`, `corpus-audio-block-stop.json` y `corpus-audio-stop.json` guardan estados y mediciones. `artifacts/corpus-audio.png` muestra los controles integrados; `artifacts/browser/tone.wav` conserva el audio fuente. La evidencia estable solo se regenera al pasar las 18 E2E sin fallos, omisiones ni resultados inestables.

## Criterios que siguen abiertos

G1 conserva pendientes bindings externos, variables globales y listas, expresiones más amplias, cambios de disfraz/efectos y un corpus pedagógico mayor, importación general y rendimiento. La prueba de audio cubre un WAV mono y un sonido por sprite; no aprueba mezclas complejas, codecs adicionales, audio en clones ni dispositivos de salida físicos.

La frontera por origen y la CSP permanecen; solo el contexto micro:bit permite evaluación dinámica. Quedan otros navegadores, cuotas y análisis adversarial de formatos. G2 sigue pendiente de placas físicas V1/V2; no cambia physicalBoardValidated=false. No se ha validado reapertura offline ni PWA. Esta entrega amplía las pruebas de fase 0 y no cierra su validación arquitectónica global.
