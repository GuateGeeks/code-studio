# Proposal

## Why

El 2D tiene unos 16 bloques: un único bloque de movimiento, sin «por siempre», sin aritmética, sin sensores, sin «decir» ni «mostrar/ocultar» (H2 del plan de maduración). Para el público confirmado (D1: primaria alta, 10–12 años), los proyectos canónicos 2D necesitan bucles de juego, colisiones y diálogos. La VM local ya ejecuta 84 opcodes revisados (matriz F5) que el editor no expone.

## What Changes

Vocabulario 2D v2 como entradas de la tabla de lenguaje (`block-language-contract`), con forma en bloques, API v3 (JS/Python) y bajada a opcode VM revisado. Se entrega en dos tandas:

1. **Movimiento, apariencia y control:**
   - girar, apuntar, ir a x/y, ir a objeto/aleatorio, deslizar, rebotar, fijar/cambiar x/y;
   - decir/pensar (por segundos), mostrar/ocultar, tamaño, siguiente disfraz, fondo;
   - por siempre, repetir hasta, esperar hasta, detener.
2. **Sensores y operadores:**
   - tocando objeto/borde, tecla presionada, ratón, distancia, temporizador;
   - + − × ÷, aleatorio, y/o/no, unir, longitud, módulo, redondeo;
   - mostrar/ocultar variable.

Cada bloque nuevo llega con su caso en el corpus de equivalencia y su prueba de ida y vuelta. La copia Scratch amplía su cobertura convertible automáticamente.

### Re-alcance del 29/10/2026 (plan de estabilización 2D, etapa E1)

Decidido por el usuario el 29/10/2026; registrado con openspec-update-change sobre la aprobación existente. La tanda 1 se entrega en dos etapas:

- **E1 (este cambio, primero):** solo bloques que funcionan con un único sprite.
  - Movimiento: girar derecha/izquierda, apuntar en dirección, ir a x/y, deslizar a x/y en segundos, rebotar si toca el borde, fijar/cambiar x y y.
  - Apariencia: decir/pensar, decir/pensar por segundos, mostrar/esconder, fijar/cambiar tamaño, siguiente disfraz.
  - Control: por siempre, repetir hasta, esperar hasta (con las comparaciones existentes de números y variables), detener todo / este programa.
  - Publica `gg.sprites@0.2.0`. Proyecto canónico «Hero se presenta» (un sprite).
- **Trasladado a E2** (con `scene2d-multi-sprite`, que pasa a `gg.sprites@0.3.0`): «ir a objeto/aleatorio», «fondo» y el proyecto canónico «Diálogo», que requieren escenario o varios objetos.
- **Sigue en la tanda 2 (E3):** todo reporter o expresión anidada (decir una variable incluida), sensores y operadores.
- **Sin cambios en la copia Scratch:** la importación SB3 está congelada (E-1); los opcodes nuevos se revisan solo para la bajada 2D.

## Capabilities

### New Capabilities

- `scene2d-vocabulary`: vocabulario 2D v2 con equivalencia bloques/JavaScript/Python.

## Impact

Packs 2D (`gg.sprites@0.2.0` en E1; la tanda 2 publicará la siguiente versión), tabla de lenguaje, IR 2D (expresiones anidadas), adaptador Scratch, generador y traductores v3, menús, corpus y proyectos canónicos («Atrapa la fruta», «Laberinto»). **Depende de** `block-language-contract` (tabla). Las partes que necesitan varios objetos (tocando objeto, ir a objeto, fondo, «Diálogo») dependen de `scene2d-multi-sprite`; E1 no.

Fuera de alcance: «Mis bloques», listas (cambio posterior `scene2d-procedures-lists`), preguntar/responder y lápiz.
