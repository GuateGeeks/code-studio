# Tasks

## 1. Herramientas y línea base
- [x] 1.1 Inicializar el repositorio del producto y fijar dependencias en lockfile.
- [x] 1.2 Configurar OpenSpec para Codex y validar propuesta, contratos, diseño y tareas.
- [x] 1.3 Registrar commits, hashes, modificaciones locales y parches upstream.
- [x] 1.4 Configurar CodeGraph e indexar los tres repositorios, PXT Core exacto y Studio.
- [x] 1.5 Guardar consultas y un mapa de las fronteras de integración.

## 2. Caracterización ejecutable
- [x] 2.1 Preparar fixture Blockly e IR con IDs y rechazo de bloques desconocidos.
- [x] 2.2 Ejecutar movimiento y round-trip sobre la VM Xcratch local sin GUI.
- [x] 2.3 Probar Stop cooperativo e impedir carga de extensiones remotas.
- [x] 2.4 Probar sesiones y terminación forzada de un worker bloqueado.
- [x] 2.5 Compilar simulación PXT fuera del editor y probar diagnósticos sin red.
- [x] 2.6 Investigar firmware HEX con artefactos locales y registrar resultado real.

## 3. Evidencia y continuidad
- [x] 3.1 Ejecutar pruebas y validación estricta de OpenSpec.
- [x] 3.2 Comprobar conservación de cambios versionados upstream.
- [x] 3.3 Documentar resultados, límites y siguientes pruebas de navegador/placa.

## 4. Integración en navegador
- [x] 4.1 Preparar bundles y pack PXT estáticos reproducibles, con assets SVG locales.
- [x] 4.2 Implementar shell/runner en orígenes distintos, handshake validado y MessagePort por sesión.
- [x] 4.3 Renderizar el sprite con VM/renderer reales y verificar su desplazamiento de píxeles.
- [x] 4.4 Compilar JS y HEX mediante Host local dentro de un worker de navegador.
- [x] 4.5 Verificar aislamiento, bloqueo de red, Stop, mensajes tardíos y compilación después de desconectar el contexto.
- [x] 4.6 Ejecutar regresiones, conservar evidencia visual y actualizar resultados y límites en OpenSpec.

## 5. Corpus 2D y simulación micro:bit
- [x] 5.1 Extender bloques, IR y traducción con eventos, espera, mensajes y clones; comprobar round-trip y rechazo de entradas inválidas.
- [x] 5.2 Ejecutar el corpus en navegador con entrada DOM real, orden de mensajes, clones visibles y cancelación de esperas mediante Stop.
- [x] 5.3 Integrar runtime/placa SVG micro:bit locales en un origen separado, ejecutando exactamente el JS generado por el worker.
- [x] 5.4 Verificar corazón, evento de botón y Stop/reinicio del simulador, con estado de LEDs y representación visual coherentes.
- [x] 5.5 Ejecutar regresiones, conservar evidencias, validar OpenSpec y comprobar preservación upstream.

## 6. Audio, variables y condicionales
- [x] 6.1 Extender Blockly/IR/traductor con variables numéricas, comparaciones, if/else y sonido; verificar round-trip, IDs y rechazo de entradas fuera del subconjunto.
- [x] 6.2 Empaquetar Scratch Audio y un WAV propio, con decodificación local y activación por gesto dentro del runner.
- [x] 6.3 Probar en navegador ramas verdadera/falsa, lectura/cambio de variable y señal real de audio con espera y detención por bloque.
- [x] 6.4 Verificar Stop durante sonido, ausencia de continuación tardía y reinicio con autoría conservada.
- [x] 6.5 Ejecutar las regresiones y actualizar evidencia, OpenSpec y preservación upstream.

## 7. Bindings GG y autoría Blockly
- [x] 7.1 Separar traducción y validación de IR del entorno Blockly; comprobar límites y rechazo antes de reemplazar la escena.
- [x] 7.2 Implementar bindings GG de consulta, movimiento, variables y mensajes sobre la VM; validar argumentos y sesión/revisión.
- [x] 7.3 Integrar Blockly local visible, toolbox y ejemplo editable con variable y mensaje, conservando autoría durante Run/Stop.
- [x] 7.4 Probar edición DOM, ejecución, convivencia con bindings, errores y referencias antiguas en navegador.
- [x] 7.5 Ejecutar regresiones y actualizar evidencia, OpenSpec, mapa y preservación upstream.

## 8. Cierre de fase 0
- [x] 8.1 Completar variables locales/globales y disfraces en Blockly, IR, validación y traducción, con round-trip y rechazos explícitos.
- [x] 8.2 Probar ámbito compartido/aislado, cambio de píxeles y dos scripts concurrentes con invariantes de orden parcial en el navegador.
- [x] 8.3 Medir arranque frío/caliente, bytes estáticos y heap JavaScript observado, identificando alcance y entorno.
- [x] 8.4 Verificar diez ciclos Run/Stop con autoría conservada y liberación de frames/workers/audio; medir latencia y cien sprites sin inventar validación escolar.
- [x] 8.5 Registrar ADRs de motor 2D, contratos/aislamiento y PXT; clasificar G1/G2 y definir entrada/salida del primer corte de fase 1.
- [x] 8.6 Ejecutar regresión completa, publicar evidencia medida, sincronizar CodeGraph y verificar preservación upstream y OpenSpec estricto.

La ejecución física de firmware sigue pendiente y no bloquea la entrada a fase 1 según el plan. El cierre requiere el acta de transición y evidencia de los escenarios implementados; no equivale a publicar APIs de producción ni a aprobar el rendimiento en equipos escolares. El cambio permanece disponible en OpenSpec para revisión; el archivo administrativo se realiza por separado.
