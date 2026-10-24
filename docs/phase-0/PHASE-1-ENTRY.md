# Criterios de entrada a F1

**22 de octubre de 2026 · Estado: entrada F1 habilitada por la corrida final y decisiones del [acta de cierre F0](CLOSEOUT.md).**

Este documento define el paso al corte vertical 2D persistente del [plan](../../../docs/architecture/IMPLEMENTATION-PLAN.md). La entrada requiere resultados ejecutados, sin fallos u omisiones en los criterios funcionales obligatorios, y desviaciones de rendimiento registradas. Los conteos, medidas, entorno y decisión final se mantienen en el acta para evitar duplicar versiones de una misma corrida. No declara listo un producto escolar ni cierra G2 física.

## Matriz de salida F0

| Criterio | Evidencia requerida y regla de aceptación |
|---|---|
| Procedencia | [provenance.json](provenance.json), [mapa CodeGraph](INTEGRATION-MAP.md), commits/diffs/lockfiles preservados frente a la línea base |
| Contratos | Cinco [capacidades OpenSpec](../../openspec/changes/archive/2026-10-24-phase-0-integration-foundations/specs/) enlazadas con pruebas y validación estricta aprobada tras incorporar el cierre |
| G1: corpus mínimo | Secuencia, repetición, condiciones, variables locales/globales, espera, teclado/clic, dos scripts concurrentes, broadcast-and-wait, clones, cambio de disfraz, audio, diagnóstico y Stop; resultados reales de VM y representación cuando corresponde |
| G1: integración | Sin Scratch GUI; estado GG/VM/píxeles coincidente; recursos locales permitidos; autoría/IDs conservados; bloque o IR inválidos no sustituyen la escena |
| Run/Stop | Invalidación inmediata, rechazo de sesión/revisión y mensajes tardíos, cierre de audio, destrucción del worker bloqueado y nueva ejecución conservando autoría |
| Estabilidad | Al menos 10 ciclos Run/Stop: escena reinicializada, autoría intacta, sin mutación tardía y conteo de fallos explícito |
| Rendimiento | Arranque frío/caliente, bytes de packs, memoria con alcance del instrumento, latencia de evento/Stop y 100 sprites; entorno, cachés y desviaciones publicados |
| G2 clasificada | JS/HEX y simulación diferenciados de hardware; caché ausente falla sin cloud; offline limitado a contexto precargado. [ADR-003](../adr/003-pxt-y-clasificacion-g2.md): placa pendiente sin bloquear F1 |
| Decisiones | [ADRs](../adr/README.md), pendientes y alcance de F1 explícitos, con corrida final aprobada en el acta |

La evidencia histórica de [bindings](BINDINGS-EDITOR-RESULTS.md), [audio/estado](AUDIO-STATE-RESULTS.md) y [corpus/simulador](CORPUS-SIMULATOR-RESULTS.md) complementa la corrida final; sus conteos no deben presentarse como los de una ejecución posterior. [browser-evidence.json](browser-evidence.json) conserva la evidencia de navegador versionada. El acta enlaza las pruebas nuevas y las medidas de cierre; ningún criterio se da por cumplido solo por estar descrito aquí.

## Interpretación de rendimiento y estabilidad

El plan propone feedback visual de Stop ≤100 ms, cancelación forzada/descarte ≤1 s y 100 sprites ≥30 FPS **en un equipo escolar acordado**. Publicar valores de laboratorio por separado, con GPU/software WebGL, tamaño sin comprimir o transferido, caché fría/caliente y alcance de memoria. El heap JS de un contexto no representa RAM total de Chromium ni todos los workers.

El cierre requiere demostrar recuperación del ejecutor bloqueado y ausencia de contaminación entre ejecuciones. Una regresión en eso bloquea F1. Si un presupuesto propuesto falla en el perfil medido, se conserva el valor, se explica su impacto y se asigna una acción concreta; no se modifica el umbral para obtener un aprobado. Un perfil WSL/Chromium con software WebGL caracteriza ese entorno y no aprueba el presupuesto escolar. El acta indica si la desviación permite continuar el corte F1 acotado y qué validación seguirá pendiente antes del piloto.

Diez ciclos comprueban repetición acotada, sin demostrar ausencia de fugas a largo plazo. El rendimiento de 100 sprites tampoco representa todas las combinaciones de audio, clones o proyectos importados.

## Alcance y aceptación de F1

F1 convierte los spikes en producto mediante los contratos de [ADR-001](../adr/001-motor-2d-scratch.md) y [ADR-002](../adr/002-estado-ir-sesiones-aislamiento.md): shell único, Blockly, un sprite, al menos dos eventos, puntuación, repetición, espera, disfraz, clon, sonido, consola y código generado de solo lectura para el subconjunto soportado.

GGPROJ y autosave **comienzan en F1**. Deben guardar autoría, IDs, estado inicial, recursos y versiones necesarias; importar/restaurar de forma atómica; diagnosticar versiones/recursos desconocidos sin perder el proyecto abierto; y no conceder permisos de ejecución de extensiones remotas. Detener o ejecutar no sobrescribe automáticamente autoría con estado final del motor.

Las pruebas de aceptación de F1 deben cubrir:

1. Crear, editar, ejecutar y detener el ejemplo en una UI; conservar bloques/IDs y estado inicial mientras cambia la escena ejecutada.
2. Exportar GGPROJ, cerrar y reabrir: restaurar autoría/recursos y reproducir el comportamiento esperado. El round-trip Blockly existente es un punto de partida, no esta aceptación.
3. Recargar y recuperar autosave; distinguir revisión recuperada de sesión destruida. Mensajes/referencias antiguos no cambian el proyecto restaurado.
4. Rechazar archivo truncado, versión no soportada, referencia de asset ausente, tamaño excedido y metadatos de extensión no autorizados, preservando el proyecto activo y mostrando diagnóstico.
5. Detener espera, audio y ejecutor bloqueado durante el flujo persistente; reabrir la misma autoría y ejecutar de nuevo.
6. Servir archivos estáticos/configuración sin trasladar ejecución o compilación del programa del alumno al servidor de desarrollo.

El cambio OpenSpec de F1 definirá esquema/compatibilidad del manifiesto, límites y recuperación antes de implementar persistencia. Mantener las pruebas F0 al extraer paquetes y sustituir fixtures del laboratorio.

## Pendientes fuera de este corte

| Trabajo | Momento o condición |
|---|---|
| Hardware micro:bit V1/V2, alimentación autónoma y matriz de paquetes nativos | G2 física antes de aceptar F4 |
| QuickJS/Pyodide, cancelación async y equivalencia de lenguajes | F2, con aislamiento validado |
| Segunda visita offline, actualización atómica y capacidades de extensiones | F3 |
| Importación general SB3 y corpus de 20 proyectos, listas/efectos y recursos ajenos | F5; no inferir compatibilidad total por usar Scratch VM |
| Otros navegadores, almacenamiento por sitio, cuotas completas, revisión de permisos y perfil escolar | Endurecimiento/validación según alcance del piloto; las pruebas actuales no certifican seguridad completa |
| LICENSE, THIRD_PARTY_NOTICES, SBOM, fuentes de releases y licencias individuales de assets | Antes de distribución pública; open source no sustituye ese inventario |

La entrada F1 no autoriza prometer esos resultados. Al consolidar la matriz funcional y medidas, el acta, [RESULTS](RESULTS.md) y OpenSpec deben identificar los mismos conteos, contexto y limitaciones.
