# Arranque bloqueado: investigación de causa raíz

29 de octubre de 2026, Guatemala. Pista C del [plan de estabilización 2D](../product/STABILIZATION-PLAN-2D.md), rama `stab/startup-hang` desde `356c08b`. Registro previo en [TESTING](TESTING.md#fallos-intermitentes-conocidos).

**Estado: mecanismo demostrado y corregido en el producto.** Si el servicio de audio no responde, el arranque del estudio se bloquea. El fallo se reprodujo a voluntad con la misma firma que la traza del 29/10. Además, el audio real de WSLg se bloqueó solo durante la investigación, con la misma firma de 20 s por constructor. Lo que no se pudo observar es ese bloqueo dentro de las dos fulls: ahí se infiere de la firma.

## Conclusión

1. Blockly 13 crea un `AudioContext` en el constructor de cada `WorkspaceSvg` (`WorkspaceAudio`), aunque el editor use `sounds: false`. El estudio crea cuatro editores Blockly (tres espacios de trabajo cada uno), así que el documento del estudio construye **12 `AudioContext` al arrancar**, antes de que `#run-editor` se habilite. El iframe del runner no crea ninguno.
2. En Chromium, `new AudioContext()` es síncrono y espera al servicio de audio. Si el servidor de audio sigue conectado pero no contesta, **cada constructor bloquea el hilo principal 20 s**. Doce constructores dan unos 240 s sin hilo principal. Durante ese tiempo Playwright no recibe respuesta del renderizador y el estudio no termina de arrancar.
3. La firma reproducida coincide con la traza del 29/10: `goto` rápido; `toBeEnabled` de 15 s que devuelve el error a los **120 s**, en la primera ventana en que el renderizador responde; el caso dura **2,1 min**; y llegan juntos **cinco** errores `The AudioContext encountered an error from the audio device or the WebAudio renderer`.
4. **Corrección:** mientras se crean los editores, `WorkspaceAudio` recibe un contexto diferido. El `AudioContext` real se construye cuando suena algo por primera vez. Blockly solo lo pide tras un gesto (el pitido de error del teclado, que hoy funciona y se conserva). Con el servidor de audio bloqueado, el estudio habilita Ejecutar en **256 ms** (antes, 240 s) y el caso del 29/10 aprueba.

## Evidencia leída antes de reproducir

### Traza del 29/10 (`GG-F7-SHELL … (mobile)`)

Ruta: `artifacts/stabilization-2d/e0-20261029/full-attempt-1/failure/`, en el checkout principal.

- **Tiempos (monotónicos, ms):** `goto('/')` de 78 429 a 78 886, es decir, 457 ms. La ruta de `editor.bundle.js` respondió en 42 ms (78 480 → 78 522). `expect(toBeEnabled)` empezó a las 78 887. En el lado de la página terminó a las 199 202 (**120,3 s**) y en el del test a las 202 206 (**123,3 s**). La espera configurada era de 15 s.
- **Página:** no hay eventos ni capturas de pantalla entre 78 501 y 199 168. A las 199 204, en el mismo milisegundo, llegan **cinco** errores de consola `The AudioContext encountered an error from the audio device or the WebAudio renderer`, con origen en el documento del estudio. Antes no hubo ningún otro error.
- **Cierre:** las *After Hooks* tardan 5 s en la fixture `page`, por la captura fallida.
- **Log de la full:** el caso es el 9.º del navegador del worker. El 8.º, la variante escritorio del mismo test, aprobó en 12,1 s. El navegador del worker ya estaba conectado al servidor de audio.
- **Weston de WSLg (`/mnt/wslg/weston.log`):** registra cambios de disposición de monitores de Windows a las 14:06:12–14:06:32, seis segundos antes del caso (14:06:37,9). Hay eventos parecidos a las 13:48, 13:55, 14:24 y 14:57 sin fallos asociados, así que la correlación **no prueba nada**. `/mnt/wslg/pulseaudio.log` no tiene entradas a esa hora: solo registra desconexiones del sumidero RDP, la última a las 11:08.

### Ocurrencia del 25/10 (`E4-02`)

El caso duró 128,7 s y no se conserva la traza; las rutas del reporte se sobrescribieron. Tampoco hay captura `test-failed`, coherente con una página que no responde. Es el mismo síntoma, sin más evidencia.

## Hipótesis y experimentos

Scripts, registros y JSON en `artifacts/stabilization-2d/startup-hang/` (no versionado). Puertos 5600–5609. Chromium headless shell 156 con los mismos argumentos que la puerta.

| # | Experimento | Resultado |
|---|---|---|
| E1 | `new AudioContext()` contra el PulseAudio real de WSLg (`audio-probe.mjs`) | 30, 1 y 10 ms. El servicio de audio carga `libpulse` y se conecta a `/mnt/wslg/PulseServer` |
| E2 | Servidor Pulse mudo desde el inicio (`silent-pulse.mjs`) | Constructor 5 023 ms; Chromium registra «Timed out trying to connect to PulseAudio» y pasa a ALSA |
| E3 | Proxy que **deja de reenviar después** de conectado (`stall-experiment.mjs ctor`) | Constructor **20 016 ms**; un `evaluate` de CDP esperó 19,5 s |
| E4 | Contar `AudioContext` en el arranque real (`count-audiocontexts.mjs`) | **12** en el estudio, todos desde `WorkspaceAudio` de Blockly (`inject` → `WorkspaceSvg` y flyouts); 0 en el runner |
| E5 | Arranque real con el audio bloqueado tras conectar (`stall-experiment.mjs page`, antes de la corrección) | Ejecutar habilitado a los **240,4 s**; latidos CDP de 119,9 y 119,6 s; 5 errores de `AudioContext` al final |
| E6 | Puerta real A/B, build previa: `accessibility-shell.spec.mjs:93`, bloqueo activado al aprobar el primer caso (`stall-spec.sh`) | Escritorio ✓ 9,9 s; móvil ✘ **2,1 min**, `toBeEnabled` de 120,2 s, **5** errores de `AudioContext`. Misma firma que el 29/10 |
| E7 | Mismo A/B con la corrección | 2/2 ✓. Móvil 30,3 s (ver «Riesgo residual») |
| E8 | E5 con la corrección | Ejecutar habilitado a los **256 ms**; latido CDP máximo de 13 ms |
| E9 | Control de carga: build previa, audio real, dos núcleos ocupados con `nice 19`, `accessibility-shell` + `workspace-presentation` × 2 | **36/36 ✓**, carga hasta 8,57, caso más largo 11,7 s, sin bloqueo |
| E10 | Monitor del audio real de WSLg: un `AudioContext` cada 15 s en un navegador persistente (`audio-monitor.mjs`, 21:25–22:09 UTC) | 166 sondas. **Bloqueo espontáneo** de 15:56:46 a 15:59:08 (hora local): cuatro constructores de **20 052–20 083 ms** seguidos y uno de 7 021 ms; el resto, ≤ 31 ms. Ninguna prueba mía usaba el audio en ese intervalo |
| E11 | Proceso del runner (`runner-process.mjs`) | El iframe de `:5601` es un OOPIF, con renderizador propio |

### Discusión de las hipótesis

- **Carga de CPU o memoria compartida (la atribución anterior):** descartada como causa suficiente. E9 no la reproduce. La carga sola no explica tampoco un bloqueo de duración casi fija, ~120 s hasta la primera respuesta, ni los errores del dispositivo de audio.
- **Servicio o servidor de audio sin respuesta (H1):** demostrada como mecanismo (E3, E5 y E6), con la firma completa. E10 muestra que el audio real de WSLg sí se bloquea solo durante unos 2,4 min, con los mismos 20 s por constructor que el proxy. Que eso ocurriera en las dos fulls es la explicación más consistente: los cinco errores de dispositivo de audio de la traza solo aparecen cuando la ruta de audio falla. No se observó dentro de una full.
- **Disparador en WSLg (sin demostrar):** Weston registró un cambio de disposición de monitores de Windows (`DisplayLayoutChange: monitor count:0x2`, sin desconectar pantalla) a las 15:56:33, 13 s antes del bloqueo de E10. Lo mismo ocurrió a las 14:06:30, 7 s antes del fallo del 29/10. Un evento igual a las 14:24:53 no afectó a la full. Es una correlación de 2 de 3, no una causa. El disparador está fuera del producto: escritorio remoto de WSLg y sumidero de audio RDP.
- **`page.route` de `editor.bundle.js`:** descartado. La ruta respondió en 42 ms y el caso del 25/10 (`E4-02`) no la usa.
- **Estado heredado entre casos:** solo cuenta el navegador del worker, que reutiliza el servicio de audio ya conectado. Por eso un servidor que se cuelga a mitad de la full produce bloqueos de 20 s por constructor y no el *fallback* de 5 s de E2. No se vieron procesos ni servidores huérfanos en el log.
- **Por qué 20 s y la ventana de ~120 s:** son valores empíricos de Chromium 156 (E3, E5). No se localizó la constante interna. Los latidos de CDP se respondieron cada ~120 s, es decir, cada seis constructores. Lo más probable es que el renderizador solo atienda CDP entre tareas y que cada tarea cree dos editores. No se instrumentó.

## Corrección

- **`src/editor/deferred-audio.mjs`:** `withDeferredAudioContext(create)` sustituye el global `AudioContext` solo durante la llamada síncrona a `Blockly.inject`, y lo restaura en `finally`. El objeto diferido expone lo que usa `WorkspaceAudio`: `state`, `currentTime`, `destination`, `resume`, `close`, `createBufferSource`, `createGain`, `createOscillator` y `decodeAudioData`. Antes de construirse informa `suspended`. `resume()` lo construye, y Blockly solo lo llama tras un gesto (`navigator.userActivation.hasBeenActive`). `close()` sin contexto real no construye nada.
- **`editor-entry.mjs`, `device-editor.mjs` y `capability-editor.mjs`:** envuelven su `Blockly.inject`. Ni los contratos ni los formatos cambian, y la ejecución sigue siendo explícita. El audio del runner (Scratch) y la vista previa de recursos no se tocan.
- **Pruebas que acoplan el texto del bundle:** `accessibility-shell.spec.mjs` y `scene-inspector.spec.mjs` buscaban `const workspace = X.inject(` para exponer el workspace al test. La expresión reconoce ahora la envoltura. No cambian tiempos, reintentos ni aserciones.

### Pruebas

- **Navegador, `studio-entry-journey.spec.mjs`, «GG-ENTRY-001: arrancar no crea audio…»:** cuenta las construcciones reales de `AudioContext`. Exige 0 al arrancar y, tras ← en la caja de herramientas, exactamente un pitido y un contexto. Antes de la corrección fallaba con 12 pilas de `WorkspaceAudio`; después aprueba en 2,2 s.
- **Node, `tests/integration/deferred-audio.test.mjs` (4 casos):** inyectar sin construir audio y restaurar el global, delegar tras `resume`, cerrar sin construir, y conservar el comportamiento sin Web Audio o con una excepción.
- **Bloqueo real (no forma parte de la puerta, porque depende de PulseAudio de Linux):** E6, E7 y E8. Para repetirlo: `artifacts/stabilization-2d/startup-hang/experiments/stall-spec.sh <nombre> <browserRoot> <spec>`.

## Verificación

Del 29/10/2026, en el worktree `gcs-startup-hang`, con los puertos 5600–5609:

- **Node:** `npm test` 478/478 (incluye los 4 casos nuevos), `npm run test:tools` 79/79 y `npm run spec:validate` 37/37.
- **Prueba nueva:** roja antes de la corrección (12 contextos al arrancar); verde después en 2,2 s.
- **Focales con la build corregida:** `studio-entry-journey` 9/9, `accessibility-shell` 6/6, `workspace-presentation` 12/12, `capability-contexts` 5/5, `integrated-microbit-workspace` 4/4 y `scene-inspector` 3/4. La de `scene-inspector` es una suite de puertos canónicos: `GG-INSPECT-002` busca el runner en `127.0.0.1:4174` y no puede correr en 5601. Sus casos que usan la expresión modificada aprobaron. Queda para la puerta del coordinador. Carga media durante la corrida: 6,8–10,4.
- **Bloqueo real A/B:** sin la corrección, 1/2 con la firma del 29/10; con la corrección, 2/2. Arranque con el audio bloqueado: 240,4 s antes y 0,26 s después.
- **No ejecutado (lo hará el coordinador):** `test:quick`, `test:affected` y `test:full`.

## Riesgo para el piloto

- **Antes:** si el audio del equipo se cuelga (controlador, auriculares Bluetooth, servicio de audio de Windows), el estudio puede quedarse minutos sin poder ejecutar al abrirse, y multiplica cualquier lentitud de audio por 12. En un portátil escolar se vería como «el estudio no arranca». Es un riesgo real de clase. El mecanismo se demostró en Linux/WSL; **no se probó en Windows con Chrome**.
- **Después, riesgo residual:**
  - El primer pitido de error del teclado construye un contexto real. Con el audio colgado, esa pulsación congela el editor ~20 s. Es lo que explica los 30,3 s de E7, cuyo caso usa teclado; se infiere, no se instrumentó.
  - Los sonidos de un programa Scratch y la vista previa de un sonido también construyen contextos. El runner es un OOPIF, así que un bloqueo ahí no congela el hilo del estudio. Sí puede retrasar el programa. No se verificó que Detener responda en ese caso.
- **Posible relación sin verificar:** el fallo aislado `GG-COPY-002 audioStop` de [TEST-GATE-SCALING-RESULTS](TEST-GATE-SCALING-RESULTS.md) es de audio. No hay traza para comprobarlo.

## Decisiones para el usuario

1. **Pitido de teclado de Blockly.** Hoy suena aunque el editor declare `sounds: false`; la corrección lo conserva. Silenciarlo del todo eliminaría el riesgo residual del teclado, pero quita una señal de accesibilidad. Es una decisión de producto.
2. **Aislar la puerta del audio del equipo.** Por ejemplo, `PULSE_SERVER` sin servidor en el entorno de Playwright: Chromium pasa a ALSA en milisegundos (E2, variante «Connection refused»). Así las suites con sonido no dependerían de WSLg. No se aplicó: ocultaría a la puerta el riesgo del producto, y la corrección ya quita el audio del arranque.
3. **Instrumentación opcional.** Registrar en la full la latencia de un `AudioContext` de control antes del navegador permitiría atribuir futuros casos sin adivinar.
