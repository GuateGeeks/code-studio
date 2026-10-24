# ADR-003: PXT encapsulado y G2 pendiente de hardware

**Fecha:** 22 de octubre de 2026.  
**Estado:** aceptada; compilación y simulación verificadas, G2 física pendiente.  
**Contrato:** [microbit-build](../../openspec/changes/phase-0-integration-foundations/specs/microbit-build/spec.md).

## Contexto y decisión

G2 exige firmware válido y ejecución autónoma en la placa declarada sin la interfaz MakeCode. El API simplificado de PXT y la presencia de HEX en caché no bastan para demostrar esa ejecución. F0 debe clasificar lo demostrado antes de la integración de dispositivo de F4.

Conservar PXT detrás de un adaptador propio y fijar compilador, target, paquetes, variantes y cachés mediante la [procedencia y hashes](../phase-0/provenance.json). Compilar en un worker del navegador separado del shell, con resolución local explícita. Un paquete o caché nativo ausente produce diagnóstico; no habilitar fallback cloud silencioso.

Ejecutar el JS generado en `pxsim.Runtime` y `DalBoard` reales del simulador local. El contexto con `unsafe-eval`, necesario para ese runtime, reside en el origen del simulador; shell, runner 2D y worker compilador conservan scripts `self`. Deshabilitar la ruta global de inicio del embed y aceptar solo el canal autorizado. No sustituir una prueba de compilación/ejecución por una implementación que dibuje el resultado esperado.

| Nivel de evidencia | Resultado de F0 | Interpretación |
|---|---|---|
| Compilación fuera del editor | Node y worker producen JS y diagnósticos de `main.ts` | Extracción viable para programas/paquetes probados |
| Firmware generado | HEX `mbdal` V1, `mbcodal` V2 y universal con registros/checksums comprobados | Artefactos producidos; aún no ejecución en placa |
| Disponibilidad sin red | Compilación tras precargar el pack y desconectar el contexto | No demuestra segunda visita offline, PWA ni todas las combinaciones de paquetes |
| Simulación real | JS del worker ejecutado, matriz/SVG de corazón, botón A, Stop/reinicio y hashes coherentes | Comportamiento del simulador para el corpus registrado |
| Hardware físico | `physicalBoardValidated: false` | G2 física pendiente; ninguna simulación cambia este estado |

Clasificar G2 como **compilación y simulación aprobadas en el perfil probado; ejecución autónoma V1/V2 pendiente**. Satisface la obligación F0 de clasificar G2, sin afirmar su aprobación física. No bloquea F1, cuyas dependencias son G1 y Run/Stop según el [plan](../../../docs/architecture/IMPLEMENTATION-PLAN.md). Sí bloquea declarar aceptada F4 para una variante de placa.

## Consecuencias

- Micro:bit puede seguir como laboratorio mientras F1 construye el corte persistente 2D; no es dependencia de la historia F1.
- Una distribución debe empaquetar revisiones/hashes reproducibles, publicar qué combinaciones TS/nativas están disponibles sin red y fallar explícitamente fuera de esa matriz.
- Para cerrar G2 se registrará variante/revisión de placa, hash exacto del HEX, procedimiento de flasheo, arranque con alimentación autónoma y observación de LEDs/botón. Cada variante anunciada necesita evidencia propia; no inferir V2 desde V1.
- WebUSB, periféricos V2, control conectado de la escena y segunda visita offline son capacidades separadas. El servidor actual entrega archivos estáticos/configuración; no compila programas del alumno.
- La distribución open source sigue requiriendo inventario y avisos de dependencias, recursos y cachés. La disponibilidad local no aprueba redistribuir cualquier archivo del checkout.

## Evidencia y criterios para reabrir

Ver [compilación de navegador](../phase-0/BROWSER-RESULTS.md), [simulador y corpus](../phase-0/CORPUS-SIMULATOR-RESULTS.md), [resultados estables](../phase-0/browser-evidence.json) y [cierre F0](../phase-0/CLOSEOUT.md).

Reabrir al cambiar target, PXT, paquetes o cachés; al añadir una dependencia nativa; al encontrar un HEX que no arranca en la variante declarada; al aparecer una solicitud remota no explícita; o si la simulación deja de ejecutar el JS exacto generado. Si falla la extracción browser/offline para una combinación, publicar la limitación y conservar simulación/exportación PXT reproducible para herramientas locales según G2. Un servicio remoto requeriría una decisión explícita posterior.
