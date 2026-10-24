# Resultados de fase 0

**22 de octubre de 2026, Guatemala. Estado: fase 0 cerrada; habilitado el corte 2D persistente de fase 1.**

El [acta de cierre](CLOSEOUT.md) consolida corpus mínimo, regresión, mediciones y decisiones G1/G2. El producto tiene repositorio Git local, OpenSpec y CodeGraph por CLI/MCP. Los [ADRs](../adr/README.md) registran el motor 2D, la propiedad del estado y el aislamiento, y la clasificación PXT. Los [criterios de entrada a F1](PHASE-1-ENTRY.md) definen GGPROJ/autosave y aceptación persistente. La [evidencia funcional](browser-evidence.json), las [mediciones independientes](performance-evidence.json), el [mapa](INTEGRATION-MAP.md) y [provenance.json](provenance.json) permiten revisar resultados y versiones. Los informes de entregas anteriores se conservan como hitos históricos.

## Herramientas y análisis

| Elemento | Resultado |
|---|---|
| OpenSpec | 1.14.3; esquema spec-driven; cinco capacidades; seis skills Codex locales |
| CodeGraph | 1.6.2, implementación colbymchenry; cuatro índices upstream y uno de Studio |
| MCP | Handshake stdio y tools/list aprobados; `codegraph_explore` disponible en el servidor probado |
| Configuración desktop | `.codex/config.toml` local para Windows→Ubuntu/WSL; rutas de máquina excluidas de Git |
| Pruebas Node | 30 aprobadas, 0 fallidas, 0 omitidas |
| Pruebas navegador | 25 E2E aprobados, 0 fallidos, 0 omitidos, 0 flaky; Playwright 1.64.1 y Chromium headless 156 |
| Medición separada | 3 experimentos aprobados y repetición aislada de arranque 1/1; diez ciclos Run/Stop |
| OpenSpec estricto | Cambio `phase-0-integration-foundations` válido |
| Upstreams | Commits, diffs versionados y lockfiles conservados; micro:bit tenía 15 cambios previos |

La configuración del servidor está preparada para abrir el repositorio como proyecto. El handshake se comprobó con un cliente de prueba; no se presupone que el catálogo MCP de esta conversación se haya recargado.

## Matriz de evidencia

| Requisito | Evidencia ejecutada | Estado |
|---|---|---|
| GG-BLOCK-001 | Blockly guarda/restaura y conserva IR/IDs de inicio, repetir y mover | Aprobado |
| GG-BLOCK-002 | Bloque no soportado produce tipo e ID en el error | Aprobado |
| GG-SCRATCH-001 | Código Xcratch local carga el proyecto sin GUI, ejecuta tres movimientos y llega a x=15; captura reabrible | Aprobado headless |
| GG-SCRATCH-002 | `stopAll` cancela un movimiento continuo; pasos posteriores no cambian posición | Aprobado |
| GG-SCRATCH-003 | Metadatos de extensión remota se rechazan antes de cargar el proyecto | Aprobado para el alcance del fixture |
| GG-RUN-003 | Mensajes de sesión anterior, duplicados y fuera de orden no se aplican | Aprobado |
| GG-RUN-004 | Worker Node con bucle infinito termina dentro de 1 s; el coordinador conserva la fuente y vuelve a ejecutar | Aprobado en Node |
| GG-PXT-001 | Programa de corazón compila a `binary.js`, sin editor ni solicitudes HTTP externas por el adaptador | Aprobado en Node |
| GG-PXT-002 | API inexistente produce diagnóstico relacionado con main.ts | Aprobado |
| GG-PXT-003 | Compilación nativa produce HEX por variante y universal; registros V1/V2 con longitud y checksum válidos | Aprobado como generación de artefactos |
| GG-PXT-003 | Caché nativo ausente produce error explícito, sin fallback cloud | Aprobado |
| GG-SCRATCH-004 | SVG real con 984 píxeles de color; centro visual se desplaza 15 píxeles al llegar a x=15 | Aprobado en navegador |
| GG-RUN-005/006/007 | SOP, handshake origin/source, mensajes tardíos, destrucción de frame con worker infinito y bloqueo de red por CSP | Aprobado para los escenarios E2E |
| GG-PXT-004 | JS y HEX V1/V2/universal desde worker, diagnósticos y shell responsiva | Aprobado en navegador |
| GG-PXT-005 | Compilación nativa después de precargar y desconectar el contexto | Aprobado; no equivale a segunda visita offline |
| GG-BLOCK-003 | Round-trip de eventos, espera, mensajes y clones; rechazo de espera negativa | Aprobado |
| GG-SCRATCH-005/006/007 | Entrada DOM, espera real, orden de broadcast, dos sprites visibles, eliminación y Stop | Aprobado en navegador |
| GG-PXT-006/007 | JS del worker ejecutado en Runtime/DalBoard; corazón, botón A y Stop/reinicio; matriz y SVG coherentes | Aprobado como simulación |
| GG-BLOCK-004 | Variables, expresiones, ramas y audio con IDs estables; rechazo de operador y recurso no soportados | Aprobado |
| GG-SCRATCH-008 | Contador, ambas ramas, lectura en evento posterior y reinicio del estado de autoría | Aprobado en navegador |
| GG-SCRATCH-009/010 | WAV local, señal Web Audio, espera, detener sonidos y Stop sin continuación; cierre de AudioContext y nueva reproducción | Aprobado como señal digital; altavoces físicos sin validar |
| GG-BLOCK-005 | Edición DOM Blockly, IR validada, valores y mapas de origen conservados; errores sin reemplazo de escena | Aprobado en navegador y Node |
| GG-SCRATCH-011 | Bindings GG comparten movimiento, variables y mensajes con los bloques y sus píxeles | Aprobado en navegador y Node |
| GG-RUN-008 | Referencias GG de sesión/revisión antiguas y revisión inválida en el puerto no mutan la escena | Aprobado en navegador |
| GG-BLOCK-006 | Round-trip de ámbitos y disfraces, varios hats e IDs; rechazo de ámbito/recurso desconocido | Aprobado en Node |
| GG-SCRATCH-014/015/016 | Global compartida y local por clon, concurrencia con orden parcial, disfraz con píxeles; recarga restaura valores | Aprobado en navegador |
| GG-RUN-009 | Diez ciclos: autoría preservada, contextos cerrados, cero workers anteriores y frame nuevo; arranque/bytes/heap/cien sprites medidos | Aprobado en el perfil WSL; validación escolar pendiente |
| GG-GATE-001/002/003/004 | ADRs, clasificación G1/G2 y criterios GGPROJ/autosave de F1; preservación y OpenSpec estricto | Aprobado; entrada F1 habilitada con límites explícitos |

Archivos de prueba: `tests/integration/blockly-scratch.test.mjs`, `runtime-session.test.mjs`, `pxt.test.mjs` y `tests/browser/*.spec.mjs`. Los spikes son código de experimentación, no contratos de paquetes estables.

## Artefactos locales disponibles

- `artifacts/integration.tap`: salida de las 30 pruebas Node.
- `artifacts/pxt/binary.js`: programa compilado en Node; las pruebas de navegador compilan y ejecutan su propio binary.js desde el worker.
- `artifacts/pxt/mbdal-binary.hex`: firmware para variante V1.
- `artifacts/pxt/mbcodal-binary.hex`: firmware para variante V2.
- `artifacts/pxt/binary.hex`: salida universal del target.
- `artifacts/pxt/simulation-result.json` y `native-result.json`: diagnósticos, archivos, accesos locales y red.
- `artifacts/baseline/`: inventario inicial, parches y verificación final de preservación.
- `artifacts/codegraph/`: estadísticas, logs, consultas y comprobación MCP.
- `artifacts/browser-before.png` y `browser-after.png`: capturas del sprite renderizado.
- `artifacts/browser-results.json`, `browser-*-evidence.json` y `browser-heart.hex`: resultados, medidas y firmware del worker.
- `artifacts/corpus-*.json`, `simulator-*.json`, `corpus-clones.png` y `simulator-heart.png`: estados, hashes y capturas del corpus ampliado y del simulador.
- `artifacts/corpus-audio*.json`, `corpus-variables.json`, `corpus-audio.png` y `browser/tone.wav`: señal, estado, ciclo de vida del audio y WAV propio.
- `artifacts/bindings-*.json`, `bindings-editor.png` y `bindings-editor-mobile.png`: edición, estado GG, rechazos y capturas de escritorio/móvil.
- `artifacts/corpus-global-variables.json`, `corpus-costumes.json`, `corpus-concurrent.json` y `corpus-costume-alt.png`: nuevos casos del corpus mínimo.
- `artifacts/performance-*.json`: arranque, estabilidad, recursos, heap por target y draws de cien sprites; reporte independiente de la regresión funcional.

## Límites y resultados que aún faltan

**G1 decidida para el corte F1:** se adopta Scratch VM + Scratch Render para el corpus mínimo probado, con estado único y bindings GG. El [acta](CLOSEOUT.md) registra la aceptación final y sus condiciones. Quedan fuera listas, efectos, múltiples originales, bindings ampliados, importación general y corpus educativo de veinte proyectos. La ruta recibe fixtures del build o IR propia validada con recursos locales fijos. La decisión se reabre ante regresiones obligatorias o incumplimiento no resoluble del perfil escolar.

**G2 está parcialmente resuelta:** la compilación fuera del editor funciona en Node y en un worker de navegador con paquetes/cachés estáticos. Se comprobó la compilación tras desconectar el contexto precargado y la ejecución del JS generado en el simulador micro:bit real, con corazón, evento de botón y Stop/reinicio. Falta comprobar el firmware sobre placas V1/V2 físicas. Los resultados mantienen `physicalBoardValidated: false`. No se ha demostrado una segunda visita offline ni una distribución PWA.

**Aislamiento de navegador caracterizado:** shell y runner usan orígenes distintos, CSP local, handshake con validación de origin/source y MessagePort por sesión. Stop invalida la sesión, solicita cierre con plazo máximo de 150 ms y destruye el frame; se verifica audio cerrado, worker bloqueado y ejecución posterior conservando la fuente. Esto cubre los escenarios incluidos en los E2E; faltan permisos/cuotas completos, otros recursos/timers, otros navegadores y aislamiento de almacenamiento a nivel de sitio en el despliegue.

**Corpus mínimo completo, cobertura de producto limitada:** la IR cubre inicio, repetición, movimiento, teclado/clic, espera, mensajes con espera, clones, variables numéricas locales/globales, EQ/LT/GT, if/else, dos scripts concurrentes, dos disfraces y sonido local. Faltan expresiones más amplias, otros recursos y un corpus educativo mayor. El sonido se validó como señal Web Audio, sin prueba acústica de altavoces físicos. Los bloques nuevos están registrados pero aún no se añadieron al toolbox inicial.

**Rendimiento caracterizado:** diez ciclos pasan; Stop tiene feedback máximo de 41 ms y retirada de frame máximo de 49,2 ms. El reemplazo tarda hasta 1,73 s. Cien targets alcanzan 57–59 draws completados/s en SwiftShader; no es medición de FPS del compositor ni aprobación escolar. El heap JS shell pos-GC crece 6,94 %; un soak prolongado y el perfil escolar quedan como trabajo explícito de validación. Ver muestras y tamaños en [el acta](CLOSEOUT.md).

**Autoría inicial disponible:** hay workspace Blockly visible, toolbox y ejecución de su IR en el runner. Stop conserva las ediciones en memoria; todavía no hay archivo GGPROJ, persistencia al recargar ni editor de recursos completo. GG es una API experimental de sesión/revisión, sin SDK estable ni bindings de lenguaje de alumno.

Los builds del renderer pasaron con tres avisos sobre módulos opcionales de Node (`bufferutil`, `utf-8-validate`, `canvas`), derivados de dependencias SVG/DOM. Son una señal a revisar al construir el bundle de navegador. Las dependencias antiguas de Xcratch se conservaron para caracterización; su actualización y la revisión de distribución corresponden al trabajo de endurecimiento.

## Próximas pruebas de integración, en orden

1. **F1 persistente:** especificar GGPROJ/autosave, recursos/versiones y restauración atómica; probar crear→programar→ejecutar→detener→cerrar→reabrir conservando la autoría.
2. **Validación del producto:** optimizar bundles, repetir en equipo escolar acordado y ejecutar soak prolongado para investigar el crecimiento de heap.
3. **Placa y simulación ampliada:** probar los HEX sobre V1/V2 reales con alimentación autónoma y ampliar la cobertura a V2/periféricos, antes de aceptar F4.
4. **Distribución offline:** persistir recursos y validar una segunda visita sin red con actualizaciones atómicas en su fase correspondiente.

El cierre técnico se decide con el corpus, mediciones y ADRs enlazados en el acta; no solo por el número de tests. El cambio OpenSpec conserva sus resultados y criterios para revisión. El archivo administrativo se realiza por separado.
