---
name: gg-design-system
description: Diseñar y revisar interfaz, componentes y microinteracciones de Code Studio con lenguaje educativo en español, estados reales y una dirección visual compartida.
---

# Interfaz de GuateGeeks Code Studio

Esta skill aporta criterios del producto. Usa una sola dirección de diseño por tarea y conserva el alcance solicitado, sea refinamiento o rediseño.

## Autoridad visual y contexto

- Lee `PRODUCT.md` y `DESIGN.md` en la raíz si existen, junto con el brief aplicable. Si faltan, inspecciona [HTML](../../../src/studio/index.html), [CSS](../../../src/studio/style.css), capturas y recursos actuales.
- Distingue decisiones aprobadas, apariencia observada y propuestas. No declares oficial una paleta, tipografía o mascota deducida del código. `hero.svg` es demostrativo, no un logo confirmado.
- El editor permite operar y aprender, con prioridad en principiantes acompañados por un docente: destaca documento activo, acción disponible, resultado y continuidad. La expresión visual apoya esas tareas.
- Conserva decisiones compartidas en una única fuente de diseño y requisitos en OpenSpec. No crees sistemas de tokens o planes competidores por usar varias skills públicas.

## Jerarquía e interacción

- Haz inequívoco qué documento/contexto se edita y cuál se ejecutará. Presenta controles pertinentes a la tarea sin perder acceso a capacidades existentes.
- Conecta seleccionar, modificar, ejecutar, observar y corregir. La selección visual corresponde al estado real y tiene alternativa de teclado.
- Diferencia estado inicial del proyecto e inspección de ejecución. Mover un objeto durante runtime no debe aparentar un cambio de autoría guardado.
- Distingue bloques, fuente derivada de solo lectura y copia textual independiente. Rótulos y disposición no deben prometer sincronización inexistente.
- Explica guardado local, descarga portable y preparación offline con acciones y estados distintos. «Guardando» no equivale a «Guardado».
- Diseña los estados que el flujo produce: inicio/vacío, preparación, listo, modificación, ejecución, detención, error, recuperación y recursos faltantes.
- Mantén errores accionables y vínculo con bloque/línea cuando la referencia siga vigente; un toast fugaz no sustituye ese recorrido.

## Lenguaje, acceso y movimiento

- Usa español claro y nombres estables. Expón términos internos como IR, sesión o IDs únicamente cuando ayuden a la tarea del usuario.
- Conserva etiquetas semánticas, foco visible, enlaces de salto, salida de teclado y avisos accesibles. No ocultes el foco al cambiar paneles o contexto.
- En pantallas estrechas y con zoom, mantén alcanzables ejecutar/detener, editor, resultado y diagnóstico. Un viewport emulado no demuestra compatibilidad móvil física.
- El movimiento comunica selección, transición o resultado real. Ofrece movimiento reducido, interrupción y feedback equivalente sin animación; no dependas solo del color o movimiento.
- Prefiere CSS y capacidades nativas para transiciones sencillas. Añadir una biblioteca requiere una necesidad concreta y comprobar tamaño, offline y compatibilidad.

## Movimiento

- Duraciones y curvas viven como tokens en `DESIGN.md` y en `src/studio/style.css`; no escribas valores sueltos. Respuesta de estado ≤150 ms, paneles y vista ampliada ≤250 ms; nada de la interfaz supera 300 ms.
- Anima `transform` y `opacity`. No animes alto, ancho ni posición de Blockly, iframes o editores: los recalcula su propio renderer. Nunca `scale(0)`; entra desde 0.96–0.98 con opacidad.
- Entradas con ease-out y salidas más cortas; evita ease-in para algo que aparece. Una animación interrumpida o desmontada se cancela sin dejar estados intermedios.
- `prefers-reduced-motion: reduce` elimina desplazamientos y conserva el cambio de estado visible (color, texto, foco). El resultado del alumno (escena, placa, aplicación) no forma parte de este sistema: su movimiento pertenece a la ejecución.
- Para revisar movimiento de forma específica puedes consultar `emil-design-eng` y `review-animations` en `.claude/skills/`; este documento y `DESIGN.md` prevalecen si discrepan.

## Verificación y entrega

- Mira el resultado renderizado en tamaños afectados y prueba controles, no solo capturas. Incluye teclado y estados de error/recuperación pertinentes.
- Reutiliza las suites `accessibility-shell`, `accessibility-runner` y `accessibility-zoom` por impacto y sigue [TESTING](../../../docs/engineering/TESTING.md).
- Conserva las fronteras descritas en la [guía docente](../../../docs/phase-7/TEACHER-GUIDE.md). Cambiar el aspecto no amplía permisos de ejecución ni formatos admitidos.
- Registra evidencia automática y observación humana por separado. Una revisión heurística no demuestra que alumnos o docentes comprendan la experiencia.
- Documenta decisiones visuales nuevas y supuestos sin convertir una propuesta no evaluada en marca aprobada.