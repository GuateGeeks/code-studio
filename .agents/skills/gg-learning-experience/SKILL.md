---
name: gg-learning-experience
description: Diseñar o revisar actividades, pistas y feedback educativo de GuateGeeks Code Studio, vinculando acciones del estudiante con evidencia de aprendizaje.
---

# Experiencia de aprendizaje de GuateGeeks

Usa esta skill al cambiar una actividad o su acompañamiento educativo. Una corrección de infraestructura sin efecto pedagógico no necesita este flujo.

## Partir del producto real

- Lee el [catálogo](../../../src/assets/lessons/catalog.mjs), el [contrato](../../../src/lessons.mjs) y la [evaluación](../../../src/lesson-evaluation.mjs) del área afectada.
- El catálogo inicial contiene `story` («Una pequeña historia»), `score` («Un juego de tres puntos») y `text-transition` («De bloques a tu propio código»). Confirma su estado en las fuentes.
- Las actividades son datos declarativos locales. Añadir un campo educativo exige resolver su contrato y compatibilidad; escribirlo en el catálogo no basta.
- El público prioritario confirmado es principiante con acompañamiento docente. Edad, grado, currículo y nivel lector requieren evidencia o una hipótesis explícita; no los infieras del idioma o del uso de bloques.

## Diseñar el aprendizaje

En el cambio OpenSpec existente, concreta lo pertinente:

- **Objetivo:** concepto que el estudiante podrá explicar o aplicar.
- **Conocimientos previos:** lo necesario para empezar y una entrada accesible cuando falte.
- **Predicción y acción:** qué anticipará, manipulará y ejecutará el estudiante.
- **Feedback:** observación que permite contrastar su predicción y decidir el siguiente paso.
- **Evidencia:** explicación, modificación o transferencia que permita observar el concepto trabajado.

Un check de posición, variable, bloque declarado o copia textual demuestra esa condición técnica. No demuestra comprensión, dominio curricular ni aprendizaje causal. Distingue ambos resultados en mensajes y criterios de aceptación.

## Pistas y continuidad

- Ofrece pistas progresivas: orientar la observación, relacionar causa y efecto y después concretar una acción. Evita entregar la solución en la primera pista cuando el objetivo sea explorar.
- Si se necesita una solución trabajada, preséntala como tal; no contabilices su reproducción como resolución autónoma.
- Permite reintentar. Conserva las protecciones al reemplazar el proyecto y el progreso separado de la autoría; consulta la [guía docente](../../../docs/phase-7/TEACHER-GUIDE.md).
- El código derivado es de solo lectura y la copia textual es independiente. Comprueba que editarla conserva los bloques y que el estudiante puede explicar qué ejecutará.
- Las pistas locales deben funcionar en el alcance offline preparado. Una futura ayuda de Sócrates requiere un contrato propio; esta skill no añade un tutor ni autoriza enviar código o actividad a un servicio.

## Comprobar el cambio

- Reutiliza las pruebas de integración `lessons`, `lesson-controller`, `lesson-progress-store` y la prueba de navegador `packs-lessons` según impacto.
- Sigue [TESTING](../../../docs/engineering/TESTING.md). Verifica carga protegida, reintento, feedback, teclado y persistencia cuando cambien esos recorridos.
- Propón una observación breve con estudiantes/docentes para evaluar comprensión. Si no participaron, registra el guion y la evidencia pendiente; no sustituyas esa evidencia por E2E.
- Mantén requisitos, tareas y evidencia en el cambio OpenSpec del trabajo. Esta skill no crea un plan paralelo ni amplía el alcance solicitado.