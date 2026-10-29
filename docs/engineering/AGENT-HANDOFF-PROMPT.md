# Prompt de continuación de Code Studio

Preparado el 29/10/2026, Guatemala. Copia el encargo siguiente a un agente con acceso al **workspace actual y sus cambios sin commit**. Un clon que solo tenga HEAD no contiene todo el corte 2D. Este archivo prepara la delegación; no inicia otra sesión ni implementa por sí mismo.

---

Retoma GuateGeeks Code Studio sobre el estado existente. Continúa **`synced-code-views`**, empezando por **4.2 micro:bit**. Implementa, verifica y documenta ese corte antes de avanzar a 4.3 3D/web, 5.1 actividad y 5.2/5.3 consolidación. No rehagas el rework visual ni empieces las demás propuestas del roadmap. Progresa con el alcance definido y entrega resultados verificables. Ante un bloqueo real, conserva los avances e identifica exactamente qué falta.

## 1. Workspace y protección del trabajo

- WSL Ubuntu: `/home/adawolfs/projects/makecode/guategeeks-code-studio`.
- Windows: `\\wsl.localhost\Ubuntu\home\adawolfs\projects\makecode\guategeeks-code-studio`.
- Repositorios hermanos/herramientas: `/home/adawolfs/projects/makecode`.
- Último HEAD inspeccionado: `main`, `c1b890157f441c2b998c164ea8ac627f1be331c1`. Sincronización 2D está **sin commit**, con fuentes/pruebas nuevas y modificadas. No reset, clean, restauración destructiva ni stash que oculte el trabajo heredado.
- Empieza con `git status --short`, `git log -5 --oneline` y diff. Captura inventario inicial para distinguir tus cambios. Si hay avances posteriores, reconcílialos antes de actuar. Si faltan las fuentes nuevas, comprueba si es un clon incompleto; no reconstruyas a ciegas trabajo ya realizado.

## 2. Lecturas y skills

Lee en este orden:

1. `AGENTS.md`, `README.md`, `docs/product/CURRENT-STATUS.md`, cabecera de `docs/engineering/NEXT-SESSION.md`.
2. `docs/phase-0/RESULTS.md`, `docs/phase-0/PHASE-1-ENTRY.md`, `docs/phase-1/RESULTS.md` y formato GGPROJ como antecedentes; usa código/specs actuales para v4/v5.
3. `openspec/changes/synced-code-views/proposal.md`, `design.md`, `tasks.md`, `specs/code-views/spec.md`.
4. `docs/adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md`, `docs/engineering/SYNCED-CODE-VIEWS-2D-RESULTS.md`, `SYNCED-CODE-VIEWS-VIABILITY.md`, `SYNCED-CODE-VIEWS-STRUCTURAL-DIFF.md` (los dos últimos en el mismo directorio engineering).
5. `docs/engineering/BLOCK-LANGUAGE-CONTRACT-RESULTS.md`, `docs/engineering/PROJECT-CONTINUITY-RESULTS.md`, `docs/engineering/TESTING.md`, `PRODUCT.md`, `DESIGN.md`.
6. `docs/product/INTEGRATED-MICROBIT-RESULTS.md`, contratos y pruebas indicados abajo. Para 3D/web, leer sus contratos y actas antes de extender.
7. `docs/product/FEATURE-MATURATION-PLAN.md` como futuro propuesto, no autorización para ejecutarlo entero. Sus diagnósticos del 24/10 no sustituyen actas posteriores.

Lee y usa las skills del proyecto:

- `.agents/skills/openspec-apply-change/SKILL.md`: continuar el cambio existente; `openspec-update-change` para ajustes necesarios de sus artefactos.
- `.agents/skills/gg-browser-first/SKILL.md`: ejecución, persistencia y offline.
- `.agents/skills/gg-design-system/SKILL.md` y `.agents/skills/gg-ui-verification/SKILL.md`: cambios de interfaz.
- `.agents/skills/gg-learning-experience/SKILL.md`: actividad educativa.

Las reglas históricas sobre copias independientes siguen aplicándose a esas copias; **ADR-011 autoriza además vistas sincronizadas explícitas**. No interpretar una nota antigua como prohibición de la decisión posterior. No instalar catálogos ni actualizar dependencias implícitamente.

## 3. Producto y estado

Alpha educativa para primaria alta (10–12 años), con docente. Seis contextos: 2D, texto, micro:bit, Scratch importado, 3D y web. Rework visual implementado/verificado. Recorrido 2D y continuidad local/portable estabilizados. Packs/versiones y API3 implementados. Aceptación escolar, física y con lector humano pendientes.

En 2D ya funcionan vistas Bloques/JavaScript/Python del mismo programa, rechazo recuperable, Deshacer, GGPROJ v5 y plantillas nuevas API3. Copias API1/API2 anteriores preservadas. `synced-code-views` tiene **8/13 tareas completas**; faltan 4.2, 4.3, 5.1, 5.2 y 5.3. No marcar tareas por escribir documentación o aprobar una selección parcial.

El usuario confirmó el subconjunto instalado: en 2D rechazar `while`, `forever` y funciones propias sin bloque con causa/línea. No ampliar IR0/runtimes para aceptarlos. Esto no elimina el `forever` propio de micro:bit.

## 4. Primer corte: micro:bit

Consulta CodeGraph antes de modificar fronteras. Reutiliza arquitectura; no asumas que el parser 2D/IR0 entiende Static TypeScript ni IR1.

Puntos de entrada existentes:

- Dispositivo: `src/contracts/device-program.mjs`, `src/contracts/device-runtime.mjs`, `src/editor/device-editor.mjs`, `src/studio/device-ui.mjs`.
- Pack/compilador: `src/packs/gg.microbit/manifest.mjs`, `src/packs/gg.microbit/blocks.mjs`, `src/targets/microbit/compiler-worker.js`.
- Estado/identidad: `src/code-views-state.mjs`, `src/code-view-identity.mjs`, `src/contracts/code-view-conversion.mjs`, `src/editor/code-view-conversion.mjs`.
- Canal/UI: `src/studio/code-views-ui.mjs`, `src/studio/code-view-service.mjs`, `src/studio/contextual-workspace.mjs`, `src/studio/shell.js`.
- Referencia 2D: `src/targets/text/code-view-host.mjs`, `code-view-worker.mjs`, `code-view-parser.mjs`, `code-view-python.mjs` (todos en `src/targets/text/`).
- Pruebas: `tests/browser/code-views.spec.mjs`, `code-view-conversion.spec.mjs`, `device-integration.spec.mjs`, `integrated-microbit-workspace.spec.mjs`, `device-transfer.spec.mjs` (todas en `tests/browser/`).

Primero demuestra bloques → Static TypeScript → bloques sobre las plantillas instaladas: mismo programa, **todos** los IDs, layout y **HEX idéntico sin editar**. Registrar variante/entorno y comparar el artefacto real; compilar sin error no basta. Conservar intentos separados. Si falla equivalencia, corregir antes de habilitar UI.

Después habilita edición/retorno dentro del subconjunto, aplicación validada y atómica, errores con línea, rechazo sin pérdida, Deshacer y persistencia. Preserva TypeScript independiente, simulación conjunta y acciones explícitas de compilar/descargar/USB. Prueba cambio de proyecto y respuestas asíncronas obsoletas, sin autorun ni reinicio al consultar vistas. No añadir Static Python, sensores/radio ni vocabulario ajeno al corte.

## 5. Continuación del cambio

- **4.3:** 3D/web sobre contratos IR1. Diseño: rechazo por defecto fuera del subconjunto; registrar la decisión sobre bloques grises antes de incorporarlos, sin ampliar alcance por inferencia.
- **5.1:** revisión 2 de «De bloques a tu propio código»: editar y volver; conservar revisión 1/progreso. Los checks acreditan programa, no comprensión.
- **5.2/5.3:** E2E por contexto, full y documentación. No declarar ADR-011 implementado globalmente con contextos o evidencia pendientes.

## 6. Invariantes

- Seis orígenes: shell, runner 2D, simulador micro:bit, lenguajes, 3D, web. Solo adaptadores conocen internals. Shell no evalúa texto del estudiante.
- Abrir, recuperar, copiar o cambiar vista/contexto no ejecuta. Un Detener conserva el trabajo e invalida/cancela lo correspondiente.
- Validar candidatos antes de sustituir autoría; autenticar origen, fuente, sesión, revisión y generación de proyecto. Una respuesta antigua no se aplica a otro proyecto aunque su contenido sea idéntico.
- Conservar IDs, shadows, comentarios, posiciones y orden admitidos. El mapa de identidad no proporciona valores antiguos para reconstruir código nuevo.
- Lectores GGPROJ v1–v4 y v5, copias API1/API2, recursos/migraciones intactos. Runtime no es autoría.
- Guardado confirmado requiere transacción. Solicitud de descarga no implica escritura física ni entrega académica. Fallo de almacenamiento conserva borrador/Deshacer en memoria y salida portable, sin afirmar guardado.
- Sin cuenta, red obligatoria, telemetría, extensiones remotas ni Sócrates dentro del encargo.
- No modificar/limpiar upstreams para aprobar pruebas ni reemplazar motores reales pertinentes por mocks que eviten el comportamiento.

## 7. Operación y verificación

Trabaja en WSL con el Node fijado:

```bash
cd /home/adawolfs/projects/makecode/guategeeks-code-studio
source ../scripts/env.sh
unset -f node npm npx
node --version
git status --short
npm run openspec -- status --change synced-code-views --json
```

Verifica carga/procesos antes de E2E; el registro operativo pide media de cinco minutos menor de 6 para full. No detener servicios ajenos ni usar puertos ocupados sin identificar propietario. Emulador 4500 y previews pueden seguir en uso: comprobar estado real. No alterar configuración para ocultar conflictos/fallos.

Sigue TESTING: prueba focal → quick durante edición → affected de **todos los archivos cambiados** → full para consolidar. Ejemplos que debes adaptar:

```bash
npm run spec:validate
npm run test:quick
npm run test:affected -- --files src/studio/device-ui.mjs src/editor/device-editor.mjs --list
npm run test:affected -- --files src/studio/device-ui.mjs src/editor/device-editor.mjs
npm run test:full
```

La selección del ejemplo no basta si cambias otros archivos. Si el plan conservador exige full, no sustituirlo por una selección explícita reducida. Build incremental, `--force` solo con motivo. No suites simultáneas sobre los mismos puertos. Congelar archivos durante full. Preservar reportes por corte antes de sobrescribir los genéricos. Tras una full aprobada, repetir solo con cambios o inquietudes concretas.

Evidencia heredada:

- Full conjunta anterior: 435 Node, 74 herramientas, 217 navegador (3 smoke + 214 regresiones), baseline avanzada. Incluyó trabajo experimental; no acredita el corte posterior.
- Sincronización 2D: 469 Node, 76 herramientas, 85 E2E afectados, specs 35/35, exitCode 0, baselineWritten false. **Full global pendiente**.
- Acta: `docs/engineering/SYNCED-CODE-VIEWS-2D-RESULTS.md`. Artefactos: `artifacts/synced-code-views/views-20261026/affected-1/`.

No atribuir cifras antiguas a ejecuciones nuevas. Separar Node, navegador, offline frío, visual y hardware físico. Si no hay placa, declarar pendiente física; simulación no la acredita.

## 8. Entrega

1. Implementación y pruebas del corte, OpenSpec actualizado con evidencia.
2. Acta con comandos, resultados, fuentes/corte, fallos corregidos y pendientes. Actualizar `docs/product/CURRENT-STATUS.md`, README/NEXT-SESSION y PRODUCT/ADR/guía cuando corresponda.
3. Preview del código entregado, verificada y abierta si el entorno lo permite; URL exacta. La release 4583/cohorte `35054db5…` es histórica, anterior al rework y a las vistas actuales. No asumir que una URL antigua muestra el checkout.
4. Resumen de funciones, pruebas y pendientes. No declarar cierre total con pruebas parciales.

No hacer push, despliegue público ni archivar un cambio incompleto. Este relevo no incluye autorización nueva para commit/publicación. Mantén decisiones del usuario y progresa sin confirmaciones rutinarias para tareas definidas. Si una decisión altera alcance, prepara evidencia y pide solo la aclaración necesaria.
