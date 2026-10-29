# Estabilización 2D · E0: cierre de lo abierto

29 de octubre de 2026, Guatemala. Etapa E0 del [plan de estabilización 2D](../product/STABILIZATION-PLAN-2D.md). Commits locales autorizados, sin push. **Estado: implementación y focales aprobados; smoke, affected y full pendientes por puertos ocupados.**

## Decisiones aplicadas

- `synced-code-views` limitado a 2D. Las tareas 4.2 y 4.3 se trasladaron sin marcar a `synced-code-views-capability-contexts`. El borrador micro:bit del 29/10, sin conectar ni probar, salió de `src/` y quedó en `artifacts/synced-code-views/microbit-20261029/draft/`. Se comprobó que el árbol volvió al inventario inicial: estado y hashes idénticos.
- Despliegue local en cada equipo (D2).
- Modo piloto de solo 2D y Texto mediante el perfil de despliegue (`pilot-2d-mode`).

## Commits

| Commit | Contenido |
|---|---|
| `6490aa5` | Punto de control del corte 2D heredado (8/13), sin cambios nuevos |
| `791c1e4` | Plan de estabilización y re-alcance de `synced-code-views` |
| `cf8ddfd` | Revisión 2 de la actividad y modo piloto 2D |

## Revisión 2 de «De bloques a tu propio código» (5.1)

- **Catálogo:** `text-transition` pasa a revisión 2 con el mismo ejemplo inicial. La revisión 1 queda intacta y se selecciona como `text-transition@1`; `getLesson(id)` devuelve la última revisión.
- **Checks de programa:** `edited-in-text` (la autoría recibió un cambio aplicado desde JavaScript o Python), posición y `authored-operation` de tipo `move` (valor del bloque Mover). Ninguno depende de una copia ni del formato del texto.
- **Progreso:** el progreso es por revisión, con las mismas claves de almacenamiento. Los IDs de una revisión no validan en la otra. La revisión 2 muestra el progreso de la revisión 1 del mismo proyecto sin mezclarlo.
- **Requisito de copia:** el controlador exige ejecutar una copia solo cuando el recorrido contiene `text-copy`; antes dependía del ID de la actividad.

## Modo piloto 2D

- **Perfil:** `GG_CONTEXTS=2d,text` se valida como una lista cerrada que incluye `2d`. Se publica en `config.json` y entra en la cohorte solo si se declara. Sin perfil, `config.json` conserva su forma.
- **Navegación:** el selector solo lista los contextos del perfil. `select()` hacia un contexto oculto devuelve `false` y no cambia nada. Los participantes de autoría siguen registrados.
- **Aviso:** indica qué contextos ocultos tiene el proyecto y que se conservan.
- **Arranque:** `npm run serve:pilot`.

## Verificación

WSL, Node v22.23.4, `source ../scripts/env.sh`. Evidencia en `artifacts/stabilization-2d/e0-20261029/`.

| Comprobación | Resultado |
|---|---|
| Node completo (quick) | 474/474 |
| Herramientas (quick) | 79/79, incluido el inventario de las dos suites nuevas y la fijación de `pilot-2d-mode` a la partición 0 |
| Focal actividad, `synced-transition-activity` | 3/3 (JavaScript, Python, progreso revisión 1 → 2) en `activity-focal-2.json` |
| Focal piloto, `pilot-2d-mode` | 1/1 en `pilot-focal-3.json` |
| OpenSpec | Válido en cada commit |
| Smoke quick | 1/3: los dos fallos son de entorno. `tests/quick/studio.spec.mjs` busca el runner en `127.0.0.1:4174` y la corrida usó puertos alternativos |
| Affected y full | **Pendientes** |

### Intentos conservados

1. `activity-focal-1`: el servidor no arrancó porque 4173 estaba ocupado.
2. `pilot-focal-1` y `pilot-focal-2`: el fixture añadía capacidades editando el JSON y dejaba el campo `scene` de la forma sin perfil, así que GGPROJ lo rechazó. Se cambió por `project.useCapabilities`, la misma ruta que usa la interfaz.

### Bloqueo de puertos

4173, 4174 y 4175 los ocupan tres procesos `node` de Windows del proyecto `arduino-3d` (servidores de referencia lanzados desde Codex), identificados con `Get-NetTCPConnection` y su línea de comandos. No se detuvieron porque son ajenos. Las suites de la partición 0 y el smoke asumen esos orígenes, así que affected y full necesitan esos puertos libres.

## Pendiente para cerrar E0

- Liberar 4173–4182 y ejecutar affected de los archivos cambiados y una full.
- Marcar 5.1, 5.2 y 5.3 de `synced-code-views` y 1.1–1.3 de `pilot-2d-mode` con esa evidencia; archivar ambos cambios.
- ADR-011 a «implementada para 2D», PRODUCT y CURRENT-STATUS con los conteos de la full.
