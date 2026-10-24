# Corpus 2D y simulador micro:bit

**21 de octubre de 2026, Guatemala.** Continuación de la fase 0 con fixtures Blockly ampliados y ejecución del JS compilado en el simulador oficial local. Los resultados medidos, hashes y versiones están en [browser-evidence.json](browser-evidence.json); los criterios se encuentran en el [cambio OpenSpec](../../openspec/changes/phase-0-integration-foundations/tasks.md).

**Resultado:** 29 pruebas aprobadas, 15 Node y 14 Chromium, sin fallos ni omisiones. La suite de navegador terminó en 53,0 s. OpenSpec pasó validación estricta y la línea base confirmó preservación de commits, diffs versionados y lockfiles de los tres upstreams.

Este informe conserva esa entrega. Las continuaciones de [audio/estado](AUDIO-STATE-RESULTS.md) y [bindings/Blockly editable](BINDINGS-EDITOR-RESULTS.md) amplían la suite a 23 pruebas Node y 22 E2E; la evidencia JSON enlazada se actualiza con la última ejecución completa.

## Escenarios ejecutables

| Requisito | Evidencia y criterio |
|---|---|
| GG-BLOCK-003 | Tres fixtures Blockly guardados/restaurados conservan IR y mapas de origen. Los nombres de broadcast tienen IDs estables. La espera negativa se rechaza con el ID del bloque |
| GG-SCRATCH-005 | Espera real de 200 ms antes de mover 5; espacio DOM añade 7 y clic sobre el sprite añade 11. Secuencia de posiciones 5→12→23, con desplazamiento visual final de 23 píxeles |
| GG-SCRATCH-006, mensajes | Emisor mueve 1, envía y espera; receptor espera 200 ms y mueve 10; emisor añade 2. Secuencia observada 1→11→13 |
| GG-SCRATCH-006, clones | Dos targets reales: original x=2 y clon x=60. El clon duplica los píxeles de color visibles, de 984 a 1968; tras 800 ms se elimina y quedan 984 |
| GG-SCRATCH-007 | Stop durante espera impide movimiento tardío; Stop elimina el clon pendiente. Recrear el runner conserva la fuente y permite volver a ejecutar |
| GG-PXT-006 | El JS generado en el worker ejecuta un corazón en pxsim.Runtime/DalBoard. SHA-256 del JS enviado y recibido coincide; matriz real y opacidades de las 25 celdas SVG coinciden |
| GG-PXT-007 | Clic real sobre botón A del SVG alterna LED (0,0); la matriz y el SVG reflejan encendido y apagado. Stop destruye el frame del simulador con un programa continuo y la nueva ejecución solo enciende (4,4) |
| Vista previa | Seleccionar un fixture, pulsar Ejecutar y después Ver simulador funciona desde los controles del navegador |

El corazón esperado es `01010 / 11111 / 11111 / 01110 / 00100`: 16 LEDs encendidos. La prueba no sustituye la matriz del runtime por un modelo propio; la inspecciona y la contrasta con el SVG oficial. No se flashearon placas.

## Integración y hallazgos

El traductor en `spikes/block-program.mjs` representa los eventos y operaciones nuevos en IR antes de producir opcodes Scratch. Los fixtures están en `tests/fixtures/corpus.blocks.mjs` y se validan con scratch-parser durante el build. El runner conserva una sola VM y renderer al cambiar de fixture, usa clear para liberar los targets y registra movimientos del target original para verificar el orden.

La entrada DOM pasa por postIOData. Renderer.pick utiliza píxeles CSS, mientras Mouse transforma las coordenadas a unidades del escenario: enviarle las coordenadas del framebuffer fallaba al escalar el canvas. El E2E de clic detectó y permitió corregir esa frontera.

El compilador sigue en un worker del runner. El simulador usa pxtsim.js y la concatenación local de common-sim.js con sim.js, más la definición de placa del target. Solo se transfiere binary.js tras una compilación satisfactoria, sin recompilar ni editar ese JS antes de ejecutarlo.

PXT Runtime evalúa su código generado. Por ello la simulación reside en `127.0.0.1:4175`, como iframe subordinado al runner `:4174`, separado del anfitrión `:4173`. Solo el origen del simulador permite unsafe-eval y los estilos del SVG oficial. La CSP del runner y del compilador mantiene script-src self. El simulador no puede leer el DOM del runner; su canal valida origin/source/sesión/versión y correlaciona las peticiones.

El bundle oficial pxtsim instala un callback load que llama Embed.start y habilita su receptor global. `disable-embed.js` neutraliza ese arranque antes de load; se utiliza únicamente el MessagePort autorizado. Un mensaje global run falsificado no ejecuta su código ni reemplaza el programa. Los bundles upstream se copian sin editar y se registran sus hashes.

## Ver el progreso

Desde Ubuntu/WSL, en la carpeta del producto:

```bash
source ../scripts/env.sh
npm run browser:build
npm run browser:serve
```

Abrir `http://127.0.0.1:4173`. Seleccionar un Ejemplo 2D y pulsar Ejecutar. Para teclado, enfocar el escenario con un clic y pulsar espacio. Ver simulador compila y ejecuta el programa del textarea; Detener y reiniciar vuelve al escenario inicial y conserva ese texto. Compilar firmware sigue disponible como acción separada.

Los E2E usan 4173/4174/4175. Para mantener una vista previa durante las pruebas:

```bash
GG_SHELL_PORT=4183 GG_RUNNER_PORT=4184 GG_SIMULATOR_PORT=4185 npm run browser:serve
```

Abrir entonces `http://127.0.0.1:4183`. Este servidor es local y debe permanecer en ejecución; no se desplegó un sitio público.

## Reproducir y consultar evidencia

```bash
npm test > artifacts/integration.tap
npm run browser:build
npm run test:browser
node tools/f0/verify-baseline.mjs
node tools/f0/provenance.mjs
node tools/f0/browser-evidence.mjs
npm run spec:validate
```

La suite contiene 15 pruebas Node y 14 de navegador. La evidencia estable solo se publica si pasan las 14 E2E sin omisiones ni reintentos inestables. `artifacts/corpus-*.json` registra posiciones/targets; `artifacts/simulator-*.json` registra hashes, matriz y SVG. Las capturas locales están en `artifacts/corpus-clones.png` y `artifacts/simulator-heart.png`. El manifiesto registra nueve bundles de terceros y sus hashes.

## Criterios restantes

G1 sigue abierta por audio 2D, bindings externos, formatos hostiles, corpus pedagógico más amplio y rendimiento. Los nuevos fixtures no añaden un importador arbitrario SB3 ni completan la interfaz de autoría Blockly.

G2 ya tiene ejecución JS comprobada en el simulador de navegador, además de compilación y HEX. Sigue pendiente validar firmware en placas V1/V2 físicas. Los resultados mantienen physicalBoardValidated=false; la vista de placa probada es la del perfil V1 (mbdal), sin afirmar cobertura completa del simulador V2 o de periféricos.

La compilación offline anterior continúa cubierta tras precarga, pero no se ha probado la carga/reapertura del simulador sin conexión ni una segunda visita PWA. Faltan otros navegadores, cuotas, evaluación adversarial más amplia y política de dominios/cookies de producción. Se conserva todo el código y los cambios versionados previos upstream; fase 0 permanece en curso.
