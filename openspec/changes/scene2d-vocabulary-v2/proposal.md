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

## Capabilities

### New Capabilities

- `scene2d-vocabulary`: vocabulario 2D v2 con equivalencia bloques/JavaScript/Python.

## Impact

Packs 2D (`gg.sprites@0.3.0`), tabla de lenguaje, IR 2D (expresiones anidadas), adaptador Scratch, generador y traductores v3, menús, corpus y proyectos canónicos («Atrapa la fruta», «Laberinto»). **Depende de** `block-language-contract` (tabla) y `scene2d-multi-sprite` (tocando objeto, ir a objeto).

Fuera de alcance: «Mis bloques», listas (cambio posterior `scene2d-procedures-lists`), preguntar/responder y lápiz.
