# Design

## Context

Véase proposal.md. El contrato exige campos exactos versión 1; tres ejemplos Blockly y checks acotados ya funcionan. El controlador revoca lecturas por identidad y guarda únicamente IDs. La vista muestra todas las pistas dentro de details. E1/E2 conservan contextos, carga protegida y seis orígenes.

## Goals / Non-Goals

**Goals:** extender los tres recorridos con datos locales, controles nativos y un reto con evaluación independiente; conservar progreso y autoría existentes.

**Non-Goals:** calificar explicaciones, almacenar respuestas del alumnado, añadir cuentas/telemetría/IA, ampliar actividades a 3D/web o afirmar aceptación docente sin observación.

## Decisions

1. Versión 2 añade `learning` con `objective`, `prerequisites`, `prediction`, `reflection` y `variant`. El reto tiene ID propio, título, instrucciones, predicción, reflexión, pistas y checks existentes. Versión 1 sigue estricta. Mantener límites JSON/bytes/profundidad/pasos y predicados; sin expresiones ni callbacks.
2. Conservar starter, IDs, checks principales y revisión 1 de esos checks. La presentación versión 2 no invalida historial técnico anterior. Progreso admite IDs principales y del reto; cambiar metas existentes exige revisión nueva. No reescribir registros al leer ni inferir reto desde éxito principal.
3. `mode` principal/variante vive en el controlador educativo, nunca GGPROJ. Seleccionarlo cancela token y resultados anteriores, conservando historial separado. Cargar ejemplo vuelve al principal mediante reemplazo protegido. Evaluar solo pasos del modo con guardas vigentes de origen/sesión/revisión/autoría.
4. Objetivo y requisitos preceden a los pasos. Predicción oral o escrita por cuenta propia, sin campo que parezca guardarse. Reflexión disponible al fallar o completar. Conservar pistas reveladas en memoria por actividad/recorrido/paso durante la sesión; no son calificación de autonomía. Mantener el botón tras revelar y avisar el número mostrado para conservar foco.
5. Variantes: historia x=80; juego cuatro puntos y x=40; copia textual x=24 con procedencia y bloques intactos. Primera pista sin solución. Checks solo acreditan posición/variable/autoría/procedencia; otras combinaciones se discuten con docente.
6. Mantener composición E2 y tokens; ampliar panel con ancho de lectura y secciones. Sin framework, motor o dependencia nuevos.

## Risks / Trade-offs

- Historial confundido con resultado actual → contar IDs del modo y conservar aviso histórico.
- Respuesta tardía del otro recorrido → cancelar token y comprobar modo vigente; probar lectura y transacción tardías.
- Pista interpretada como aprendizaje → no registrar dominio; guion docente para explicar y transferir.
- Nivel lector desconocido → hipótesis de principiantes con docente; revisión educativa externa pendiente.
- Cargar ejemplo borra trabajo → conservar reemplazo protegido y rollback.

## Migration Plan

Snapshot restaurable E2, lectura dual v1/v2, extensión aditiva de IDs de progreso y catálogo v2 sin modificar ejemplos/checks anteriores. Verificar fixtures v1 y registros antiguos. Revertir código desde snapshot conserva GGPROJ; registros con ID del reto no son válidos en la versión anterior. No eliminar la base local. Actualizar conjunto offline verificado conservando rollback por cohort.
