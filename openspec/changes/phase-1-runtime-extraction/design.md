## Context
ADRs separan autoría, protocolo y estado VM. Las pruebas F0/F1 preservan imports históricos spikes, pero el producto requiere fuentes propias.
## Goals / Non-Goals
Eliminar dependencias productivas desde src hacia spikes y aislar internals. No cambiar IR/versiones, GGPROJ, CSP, orígenes ni comportamiento. No empaquetar forks upstream todavía.
## Decisions
- src/contracts para contrato IR/GG; src/editor para Blockly/IR/editor; src/adapters/scratch para traducción y bindings VM; src/studio para shell/proyecto/consola/inspector; src/runtime para coordinación del runner; src/targets/microbit para compilador/simulador; src/assets para recursos propios.
- Preservar URLs públicas originales con entradas o mappings de build, y servir los módulos src organizados bajo app cuando facilite imports coherentes. El build debe rastrear todas las dependencias locales afectadas y seguir reutilizando motores no afectados.
- Los wrappers en spikes pueden reexportar código propio para pruebas/herramientas históricas. El editor propio no reexporta adaptadores. Las sondas Node pueden seguir experimentales.
- Solo adaptadores Scratch conocen VM/target; solo target micro:bit conoce PXT. Contratos/modelos no importan DOM, Blockly o motores. Shell no importa internals upstream ni mantiene escena mutable. Una comprobación ejecutable verifica estas reglas.
- Conservar todas las pruebas originales y snapshots funcionales, adaptando solo rutas de instrumentación/entry cuando cambian fuentes servidas, nunca expectativas semánticas.
## Validation
Prueba de límites de imports y selección conservadora para src; build incremental no-op/invalidación relevante; quick y grupos afectados; full final estable junto al inspector, preservación upstream y CodeGraph sincronizado.
