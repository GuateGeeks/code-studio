# Bindings GG y Blockly editable

**22 de octubre de 2026, Guatemala. Resultado: 45 pruebas aprobadas, 23 Node y 22 Chromium, sin fallos ni omisiones.** OpenSpec pasa validación estricta. Commits, diffs versionados y lockfiles de Blockly, Xcratch y micro:bit permanecen iguales a la línea base.

El laboratorio ya permite editar bloques visibles y ejecutar esa autoría dentro del runner aislado. Los bindings GG consultan y modifican la misma VM que ejecuta los bloques. La [evidencia medida](browser-evidence.json) conserva resultados, revisión, mapas de origen y estado; las tareas están en el [cambio OpenSpec](../../openspec/changes/archive/2026-10-24-phase-0-integration-foundations/tasks.md).

## Probar el avance

Desde Ubuntu/WSL, con la preparación del [README](../../README.md) completada:

```bash
source ../scripts/env.sh
npm run browser:build
npm run browser:serve
```

Abrir `http://127.0.0.1:4173`. El workspace muestra un inicio que establece score en 1 y repite tres movimientos de 4 pasos, y un receptor del mensaje boost. Hacer doble clic en el número de pasos para editarlo y pulsar Ejecutar bloques. El resultado inicial es x=12; si se cambia a 6, es x=18.

Mover +10 usa un binding sobre esa ejecución. Aplicar variable modifica score; Enviar boost activa el receptor Blockly, que incrementa score y avanza su valor actual. Consultar escena muestra la lectura GG de ese estado. Detener y reiniciar y otra ejecución conservan las ediciones del workspace. Restaurar ejemplo restablece deliberadamente el ejemplo inicial.

Los ejemplos fijos del corpus y micro:bit siguen disponibles. Para una vista previa simultánea a las pruebas, usar los puertos alternativos 4183/4184/4185 documentados en el [informe de corpus](CORPUS-SIMULATOR-RESULTS.md). La instancia local de esta entrega está en `http://127.0.0.1:4183`; no es un despliegue público.

## API experimental

Cada objeto GG está ligado a la sesión y revisión de programa que estaban vigentes al obtenerlo. Las operaciones son asíncronas y devuelven DTOs propios, sin objetos de VM ni renderer:

| Llamada | Alcance inicial |
|---|---|
| `GG.scene.get()` | Consulta hero original y sus variables numéricas locales |
| `GG.sprite.get('hero')` | Devuelve id, nombre, x e y |
| `GG.sprite.move('hero', 10)` | Usa la primitiva de movimiento nativa, incluyendo la dirección del sprite |
| `GG.sprite.setPosition('hero', {x: 40, y: 0})` | Cambia posición en la misma VM |
| `GG.variables.get('gg-score')` | Consulta el valor numérico actual |
| `GG.variables.set('gg-score', 4)` | Cambia esa variable, visible para los scripts existentes |
| `GG.events.emit('boost')` | Inicia los hats nativos del mensaje declarado; devuelve cuántos scripts inició |

Emitir confirma la programación del evento; no espera la finalización de todos sus receptores. Movimiento admite pasos finitos de magnitud máxima 480; posición admite x entre −240 y 240 e y entre −180 y 180; escritura numérica, magnitud máxima 1 000 000. IDs, mensajes u operaciones desconocidos se rechazan. La API es un spike v0, no un SDK estable ni un binding JavaScript/Python de alumno.

Scratch conserva ciertos literales numéricos como cadenas hasta realizar aritmética. El DTO GG convierte esa lectura a número, verificando su límite, sin guardar otro estado. El valor continúa perteneciendo a la VM. La prueba Node comprueba también movimiento con dirección hacia arriba y que modificar un DTO no modifica el target.

## Evidencia ejecutada

| Requisito | Resultado observado |
|---|---|
| GG-BLOCK-005 | Edición mediante el campo nativo Blockly de 4 a 6; ejecución real de 3×6. IDs de expresiones preservados y autoría sin cambios después de ejecutar, llamar bindings y detener |
| GG-SCRATCH-011 | Bloques llegan a 18; Mover +10 llega a 28; setPosition lleva a 40; escribir score=4 y emitir boost produce score=5 y x=45. GG, VM, posición visible y desplazamiento de píxeles coinciden |
| GG-RUN-008 | Una referencia retenida falla tras cargar otra revisión de la misma sesión; una llamada directa al puerto con revisión antigua también falla. Tras Stop, las referencias de sesión anterior fallan y la escena nueva permanece en x=0 |
| Validación GG | Sprite inexistente, NaN, coordenadas fuera de límites, variable inexistente y mensaje no declarado producen error sin modificar la escena |
| Validación IR | Metadatos externos y operación desconocida se rechazan antes de reemplazar la escena. Node cubre además límites de tamaño, scripts, nodos y profundidad, IDs duplicados/reservados, referencias ausentes y números inválidos |
| Diagnóstico editable | Un bloque de texto sin soporte muestra tipo e ID, conserva el workspace y no cambia la escena ejecutada. Restaurar el ejemplo permite recuperar la ejecución |
| Interfaz | Editor y escenario juntos en escritorio; controles y ejecución operativos a 390 px, sin desbordamiento de la página. Capturas revisadas a 1280 y 390 px; detector mecánico sin hallazgos |

Los resultados están en `artifacts/bindings-editor.json`, `bindings-stale.json` y `bindings-validation.json`. Las capturas están en `artifacts/bindings-editor.png` y `bindings-editor-mobile.png`. `artifacts/integration.tap` y `browser-results.json` guardan las suites completas. La evidencia estable solo se regenera si pasan las 22 E2E sin omisiones ni resultados inestables.

## Fronteras y decisiones

`spikes/block-program.mjs` conserva el adaptador Blockly→IR. `scratch-project.mjs` contiene la traducción pura y `program-contract.mjs` valida la frontera; esos dos módulos no importan Blockly. El runner acepta únicamente IR v0 y recursos SVG/WAV locales del build. La nueva ruta no admite un proyecto Scratch arbitrario ni confía en un booleano validatedAtBuild enviado por el anfitrión.

El contrato limita el documento a 65 536 bytes, 300 nodos, profundidad 8, 16 scripts y 16 variables; la repetición literal tiene máximo 1000 y la espera 60 segundos. Esto delimita el spike, sin sustituir un sistema completo de cuotas. La validación y traducción ocurren antes de limpiar la escena; las cargas en curso rechazan operaciones concurrentes en lugar de ofrecer targets parcialmente deserializados.

deserializeProject requiere el discriminador interno projectVersion=3 que normalmente añade scratch-parser. El adaptador lo añade a su salida nativa generada a partir de IR validada. Se conserva la prohibición de unsafe-eval en shell, runner y worker; no se utiliza el validador AJV dinámico dentro del runner. La validación general de archivos SB3 continúa fuera del alcance.

El cliente GG usa el MessagePort autenticado con sesión y revisión. El coordinador comprueba ambas después de esperar disponibilidad; el runner comprueba su revisión vigente antes de ejecutar el método permitido. Los DTOs no exponen acceso a propiedades arbitrarias. No hay un SceneGraph paralelo ni copia mutable del estado de ejecución en el shell.

Blockly 13.4.0, mensajes en español y media se sirven localmente. El bundle del editor ocupa aproximadamente 955 KB de desarrollo, sin comprimir. El anfitrión permite estilos inline para las hojas y posiciones dinámicas de Blockly; sus scripts siguen restringidos a self. El runner y el compilador conservan sus políticas estrictas. El simulador mantiene su excepción previa de evaluación dinámica en otro origen.

## Regresiones y pendientes

Las 18 pruebas de navegador anteriores siguen pasando, incluidos señal Web Audio, Stop con contexto cerrado, worker bloqueado, CSP de conexión, compilación PXT offline tras precarga y simulador micro:bit. La preservación upstream pasa y CodeGraph se sincroniza con las nuevas fronteras.

G1 cuenta ahora con evidencia de control externo sobre el motor y autoría editable, pero todavía requiere un corpus mayor, rendimiento, formatos hostiles y más recursos. Los bindings actuales cubren hero original y variables locales; no ofrecen control de clones, variables globales/listas ni un SDK de capacidades estable. Las ediciones viven en memoria de esta página: falta persistencia GGPROJ y recuperación tras cerrar o recargar. Continúan pendientes hardware físico micro:bit, otros navegadores y reapertura offline/PWA. No se archiva el cambio ni se declara completa la fase 0 global.
