# ADR-004: Callbacks textuales sobre hats nativos y contexto por invocación

**Fecha:**22 de octubre de2026. **Estado:**aceptada e implementada; full F2 aprobado (123 Node, 33 herramientas, 70 E2E).

> **Sustitución parcial (25 de octubre de 2026):** [ADR-011](011-contrato-de-lenguaje-y-vistas-sincronizadas.md) sustituye «la vista derivada se mantiene de solo lectura» y la copia como única vía a texto, y la API textual del alumno pasa a la API v3 legible (sin `GG.`, `ctx` ni `await`, traducida a API1 en el origen del lenguaje). Se conservan el contexto por invocación, la atomicidad de variables, la revocación en Stop y el dominio finito; las copias API1 guardadas se ejecutan sin cambios.

## Decisión
QuickJS/Pyodide ejecutan funciones/control de flujo reales, con variables de escena propiedad de la VM. Los hats nativos ejecutan una primitiva proxy privada que espera la Promise de un callback del intérprete. Cada invocación tiene token/revisión/target propios; los callbacks no comparten un currentTarget mutable.

Las operaciones ctx resuelven referencias y mutaciones dentro del mismo comando del adaptador. GG.ref(id) es un DTO, no una lectura anticipada. changeVariable es atómico; broadcastAndWait espera los threads receptores capturados. Los clones heredan locales y comparten Stage globales. Reiniciar hats, borrar clones y Stop revocan tokens/esperas. La cola reserva IDs antes de programar callbacks y suprime inicio/resultados cancelados.

Al iniciar un programa de eventos se revocan mutadores GG sin contexto en el intérprete; las lecturas y los controles externos autenticados conservan sus contratos. Esto impide que un callback cancelado eluda ctx y escriba sobre hero. No cambia los cuerpos Blockly ni crea un SceneGraph paralelo.

El dominio contextual es finito±1e12, con error explícito al salir; no se declara equivalencia de todo IR0 arbitrario con overflow. El corpus compara valores, trazas y orden parcial, con teclado/clic, píxeles y señal de audio real. No garantiza cada intercalado posible de cualquier programa concurrente.

Las copias JS/Python son explícitas, persistidas en GGPROJ2, independientes y sin ejecución automática. La vista derivada se mantiene de solo lectura. Audio se prepara desde el catálogo local y se activa por gesto, sin lanzar cuerpos Blockly ocultos. La excepción de loader Pyodide sigue limitada al origen textual. La [preparación F2](../engineering/F2-PREPARATION.md) documenta el parser que evita el defecto compileOnly del wrapper QuickJS0.32.0.

## Evidencia
[OpenSpec](../../openspec/changes/archive/2026-10-24-phase-2-textual-equivalence/design.md), [resultados F2](../phase-2/RESULTS.md), pruebas de contratos/VM y motores/cola, y matriz Chromium por backend. El perfil local WSL registra tiempos/RSS aproximados; las máquinas escolares y validación física requieren evidencia independiente.

## Ampliación E1 (29 de octubre de 2026): bucles, esperar hasta y detener

Vocabulario 2D esencial (`scene2d-vocabulary-v2`, `gg.sprites@0.2.0`). Se mantienen el contexto por invocación, la atomicidad y la revocación en Stop.

- **Cada vuelta de un `while` cede un fotograma**, como «por siempre» y «repetir hasta» en Scratch. Los traductores API v3 y el generador API1 añaden `await ctx.frame()` al final del cuerpo; `program.frame` se resuelve después del siguiente paso de la VM. Es una operación de control del núcleo: no depende de permisos de pack. Los `for` («repetir N veces») conservan su comportamiento: no ceden entre vueltas. Antes, un `while` sin esperas agotaba el turno de 300 ms del intérprete.
- **Esperar hasta** (`waitUntil(() => a > b)`, `wait_until(lambda: a > b)`) comprueba la condición con un `ctx.compare` atómico y cede un fotograma mientras sea falsa.
- **Detener este programa** es `return` dentro del evento: termina esa invocación, como `stopThisScript`.
- **Detener todo** (`stopAll()`, `stop_all()`) llama a `runtime.stopAll()` en el adaptador: detiene hilos y clones, borra globos y revoca todas las invocaciones de texto; el código traducido vuelve en el acto. Los eventos siguen registrados (una tecla vuelve a iniciar su programa), igual que en Scratch. No sustituye al único «Detener» del estudio, que además restaura la escena inicial.
- **Deslizar** y **decir/pensar por segundos** usan las mismas primitivas de la VM; el adaptador textual ejecuta la de deslizar una vez por paso de la VM. Rebote y tamaño dependen del renderer.
- **Corpus:** cada programa E1 produce la misma secuencia de llamadas en API1 y API3, en JavaScript y Python (VOC-012); la traza de posiciones de «por siempre + rebotar» coincide en bloques, JavaScript y Python, y nada se mueve tras Detener (E1-03). La equivalencia de trazas no se afirma para programas con temporizadores (deslizar, esperar), cuyos fotogramas intermedios dependen del reloj.
