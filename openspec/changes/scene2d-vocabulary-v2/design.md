# Design

## Context

Véanse `proposal.md`, `block-language-contract` (tabla de lenguaje y API v3) y la matriz F5 (84 opcodes ejecutables). La IR 2D actual solo admite número o variable como expresión.

## Decisions

1. **Entradas de la tabla.** Cada bloque nuevo es una entrada `apiVersion: 2` en `gg.sprites@0.3.0`, con bajada a un opcode revisado de la matriz F5. No se añaden opcodes sin revisar.
2. **Expresiones anidadas en la IR 2D.** Operadores, sensores y aleatorio se representan como expresiones tipadas con profundidad limitada. En la API v3 aparecen como expresiones JS/Python naturales (`a + b`, `random(1, 10)`, `hero.touching(fruta)`). Los traductores las bajan a llamadas de lectura atómica del contexto.
3. **Semántica declarada.** División, aleatorio, coerción texto/número y comparación siguen la semántica de Scratch. Se documentan en ADR-004 ampliado. El aleatorio usa semilla en las pruebas.
4. **Dos tandas.** Primero movimiento, apariencia y control, que habilita «Diálogo»; después sensores y operadores, que habilitan «Atrapa la fruta» y «Laberinto». Cada tanda cierra con su puerta.

## Risks / Trade-offs

- [Equivalencia con vocabulario mayor] → corpus por bloque y prueba de ida y vuelta generada desde la tabla.
- [«Por siempre» y Stop] → la semántica de Stop ya está demostrada en F0; se añade un caso al corpus de Stop.

## Migration Plan

`gg.sprites@0.2.0` → `0.3.0` con migración vacía de bloques (solo añade entradas). Los proyectos anteriores abren igual.
