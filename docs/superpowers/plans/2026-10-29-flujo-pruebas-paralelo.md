# Pruebas independientes del puerto y flujo paralelo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que toda suite de navegador y el smoke corran en cualquier base de puertos, que la full particione por defecto y que la política «pruebas nuevas + affected; full sugerida por impacto» quede escrita.

**Architecture:** Un helper de pruebas (`tests/browser/origins.mjs`) lee los orígenes de `browserConfiguration(process.env)`, la misma fuente que el servidor. Los servidores propios de algunas suites derivan sus puertos de la base con un desplazamiento fijo por suite. La prueba de herramientas de particiones pasa a prohibir literales de puerto, y `defaultPortSuites` queda vacío.

**Tech Stack:** Node 22 (`node:test`), Playwright 1.64, ESM. Herramientas en `tools/test/` y `tools/build/browser-policy.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-29-flujo-pruebas-paralelo-design.md`

## Global Constraints

- **Worktree:** `/home/adawolfs/projects/makecode/gcs-test-ports`, rama `stab/test-ports`, desde `96356c9`. Entorno: `source ../scripts/env.sh && unset -f node npm npx`. `node_modules` es un symlink: no lo modifiques.
- **Paralelo con E2:** E2 Task 2 trabaja a la vez en `../gcs-e2-multisprite`. No toques `src/` salvo `tools/` y lo que pida este plan; en `tests/browser/` cambia solo literales de puerto, servidores propios y lo que diga cada tarea.
- **Puertos de verificación:** usa la base 5800 (`GG_SHELL_PORT=5800 GG_RUNNER_PORT=5801 GG_SIMULATOR_PORT=5802 GG_LANGUAGE_PORT=5803 GG_SCENE3D_PORT=5808 GG_WEBAPP_PORT=5809`) y, cuando una tarea lo pida, la base por defecto 4173. Nunca otros rangos (5283/5383 son previews del usuario; 5400–5799 son de otros agentes).
- **Sin debilitar:** nunca debilites aserciones, timeouts ni reintentos. Toda aserción de origen compara con el origen **configurado** (`origins.*`), nunca con el origen leído del propio frame o respuesta que se comprueba.
- **Sin variables:** con las variables `GG_*_PORT` sin definir, el comportamiento es idéntico al actual (base 4173, 3D/web en 4181/4182).
- **Desplazamientos de servidores propios** (sobre el puerto shell de la base): `offline` +50, `pilot` +60, `standalone` +70. Dentro de cada bloque: shell +0, runner +1, simulator +2, language +3, scene3d +8, webapp +9. Con base 4173 quedan 4223–4252; con la partición i (base 4400+100·i) quedan dentro de su centena.
- **Commits:** en español, terminados en una línea en blanco y `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sin push, merge ni `git stash`.
- **Criterio de «hecho»:** pruebas nuevas + affected en verde. La full solo se sugiere.

## Review Focus

1. **Dos bases a la vez** (p. ej. 4173 y 4500): los servidores propios no deben colisionar. La Task 4 lo verifica con dos corridas simultáneas.
2. **Variables sin definir:** los orígenes deben ser exactamente los de hoy. La Task 1 tiene una prueba Node con el entorno vacío.
3. **Aserción tautológica:** comparar `frame.url()` con un origen derivado del mismo frame no prueba nada. Cada sustitución de la Task 2 usa `origins.*`, y el revisor lo comprueba por archivo.
4. **Literales residuales** en helpers no-spec (`workspace-controls.mjs`, `artifacts.mjs`, `tests/quick/`). La prueba de la Task 4 escanea `tests/browser/*.mjs` y `tests/quick/*.mjs`, no solo `*.spec.mjs`.
5. **Puertos como texto dentro de la página** (`location.port !== '4175'` en `device-integration`): el puerto esperado se pasa como argumento de `page.evaluate` o `addInitScript`, en texto, y la Task 2 lo cubre.

---

### Task 1: helper de orígenes y servidores propios

**Files:**
- Create: `tests/browser/origins.mjs`
- Test: `tests/tools/browser-origins.test.mjs`

**Interfaces:**
- Produces:
  - `origins`: `{shellOrigin, runnerOrigin, simulatorOrigin, languageOrigin, scene3dOrigin, webappOrigin}` (strings), igual a `browserConfiguration(process.env).origins`.
  - `ports`: `{shell, runner, simulator, language, scene3d, webapp}` (numbers), de `browserConfiguration(process.env).ports`.
  - `auxiliaryServer(slot: 'offline'|'pilot'|'standalone', env = process.env) -> {env, origin, ports}`:
    - `env`: objeto con `GG_SHELL_PORT`, `GG_RUNNER_PORT`, `GG_SIMULATOR_PORT`, `GG_LANGUAGE_PORT`, `GG_SCENE3D_PORT` y `GG_WEBAPP_PORT` como strings.
    - `origin`: `'http://127.0.0.1:<shell>'`.
    - `ports`: números.
- Consumes: `browserConfiguration` de `tools/build/browser-policy.mjs`.

- [ ] **Step 1: Write the failing test** `tests/tools/browser-origins.test.mjs` con estos casos:
  - `ORIGINS-001`: con `{}` → `origins.runnerOrigin === 'http://127.0.0.1:4174'`, `scene3dOrigin === 'http://127.0.0.1:4181'`. Importa el módulo y pasa `env` a `auxiliaryServer`; para `origins`/`ports` exporta también `configuredOrigins(env)`.
  - `ORIGINS-002`: con base `5800` (y 5801–5803, 5808, 5809) → `runnerOrigin === 'http://127.0.0.1:5801'`.
  - `ORIGINS-003`: `auxiliaryServer('offline', {})` → `origin === 'http://127.0.0.1:4223'` y `env.GG_WEBAPP_PORT === '4232'`. `pilot` → shell 4233. `standalone` → shell 4243.
  - `ORIGINS-004`: con base 4500, los tres bloques y los seis puertos de la base son distintos entre sí y quedan en 4500–4599.
  - `ORIGINS-005`: un slot desconocido lanza un error.
- [ ] **Step 2:** `node --test tests/tools/browser-origins.test.mjs` → FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `configuredOrigins(env = process.env) -> {origins, ports}`, `origins`, `ports` y `auxiliaryServer(slot, env = process.env)` en `tests/browser/origins.mjs`, con los desplazamientos de Global Constraints.
- [ ] **Step 4:** `node --test tests/tools/browser-origins.test.mjs` → 5/5 PASS.
- [ ] **Step 5: Commit** «Helper de orígenes de prueba desde la configuración del servidor».

### Task 2: suites sin literales de puerto

**Files (Modify):**
- `tests/browser/isolation.spec.mjs`, `simulator.spec.mjs`, `accessibility-zoom.spec.mjs`, `project-persistence.spec.mjs`, `code-console.spec.mjs`, `audio-variables.spec.mjs`, `textual-corpus.spec.mjs`, `runner.spec.mjs`, `pxt-worker.spec.mjs`, `scene-inspector.spec.mjs`, `device-transfer.spec.mjs`, `device-integration.spec.mjs`, `language-runtime.spec.mjs`.
- `tests/quick/studio.spec.mjs`.

**Interfaces:**
- Consumes: `origins` y `ports` de la Task 1.

- [ ] **Step 1:** Run `grep -nE "41(7[3-9]|8[0-9])" <archivos>` y guarda la lista como línea base del cambio en el informe.
- [ ] **Step 2: Sustituir cada literal por su origen configurado**:
  - `'http://127.0.0.1:4174'` → `origins.runnerOrigin`.
  - `':4174/'` → `new URL(origins.runnerOrigin).host + '/'`.
  - `[4173, 4174, 4175, 4176]` → los cuatro orígenes o puertos correspondientes.
  - `location.port !== '4175'` → `String(ports.simulator)` pasado como argumento a la función de la página.
  - El `baseURL` de contextos nuevos → `origins.shellOrigin`.
  - Los `page.route('http://127.0.0.1:4174/**')` → `origins.runnerOrigin + '/**'`.
- [ ] **Step 3:** El mismo grep sobre esos archivos → sin coincidencias.
- [ ] **Step 4:** Corre esas 13 specs y el smoke (`--config=playwright.quick.config.mjs`) en la base 5800 → todos en verde. Reporte en `artifacts/test-ports/base-5800.json`.
- [ ] **Step 5:** Corre las mismas en la base por defecto (variables sin definir) → en verde. Así se confirma el comportamiento idéntico sin variables. Reporte en `artifacts/test-ports/base-4173.json`.
- [ ] **Step 6: Commit** «Suites sin puertos fijos: orígenes desde la configuración».

### Task 3: servidores propios derivados de la base

**Files (Modify):**
- `tests/browser/offline-recovery.spec.mjs` (slot `offline`).
- `tests/browser/pilot-2d-mode.spec.mjs` (slot `pilot`).
- `tests/browser/standalone-contexts.spec.mjs` (slot `standalone`): incluye todos los servidores que arranca. Si necesita más de un bloque de seis puertos, usa los puertos restantes del mismo bloque (+4…+7) y documéntalo en el comentario del archivo.

**Interfaces:**
- Consumes: `auxiliaryServer(slot)` de la Task 1.

- [ ] **Step 1:** Sustituye las constantes `ports`/`origin` fijas de las tres specs por `auxiliaryServer(slot)` y elimina los comentarios que fijan rangos viejos.
- [ ] **Step 2:** `grep -nE "4177|4188|4189|4231|4300" tests/browser/{offline-recovery,pilot-2d-mode,standalone-contexts}.spec.mjs` → sin coincidencias.
- [ ] **Step 3:** Corre las tres specs en la base 5800 y luego en la base por defecto → en verde. Reportes en `artifacts/test-ports/aux-5800.json` y `aux-4173.json`.
- [ ] **Step 4: Commit** «Servidores propios de las suites derivados de la base de puertos».

### Task 4: herramientas, particiones por defecto y prueba de no-colisión

**Files:**
- Modify: `tools/test/partitions.mjs` (`defaultPortSuites` a `[]` o a una lista con motivo por entrada).
- Modify: `tools/test/run.mjs` (la full usa `--partitions auto` si no se pasa `--partitions`).
- Modify: `tests/tools/test-partitions.test.mjs`. La prueba «suites naming default origins … pinned to partition 0» pasa a ser «specs y helpers de prueba sin literales de puerto»: escanea `tests/browser/*.mjs` y `tests/quick/*.mjs` buscando `127\.0\.0\.1:\d{4}`, `\[\s*41\d\d\s*,` y `location\.port\s*[!=]==\s*'\d`, y falla si encuentra alguno fuera de una lista explícita de excepciones con motivo.
- Modify: `tests/tools/test-impact.test.mjs` si sus expectativas dependen de `defaultPortSuites` o del modo serie por defecto.

**Interfaces:**
- Consumes: Tasks 1–3, sin literales.
- Produces: `buildCommands(createPlan('full'), {})` usa 2 particiones cuando `resolvePartitionCount('auto')` lo permite y serie en otro caso. `npm run test:full -- --partitions 1` fuerza la serie.

- [ ] **Step 1: Write the failing tests:**
  - El escaneo de literales de la nueva prueba, que debe fallar si se reintroduce `'http://127.0.0.1:4174'` en un archivo temporal de fixture. Usa un directorio temporal, no el árbol real.
  - `PARTITION-DEFAULT`: `parseArguments(['full']).partitions === 'auto'`.
- [ ] **Step 2:** `npm run test:tools` → falla por esas pruebas.
- [ ] **Step 3: Implement** los cambios en `partitions.mjs`, `run.mjs` y las pruebas de herramientas.
- [ ] **Step 4:** `npm run test:tools` → todo en verde.
- [ ] **Step 5: No-colisión.** Lanza **a la vez** dos corridas de `offline-recovery`, `pilot-2d-mode`, `standalone-contexts`, `isolation` y `runner`: una en la base por defecto y otra en la base 5800. Ambas deben quedar en verde, sin `EADDRINUSE`. Reportes en `artifacts/test-ports/concurrent-*.json`.
- [ ] **Step 6: Commit** «Particiones por defecto y prohibición de puertos fijos en pruebas».

### Task 5: política y flujo escritos

**Files (Modify):**
- `docs/engineering/TESTING.md`: sección «Criterio de hecho y full sugerida» con el criterio del usuario, la full sugerida por impacto, las particiones por defecto y la regla de no correr suites durante una full ni más de 2–3 corridas de navegador simultáneas.
- `AGENTS.md`: sustituye la línea de quick/affected/full por el criterio nuevo, en una línea, y enlaza TESTING.
- `docs/product/STABILIZATION-PLAN-2D.md`: la sección «Criterio de estable por etapa» pasa a pruebas nuevas + affected por tarea y full sugerida.
- `docs/engineering/NEXT-SESSION.md`: una línea de cabecera.

- [ ] **Step 1:** Redacta los cambios en español, en el registro de cada documento y sin repetir contenido entre ellos.
- [ ] **Step 2:** `npm run spec:validate` → válido.
- [ ] **Step 3: Commit** «Criterio de hecho: pruebas nuevas + affected; full sugerida por impacto».
