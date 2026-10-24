# ADR-002: Estado único, IR propia y ejecución por sesión

**Fecha:** 22 de octubre de 2026.  
**Estado:** aceptada para F1; límites del spike y endurecimiento explícitos.  
**Contratos:** [block-program](../../openspec/changes/phase-0-integration-foundations/specs/block-program/spec.md), [runtime-session](../../openspec/changes/phase-0-integration-foundations/specs/runtime-session/spec.md) y [scratch-adapter](../../openspec/changes/phase-0-integration-foundations/specs/scratch-adapter/spec.md).

## Contexto y decisión

Blockly, llamadas externas y el motor deben observar la misma ejecución sin que un mensaje tardío cambie otro programa. La autoría debe sobrevivir a la terminación forzada. El motor y PXT tienen requisitos distintos de navegador y no deben ampliar accidentalmente los permisos del shell.

Mantener dos responsabilidades: el modelo de autoría pertenece al anfitrión y describe el estado inicial; el adaptador respaldado por VM/targets es el único propietario del estado mutable de ejecución. No mantener un SceneGraph mutable paralelo. Un DTO es una lectura desprendida, no otra fuente de verdad. Capturar estado ejecutado como autoría necesitará una acción explícita futura.

Usar IR GG versionada, tipos y métodos propios en la frontera. Blockly conserva IDs de origen; el traductor puro genera el proyecto nativo. Validación y traducción suceden antes de sustituir una escena. Operaciones, propiedades, referencias, valores o recursos desconocidos fallan con diagnóstico; no se intenta ejecutar un bloque desconocido ni limpiar primero la escena válida. Las cargas en curso rechazan operaciones concurrentes para no exponer targets parcialmente deserializados.

El límite v0 actual es 65 536 bytes, 300 nodos, profundidad 8, 16 scripts y 16 variables, con repetición literal máxima 1000, espera máxima 60 segundos y números finitos de magnitud máxima 1 000 000. Son límites de entrada del spike, no cuotas exhaustivas de ejecución. Los SVG/WAV permitidos forman parte del build; un importador general no está implementado.

Las referencias GG quedan acotadas a **sesión y revisión de programa**. El anfitrión comprueba ambas después de esperar disponibilidad y el runner comprueba la revisión antes de mutar. El canal usa versión, secuencia monotónica e identificadores de solicitud. El handshake exige origen, `source` y sesión esperados antes de transferir un `MessagePort`. Los métodos explícitos devuelven DTOs propios, sin acceso arbitrario a propiedades de VM. Emitir un mensaje confirma los hats iniciados; no equivale a esperar a todos los receptores.

Al recibir Stop, el anfitrión invalida inmediatamente la sesión y rechaza solicitudes pendientes. Da hasta 150 ms al cierre cooperativo, retira el frame aun sin respuesta y crea una sesión nueva. El runner cierra VM, workers y contexto de audio. La autoría permanece fuera de ese contexto. Preservarla en memoria ya se prueba; guardarla tras cerrar o recargar mediante GGPROJ/autosave corresponde a F1.

## Fronteras de navegador y excepciones actuales

Shell, runner y simulador usan orígenes distintos. El iframe del runner declara `sandbox="allow-scripts allow-same-origin"`; su separación depende de mantener realmente otro origen, no de considerar opaco ese iframe. El despliegue deberá preservar la frontera y revisar almacenamiento a nivel de sitio.

| Contexto | Política relevante | Motivo y límite |
|---|---|---|
| Shell | Scripts `self`; estilos `self unsafe-inline` | Blockly instala estilos y posiciones dinámicas |
| Runner 2D y worker compilador | Scripts `self`; estilos del runner `self`; sin `unsafe-eval` | Adaptador y validación no requieren compilación dinámica de JS |
| Simulador micro:bit | Scripts `self unsafe-eval`; estilos `self unsafe-inline` | PXT Runtime evalúa JS generado y su SVG usa estilos dinámicos; excepción restringida a ese origen |
| Todos | `connect-src self`, workers locales, frames limitados a orígenes configurados; `object-src none`, `base-uri none`, `form-action none` | Sin resolución remota arbitraria en el perfil probado |

La fuente de esta política es [serve-browser.mjs](../../tools/f0/serve-browser.mjs). Los E2E verifican SOP, handshake falsificado, sesiones/revisiones obsoletas, bloqueo de conexiones, worker bloqueado y cierre de audio. No constituyen una prueba de seguridad completa: faltan cuotas de todos los recursos/timers, revisión de permisos, endurecimiento de almacenamiento/despliegue y otros navegadores. El código libre de alumno con QuickJS/Pyodide requiere la validación de F2; `window.GG` es una API experimental del anfitrión.

## Consecuencias y criterios para reabrir

Se obtiene recuperación independiente del ejecutor y una frontera para reemplazar adaptadores. A cambio se deben administrar serialización, asincronía, cancelación y referencias obsoletas en cada operación nueva. F1 debe conservar estos escenarios al extraer los spikes y definir carga/persistencia atómicas sin confundir revisión de autoría con sesión de ejecución.

Reabrir si una referencia obsoleta muta el programa vigente; si Stop depende indefinidamente de cooperación; si la UI pierde autoría al destruir el runner; si otro contexto obtiene excepciones CSP para un nuevo paquete; si cambia origen, almacenamiento o handshake; o si GG expone internals o un segundo estado mutable. Las ampliaciones de IR requieren contrato, diagnóstico y pruebas de rechazo/semántica correspondientes.

Evidencia: [bindings y validación](../phase-0/BINDINGS-EDITOR-RESULTS.md), [aislamiento inicial](../phase-0/BROWSER-RESULTS.md), [ciclo del audio](../phase-0/AUDIO-STATE-RESULTS.md), [resultados medidos](../phase-0/browser-evidence.json) y [cierre F0](../phase-0/CLOSEOUT.md).
