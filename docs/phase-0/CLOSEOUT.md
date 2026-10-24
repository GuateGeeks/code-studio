# Cierre de fase 0 y paso a fase 1

**22 de octubre de 2026, Guatemala · Estado: fase 0 cerrada para iniciar el corte 2D persistente de fase 1.**

Se acepta **G1 para el corte 2D persistente de F1**, reutilizando Scratch VM + Scratch Render detrás de contratos propios. G2 queda clasificada: compilación y simulación aprobadas; ejecución autónoma física pendiente. Esta última no bloquea F1 según el plan. Los spikes siguen siendo experimentales y el rendimiento escolar aún no está validado.

## Corpus mínimo y resultados funcionales

El corpus pasa por Blockly→IR propia→bloques nativos→VM/renderer reales. Las pruebas previas de bindings, audio, aislamiento y micro:bit se conservan; las nuevas completan los casos que faltaban.

| Caso | Evidencia y criterio |
|---|---|
| Secuencia y repetición | Tres movimientos de cinco pasos: x=15 y desplazamiento real de píxeles |
| Espera, teclado y clic | Inicio diferido, espacio y clic DOM: x=23; la VM y el canvas coinciden |
| Mensajes | Broadcast-and-wait: posiciones 1→11→13, receptor antes de continuación del emisor |
| Clones | Target nativo adicional, píxeles 984→1968→984 y eliminación al terminar/Stop |
| Estado y decisiones | Contador y ambas ramas: 4→11→18→21; evento posterior conserva el estado y llega a 19 |
| Global/local | Stage global=17 compartida; local original=3 y local clon=5; recarga restaura ceros y un target |
| Dos scripts concurrentes | Ambos alcanzan su primera espera; el corto termina mientras el largo sigue pendiente; orden por script sin orden total impuesto |
| Disfraces | Nombre nativo y píxeles rojos→azules→rojos, con dos SVG propios locales |
| Audio | WAV local real, gesto de usuario, señal Web Audio, espera, detener sonidos y cancelación sin continuación tardía |
| Diagnóstico y autoría | Bloque/IR/argumento inválidos conservan la escena válida y muestran diagnóstico con ID cuando corresponde |
| Bindings GG | Consulta/movimiento/variable/mensaje actúan sobre la misma VM; referencias de sesión/revisión antiguas rechazadas |
| Stop y aislamiento | Orígenes distintos, canal autenticado, CSP de red, cierre de audio, worker bloqueado destruido y nueva ejecución |
| PXT y micro:bit | Worker local produce JS/HEX V1/V2/universal; simulador ejecuta exactamente ese JS, con corazón/botón y Stop/reinicio |

Fuentes: [evidencia consolidada](browser-evidence.json), `tests/integration/*.test.mjs`, `tests/browser/*.spec.mjs` y [mapa de integración](INTEGRATION-MAP.md). Las pruebas nuevas son `minimum-corpus.test.mjs` y `minimum-corpus.spec.mjs`. Los resultados locales de ámbito, disfraces y concurrencia se conservan en `artifacts/corpus-*.json`, con captura `corpus-costume-alt.png`.

**Corrida final:** 30/30 pruebas Node en 4,96 s y 25/25 E2E Chromium en 161,81 s; cero fallos, omisiones o casos flaky, sin reintentos. Las mediciones independientes finalizaron 3/3 en 84,38 s, más 1/1 repetición de arranque aislado. No se suman las repeticiones de desarrollo como nuevos casos de cobertura. Los once hashes de bundles de la medición coinciden con el build de la regresión final.

## Estabilidad y rendimiento medidos

[performance-evidence.json](performance-evidence.json) conserva todas las muestras, entorno, procedimientos y versiones. Se usó Chromium headless 156.0.8078.4, Node 22.23.4, WSL2 Linux, Ryzen 7 3700X y ANGLE/SwiftShader. Builds de desarrollo sin compresión; no corresponde al equipo escolar de referencia. La repetición de arranque se ejecutó sin otras suites, separada de la corrida funcional.

| Medida | Resultado observado | Interpretación |
|---|---|---|
| Arranque de contexto nuevo, 3 muestras | Mediana 2867,8 ms; máximo 2979,6 ms | Navegación hasta Run habilitado con runner listo; no arranque frío del sistema/proceso |
| Reload, 3 muestras | Mediana 2579,3 ms; máximo 3943,4 ms | Mismo contexto; servidor no-store, por tanto no demuestra caché HTTP/offline |
| Bundles listados, 11 archivos | 23 223 179 bytes | Bytes crudos, no tamaño transferido comprimido ni inventario de todos los assets |
| Pack compilador | 5 221 168 bytes | Se informa aparte; optimizar y separar carga del compilador en producto |
| Feedback Stop, 10 ciclos | Mediana 5,1 ms; máximo 41 ms | Siguiente requestAnimationFrame con sesión invalidada y Run deshabilitado; dentro de 100 ms en este banco |
| Retirada del frame anterior | Mediana 15 ms; máximo 49,2 ms | Descarte dentro de 1 s; no incluye arranque del reemplazo |
| Nuevo runner listo tras Stop | Mediana 1172,4 ms; máximo 1730,8 ms | Espera de recuperación visible; trabajo de optimización para F1 |
| Recursos tras cada Stop | 10 contextos de audio y 33 workers observados cerrados; shell+un runner | 12 workers estaban activos antes de Stop (10 de bucle y 2 PXT); otros 21 eran fetch-workers efímeros. Autoría Blockly editada y fuente PXT conservadas; cero workers anteriores y cero threads en el reemplazo |
| Heap JS del target shell después de GC | 5 667 660→6 060 792 bytes: +393 132 (+6,94 %) | Crecimiento observado; 3 documentos, 1713 nodos y 216 listeners constantes; requiere soak prolongado |
| Cien sprites nativos, 3×2 s | 57,0–59,3 draws completados/s; mediana 57,4 | Original+99 clones, scheduler real y gl.finish; throughput de dibujo, no FPS del compositor ni aprobación escolar |

El heap por target CDP puede compartir isolate: no sumar shell y runner ni llamarlo RAM total. No incluye heaps de workers, audio nativo, GPU ni RSS del navegador. Diez ciclos no demuestran ausencia de fugas. El benchmark fijo tampoco representa todos los programas/mezclas de audio. No se redujeron los umbrales de referencia para obtener un aprobado.

## Decisiones y puerta de transición

| Criterio de cierre | Decisión |
|---|---|
| G1 | Aceptada para el subconjunto GG y el primer corte F1 con regresión final aprobada; [ADR-001](../adr/001-motor-2d-scratch.md) |
| Modelo y frontera | Autoría en shell, estado de ejecución único en VM, IR validada y sesión/revisión; [ADR-002](../adr/002-estado-ir-sesiones-aislamiento.md) |
| G2 | Generación/simulación aprobadas para paquetes probados; `physicalBoardValidated=false`; [ADR-003](../adr/003-pxt-y-clasificacion-g2.md) |
| Estabilidad | Diez ciclos aprobados; cualquier regresión en descarte, contaminación de sesión o pérdida de autoría bloquea F1 |
| Perfil escolar | Pendiente: acordar hardware/navegador/energía y medir ≥30 FPS del escenario de referencia; reabrir G1 si el objetivo no se puede resolver en el adaptador |
| OpenSpec y upstreams | Cinco capacidades y 41 tareas completas; validación estricta aprobada. CodeGraph sincronizado y consultas conservadas. Los tres upstreams conservan commit, diff versionado y lockfile; incluidos los 15 cambios previos de micro:bit |

La fase 1 comienza con [PHASE-1-ENTRY](PHASE-1-ENTRY.md): extraer contratos del spike, definir GGPROJ y autosave, carga/restauración atómica y recuperación. Su aceptación es crear→programar→ejecutar→detener→cerrar→reabrir conservando autoría/recursos y comportamiento, en una UI y sin backend de ejecución. Conservar el workspace en memoria durante Stop no satisface esa persistencia.

Antes del piloto se deben optimizar los bundles de desarrollo y repetir arranque/Stop/rendimiento en el perfil escolar, además de un soak prolongado para investigar el crecimiento de heap. G2 física, segunda visita offline, lenguajes libres e importación general siguen en sus fases respectivas. El toolbox actual y los bindings GG siguen acotados al ejemplo inicial; los nuevos fixtures se prueban por la misma ruta de IR, sin afirmar que ya existe un editor de recursos completo.

## Reproducción y evidencia

Con el entorno y dependencias preparados como en [README](../../README.md), ejecutar secuencialmente desde Ubuntu/WSL:

```bash
source ../scripts/env.sh
set -o pipefail
npm run browser:build
npm test | tee artifacts/integration.tap
npm run test:browser
node node_modules/playwright/cli.js test --config=playwright.performance.config.mjs
node tools/f0/performance-evidence.mjs
node tools/f0/verify-baseline.mjs
node tools/f0/provenance.mjs
node tools/f0/browser-evidence.mjs
npm run codegraph -- sync .
npm run spec:validate
```

Las suites usan puertos 4173–4175 y 4193–4195 respectivamente. La vista manual puede usar 4183–4185. La repetición aislada del primer experimento se ejecutó con `--grep F0-PERF-001 --reporter=list`, preservando el reporte original de tres casos; su procedencia queda registrada en el JSON estable. El cambio OpenSpec se mantiene disponible para revisión con sus tareas y cinco capacidades; archivarlo administrativamente es una operación separada del cierre técnico.
