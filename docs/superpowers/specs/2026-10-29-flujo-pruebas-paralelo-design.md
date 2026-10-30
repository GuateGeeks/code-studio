# Flujo de trabajo: pruebas con valor y trabajo en paralelo

29 de octubre de 2026. Diseño corto acordado con el usuario (enfoque **B**).

## Intención

El usuario quiere que el tiempo se dedique a implementar valor y no a probar de más. Hoy una full serie dura ~50 min y se repitió tres veces en un día. Hay 16 suites con puertos fijos que impiden probar en paralelo y obligan al coordinador a correrlas a mano. Además, las tareas se ejecutan una a una.

## Criterio de «hecho» (decisión del usuario)

- **Por tarea:** pruebas nuevas y específicas del cambio + la selección `test:affected` de los archivos cambiados, en verde.
- **La full no es obligatoria por etapa.** Se **sugiere** cuando el impacto lo justifica (`test:affected --list` devuelve `selection: full`, cambios de runner/servidor/build/configuración, o antes de entregar el piloto a un docente). El usuario decide.

## Objetivos

1. **Política escrita** en `docs/engineering/TESTING.md`, `AGENTS.md`, el plan de estabilización y las restricciones de los subagentes.
2. **Suites independientes del puerto:**
   - Todas las specs de navegador y el smoke (`tests/quick/studio.spec.mjs`) leen sus orígenes de las mismas variables `GG_*_PORT` que el servidor, mediante un helper único (`browserConfiguration`).
   - Las suites que arrancan servidores propios (`offline-recovery`, `pilot-2d-mode`, `standalone-contexts`) derivan sus puertos de un desplazamiento sobre el puerto base, sin colisionar entre particiones ni worktrees.
   - `defaultPortSuites` queda vacío o con la mínima excepción justificada.
3. **Particiones por defecto:** la full usa `--partitions auto` (política medida: 2 particiones con ≥6 GB libres y carga <8; si no, serie).
4. **Trabajo en paralelo:**
   - El coordinador agrupa las tareas por archivos disjuntos y despacha varios implementadores a la vez, cada uno en su worktree y con su rango de puertos. Integra continuamente y lanza las revisiones en paralelo.
   - Ninguna suite se ejecuta durante una full.
   - Presupuesto de carga: como máximo dos o tres corridas de navegador simultáneas, según `uptime`.

## No objetivos

- Recortar o fusionar pruebas, como desktop/móvil o muestreo del corpus (enfoque C, más adelante y con medidas).
- Cambiar CI remoto.

## Anti-objetivos

- Debilitar aserciones, timeouts o reintentos.
- Colisiones de puertos ocultas.
- Que una prueba deje de comprobar el origen real que comprobaba. Las aserciones de origen comparan con el origen configurado, no con un literal.

## Enfoques considerados

| Enfoque | Qué cambia | Coste | Decisión |
|---|---|---|---|
| A | Solo la política | Minutos | Insuficiente: los puertos fijos siguen bloqueando el paralelo |
| **B** | Política + suites independientes del puerto + particiones por defecto + tareas paralelas | ~medio día, mayormente mecánico | **Elegido por el usuario** |
| C | B + dieta de pruebas | Mayor ahorro; toca cobertura | Después, con medidas |

## Lo decidido sobre el cómo

- Fuente única de orígenes: `tools/build/browser-policy.mjs` (`browserConfiguration`), importada por las pruebas.
- La prueba de herramientas `test-partitions` deja de permitir orígenes por defecto en partición 0 y pasa a **prohibir** literales de puerto en las specs (salvo excepciones listadas con motivo).
- El trabajo se hace en un worktree propio, en paralelo con la tarea 2 de E2, sin tocar los archivos que esa tarea modifica.

## Queda para quien lo construye

- Nombre y forma del helper de orígenes para las pruebas.
- Esquema de desplazamiento de puertos para servidores propios.
- Cómo verificar el cambio, como mínimo:
  - las 16 suites y el smoke en una base distinta de 4173, a la vez que otra corrida en la base por defecto;
  - una full particionada.
