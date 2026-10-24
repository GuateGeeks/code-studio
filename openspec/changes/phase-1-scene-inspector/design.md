## Context
Solo existe un sprite autoral hero. scene.get ya devuelve sprites [{id,name,x,y}] y variables numéricas locales de hero. No ofrece globales Stage, clon, disfraz o audio por DTO; no inventarlos.
## Goals / Non-Goals
Inspector de solo lectura y toolbox construible del corpus F1. No edición de propiedades, polling, recursos ajenos, multiobjeto general ni nuevo estado mutable de escena.
## Decisions
- Validar snapshot propio: exactamente sprites/variables, un hero con id/name hero y x/y finitos de magnitud <=1e6; hasta 16 variables con id128/name64 y valores finitos <=1e6, IDs únicos. Clonar DTOs. Rechazar extras/metadatos/valores inválidos sin reemplazar lectura válida.
- Controlador captura sesión/revisión antes de await y usa secuencia local de lectura; solo última solicitud vigente actualiza. invalidate al Stop/sustituir programa; ningún dato de ejecución se guarda como autoría.
- Selector accesible Escena 2D / hero. Estado inicial viene del contrato GGPROJ fijo (x0/y0/dirección90/tamaño100/disfraz hero), claramente separado de «Última lectura de ejecución». Solo mostrar variables locales realmente suministradas por GG.
- Botón Actualizar lectura; además refrescar tras Run, acción GG y disponibilidad del runner. Eventos scene-state agrupan refresco con debounce 100 ms, sin bucle de polling. Error de lectura visible, sin quitar controles ni autoría.
- Añadir categorías Apariencia, Clones y Sonido y bloque global a Variables sin crear operaciones. Los recursos siguen hero/hero-alt/tone. Tests deben crear al menos un bloque desde toolbox, guardarlo/reabrirlo y ejecutar.
## Risks / Trade-offs
Un snapshot es lectura fechada, no SceneGraph paralelo ni monitor universal. Otros scripts pueden avanzar después; actualizar de nuevo. El corte sigue limitado a un sprite autoral.
## Validation
Node DTOs y carreras de lectura. Chromium selector/teclado/móvil, coincidencia GG/VM, respuesta obsoleta tras Stop, toolbox real y persistencia sin estado ejecutado. Grupos afectados antes de full estable único.
