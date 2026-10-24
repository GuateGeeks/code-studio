# Compatibilidad y evidencia pendiente

| Superficie | Alcance implementado | Límite o evidencia externa |
|---|---|---|
| Blockly | Autoría GG, fuente derivada, teclado nativo de Blockly13.4 | Inspección humana con lector de pantalla pendiente |
| JavaScript | QuickJS0.32.0 aislado, bindings y eventos GG | No JavaScript del host ni acceso libre al DOM/red |
| Python | Pyodide314.0.7, stdlib local y bindings GG | Memoria/latencia en equipos escolares por medir |
| 2D | Scratch VM/render/audio, editor propio y recursos acotados | Intersección SB3 publicada en docs/phase-5/OPCODE-MATRIX.md |
| micro:bit | Perfil V1/V2/universal, simulación y HEX | Placa autónoma y USB físico pendientes |
| 3D | Babylon9.32.0, primitivas, GLB estático, luces, jerarquía y colisión cinemática | Cuotas y tipos admitidos en docs/phase-6/RESULTS.md |
| Apps web | Componentes nativos, formulario/lista y bindings JS/Python | Sin HTML/CSS o scripts arbitrarios |
| Offline | Cohort verificado por seis orígenes, preparación, rechazo y rollback | Retención depende de las cuotas/datos del perfil |
| Exportación | ZIP 3D/web con runtime elegido, fuentes, avisos y servidor localhost | Requiere Node22; no ejecuta directamente por file:// |
| Navegadores | Evidencia automatizada Chromium en Linux/WSL, escritorio y viewport móvil | No equivale a Safari/Firefox, dispositivo móvil físico o Chromebook |
| Accesibilidad | Foco, teclado, controles semánticos y zoom comprobables por automatización | Recorrido humano y tecnologías de asistencia pendientes |
| Rendimiento | Experimentos locales y presupuestos propuestos separados | No aceptación de 30FPS en equipo escolar sin medirlo |

No existe integración académica porque no se ha identificado una necesidad concreta del piloto. No se necesita cuenta para autoría, recuperación ni offline. El software no envía por defecto el código o actividad de los alumnos como telemetría.

El paquete de fuentes conserva locks, avisos, procedencia y precompilados verificados. La reproducción utiliza las dependencias fijadas; no afirma reconstrucción nativa C++/WASM desde cero. Consultar BUILD.md y la evidencia final de F7.
