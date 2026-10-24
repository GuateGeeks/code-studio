# ADR-004: Callbacks textuales sobre hats nativos y contexto por invocación

**Fecha:**22 de octubre de2026. **Estado:**aceptada e implementada; full F2 aprobado (123 Node, 33 herramientas, 70 E2E).

## Decisión
QuickJS/Pyodide ejecutan funciones/control de flujo reales, con variables de escena propiedad de la VM. Los hats nativos ejecutan una primitiva proxy privada que espera la Promise de un callback del intérprete. Cada invocación tiene token/revisión/target propios; los callbacks no comparten un currentTarget mutable.

Las operaciones ctx resuelven referencias y mutaciones dentro del mismo comando del adaptador. GG.ref(id) es un DTO, no una lectura anticipada. changeVariable es atómico; broadcastAndWait espera los threads receptores capturados. Los clones heredan locales y comparten Stage globales. Reiniciar hats, borrar clones y Stop revocan tokens/esperas. La cola reserva IDs antes de programar callbacks y suprime inicio/resultados cancelados.

Al iniciar un programa de eventos se revocan mutadores GG sin contexto en el intérprete; las lecturas y los controles externos autenticados conservan sus contratos. Esto impide que un callback cancelado eluda ctx y escriba sobre hero. No cambia los cuerpos Blockly ni crea un SceneGraph paralelo.

El dominio contextual es finito±1e12, con error explícito al salir; no se declara equivalencia de todo IR0 arbitrario con overflow. El corpus compara valores, trazas y orden parcial, con teclado/clic, píxeles y señal de audio real. No garantiza cada intercalado posible de cualquier programa concurrente.

Las copias JS/Python son explícitas, persistidas en GGPROJ2, independientes y sin ejecución automática. La vista derivada se mantiene de solo lectura. Audio se prepara desde el catálogo local y se activa por gesto, sin lanzar cuerpos Blockly ocultos. La excepción de loader Pyodide sigue limitada al origen textual. La [preparación F2](../engineering/F2-PREPARATION.md) documenta el parser que evita el defecto compileOnly del wrapper QuickJS0.32.0.

## Evidencia
[OpenSpec](../../openspec/changes/phase-2-textual-equivalence/design.md), [resultados F2](../phase-2/RESULTS.md), pruebas de contratos/VM y motores/cola, y matriz Chromium por backend. El perfil local WSL registra tiempos/RSS aproximados; las máquinas escolares y validación física requieren evidencia independiente.
