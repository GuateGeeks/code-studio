# Proposal

## Why

La arquitectura unificada depende de reutilizar motores existentes sin acoplar el modelo de proyecto a sus editores. Necesitamos evidencia ejecutable de esas fronteras antes de construir la interfaz de Studio.

## What Changes

- Inicializar un repositorio de producto con herramientas y dependencias fijadas.
- Configurar OpenSpec y CodeGraph con índices locales y consultas reproducibles.
- Conservar una línea base de commits y cambios previos de los tres repositorios.
- Preparar un fixture Blockly, una IR acotada y su traducción a bloques Scratch.
- Ejecutar la VM Xcratch real sin su GUI y comprobar movimiento, persistencia y Stop.
- Comprobar invalidación de sesiones y terminación de un ejecutor bloqueado.
- Compilar un programa elemental mediante PXT fuera del editor y registrar las limitaciones de firmware/offline.
- Renderizar un sprite SVG real en un runner de otro origen y verificar el desplazamiento de sus píxeles.
- Verificar acceso denegado al anfitrión, canal de mensajes por sesión, CSP de red y recuperación de un worker bloqueado en navegador.
- Compilar simulación y HEX en un worker de navegador desde paquetes estáticos, también con el contexto sin conexión después de precargarlos.
- Ampliar Blockly→IR→VM con teclado, clic, espera, mensajes con espera y ciclo de vida de clones; comprobar ejecución y Stop en navegador.
- Ejecutar el JS producido por el worker en el runtime y la placa SVG oficiales de micro:bit, en un origen de simulación separado con su propia política de evaluación.
- Ampliar el corpus con variables numéricas, comparaciones y ramas if/else, usando el estado real de la VM y conservando los IDs Blockly.
- Incorporar Scratch Audio con un WAV propio local; verificar señal Web Audio, reproducción con espera, detener sonidos y Stop/reinicio sin continuación tardía.
- Implementar bindings GG de escena, movimiento, variables y mensajes sobre el estado único de la VM, con referencias ligadas a sesión/revisión.
- Conectar un workspace Blockly visible y editable al runner mediante IR validada, recursos locales fijos y una prueba de edición/ejecución real en navegador.
- Completar el corpus mínimo con ámbito local/global, cambio visible de disfraz y scripts concurrentes, sin imponer un orden global al scheduler.
- Medir arranque frío/caliente, bytes estáticos, heap JavaScript observado, diez ciclos Run/Stop y una escena de cien sprites; conservar entorno, muestras y límites de la medición.
- Registrar ADRs y una puerta de transición verificable: G1 para el corte inicial de fase 1, G2 clasificada y validación física pendiente explícita.

## Capabilities

### New Capabilities

- `block-program`: traducción verificable de un subconjunto visual a IR con IDs de origen.
- `scratch-adapter`: ejecución de ese subconjunto usando el código Xcratch local sin GUI.
- `runtime-session`: cancelación e invalidación de mensajes por sesión.
- `microbit-build`: compilación aislada del editor con resolución de dependencias controlada.
- `phase-transition`: evidencia, decisiones y criterios para pasar de experimentación a la primera entrega persistente.

### Modified Capabilities

Ninguna; todavía no hay especificaciones canónicas.

## Impact

El cambio vive en `guategeeks-code-studio/`. Los checkouts existentes aportan código y se conservan sus cambios previos. Los índices CodeGraph añaden configuración y cachés locales, pero no modifican implementaciones upstream. Se entrega un workspace de autoría acotado para verificar integración, sin editor de producto completo ni validación física de firmware sin una placa.
