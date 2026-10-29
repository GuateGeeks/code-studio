# Plan de estabilización 2D

29 de octubre de 2026, Guatemala. Aprobado por el usuario ese mismo día («procede con lo recomendado»). Concreta la Ola 1 del [plan de maduración](FEATURE-MATURATION-PLAN.md) para entregar valor pronto. Prevalece sobre el orden de continuación del [prompt de relevo](../engineering/AGENT-HANDOFF-PROMPT.md).

## Objetivo

El primer valor entregable es **un piloto 2D en aula, con docente y estudiantes de 10 a 12 años**. Está listo cuando una docente puede dar una clase de 45 minutos así:

- abre el estudio en el equipo escolar, preparado sin red;
- sus estudiantes siguen una actividad guiada y construyen un juego o una historia sencilla;
- ejecutan, detienen, guardan y descargan su trabajo;
- en la clase siguiente lo reabren sin perder nada.

## Decisiones del 29/10/2026

| # | Decisión |
|---|---|
| E-1 | **Congelar el ancho y profundizar 2D.** micro:bit, 3D, web y Scratch importado no reciben funciones nuevas. Sus regresiones siguen en la puerta y solo se corrigen defectos demostrados |
| E-2 | `synced-code-views` se cierra con 2D. Las tareas 4.2 (micro:bit) y 4.3 (3D/web) se trasladan sin marcar a `synced-code-views-capability-contexts`. El borrador micro:bit del 29/10 sale de `src/` y queda en `artifacts/synced-code-views/microbit-20261029/draft/` |
| E-3 | **Modo piloto: solo 2D y texto para 2D**, configurado en el despliegue. Los demás contextos de un proyecto se conservan sin mostrarse (cambio `pilot-2d-mode`) |
| E-4 | **Despliegue local** (resuelve D2). Cada equipo sirve la release en `127.0.0.1`, prepara el uso sin red y funciona sin hosting. Un servidor compartido por la red de la escuela no sirve sin HTTPS, porque la preparación offline necesita un contexto seguro |
| E-5 | Commits locales autorizados al cerrar cada etapa. Sin push ni publicación |

## Etapas

| Etapa | Contenido | Tamaño | Salida verificable |
|---|---|---|---|
| **E0 · Cerrar lo abierto** | Re-alcance de `synced-code-views` (E-2). Revisión 2 de «De bloques a tu propio código» (5.1). `pilot-2d-mode` (E-3). E2E 2D y la **puerta full global**. Documentación, archivo y commit | S–M | Línea base 2D estable con commit |
| **E1 · Vocabulario 2D esencial** | Primera tanda de `scene2d-vocabulary-v2`, solo con bloques que funcionan con un sprite: por siempre, ir a x/y, fijar/cambiar x/y, girar/apuntar, rebotar en el borde, decir/pensar, mostrar/ocultar, tamaño, siguiente disfraz, esperar hasta, detener. Cada bloque llega con su tabla, JS/Python, ida y vuelta y corpus | M–L | Animaciones y diálogos con un personaje; `forever` con bloque |
| **E2 · Varios sprites** | `scene2d-multi-sprite`, más «ir a objeto» y «fondo» | L | «Diálogo» como E2E; los proyectos v1–v5 abren idénticos |
| **E3 · Sensores y operadores** | Segunda tanda: tocando, tecla presionada, aleatorio, aritmética, lógica, temporizador y expresiones anidadas | M–L | «Atrapa la fruta» y «Laberinto» como E2E |
| **E4 · Recursos iniciales** (en paralelo con E1–E3) | `resources-starter-library`: unos 20 sprites, 8 fondos y 10 sonidos propios o CC0, en la preparación sin red | M | Proyectos canónicos sin red |
| **E5 · Listo para aula** | Unidad 2D de 6 a 8 actividades; guía de instalación local por equipo; observación docente con los guiones existentes | M + personas | Acta de la primera clase observada |

**Valor temprano:** al cerrar E0 se puede hacer una sesión corta con una docente usando las tres actividades actuales y los guiones existentes, antes de invertir en E1–E3.

## Criterio de estable por etapa

- quick → affected de todos los archivos cambiados → **full al cerrar la etapa**, con acta.
- Proyecto canónico como fixture E2E: crear, ejecutar, detener, guardar, reabrir y llevar a un perfil nuevo.
- Lectores GGPROJ v1–v5 y copias API1/API2 intactos, sin pérdida de IDs.
- Nada se ejecuta al abrir, cambiar de vista o recuperar. Un único Detener. Funciona sin red.
- Regresiones de los contextos congelados en verde.

## Diferido

- Vistas sincronizadas de micro:bit y 3D/web.
- Vocabulario y radio de micro:bit, y prueba con placa física.
- Bloques tipados 3D/web y mejoras de importación Scratch.
- CodeMirror, hasta después de la primera observación salvo que el piloto apunte a texto.
- Sócrates.

## Lista de defectos de contextos congelados

| Hallazgo | Estado |
|---|---|
| Los comentarios en bloques micro:bit parecen perderse al guardar: `captureDeviceGraph` no los captura y el grafo no los admite | Sin verificar con una reproducción; anotado el 29/10/2026 |
