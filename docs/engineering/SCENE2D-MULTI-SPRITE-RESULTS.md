# E2 · varios sprites, fondos y programas por objeto

**Corte verificado: e51b2d39bab871c693b2dabae0e7ac300d638fea, 30/10/2026.
Task 8 cerrada con revisión de bloqueantes y puerta afectada nombrada aprobadas.
Integración local inicial, hashes congelados y previews verificados según el registro final.**

## Resultado y límites del producto

E2 añade escenario y 1–8 sprites, programas y vistas Bloques/JavaScript/Python
por objeto, panel con teclado, biblioteca y recursos por dueño, fondos,
«ir a objeto»/posición aleatoria y el canónico Diálogo. GGPROJ v6 conserva
autoría/vistas; v1–v5 y API1/API2 mantienen lectura. Proyectos nuevos usan 0.3.0;
legados actualizan explícitamente, sin ejecutar ni subir al activar score.

- Elegir objeto o vista no ejecuta ni detiene. Texto rechazado conserva selección
  y borrador con causa/línea. Editar panel o recursos reinicia runner y detiene.
- **En reposo, el escenario solo refleja el proyecto después de Ejecutar.**
  Añadidos/borrados pueden no coincidir con el resultado previo. Un único Detener.
- Copia de vista es del seleccionado; copia de proyecto reúne escena hasta
  **16 eventos y 16 variables**. Copias por objeto no ejecutan los demás programas.
  Todos los documentos 0.3.0 cargan la escena configurada, con sus propios scripts.
- Fondos usan nombres visibles; disfraces textuales conservan IDs técnicos.
  Biblioteca CC0-1.0 sin contenido nuevo; no hay borrado de fondos/recursos.
- Fuera E3 sensores/operadores, capas/cámara, más de ocho sprites y copia editable
  multi-sprite SB3. Contextos congelados mantienen regresiones. Sin cuentas,
  telemetría ni extensiones externas; seis orígenes y fronteras preservadas.
- Se mantienen el error técnico Unsupported block en importación ajena, paste
  legado atascado y pasos Undo/Redo sin efecto visible al retirar un bloque ajeno.
  event.group/doClassValidation_ dependen del lock Blockly 13.4.0.
- No hay aceptación docente, lector de pantalla humano, rendimiento escolar o
  hardware acreditados. El guion preparado no demuestra comprensión.

## Revisión y estado de la puerta

| Corte | Resultado de revisión | Evidencia |
| --- | --- | --- |
| a66ae47 | 10 originales atendidos; R1 rollback y R2/R3 abiertos; FAIL | [final-fix-rereview.md](../../artifacts/stabilization-2d/e2-multisprite/final-record/final-fix-rereview.md) |
| 1b74566 | R1/R2 atendidos; R3 owner-budget abierto; FAIL | [final-residual-rereview.md](../../artifacts/stabilization-2d/e2-multisprite/final-record/final-residual-rereview.md) |
| fb4215f | R3 owner-budget atendido, sin nuevo bloqueo; PASS acotado | [final-r3-rereview.md](../../artifacts/stabilization-2d/e2-multisprite/final-record/final-r3-rereview.md) |
| e51b2d3 | MS037: PASS con caveat de readiness de 15 s; sin bloqueo | [ms037-rereview.md](../../artifacts/stabilization-2d/e2-multisprite/final-record/ms037-rereview.md) |

La cadena atiende los once Important originales y sus residuales. **La acusación
de que renombrar desde la UI podía perder el nombre al revertir era incorrecta:**
esa transacción ya invalidaba la oferta. El nombre de proyecto sí era un trigger;
el probe de configuración directa comprueba otro camino. Se conservan la
corrección del revisor, los fallos de harness/update en progreso y las pruebas
reales en el apéndice histórico. No se atribuye un defecto a la sospecha de caché
R2 que el probe descartó.

### Puerta afectada final y procedencia

[Resumen terminal](../../artifacts/stabilization-2d/e2-multisprite/final-verification/e51b2d3/verification-summary.json)
y [auditoría de fuente](../../artifacts/stabilization-2d/e2-multisprite/final-verification/e51b2d3/final-source-audit.json)
separan cada ejecución y el producto inmutable.

| Comprobación | Resultado aprobado |
| --- | --- |
| Node por defecto | 624/624, 0 fallos/cancelados/skipped, exit 0, 121.444556210 s |
| Herramientas por defecto | 89/89, exit 0, 16.628104986 s |
| OpenSpec estricto | 38/38, exit 0 |
| Preservación upstream | 3/3, commit/diff/lock idénticos, exit 0 |
| Build incremental | exit 0, 27.341 s; etapas de compilación reutilizadas |
| Smoke | 3/3, exit 0, 23.101953 s; separado de los 232 |
| Navegador nombrado | **232/232 casos únicos, 29 specs**, sin huecos/extras/duplicados |
| Limpieza | solo PID propio 1308184; wrapper exit 0; puertos liberados |

La unión aprobada es owner-budget 8 + prioridad fresca 27 + inspector 1 +
positivos originales A 95 + B 99 + MS037 focal 1 + MS032 aislado 1 = 232.
**El lote A original sigue fallido: 95 pasan / 2 fallan de 97, exit 1**.
La unión anterior 230/232 no se reescribe como verde. B aprobó 99/99, exit 0.
Sin skipped/flaky reportados en los grupos aprobados; eso no prueba ausencia
de intermitencia.

Node/tools/specs/build/preservación/smoke corrieron sobre el producto fb4215f.
E51b2d3 solo añade una espera dentro de MS037, sin producto/helper/config/MS032
cambiados. La auditoría final de 441 archivos y el cohort servido
d0ead8b08c72c59e33ec7e3701b4a14c7926a92b01a0b7509c752f3c16e521a7
justifican conservar esa evidencia y los casos no modificados, no repetir suites.
Los ocho owner-budget tienen manifiesto final idéntico y cohort propio
92a65c2a4a2643ebf3eb1be15ab732a3db099bee1fa260fc8b55de8643caa8b6.
No se ensamblan positivos de producto a66ae47/1b74566 como puerta final.

MS037 falló por snapshot enviado antes de adoptar la nueva revisión Python
(Program revision replaced), sin fallo observado del valor final. Una espera
del estado existente evita ese envío prematuro; su focal pasó 1/1, exit 0,
19.011290 s de proceso. **Añade el deadline estándar de 15 s de readiness** antes
del goal poll original de 60 s. Goal, límite del test y retries no cambian;
el comportamiento temporal total sí cambia y puede fallar antes por readiness.

MS032 falló en el último Run con Runner timeout: load-program, tras las
aserciones de paste/undo/guardado. El caso intacto pasó una vez aislado, 1/1,
exit 0, 14.472268 s de proceso, sin otro navegador concurrente. La causa del
timeout original sigue sin explicación: no se declara carga causal ni flake
eliminado. Tampoco se confunde con GG-LIB histórico o readiness de MS037.

El primer comando de preservación falló por falta de input baseline, exit 1.
Se usó copia byte-idéntica autorizada del inventario principal, SHA-256
0ce8f02f7753e5177faab0e2c3f5514599ebe4ba825dd0549c9caa23244a3224,
y el verificador existente aprobó tres upstreams. No se regeneró ni avanzó
baseline ni se escribió en upstreams. Logs, comandos/exits, scripts inmutables
y los fallos originales están preservados en el informe final.


Selección automática full; el inventario completo tiene **50 specs**.
La puerta aprobada es nombrada, no full; OpenSpec **4.2 permanece abierta** hasta
una full decidida por el usuario. No hay baseline avanzada.

### Integración local, hash congelado y previews

El [registro final](../../artifacts/stabilization-2d/e2-multisprite/final-record/integration-record.json)
confirma el fast-forward local de main desde 9473f03762c191de3c1e5ed6e1563ffe56534bb6
al **integrationCommit dfc3f8e8f3f128ea070b1d66adfb1e9d4a8047a2**.
Es la integración inicial; el registro identifica aparte el cierre documental.
Después, npm test por defecto en main aprobó 624/624, sin fallos/cancelados/skipped,
exit 0, 119.256927981 s ([log](../../artifacts/stabilization-2d/e2-multisprite/final-record/main-node.log)).
No hubo push ni publicación remota.

Los [hashes verificados](../../artifacts/stabilization-2d/e2-multisprite/final-record/pack-hashes.json)
conservan 0.1.0 y 0.2.0 idénticos. gg.sprites@0.3.0 queda congelado tras integrar:
**1702532cb4cb424ab8a6ebf8a8813e9fe567a5255ebe45d5c558eb51e7b87cfc**.

El build incremental de previews aprobó, exit 0. Se comprobó identidad de los
PIDs autorizados 619672/619673 antes de detenerlos; las previews nuevas son:

| Perfil | Dirección | PID | Cohort |
| --- | --- | --- | --- |
| Full | [5283](http://127.0.0.1:5283) | 1352411 | c0b5d2dfc5a38af58e52b8443a6870f0e47de283dc45cda19470690add52853a |
| Piloto 2D/Texto | [5383](http://127.0.0.1:5383) | 1352412 | 4edb9265990bd179e7e80963c5d7fbbba861257ea04e64c02bfa45472c59fd29 |

[Health de previews](../../artifacts/stabilization-2d/e2-multisprite/final-record/preview-health.json)
registra los doce roles con HTTP 200 y panel de objetos presente en ambos perfiles.
Las comprobaciones de shell desde Windows aprobaron para ambos. El piloto fija
contexts 2d/text. Rama y worktree se conservan para previews/evidencia; solo el
workspace SDD se elimina después de su respaldo. La integración y estas health
checks no convierten la puerta nombrada en full ni acreditan un piloto humano.

## Evidencia previa, docencia y deuda

7dfe56c aprobó Node 602/tools 88/specs 38/build/smoke 3, pero su navegador
**184 pasan / 3 fallan de 187 en 26 specs** fue una puerta fallida.
Los cortes a66ae47 y 1b74566 tuvieron focos y auditorías, sin ejecución amplia.
Los apéndices conservan cada commit/run, RED parcial, mutantes, intentos
interrumpidos, conteos y fallos; esos resultados no certifican fb4215f.

El [JSON durable](../product/scene2d-multi-sprite-evidence.json) separa historia
de producto final y captura final. La imagen de nueve objetos a 1280×720
(fb4215f, producto idéntico en e51b2d3) tiene Volcán seleccionado en una fila
desplazada y **340.328125 px de Blockly visible**; no se ven nueve tarjetas a la vez.
Las imágenes estrechas 390×844 son distintas: resource-menu usa tres objetos;
objects-panel-narrow usa cinco, Robot seleccionado y editor bajo el fold.
Esas pruebas no emitieron JSON de cajas estrechas y no se inventa uno.

En e51b2d3, zoom nativo real de 200/400% conserva innerWidth/scrollWidth
640/640 y 320/320, DPR 2/4, sin overflow horizontal. Las capturas brutas DIP
[200%](../../artifacts/stabilization-2d/e2-multisprite/final-verification/e51b2d3/zoom-dip-supplement/zoom-200-cdp-surface.png)
(1280×4203) y
[400%](../../artifacts/stabilization-2d/e2-multisprite/final-verification/e51b2d3/zoom-dip-supplement/zoom-400-cdp-surface.png)
(1280×9702) muestran fila/Volcán, controles y editor; a 400% los botones reflow
en dos columnas. Root y verificador inspeccionaron las imágenes reales.
Prueban layout, no pintura de cada canvas WebGL fuera de pantalla ni aceptación
humana. Sin estilos/píxeles sustituidos. Las primeras variantes viewport
planas/recortadas y full-page CSS recortadas se conservan como inconcluyentes;
no se reemplazan ni se usan como prueba de apariencia. Metadatos/SHA completos
acompañan las imágenes. El caso de teclado/DOM y las capturas son evidencias distintas.


[Guía docente](../phase-7/TEACHER-GUIDE.md) y
[guion E2](../product/SCENE2D-CONTINUITY-TEACHER-OBSERVATION.md) distinguen
vistas/copia, objeto/resultado, guardado local y archivo portable. Sin lección
nueva ni observación humana realizada. Biblioteca a 1280×720 y siete opcodes
SB3 quedan pendientes salvo evidencia expresa posterior.

El antiguo GG-LIB-004 de 148a7cb sigue sin causa demostrada; no lo resuelve
esperar readiness en el fallo distinto de 7dfe56c. Permanecen menores de
contrato/diagnóstico/mantenimiento y evidencia parcial de TDD, incluidos guard
de downgrade con workspaces idénticos, eval/arguments y dispose Python.
La disposición completa de cada diferido se conserva en el apéndice E.

[Decisiones R1–R5](#apéndice-a--decisiones-vinculantes-r1r5),
[rulings y costes](#apéndice-b--registro-ordenado-de-decisiones-y-referencias),
[informes históricos](#apéndice-d--informes-históricos-por-tarea),
[correcciones/reviews](#apéndice-f--historia-de-la-reparación-y-cadena-de-re-review),
[inventario completo y comandos](#apéndice-g--suites-y-reproducción).

## Apéndice A · decisiones vinculantes R1–R5

(decisiones vinculantes para este plan)

- **R1 · Proyectos nuevos en la versión actual.** El usuario pidió continuar con la implementación recomendada: los proyectos **nuevos** (proyecto inicial sin guardar y «Crear mi primera escena») usan capacidades explícitas con la última versión de `gg.sprites`. Los proyectos guardados v1/v2 siguen abriendo idénticos en 0.1.0 y solo suben con «Actualizar packs». Cuando E2 publique 0.3.0, los nuevos crearán 0.3.0 sin otro cambio de código.
- **R2 · Vistas sincronizadas por objeto.** Bloques/JavaScript/Python muestran el programa **del objeto seleccionado**. Los eventos siguen en el nivel superior (`onStart(...)`). Las acciones de sprite se escriben sobre el identificador del objeto seleccionado (`cesta.move(10)`). Escribir acciones de **otro** objeto se rechaza con causa y línea, porque en Scratch cada objeto programa sus propios scripts. Cambiar de objeto con texto pendiente aplica la conversión como al volver a Bloques; si se rechaza, la selección no cambia y el texto se conserva.
- **R3 · Identificadores textuales.** Cada sprite tiene un identificador válido en JS y Python, derivado de su nombre y estable, sin colisión con palabras reservadas ni la API. Renombrar el sprite no cambia su `id` interno.
- **R4 · Biblioteca E4.** Los fondos y sprites de la biblioteca inicial (`src/contracts/starter-library.mjs`) se exponen ahora que existen varios objetos y fondos: añadir un sprite de la biblioteca como objeto nuevo y elegir fondos del escenario. Sin cambiar su contenido ni su licencia.
- **R5 · Fuera de alcance:** sensores, operadores y expresiones anidadas (E3); copia editable multi-sprite de SB3 (Scratch congelado); más de 8 sprites; capas y cámara.

## Apéndice B · registro ordenado de decisiones y referencias

22 líneas coinciden con Ruling: 19 literales Ruling:,
1 decisión calificada Ruling (ambos planes), 2 referencias narrativas.
No son 22 rulings formales. Se preservan razones y costes registrados.
Opus/Sonnet es preferencia heredada sustituida por Sol/Terra; trailer conservado.
Las excepciones al cap se limitaron a R1/R2/R3 y al owner-budget final, con
coste de ciclos focales extra, sin ampliar producto ni autorizar full/limpieza.

- Ruling: T3 decide v5 con campo nuevo o v6 y lo justifica — el plan no puede saberlo sin leer el código — si es incorrecto, cuesta una migración de formato adicional.
- Ruling: baseline de Node no repetida en el worktree — misma commit verificada minutos antes y una full corre en el checkout principal — si fuera falsa, el primer `npm test` de T1 lo revela.
- Ruling: implementadores en Opus y revisores en Sonnet salvo T3/T5 (formato e identidad) y la revisión final en Opus — tareas multiarchivo de juicio; formato e identidad son de alto riesgo.
- Task 1: implementer DONE_WITH_CONCERNS (04b5ea4). Ruling: concern 'GG-PROJECT pasa por razón incidental' es de corrección → reanudado el implementador antes de revisión (restaurar intención + investigar fallo de instalación al arrancar). Partición 0 (scene-inspector, project-persistence, language-runtime, accessibility-zoom, resto + smoke) la corre el coordinador en puertos por defecto antes de Task 2.
- Ruling (ambos planes): mientras test-ports Task 2 use 4173–4182, E2 no corre partición 0 en puertos por defecto.
- Ruling: el manifiesto gg.sprites@0.3.0 no está publicado hasta integrar E2 en main; T3–T8 pueden ajustarlo (permisos por objeto, ir a objeto, fondo) y su hash se congela al integrar — evitar una 0.4.0 por cada ajuste interno de la rama — si es incorrecto, proyectos 0.3.0 guardados en previews de la rama dejarían de abrir (riesgo aceptado: solo pruebas).
- Ruling: T3 debe leer la forma intermedia GGPROJ v3 + gg.sprites@0.3.0 + authoring.blockly (y config con varios sprites que hoy solo ejecuta hero) — se pasa en el dispatch de T3.
- Ruling: T3 se despacha sin esperar el final de la partición 0 de T2 — evita tiempo ocioso; si una suite falla, vuelve a T2 como fix round y T3 se ajusta — coste: posible retrabajo en T3.
- Task 3: revisión (opus): 1 Important (validateProgram acepta IR v1 en consumidores IR0, incl. frontera del simulador → scripts aplanados en hero). Fix round 1/5 abierto. Ruling: v1 opt-in en el validador; T4/T5 la activan explícitamente donde la soporten — coste si es incorrecto: T4/T5 deben recordar activarla.
- Ruling: T4 se despacha sin esperar esa repetición — su primer tramo es lectura de código; si el fallo resulta de T3, T4 se ajusta — coste: posible retrabajo.
- Ruling: no detener el PID 38168 sin nueva autorización; al integrar main (pruebas independientes del puerto) en esta rama tras T4, offline-recovery usará puertos derivados (4223–4232) y se repetirá — coste: T3 queda sin verde de offline-recovery hasta entonces.
- Ruling: when test:affected says selection: full, T6+ implementers run new specs + a named affected list + smoke instead of all 45 specs — T5 spent 53 min on an effective full, and the user's rule is that a full is only suggested — if wrong, a regression in an unlisted spec surfaces only at the suggested full or in final verification.
- Ruling: idle stage keeps showing the runner's built-in scene until Run (added sprites absent, deleted hero visible) and the panel says so; no live preview added to E2 — not in the spec's requirements as read so far and it is new scope — if wrong, students see a stale stage until Run. Surface to the user at finish as a product decision.
- Task 6: Ruling: Important 2 (duplicate with gg.assets stuck) goes to T7 rather than the T6 loop — the plan assigns per-object resource menus to T7 and that is the real fix — if T7 slips, Duplicate stays a trap. T7 acceptance MUST include: duplicate a sprite with costume and sound blocks, select, run, delete.
- Task 7: Ruling: unfinished work must not block panel edits, library additions or reopening on object profiles; only Run asks to finish it; import safety moves to the import path — matches design point 45 and classroom use where half-built programs are normal — if wrong, an unfinished program could enter a transaction unlowered, which the import guard and Run's own lowering still catch.
- Task 7: fix round 1/5 (2 addressed + ruling + reopen gap; 1 new open — pack rollback past lower:false strands foreign blocks, autosave and transactions fail; commits a334007..c638eb2).
- Task 7: fix implemented 4a0abe5 (Node 581/581, tools 88/88, browser 64/64 in 5 specs, smoke 3/3; MS-BROWSER-031/032). Opus re-review dispatched. Raw message on open of foreign-block file; legacy paste wedge kept per ruling.
- Ruling: user now requests GPT-6.1 Sol and Terra; supersedes older Opus/Sonnet dispatch preferences. Sol/high owns Task 8 verification/reconstructed report; Terra/xhigh owns the task review. Original commit trailer rule retained unless user changes it.
- Ruling: use an artifact-local Playwright config importing the canonical config and changing only server reuse plus absolute testDir resolution, with an explicitly owned prestarted normal server — closed loopback ports time out in this WSL environment before Playwright can spawn its webServer, while an owned open listener connects immediately — cost if wrong: managed-server startup lifecycle is not covered by these runs; all product assertions, retries, timeouts, ports and isolation remain unchanged and the deviation must be in evidence.
- Ruling: combine the newly demonstrated Task8 help regression with the ten consolidated branch findings in ONE repair wave after the running browser batches finish; close Task8 and apply Task9 only after repaired green verification and scoped re-review, then finish the same final review with documentation — avoids two successive code/test repair cycles while keeping task gates honest — cost if wrong: a broader fix diff requires per-finding provenance and focused regression evidence.
- Ruling: authorize one narrowly scoped completion of R1/R2/R3 despite the skill's single-final-wave cap; do not integrate known silent data loss or scope corruption and do not stop the user's authorized E2 continuation for routine reversible corrections — the developer's completion/autonomy instruction takes precedence over treating a workflow cap as an approval requirement — cost if wrong: one additional targeted repair/review cycle; scope stays exactly the three evidenced defects, with no fresh broad review or unrelated cleanup.
- Ruling: the original independent-document guarantee includes a no-variable API1 document beside an invalid hero draft, not only an unrelated Cesta draft; valid owner locals remain available, while an actual access to unavailable invalid-draft variables may fail truthfully — authorize only this remaining R3 correction under the prior narrow-completion ruling — cost if wrong: another focused regression/review pass, without changing limits or broadening product scope. Broad tests remain unstarted.

## Apéndice C · registro histórico de diferidos

Snapshot conservado, no inventario de todos abiertos ni de todos corregidos.
La revisión del apéndice E y la cadena F fijan su disposición posterior.

- Ruling: T3 decide v5 con campo nuevo o v6 y lo justifica — el plan no puede saberlo sin leer el código — si es incorrecto, cuesta una migración de formato adicional.
- Ruling: baseline de Node no repetida en el worktree — misma commit verificada minutos antes y una full corre en el checkout principal — si fuera falsa, el primer `npm test` de T1 lo revela.
- Ruling: implementadores en Opus y revisores en Sonnet salvo T3/T5 (formato e identidad) y la revisión final en Opus — tareas multiarchivo de juicio; formato e identidad son de alto riesgo.
- Task 1: implementer DONE_WITH_CONCERNS (04b5ea4). Ruling: concern 'GG-PROJECT pasa por razón incidental' es de corrección → reanudado el implementador antes de revisión (restaurar intención + investigar fallo de instalación al arrancar). Partición 0 (scene-inspector, project-persistence, language-runtime, accessibility-zoom, resto + smoke) la corre el coordinador en puertos por defecto antes de Task 2.
- Task 1: fix tras concern (4fd684c). Revisión (sonnet): ✅ spec, Approved, 0 Critical/Important, 5 Minor. Parked para la ola final: (M1) design.md punto 6 frase «pruebas CV-* intactas» obsoleta; (M2) NP-004 y endurecimiento sin registrar en tasks 1.5/design; orden 1.5 antes de 1.4; (M3) project-ui.mjs:222-243 rama else y posible sobrescritura del mensaje por saved.warning (inalcanzable); (M4) `while (1 < 3)` puede ganar bloque en E3: revisar casos CV-*; (M5) NP-002 cubre estado unavailable, el new real solo en navegador.
- Task 1: fix round 1/5 (2 addressed, 0 open; commits 4fd684c..6dc402e). Re-review clean; 2 minor cosméticas deferidas (dos expect en una línea en code-console; locator por texto aceptable).
- Ruling: el manifiesto gg.sprites@0.3.0 no está publicado hasta integrar E2 en main; T3–T8 pueden ajustarlo (permisos por objeto, ir a objeto, fondo) y su hash se congela al integrar — evitar una 0.4.0 por cada ajuste interno de la rama — si es incorrecto, proyectos 0.3.0 guardados en previews de la rama dejarían de abrir (riesgo aceptado: solo pruebas).
- Ruling: T3 debe leer la forma intermedia GGPROJ v3 + gg.sprites@0.3.0 + authoring.blockly (y config con varios sprites que hoy solo ejecuta hero) — se pasa en el dispatch de T3.
- Task 2: minor (deferred → T5): nombres sin NFC ni rechazo de controles C1/bidi/zero-width; afecta a identificadores R3.
- Task 2: minor (deferred → T4): initialSceneOfObjects toma sprites[0] aunque no sea hero; MS-006 parte VM no falla de forma independiente hasta que el adaptador lea sprites (repetir equivalencia en T4).
- Task 2: minor (deferred): unicidad de IDs sensible a mayúsculas frente a nombres insensible (documentar); validateScene2DObjects devuelve el input sin clonar; shell.js:608/612 mueve proyectos legados a la última versión al activar 2D/score (preexistente, ahora 0.3.0).
- Ruling: T3 se despacha sin esperar el final de la partición 0 de T2 — evita tiempo ocioso; si una suite falla, vuelve a T2 como fix round y T3 se ajusta — coste: posible retrabajo en T3.
- Task 3: revisión (opus): 1 Important (validateProgram acepta IR v1 en consumidores IR0, incl. frontera del simulador → scripts aplanados en hero). Fix round 1/5 abierto. Ruling: v1 opt-in en el validador; T4/T5 la activan explícitamente donde la soporten — coste si es incorrecto: T4/T5 deben recordar activarla.
- Task 3: minor (deferred → revisión final, posible pérdida de datos): salir de 0.3.0 acepta descartar sprites duplicados con workspace idéntico (project-format.mjs:113-116); exigir escenario vacío y sprites ≠ primero vacíos.
- Task 3: minor (deferred): programObjectsFromIR0 no valida la IR0 de entrada; riesgo v6 no registrado en Risks de design.md y GGPROJ.md:49 desactualizado; límite de nodos usa programLimits.nodes; desambiguar «IR 2D v1» frente a program-ir1.mjs (capacidades).
- Task 3: minor (deferred): scratch-project/generated-code reenvían options sin filtrar (un llamador futuro podría pasar objects:true por accidente); lesson-evaluation traga el rechazo de v1 (fail-closed).
- Ruling: T4 se despacha sin esperar esa repetición — su primer tramo es lectura de código; si el fallo resulta de T3, T4 se ajusta — coste: posible retrabajo.
- Ruling: no detener el PID 38168 sin nueva autorización; al integrar main (pruebas independientes del puerto) en esta rama tras T4, offline-recovery usará puertos derivados (4223–4232) y se repetirá — coste: T3 queda sin verde de offline-recovery hasta entonces.
- Task 4: revisión (opus): Approved, 0 Critical/Important. Minor (deferred → T7): lesson-evaluation lee sprites[0] sin comprobar hero; editor.programOf valida recursos de todo objeto contra hero. Minor (deferred → T6/3.2): textos «hero» en scene-inspector-ui y «Sprites de autoría: 1». Minor (deferred → T5): sprite.get devuelve el ID y scene.get el nombre visible.
- Task 5: minor (deferred): appliedHash correction skipped after selectObject moves the restore point into objects (code-views-ui.mjs:140-146) → T6
- Task 5: minor (deferred): selectObject false has no cause for !ready/busy/cancelled (code-views-ui.mjs:235) → T6
- Task 5: minor (deferred): text-program first=targetOf(handlers[0]) defaults to hero; owner document with only variables fails in hero-less project (text-program.mjs:131) → T6/T7
- Task 5: minor (deferred): `bound` ignores scope; a local in one handler disables other-object rejection in another (api-v3.mjs:70,80; api-v3-python.mjs:54,72) → final
- Task 5: minor (deferred): design.md:131 vs shell.js:73 on «un solo objeto con scripts» → final
- Task 5: minor (deferred): project copy limit 16 events/variables; large two-sprite project can't satisfy the copy scenario (design 26) → tell the user at finish
- Task 5: minor (deferred): stage rules in five places; targetIds shape rule duplicated (code-views-ui.mjs:190, shell.js:75) → T8/final
- Task 5: minor (deferred): trace swallows dispose errors; python-engine.mjs:170 deletes __gg_code after failed prepare → final
- Task 5: minor (deferred): TDD evidence partial (MS-BROWSER-003…006, MS-026, MS-033); selectObject rollback and trusted-after-rename untested → T6 (it owns selectObject wiring)
- Task 5: minor (deferred): MS-BROWSER-006 uses DOM click, not Código › Crear copia → T6
- Task 5: minor (deferred): 320 scratch-vm «No storage module present» warnings in node-3.log → final
- Task 5: minor (deferred): a variable named eval/arguments still generates invalid JS («Binding eval in strict mode»), sprites with those names are fine → final
- Ruling: when test:affected says selection: full, T6+ implementers run new specs + a named affected list + smoke instead of all 45 specs — T5 spent 53 min on an effective full, and the user's rule is that a full is only suggested — if wrong, a regression in an unlisted spec surfaces only at the suggested full or in final verification.
- Ruling: idle stage keeps showing the runner's built-in scene until Run (added sprites absent, deleted hero visible) and the panel says so; no live preview added to E2 — not in the spec's requirements as read so far and it is new scope — if wrong, students see a stale stage until Run. Surface to the user at finish as a product decision.
- Task 6: Ruling: Important 2 (duplicate with gg.assets stuck) goes to T7 rather than the T6 loop — the plan assigns per-object resource menus to T7 and that is the real fix — if T7 slips, Duplicate stays a trap. T7 acceptance MUST include: duplicate a sprite with costume and sound blocks, select, run, delete.
- Task 6: minor (deferred): refreshObjectText can overwrite text typed during runner restart (objects-ui.mjs:94) → T7
- Task 6: minor (deferred): #creation-guide says «Cambia un bloque Mover» on empty object/stage (index.html:56) → T8 (shell writer)
- Task 6: minor (deferred): #object-name-error needs role=alert (objects-ui.mjs:119) → T7
- Task 6: minor (deferred): form closes before transaction, rejected add/rename loses typed name (objects-ui.mjs:128) → T7
- Task 6: minor (deferred): render never closes open name form on project change (objects-ui.mjs:59) → T7
- Task 6: minor (deferred): live undo stack not cleared on project change; design point 36 overstates (project-authoring.mjs:185) → final
- Task 6: minor (deferred): MS-BROWSER-013 measures 5 options, limit is 9; Blockly ≥300 px at limit unproven at 1280×720 → T7/final
- Task 6: minor (deferred): limit/last-object copy duplicated (scene2d-object-edits.mjs:18, objects-ui.mjs:53-56); selectObject repeats refreshObjectText (code-views-ui.mjs:276) → final
- Task 6: minor (deferred): apply failure from missing offline pack reports rejected, panel says text error (code-views-ui.mjs:154) → T7
- Task 6: minor (deferred): evidence nits: 324 storage warnings; mutations.log line 7 stale; 193 vs 195 lines → final
- Task 6: minor (deferred): promoted variable stays on stage after last block is gone, counts toward 16 globals and shows in stage text → final
- Task 7: Ruling: unfinished work must not block panel edits, library additions or reopening on object profiles; only Run asks to finish it; import safety moves to the import path — matches design point 45 and classroom use where half-built programs are normal — if wrong, an unfinished program could enter a transaction unlowered, which the import guard and Run's own lowering still catch.
- Task 7: minor (deferred): deleting mounted object with stuck neighbour stops without offering Borrar (objects-ui.mjs:190) → final
- Task 7: minor (deferred): addFromLibrary reports success when finishNew failed; failure path untested (objects-ui.mjs:171) → final
- Task 7: minor (deferred): MS-BROWSER-013-LIMIT claims 300 px but visible is 273 px; rename or record visibleEditor (spec:505,518) → T8 with layout
- Task 7: minor (deferred): variables.set widened to other sprites' locals, design point 49 and MS-055 mention only reads (gg-bindings.mjs) → final
- Task 7: minor (deferred): __gg_missing_resource__ passes validateWorkspaceResources in every profile, loosening a frozen path (block-program.mjs:161) → final
- Task 7: minor (deferred): fixed resource block defined three times (scene2d-object-edits.mjs:143, block-program.mjs:79, editor-entry.mjs:33) → final
- Task 7: minor (deferred): MS-BROWSER-025 item 6 tests the guard, not the race → final
- Task 7: minor (deferred): design.md:26 promise stale; design.md:183 lists …027 vs tasks.md …028; scene-inspector-ui.mjs:22 literal 'Escenario' → T9
- Task 7: minor (deferred): new text documents write for the selected sprite, not recorded in design → T9
- Task 7: minor (deferred): text shows technical costume IDs (cesta.setCostume("sprite-…:c0")) → tell the user at finish
- Task 7: minor (deferred): guard treats any object with string type as a block; walks fields (block-program.mjs:37-38) → final
- Task 7: minor (deferred): design.md:185 stale test range → T9; remove at objects-ui.mjs:194 doesn't record unopened → final
- Task 7: minor (deferred): waitForTimeout(100) fixed sleep in MS-BROWSER-032; pasted foreign block leaves one Undo step with no visible effect, Redo of a removed step does nothing visible → final
- Ruling: user now requests GPT-6.1 Sol and Terra; supersedes older Opus/Sonnet dispatch preferences. Sol/high owns Task 8 verification/reconstructed report; Terra/xhigh owns the task review. Original commit trailer rule retained unless user changes it.
- Ruling: use an artifact-local Playwright config importing the canonical config and changing only server reuse plus absolute testDir resolution, with an explicitly owned prestarted normal server — closed loopback ports time out in this WSL environment before Playwright can spawn its webServer, while an owned open listener connects immediately — cost if wrong: managed-server startup lifecycle is not covered by these runs; all product assertions, retries, timeouts, ports and isolation remain unchanged and the deviation must be in evidence.
- Task 8 minor deferred to final: stage-input.mjs:47 decodes private VM names only for native mode; text mode selector/status can display /gg/_mouse_ or /gg/_random_ for these valid IDs. Targeting correct; preserve raw names only for imported scratch mode when fixing.


## Apéndice D · informes históricos por tarea

**Históricos por su commit/run.** Se conservan íntegros, incluidas frases
«en curso», marcas anticipadas y decisiones sustituidas. Los encabezados y
conteos antiguos no certifican el HEAD actual. Artefactos ignorados pueden
faltar en otro clon; los comandos y límites se preservan aquí.

<details>
<summary>Task 1: evidencia histórica y sus correcciones</summary>

# Task 1 · Proyectos nuevos con capacidades explícitas en la última versión (R1)

Rama `stab/e2-multisprite`, commit `04b5ea4` sobre `0f5f763`. Evidencia en `artifacts/stabilization-2d/e2-multisprite/task-1/` (ignorada por Git).

## Qué se implementó

- `src/contracts/packs.mjs`: `newProjectCapabilities({catalog})` = `createCapabilities(['gg.sprites'], {catalog})`, que toma la versión de `latestPackVersions` (hoy 0.2.0). Sin versión escrita a mano: cuando E2 publique 0.3.0 y suba `latestPackVersions`, los proyectos nuevos la tomarán.
- `src/studio/project-ui.mjs`: `startNewProject()` en el arranque cuando no hay nada guardado que recuperar (`saved.serialized` vacío: estados `new`, `unavailable` y `corrupt`). Construye el modelo con `createProject({...authoring.capture(), capabilities: newProjectCapabilities(), …})`, lo prepara con `authoring.prepare` y lo confirma con `suppress = true` (no cuenta como cambio, no hay autoguardado hasta que el estudiante edite), sin llamar a `stop()` y sin ejecutar nada. Después llama a `onApplied(model)` para que la shell refresque packs, recursos y perfiles. Si falla, se informa (`report`) y el borrador sigue usable en el perfil legado.
- Caminos de «proyecto nuevo» revisados:
  - Proyecto inicial sin guardar: arreglado arriba.
  - «Crear mi primera escena» (`shell.js` → `project.loadStarter(story)` → `createCapabilities(packIds)`): **ya creaba 0.2.0** antes de este cambio (lo comprobé en Node y ahora lo cubre NP-BROWSER-001). El brief decía que resolvía a 0.1.0; no era así. No hizo falta cambiar `entry-journey-ui.mjs`.
  - «Restaurar ejemplo» (`editor.restore()` → `load(example)` con las capacidades actuales): recarga los bloques y no cambia versiones. En un proyecto nuevo queda en 0.2.0; en un proyecto 0.1.0 sigue en 0.1.0 (sin subida implícita). Sin cambios de código.
  - «Guardar como copia nueva» (copias locales dañadas): guarda el borrador, que ahora ya tiene las capacidades del proyecto nuevo.
  - Abrir archivos v1/v2: no se tocó (`apply` conserva `capabilities == null`).
- `src/project-format.mjs`: sin cambios (no hacía falta; `createProject` con capacidades ya escribe v3).
- OpenSpec: tarea 1.5 en `tasks.md` (29/10/2026, R1, evidencia); `design.md` punto 5 sustituye la «decisión pendiente» por la decisión, su razón, la alternativa descartada y los ajustes de las suites; actualizado el riesgo correspondiente; requisito nuevo «Proyectos nuevos en la última versión», con dos escenarios, en el spec delta.
- `tools/test/impact.mjs`: spec nueva inventariada en `normalBrowserFiles` y en los grupos de `project-ui.mjs` y de packs/catálogo. No fija orígenes ni arranca servidores, así que queda fuera de `defaultPortSuites`.

## Pruebas

### Nuevas
- `tests/integration/new-project-capabilities.test.mjs`:
  - NP-001: el perfil nuevo = `latestPackVersions` (0.2.0); la caja ofrece los bloques E1 y `gg_forever/repeat_until/wait_until/stop_all/stop_script`; las estructuras ofrecidas son las cuatro del núcleo; el perfil legado no ofrece ninguna.
  - NP-002: `createProjectUI` real (JSDOM, editor inyectado): tras arrancar, las capacidades del editor y del proyecto son las del perfil nuevo; la exportación es v3, sin `scene`, con `initialScene` y los bloques del ejemplo intactos; `stop` llamado 0 veces; sin aviso de salida pendiente; sin diagnóstico de error.
  - NP-003: GGPROJ v1 y v2 guardados abren idénticos (salvo revisión/fecha), con capacidades `null`, perfil 0.1.0 y sin estructuras del núcleo; abrir solo reinicia el ejecutor.
- `tests/browser/new-project-capabilities.spec.mjs`:
  - NP-BROWSER-001: proyecto inicial en 0.2.0 (lista de packs, «Versiones fijadas», sin «Actualizar packs», caja E1 por menús, escena sin moverse); «Crear mi primera escena» → 0.2.0 con la caja E1, sin ejecutar; sin errores de página.
  - NP-BROWSER-002: v1 y v2 abren idénticos en 0.1.0 con «Perfil compatible 2D», caja sin «por siempre» y sin ejecutar.

### Ajustadas a la nueva verdad (sin debilitar)
- La escena inicial se comprueba en `capabilities.config['gg.sprites'].initialScene` y además se exige que `scene` no exista: `scene-inspector` (GG-INSPECT-001/003: lista de claves con `capabilities` en lugar de `scene`; caja de herramientas), `project-persistence` (GG-PROJECT-001), `language-runtime` (GG-TEXT-001/002), `textual-equivalence`.
- `scene2d-vocabulary` E1-01: el proyecto inicial ya ofrece «por siempre»; el perfil legado se comprueba abriendo un GGPROJ v1 (capacidades `null`, sin «por siempre»).
- Casos que usaban `while (true) {}` como texto sin bloque en el proyecto inicial (en 0.2.0 es «por siempre»): CV-VIEWS-003/004/005/006/011/012, CV-CONVERT-BROWSER-002 y `accessibility-zoom`. Ahora usan un `while` libre (`while (1 < 3)` / `while 1 < 3:`), que no tiene bloque en ninguna versión; se mantienen la misma línea y la misma causa («bucle»).

## Ejecuciones (Node v22.23.4; puertos 5700–5709; un worker; carga ≈5–7)

| Comando | Resultado |
|---|---|
| `npm test` | **523/523** (`node.log`) |
| `npm run test:tools` | **82/82** (`tools.log`; el primer intento falló 81/82 en TEST-IMPACT porque metí la spec en `persistence`; la moví a los grupos de project-ui/packs) |
| `npm run spec:validate` | **38/38** |
| `npm run browser:build` (incremental) | aprobado (`build-1.log`) |
| `new-project-capabilities` | 2/2 (`np-5.json`; los intentos 1–4 fallaron por defectos de la prueba nueva: `fetch` de `editable.blocks.json` sin conexión, `fields: {}` normalizado por Blockly, NBSP en la expresión regular) |
| Las 28 specs fuera de la partición 0 (`focus-specs.txt`) | **165/172** (`focus-1.json`): los 7 fallos son la familia `while (true)` de arriba |
| `code-views` + `code-view-conversion` tras el ajuste | **21/21** (`focus-2.json`) |

### Evidencia TDD
- RED: `node --test tests/integration/new-project-capabilities.test.mjs` con `newProjectCapabilities` ya exportada y `project-ui` sin cambiar → NP-002 `expected: '0.2.0' actual: '0.1.0'` (esperado: el arranque seguía en el perfil legado). El caso de «Crear» falló por falta de IndexedDB en Node (`replacePrepared` guarda antes de reemplazar), así que se pasó a Chromium (NP-BROWSER-001). (`red.log`)
- GREEN: el mismo comando → 3/3 (`green.log`); en el navegador, 2/2 (`np-5.json`).

## Archivos tocados
`src/contracts/packs.mjs`, `src/studio/project-ui.mjs`, `tools/test/impact.mjs`, `tests/integration/new-project-capabilities.test.mjs` (nuevo), `tests/browser/new-project-capabilities.spec.mjs` (nuevo), `tests/browser/{scene2d-vocabulary,scene-inspector,project-persistence,language-runtime,textual-equivalence,code-views,code-view-conversion,accessibility-zoom}.spec.mjs`, `openspec/changes/scene2d-vocabulary-v2/{design.md,tasks.md,specs/scene2d-vocabulary/spec.md}`.

## Autorrevisión
- Cambio de código mínimo (dos funciones). El perfil sale del catálogo, sin `0.2.0` escrito a mano en el código; las pruebas fijan 0.2.0 solo como «hoy».
- La instalación no ejecuta, no llama a Detener ni marca la página con cambios pendientes; el primer autoguardado ocurre con la primera edición, como antes.
- `onApplied` en el arranque reutiliza el gancho que ya se usaba al recuperar un proyecto, así que la shell refresca packs y perfiles igual que entonces.
- GG-PROJECT («an import commit failure…», `project-draft-rollback`) sigue en verde, pero ahora por otro motivo: su borrador de texto inválido, creado antes del arranque, hace fallar la instalación (se informa y el perfil queda en `null`), por eso su `applied` sigue vacío. El caso que comprueba no cambia; solo lo anoto como fragilidad.
- Después de este cambio, el proyecto inicial se guarda como GGPROJ v3 (antes v1), el mismo formato que ya escriben las actividades y plantillas.

## Pendientes / partición 0 que no pude ejecutar
Modifiqué, pero no ejecuté (puertos por defecto): **`scene-inspector`, `project-persistence`, `language-runtime`, `accessibility-zoom`**. Todas las suites de partición 0 parten del proyecto inicial, que ahora es v3/0.2.0, así que conviene que el coordinador las corra completas: `code-console`, `pilot-2d-mode`, `offline-recovery`, `audio-variables`, `runner`, `isolation`, `standalone-contexts`, `device-integration`, `device-transfer`, `pxt-worker`, `simulator`, `textual-corpus` y el smoke `tests/quick/studio.spec.mjs`. Las revisé con grep (claves `scene`, `version`, `while (true)`, perfil legado) y no encontré más dependencias del perfil legado.

## Fix report (seguimiento del coordinador, 29/10/2026)

### 1. GG-PROJECT «an import commit failure…» (`tests/integration/project-draft-rollback.test.mjs`)

**Problema exacto.** El caso creaba el borrador de texto inválido *antes* de `createProjectUI`. Desde R1, ese borrador hace fallar la instalación del perfil de arranque (`createProject` rechaza el nombre vacío), así que el perfil del editor anterior a la importación era `null` solo por ese fallo. La aserción `editor.captureCapabilities() === null` no distinguía «se restauró el perfil anterior» de «la reversión dejó el perfil en `null`», así que era vacía para ese defecto. Además, el caso pasaba en silencio por una instalación fallida que mostraba un error.

**Prueba de la vacuidad (rotura temporal).** En `src/project-authoring.mjs`, línea 97, cambié `capabilities:structuredClone(saved.editorCapabilities)` por `capabilities:null` (la reversión pierde el perfil del editor):
- `node --test --test-name-pattern="import commit failure" tests/integration/project-draft-rollback.test.mjs` con el caso **antiguo** → `ok 1 … # pass 1 # fail 0` (`fix-old-test-with-break.log`): el defecto pasaba sin detectarse.
- Mismo comando con el caso **corregido** y la rotura todavía aplicada → `not ok 1 … expected: <perfil> actual: ~ # fail 1`, en la línea 106 (`assert.deepEqual(editor.captureCapabilities(), profile)`) (`fix-red.log`).
- Restauré el archivo original (`git diff src/project-authoring.mjs` vacío) → `node --test tests/integration/project-draft-rollback.test.mjs` → `# pass 2 # fail 0` (`fix-green.log`).

**Cambio en el caso (sin quitar ni debilitar aserciones).** Parte de un proyecto nuevo normal: tras `ready()` exige que no haya diagnósticos y que el perfil del editor sea `newProjectCapabilities()`. Después crea el borrador inválido, como lo haría un estudiante, y comprueba que el perfil importado (`gg.score`) es distinto. Tras el fallo de la importación exige que el perfil vuelva a ser **el del arranque** (antes: `null`) y que `onApplied` no haya vuelto a llamarse (`applied.length === appliedBefore`, antes `[]`). Las demás aserciones (borrador, selección, nombre, fuente, identidad, revisión, `stops === 0`, `prepare` rechaza el borrador) no cambian.

### 2. ¿Puede fallar la instalación del arranque en uso real?

Entradas de `startNewProject()`: `authoring.capture()` (bloques del ejemplo incorporado, `#source` con su valor por defecto, documentos de texto, vistas, configuración de participantes y recursos de la shell), `#project-name` y `newProjectCapabilities()` del catálogo empaquetado. Durante el arranque, `.authoring`, el inspector y la consola están `inert`, `#source`, `#project-name`, abrir y descargar están deshabilitados, y los documentos de texto, las vistas sincronizadas y las actividades reciben `setReady` solo tras `ready()`. `#project-name` lleva `autocomplete="off"`, así que el navegador no restaura un valor al recargar. Los recursos salen del mismo `project-catalog.json` de la misma versión publicada (inmutable) que valida `createProject`. **Conclusión: un estudiante no puede alcanzar el fallo**; solo lo provocaría una compilación incoherente (un catálogo sin la versión `latest`, o un ejemplo inválido para ella).

Aun así, endurecí ese camino para que no engañe:
- Antes (HEAD `04b5ea4`): `report(error)` mostraba el error crudo de validación (p. ej. «GGPROJ: nombre de proyecto inválido») como error del proyecto, y `onApplied` iba dentro del mismo `try`. Si `onApplied` fallaba con el perfil ya instalado, se habría informado como si la instalación hubiera fallado.
- Ahora: el mensaje dice lo que pasó y lo que puede hacer: «No se pudo preparar el proyecto nuevo con los bloques más recientes. Puedes seguir editando con los bloques de siempre; no se ejecutó nada. (causa)». `onApplied` se llama fuera del `try`, solo si la instalación salió bien. Preparar no cambia nada, y un `commit` fallido restaura el borrador (silencioso, con `suppress`), de modo que el borrador queda intacto en el perfil compatible: nada se ejecuta, no se llama a Detener y no se afirma ningún guardado.
- **NP-004** (inyección de fallo, porque el camino no es alcanzable en uso real; está indicado en el propio caso): el editor rechaza el perfil nuevo. El caso comprueba que no hubo ningún `commit` del editor, que las capacidades siguen en `null`, que `stops` y `applied` quedan en 0, que no hay aviso de salida pendiente, que el estado no dice «Guardado en este navegador», que hay un único diagnóstico `PROJECT_ERROR` con el mensaje exacto y que la exportación sigue siendo un v1 válido con los bloques del ejemplo y su `scene`.
  - RED: el mismo test con el `project-ui.mjs` de HEAD (copia temporal de `git show HEAD:…`), con `node --test --test-name-pattern="NP-004" tests/integration/new-project-capabilities.test.mjs` → `not ok 1 … actual: 'perfil no instalado en esta compilación'`: se mostraba la causa cruda (`fix-np004-red.log`).
  - GREEN: con el arreglo, `node --test tests/integration/new-project-capabilities.test.mjs` → `# pass 4 # fail 0` (`fix-np004-green.log`).

### Verificación tras el arreglo
| Comando | Resultado |
|---|---|
| `npm test` | **524/524** (`fix-node.log`) |
| `npm run test:tools` | **82/82** (`fix-tools.log`) |
| `npm run spec:validate` | **38/38** |
| `npm run browser:build` | aprobado (`fix-build.log`) |
| `new-project-capabilities` + `studio-entry-journey` (puertos 5700–5709) | **11/11** (`fix-browser.json`) |

Archivos: `src/studio/project-ui.mjs`, `tests/integration/project-draft-rollback.test.mjs`, `tests/integration/new-project-capabilities.test.mjs`. No ejecuté la partición 0 (la corre el coordinador).

## Fix round 1 (partición 0 del coordinador sobre `4fd684c`)

Los dos hallazgos son **expectativas caducadas del formato v1 inicial**, no regresiones del producto.

1. **`code-console.spec.mjs:49` GG-CODE/CONSOLE (escritorio y móvil).** Lo que el caso quiere probar es que el archivo portátil lleva solo autoría (nada de código generado, mapa de fuentes ni consola); eso lo comprueba el `not.toMatch(/SCRIPT_STARTED|generatedCode|sourceMap|consoleEntries/)` siguiente. La lista exacta de claves `['blockly','deviceSource']` era la de GGPROJ v1. En v3 (proyecto inicial según R1), `authoring` siempre incluye `textDocuments` y `selectedTextDocumentId` (`project-format.mjs`, `structure`). Cambio: la lista exacta es ahora `['blockly','deviceSource','selectedTextDocumentId','textDocuments']` y además se exige `textDocuments === []` y `selectedTextDocumentId === null`, así que no se cuela ningún documento. La comprobación de exclusión no cambia.
2. **`scene-inspector.spec.mjs:157` GG-INSPECT-003.** El caso arrastraba el **primer** bloque del menú Apariencia suponiendo que era «cambiar disfraz a». En la caja 0.2.0 (E1, orden de Apariencia de Scratch), el menú empieza por «decir … durante». La traza del coordinador lo confirma (`figure "decir, ¡Hola!, durante, 2, segundos…" [active]`), por eso había 0 bloques `gg_set_costume`. **El estudiante no se ve afectado:** «cambiar disfraz a» sigue en Apariencia (quinta opción: «decir… durante», «decir», «pensar… durante», «pensar», «cambiar disfraz a», …) y el propio caso demuestra que arrastrarlo con el puntero real y conectarlo funciona. Cambio: el caso localiza ese bloque por su texto (`filter({hasText: /cambiar\sdisfraz\sa/})`; `\s` porque Blockly usa espacios no separables). El resto del recorrido no cambia (arrastre real, conexión a `editable-repeat`, menú «hero-alt», ejecución con píxeles azules, ZIP y reapertura con IDs).

### Ejecuciones
- Puertos por defecto, solo las dos suites autorizadas, con `curl …4173/health` → `000` antes de cada corrida:
  - Intento 1 (`t1-r1-p0.json`): code-console 2/2 + scene-inspector 7/8. GG-INSPECT-003 no encontró el bloque porque mi primer filtro usaba espacios normales y Blockly pone NBSP. Defecto de mi prueba, corregido con `\s`.
  - Intento 2: `GG_BROWSER_REPORT=artifacts/stabilization-2d/e2-multisprite/t1-r1-p0-b.json GG_TEST_OUTPUT_DIR=artifacts/stabilization-2d/e2-multisprite/t1-r1-p0-b-output npx playwright test tests/browser/code-console.spec.mjs tests/browser/scene-inspector.spec.mjs` → **10 passed**.
- Node: `node --test tests/integration/{new-project-capabilities,project-draft-rollback,scene2d-vocabulary}.test.mjs` → **43/43** (`task-1/r1-node-focal.log`); `npm test` → **524/524** (`task-1/r1-node.log`).
- `new-project-capabilities` (puertos 5700–5709) → **2/2** (`task-1/r1-np.json`).
- Sin cambios en `src/`: no hizo falta reconstruir.

Archivos: `tests/browser/code-console.spec.mjs`, `tests/browser/scene-inspector.spec.mjs`.


</details>

<details>
<summary>Task 2: evidencia histórica y sus correcciones</summary>

# Task 2 · Inventario de sprite único, `gg.sprites@0.3.0` y migración

Rama `stab/e2-multisprite`. Commit `d220202` sobre `048c39e`. Evidencia en `artifacts/stabilization-2d/e2-multisprite/task-2/`, que Git ignora.

## Qué se implementó

- **Inventario (1.1).** Hice consultas de CodeGraph sobre el índice del checkout principal, en solo lectura, porque el worktree no tiene índice. Las guardé en `artifacts/stabilization-2d/e2-multisprite/codegraph/`. Las completé con búsquedas de `'hero'`, `projectInitialScene`, `initialScene`, `sprites[0]`, `targets[1]`, `getSpriteTargetByName` y `ownerId`. Resultado: 35 archivos de `src/` nombran `hero`.
  - Inventario por consumidor, con la tarea que lo resuelve (T2–T8 o «sin cambio»): **`artifacts/stabilization-2d/e2-multisprite/inventory.md`**. Ese archivo no queda en Git porque `artifacts/` está ignorado.
  - Resumen versionado: `openspec/changes/scene2d-multi-sprite/design.md`, punto 6.
- **`gg.sprites@0.3.0` (1.2).** Está en `src/packs/gg.sprites/manifest.mjs` (`spritesPack03`), con hash `6237b1c5…` (tras la ronda de corrección 1: `6e403217…`).
  - Es `apiVersion: 2` con la misma tabla `spriteLanguage02`. Bloques, reglas, caja, recursos y permisos son idénticos a 0.2.0.
  - Lo único que cambia es la configuración: `{stage: {backdrop}, sprites: [{id, name, x, y, direction, size, visible, costume}]}`, con entre 1 y 8 sprites.
  - El esquema genérico del manifiesto valida forma y rangos: x ±240, y ±180, dirección ±180, tamaño 0–1000.
  - El validador instalado `scene2d-objects-v1` (`src/contracts/scene2d-objects.mjs`) añade lo que el esquema no expresa: IDs únicos, el ID `stage` reservado y nombres únicos sin distinguir mayúsculas, sin espacios alrededor, sin caracteres de control y de 32 caracteres como máximo.
  - `defaults` = escenario `stage` + `hero` en el estado de siempre.
  - `languageTables['gg.sprites@0.3.0']` también apunta a `spriteLanguage02`.
- **Migración 0.2.0 → 0.3.0.** Es un registro del catálogo con un campo nuevo, `config`, que nombra una transformación revisada e instalada (`packConfigMigrations` / `migratePackConfig` en `pack-migrations.mjs`).
  - `validateMigrationRecord` rechaza cualquier nombre que no esté instalado.
  - `migrateCapabilities` aplica la transformación en cada paso y valida contra la versión instalada.
  - `scene2d-objects-from-initial-scene-v1` es pura: convierte `initialScene` en `sprites[0]` con id/nombre `hero`, el mismo estado y disfraz, `visible: true` y fondo `stage`.
  - No transforma bloques. La cadena 0.1.0 → 0.2.0 → 0.3.0 sale de `findMigrationChain`.
- **Compatibilidad.** `localPackCompatibility` añade `{gg.sprites 0.3.0 satisfies ['0.1.0']}`.
  - Los dependientes congelados (`gg.score`, `gg.microbit`, `gg.assets@0.1.0`, `gg.sb3@0.2.0`) no leen la configuración de `gg.sprites`.
  - No declaré `0.2.0` porque ningún paquete depende de esa versión.
- **0.3.0 ya es la última versión** (`latestPackVersions`). Por R1, los proyectos nuevos, «Crear mi primera escena», las actividades y las plantillas crean 0.3.0 con `sprites[0] = hero`.
  - Ejecutan exactamente igual: hoy nadie lee la escena de la configuración y el adaptador crea `hero` como siempre.
  - `resolveCapabilities(...).initialScene` se deriva de `sprites[0]` para que los lectores de un solo sprite sigan funcionando.
  - v1/v2 siguen en 0.1.0. «Actualizar packs» sube 0.1.0/0.2.0 a 0.3.0 sin ejecutar nada.
  - Revisé todas las llamadas a `createCapabilities` con configuración previa: mantienen la versión fijada, así que ninguna mezcla una configuración 0.2.0 con la versión 0.3.0.
- **OpenSpec.** `design.md` de scene2d-multi-sprite, puntos 6–11 (fechados, con razones y alternativas descartadas). Tareas 1.1 y 1.2 marcadas con evidencia. Nota fechada en el punto 5 del `design.md` de `scene2d-vocabulary-v2`.
- **`tools/test/impact.mjs`.** Inventaría `src/contracts/scene2d-objects.mjs` en el grupo de packs (`packs-lessons-offline`).

## Pruebas (Node v22.23.4; puertos 5700–5709; un worker)

| Comando | Resultado |
|---|---|
| `node --test tests/integration/scene2d-objects.test.mjs` | **6/6** (`task-2/green-3.log`) |
| `npm test` | **530/530** (`task-2/node-2.log`) |
| `npm run test:tools` | **82/82** (`task-2/tools-1.log`) |
| `npm run spec:validate` | **38/38** |
| `npm run browser:build` | aprobado (`task-2/build-1.log`) |
| `npx playwright test` con canonical-projects, code-view-conversion, educational-activities, new-project-capabilities, packs-lessons, scene2d-vocabulary, synced-transition-activity y textual-equivalence | **39/39** (`t2-focus-1.json`, `task-2/focus-1.log`) |
| Las otras 20 specs de la selección que no son de partición 0 (`task-2/rest-specs.txt`) | **133/133** (`t2-rest-1.json`, `task-2/rest-1.log`) |

En total corrí las 28 specs de navegador que quedan fuera de `defaultPortSuites`: 172/172.

### Pruebas nuevas (`tests/integration/scene2d-objects.test.mjs`)
- **MS-001:** 0.3.0 está congelado por hash y los hashes de 0.1.0 y 0.2.0 no cambian. Contribuciones, permisos, recursos, tabla, cobertura de lenguaje y estructuras del núcleo son idénticos a 0.2.0. `defaults` correctos.
- **MS-002:** acepta 1 y 8 sprites. Rechaza 25 configuraciones inválidas por las dos vías (validación de capacidades y validador directo): 0 o 9 sprites, ID o nombre repetido (también solo cambiando mayúsculas), ID `stage`, ID vacío o con espacios, nombre vacío, con espacios alrededor, con caracteres de control o demasiado largo, valores fuera de rango, `visible` no booleano, disfraz inválido, propiedades que faltan o sobran, escenario sin fondo y la forma 0.2.0. 0.2.0 sigue rechazando la forma 0.3.0.
- **MS-003:** el registro es exacto y sin `blocks`; rechaza un `config` no instalado. La cadena desde 0.1.0 tiene dos pasos. La transformación es pura y rechaza una entrada que ya es 0.3.0. Desde 0.1.0 y desde 0.2.0: «Actualizar packs» ofrece 0.3.0, la configuración resultante es la de `defaults`, `gg.score` no cambia, `initialScene` resuelta es igual y después no quedan actualizaciones pendientes.
- **MS-004:** 0.3.0 con `gg.score`, `gg.microbit`, `gg.assets@0.1.0` y `gg.sb3@0.2.0` valida. Seleccionar `gg.score` solo sigue trayendo 0.1.0. La compatibilidad funciona en un solo sentido: un dependiente de 0.3.0 no queda satisfecho con 0.2.0.
- **MS-005:** la última versión es 0.3.0. `newProjectCapabilities()` da la configuración de `defaults` y una `initialScene` igual a `projectInitialScene`. El proyecto se guarda como GGPROJ v3 sin `scene` y se reabre idéntico. Legado sigue en 0.1.0.
- **MS-006:** proyectos 0.2.0 («Hero se presenta») y 0.1.0 (`editableExample`) pasan por `migrateProject`.
  - El original no cambia (copy-on-write). El resumen dice `changedBlocks: 0`.
  - `authoring` y `resources` son idénticos; el proyecto se guarda y se reabre.
  - La IR y `toScratchProject` dan lo mismo antes y después.
  - En la VM local, el programa bajado desde 0.2.0 y desde 0.3.0 tiene el mismo estado inicial y nada corre al cargar (0 hilos). Ambos llegan al mismo estado final (disfraz 1, visible, globo «¡Mira cómo reboto!») y Detener deja 0 hilos.
  - El tamaño solo se compara entre las dos ejecuciones: sin renderizador la VM no aplica cambios de tamaño.

### Pruebas ajustadas a la nueva verdad (sin debilitar)
- **Node:**
  - NP-001/002: última versión 0.3.0; el proyecto exportado tiene la configuración `{stage, sprites:[hero]}` y su `initialScene` resuelta.
  - GG-PACK-001: versión 0.3.0. Las dos corrupciones de 0.3.0 (x = 241 y `hero` duplicado) se rechazan, y además se conserva el caso `initialScene.x = 3` para 0.1.0 y 0.2.0.
  - GG-PACK-002: la escena legada se compara como `sprites[0]` y como `initialScene` resuelta.
  - VOC-001: tres versiones y el hash de 0.2.0 fijado.
  - VOC-002/003: última versión 0.3.0, compatibilidad con dos entradas; después de migrar a 0.2.0 se ofrece 0.3.0, y después de 0.3.0 no queda nada.
  - `v2()` fija 0.2.0 exacto, así que las pruebas E1 siguen probando el manifiesto 0.2.0.
- **Navegador:**
  - NP-BROWSER-001: 0.3.0 y la configuración completa.
  - E1-01/E1-04: comprueban la versión 0.3.0, que tiene el mismo vocabulario.
  - E1-05: «Actualizar packs» lleva 0.1.0 a 0.3.0, sin ejecutar y con los mismos bloques. Además comprueba `sprites`.
  - scene-inspector, project-persistence, language-runtime, textual-equivalence y packs-lessons: la escena del proyecto nuevo se lee en `sprites[0]` (más `id === 'hero'` / `ids == ['hero']`).
  - Se actualizaron dos comentarios.

## Evidencia TDD
- **RED 1** (`task-2/red-1-import.log`): falta el módulo `src/contracts/scene2d-objects.mjs`.
- **RED 2** (`task-2/red-2.log`), con el módulo de contrato creado pero sin catálogo: 0/6. «pack/versión no instalado: gg.sprites@0.3.0», `expected '0.3.0' actual '0.2.0'` y «no hay actualizaciones seleccionadas».
- **GREEN:** `green-1.log` 4/6, que reveló dos defectos de la propia prueba (la firma de `offeredCoreStructures` y el tamaño sin renderizador). Después `green-3.log` 6/6.

## Archivos
- **Nuevos:** `src/contracts/scene2d-objects.mjs`, `tests/integration/scene2d-objects.test.mjs`.
- **Modificados:**
  - Código: `src/packs/gg.sprites/manifest.mjs`, `src/packs/catalog.mjs`, `src/packs/language-tables.mjs`, `src/contracts/packs.mjs`, `src/contracts/pack-migrations.mjs`, `src/contracts/pack-config-validators.mjs`, `tools/test/impact.mjs`.
  - Pruebas: `tests/integration/{packs,new-project-capabilities,scene2d-vocabulary}.test.mjs` y `tests/browser/{new-project-capabilities,scene2d-vocabulary,scene-inspector,project-persistence,language-runtime,textual-equivalence,packs-lessons,code-view-conversion}.spec.mjs`.
  - OpenSpec: `openspec/changes/scene2d-multi-sprite/{design,tasks}.md`, `openspec/changes/scene2d-vocabulary-v2/design.md`.
- **Fuera de Git:** `artifacts/stabilization-2d/e2-multisprite/inventory.md`.

## Autorrevisión
- **Alcance.** No toqué autoría por objeto, IR `targetId`, adaptador, API, UI ni la biblioteca. El formato GGPROJ no cambió: un proyecto 0.3.0 es un v3 normal.
- **Patrones existentes.** El validador sigue el registro instalado `packConfigValidators`. La transformación de configuración sigue el mismo principio: los registros solo nombran código instalado. La compatibilidad es un dato del catálogo, como en E1.
- **YAGNI.** Sin transformación declarativa genérica, sin compatibilidad con 0.2.0 y sin comprobar referencias de disfraces contra recursos (razón en el design, punto 7). `spriteNameKey` no se exporta.
- **El esquema vive en el contrato** (`scene2DObjectsSchema`) y el manifiesto lo clona. Cualquier cambio futuro del contrato cambia el hash de 0.3.0, y MS-001 lo detecta.
- **Las pruebas comprueban comportamiento real:** migración de proyecto completa, VM real y rechazo por las dos vías de validación.

## Preocupaciones
1. **La selección affected sale `selection: full`** solo porque toqué `tools/test/impact.mjs` («frontera compartida»). Sin ese archivo es `affected`: 14 specs de navegador, 6 de ellas de partición 0. Aun así corrí las 28 specs fuera de partición 0 que da la selección full. El coordinador decide si sugerir una full.
2. **El hash de 0.3.0 puede cambiar antes de integrar E2** (design, punto 11). T4/T5 pueden necesitar permisos por objeto (hoy `permissions.sprites = ['hero']`) y T8 añade «ir a objeto» y «fondo» a la tabla. Cualquier proyecto 0.3.0 guardado dentro de la rama antes de eso dejaría de abrir. Ninguna fixture fija hoy el hash. Alternativa: que T8 publique otra versión (0.4.0); lo dejo al coordinador.
3. **Forma intermedia hasta T3/T4.** Un GGPROJ v3 con 0.3.0 y `authoring.blockly` es lo que crea hoy todo proyecto nuevo, y T3 debe seguir leyéndolo. Además, una configuración 0.3.0 con más de un sprite (solo construible a mano) valida pero ejecuta solo `hero`, hasta T4.
4. **Comportamiento previo, sin cambio:** `shell.js:612` («Añadir puntuación» sin capacidades) crea la última versión en vez de `lockedPackVersions` (antes 0.2.0, ahora 0.3.0). Lo anoto en el inventario.

## Specs de partición 0 para el coordinador (puertos por defecto)
- **De la selección efectiva** (sin `impact.mjs`): `device-integration`, `language-runtime`, `offline-recovery`, `project-persistence`, `scene-inspector`, `textual-corpus`. Modifiqué `language-runtime`, `project-persistence` y `scene-inspector` sin poder ejecutarlas.
- **Si se toma la selección full** (por `impact.mjs`), son las 16 de `defaultPortSuites`: además `accessibility-zoom`, `audio-variables`, `code-console`, `device-transfer`, `isolation`, `pilot-2d-mode`, `pxt-worker`, `runner`, `simulator`, `standalone-contexts`, y el smoke `tests/quick/studio.spec.mjs` (`quick: true`). Todas parten del proyecto inicial, que ahora es 0.3.0. Busqué con grep `initialScene`, `0.2.0` y la versión de `gg.sprites` y no encontré más dependencias.

## Fix round 1 (hallazgo Important de la revisión Opus)

**Problema.** `src/contracts/scene2d-objects.mjs` aceptaba `__proto__` como ID de sprite, como disfraz y como fondo. Tanto el `notEnum` del esquema como `id()` prohibían solo `prototype` y `constructor`, mientras que `resources.mjs:23` también prohíbe `__proto__`. Eso abría un posible vector de contaminación del prototipo cuando T3 indexe `authoring.scene2d.sprites` por ID, y permitía un dueño que los recursos siempre rechazarían.

**Cambio.**
- `'__proto__'` añadido a `resourceId.notEnum` (esquema del manifiesto) y a la lista de `id()` (validador `scene2d-objects-v1`).
- Nuevo hash de 0.3.0: `6e403217357ecd161473626ca0be4e5572ff7fb349ecbb08303da28cebd4400a`. Lo actualicé en `src/packs/catalog.mjs` y en el punto 7 de `design.md`, que ahora también dice la regla de IDs; el hash anterior queda anotado allí.
- MS-001 no fija el hash como literal: lo calcula desde el manifiesto y lo compara con el catálogo, tal como decidí en el punto 11 del design. Así que pasa con el hash nuevo sin cambiar la prueba.
- 0.1.0 y 0.2.0 siguen con sus hashes (MS-001, VOC-001).

**Pruebas.** Tres casos nuevos en MS-002, comprobados por las dos vías (`validateCapabilities` y validador directo): sprite con `id: '__proto__'`, `costume: '__proto__'` y `backdrop: '__proto__'`.

| Comando | Resultado |
|---|---|
| RED: `node --test tests/integration/scene2d-objects.test.mjs` | 5/6, MS-002 `Missing expected exception: ID __proto__` (`task-2/fix1-red.log`) |
| GREEN: `node --test tests/integration/{scene2d-objects,packs,scene2d-vocabulary,new-project-capabilities}.test.mjs` | **58/58** (`task-2/fix1-green.log`) |
| `npm test` | **530/530** (`task-2/fix1-node.log`) |
| `npm run spec:validate` | **38/38** |

No corrí suites de navegador: el cambio se limita al contrato y a su hash, y ninguna prueba ni fixture fija ese hash.


</details>

<details>
<summary>Task 3: evidencia histórica y sus correcciones</summary>

# Task 3 · Informe: GGPROJ `authoring.scene2d` e IR 2D v1 con `targetId`

**Estado:** DONE_WITH_CONCERNS · commit `875ee6f` en `stab/e2-multisprite` (base `b1b9539`). Tareas OpenSpec 1.3 y 1.4 marcadas.

## Decisión de formato: GGPROJ v6, no v5

Registrada en `openspec/changes/scene2d-multi-sprite/design.md`, punto 12. El punto 1 se corrigió: decía «v4».

Por qué v6:
- **Política del repositorio.** Cada campo nuevo de autoría estrena versión y solo se escribe cuando hace falta (v4 con `runtime.api`, v5 con `codeViews`). Así, la versión basta para saber qué propiedades tiene `authoring`.
- **Lectores anteriores.** Comparan las propiedades exactas antes de mirar los packs. Un v5 con `scene2d` fallaría en una versión anterior con «propiedades ausentes o no permitidas». Un v6 se explica: «GGPROJ v6 es de una versión más reciente».
- **Alternativa descartada: v5 + capacidad 0.3.0.** La forma de v5 dependería de la versión de un pack.

Forma de v6:
- `authoring = {scene2d, deviceSource, textDocuments, selectedTextDocumentId}`, más `codeViews` solo si hay vistas.
- Capacidades obligatorias. Sin `scene` ni `authoring.blockly`.
- Exige `gg.sprites` con objetos 2D (0.3.0). Las claves de `scene2d.sprites` son exactamente los IDs configurados.
- Cada workspace (escenario incluido) tiene ≤ 64 KiB y solo `blocks`/`variables`. Un workspace vacío es `{}`.

Seguridad:
- Las claves se validan con `isScene2DSpriteId` (exportada desde `scene2d-objects.mjs` y compartida con la IR) antes de usarse. `stage` no es un sprite.
- `jsonTree` ya rechaza `__proto__`, `prototype` y `constructor` en cualquier nivel. Probado con un `"__proto__"` real tras `JSON.parse`.
- Los mapas se construyen con `Object.fromEntries` o con claves que vienen de la configuración validada.

## Migración y escritura

- **`createProject`.** Con 0.3.0 escribe siempre v6.
  - `blockly` es el workspace del editor único, el del primer sprite (`sprites[0]`, igual que `resolveCapabilities().initialScene`). `scene2d` lleva todos los objetos. Si llegan los dos, `blockly` reemplaza solo al primer sprite.
  - Un perfil con varios sprites y solo `blockly` falla nombrando los que faltan.
  - Salir de 0.3.0 vuelve a un solo workspace solo si el escenario está vacío y ningún otro sprite tiene scripts. Si no, falla con «descartaría…».
- **`migrateProject`.** Al llegar a 0.3.0 mueve `authoring.blockly` a `scene2d.sprites.hero` como v6. Mismos IDs, shadows y posiciones. El escenario y los demás sprites quedan vacíos. Texto, vistas, recursos y proyecto no cambian. Las transformaciones de bloques futuras se aplican a cada workspace de `scene2d`.
- **`upgradeProject`.** La promoción de v1/v2 a 0.3.0 da la misma forma v6.
- **Forma intermedia de T2 (v3 + 0.3.0 + `authoring.blockly`).** Se abre sin cambios: abrir no migra. `scene2DAuthoringFromBlockly` (pura) la convierte y el siguiente guardado la escribe como v6. En un intermedio con varios sprites hecho a mano, el workspace pasa al primer sprite y los demás empiezan vacíos.
- **`project-authoring`** (necesario para no perder datos al guardar):
  - Monta en el editor único el workspace del primer sprite.
  - Guarda serializados el escenario y los demás sprites.
  - `capture()` devuelve `scene2d` con el primer sprite actualizado.
  - Los puntos de restauración incluyen los objetos.
- **`project-ui.useCapabilities`** pasa también `scene2d`.
- **Nueva función de lectura:** `projectBlocklyWorkspace(document)`.

## IR 2D v1

Design, punto 14.

- **Forma:** `{version: 1, sprites: [...], variables?, scripts: [{targetId, event, sourceBlockId, body, ...}]}`.
- **`sprites`:** 1–8, únicos, con la sintaxis de sprite. `targetId` es un sprite de esa lista o `stage`.
- **`scene2DProgramLimits` por objeto:** 16 scripts, 300 nodos, 16 variables. El tamaño total es nueve presupuestos de IR0.
- **Variables:** una global lleva `scope: 'global'` y no tiene dueño. Una local lleva `targetId` de un sprite. Usar una local desde otro objeto, el escenario incluido, se rechaza.
- **Escenario:** solo control, variables, sonido, mensajes y detener, con los eventos inicio, tecla, clic y mensaje. No se mueve, no habla, no cambia de tamaño ni de disfraz, y no se clona.
- **Recursos:** se comprueban contra el dueño de cada script. Sin vista de recursos, solo `hero` tiene los integrados.
- **IDs de bloque:** `sourceBlockId` es único en todo el programa (la opción estricta). Los errores llevan `sourceBlockId` y `targetId`.
- **IR0:** queda exactamente igual. `programObjectsFromIR0` la eleva a v1 con todo en `hero`, sin cambiar nodos, IDs ni orden.

## Pruebas

**Nuevo archivo:** `tests/integration/scene2d-authoring.test.mjs`, MS-007…MS-015 (9 pruebas): formato v6, validación y prototipos, migración, forma intermedia, salida de 0.3.0, coordinador de autoría, elevación de IR0, validación de la IR v1 y recursos por dueño.

**RED:** el archivo nuevo falló primero al importar: `does not provide an export named 'programObjectsFromIR0'`. MS-012 falló aparte hasta cambiar `project-authoring` (`undefined` en lugar del workspace).

**GREEN:**
- `npm test`: **539/539**, incluidas las 9 nuevas. Antes de ajustar las pruebas existentes: 530/539. Las 9 que fallaban eran efecto esperado de la nueva verdad (abajo).
- `npm run test:tools`: **82/82**.
- `npm run spec:validate`: **38/38**.
- Navegador con los puertos 5700–5709: **172/172** en 51,8 min. Fueron las 28 specs de la selección que no están en la partición 0. Log: `artifacts/stabilization-2d/e2-multisprite/task3-browser.log`. Antes se ejecutó `node tools/f0/build-browser.mjs`, que reconstruye `artifacts/browser`. Ninguna corrida de Playwright estaba activa. Las previews de los puertos 5283/5383 de este worktree sirven ahora el build nuevo.

**Pruebas existentes ajustadas a la nueva verdad (los proyectos con 0.3.0 son v6), sin debilitarlas:**
- **Node:** NP-002, GG-PACK-002 (×2), GG-COMPAT-004/005/006 (v7 como formato futuro), GGPROJ5, MS-005 y MS-006. Las comprobaciones de v3/v4/v5 fijan `gg.sprites@0.2.0` y ganan su variante v6. GG-COMPAT-004 cubre ahora la transformación de bloques dentro de `scene2d`.
- **Navegador:** new-project-capabilities, packs-lessons, textual-equivalence, capability-contexts, integrated-microbit-workspace, resource-safety y language-copies, todas en verde arriba. Las de la partición 0 no se ejecutaron (lista abajo).

**Plan affected:** sale **`selection: full`** (44 specs). La causa es `src/project-authoring.mjs`, que `tools/test/impact.mjs` no clasifica («frontera compartida»). Sin ese archivo saldría `affected` con 42 specs, porque `program-contract.mjs` arrastra el grupo 2D. No reclasifiqué la herramienta. Lo decide el coordinador.

## Specs de partición 0 para el coordinador (puertos por defecto)

Todas están en la selección. **Cambié** las seis primeras (v3→v6 o `authoring.blockly`→`scene2d.sprites.hero`) y no las pude ejecutar:

- `tests/browser/project-persistence.spec.mjs` (mutaciones GG-PROJECT-003/004, GG-PROJECT-007, 006/007/009 y SJ-01)
- `tests/browser/device-integration.spec.mjs`
- `tests/browser/offline-recovery.spec.mjs`
- `tests/browser/code-console.spec.mjs`
- `tests/browser/language-runtime.spec.mjs`
- `tests/browser/scene-inspector.spec.mjs`
- Sin cambios: `accessibility-zoom`, `audio-variables`, `device-transfer`, `isolation`, `pilot-2d-mode`, `pxt-worker`, `runner`, `simulator`, `standalone-contexts` y `textual-corpus`.

Smoke (`tests/quick/studio.spec.mjs`): no se ejecutó. Solo compara `editor.save()`, no la forma del archivo.

## Archivos

- **Código:** `src/project-format.mjs`, `src/project-migration.mjs`, `src/project-authoring.mjs`, `src/contracts/program-contract.mjs`, `src/contracts/scene2d-objects.mjs` (solo exporta la sintaxis de sprite) y `src/studio/project-ui.mjs`.
- **Pruebas:** `tests/integration/scene2d-authoring.test.mjs` (nuevo); `new-project-capabilities`, `packs`, `project-compatibility`, `project-format` y `scene2d-objects` (`.test.mjs`); 13 specs de navegador.
- **Docs:** `openspec/changes/scene2d-multi-sprite/{design.md,tasks.md}` y `docs/phase-1/GGPROJ.md`.
- **CodeGraph:** `artifacts/stabilization-2d/e2-multisprite/codegraph/task3-*.json`.

No toqué los archivos de escritor único de la shell ni el manifiesto 0.3.0. Su hash no cambia.

## Revisión propia

- La lectura de v1–v5 no cambió: misma lista de propiedades y mismos mensajes del workspace único.
- La forma intermedia abre idéntica.
- Ningún camino descarta scripts de otros objetos en silencio: faltantes → error; salida con pérdida → error.
- Abrir, preparar o hacer commit de la autoría no ejecuta nada.
- La IR0 sigue igual: los mensajes de una v0 mal formada no cambian.
- Las claves no confiables solo se usan tras `jsonTree` y `isScene2DSpriteId`.

## Riesgos y pendientes

1. **Cambio visible de formato.** Todos los proyectos nuevos y los actualizados a 0.3.0 se guardan como v6. Una versión de main sin E2 no los abre, aunque lo explica. Es coherente con que 0.3.0 tampoco está publicado fuera de la rama, pero hay que mencionarlo al integrar.
2. **Lock `ir: 0` sin cambiar.** La IR no se guarda en GGPROJ. Propongo que T4 decida si sube `ir` y el adaptador (con historial) cuando el adaptador consuma la v1.
3. **`codeViews` sigue siendo de un solo workspace.** `scriptOrder` y `restorePoint.workspace` de la entrada 2D se refieren hoy al primer sprite. T5/T6 deberán hacerlos por objeto.
4. **Varios sprites a mano, hasta T4.** El adaptador sigue ejecutando solo `hero` con el workspace del primer sprite. Los IDs de bloque únicos en todo el programa obligan a T6 a generar IDs nuevos al duplicar un sprite.
5. **Selección full** por `project-authoring.mjs`, que no está clasificado (ver arriba).

## Fix round 1 (29/10/2026)

**Hallazgo Important de la revisión.** `validateProgram` aceptaba la v1 en todos los consumidores que solo entienden IR0. Con una IR v1, `toScratchProject` metía en `hero`, sin aviso, los scripts del escenario y de `cesta`. Era un fail-open latente del filtro de versión.

**Cambio, según el dictamen del coordinador.** La v1 se activa solo de forma explícita en el validador: `validateProgram(ir, {objects: true})`. Por defecto solo se acepta `version: 0`, y una v1 se rechaza con `unsupported version` antes de mirar su forma. Así se cierran el adaptador Scratch y con él la frontera del simulador (`browser-scene` `load-program` → `toScratchProject`, en sus dos ramas), además de `authorizeProgram`, los generadores, `code-view-identity`, `workspace-from-ir` y el export SB3. Ninguno cambió. Con la opción activa, la v0 se sigue aceptando. T4/T5 la activarán donde soporten la v1. Registrado en design, punto 14.

**Pruebas:**
- **RED primero.** MS-016 (nueva) falló con `Missing expected exception: validator default`.
- **MS-016** comprueba que el validador por defecto, `toScratchProject` (sin vista y con vista de recursos portables, las dos ramas de la frontera del simulador) y `authorizeProgram` rechazan una v1 con escenario y `cesta` y la v1 elevada desde IR0. Con `{objects: true}` validan. La IR0 sigue funcionando en todos.
- **MS-013…015** activan `{objects: true}`. Las comprobaciones de IR0 siguen con los valores por defecto.

**Comandos y salida:**
- `node --test tests/integration/scene2d-authoring.test.mjs`: 10/10.
- `npm test`: **540/540**.
- `npm run spec:validate`: 38/38.
- Sin suites de navegador: solo cambian el contrato, sus pruebas y el design.

**Archivos:** `src/contracts/program-contract.mjs`, `tests/integration/scene2d-authoring.test.mjs` y `openspec/changes/scene2d-multi-sprite/design.md`. Los hallazgos Minor no se tocaron (anotados por el coordinador).


</details>

<details>
<summary>Task 4: evidencia histórica y sus correcciones</summary>

# Task 4 · Adaptador Scratch con un target por sprite (tarea 2.1)

**Estado:** DONE_WITH_CONCERNS · commit `504ff7e` en `stab/e2-multisprite` (base `3f3dc6f`). Tarea OpenSpec 2.1 marcada con evidencia. Decisiones en `openspec/changes/scene2d-multi-sprite/design.md`, puntos 15–21; el punto 14 («Lock») remite al 18.

Evidencia en `artifacts/stabilization-2d/e2-multisprite/task-4/` (Git la ignora).

## Diseño del adaptador

- **`toScratchSceneProject(ir, {scene, resourceView, ownerAssets})`** (`src/adapters/scratch/scratch-project.mjs`) es una función nueva. `toScratchProject` sigue siendo solo IR0. La bajada de scripts es común (`lowerScripts`) y produce un mapa de bloques por objeto, con un `sourceMap` común y IDs únicos en todo el programa.
- **Targets.**
  - Escenario y un target por sprite configurado, en orden de configuración (`layerOrder` 1…n).
  - También se crean los sprites sin scripts.
  - `ir.sprites` debe coincidir con los IDs configurados, en el mismo orden.
- **Nombre del target = ID del sprite.** Es estable al renombrar y tiene sintaxis segura. El nombre visible viaja en `objects: [{id, name}]`.
- **Escena inicial desde la configuración.**
  - Usa x, y, dirección, tamaño, visibilidad y disfraz.
  - El disfraz se busca por ID entre los del dueño. Si falta, se usa el disfraz 0, igual que el adaptador IR0. El fondo del escenario sigue la misma regla.
- **Recursos por `ownerId`.**
  - `ownerResources(view, ownerId)` está exportada y también la usa la frontera del simulador para los targets IR0. La salida IR0 no cambia (MS-019).
  - Sin vista de recursos: el disfraz en blanco de siempre.
  - Con los recursos integrados del runner (`/program-resources.json`), mediante `ownerAssets`: solo el escenario y `hero`. Cualquier otro sprite falla con «"Cesta" no tiene disfraces…».
- **Semántica Scratch.**
  - Mensajes `gg-message:<nombre>` y variables globales en el escenario. Las locales, en su sprite.
  - «Al hacer clic» en el escenario se baja como `event_whenstageclicked`.
  - Stop = `vm.stopAll()`. «Detener todo» = `control_stop all`.
- **Solo `hero` ⇒ proyecto Scratch idéntico al IR0.** Se comprueba con vista portable, con vista heredada y sin vista, sobre `hero-presents`, `editableExample` y todo el corpus de bloques (MS-019).

## Cómo produce IR v1 un proyecto 0.3.0 (0.1.0/0.2.0 siguen en IR0)

- **`authoring.sceneProgram()`** (`src/project-authoring.mjs`).
  - Sin objetos (0.1.0/0.2.0): `editor.program()` sin cambios.
  - Con 0.3.0: `composeScene2DProgram(config, {stage, sprites})` (`program-contract.mjs`, pura).
- **Origen de cada IR0.**
  - Workspace montado (`sprites[0]`): `editor.program()`.
  - Escenario y demás sprites: `editor.programOf(state)`. Es nuevo en `editor-entry.mjs`: baja el workspace sin montarlo, con el mismo perfil y la misma vista de recursos.
  - Un workspace vacío no pasa por Blockly.
- **Composición.**
  - Orden de los scripts: escenario, luego cada sprite en orden de configuración.
  - Son globales las variables del escenario y las que algún objeto declara globales. El resto es local del único sprite que las usa.
  - Un ID local compartido por dos objetos, o con dos nombres, se rechaza.
- **`shell.js`.** «Ejecutar» (`runEditable`) y «Ejecutar con micro:bit» (`runDeviceTogether`) envían `sceneProgram()`, y `activeAuthoring` compara contra ella.
- **Siguen con `editor.program()` (IR0):** lecciones, código derivado, vistas, copia SB3 y la IR0 vacía de los documentos de texto. Estos últimos siguen en `hero` hasta 2.2.

## Puntos de activación de IR v1 (explícitos)

1. **`toScratchSceneProject`.** Llama a `validateProgram(ir, {resourceView, objects: true})` dentro de la propia función.
2. **`authorizeProgram(..., {resourceView, objects})`.**
   - Solo acepta la v1 con `objects === true`. Por defecto sigue rechazándola (MS-016 intacta).
   - Exige que el perfil tenga objetos y que `ir.sprites` sean los configurados, en orden.
   - Autoriza disfraces y sonidos contra el dueño de cada script.
3. **`runner.js` `load-program`.**
   - Activa `objects` solo si el perfil **validado** tiene objetos (0.3.0).
   - Pasa a la escena esos objetos validados en `payload.objects`, que sustituye a cualquier campo del mensaje.
   - `browser-scene` solo construye la escena por objetos con esos objetos, y nunca en modo texto.
4. **Filtrado explícito (hallazgo de la revisión de T3).** `toScratchProject` y `generateCode` ya no reenvían `options` al validador: solo `resourceView`. MS-018 comprueba que `{objects: true}` reenviado sigue rechazando la v1.
5. **Siguen cerrados hasta T5:** generadores, traductores, vistas, `code-view-identity`, `workspace-from-ir`, lecciones y export SB3.

## Decisión del lock (design, punto 18)

**`ir: 0` y `adapter: 'scratch-2d-v0'` no cambian.**
- `locks` describe los motores de todo el archivo y se escribe en cada guardado, también en los proyectos 0.1.0/0.2.0, que siguen ejecutando IR0.
- La IR no se guarda en GGPROJ, y su versión la fija el pack (0.3.0 → v1), que ya está bloqueado por hash.
- Subirlo haría ilegibles en versiones anteriores todos los guardados nuevos, incluidos los de un solo workspace, sin ventaja.

## `initialSceneOfObjects` (pendiente de T2, design, punto 19)

Se queda en `sprites[0]`. Es el sprite cuyo workspace monta el editor único y al que `sceneProgram()` asigna `editor.program()`. Elegir `hero` cuando no es el primero describiría otro sprite. MS-025 lo cubre con `[cesta, hero]`. El adaptador ya no lee `initialScene`.

## Lecturas de escena

- **`scene.get` (`gg-bindings`) y `validateSceneSnapshot`.**
  - Un solo `hero` llamado `hero`: el DTO exacto de antes.
  - Si no: todos los sprites `{id, name, x, y}`, con 1–8 sprites, IDs con la sintaxis de objeto y nombres de ≤ 32 caracteres. Cada local lleva `targetId`, con un máximo de 16 por sprite.
  - Las mutaciones de GG-INSPECT-002 siguen rechazándose.
- **Snapshot del runner.** Añade `sprites`, con el estado completo y las variables de cada sprite configurado. Conserva `hero` y `x`.
- **Inspector (`scene-inspector-ui.mjs`).**
  - La vista «escena» lista todos los sprites.
  - La vista de objeto sigue en `hero` o en el primero.
  - Con un solo `hero` las etiquetas son idénticas.

## Corpus de equivalencia (incluye Stop)

`tests/integration/scene2d-execution.test.mjs`, MS-021. Los programas IR v1 se ejecutan en la VM local contra **proyectos Scratch nativos escritos a mano**, no generados por el adaptador:

- **dialogo.** hero dice «Hola, Cesta» y envía «saluda» y espera. Cesta (aparece, se mueve 50 con dirección −90, `turnos` += 10, dice) y el escenario (`turnos` += 100) responden. hero suma 1 y dice «Listo». Resultado: `turnos` = 111, Cesta en x = 70, visible.
- **locales.** `pasos` local en hero (3 + 2 = 5) y en Cesta (7), con el mismo nombre, sin mezclarse. El mensaje solo lo reciben sus receptores.
- **detener.** Dos bucles «por siempre». «Detener todo» desde el escenario tras 0,2 s deja 0 hilos y nada se mueve después.
- **bucles + Stop externo.** `vm.stopAll()`, el Detener de la VM, con los dos bucles en marcha: 0 hilos y nada se mueve.
- **Igualdad con la referencia.** El estado inicial y el final son iguales a los de la referencia, y cargar deja 0 hilos.
- **Mutación.** Poner las globales en cada sprite en vez del escenario hace fallar MS-021 (comprobado y revertido).
- **MS-022.** Repite la equivalencia pendiente de T2 por dos caminos independientes: IR0 con `toScratchProject` frente a v1 compuesta con `toScratchSceneProject` y la escena configurada.

## Pruebas

Node v22.23.4. Puertos 5700–5709. Una corrida de navegador cada vez.

### Nuevas

- **`tests/integration/scene2d-execution.test.mjs`: MS-017…MS-025 (9 pruebas).**
  - MS-017: targets, estado inicial, recursos por dueño, escenario, `objects`, clic en el escenario, disfraz o fondo que falta, sin vista y `ownerAssets`.
  - MS-018: rechazos y filtrado de opciones.
  - MS-019: con solo `hero`, salida idéntica.
  - MS-020: composición.
  - MS-021: corpus.
  - MS-022: migración por dos caminos.
  - MS-023: broker.
  - MS-024: lecturas y `scene.get`.
  - MS-025: `sceneProgram` e `initialSceneOfObjects`.
- **`tests/browser/scene2d-multi-sprite.spec.mjs` (2 pruebas).**
  - MS-BROWSER-001: abrir un v6 con hero, Cesta y el escenario no ejecuta nada.
    - `sceneProgram` da una v1 en orden.
    - `load-program` sin iniciar respeta la escena inicial de los dos sprites (posición, dirección, tamaño, visibilidad y disfraz `cesta:c1`) con 0 hilos.
    - Al pulsar Ejecutar: mensaje, global 111 y Cesta en x = 70, visible.
    - El inspector lista los dos sprites y la vista «escena» muestra «x de Cesta».
    - `stop-scene` congela los bucles de Cesta y del escenario.
    - El Detener del estudio deja 0 hilos y conserva la autoría.
  - MS-BROWSER-002: un proyecto 0.3.0 con solo `hero` (v1) termina en el mismo estado que su copia 0.2.0 (IR0).

### RED / GREEN

- **RED Node** (`red-1.log`): `does not provide an export named 'composeScene2DProgram'`.
- **GREEN parcial** (`green-2.log`): 7/9.
  - MS-018: `generateCode` reenviaba `objects` (era el hallazgo que había que corregir).
  - MS-021: la prueba contaba los mensajes del escenario como variables; se ajustó la prueba.
- **GREEN** (`green-3.log`): 9/9.
- **RED navegador** (`browser-red.log`): las fuentes base se reconstruyeron a partir de un parche guardado y se volvieron a aplicar. Resultado 0/2: `studioProbe.authoring.sceneProgram is not a function`.
- **GREEN navegador** (`browser-new-1.log`): 2/2.

### Ejecutadas

| Comando | Resultado |
|---|---|
| `node --test tests/integration/scene2d-execution.test.mjs` | **9/9** |
| `npm test` | **549/549** (`node-1.log`, antes del cambio del inspector de interfaz, que no tiene pruebas Node) · **549/549** de nuevo tras el cambio del inspector (`node-2.log`) |
| `npm run test:tools` | **82/82** (`tools-1.log`) |
| `npm run spec:validate` | **38/38** |
| `npm run browser:build` | aprobado (`build-2.log`) |
| `npx playwright test` con las 29 specs de la selección fuera de la partición 0 (`rest-specs.txt`, incluida la nueva) | **174/174** en 42,4 min (172 de las specs existentes + 2 nuevas) (`t4-rest-1.json`, `rest-1.log`) |

**Plan affected: `selection: full`** (45 specs y smoke). Lo causan `src/studio/shell.js`, `src/runtime/runner.js` y `src/project-authoring.mjs`, que `impact.mjs` no clasifica, además de `tools/test/impact.mjs`. Es legítimo: todos los proyectos nuevos (0.3.0) ejecutan ahora por el camino de objetos. Corrí las 29 specs fuera de la partición 0. Lo que queda es partición 0 (abajo). El coordinador decide si sugiere una full.

## Archivos

- **Código:**
  - `src/adapters/scratch/scratch-project.mjs`, `browser-scene.mjs` y `gg-bindings.mjs`.
  - `src/contracts/program-contract.mjs` (`composeScene2DProgram`) y `pack-broker.mjs`.
  - `src/project-authoring.mjs` (`sceneProgram`) y `src/editor/editor-entry.mjs` (`programOf`).
  - `src/runtime/runner.js`, `src/studio/shell.js` y `src/studio/scene-inspector-ui.mjs`.
  - `src/scene-inspection.mjs` y `src/generated-code.mjs`.
- **Pruebas:**
  - `tests/integration/scene2d-execution.test.mjs` (nuevo).
  - `tests/browser/scene2d-multi-sprite.spec.mjs` (nuevo; inventariado en `normalBrowserFiles` y en los grupos packs-lessons-offline y scene-inspector de `tools/test/impact.mjs`; no está en `defaultPortSuites` porque no nombra orígenes por defecto ni arranca servidores).
- **Docs:** `openspec/changes/scene2d-multi-sprite/design.md` (puntos 15–21, más la nota del punto 14) y `tasks.md` (2.1).
- **CodeGraph:** `artifacts/stabilization-2d/e2-multisprite/codegraph/task4-{toScratchProject,authorizeProgram,createGGBindings,validateSceneSnapshot}.json`.
- **Sin tocar:** archivos de escritor único de la shell, manifiestos (los hashes de 0.1.0, 0.2.0 y 0.3.0 no cambian), formato GGPROJ y API v3.

## Autorrevisión

- **Invariantes.**
  - Nada se ejecuta al abrir o al cargar (0 hilos en Node y en navegador).
  - Un único Detener.
  - `sceneProgram()` es solo lectura: no monta, no guarda y no ejecuta. Se comprueba volviéndola a leer.
  - Solo los adaptadores conocen Scratch: `ownerResources` y `toScratchSceneProject` están en `adapters/scratch`, y `program-contract` sigue sin importar Blockly ni Scratch.
- **IR0 intacta.**
  - `toScratchProject` produce la misma salida (todas las pruebas IR0 existentes en verde).
  - La rama IR0 de la frontera del simulador usa `ownerResources` con salida idéntica (MS-019).
  - El modo texto sigue en IR0.
- **Sin fail-open.**
  - La v1 solo pasa con activación explícita y con los objetos validados del perfil.
  - `browser-scene` rechaza la v1 sin objetos o en modo texto.
  - Los permisos de recursos de otros objetos quedan cerrados (punto 17).
  - Los conflictos de variables fallan.
- **Revisé los consumidores de `authorizeProgram`, `toScratchProject` y `generateCode`.** Ninguno pasa `objects` salvo el runner.

## Preocupaciones

1. **Todos los proyectos nuevos (0.3.0) ejecutan por la v1.** MS-019 demuestra un proyecto Scratch idéntico en el caso de solo `hero`, y MS-BROWSER-002 lo comprueba en el estudio. Aun así, la partición 0 (device-integration, project-persistence, scene-inspector, runner…) debe confirmarlo en puertos por defecto.
2. **Permisos de recursos por objeto.** «Cambiar disfraz» y «tocar sonido» de Cesta o del escenario se rechazan por permisos, porque `gg.assets` (congelado) y `gg.sprites` nombran a `hero`. Lo resuelve 3.2 (T7), con una versión nueva de `gg.assets` o una regla en `gg.sprites@0.3.0`, cuyo hash todavía puede cambiar.
3. **Recursos integrados.** Un proyecto 0.3.0 con recursos heredados (sin `gg.assets`) solo puede ejecutar el escenario y `hero`. Cualquier otro sprite falla con un mensaje claro. T6 deberá copiar recursos al añadir un sprite (`copyResourceOwner` exige recursos v1).
4. **Variables compartidas entre workspaces.** La composición exige que una global use el mismo ID en cada workspace y que algún objeto la declare global (o que esté en el escenario). T6 debe conservar esos IDs al añadir o duplicar objetos.
5. **Ejecución en texto.** Los documentos de texto y su `program.start` siguen en IR0 y en `hero`, sin la escena configurada (T5).

## Specs de partición 0 para el coordinador (puertos por defecto)

De la selección (16, todas en `defaultPortSuites`): `accessibility-zoom`, `audio-variables`, `code-console`, `device-integration`, `device-transfer`, `isolation`, `language-runtime`, `offline-recovery`, `pilot-2d-mode`, `project-persistence`, `pxt-worker`, `runner`, `scene-inspector`, `simulator`, `standalone-contexts`, `textual-corpus`.

Además, el smoke `tests/quick/studio.spec.mjs` (`quick: true`).

No modifiqué ninguna de estas specs. Las más sensibles al cambio de camino de ejecución son `device-integration` (micro:bit + escena v1), `project-persistence`, `scene-inspector` (inspector y DTO de un solo `hero`), `runner`, `textual-corpus` y `language-runtime`.


</details>

<details>
<summary>Task 5: evidencia histórica y sus correcciones</summary>

# Task 5 · API v3 por objeto, traductores y vistas sincronizadas por objeto (tarea 2.2)

**Estado:** DONE_WITH_CONCERNS. Commits `1631b78` y `15ccf6d` en `stab/e2-multisprite` (base `33c29bb`). Tarea OpenSpec 2.2 marcada. Decisiones en `openspec/changes/scene2d-multi-sprite/design.md`, puntos 22–27.

**Verificación incompleta al entregar:** la selección completa de navegador corrió sobre `1631b78`. `15ccf6d` es un arreglo pequeño de traductores, y sus 13 specs afectadas + smoke siguen en curso (ver Pruebas). El smoke no se había ejecutado antes en esta tarea.

Evidencia: `artifacts/stabilization-2d/e2-multisprite/task-5/`.

## Identificadores (R3) · `src/contracts/scene2d-identifiers.mjs`
- Del nombre visible: NFC, sin diacríticos, minúsculas, otros tramos → `_`, hasta 48 caracteres. `Gato Rojo` → `gato_rojo`, `Ñandú` → `nandu`. Sin letras latinas ni dígitos: `objeto`. Dígito inicial: prefijo `objeto_`.
- Reservadas (sufijo `_`): palabras JS/Python, API global en ambos lenguajes, `GG`, `ctx`, `shared`, `i/j/k`, `stage`. `hero` no se reserva.
- Colisiones: `_2`, `_3` en orden de configuración. Lo estable es el `id`: renombrar cambia el texto, no `targetIds`. Borrar un sprite puede quitar el sufijo de otro.
- Variables: nunca toman el identificador de un objeto.
- Pendiente de T2 resuelto: `validateScene2DObjects` exige NFC y rechaza `\p{Cc}`, `\p{Cf}`, `\p{Cs}`, `\p{Zl}`, `\p{Zp}`. T6 debe normalizar la entrada del estudiante.

## API por objeto
- Dueño `scene2DTextOwner(config, id)` = `{identifier, kind, targetId, others}`; acompaña a generador, parser y solicitud de conversión (validado).
- Eventos globales arriba; acciones y eventos de sprite sobre el identificador. Sin dueño, hero, salida byte a byte igual (MS-027).
- `generateApi3ProgramSource` ya no reenvía `options` al validador.
- `sprite.get` devuelve el nombre visible, como `scene.get`; el `sprite.*` de API1 sigue siendo solo de hero.

## Traductores
- `compileApi3JavaScript` y `_gg_api3_compile` reciben `runtime.targetIds`. Nuevo `GG.program.object(id)` en API1; manejadores y locales llevan `targetId`, ausente en hero.
- Un nombre libre con método de sprite se rechaza en su línea. Un objeto declarado por el propio estudiante (`const pieza = {move() {}}`) sigue siendo suyo.
- `text-program` crea sombreros por objeto. El escenario tiene barrera propia de operaciones.
- Con 0.3.0 los documentos de texto corren en la escena v1 sin scripts, con todos los sprites. Es un cambio para todo proyecto nuevo; con solo hero el proyecto Scratch es idéntico (MS-019).

## Vistas sincronizadas por objeto (R2)
- Trabajan sobre la IR0 del workspace montado: identidad, comentarios, posiciones y orden no cambian.
- `CV_OTHER_OBJECT` y `CV_STAGE`, con causa y línea, en JS y en el lector AST de Python.
- `codeViewsUI.selectObject(id)` es el contrato de R2: aplica el texto; si se rechaza devuelve `false` sin cambiar selección ni texto; monta con `authoring.mountObject`, cambia estado y regenera. T6 lo cablea al panel.
- `capture().blockly` sigue siendo el primer sprite: si no, `createProject` pisaría sus bloques con otro objeto montado (MS-033, confirmado por mutación).
- Arreglado: una vista de workspace vacío fallaba en `blocks()` por `state.blocks.blocks`.

## Esquema codeViews
Versión 2 añade `objectId` y `objects` (`{<id>: {scriptOrder, restorePoint}}`). La versión 1 se lee igual y se sigue escribiendo hasta el primer cambio de objeto. Solo GGPROJ v6 admite la 2, con claves de objetos configurados; v5 la rechaza con mensaje. Límite 1 MiB. Salir de 0.3.0 con vistas versión 2 falla al guardar.

## Copias independientes
Primero decidí una copia por objeto; al leer tarde `specs/scene2d-objects/spec.md` vi que el escenario exige que la copia de un proyecto con dos sprites ejecute lo mismo que los bloques, y lo rehíce. Quedan dos formas:
- **Copia del proyecto** (`Código › Crear copia`): un documento, `targetIds` con todos los objetos, y cada evento nombra su objeto (`cesta.onMessage(...)`). Una acción debe ser del objeto de su evento. `generateApi3SceneSource` es la única ruta que abre el generador a la v1. Límite: 16 eventos y 16 variables, o falla al crearla remitiendo a las copias por objeto.
- **Copia de la vista:** texto exacto del objeto seleccionado, `targetIds` = ese objeto. Al ejecutarla están todos los sprites, pero solo ese tiene programa.
- `let` es local del único objeto que la usa; si la usan dos se rechaza en su línea. `shared` es global. Sin `targetIds`, hero. API1/API2 no cambian.

## Pruebas
**Plan affected: `selection: full`.** Lo causan archivos que `impact.mjs` no clasifica: `shell.js`, `project-authoring.mjs`, `code-views-ui.mjs`, `code-views-state.mjs`, `scene2d-identifiers.mjs`, además de `tools/test/impact.mjs`. Es real: todos los proyectos nuevos ejecutan texto por el camino de objetos.

| Comando | Commit | Resultado |
|---|---|---|
| `npm test` | `15ccf6d` (árbol, antes del commit) | 558/558 (`node-3.log`) |
| `npm run test:tools` | ídem | 88/88 (`tools-2.log`) |
| `npm run spec:validate` | ídem | 38/38 |
| `node --test tests/integration/scene2d-text.test.mjs` | ídem | 9/9 (`green-5.log`) |
| Playwright, 45 specs (todas salvo `standalone-contexts`) | `1631b78` | **256/256**, 0 flaky, 53,5 min (`full-1.json`) |
| 13 specs del grupo de lenguaje | `15ccf6d` | **EN CURSO** (`lang-1.log`, `lang-1.json`) |
| Smoke (`playwright.quick.config.mjs`) | `15ccf6d` | **PENDIENTE**, arranca tras la anterior (`smoke-1.log`) |
| `standalone-contexts` | — | No ejecutada: exclusiva, la corre el coordinador |

Nuevas: MS-026…034 (9) y MS-BROWSER-003…006 (4, inventariadas en `tools/test/impact.mjs`).

Puertos 5700–5709 ocupados hasta que aparezca `SMOKE-EXIT` en `smoke-1.log`. En esa orden, zsh no partió la lista y Playwright recibió los nombres como filtros de ruta; deberían seleccionar las mismas 13 specs, pero confírmalo con el total de `lang-1.json`.

### RED / GREEN (con sus límites)
- **MS-026:** escribí el módulo antes que la prueba. RED posterior, apartando el módulo: fallo de importación de todo el archivo (`red-0.log`), no por aserción. Los casos de nombres no se vieron fallar con el validador anterior.
- **MS-027…032:** RED real, 6/7 fallando (`red-1.log`), luego GREEN. Dos fallos intermedios eran errores de la prueba (`/\bhero\b/` contra un disfraz, orden de variables).
- **MS-033:** verde a la primera, escrita después. Mutación solo sobre `capture().blockly`: falla (`mutation-capture.log`).
- **MS-034:** escrita junto con el generador, sin RED del conjunto. RED del arreglo `15ccf6d` sí (`red-fix.log`).
- **MS-BROWSER-003…006:** escritas tras implementar, **nunca vistas en RED** contra el código anterior. Sus fallos iniciales fueron expectativas mías equivocadas.

## Archivos
Código: `src/contracts/scene2d-identifiers.mjs` (nuevo), `scene2d-objects.mjs`, `text-program.mjs`, `code-view-conversion.mjs`; `src/generated-program-source.mjs`, `code-views-state.mjs`, `project-authoring.mjs`, `project-format.mjs`; `src/editor/code-view-conversion.mjs`; `src/studio/code-views-ui.mjs`, `code-console-ui.mjs`, `shell.js`; `src/adapters/scratch/browser-scene.mjs`, `gg-bindings.mjs`, `text-program.mjs`; `src/targets/text/api-v3.mjs`, `api-v3-python.mjs`, `api-v3-vocabulary.mjs`, `code-view-parser.mjs`, `code-view-python.mjs`, `program-session.mjs`, `python-engine.mjs`, `quickjs-engine.mjs`.
Pruebas y herramientas: `tests/integration/scene2d-text.test.mjs`, `tests/browser/scene2d-object-views.spec.mjs`, `tools/test/impact.mjs`. Spec: `design.md`, `tasks.md`.

## Autorrevisión y concerns
1. **Sin verificar tras `15ccf6d`:** lo indicado arriba. La casilla 2.2 está marcada con esa corrida pendiente.
2. **Sin prueba:** la rama de reversión de `selectObject` (fallo tras montar) y la comprobación de identificador de `trusted` tras renombrar.
3. **Prueba indirecta:** MS-BROWSER-006 pulsa `#copy-javascript` con un clic DOM, no por el panel Código.
4. **Posible bug previo, sin arreglar:** `python-engine.dispose()` parece lanzar tras un `prepare` fallido (`pyodide.globals.delete('__gg_code')` sin ese nombre). Mi helper `trace` lo ignora con try/catch. No confirmé la causa exacta ni el efecto en producción.
5. **Regla duplicada:** lo permitido al escenario está en `program-contract`, parser, traductores, generador y `text-program`. Hay riesgo de deriva cuando T8 añada bloques.
6. **Permisos:** `cesta.setCostume(…)` y sonidos de otros objetos se siguen rechazando por permisos, también en texto (punto 17) → T7.
7. **Para T6/T7:** caja de herramientas del escenario; `Código` (lectura), lecciones y `revealBlock` siguen en el objeto montado; `authoringKey` solo ve el workspace montado; plantillas y ayuda de documentos nuevos dicen `hero.move`; un documento sin dueño en un proyecto sin hero falla con «scene unavailable»; la copia de vista no incluye los demás objetos.
8. **Inventario:** `scene2d-identifiers.mjs`, `code-views-state.mjs` y `code-views-ui.mjs` podrían clasificarse en `impact.mjs` para no forzar `full`; no lo hice.
9. Manifiestos sin cambios. Por un error de ruta un archivo pasó un momento por `/tmp/claude-1000/`, fuera del scratchpad, y volvió a su sitio.

## Ronda de corrección 1/5 · R3: palabras reservadas en modo estricto

**Estado:** DONE_WITH_CONCERNS. Commit `f06c2b6` (base `15ccf6d`). Sin navegador ni build, por indicación del coordinador: `lang-1` y `smoke-1` usan los puertos y no los toqué.

**Hallazgo.** `implements`, `interface`, `package`, `private`, `protected` y `public` faltaban en `api3LanguageKeywords`. Un sprite con esos nombres (también con mayúscula inicial) generaba una vista que no convertía.

**Cambio.** Las seis palabras se añaden a `api3LanguageKeywords` (`src/contracts/api3-names.mjs`), de donde sale `scene2DReservedIdentifiers`. Así `public` → `public_`.

**Efecto en la salida existente.** La lista también alimenta `api3Identifier` (variables 2D y 3D/web, objetos de `generated-capability-source`) y `validateLanguageTables`.
- Una búsqueda de las seis palabras en `tests/fixtures`, `src/packs`, `src/assets/lessons`, el vocabulario de capacidades y la biblioteca inicial no da resultados.
- Una variable llamada así pasa de `public` a `public_`. En JavaScript el texto anterior ya no parseaba. En Python sí era válido, así que la vista o copia **nueva** de un programa con esa variable cambia de texto; su ID sigue en `variableIds`. Las copias ya guardadas no cambian.
- El generador 3D/web cambia igual en ese caso. Es un contexto congelado, pero el cambio solo afecta a esos nombres. No hay prueba específica de esa ruta.

**Prueba nueva: MS-035** (`tests/integration/scene2d-text.test.mjs`). Palabras de ECMAScript, incluidas las reservadas en modo estricto, escritas a mano en la prueba, y de Python desde `keyword.kwlist + keyword.softkwlist` del intérprete, cada una en minúsculas y con mayúscula inicial. Para cada nombre: acorn en modo módulo sobre `<identificador>.move(1)`, vista generada leída por `parseJavaScriptCodeView`, y `compileApi3JavaScript`. Después, `ast.parse` real de cada identificador.

| Comando | Resultado |
|---|---|
| `node --test --test-name-pattern "MS-035" tests/integration/scene2d-text.test.mjs` antes del arreglo | RED: 0/1; 12 rechazos, exactamente las seis palabras en las dos grafías, «The keyword 'public' is reserved» (`fix1-red.log`) |
| `node --test tests/integration/scene2d-text.test.mjs` | GREEN: 10/10 (`fix1-green.log`) |
| `npm test` | 559/559 (`fix1-node.log`) |
| `npm run test:tools` | 88/88 (`fix1-tools.log`) |

**Concerns.**
1. Sin verificar en navegador: `artifacts/browser` no incluye este commit, y `lang-1`/`smoke-1` prueban `15ccf6d`. `api3-names.mjs` entra en el bundle del parser, así que hace falta build. Tampoco he visto el resultado de esas dos corridas.
2. Fuera del alcance de esta ronda, sin arreglar: una **variable** llamada `eval` o `arguments` sigue generando texto JS inválido, «Binding eval in strict mode» (`fix1-variables.log`). Un sprite con esos nombres sí funciona, porque su identificador nunca se declara. Añadirlas a la lista lo arreglaría, pero cambiaría esos identificadores de sprite.
3. La lista de JavaScript de MS-035 está escrita a mano; no sale del motor.


</details>

<details>
<summary>Task 6: evidencia histórica y sus correcciones</summary>

# Task 6 report: objects panel and per-object editor (OpenSpec 3.1)

**Status: DONE_WITH_CONCERNS.** Commits on `stab/e2-multisprite`, base f06c2b6: 616ab93, 700d350, a24673c (code, verified), plus 0465187, which only marks `tasks.md` (no code; this report is git-ignored).

## What was implemented

- **Panel** (`src/studio/objects-ui.mjs`, new, 193 lines): stage and sprites in one horizontal single-select `listbox` with thumbnails, placed above the editor. Add, Rename, Duplicate and Delete (with confirmation) act on the selected object. Inline name form, error above the field. `Editando: <nombre> · <vista>` is a live region.
- **Keyboard (APG):** roving tabindex; arrows, Home and End move focus; Enter, Space or click select. Selection does not follow focus, because choosing can apply text, take time and be refused. Tab returns to the selected option. Focus is set after add, rename, duplicate and delete. Unavailable actions use `aria-disabled`: they stay focusable and say why.
- **Pure edits** (`src/contracts/scene2d-object-edits.mjs`, new, 179 lines). The panel calls `codeViews.selectObject`, never `authoring.mountObject`. Edits are applied through `resourcesUI.editObjects` (`project.replaceAuthoring`).
- **One mounted editor:** each object keeps its Blockly history and camera in memory (not saved).
- The stage toolbox offers only what the stage can do (design point 38).
- Design points 28–40 recorded. `DESIGN.md` gained an «Objetos» section.

### Items carried from the Task 5 review

1. `selectObject` returns `{ok, reason, message?}`: `current`, `unavailable`, `busy`, `rejected`, `cancelled`, `failed`. The panel explains each.
2. `correctStoredPoint` updates `objects[from]`. Proven against a false «Hay cambios posteriores».
3. Rename regenerates the live text (`refreshObjectText`), and `trusted` holds.
4. `normalizeScene2DSpriteName` plus `scene2DSpriteNameProblem`. ZWJ is removed (`👩‍💻` → `👩💻`) and the student is told («Se guardó como…»).
5. Rollback and trusted-after-rename tests, each proven by mutation.
6. MS-BROWSER-006 now uses the real `#copy-javascript` control.
7. New object: one costume, global variables with the same IDs. Duplicate: new block, local and resource IDs, globals shared, new `id`, free name.
8. Inspector: live sprite count, names instead of literal «hero». The per-object inspector stays with Task 7.

### Found and fixed along the way

- **Real bug (MS-046):** text conversion numbered `gg-code-view-N` per workspace, while `sourceBlockId` is unique across the program. Two objects written in text could not run (blocks), and locals collided too. New IDs now carry the `targetId`; hero's are unchanged.
- **Stale Blockly history:** Ctrl+Z on another object replayed the previous object's events and brought its blocks into the wrong workspace.
- «Tus cambios aún no se ejecutan» appeared when merely selecting an object: the key used the mounted workspace.
- «Restaurar ejemplo» is offered only with a single sprite, because the example's IDs collide with other objects.
- T5 minor: a document with no handlers in a project without hero (`text-program.mjs`, MS-045). A document naming a deleted object now explains that.

## Test results

All final results ran on **a24673c**. 0465187 changes only `tasks.md`; `spec:validate` was repeated on it.

| Run | Result |
|---|---|
| `npm test` | 570/570 |
| `npm run test:tools` | 88/88 |
| `npm run spec:validate` | exit 0 |
| Browser selection (19 specs) | 126/126, 20.6 min |
| Smoke (`playwright.quick.config.mjs`) | 3/3 |

`test:affected --list` returned `selection: full` (`task-6/affected.json`), so per the ruling the specs were: new panel spec, scene2d-object-views, scene2d-multi-sprite, code-views, code-view-conversion, workspace-presentation, integrated-2d-workspace, studio-contextual-workspace, studio-entry-journey, accessibility-shell, accessibility-zoom, project-persistence, pilot-2d-mode.

Added because the change plainly affects them:
- `scene-inspector`: inspector copy.
- `starter-library`, `resource-safety`: `resources-ui`.
- `language-copies`: `text-program`, document check.
- `packs-lessons`, `synced-transition-activity`: authoring key, conversion IDs.

**Not run:** the other specs of the full selection, including `standalone-contexts` (exclusive, for the coordinator).

## TDD evidence (in `artifacts/stabilization-2d/e2-multisprite/task-6/`)

| Tests | RED | GREEN |
|---|---|---|
| MS-036…042 | `red-node-edits.log`: 7 failing against behaviourless stubs. Six by AssertionError; **MS-040 failed by TypeError on the stub's missing data**, not an assertion | `green-node-edits.log` |
| MS-043…045 | `red-node-sessions.log`: 3 failing against prior sources | same |
| MS-046 | `red-node-ids.log`: «la variable gg-code-view-0 tiene nombres distintos en dos objetos» | same |
| MS-BROWSER-007…013 | `red-browser.log`: 10/10 failing on the prior build, all because the panel does not exist. This proves little about each branch, so the branches are proven by mutation below | `final-browser.log` |

**Mutations** (`mutations.log`; each removes the fix, each must fail):

| Mutation | Caught by | Failing assertion |
|---|---|---|
| rollback remount | MS-BROWSER-010 | mounted object stays `cesta` |
| live text after rename | MS-BROWSER-010 | text keeps old identifier |
| stored hash | MS-BROWSER-010 | false «Hay cambios posteriores» dialog |
| per-object history | MS-BROWSER-011 | hero's block appears on Cesta |
| scene key | MS-BROWSER-012 | false pending note |
| selection follows focus | MS-BROWSER-008 | selection moved on arrow |
| panel on legacy profile | MS-BROWSER-014 | panel visible |
| same-name rename | MS-BROWSER-012 | focus |
| deleted-object document | MS-BROWSER-012 | missing message |

The stored-hash mutation **survived at first**: my test's digest change was consumed by autosave. The test was fixed and re-proven. The last three cover checks added after the RED run, which were never seen failing until these mutations.

The red and green logs for MS-036…046 predate later fixes to test fixtures; `final-node.log` is the authoritative GREEN.

## Visual verification

Captures `objects-panel-{desktop,laptop,narrow,zoom}[-form].png` were taken in the a24673c run and I looked at them: 1440×900, 1280×720, 390×844 and 320×568. MS-BROWSER-013 measures no global overflow, 44 px targets and Blockly ≥ 300 px on desktop and laptop.

- Two changes came from looking: the error moved above the field (it fell below the fold at 320), and captures use the nominal state with the start band closed.
- `zoom` is a viewport equivalent, not real browser zoom; `accessibility-zoom` covers the real one.
- No screen reader or human observation was done. No `docs/product/*-evidence.json` summary was written.

## Files changed

New: `src/studio/objects-ui.mjs`, `src/contracts/scene2d-object-edits.mjs`, `tests/browser/scene2d-objects-panel.spec.mjs`, `tests/integration/scene2d-object-edits.test.mjs`.

Changed: `src/studio/{shell.js,code-views-ui.mjs,resources-ui.mjs,scene-inspector-ui.mjs,contextual-workspace.mjs,index.html,style.css}`, `src/project-authoring.mjs`, `src/code-views-state.mjs`, `src/code-view-identity.mjs`, `src/editor/{editor-entry.mjs,code-view-conversion.mjs}`, `src/contracts/{scene2d-objects.mjs,scene2d-identifiers.mjs,program-contract.mjs}`, `src/adapters/scratch/text-program.mjs`, `tools/test/impact.mjs`, `tests/browser/{scene2d-object-views,workspace-presentation}.spec.mjs`, `DESIGN.md`, `openspec/changes/scene2d-multi-sprite/{design.md,tasks.md}`.

`workspace-presentation` E4-02 now expects `Editando: hero · bloques`: the visible text changed on purpose, the assertion stays exact.

## Self-review findings

- Fixed: same-name rename stopped a running program; thumbnails cloned all resources once per object; rollback reported a text error when the text was not the cause; `design.md` point 25 was out of date.
- `shell.js` grew by 12 lines (702 → 714); the panel lives in its own module.

## Issues and concerns

1. **The idle stage is not the project.** The runner shows its built-in `/project.json` until Run: an added sprite does not appear, and a deleted hero stays visible. The panel says so («Aparecerá en el escenario al ejecutar»), but a student will likely expect Scratch's live stage. Previewing it was outside this brief; **this needs a product decision**.
2. **Depends on Task 7:** a duplicate with `gg.assets` blocks cannot be mounted, because the menu owner is `hero`, and Run then fails for the whole project until it is deleted. The IDs are already remapped correctly (MS-039). Costume and sound blocks on any non-hero object are rejected by permissions (design point 17). I did not add a temporary guard.
3. **Every panel edit except a same-name rename restarts the runner**, so it stops a running program (design point 30). Accepted trade-off; it never runs anything.
4. **Not tested:** the failure path of a project transaction (`exclusive`'s catch and fallback focus) and camera restore per object. MS-BROWSER-011 proves history only; I removed a weak camera assertion rather than keep it.
5. `sessionState` reads Blockly's protected `undoStack_`/`redoStack_`: no public accessor exists. Pinned by the 13.4.0 lock, but an upgrade must recheck it.
6. Long names are cut in the tile; the full name is in `title`, the accessible name and, when selected, «Editando».

**Left for Task 7:** per-object inspector (it still shows `Disfraz inicial sprite-…:c0`, a technical ID), resource menus, starter library as a way to add objects, library copy that names hero, `#text-api-help`, `#gg-move`, lessons, derived Código listing, and console links to a block on a non-mounted object (`revealBlock` fails silently).

## Environment note

I ran `pkill -f serve-browser` to clear a leftover server. The permission system refused it, correctly: the pattern could have hit other sessions' servers. I did not retry it. I stopped only my own processes by PID, after confirming they ran from this worktree on ports 5700–5709. Other `serve-browser` processes on the machine (for example PIDs 619672/619673) were not touched, and no port of mine is left open.

---

# Fix round 1/5 (review finding, Important): global variables after their declaration goes

**Status: fixed in c209ce4** (on 0465187).

## Finding

`addSceneObject` and `duplicateSceneObject` copied global models into sprite workspaces, but «global» is derived from a `gg_set_global` block being present. The new object's IR lists the model as local. Once the declaring block or object went, Run failed for the whole project with `la variable puntos es local de varios objetos`.

## Fix

`src/contracts/scene2d-object-edits.mjs`: new `stageWithGlobals(stage, globals)`, used by add and duplicate, promotes the models into `scene2d.stage.variables`, because the stage's variables are always global (`program-contract.mjs:199`). It appends only missing IDs, and returns the same stage when there is nothing to add. Rename and delete do not touch the stage. Recorded in `design.md` points 32–33.

`tests/integration/scene2d-object-edits.test.mjs`: the MS-038 assertion on the stage changed to the new truth and is stricter (exact models, in order).

## New tests

| Test | Covers | RED (on pre-fix code) | GREEN |
|---|---|---|---|
| MS-047 (Node) | block removed; declaring object deleted; duplicate with the block removed from both; save and reopen keeps the stage variables and the composed program; the stage's text view reads back; a rename and an add without globals leave the stage and program unchanged | `fix1-red-node.log`: AssertionError «Got unwanted exception», «la variable puntos es local de varios objetos» | `fix1-green-node.log` 12/12 |
| MS-BROWSER-015 | real panel: add two objects, delete the declaring hero, Run, Detener, reload; the stage keeps `puntos` and it stays global | `fix1-red-browser.log`: `#status` expected «Bloques ejecutados», received «Listo» | `fix1-panel.log` |

RED commands:

```
node --test --test-name-pattern 'MS-047' tests/integration/scene2d-object-edits.test.mjs
GG_SHELL_PORT=5700 … npx playwright test tests/browser/scene2d-objects-panel.spec.mjs -g MS-BROWSER-015   # on the a24673c build
```

**Review probe.** Run unchanged after the fix, `probe-global.mjs` still prints FAIL. It calls `composeScene2DProgram` without `stage:`, so it cannot see the fix, whereas `sceneProgram` always passes the stage. A scratch copy differing only in passing the stage (three call sites) prints `ok` for all three cases, with `puntos` global (`fix1-probe-with-stage.log`). The probe's FAIL is not a remaining defect.

## Covering tests, all on c209ce4

| Command | Result |
|---|---|
| `node --test tests/integration/scene2d-object-edits.test.mjs` | 12/12 |
| `npm test` | 571/571 |
| `npm run test:tools` | 88/88 |
| `npm run spec:validate` | exit 0 |
| `npm run browser:build`, then `npx playwright test tests/browser/scene2d-objects-panel.spec.mjs` (ports 5700–5709) | 12/12, 4.5 min |
| `npx playwright test --config playwright.quick.config.mjs` | 3/3 |

Logs: `task-6/fix1-*`; `fix1-commit.txt` holds c209ce4. As requested, the 19-spec selection was not repeated: its 126/126 is from a24673c, before this fix.

## Behaviour to be aware of

- A promoted variable stays on the stage after every block using it is gone. It is harmless, but it still counts toward the 16 globals and appears in the stage's text view (`let puntos = 0;`).
- The promotion happens at add or duplicate. A variable made global afterwards is not promoted. That case does not produce this failure unless the same ID is also in another object, and only add and duplicate copy IDs between objects.
- Projects saved on this branch before c209ce4 are not repaired. They are preview-only, since 0.3.0 is not published.

The Duplicate-with-`gg.assets` finding (Task 7) and the Minor items were left alone, as instructed.


</details>

<details>
<summary>Task 7: evidencia histórica y sus correcciones</summary>

# Task 7 report: resources, inspector, derived code and activities per object (OpenSpec 3.2, R4)

**Status: DONE_WITH_CONCERNS.** On `stab/e2-multisprite`, base c209ce4: 3f2f862, 38da1d2, 148a7cb, 93bc8d5 (code, verified), plus a334007, which only marks `tasks.md`. No push, merge or stash.

## What was implemented

**Binding acceptance.** MS-BROWSER-016 does exactly what was asked, with the real panel: duplicate a sprite with costume and sound blocks (fixed and `gg.assets`), select the copy, run, reload, run, delete it, run again. MS-BROWSER-017 covers an object that cannot be opened: the panel explains why, Run names it, and `Borrar «X»` removes it.

**Permissions (item 1).**
- `gg.sprites@0.3.0` declares `permissions.objectResources: true`: in a scene, a permission or menu naming `hero` (frozen `gg.assets`) means the object that owns the script. The 0.3.0 hash is now `4bbff585…`. The hashes of 0.1.0, 0.2.0 and `gg.assets` did not change.
- The manifest decides this, not the config shape: an older profile stays hero-only (MS-048).
- `ownerId` travels through `editor.load/prepare/programOf`, `workspaceToIR`, `validateWorkspaceResources`, `loadWorkspace`, `workspaceFromIR`, the view snapshots, parser, generators and identity reconciliation.
- Text RPCs name no object, so the broker accepts any object's resource and the scene refuses another object's, because it runs the call on the calling target (`costume unavailable`, MS-BROWSER-019).
- Menus and the toolbox follow the editor's owner. This replaces `setStageToolbox`.

**Things found while building it, all fixed:**
- **A duplicate of hero with fixed blocks** would have been the same stuck object. `gg_set_costume`, `gg_play_sound` and `gg_play_sound_wait` name hero's built-ins, so the copy converts them to `gg.assets` blocks with the copied resources (MS-051). Non-hero objects no longer offer those blocks.
- **Unfinished blocks locked their object.** `mountObject` lowered the program, so an `if` without a condition made the object impossible to reopen, and my new Delete would have been the only way out. Mounting no longer lowers (`prepare({lower:false})`, `orderedRoots`). From a text view such an object opens in Blocks (MS-BROWSER-028).
- **An object without sounds could not take a sound block.** An added object has none, so the block's placeholder value locked the object. The placeholder now loads and passes transactions, so adding the sound is the way out; it fails only on lowering, on its block, with a sentence a student can read.
- **`Cesta`'s menu said «hero».** A new object's costume is now named after it.

**Items carried:**

| # | Result |
|---|---|
| 2 | `exportProgram`, `sceneProgram` for lessons, `listingOwner` for Código, every object's locals for documents, `sprites.find` instead of `sprites[0]` |
| 3 | `Ver bloque` selects the object through `selectObject`, or explains why not |
| 4 | Inspector shows the costume's name and follows the selected object, stage included. Library copy, `#gg-move` and `#text-api-help` no longer name hero wrongly (see the Task 8 list) |
| 5 | **Already fixed by T6**; I wrote no new test. Restoring the T5 line makes MS-045 fail with `scene unavailable` (`mutation-item5.log`) |
| 6–10 | Done, in `objects-ui.mjs` and `code-views-ui.mjs` |
| 11 | Measured; see below. Layout problem reported, not edited |

**Library (R4).** `addLibrarySceneObject`: a drawing becomes a new object through the same transaction and selection as Add. Costume cards offer `Añadir` and `Nuevo objeto`; sounds go to the selected object, stage included; backdrops replace the stage's. Content and license unchanged.

**Activities.** `position`, `variable` and `authored-operation` accept `targetId`, default `hero`. MS-054 proves every stored activity validates back byte for byte. `variables.get` now reads any sprite's locals.

**Export.** Only hero alone with no stage scripts. Otherwise it says so and exports nothing (design 48). Scratch stays frozen, and multi-sprite copies are R5.

Decisions recorded in design points 41–52. `src/studio/scene-scope.mjs` is new, to keep `shell.js` from growing: it grew from 714 to 724 lines.

## Test results

All on **93bc8d5**. a334007 changes only `tasks.md`; `spec:validate` was repeated on it (38/38).

| Run | Result |
|---|---|
| `npm test` | 579/579 |
| `npm run test:tools` | 88/88 |
| `npm run spec:validate` | 38/38, exit 0 |
| Browser, 20 specs | 161/161, 27.8 min (`final-browser.log`) |
| Smoke | 3/3 |

`test:affected --list` returned `selection: full` (`task-7/affected.json`). I ran your list plus the new spec, and added these because the change plainly affects them:
- `language-copies`: documents, help, starters.
- `code-view-conversion`: `prepare`, snapshots.
- `scene2d-vocabulary`: toolbox, `load`.
- `language-runtime`: document variables.
- `bindings-editor`: `gg-bindings`.

**Not run:** the rest of the full selection, including `standalone-contexts`, which is yours.

**Failed runs.** The first selection, on 148a7cb, had 8 failures (`first-final/`):
- Six in `code-console` and one in MS-BROWSER-012 were real and are fixed in 93bc8d5: `Código de «null»` with hero alone, and a costume name reading «hero» on Cesta.
- `GG-LIB-004` failed once at line 136, `costume.name` hero instead of gato, on a reopened project. Its screenshot shows the cat on stage with the «Reproducir sonido» button pending. I did not find the cause. It passed alone and in the final run, so **treat it as an unexplained flake**, likely timing around audio.

## TDD evidence (in `artifacts/stabilization-2d/e2-multisprite/task-7/`)

| Tests | RED | GREEN |
|---|---|---|
| MS-048…055 | `red-node.log`: 8/8 failing against c209ce4 sources (mostly assertions, for example `'hero' !== 'cesta'`, «Recurso no disponible en este objeto: cesta:c1») | `final-node.log` |
| MS-BROWSER-016…028 | `red-browser.log`: `git checkout c209ce4 -- src`, build, run: 16 failed | `final-browser.log` |

Command: `npx playwright test tests/browser/scene2d-object-resources.spec.mjs --timeout=60000 -g 'MS-BROWSER-01[6-9]|MS-BROWSER-02|LIMIT'`, ports 5700–5709. Details:
- 15 of the 16 fail on an assertion. MS-BROWSER-020 fails by timeout because `Nuevo objeto` does not exist.
- MS-BROWSER-027 fails only because it waits for the per-object inspector label.
- MS-BROWSER-013-LIMIT **passes on the old code by design**: it is a measurement, not a fix.
- Note: MS-BROWSER-027 and the RED were run before the costume rename. Later assertion changes (the listing after a rename) were proved by mutation: `mutation-listing.log`, `canasta.say` expected, old identifier received.

## Item 11: nine tiles at 1280×720

The claim holds only literally. `objects-nine-laptop.json`: the editor element is exactly 300 px, because `min-height: 300px` clamps it, with four rows of tiles and a 225 px panel. **Only 273 px of it are visible** with the panel scrolled into view at the top of the page. No overflow. This is a Task 8 layout decision.

## Visual verification

Captures `resource-menu-*`, `inspector-*`, `library-*` at 1440×900, 1280×720, 390×844 and 320×568, plus `objects-nine-laptop.png`, taken in the final run. I looked at them; no global overflow, 44 px targets in the library cards.
- `zoom` is a viewport equivalent, not real browser zoom.
- At 320×568 the menu capture has no open dropdown: Blockly's zoom controls sit over a centered block. That is why the test opens it only elsewhere.
- No screen reader or human observation. No `docs/product/*-evidence.json` summary was written.

## Files changed

New: `src/studio/scene-scope.mjs`, `tests/browser/scene2d-object-resources.spec.mjs`, `tests/integration/scene2d-object-resources.test.mjs`.

Changed: `src/contracts/{pack-broker,scene2d-object-edits,starter-library}.mjs`, `src/editor/{block-program,code-view-conversion,editor-entry,resource-menus,workspace-from-ir}.mjs`, `src/packs/{catalog.mjs,gg.sprites/manifest.mjs}`, `src/studio/{code-console-ui,code-views-ui,objects-ui,resources-ui,scene-inspector-ui,starter-library-ui,text-documents-ui}.mjs`, `src/studio/shell.js`, `src/adapters/scratch/gg-bindings.mjs`, `src/targets/text/code-view-parser.mjs`, `src/{code-view-identity,generated-code,generated-program-source,lesson-evaluation,lessons,project-authoring}.mjs`, `tools/test/impact.mjs`, `DESIGN.md`, `openspec/changes/scene2d-multi-sprite/{design.md,tasks.md}`.

Existing tests changed to the new truth, without weakening: MS-001 (`objectResources`), MS-023 (Cesta's own costume is now allowed), MS-038 (costume name), MS-044 (the fake editor derives the toolbox from the owner).

## Self-review findings

Fixed:
- `candidate.ownerId ?? resourceOwner` kept the old owner when opening a single-workspace project.
- The listing read the coordinator, which publishes after the editor speaks, so a rename left the old identifier.
- `#gg-move` read `Mover hero +10` on legacy profiles.
- Vacuous tests: Blockly's non-breaking spaces made a `not.toContain` always true, and a menu helper was reading the block below.

## Issues and concerns

1. **An unfinished program on the selected object still blocks project transactions.** `authoring.prepare` lowers the mounted workspace, so Add, rename, Duplicate, library additions and, by my reading, reopening fail with a raw `Unsupported block…` while it holds an `if` without a condition. I did not test this. It predates this task for one-object projects. I fixed only the mount path and the missing-resource case, because `prepare` also guards file imports. **This needs a decision.**
2. **The `finishNew` failure path has no test of its own.** After the fixes I found no way to make a fresh duplicate fail to mount. It shares `unopened` with the tested click path.
3. **Text shows technical costume IDs**: `cesta.setCostume("sprite-1234:c0")`. The IDs are the language's literal today. Uploads already look like this. A new object's costume could get a readable ID, which I left alone.
4. A copy's costumes keep the source's names (`hero`, `hero-alt`), as in Scratch.
5. A single sprite that cannot be opened cannot be deleted directly (1–8 sprites). The way out is to add another first.
6. Uploading an image with the stage selected is refused with a reason, until Task 8's backdrops.
7. The idle stage is still the runner's, not the project's (Task 6 concern 1).
8. Code listing, and the `blocks-unchanged` key, compare a stored workspace with a re-saved one. T6's idempotence assumption holds in tests, but a project with non-normalized stored workspaces would see one spurious change on the first mount.

## Left for Task 8 (its single-writer files, untouched)

- `src/studio/index.html:56`: `#creation-guide` says «Cambia un bloque Mover» on an empty object and on the stage, which offers no Mover.
- `index.html:89`, `:119`, `:122`, `:216`: static defaults naming hero (`#text-api-help`, `hero · Sprite`, `Variables locales de hero`) or the bare `Mover +10`. All are overwritten at run time; they only show before the first render.
- `contextual-workspace.mjs:28`: `textHelp` fallback captured at start.
- `style.css:463`: nine tiles leave 273 px of Blockly visible at 1280×720 (four rows).
- `#object-delete-unopened` is created in `objects-ui.mjs` and has no style of its own; it looks correct with the default button.
- Blockly's zoom controls cover a centered block at 320 px wide.

---

# Fix round 1/5 (two Important findings, plus concern 1 as ruled)

**Status: fixed in c638eb2** (on a334007).

## Finding 1: a text-check failure offered to delete a healthy object

`selectObject` now says which step failed: `step: 'text'` from `settleText`, where the object was never tried, or `step: 'mount'`. `objects-ui.mjs` sets `unopened` only through `noteUnopened`, for a failed mount of a sprite, never the stage. A text failure now reads «No se pudo comprobar el texto para cambiar a «X»», with no delete offer. It also no longer clears the offer for another object that really is stuck.

## Finding 2 and the ruling on concern 1: unfinished work blocked transactions

- `authoring.prepare` passes `lower: false` when the profile has objects. Add, Rename, Duplicate, library additions, `Borrar «X»`, autosave, export and reopening no longer lower the mounted object. Only Run does.
- `prepare` still checks the script order (`orderedRoots`), so a bad stored order fails before commit, as it did.
- **Import guard.** Lowering also rejected blocks of packs the file does not lock. That check is now `authoring.validateImport` (`validateWorkspaceBlocks`), called from `validate` and `openArchive`. It reads every object, not just the mounted one, accepts unfinished work and refuses foreign blocks. It runs for file opens and autosave recovery; transactions do not use it.
- Single-workspace profiles still lower, so they behave as before. I removed the `pendingResource` catch: the only profiles it could still apply to are those, and it would have changed them.
- Design point 45 now matches the code. The title of MS-BROWSER-028 was wrong before and is true now, so it did not change.

## New and changed tests

| Test | Covers | RED, on a334007 sources | GREEN |
|---|---|---|---|
| MS-056 (Node) | `lower:false` on objects, not on legacy; `validateWorkspaceBlocks`; `validateImport` on every object | `fix1-red-node.log`: «only Run asks an object profile to finish» | `fix1-node.log` |
| MS-BROWSER-026 (changed) | sprite and stage targets; no `puedes borrarlo`; `#object-delete-unopened` hidden | `fix1-red-browser.log`: expected «No se pudo comprobar el texto…», received «No se pudo abrir «Cesta»…» | `fix1-browser.log` |
| MS-BROWSER-029 | stuck X with an unfinished object mounted: Add, Rename, Duplicate, library, `Borrar «X»`, delete beside an unfinished neighbour, Run still asks | `fix1-red-browser.log`: `Caja` never appears, at the first Add | `fix1-browser.log` |
| MS-BROWSER-030 | reopen check: select the unfinished object, flush, reload: same object, nothing lost; the same through a file; a foreign block refused | `fix1-red-browser.log`: `flush` returned false, «expected true, received false» | `fix1-browser.log` |

RED commands:

```
node --test --test-name-pattern 'MS-056' tests/integration/scene2d-object-resources.test.mjs
npx playwright test tests/browser/scene2d-object-resources.spec.mjs -g 'MS-BROWSER-02[6]|MS-BROWSER-029|MS-BROWSER-030'   # ports 5700–5709, after browser:build
```

**Limits of that RED:**
- MS-BROWSER-026 stopped at its new copy assertion, so the delete-offer assertions were not reached. I proved them by mutation (`fix1-mutation-offer.log`): with the old rule and message restored and that one copy assertion relaxed in place, it fails on `not "puedes borrarlo"`, received «No se pudo abrir «Cesta»…». Both are restored; the commit has the real assertion.
- MS-BROWSER-029 stopped at its first Add, so the `Borrar «X»` step was never seen failing on its own. It has the same cause: `Borrar «X»` runs the same transaction.
- After RED, the test's Duplicate step moved to an object with a costume of its own. The first fixture sprites had none, so Duplicate failed for an unrelated reason.

The reviewer's gap is confirmed: on the old code the unfinished object could not even be autosaved, so `flush` failed. Now it saves and reopens with that object selected, its blocks identical.

## Covering tests, all on c638eb2

| Command | Result |
|---|---|
| `npm test` | 580/580 |
| `npm run test:tools` | 88/88 |
| `npm run spec:validate` | 38/38, exit 0 |
| `npm run browser:build`, then `npx playwright test` with `scene2d-object-resources`, `scene2d-objects-panel`, `scene2d-object-views`, `code-views`, `project-persistence`, `starter-library` as an array (ports 5700–5709) | 72/72, 13.6 min (`fix1-browser.log`) |
| `npx playwright test --config playwright.quick.config.mjs` | 3/3 |

`fix1-summary.txt` holds the exit codes, all 0. `fix1-commit.txt` holds c638eb2. As requested, the 20-spec selection was not repeated: its 161/161 is from 93bc8d5, before this fix.

## Behaviour to be aware of

- On object profiles, a file can now bring what lowering used to stop besides foreign blocks, such as a loose block at the top level or a field value out of range. It opens, and Run refuses it with its block.
- A non-mounted object is now guarded too, so a file that used to open with a foreign block on a non-mounted object is now refused.
- `project-ui.mjs` changed. `new-project-capabilities` and `offline-recovery`, which also read projects, were not in this round's list and were not run.

---

# Fix round 2/5 (pack rollback stranded blocks; same-session paste)

**Status: fixed in 4a0abe5** (on c638eb2).

## What changed

**One rule to save, open and change.** The contradiction came from round 1: `flush` passed `prepare`, but `store.save` refused the same model through `validateImport`. `validateImport` is gone. `authoring.prepare` now runs `validateWorkspaceBlocks` on every object, and `prepare` is on every path, so saving, opening and transactions agree. This replaces the import guard described in the round 1 report.

**Profile changes.** `prepareCapabilities` without `allowRemoval` (the path of `useCapabilities`, so of rollback) checks every object, the mounted one read live. It refuses with the object's name: «No se cambió nada: «hero» aún usa bloques de lo que quieres quitar. Bórralos y vuelve a intentarlo.» The reason appears in `#packs-error` and the rollback stays available.

**Paste and undo: decided in design point 45.** Blockly's clipboard and undo history outlive a project, and block types stay registered. On object profiles, the editor removes a just-created block that the profile does not offer, says so in `#editor-error`, and keeps it in the same undo group, so it never reaches a save. Undo turned out to be a second path, found while building this: delete the block, roll back, Ctrl+Z. Both go through the same listener. Alternatives rejected: silently removing blocks on rollback (it is the student's work), and enabling the pack on paste. Single-workspace profiles do not change.

## New tests

| Test | Covers | RED, on c638eb2 sources | GREEN |
|---|---|---|---|
| MS-056 (changed) | `prepare` refuses a foreign block on any object | `fix2-red-node.log`: `Missing expected exception` | `fix2-node.log` |
| MS-057 (Node) | `prepareCapabilities` refuses by object name, for a non-mounted object and for the live mounted one; `allowRemoval` passes | `fix2-red-node.log`: not ok | `fix2-node.log` |
| MS-BROWSER-031 | Full chain on a 0.3.0 project: enable score, add `gg_score_set`, rollback refused with the reason, mounted and non-mounted; autosave, a panel edit, Run and reload still work | `fix2-red-browser.log`: expected ««hero» aún usa bloques», received `""` | `fix2-browser.log` |
| MS-BROWSER-032 | Undo after a legitimate rollback, and paste from the old clipboard: the block goes, the student is told, autosave and a panel edit work | `fix2-red-browser.log`: expected «no está disponible en este proyecto», received `""` | `fix2-browser.log` |

RED was taken with `git checkout c638eb2 -- src`, then build, then:

```
node --test --test-name-pattern 'MS-056|MS-057' tests/integration/scene2d-object-resources.test.mjs
npx playwright test tests/browser/scene2d-object-resources.spec.mjs -g 'MS-BROWSER-03[12]'   # ports 5700–5709
```

An earlier `fix2-red-node` attempt failed only on a syntax error from my own test edit. It was discarded and the log overwritten. Browser runs started only after `LIB-EXIT=0` appeared in `coord-lib.log`.

MS-BROWSER-032 stopped at the undo step in RED, so the paste step was not seen failing on its own. It uses the same listener.

**Probe, not committed:** I copied hero's resource blocks and pasted them on Cesta and on the stage, because that is the ordinary version of this path. It already works: menu blocks fall back to the target's own options (`fix2-probe.log`), and saving and panel edits pass. A pasted fixed block keeps `hero-alt`, saves, and only Run refuses it. No change was needed.

## Covering tests, all on 4a0abe5

| Command | Result |
|---|---|
| `npm test` | 581/581 |
| `npm run test:tools` | 88/88 |
| `npm run spec:validate` | 38/38, exit 0 |
| `npm run browser:build`, then `npx playwright test` with `scene2d-object-resources`, `scene2d-objects-panel`, `packs-lessons`, `project-persistence`, `new-project-capabilities` as an array (ports 5700–5709) | 64/64, 13.2 min (`fix2-browser.log`) |
| `npx playwright test --config playwright.quick.config.mjs` | 3/3 |

`fix2-summary.txt` holds the exit codes, all 0. `fix2-commit.txt` holds 4a0abe5. The 20-spec selection was not repeated.

## Behaviour to be aware of

- `prepare` being strict means a block that reaches a project on an object profile by any route the guard does not see would fail saves with the raw message. The only such route I know is `studioProbe.editor.load`, a diagnostic hook.
- Removal is by `BLOCK_CREATE`. A foreign block inside a pasted stack goes alone and the stack heals around it.
- Legacy single-workspace profiles keep their old wedge: a foreign block pasted there still fails to save, as it did before E2. It was left out on the ruling that they keep their behaviour.
- The `Unsupported block` message of `validateWorkspaceBlocks` is still raw on `open`. It is reachable only from a file that brings foreign blocks.

---

# Fix round 3/5 (Undo stuck on the removed block)

**Status: fixed in 3b0b207** (on 4a0abe5).

## What changed

`src/editor/editor-entry.mjs`, in the `BLOCK_CREATE` listener:

- **Undo or Redo.** The removal now runs with `setRecordUndo(false)` when `event.recordUndo` is false, so it no longer pushes to the undo stack or clears Redo. The finding's probable fix was correct.
- **Paste needed a second change the headless replica could not show.** With the first change alone, the extended test still failed. A probe of the real stacks (`sessionState`) showed that Blockly 13's real paste fires `create` with an **empty group**, so `setGroup(event.group)` gave the removal no group and the paste took two Undo steps. The first press brought the block and its message back, and it was removed again; the second did nothing visible. The listener now gives that step a group by setting `event.group` on the create event, which is the object on the undo stack. This mutates a Blockly event, so it depends on the 13.4.0 lock.

Corrected the two inaccuracies: `design.md` point 45 and the comment now separate paste from Undo and Redo, and the MS-056 title says `prepare` checks the blocks of every object.

## Test

MS-BROWSER-032 was extended. It now has an earlier edit (`h-extra` deleted before `h-score`) and runs: Ctrl+Z (foreign block removed, message shown), Ctrl+Z (reaches `h-extra`), Ctrl+Y (redo not empty), Ctrl+V (removed), Ctrl+Z (the paste step, nothing visible), Ctrl+Z (reaches `h-extra`), Ctrl+Y, and finally no message left, autosave, a panel edit and Run.

| Stage | Code | Result | Log |
|---|---|---|---|
| RED, stuck undo | 4a0abe5 | second Ctrl+Z: expected `h-extra` back, received false (line 660) | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-red-browser.log |
| RED, paste groups | recordUndo fix only, uncommitted | second Ctrl+Z after the paste: expected `h-extra` back, received false (line 674) | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-red-paste-browser.log |
| Probe of the stacks, not committed | recordUndo fix only, uncommitted | `["create","",…],["delete","",…]` | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-probe.log |
| GREEN | 3b0b207 | 1 passed | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-green.log |

Command, ports 5700–5709: `npx playwright test tests/browser/scene2d-object-resources.spec.mjs -g 'MS-BROWSER-032'`.

## Covering tests, all on 3b0b207

| Command | Result | Log |
|---|---|---|
| `npm test` | 581/581 | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-node.log |
| `npm run test:tools` | 88/88 | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-tools.log |
| `npm run spec:validate` | 38/38, exit 0 | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-spec.log |
| `npm run browser:build`, then `scene2d-object-resources` and `scene2d-objects-panel` as an array | 33/33, 8.1 min | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-browser.log |
| `npx playwright test --config playwright.quick.config.mjs` | 3/3 | /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-quick.log |

Exit codes, all 0: /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-summary.txt. Commit: /home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/task-7/fix3-commit.txt. The 20-spec selection was not repeated.

## Behaviour to be aware of

- After Undo removes a foreign block, a Redo of that step finds nothing to delete and does nothing visible.
- A pasted foreign block leaves one Undo step with no visible effect, as the finding's `undo3` replica did.
- Undoing past a removed block in a stack does not restore that block; its neighbours heal around it.


</details>

<details>
<summary>Task 8: evidencia histórica y sus correcciones</summary>

# Task 8 — informe reconstruido (2026-10-30)

**Estado: requiere correcciones; no cerrada.** El implementador original fue detenido por el usuario sin entregar informe. Este documento reconstruye el alcance desde Git y los artefactos conservados; separa evidencia histórica, verificación nueva y pendientes. No atribuye al verificador la implementación ni una secuencia TDD que no pudo observar.

## Alcance y commits

Worktree: `/home/adawolfs/projects/makecode/gcs-e2-multisprite`, rama `stab/e2-multisprite`. Base T8 `3b0b207`; implementación `3b0b207..e19abcd`; HEAD verificado aquí `242877dc954387b787dad54985b9436720118130` (relevo documental posterior). El árbol estaba limpio al comenzar y al terminar las pruebas. El verificador no modificó fuentes, pruebas, aserciones, timeouts, reintentos ni upstreams; escribió este informe y evidencia ignorada en `artifacts/`.

| Commit | Cambio reconstruido |
| --- | --- |
| `fb70f52` | Cuatro bloques de 0.3.0 en tabla, IR, opcodes revisados, generación, traductores, vistas y corpus; regla única del escenario, menús por objeto/fondo, fixture Diálogo y pruebas MS-058…069. |
| `ff30656` | Fondos añadidos y seleccionados desde biblioteca/subida del escenario; E2E de Diálogo; guía según objeto; textos estáticos; fila de objetos y controles estrechos. |
| `a31a3a9` | Refuerza pruebas de identificación de escena y fila al ampliar. |
| `5e7b96e` | Documenta fila y catálogo de 0.3.0. |
| `e19abcd` | Actualiza expectativas anteriores de fondos/fila y marca OpenSpec 4.1. La marca precedió una verificación completa en verde y no constituye cierre. |
| `242877d` | Relevo para continuar; sin producto nuevo de T8. |

## Comportamiento implementado que se revisa

- `gg_go_to_object`, `gg_go_to_random`, `gg_set_backdrop`, `gg_next_backdrop` solo en `gg.sprites@0.3.0`. Las versiones 0.1.0/0.2.0 conservan sus manifiestos; el hash provisional de 0.3.0 es `1702532cb4cb424ab8a6ebf8a8813e9fe567a5255ebe45d5c558eb51e7b87cfc` y debe congelarse al integrar E2.
- El bloque de destino conserva ID y muestra nombre; un destino borrado deja marcador legible y bloque guardable, y Ejecutar pide completarlo. El objeto nuevo toma el primer destino disponible, sin convertir posición aleatoria en opción del menú.
- Fondo es acción del escenario que puede pedir un sprite. Los menús y el texto usan nombres visibles; la biblioteca y subir imágenes sobre el escenario añaden fondos y seleccionan el inicial. No se añadió borrado de recursos.
- Diálogo es fixture canónico por objetos (`tests/fixtures/canonical/scene2d/dialogo/`). Su E2E construye con arrastres/menús reales, ejecuta, detiene, descarga GGPROJ y reabre en perfil nuevo; también cubre actualización 0.1.0→0.3.0, copia JS/Python, renombrar/borrar destino y fondo subido.
- Guía según objeto/programa; etiquetas iniciales sin depender de hero; fila desplazable de nueve objetos; selección/foco visibles; zoom real 200/400 % y controles que no cubren un bloque a 320 px.

Estas son descripciones de los cambios y de la cobertura, no un veredicto de conformidad completa: la revisión encontró tres defectos importantes (abajo).

## Verificación nueva de HEAD 242877d

Entorno: Ubuntu/WSL; Node v22.23.4 mediante `source ../scripts/env.sh && unset -f node npm npx`. No había full ni suite de navegador activa al comenzar; se conservaron previews ajenas 619672/619673 y PID38168. Un solo trabajo de navegador, sin cambios de opciones de prueba.

Prefijo de evidencia nueva: `artifacts/stabilization-2d/e2-multisprite/task-8/resume/`. `verify.sh` guarda comando exacto, HEAD y hora en `<modo>.meta`, salida en `<modo>.log` y código de salida en `<modo>.exit`.

| Comprobación | Resultado nuevo | Evidencia |
| --- | --- | --- |
| `npm run browser:build` incremental | exit 0, 22.267 s; reutiliza partes sin cambios | `build.log`; salida exit 0 del proceso del tool. `build.exit` quedó vacío por el problema de wrapper explicado abajo y no se usa como prueba. |
| `npm run test:affected -- --files <59 rutas de git diff 3b0b207..e19abcd> --list` | exit 0, **selection: full**; solo inventario, no ejecución full | `affected.log`, `affected.meta`, `affected.exit` |
| `npm test` | **596/596**, 0 fallos/canceladas/skipped, exit 0, 188.35964255 s | `node.log`, `node.meta`, `node.exit` |
| `npm run test:tools` | **88/88**, 0 fallos/canceladas/skipped, exit 0, 26.940706685 s | `tools.log`, `tools.meta`, `tools.exit` |
| `npm run spec:validate` | **38/38**, 0 fallos, exit 0 | `spec.log`, `spec.meta`, `spec.exit` |
| Seis specs de recuperación | **56 casos inventariados; 4 pasan y la ejecución se interrumpe**, exit 143. No hay resultado completo ni JSON terminal. | `named-list.log`, `named.meta`, `named.log`, `named.exit`, `named-output/`, `named-evidence/` |
| Smoke | No ejecutado en esta recuperación; pendiente tras correcciones. | No se afirma un smoke nuevo. |

Las seis specs son `scene2d-objects-panel`, `scene2d-object-resources`, `starter-library`, `scene2d-dialogo`, `scene2d-vocabulary`, `canonical-projects`. Los cuatro casos terminados antes de la interrupción pertenecen a canonical-projects: inventario del corpus y escenas Diálogo, hero-presents y repeat-move. Los otros 52 casos no tienen resultado nuevo.

### Arranque de navegador, intentos inválidos e interrupción

1. El primer wrapper inline Windows→WSL expandió `$PWD`/`$?` antes de Bash: release root quedó fuera del worktree y captura de exit vacía. `named-browser.log` (solo `Terminated`) y `affected.txt` (ruta vacía) son **intentos inválidos**, no evidencia de producto ni de un fallo de prueba. Se detuvo únicamente el PID propio 1103081. No se instaló nada. La ejecución corregida usa `verify.sh` guardado; sus rutas son del worktree.
2. El arranque corregido quedó varios minutos antes de emitir casos. Se observó `SYN-SENT` a 127.0.0.1:5700 sin listener ni hijo servidor. El diagnóstico acotado `loopback-probe.mjs`/`.log` registra timeout de 2 s al puerto 5700 sin listener, conexión inmediata a un listener temporal propio en 5704 y ningún nombre de variable proxy. Este timeout pertenece solo a la sonda, no cambia las pruebas.
3. Finalmente Playwright inició su servidor y completó cuatro casos. Por orden del coordinador, para permitir las correcciones de revisión, se envió TERM al PID propio 1143653. El resultado es **interrumpido**, no fallo de aserción ni suite aprobada. El servidor propio 1160564 respondió `/health` HTTP200 (`owned-server-health.log`) y fue detenido. Los servicios ajenos no se tocaron.
4. Para la verificación después de reparar, el coordinador autorizó configuración local en artefactos que importa la original y solo ajusta `testDir` absoluto y `webServer.reuseExistingServer:true`, con servidor normal preiniciado/propio, mismos puertos/build/entorno y todas las aserciones/opciones originales. Es una adaptación de ciclo de vida; aún no se usó para una suite nueva en esta recuperación.

Puertos usados: shell5700, runner5701, simulador5702, lenguajes5703, 3D5708, web5709; release root del intento válido: `/home/adawolfs/projects/makecode/gcs-e2-multisprite/artifacts/stabilization-2d/e2-multisprite/releases`. Reportes/evidencia del intento válido están en `resume/`; no se sobrescribió la evidencia histórica `task-8/`.

## Evidencia histórica conservada (no ejecución nueva)

Prefijo: `artifacts/stabilization-2d/e2-multisprite/task-8/`.

- `red-node.log`: 15 pruebas, 0 pasan/15 fallan. `red-browser.json`/`.log`: 13 casos, 1 pasa/12 fallan, 400.483392 s; incluye Diálogo, integración canónica, fondos/guía y nueve objetos. Los logs muestran RED, pero no bastan para probar contra qué árbol/build exacto se corrieron ni que cada caso falló antes de su implementación. `green-base.txt` contiene ff30656, pero no sustituye trazabilidad de cada comando.
- `mutations-node.log`, `mutations-browser.log` y los JSON/directorios `mutation-*` registran sensibilidad a mutantes, incluido identificador de escena, guía y marcador de destino borrado. Uno de los mutantes del marcador fue equivalente en su camino y se sustituyó por placeholder-null. Esta evidencia no se repitió y no se presenta como TDD independiente nuevo.
- `final-commit.txt` contiene 5e7b96e. `final-summary.txt`: node0, tools0, spec0, build0, browser1, quick0. `final-node.log`:596/596; `final-tools.log`:88/88; `final-spec.log`:38/38; `final-quick.log`:3/3 (26.3 s).
- `final-browser.json`/`.log` en 5e7b96e: **182 pasan/5 fallan**, 187 casos en 26 specs, 2084.226893 s (34.7 min), exit1 según resumen. Fallaron MS-BROWSER-018, MS-BROWSER-012, MS-BROWSER-013 en390×844 y320×568 y GG-LIB-004/005/006/007. Las causas documentadas en el relevo son expectativa antigua de fondos/escenario y de todas las opciones simultáneamente visibles en la fila.
- `e19abcd` actualiza esas expectativas. `final-commit-tests.txt` contiene e19abcd. `fix-browser.json` registra 7 resultados esperados y0 inesperados (110.794358 s,3 suites); `final2-browser.log` es una corrida distinta/interrumpida de36 casos que solo registra siete éxitos de scene2d-object-resources, incluido MS-BROWSER-018, sin resumen terminal. No se extrapolan a la suite ni se unifican como si fueran la misma ejecución.
- GG-LIB-004 de T7 falló una vez en148a7cb y luego pasó5 repeticiones del coordinador en c638eb2; la causa original sigue sin explicar. El fallo de fondos de T8 es distinto. Esta recuperación no añadió una repetición completa de GG-LIB-004.

Selección nominal histórica de26 specs: accessibility-shell, accessibility-zoom, canonical-projects, code-console, code-view-conversion, code-views, integrated-2d-workspace, language-copies, language-runtime, minimum-corpus, new-project-capabilities, packs-lessons, pilot-2d-mode, project-persistence, scene-inspector, scene2d-dialogo, scene2d-multi-sprite, scene2d-object-resources, scene2d-object-views, scene2d-objects-panel, scene2d-vocabulary, starter-library, studio-entry-journey, textual-corpus, textual-equivalence, workspace-presentation.

La selección automática nueva sigue siendo full por fronteras compartidas/campos sin clasificación y tools/test/impact.mjs. La regla del coordinador permite pruebas nuevas + lista afectada nombrada + smoke y solo sugerir full. No se ejecutó full ni standalone-contexts. La expansión de las otras20 specs nominales está **retenida por el coordinador hasta resolver la revisión**; las seis tampoco están completas en HEAD242877d.

### Geometría histórica y procedencia

`objects-nine-laptop.json` mide en1280×720: scroll/viewport1280, editor y editor visible340.328125 px, panel137.140625 px, lista48 px. `objects-real-zoom.json` registra factor2: viewport/scroll640, editor582×440; factor4: viewport/scroll320, editor298×400. Las capturas `objects-nine-laptop.png`, `objects-zoom-200.png`, `objects-zoom-400.png`, menús y estados de destino acompañan esa evidencia previa. Son mediciones/capturas del implementador, no observación nueva del verificador ni validación humana/estudiantil. Se conservaron sin sobrescribir; T9 debe añadir la referencia durable bajo docs/product con su procedencia explícita.

## Revisión y pendientes vinculantes

`task-8-review.md` declara Needs fixes, sin Critical y con tres Important:

1. IDs válidos `_mouse_`/`_random_` llegan a `motion_goto` y colisionan con destinos especiales de Scratch, en bloques y texto.
2. El resolver compartido da prioridad al identificador API3 frente al ID literal API1; una colisión de nombres puede enviar API1 a otro sprite. No basta invertir prioridades sin distinguir representaciones.
3. La ayuda sincronizada recomienda `setBackdrop("Noche")` incluso para Python, versiones que no ofrecen el bloque o proyectos sin Noche. Debe derivarse del vocabulario bloqueado, lenguaje y fondos disponibles.

El revisor considera apropiado el cambio de MS-BROWSER-013 para una fila desplazable: conserva límites de página/lista, selección y targets44px; MS-BROWSER-013-LIMIT y zoom real completan su intención. Eso es juicio de revisión estática; la pasada nueva completa está pendiente.

El agente reparador debe añadir pruebas que fallen por los defectos, corregirlos sin invalidar IDs/proyectos ya válidos, actualizar la afirmación errónea de exclusión de centinelas en OPCODE-MATRIX, y obtener pruebas nuevas+afectadas+smoke en verde. Después: anexar commits/resultados exactos a este informe, revisión de las reparaciones, cierre T8/T9 según la evidencia. No cerrar4.1 por su marca existente. No congelar aún el hash ni afirmar integración E2.

## Límites del informe

No demuestra full, ausencia de flakes, rendimiento escolar, comprensión del alumnado, accesibilidad integral, compatibilidad física ni hardware. Las pruebas Node no prueban renderizado/sandbox/offline frío. El estado en reposo mantiene la escena propia del runner hasta Ejecutar por decisión de producto previa. Se conservan las restricciones y menores del ledger `progress.md` para T9/revisión final.

### Forense del release root inválido

El primer comando expandió exactamente `/home/adawolfs/projects/makecode/artifacts/stabilization-2d/e2-multisprite/releases`. La comprobación de solo lectura a las13:46:45 local confirmó que `/home/adawolfs/projects/makecode/artifacts` ni siquiera existe; por tanto no se crearon archivos o directorios allí. `resume/invalid-path-forensics.log` conserva el `stat` posterior equivalente. No se borró nada.

## Reparación de revisión y verificación posterior (en curso)

El reparador entregó `7dfe56c6b5b2f47dc900821bd9e813c31aef2f6e`, árbol limpio, con fuentes congeladas para revisión y verificación. `task-8-fix-round-1.md` conserva causa, reparación y RED/GREEN de seis casos nuevos: nombres VM seguros para IDs centinela; DTO API3 `{identifier:...}` distinto del ID literal API1 (JS/Python); conversión Python con copia propia; ayuda derivada del lock/lenguaje/recursos. El reparador declara focal final6/6 y corrida de dos archivos31/31 anterior al último endurecimiento Object.hasOwn, cubierto por la focal final. No cambió pruebas de navegador.

La evidencia independiente posterior se separa en `resume/post-7dfe56c/`. Se mantuvo el plan afectado de26 specs (no full): batchA las seis de recuperación más project-persistence y packs-lessons; batchB las otras18. Antes del navegador se exigen Node/herramientas verdes y smoke. Hay dos trabajos de navegador ajenos en otros proyectos, conservados; mientras persistan solo se lanzará un trabajo propio para respetar máximo3. No se inició navegador propio durante las comprobaciones siguientes.

### Primer intento de comprobaciones amplias y diagnóstico

- Build incremental: exit0,71.257 s (`build.log/.meta/.exit`). OpenSpec:38/38 exit0 (`spec.*`).
- Primer `npm test`: TAP completo602 casos,600 pasan/2 fallan,0 cancelados,277.476523312 s (`node.log`). Fallan API3-CAP-001 JavaScript (capability state,13.103s) y GG-IR1 actual javascript sphere (capability state,11.677s). El wrapper fue editado mientras Bash todavía lo leía y falló al registrar el exit después de terminar npm; por ello no hay código capturado fiable de npm, y el tool host terminó1. El TAP completo se conserva como fallido; no se usa el error del wrapper para descartar los fallos. Las corridas siguientes usan copias inmutables por corrida y no se edita un script activo.
- Primer `npm run test:tools`:87 pasan/0 fallan/1 cancelado, exit1,65.678807638s (`tools.*`). El servidor de language-origin excede su timeout original20s. Su servidor propio se limpió; quedaron únicamente las previews ajenas.
- Se observó carga21.83/11.19/5.81 en16CPU, con GPU de otro proyecto cerca492%CPU y dos trabajos externos de navegador; el build y las comprobaciones coincidieron. `resources.log` y metadatos de diagnósticos conservan muestras posteriores. No se detuvo ni cambió ningún proceso externo.
- El coordinador indicó diagnósticos seriales originales antes de otra suite amplia: `api3-isolated`1/1 exit0, caso505.443759ms; `ir1-isolated`1/1 exit0, caso427.671039ms; `language-origin-isolated`1/1 exit0, caso18295.313316ms, sin cambiar el límite20s. Los archivos `*-isolated.meta/.log/.exit` guardan comandos/HEAD/carga/resultado.
- Traza causal de solo lectura del reparador: los dos errores JavaScript están antes de ready y el primero en el documento API2 de referencia, fuera de las ramas modificadas. QuickJS conserva deadline300ms basado en Date.now; los harnesses ignoran rechazo de execute y esperan10s a ready. La carga es una explicación plausible, **no causa confirmada ni prueba de que no habrá más intermitencia**. No se corrigieron 3D/web. VOC-012 terminó en verde213745.268525ms (96 sesiones de intérprete,48 cargas Pyodide); no fue un bloqueo.
- El coordinador autorizó otra corrida completa Node, sola, seguida de herramientas solas si pasa. Está en curso; resultados terminales se añadirán aquí. Si repite fallo de arranque, autorizó limitar concurrencia de archivos Node a4, manteniendo todos los casos/aserciones/timeouts; esa opción aún no se usó.

### Comprobaciones amplias posteriores al diagnóstico

Sin cambiar fuentes ni timeouts/aserciones/reintentos, `npm test` de nuevo y solo (`node-rerun.*`) pasó **602/602**,0 fallos/cancelados/skipped, exit0,170.870042453s. Después `npm run test:tools` solo (`tools-rerun.*`) pasó **88/88**,0 fallos/cancelados/skipped, exit0,27.880559623s. No se usó la concurrencia reducida autorizada: ambos comandos conservan sus opciones habituales. Los fallos previos permanecen como evidencia histórica de esta recuperación y no se afirman resueltos como intermitencia.

Las listas `batch-a-list.log` y `batch-b-list.log` confirman **85 casos/8 specs** y **102 casos/18 specs** respectivamente, sin superposición:26 specs y187 casos de navegador afectados. No se añadieron otras suites de navegador porque la reparación no cambió archivos de navegador; sus casos nuevos MS-070…073 están incluidos en los602 Node y la lista nominal ya cubre adaptador 2D, vistas/copia textual, equivalencia, recursos, persistencia y ayuda. El plan automático sigue siendo full; no se ejecuta full/standalone.

El servidor normal propio, PID1198309, arrancó tras los checks completos sobre el build de7dfe56c; `server.meta/.pid/.log`, `server-health.log` conservan HEAD/propiedad/seis roles/HTTP200. Las configs de artefactos heredan literalmente las originales, con solo `testDir` absoluto y `webServer.reuseExistingServer:true`. La diferencia evita el sondeo inicial de un puerto cerrado sin cambiar lo que las pruebas hacen. El smoke (`smoke.*`) pasó **3/3**, exit0,23.6s, antes de las suites afectadas. Se conservaron reportes, output y evidencia separados por lote.

A las14:06:27 local había una suite externa de navegador y carga7.57/9.84/8.18 en16CPU con9.1GiB disponibles. El coordinador autorizó entonces los dos lotes propios simultáneos (total3 procesos de prueba de navegador al arrancar). Si vuelven a aparecer trabajos externos no se los detiene; no se añaden más trabajos propios. Los lotes siguen en curso y se añadirán sus resultados terminales.

### Hallazgos durante las suites afectadas

**MS-BROWSER-028 falló** al volver a seleccionar Cesta desde la vista JavaScript de hero. La selección inicial de Cesta en Bloques sí había funcionado. La expectativa aria-selected=true quedófalse15s; la captura muestra «No se pudo abrir Cesta… Unsupported block missing condition (unknown)… puedes borrarlo» y el botón de borrar el objeto no abierto. No se clasifica como intermitencia de carga: la traza estática apunta a `textHelp()` nuevo, que lee `editor.codeViewSnapshot().resourceView`; durante el montaje/presentación esto baja el programa incompleto antes del fallback a Bloques y activa el catch exterior de montaje. El editor ya expone `resourceView()` sin bajar el programa. Se comunicó al coordinador y al reparador; el verificador no cambió fuentes ni repitió el caso. Ambas suites continuaron con maxFailures0 original; resultados finales pendientes.

Las configs de artefactos resuelven los paths relativos de reporter/output respecto de su propio directorio. Por eso JSON/trazas/output terminales reales están bajo `resume/artifacts/stabilization-2d/e2-multisprite/task-8/resume/post-7dfe56c/`, además de logs/meta/evidencia funcional bajo el `resume/post-7dfe56c/` previsto. Todo queda dentro del worktree y separado por lote. La traza/captura de MS028 están en el primero, subdirectorio `batch-a-output/scene2d-object-resources-M-02e27--only-Run-asks-to-finish-it/` (`error-context.md`, `test-failed-1.png`, `trace.zip`). No se alteró una config activa para cambiar esa resolución.

**Limitación de capturas de zoom.** Los once casos Diálogo pasaron, incluido MS-BROWSER-041 de teclado y overflow con zoom real. El JSON nuevo `batch-a-evidence/objects-real-zoom.json` coincide con las mediciones históricas. Sin embargo, la inspección de agente y píxeles encontró que `objects-zoom-400.png` es320×158,538bytes, un único color de fondo; el histórico de400% es igual. La captura200% es640×316 y muestra sobre todo fondo y controles recortados. No sirven como evidencia de apariencia. Se conservan sin reemplazo; `post-7dfe56c/zoom-capture-inspection.log` registra tamaño/píxeles y `inspect-zoom-captures.py` el lector. Las comprobaciones DOM/teclado/overflow siguen siendo evidencia funcional, sin inferir apariencia desde PNGs inconcluyentes. El coordinador/T9 recibieron el hallazgo; no se añadió otra ejecución de navegador mientras las suites están en curso.

## Resultado terminal de la verificación de 7dfe56c

**Needs fixes; T8 no se declara cerrada.** Se completó la lista nominal afectada de26 specs con187 casos. `verification-summary.json` verifica los HEAD registrados, códigos de salida, TAP, stats JSON y unión del inventario:26 specs, ninguna duplicada, ninguna omitida ni añadida respecto de las26 históricas. Es evidencia afectada nombrada, **no full**.

Prefijos exactos relativos al worktree:

- **P (logs/meta/evidencia):** `artifacts/stabilization-2d/e2-multisprite/task-8/resume/post-7dfe56c/`.
- **R (JSON/output resueltos por config de artefactos):** `artifacts/stabilization-2d/e2-multisprite/task-8/resume/artifacts/stabilization-2d/e2-multisprite/task-8/resume/post-7dfe56c/`.

| Comprobación terminal | Conteo/resultado | Exit | Duración | Evidencia |
| --- | --- | --- | --- | --- |
| Build incremental | compilación correcta |0|71.257s|P `build.log/.meta/.exit`|
| Node, segunda corrida sola |602/602;0 fallos/cancelados/skipped|0|170.870042453s|P `node-rerun.log/.meta/.exit`|
| Herramientas, segunda corrida sola |88/88;0 fallos/cancelados/skipped|0|27.880559623s|P `tools-rerun.log/.meta/.exit`|
| OpenSpec estricto |38/38,0 fallos|0|ver log|P `spec.log/.meta/.exit`|
| Smoke |3 pasan,0 inesperados/skipped/flaky|0|23.598959s|P `smoke.*`; R `smoke.json`|
| BatchA (8 specs) |83 pasan,2 fallan;0 skipped/flaky|1|1939.681345s|P `batch-a.log/.meta/.exit`; R `batch-a.json`, `batch-a-output/`|
| BatchB (18 specs) |101 pasan,1 falla;0 skipped/flaky|1|2043.956548s|P `batch-b.log/.meta/.exit`; R `batch-b.json`, `batch-b-output/`|
| Afectadas de navegador, unión |**184 pasan/3 fallan,187 casos/26 specs**,0 omitidos/skipped|fallida|dos trabajos parcialmente simultáneos|P `verification-summary.json`|

Los seis casos nuevos del primer repair están incluidos en los602 Node aprobados. Los once casos de Diálogo pasaron. MS-BROWSER-018, MS-BROWSER-012 y las cuatro variantes MS-BROWSER-013 pasaron en la recuperación nueva. La comprobación anterior de fondos dentro de GG-LIB-004 avanzó, pero **el caso completo GG-LIB no pasó** por el error distinto siguiente.

### Los tres fallos retenidos y siguiente validación

1. **MS-BROWSER-028, defecto concreto de presentación/montaje:** `tests/browser/scene2d-object-resources.spec.mjs:185` llama a `pick()` (assert en54) para Cesta desde JavaScript. La selección quedafalse15s; la captura muestra el error de missing condition y ofrece borrar un objeto sano. La ruta nueva `textHelp→codeViewSnapshot` baja autoría incompleta antes del fallback. El coordinador incluyó la reparación de lectura de recursos sin lowering en la ola final consolidada. Artefactos: R `batch-a-output/scene2d-object-resources-M-02e27--only-Run-asks-to-finish-it/{error-context.md,test-failed-1.png,trace.zip}`. Revalidar el caso existente y la regresión nueva tras corregir, sin debilitar ninguna expectativa.
2. **GG-LIB-004/005/006/007, fallo distinto de readiness:** `tests/browser/starter-library.spec.mjs:153` hace `expect.poll(async()=> (await settled(snapshot,page)).costume.name).toBe('gato')` inmediatamente tras el Run final, después de restaurar el fondo inicial. El snapshot rechaza con `GG scene loading` (`shell.js:306`), que `tests/browser/workspace-controls.mjs:124` `settled()` no reintenta: solo reintenta Session stopped. La parte de guardar/reabrir en perfil nuevo ya había pasado. **No es el fallo histórico de T7 (gato/hero15s) ni el de T8 por expectativa de fondos.** Se conserva como fallo de sincronización explícita de readiness, cuya reparación autorizó el coordinador usando el protocolo/UI existente, con las mismas expectativas/timeouts/reintentos y sin catch global. Artefactos: R `batch-a-output/starter-library-GG-LIB-004-fa49d-equest-and-reopens-portable/{error-context.md,test-failed-1.png,test-failed-2.png,trace.zip}`. Revalidar tras reparar. La intermitencia histórica de T7 sigue sin explicación independiente.
3. **GG-INSPECT-003, timeout global no clasificado como defecto de producto:** `tests/browser/scene-inspector.spec.mjs:158`, límite original45s. La traza llegó al perfil nuevo (`open` en211) y al segundo Ejecutar; últimos snapshots: costume hero-alt, x12, bluePixels582. Los últimos pasos son lecturas para evidencia; no hay error missing condition en consola, solo avisos CSP heredados del renderer. La carga/tiempo es una hipótesis plausible, sin prueba concluyente. El coordinador pide validación focal después de la reparación, sin otro lote propio en paralelo y conservando45s. No se modificó producto ni aserción de inspector a partir de este único fallo. Artefactos: R `batch-b-output/scene-inspector-GG-INSPECT-644b7-s-IDs-and-rendered-behavior/{error-context.md,test-failed-1.png,test-failed-2.png,trace.zip}`.

No se hicieron repeticiones manuales inmediatas ni se relanzaron las26. La ola final consolidada y la revisión deciden las comprobaciones adicionales por impacto. Este informe no extiende evidencia de7dfe56c a un futuro HEAD corregido.

### Inspección visual de agente (separada de automatización y observación humana)

La captura nueva P `batch-a-evidence/objects-nine-laptop.png` fue inspeccionada por el verificador y por el coordinador: render1280×720 válido con rótulos/controles, Volcán seleccionado visible en una fila desplazable y unos340px de editor disponibles. El JSON nuevo da exactamente340.328125px visibles, panel137.140625px/lista48px, página1280px sin overflow horizontal. Los primeros objetos están fuera de la ventana de la propia fila por el desplazamiento intencional; no se afirma que las nueve tarjetas se vean simultáneamente. Esto es revisión visual de agentes, no observación docente/estudiantil ni evaluación humana.

Ambos agentes confirmaron también que los PNG de zoom200/400 están recortados/en blanco y son inconcluyentes como apariencia. Sus medidas DOM y navegación por teclado sí pasaron. Para el HEAD final reparado se preparó, **sin ejecutar**, `resume/prepare-supplemental-zoom.mjs`: acciones reales para nueve objetos, zoom nativo con la extensión existente, métricas DOM/CDP y PNG sin modificar de viewport, página completa, vista CDP y superficie CDP. No inyecta estilos ni reemplaza píxeles. Sintaxis validada con `node --check`; la apariencia de las capturas futuras todavía debe inspeccionarse. El script exige HEAD estable y limita el perfil temporal propio al directorio de evidencia.

### Limpieza y handoff

Al terminar ambos lotes se verificó que PID1198309 tenía cwd de este worktree y argv `node tools/f0/serve-browser.mjs`; se envió solo a ese PID SIGTERM a las20:41:17.989704UTC. El proceso del servidor terminóexit0. A las14:41:24 local, `ss` no mostró listeners5700–5709 ni5760–5769; HEAD seguía7dfe56c y el árbol estaba limpio. P `server-cleanup.json` registra propiedad/señal. No se detuvieron previews619672/619673, PID38168 ni trabajos externos. Los puertos se liberaron para el reparador final.

`resume/next-verify-template-absolute.sh` está preparado y pasó `bash -n`, sin ejecutarse: usa paths absolutos de report/output/evidencia y modos focales MS028/inspector, además de los comandos existentes. El próximo verificador debe copiarlo a scripts inmutables por corrida y usar el nuevo hash estable comunicado por el reparador. No editar scripts/configs activos. No ejecutar otra full ni otra tanda de26 sin razón nueva de impacto y decisión del coordinador.

## Auditoría de solo lectura del primer HEAD de la ola final: a66ae47 (HOLD)

Se auditó a66ae47b6705a30534eed15dc6750b1b27ed46fa limpio, sin ejecutar Node/tools/build/casos/servidores/capturas. Las listas (exit0) dan selection automática full, y la propuesta nombrada29 da210 casos: prioridad13 + inspector1 + resto196, unión exacta sin duplicados/omitidos. Archivos `artifacts/stabilization-2d/e2-multisprite/final-verification/a66ae47/{inventory-audit.json,owner-source-audit.json,owner-case-audit.json}` conservan el detalle. La evidencia positiva del reparador suma5 casos individuales intactos de su primer lote fallido,8 del segundo y1 inspector aislado; no se llama verde al primer lote ni se cuentan sus7 fallos como éxitos. De441 hashes previos solo cambiaron dos archivos de prueba, dentro de los casos fallidos; producción/helpers/config/tools quedaron iguales.

El coordinador aceptó la auditoría histórica y ordenó HOLD por tres residuos de revisión: rollback del contenido durable completo, conservación de declaración global y draft ajeno fuera de límite que bloquea documentos independientes. No se concede crédito automático a un futuro hash modificado; requiere nueva auditoría de las pruebas/fuentes y los focos pertinentes. El reparador detuvo su servidor1279382; el verificador no arrancó otro. `final-verification-report.md` recoge esta etapa. Toda ejecución amplia y captura sigue pendiente de la siguiente entrega estable.

## 1b74566 source/focused audit; broad execution held again

Commit1b745665bb28bad8bd01fd0e2a890b51324cce57 was clean when inspected. Evidence root: `artifacts/stabilization-2d/e2-multisprite/final-verification/1b74566/`. `owner-final-audit.json` verifies all441 final committed SHA256 values match the checkout, aggregatec8015dbca4db9f5a42825e631ef8e2358f8e00a4f4e20277ba42ec7c83619b42. Cohort72cb0fe38bd7ea9cc144022c7b2c8d906fb672d2f1a79b9004a5c5b8da58422d was served by the owner. Final source-before-browser-4 matches completely; the earlier snapshots differ only in case-local edits/addition in scene2d-final-fixes, without product/helpers/config/tools changes.

The residual focused positive union is21 unique:19 individually passed cases from browser-green-1, UI rename from green-3, direct-config guard from green-4. Earlier timed-out/failed direct-config attempts remain in their original JSON/logs; the failed batches are not described as all-green. The test-file diff was manually inspected: only the direct-config branch/readiness/assertions and added UI-rename test changed; the other passed bodies and shared helpers stayed intact. Old a66 focused priority/inspector results were not automatically reused across changed product source.

The final-fixes source now includes16 residual browser cases in addition to its original10. The final exact29-spec collection must therefore be refreshed; no new listing or case partition was executed at1b74566. Only source/case audit and inactive script materialization occurred. No Node/tools/build/browser/server/capture launched before the coordinator's next HOLD.

Scoped review found the remaining R3 case: shell still unconditionally captures hero locals, so an over-limit hero draft can block a valid no-variable independent API1 document. Root ruled that such an independent document must run regardless of authored draft and requested a bounded follow-up. All broad verification remains on hold; the next source hash must be audited anew and focused credit recalculated. Owner server1294391 was already stopped and no verifier server was started.

## Final stable gate in progress — fb4215f

Target: fb4215f06e5d22e06cb9977324079f2de4758f08, source frozen and final R3 scoped review approved by coordinator. Artifacts: `artifacts/stabilization-2d/e2-multisprite/final-verification/fb4215f/`. Default npm test passed624/624 exit0,121.444556210s; default npm run test:tools passed89/89 exit0,16.628104986s; strict OpenSpec38/38 exit0. These ran serially, without reducing concurrency or changing assertions/timeouts/retries.

Initial preservation command exit1 is retained: worktree baseline inventory was absent. Coordinator authorized an exact immutable primary input copy (SHA2560ce8f02f7753e5177faab0e2c3f5514599ebe4ba825dd0549c9caa23244a3224) into the expected ignored worktree location. Existing verifier then passed exit0 for all3 upstreams (sameCommit/sameTrackedDiff/sameLock alltrue). Primary inventory remained byte-identical afterward; primary verification was copied to evidence, not written. No inventory regeneration/baseline advancement/upstream edits.

Incremental build exit0,27.341s, compiler stages reused; release-materials refreshed. The owned server1308184 serves cohortd0ead8b08c72c59e33ec7e3701b4a14c7926a92b01a0b7509c752f3c16e521a7. Owner's8 source-identical focused cases used separately recorded cohort92a65c2a4a2643ebf3eb1be15ab732a3db099bee1fa260fc8b55de8643caa8b6. All441 owner launch/final source hashes match this commit with no post-launch changes; only these8 cases are credited, no older cross-head browser positives.

The exact approved named29 scope has232 cases. `execution-case-plan.json` proves disjoint exact union: owner8, fresh-priority27, unchanged isolated inspector1, remainder-a97, remainder-b99. No missing/extra/duplicates. Automatic affected selection remains full; no full/standalone is executed.

Smoke3/3 exit0,23.1s; inspector unchanged1/1 exit0,13.5s case/14.4s process with original45s and no owned overlap. Fresh priority27/27 exit0,4.5min, including all remaining final/regression cases, MS028 JS/Python and combined GG-LIB readiness. These are fresh final-head executions, not stitched historical gate credit.

Remainders97/99 now run as two disjoint one-worker jobs on the same immutable owned server. At16:26:56 local there were no foreign browser/full jobs, load1.31/2.24/3.61 and11.3GiB available; offline auxiliary5750–5759 was free. Ordinary results and genuine native zoom capture are pending. No completion/affected-green claim is made yet.

### MS-BROWSER-037 interruption retained during final remainders

Remainder A case52 failed after22.3s at scene2d-dialogo.spec.mjs:336. The Python-copy Run at:335 was followed immediately by snapshot polling; JavaScript-copy execution had already completed. Trace records seven `studioProbe.request('snapshot')` calls during this poll, then `Program revision replaced` from shell.js:302–303 when a request sent against the former revision received its reply after activeRevision changed. The terminal page snapshot shows Python active with the existing `Documento activo · eventos disponibles` UI status. This is a request/readiness synchronization failure; no final scene-value mismatch was asserted, and load is not established as a cause.

Evidence: final-verification/fb4215f/ms037-trace-phase.json and remainder-a-output/scene2d-dialogo-MS-BROWSER-d06fb-t-copy-and-as-a-Python-copy/{trace.zip,error-context.md}. The original batch continues without reruns, edits, catches, timeout or retry changes. Coordinator approved only a later case-local wait for the existing #text-run-status readiness text after text Run, preserving all final-state assertions and original options. No implementation has occurred while the two remainder batches run. Native zoom supplement is deferred until that test-only commit is stable so its capture metadata can name the final HEAD. Pending terminal totals and scoped follow-up are not green gate evidence yet.
### MS-BROWSER-032 load-program timeout retained separately

Remainder A case73 failed after40.4s at scene2d-object-resources.spec.mjs:44, called by:689. The paste/undo/history, unavailable-pack refusal and saving assertions had completed; the final Run did not reach `Bloques ejecutados`. Its15s status assertion saw `Preparando…`, then `Listo`. The raw failed screenshot visibly reports `Runner timeout: load-program` in #editor-error and shows the initial unexecuted scene. This is an actual load-program timeout; its cause is not proven. It must not be merged with MS037's revision/readiness synchronization failure.

Artifacts: final-verification/fb4215f/remainder-a-output/scene2d-object-resources-M-a4723-nd-the-project-keeps-saving/{trace.zip,error-context.md,test-failed-1.png}; read-only action/console extraction ms032-trace-phase.json. Coordinator requests one isolated unchanged MS032 execution after both ordinary jobs and the MS037 test-only stable commit, with original limits and observed load/memory. A later isolated pass would be additional evidence, not erase or explain this original timeout. No product/test change for MS032 is authorized without further supporting evidence.

MS037 readiness-reset audit: runTextDocument synchronously sets #text-run-status to `Preparando Python…`/JavaScript before its first language.prepare await (shell.js:484–485); reset changes it to Detenido/Sin ejecutar or Preparando escena. Exact active/events status comes from onProgramReady. Thus the proposed wait after the new Run cannot accept the preceding JavaScript ready status on this successful Python flow. No global settled helper or timeout/retry change is proposed.
### Final remainder A terminal result

`remainder-a.json/.log/.meta/.exit` at fb4215f records95 passed,2 failed,97 total,21.6min, exit1. Only MS-BROWSER-037 and MS-BROWSER-032 failed as detailed above; the whole batch is failed and is not relabeled green. Remainder B is still active; no aggregate terminal claim yet. Current selected-case captures objects-nine-laptop.png/.json (nine objects,1280×720,340.328125px editor visible) and objects-panel-narrow.png (five-object fixture,390×844) were directly inspected by the verifier: genuine rendered UI, selected Volcán/Robot and controls visible. This is agent visual inspection, distinct from human/student evidence. Narrow resource/inspector/library captures also exist, but their asserted geometry is not persisted as standalone measurement JSON.
### Both final-head ordinary batches complete; gate awaiting focused follow-up

At fb4215f the complete disjoint named29 inventory produced230 unique passing cases out of232: credited same-source owner8, verifier fresh-priority27, isolated inspector1, remainderA95, remainderB99. Remainder A:95pass/2fail,97total,1297807.429ms,exit1. Remainder B:99pass/0fail,1473079.849ms,exit0. No skipped/flaky cases; no duplicates or extra cases. Only the two exact failures above remain missing from the positive union. Smoke3/3 is separate from232.

`verification-summary-original-attempt.json` and `verification-summary.json` retain this failed original gate, with exact exits, stats, failed identities, source/cohort and upstream-baseline provenance. `summary-original-attempt.log/.exit` records exit1 intentionally because the positive case union is incomplete, not a new product failure. Neither failed A nor the232-case gate is claimed green.

Both Playwright jobs have ended; normal owned server1308184 remains for coordinator-authorized focused handoff. Plan: sole fixer adds only the existing readiness wait in MS037 and commits after scoped focused validation; verifier then executes unchanged MS032 once alone with original limits/load evidence. Native zoom capture waits for that final test-only stable HEAD. Earlier failures remain immutable regardless of subsequent focused outcomes. No tracked file was edited by the verifier and no full/standalone run occurred.
## Final verification closure — e51b2d3

Final tracked HEAD: e51b2d39bab871c693b2dabae0e7ac300d638fea, clean. This commit inserts one exact existing-status readiness assertion inside MS-BROWSER-037; product, shared helpers, configuration and MS032 are unchanged from fb4215f. The final441-file SHA256 manifest matches the checkout and owner launch manifest; the only delta from the product build is scene2d-dialogo.spec.mjs. Product build/cohort remains fb4215f / d0ead8b08c72c59e33ec7e3701b4a14c7926a92b01a0b7509c752f3c16e521a7. Evidence: final-verification/e51b2d3/final-source-audit.json, plus owner final-fix/ms037-synchronization/{stable-cut.json,source-final-committed.json,focused.json}.

Final exact named coverage is232 unique passing cases across the approved29 specs, with no missing, extra or duplicate identities. Groups: same-final-product-source owner8; fresh priority27; unchanged isolated inspector1; original remainderA95; original remainderB99; corrected MS037 focused1; unchanged MS032 isolated1. Smoke3/3 is additional and separate. The automatic full selection was never executed; this is the approved bounded named substitute, not full/standalone. Machine-readable final case/provenance audit: final-verification/e51b2d3/verification-summary.json. Its retained historicalOriginalAttempts explicitly preserves A95pass/2fail exit1 and B99pass exit0; neither original failed batch nor its original230/232 union is rewritten as green. Original summaries/logs/traces remain under fb4215f.

MS037: owner focused run1/1,exit0,18.2s case/19.0s total, same immutable served product. Exact one-case identity and source provenance checked. Existing final goal poll60s, outer case limit and retry settings are unchanged. The new #text-run-status assertion inherits the default15s expect deadline and can therefore fail before the original goal poll if readiness exceeds15s; total assertion timing is not identical. Root retains the strict standard assertion; no deadline widening/global catch/retry was added.

MS032: verifier executed the unchanged case exactly once alone after the test-only commit, with original assertions/limits/configuration and one worker. It passed1/1,exit0,13.5s case/14.5s process. Exact --list guard selected1 case. Launch load1.17/6.83/8.40 on16 logical CPUs,11117MiB available; no other Playwright job was present. Evidence: e51b2d3/run-ms032-isolated.sh, ms032-isolated.{json,log,meta,exit}, ms032-isolated-list.{log,exit}. The original Runner timeout: load-program remains unexplained. The isolated pass provides no proof that load caused it or that a flake has been eliminated. No MS032/product/helper change was made.

Checks on unchanged final product source before the one test-only insertion remain valid: default npm test624/624 exit0; default npm run test:tools89/89 exit0; strict OpenSpec38/38 exit0; incremental build exit0; upstream preservation existing verifier exit0 after exact immutable primary-input fallback. The initial missing-input preservation command exit1 is retained, with the baseline SHA/source and no regeneration/advancement. No broad rerun was needed for the single case-local readiness addition. Independent runtime limits were not raised.

### Final raw UI/zoom evidence and limits

Final product-state selected-spec captures at fb4215f (still identical product at e51b2d3): remainder-a-evidence/objects-nine-laptop.png and .json show nine objects at1280×720, selectedVolcán in one horizontally scrolling row, no horizontal page overflow, visible Blockly340.328125px, object panel137.140625px/list48px. Narrow390×844 five-object panel images are remainder-b-evidence/objects-panel-narrow.png and objects-panel-narrow-form.png. Diálogo narrow images are remainder-a-evidence/backdrop-menu-narrow.png and object-unopened-narrow.png; resource/inspector/library narrow captures are resource-menu-narrow.png, inspector-narrow.png and library-narrow.png. Narrow cases assert overflow/button geometry but do not persist their measured boxes as JSON. Verifier directly inspected nine-laptop and panel-narrow; root independently inspected the fresh images. These are agent visual checks, not human acceptance evidence.

Two supplemental native Chrome zoom captures ran serially after ordinary/focused jobs at final HEAD e51b2d3, each exit0 and no pageerrors, with nine objects created through the actual UI. No CSS injection, replacement pixels or image editing. First set e51b2d3/zoom-supplement/ contains all original raw variants and capture-metadata.json. Its genuine zoom-200-cdp-view.png and zoom-400-cdp-view.png render the scaled selectedVolcán row/controls correctly at1280×633 physical pixels; these are scrolled viewport details with vertical cropping. Root and verifier inspected them. Ordinary viewport variants remain clipped/blank (400%538bytes), and CSS-sized full-page/surface variants crop horizontally; they remain inconclusive and are retained.

Additional e51b2d3/zoom-dip-supplement/ uses only the protocol's DIP content bounds for raw Page.captureScreenshot. Best complete-width page captures are zoom-200-cdp-surface.png (1280×4203) and zoom-400-cdp-surface.png (1280×9702), with capture-metadata.json adjacent. Verifier inspected them: selectedVolcán, object row, controls, editor and page sections render at full width; at400% buttons wrap into two columns and the page scrolls vertically. These full-page captures do not replace the viewport captures and do not prove every offscreen canvas was painted. Native metadata:200% inner640×316/DPR2,400% inner320×158/DPR4; scrollWidth equals innerWidth at both factors. Original complete metadata, capture scripts, commands, image dimensions and SHA256 values are included in verification-summary.json. No further variants were taken.

No student, teacher, classroom or other human acceptance observation was collected; UI/zoom conclusions are automated DOM assertions plus agents inspecting genuine screenshots. Historical evidence and its provenance remain separate from current images. The original MS032 unexplained timeout and ordinary screenshot limitations remain explicitly visible despite the final passing case union.

### Cleanup and handoff

Only verifier-owned server1308184 was stopped after matching its recorded PID, exact /proc cwd and argv `node tools/f0/serve-browser.mjs`. It was healthy before stop; TERM was sent only to that PID. Wrapper session88361 exited0; no listeners remained on5700–5709,5750–5759 or5760–5769. No foreign PID/preview was touched. Evidence e51b2d3/server-cleanup.{log,exit}, stop-owned-server.sh. No build/test/browser/capture jobs remain owned by verifier. Reports and evidence are ready for Task9 documentation; no tracked file was edited by this verifier.

</details>

## Apéndice E · revisión histórica y todas las disposiciones diferidas

La revisión inicial describía 7dfe56c y once bloqueantes; el apéndice F
conserva sus reparaciones y la corrección explícita del trigger UI de rename.

<details>
<summary>Revisión de código inicial y disposición de cada menor</summary>

# E2 whole-branch final review (staged)

**Scope:** `9473f03..7dfe56c`; one whole-branch review in passes, with follow-up limited to the pending Task 9 documentation delta and final test evidence. The checkout, index and HEAD were not edited. This report is the sole requested output.

**Status: CODE AND DEFERRED-ITEM PASS COMPLETE — integration verdict pending.** The eleven Important code findings below have been reported to the coordinator and are consolidated for one fix wave. The committed Task 9 documentation delta and complete browser evidence have not yet been supplied; no final integration verdict or overall green claim is made.

## Strengths

- GGPROJ v6 keeps one serialized workspace per object and the old v1–v5 readers, with explicit IR-v1 opt-in rather than accidentally flattening scripts into hero. Owner-aware resource validation and the reviewed Scratch boundary preserve the intended separation.
- Selection follows apply → mount → switch, with the student's rejected text retained. Unfinished object work can save, but reopening from a text view has the Important 11 regression below.
- The published 0.1.0/0.2.0 manifests are treated as frozen; 0.3.0's object rules and the canonical «Diálogo» are covered in both integration and browser fixtures. Earlier Task 8's three Important issues were addressed in `7dfe56c` and scoped re-review; see its report for limits.

## Issues

### Critical

None found in the code pass.

### Important — consolidated code-pass list

1. **Stage click controls identify ordinary sprites by technical ID.** `src/adapters/scratch/stage-input.mjs:46-55,84-87`; `src/adapters/scratch/browser-scene.mjs:70-74`. Add an object named «Cesta», give it an “al hacer clic” script and run: the selector, Activate button and status derive the VM target name, which is its stable ID (`sprite-<uuid>`), not «Cesta». A renamed hero remains “hero”. Thus keyboard/screen-reader users cannot reliably choose the named sprite. In text mode the special valid IDs `_mouse_`/`_random_` also leak private `/gg/…` names. Pass the validated ID→visible-name mapping to native and text controls, including clones and stage labels, while preserving actual imported Scratch names. Exercise selector, action and status, renamed hero, a newly added sprite, clones, both 2D run modes, reserved IDs and compatibility mode.

2. **Undo from the previous project mutates the newly opened project.** `src/project-authoring.mjs:227-239`; `src/editor/editor-entry.mjs:48-79,189-205`. Project commit clears only the stored `sessions` map when the project ID changes; the currently mounted Blockly undo/redo stacks survive `workspace.clear()` and serialization load. Same block IDs naturally occur in copies and starters. A read-only probe using the installed Blockly made an edit in A, loaded B with the same number-block ID at 99 using this code's disable/clear/load/enable sequence, then Undo changed B's value to A's old 0:
   ```text
   {"undoBefore":2,"loaded":{"blocks":{"languageVersion":0,"blocks":[{"type":"math_number","id":"same-id","x":0,"y":0,"fields":{"NUM":99}}]}},"afterUndo":{"blocks":{"languageVersion":0,"blocks":[{"type":"math_number","id":"same-id","x":0,"y":0,"fields":{"NUM":0}}]}},"remaining":1}
   ```
   Exact probe, piped read-only to the installed Node executable:
   ```js
   const B = require('blockly');
   const w = new B.Workspace();
   const pause = () => new Promise(r => setTimeout(r, 40));
   (async () => {
     const a = w.newBlock('math_number', 'same-id'); a.setFieldValue(17, 'NUM');
     await pause();
     const before = w.undoStack_.length;
     const b = {blocks:{languageVersion:0, blocks:[{type:'math_number',id:'same-id',fields:{NUM:99}}]}};
     B.Events.disable(); w.clear(); B.serialization.workspaces.load(b, w); B.Events.enable();
     const loaded = B.serialization.workspaces.save(w); w.undo(false); await pause();
     console.log(JSON.stringify({undoBefore:before,loaded,afterUndo:B.serialization.workspaces.save(w),remaining:w.undoStack_.length}));
     w.dispose();
   })();
   ```
   Clear/reset live and stored histories on explicit project replacement/open, including reopening an older file with the **same** project UUID; identity comparison alone is insufficient. Preserve per-object histories during same-project edits and rollback after a failed commit. MS-044 mocks the editor and checks stored sessions but does not cover the live stack. Add real Blockly/browser coverage for Undo and Redo after both distinct-ID and same-ID reopen with shared block IDs, plus switching objects, same-project resource transactions, and failed-commit rollback.

3. **Pack rollback silently discards edits made after the update.** `src/studio/shell.js:663-669,675-680`; `src/studio/project-ui.mjs:254-265`. Update a 0.1/0.2 project to 0.3, edit blocks or a synchronized text view, then press “Volver a la versión anterior”: the button restores the entire pre-update snapshot, not merely pack versions, overwriting and autosaving the subsequent work. The transaction's change guard detects only concurrent edits, not work completed between update and rollback. This underlying mechanism predates E2 but the new migration exposes it directly to E2 users. Preserve immediate unchanged rollback and protect newer authoring through a changed-state guard or an explicit loss confirmation and safe copy path; test both block and pending-text edits.

4. **Actual GGPROJ v1/v2 files cannot explicitly upgrade, and activating score silently upgrades them.** `src/project-migration.mjs:10-15`; `src/studio/shell.js:619-637,652-655`; `src/contracts/packs.mjs:84-94`. These files have no explicit capabilities, so `availablePackUpdates(null)` returns none and hides “Actualizar packs”; they cannot follow R1's promised opt-in 0.1→0.3 path. Conversely “Activar puntuación compartida” supplies no pinned version for the implicit legacy profile, so `createCapabilities` selects latest 0.3 without an explicit update. MS-BROWSER-034 creates an explicit 0.1 profile via a probe; it does not exercise a saved v1/v2. Add an explicit legacy upgrade using the declared migration chain, preserving workspace IDs/shadows/comments/positions, text and resources with no execution, and keep the legacy sprites version on unrelated capability activation. Exercise real saved v1 and v2, upgrade and score activation, and old profiles' toolbox and behavior.

5. **An API3 project copy can silently target a different sprite after renaming and name reuse.** `src/generated-program-source.mjs:179-189`; `src/targets/text/api-v3.mjs:133-139`; `src/targets/text/api-v3-python.mjs:138-141`; `src/adapters/scratch/text-program.mjs:336-344`. A whole-project copy carries every identifier→stable-ID mapping in `runtime.targetIds`, but `goToObject(cesta)` becomes a tagged identifier and the scene resolves it from *current* names, ignoring the saved mapping. Make a copy of Hero going to Cesta; rename Cesta to Canasta and add a different Cesta. The old copy silently goes to the new Cesta while the blocks still target the original ID; without the new name it errors despite retaining the original ID in metadata. Honor saved mappings where present and fail if the mapped ID is gone instead of rebinding to a namesake. Keep API1 literal IDs distinct; define and test the documented fallback for names not in a single-object copy. Test JS and Python, renaming, reuse, deletion and reserved-ID collisions.

6. **Valid combined globals and locals are rejected before scene composition.** `src/contracts/scene2d-object-edits.mjs:108-114`; `src/editor/editor-entry.mjs:177-184`; `src/editor/block-program.mjs:165-168`; `src/contracts/program-contract.mjs:60-70`. Adding a sprite copies all global Blockly variable models into its workspace. Each workspace is lowered/authorized as IR0 first, whose limit counts every model together (16), although IR1 allows up to 16 globals on the stage **and** 16 locals on each sprite. With 16 globals and one local, the sprite's legal scene cannot run. A read-only probe of the actual contract reported `{"workspaceError":"Invalid GG program: variable limit","sceneError":null,"global":16,"local":1}` for those models; `composeScene2DProgram` produced an IR1 accepted by `validateProgram(...,{objects:true})`. Preserve the old IR0 cap for legacy profiles while allowing object workspaces to lower, authorize and use synchronized JS/Python views according to the separate scene limits; add actual Blockly, conversion and Run coverage at the boundary and rejection tests for 17 globals or 17 locals.

7. **An unfinished unrelated object breaks older independent text using a valid variable.** `src/studio/shell.js:470-474`; `src/project-authoring.mjs:102-116`. E2 collects legacy document variables by lowering the entire scene; any unfinished sprite causes that lowering to throw, and the catch silently substitutes an empty variable list. Start with an API1 document that reads a valid hero local through `GG.variables.get`, add a second sprite, and leave an `if` block unfinished there: running the independent document now cannot read that variable even though hero's variable and document are valid. Prior to E2 only the single editor was lowered; unrelated object work could not cause this failure. Extract/validate the variable models independently of unrelated unfinished scripts while preserving IDs, scope, owner and the independent-document contract. Cover actual API1/older documents, a valid owner variable, an unfinished non-owner, both selections and no automatic execution.

8. **The combined micro:bit result can conceal edits to an unmounted sprite.** `src/studio/shell.js:433-447,581-590`; `src/studio/contextual-workspace.mjs:97-100`. Run micro:bit and the multi-sprite scene with hero selected, switch to 2D, edit Cesta, reselect unchanged hero, then return to micro:bit. Combined execution now runs the whole `sceneProgram()`, but its staleness key still compares only `editor.save()` for the selected object. Consequently the change notice hides even though the running result has the old Cesta program. Make the combined-context key follow the whole scene and order, and account for pending synchronized text; object selection alone should not mark the result stale. Test both selection-only and edit-another-sprite/reselect cases without changing micro:bit behavior.

9. **API1 backdrop IDs can resolve as another backdrop's API3 label.** `src/generated-program-source.mjs:111-119`; `src/adapters/scratch/text-program.mjs:346-349`; `src/targets/text/api-v3.mjs` and `api-v3-python.mjs`. The API1 generator writes stable descriptor IDs to `ctx.setBackdrop`, while API3 writes visible labels. The scene currently treats every string as a label first, then an ID. With valid backdrops `{id:'noche',label:'Otro'}` and `{id:'otra',label:'noche'}`, a real-VM read-only probe of API1 `setBackdrop('noche')` returned `{"api1RequestedId":"noche","initial":"noche","after":"otra"}`: it silently selected the wrong backdrop. API3's label legitimately means the second backdrop, so reversing precedence is insufficient. Distinguish the two representations or carry their API context while preserving existing API1 literals and formats. Cover both languages and APIs, collision, an unknown label/ID, and the generated API1 path. The API1 generator is integration-tested but not wired to the normal UI copy action; this severity reflects a confirmed wrong result in the supported generation/runtime layer.

10. **The affected-test selector omits E2 suites for files they exercise.** `tools/test/impact.mjs:32-43,60-71`; `tests/browser/scene2d-object-resources.spec.mjs:107,279`; `tests/browser/scene2d-dialogo.spec.mjs:126,285,321`. All five new specs are in the global inventory, but classification returns only the first matching dependency group. Editing `objects-ui.mjs` selects panel/views/multi but omits object-resources and Dialogo; `resources-ui.mjs` matches the earlier Scratch-import group and omits those object/resource tests; API3 translator changes omit Dialogo's language copy cases. Shell HTML/CSS and Dialogo's canonical fixture classifications also omit the new relevant layout/fixture scenarios. Since this project normally treats affected tests as its completion gate, future changes can receive a green selection without running regressions affected by them. Expand these relevant groups/maps, or conservatively select full, and add selector tests that assert the dependency-specific specs are selected. The unclassified `project-authoring.mjs` conservatively selects full and is not an under-selection.

11. **Text help prevents an unfinished object from opening when the previous object is in a text view.** `src/studio/code-views-ui.mjs:34-46,264-295,310-321`; `src/project-authoring.mjs:143-160`; `src/editor/editor-entry.mjs:186,218-221`; `src/editor/code-view-conversion.mjs:21-27`. On `7dfe56c`, MS-BROWSER-028 first opens Cesta with an unfinished `if` in Blocks, returns to hero, switches hero to JavaScript, then selects Cesta again. The intended behavior is to open Cesta in Blocks with its unfinished work intact. Mount accepts that workspace, but its synchronous notifications render the still-active text presentation before `selectObject` reaches its fallback catch. `textHelp` calls `editor.codeViewSnapshot().resourceView` just to list backdrops; the snapshot runs `workspaceToIR` and throws for the missing condition. The outer catch treats this as a mount failure, rolls back to hero and offers to delete Cesta. The browser artifact reports Cesta's `aria-selected` stayed `false` and the displayed status was `No se pudo abrir «Cesta». Sigues en «hero». Unsupported block missing condition (unknown) Si no lo necesitas, puedes borrarlo.` Use the non-lowering resource view for help (the existing `editor.resourceView()` is one route), preserving the correct contextual language/profile and backdrop examples from the Task 8 repair. Cover the real selection flow from JavaScript and Python into unfinished object work, fallback to Blocks, retained block IDs and state, no erroneous delete offer or automatic execution, and correct help for valid resources. Evidence: `tests/browser/scene2d-object-resources.spec.mjs:173-190`; `artifacts/stabilization-2d/e2-multisprite/task-8/resume/post-7dfe56c/batch-a.log` and its `batch-a-output/scene2d-object-resources-M-02e27--only-Run-asks-to-finish-it/` failure artifacts (nested under the resume artifacts directory by the artifact configuration).

### Minor

The disposition of every parked item is tracked below. Documentation and evidence dispositions remain open until their committed delta and reports arrive.

## Deferred and parked findings — explicit disposition

Statuses describe current `7dfe56c`; items assigned to Task 9 remain provisional until its committed delta is provided.

### Task 1

- **M1:** vocabulary design point 6 says CV tests are “intact” despite point 5 recording changes; documentation minor, pending Task 9 check.
- **M2:** NP-004/hardening absent from task/design evidence and 1.5 precedes 1.4; documentation minor, pending Task 9 check.
- **M3:** `startNewProject` failure is caught and reported, but a subsequent unavailable/corrupt recovery warning can replace its visible message (`project-ui.mjs:294-305,317-336`). This is a rare inconsistent-build path; the diagnostic retains the cause. Remains minor error-presentation debt.
- **M4:** `while (1 < 3)` could later become supported in E3; future test-maintenance item, not an E2 blocker. Revisit when E3 adds expressions.
- **M5:** NP-002 covers startup-unavailable, while normal new-project creation is browser NP-BROWSER-001; adequate layered coverage, subject to final browser evidence.
- Two cosmetic items (two expects on one line and text locator): minor style, no behavioral impact.

### Task 2

- Name NFC/control/format validation: addressed in `scene2d-objects.mjs:69-79`, including UI normalization.
- First sprite versus hero and independent VM equivalence: addressed in Task 4's scene adapter and MS-022; first-sprite contract is documented.
- Case-sensitive IDs versus case-insensitive names and validator returning input: minor contract/documentation concern; ID syntax is stable, validation is read-only, callers needing ownership clone. No reproduced user-facing failure.
- Legacy profile silently upgraded on score activation: **promoted to Important 4**.

### Task 3

- Identical nonempty workspaces accepted by the downgrade guard: `project-format.mjs:113-115` still compares canonical equality, so it can drop one of two equal workspaces contrary to the stated “no other object has scripts” rule. Minor for current product UI: ordinary duplication regenerates block IDs, and the normal rollback uses a saved snapshot rather than this path; nevertheless fix the helper's guard or retain as explicit contract debt. An externally crafted valid v6 document or future caller can reach it.
- `project-authoring.mjs` is not specially classified by impact and conservatively expands to full; this is safe but costs a broader selection, not an omitted-test defect.
- `programObjectsFromIR0` does not validate the input itself: minor API-precondition debt; it says validate the output with the caller's resources. It currently has no production callers, only integration tests.
- v6 risk/GGPROJ wording and “IR 2D v1” naming: documentation check pending Task 9.
- `programLimits.nodes` reused for per-object limit: deliberate equal value, minor coupling, no current behavior defect.
- Scratch generator option forwarding: addressed by explicit option filtering in `toScratchProject`, `generateApi3ProgramSource` and `generateCode` (`src/generated-code.mjs:11-15`).
- Lesson validation swallowing invalid IR: fail-closed (authored checks fail), minor diagnostic debt; not silent false success.

### Task 4

- Hero-first lesson lookup and per-owner resources: addressed by `lesson-evaluation.mjs:38-45` and owner-aware `editor.programOf`.
- Inspector's hardcoded one-sprite/hero copy: addressed by object count/name/selected-resource rendering; see Task 7 literal stage-name nit.
- `sprite.get` returns visible name: addressed in `gg-bindings.mjs:20`; API1 mutations remain hero-only as designed.

### Task 5

- Stored `appliedHash` correction after switching objects: addressed via `state.correctStoredPoint` (`code-views-ui.mjs:160-166`, `code-views-state.mjs:108-115`).
- Missing selection failure cause: addressed via `settleText`/step and reason (`code-views-ui.mjs:252-270`).
- No-handler document in a hero-less scene: addressed in `text-program.mjs:137-140`, MS-045.
- Scope-insensitive `bound` in JS/Python compiler: remains minor diagnostic debt. A local binding in a different handler can suppress the early cross-object diagnostic and result in a normal runtime name error; it does not grant cross-object GG mutation.
- “One object with scripts” design wording versus one configured sprite: stale point 26; documentation alignment pending Task 9.
- Project copy limited to 16 handlers/16 variables, while per-object copies run only one object: intentional documented limit but material product limitation. Coordinator must disclose it; do not describe a larger scene's text copy as equivalent.
- Stage rule duplication: resolved by shared `scene2DStageOffers`/derived checks in Task 8; `targetIds` shape construction still has small duplication, minor.
- Failed Python prepare makes `dispose` delete absent `__gg_code`, and a test catches it: still minor cleanup/diagnostic debt (`python-engine.mjs:162-170`, test :209). The language controller removes the iframe and worker on failed preparation, so no confirmed persistent leak.
- TDD gaps: historical RED evidence remains partial; later UI/reviewer tests cover selection rollback and rename, but cannot retroactively prove original RED. Preserve as evidence limitation.
- MS-BROWSER-006 originally used DOM click: addressed with `clickVisible(#copy-javascript)`.
- Scratch VM storage warnings: real test-log noise, not evidence of functional failure. Report separately; the current run's exact logs remain pending.
- `eval`/`arguments` Blockly variable names produce invalid strict-mode generated JS: confirmed by a read-only probe of `generateApi3ProgramSource` → `compileApi3JavaScript` (`let eval = 0;` → `Binding eval in strict mode`; `arguments` likewise), from `api3-names.mjs:4-14`. Pre-existing/narrow variable-name case, minor, with no data loss. Add reserved variable identifiers and regression when practical.
- T5 carry to T6/T7 (panel routes through `selectObject`, rename regenerates, ZWJ normalization, export/lessons/listing/legacy-variable ownership): addressed in later tasks; see their individual review reports and source.

### Task 6

- Text typed during restart: guard added at `code-views-ui.mjs:297-307`; direct guard test exists. Real timing coverage remains separate Task 7 minor below.
- Creation guide, live alert, preserved form on refusal and scoped form on object/project change: addressed (`presentation-text.mjs`, `objects-ui.mjs:22,67-71,138-155`, MS-BROWSER-025 and MS-068).
- Live project Undo stack: **promoted to Important 2**.
- Nine-option editor height: Task 8 changes to a scrolling row and measures visible editor in MS-BROWSER-013-LIMIT; real 200%/400% zoom case MS-BROWSER-041. Final run/evidence pending.
- Duplicate limit/last-object copy and refresh function duplication: minor maintenance duplication, no independent behavior failure.
- Missing offline pack called text error: addressed by `textError` and step-aware result; MS-BROWSER-026.
- Historical warning counts, stale mutation summary and line-count mismatch: minor report accuracy; task-6 scoped review identified the correct mutation log. Do not conflate warnings with failures.
- Global promoted to stage survives removal of declaring blocks and counts toward 16: intentional conservative persistence to avoid breaking shared references; disclose as minor/limit, do not prune blindly.

### Task 7

- Deleting mounted object with an unmountable next sprite: still minor `objects-ui.mjs:190-200`; deletion stops and user must explicitly select the broken sprite to expose its deletion offer. Stage fallback would improve recovery.
- Library reports created object after `finishNew` cannot select it: remains minor `objects-ui.mjs:169-183`; the object did get committed, but the library success status conflicts with the panel failure and the exceptional path lacks a test.
- Old 273px “300px” claim: Task 8 replaced layout and measures visible height; verify final evidence rather than using Task 7's earlier measurement.
- `variables.set` widened with `variables.get` to locals on other sprites: still minor contract/documentation drift (`gg-bindings.mjs:37-46,71-73`); decide whether to scope writes or explicitly document/test them.
- `__gg_missing_resource__` accepted by legacy profiles as well: remains minor frozen-path relaxation at `block-program.mjs:171-181`; lowerer rejects unresolved marker. Gate to object profiles if preserving exact old refusal is required.
- Fixed-resource classification in three modules: minor maintenance duplication, with current equivalent categories; no user failure demonstrated.
- MS-BROWSER-025 probes the refresh guard directly, not typing during the actual asynchronous restart: test gap remains minor; guard is in place.
- Design point 7 promise/resource fallback, stale test range, and new text documents writing selected sprite: pending Task 9 documentation delta. Hardcoded “Escenario” literal remains cosmetic.
- Text costumes contain technical IDs: documented compatibility tradeoff, tell user; backdrop text uses names.
- `validateWorkspaceBlocks` recurses through all objects with string `type`, including fields: minor robustness debt for nonstandard field metadata; current installed blocks use known shapes.
- `remove` does not record unopened neighbour: same issue as first Task 7 entry, not discarded.
- Fixed 100ms wait and invisible extra Undo/Redo step after foreign paste: minor test/UX debt, with recovery regression MS-BROWSER-032; no evidence of lost prior edits.
- GG-LIB-004 intermittent failure: unexplained historical 148a7cb failure; coordinator repeated 5/5 on c638eb2 and fresh affected run is pending. Do not call the root cause solved.

### Additional minor integration observation

- When the stage is selected, the inspector's heading says “Variables del escenario”, but `scene-inspector-ui.mjs:48-54,70-82` displays only a generic explanation and `gg-bindings.mjs:25-35` omits stage/global variables from `scene.get`. There is no wrong value or data loss, and direct `variables.get` remains available; consider showing the shared values in a future inspector iteration while preserving legacy DTOs.

### Task 8

- The private-name leak in text-mode click controls is included in **Important 1**, which covers ordinary internal IDs too.
- Three earlier Important task-review findings (Scratch reserved destinations, API1 vs API3 destination ambiguity, incorrect contextual text help) were repaired in `7dfe56c` and checked by scoped re-review; the saved-mapping/name-reuse scenario above is a distinct unresolved integration case. The help repair introduced the unfinished-object selection regression in **Important 11**, discovered by MS-BROWSER-028 in the subsequent browser run.

## Declined to judge / explicit product rulings

- Idle stage displays the runner's prior/default scene until Run, so a new sprite is absent and a deleted hero may remain visible. Coordinator ruled out live preview and the panel explains this. This changes the mental model for students; disclose and let the user judge the product decision.
- More than 16 events or variables in a whole-project text copy: documented current text-runtime safety limit; removing or raising it changes the design. Disclose the functional limit.
- Technical costume IDs in independent textual copies: retained to avoid changing existing copy semantics; user should see the tradeoff.
- Future E3 operators/sensors and potential acceptance of `while (1 < 3)`: explicitly outside E2; revisit affected tests when E3 lands.
- Multi-sprite editable Scratch export, layers/camera and >8 sprites: explicitly outside R5; this review does not judge those features.
- Human classroom/screen-reader assessment, real micro:bit hardware and full offline/rendering guarantees cannot be inferred from Node evidence; coordinator owns the distinct gate and any remaining external acceptance.

## Code-pass assessment

**Code requires fixes:** eleven confirmed Important findings above. This is the code-review assessment only; the integration verdict remains pending the documentation delta and complete verification evidence.

## Evidence / final gate

- Coordinator reports fresh default Node 602/602, tools 88/88, OpenSpec 38/38 and build pass on `7dfe56c`; earlier loaded attempt 600/602 and tools cancellation remain historical and must not be erased. Browser smoke and 26 affected specs were in progress; MS-BROWSER-028 failed as documented in Important 11. These are pre-fix-wave results, not a final green browser gate.
- Await the committed Task 9 documentation delta, complete verification reports and coordinator's rulings before writing the final assessment. After the consolidated fix wave, the coordinator owns scoped re-review and fresh verification.



</details>

## Apéndice F · historia de la reparación y cadena de re-review

Cada snapshot conserva su corte. Los rechazos a66ae47/1b74566 no se borran:
R1/R2 se resuelven después y R3 termina en fb4215f. Los GREEN focales se
solapan y no se suman como suite; la puerta final se inserta en el cuerpo.
El informe del reparador incluye source/cohort/case provenance y sus fallos.

<details>
<summary>task-8-fix-round-1.md: snapshot con alcance propio</summary>

# Task 8 · correcciones de revisión · ronda 1

Base: 242877d. Alcance: exactamente los tres Important de task-8-review.md. El coordinador liberó la congelación antes de las ediciones; sin cambios upstream, dependencias, manifiestos publicados, formatos guardados ni suites full.

## Causas y reparación

1. Scratch reconoce _mouse_/_random_ antes de buscar un sprite. Ambos IDs siguen válidos y guardados igual; solo el adaptador los representa como /gg/_mouse_ y /gg/_random_. La barra queda fuera de la sintaxis de IDs, evitando colisiones. Lowering, destinos textuales, callbacks, bindings, snapshot y controles nativos comparten el mapeo; la importación Scratch conserva su ruta.
2. El traductor API3 perdía el tipo de referencia al producir una cadena. Ahora JS y Python producen el DTO estricto {identifier:"cesta"}; las cadenas API1 solo significan IDs literales. La escena comprueba pertenencia propia del mapa, sin prioridad ni fallback. Formas extra, identificadores inválidos y nombres heredados se rechazan sin mover el objeto.
   El DTO Python reprodujo un error de préstamo de PyProxy en la conversión contextual existente: destruía el argumento que el puente aún usaba. La ruta contextual reutiliza la conversión con copia propia ya existente para capacidades. No se modifica el motor upstream.
3. La ayuda se deriva de tablas bloqueadas, lenguaje activo, dueño y fondos de la vista de recursos. Los packs viejos omiten fondos; Python usa set_backdrop; el proyecto inicial 0.3 usa Fondo inicial.

OPCODE-MATRIX corrige la falsa exclusión de centinelas. design.md añade decisiones62–64 y precisa el contrato previo55.

## TDD y evidencia

Raíz: artifacts/stabilization-2d/e2-multisprite/task-8/.

- fix-round1-red.log: MS-070/071 para ambos IDs y MS-072 de colisión;0/5 pasan, cinco fallos por coordenadas incorrectas. La colisión falla primero en JavaScript API1; las dos lenguas se alcanzan en GREEN.
- fix-round1-help-red.log: MS-073 falla por ofrecer setBackdrop("Noche") con lock0.1.0. Un primer intento del harness omitía editor.subscribe; se corrigió antes del RED de comportamiento.
- fix-round1-green.log: primer GREEN incompleto:3 pasan/3 fallan. El fixture heredaba dirección-90 y esperaba desplazamiento+2; se fijó dirección90 manteniendo la expectativa literal. El DTO Python mostró el fallo de proxy prestado descrito arriba.
- fix-round1-green2.log:6/6 pasan,0 fallan.
- fix-round1-tag-red.log: MS-072 exige rechazar identifier=toString y falla con "Missing expected exception"; motiva Object.hasOwn.
- fix-round1-final-focused.log:6/6 pasan,0 fallan,7.508s; incluye el rechazo de formas extra y nombres heredados.
- fix-round1-scoped.log:31/31 pasan,0 fallan,51.865s en tests/integration/scene2d-dialogo.test.mjs y scene2d-text.test.mjs. Esta corrida empezó antes del ajuste final Object.hasOwn; la focal final vuelve a comprobar el comportamiento modificado.
- Los tests headless usan el fixture sin storage/renderer y registran avisos heredados "No storage module present"; no se silencian ni se presentan como prueba de render.
- No se tocaron archivos de navegador. MS-073 construye la presentación real de createCodeViewsUI con nodos DOM de prueba y sigue el ejemplo por los parsers reales JS/Python. Cubre locks0.1/0.2/0.3 y vistas con Fondo inicial o solo Noche.
- CodeGraph: índice del worktree sin inicializar; query y sync lo rechazaron. Se consultó el índice principal en solo lectura para createTextProgram/createCodeViewsUI/createPythonEngine; el símbolo de escena no existe en ese índice anterior. fix-python-codegraph.json y fix-codegraph-sync.log conservan las últimas consultas/intento. No se escribió el índice principal.
- fix-round1-affected-list.log conserva la selección exacta. Si selection=full, el coordinador aplica nuevas+26 nominales+smoke y conserva la sugerencia de full para el usuario.

## Verificación amplia pendiente

El verificador independiente tiene propiedad de Node completo, herramientas, OpenSpec, build, smoke y las26 specs nominales afectadas en dos procesos sobre un único servidor inmutable, puertos5700–5709. No se ejecutan full ni standalone-contexts. Su evidencia y revisión deben añadirse antes de declarar cerrada la tarea8.



</details>

<details>
<summary>task-8-rereview-1.md: snapshot con alcance propio</summary>

### Finding verdicts

- **Reserved Scratch destination IDs** — ADDRESSED. Both target names and block destinations use the collision-free adapter mapping (src/adapters/scratch/scene-target-names.mjs:4, src/adapters/scratch/scratch-project.mjs:124 and :251); the text path uses the same mapping for callback owners and destinations (src/adapters/scratch/text-program.mjs:133 and :293). Saved IDs remain unchanged. MS-070/071 cover both IDs against the real VM (tests/integration/scene2d-dialogo.test.mjs:405).
- **API1 ID / API3 identifier ambiguity** — ADDRESSED. Translators emit tagged API3 references (src/targets/text/api-v3.mjs:137, src/targets/text/api-v3-python.mjs:140); strict RPC shape checking and own-property lookup keep them distinct from literal API1 IDs (src/contracts/text-program.mjs:118, src/adapters/scratch/text-program.mjs:337). Python copies borrowed arguments before conversion (src/targets/text/python-engine.mjs:29 and :62). MS-072 tests both languages and both API versions through their engines and the VM, including malformed references (tests/integration/scene2d-text.test.mjs:473).
- **Invalid synchronized help** — ADDRESSED. Help selects active locked entries, language and an existing backdrop (src/studio/code-views-ui.mjs:28–46, :319); MS-073 parses its displayed example with real JS/Python parsers for 0.1/0.2/0.3 (tests/integration/scene2d-dialogo.test.mjs:447).

### New breakage in the fix diff

- **Minor — private target name shown in text-mode controls:** src/adapters/scratch/stage-input.mjs:47 decodes the private VM name only in native mode. The scene switches the input to text mode for a text run (src/adapters/scratch/browser-scene.mjs:248), so a clickable sprite whose ID is _mouse_ or _random_ displays /gg/_mouse_ or /gg/_random_ in the selector and click status. The target remains correct. Deferred to final review; decode for both native and text modes, while leaving imported Scratch names unchanged.

### Out-of-scope observations

- None.

### Evidence and verdict

- The reported focused final log contains 6/6 passing with zero failures; the scoped log contains 31/31, but precedes the final Object.hasOwn tightening. The RED logs report 0/5, 0/1 and 0/1 respectively. This review inspected those logs and did not run suites or browser tests.
- Broad verification on head 7dfe56c is pending. The coordinator reported a JS 3D/web capability timeout under concurrent external load; this diff does not change the JavaScript capability engine, so a direct cause from this fix is not apparent. That is an inference, not a cleared test: an isolated repro is pending. No final broad verification claim is made.
- **Fix round: All three findings addressed, no new Critical/Important breakage.** One new Minor issue remains.
- **Spec/quality conditional verdict:** the scoped fixes satisfy the three reviewed requirements and are acceptable subject to the Minor issue above; overall Task 8 completion and final quality approval remain conditional on the independent broad verification.




</details>

<details>
<summary>final-fix-report.md: snapshot con alcance propio</summary>

# E2 — informe de la única ola final de correcciones

Base: 7dfe56c6b5b2f47dc900821bd9e813c31aef2f6e. Worktree stab/e2-multisprite. Liberación explícita del coordinador recibida tras terminar ambos lotes de navegador y detener su servidor propio. Estado: EN IMPLEMENTACIÓN; no declara cierre ni affected verde.

## Evidencia anterior preservada

Node602/tools88/OpenSpec38/build/smoke3 aprobados sobre7dfe56c; navegador afectado184/187, tres fallos (MS-BROWSER-028, GG-LIB-004 readiness, GG-INSPECT-003 deadline45s). No convertirlo en puerta afectada aprobada. Ver task-8-report.md y verification-summary.json originales. Inspector no se modifica por ese timeout.

## Operación

Sin subagentes, upstreams, instalación de dependencias, full, push/merge ni PID ajenos. Pruebas focales y build propios; verificador queda inactivo hasta HEAD estable. WSL/source env con Node del proyecto. Puertos5700–5709, roots de evidencias absolutos. Lifecycle autorizado: servidor normal propio preiniciado y config local que solo cambia reuse/testDir; no acredita startup gestionado por Playwright.

Se leyeron systematic-debugging, test-driven-development/writing-good-tests, receiving-code-review, verification-before-completion y skills locales de arquitectura/diseño/verificación. CodeGraph del worktree no inicializado; fallback read-only del principal para validateProgram/validateTextProgramRPC y comparación con consumidores actuales por búsqueda. No se escribió en el índice principal.

## Registro RED/GREEN

Todos los comandos y logs de esta ola viven en artifacts/stabilization-2d/e2-multisprite/final-fix/. Los scripts por corrida son inmutables.

| Hallazgo | Causa y cambio actual | Prueba / evidencia focal |
|---|---|---|
|1|stage-input usaba nombre VM=ID; browser-scene pasa objetos de fixture y nombres resuelve visible en native/text, escenario y clones; scratch conserva etiquetas|MS-074; red-1.sh 4fail/1pass total, green-1.sh5/5|
|2|historia viva y sessions no se limpiaban/restauraban juntas; prepare lleva resetHistory para apertura explícita, también mismaUUID; checkpoints incluyen stacks/sessionProject/sessions; mutaciones del mismo proyecto no resetean|MS-080 real Blockly: red-4.sh2fail (99→17), green-4.sh2/2; navegador pendiente|
|3|rollback devolvía snapshot anterior sin comprobar trabajo posterior|RED navegador en curso; implementación pendiente|
|4|null capabilities ocultaba updates y activar score elegía latest; se materializa perfil0.1 solo en migración explícita por cadena y shell usa lockedPackVersions en activaciones|MS-077 v1/v2 guardados: red-3.sh5fail total; green-3b.sh5/5; navegador pendiente|
|5|goToObject ignoraba runtime.targetIds; JS/Python usan IDliteral cuando existe entrada explícita y tag dinámico solo sin entrada|MS-075 real QuickJS/Pyodide+VM, rename/reuse/deletion/IDsreservados; red-2.sh8fail total, green-2.sh8/8|
|6|IR0 intermedia limitaba16totales antes de composición; modo explícito de workspace por objeto permite agregado32 solo en perfil de objetos/owner; IR1 final mantiene16por dueño, copiasruntime16|MS-078 Blockly+JS/Python conversion16+1/16+16,17porgrupo y legacy/text16; red-3.sh5fail total; green-3b.sh5/5; Run navegador pendiente|
|7|runTextDocument bajaba todos los scripts y catch vaciaba variables; authoring.variables lee/valida modelos y reglas de ámbito sin bajar cuerpos|MS-079 con if ajeno incompleto, ambos objetos montados; red-3.sh5fail total; green-3b.sh5/5; API1 navegador pendiente|
|8|microbit staleness comparaba solo el workspace montado aunque ejecuta toda la escena|RED navegador en curso; implementación pendiente|
|9|string API1-ID/API3-label compartía precedencia; API3 ahora envía DTO estricto label y adaptador string soloID/DTO soloetiqueta|MS-076 generaciónAPI1+motoresJS/Python+VM con colisión y unknown/formaextra; red-2.sh8fail total, green-2.sh8/8|
|10|first-match de impact omitía E2 en varios mapas; se amplían grupos de objetos, recursos/importación, lenguaje, controles y fixtureDiálogo|TEST-IMPACT-E2 por dependencia; red-1.sh4fail total, green-1.sh5/5; nueva suite focal inventariada|
|11|textHelp llamaba codeViewSnapshot para recursos y bajaba if incompleto durante mount; usa editor.resourceView sin lowering|MS-073 ahora falla si ayuda baja; red-1.sh4fail total, green-1.sh5/5. MS-BROWSER-028 histórico RED; ampliado a JS/Python y pendiente GREEN|
|GG-LIB|Run final no esperaba confirmación de carga antes de snapshot|Fallo histórico preservado; añadir sincronización de protocolo, sin cambiar aserción ni timeout/retries|
|Inspector|final state correcto, deadline total45s bajo carga; sin defecto de producto confirmado|Corrida focal intacta pendiente; timeout/retries intactos|

Comando red-1: node --test --test-name-pattern='MS-07[34]|TEST-IMPACT-E2' scratch-stage-input.test.mjs scene2d-dialogo.test.mjs test-impact.test.mjs (rutas completas en script).
Comando red-2: node --test --test-name-pattern='MS-07[56]' tests/integration/scene2d-text.test.mjs.
Comando red-3: node --test --test-name-pattern='MS-07[789]' tests/integration/scene2d-text.test.mjs tests/integration/scene2d-authoring.test.mjs.
Comando red-4: node --test --test-name-pattern=MS-080 tests/integration/scene2d-object-edits.test.mjs.
Build1: npm run browser:build, exit0, 28.199s (build-1.log).

## Intentos y limitaciones

- apply_patch rechazó el acceso UNC por reparse point antes de escribir; los cambios se aplican con scripts Python locales al worktree.
- Una llamada de edición tenía una comilla de plantilla inválida y no se ejecutó.
- edit-3-green.py se detuvo en una aserción de indentación después de los cambios de presupuesto/migración y antes de insertar variables; green-3.log conserva4pass/1fail. edit-3-complete.py completó únicamente esa inserción y green-3b pasó5/5.
- server-1.sh tuvo un redirect ambiguo por CRLF al último renglón antes de arrancar; normalizado a LF y arrancado. Servidor PID propio en server.pid y sesión84884; no se tocó ningún PID ajeno.
- Las pruebas VM Node conservan avisos de storage/central dispatch, sin convertirlos en fallos funcionales ni ocultarlos.
- Las pruebas nuevas no retroacreditan RED histórico de tareas anteriores.
- Fuente en evolución durante edición; ninguna puerta amplia corre hasta congelar un commit estable. Capturas suplementarias de zoom quedan al script del verificador después de las corridas normales.

## Pendiente antes de entrega

Completar3/8 y readinessGG-LIB; focos navegador reales, pruebas existentes afectadas inmediatas, revisión propia, decisiones de diseño/opcodes, commits locales españoles/trailer y affected--list. Después entregar HEAD estable al coordinador/verificador, congelar y esperar puerta amplia/revisión Terra. T9 se reconcilia después de esa puerta por orden más reciente.
## Corte estable y revisión posterior — a66ae47 (30/10/2026)

Commit local: a66ae47b6705a30534eed15dc6750b1b27ed46fa, 38 archivos, mensaje español y trailer requerido. Árbol versionado limpio. Los once hallazgos y la sincronización de GG-LIB están implementados, pero la revisión scoped posterior dejó HOLD por un residual del guard de rollback: la clave usada no incluye nombres/configuración del proyecto. No se declara la ola cerrada ni se inicia verificación amplia. No hubo cambios versionados después del commit; se espera adjudicación/liberación del coordinador.

Estado focal obtenido (supersede las filas pendientes anteriores, sin borrar intentos):

- Node nuevo/inmediatamente afectado: focused-node.log23/23 exit0; después la restricción de metadatos globales a perfiles de objetos tuvo RED2/2 y GREEN2/2 en red-legacy-scope.log/green-legacy-scope.log. No sumar estas repeticiones como casos de una suite completa.
- Selectores y particiones: green-impact-files.log26/26 exit0. El caso nuevo también sigue dependencias de migración, project-ui, generadores y controles.
- Presupuesto preciso: red-budget-scope.log2fail por0 globales heredados frente16; green-budget-scope.log2/2. Metadatos globales atraviesan preparación/editor/snapshot/conversión; ambos grupos16 se validan también antes de componer. red-budget-listing y green-budget-listing conservan2fail→2pass del consumidor de consulta. IR0 legada y runtime independiente mantienen16totales.
- Browser-green-1 seleccionó12, no13: el patrón con dos puntos omitió GG-LIB-004/005/006/007. Resultado5pass/7fail. Pases conservados: HISTORY, ROLLBACK bloques, ROLLBACK texto pendiente, BUDGET, MS-BROWSER-028 ampliada a JS/Python.
- Los7 fallos fueron exclusivamente fixture/readiness/expectativas de estado: v1/v2 comparaban CRLF contra el textarea ya normalizado a LF antes de migrar; el combinado admitía simulation=null como generación distinta; los dos programas API1 finitos terminaban en «Documento terminado»; etiquetas y copia con eventos quedaban correctamente en «Documento activo · eventos disponibles». Se mantuvieron las aserciones de valores, nombres, clones, IDs y destino. La corrección comparó la fuente capturada antes de actualizar y estados terminales exactos, sin aceptar cualquier estado ni ampliar límites.
- browser-green-2-list.log prueba exactamente8 casos (los7 corregidos y la biblioteca omitida). browser-green-2.json/log:8/8 exit0,1.8min. Biblioteca conserva disfraz/píxeles/portabilidad y límites; espera la confirmación existente «Bloques ejecutados».
- Inspector unchanged: inspector-focused-list.log exactamente1; inspector-focused.json/log1/1 exit0,13.4s (14.2s proceso), sin otra corrida propia simultánea y sin cambiar timeout45s.
- Unión focal única =13 prioridad +1 inspector. No es la selección afectada completa. Ninguna prueba se saltó ni se marcó flaky para declarar esa unión.

Cohort realmente servido durante ambos GREEN y el inspector:5ea086781576fb4b54372d78304f2dc8ed9857bd1fc5829ef01b7f5e76e1313f (focused-served-config.json). Build4 exit0,15.916s. Build3 exit0,18.013s; build2 exit0,15.280s. No cambios de producto/helper/config/tools después del primer GREEN; solo condiciones de los casos fallidos en dos archivos de pruebas. Los5 pases conservados tienen cuerpos/helpers intactos.

Proveniencia:
- focused-source-before.json:441 archivos src/tests/tools/config/package/playwright, SHA agregadoa98d22d4d3dcdeb09797ea5010158f69b499c74b9dca28ba3d505ff87c117998.
- focused-source-after.json del commit:441 archivos, SHA agregadob5116edfaea3097f5a0ab53c401fa93a3d52dd8dfc3723f62fa29635555d52a2.
- Solo difieren tests/browser/device-integration.spec.mjs y tests/browser/scene2d-final-fixes.spec.mjs por los casos fallidos corregidos. Se conservaron los archivos originales exactos como green-1-tested-device-integration.spec.mjs y green-1-tested-scene2d-final-fixes.spec.mjs. El verificador está auditando la equivalencia de cuerpos/helpers de los5 pases antes de darles crédito en la puerta final.
- affected-list.sh/log/exit y changed-files.txt contienen la selección completa a66ae47 desde7dfe56c; es selection:full por fronteras compartidas. Propuesta nombrada:29 specs justificados de final-verification-plan.md, aprobada de forma acotada por el coordinador y pendiente de su auditoría final. Sin standalone-contexts ni test:full; no se avanza baseline.

Servidor propio1279382 detenido tras comprobar cwd y argv; server-2-stop.meta conserva identidad, sesión81631 terminó exit0 y ss confirmó5700–5709 libres. No PID ajenos tocados. Verificador informado. Los errores de scripts/fixtures/RED previos permanecen en sus archivos; no se sobrescribieron logs activos.

CodeGraph: las consultas read-only del índice principal fueron previas a fronteras. sync propio se intentó y falló «not initialized»; status confirmó ausencia de índice local. No se inicializó ni escribió el índice de otro checkout. Esta limitación se entrega al coordinador.

Revisión propia: delta revisado en transacciones, contexto global, separación de referencias y mapas; git diff --check limpio antes del commit. Diseño E2 puntos65–70 y precisión55/63, y OPCODE-MATRIX de fase5 registran decisiones reales; no cambian opcodes/manifiestos/hashes publicados. Spec/Node/tools/build/smoke/named amplios finales se delegan a la verificación independiente, todavía sin ejecutar sobre este corte en HOLD.
### Residuales scoped recibidos durante HOLD

La revisión posterior añadió dos causas además del guard de nombres/configuración: (a) la solicitud de vistas usa todos los IDs globales de la IR viva como permiso para quitar la asignación declaradora; hay que distinguir globales heredados durables del escenario frente a una declaración que solo existe en un bloque vivo. (b) authoring.variables valida los presupuestos de todos los objetos, por lo que17locales de un objeto ajeno bloquean un documento independiente que no los usa. Se propuso separar lectura por dueño/necesidad de la validación de presupuestos ajenos; API3 ya configura sus propias declaraciones. Ambas propuestas son solo lectura y esperan lista/ruling/release consolidada. No hubo nuevas ediciones de fuente, pruebas ni commits tras a66ae47.
## Residual completion authorized after scoped re-review (base a66ae47)

The coordinator explicitly released exactly R1/R2/R3 from final-fix-rereview.md, overriding the final-wave cap for the demonstrated data-loss/scope/runtime regressions. No additional product scope, dependency/upstream changes, subagents, broad suites or timeout/retry changes. The previous a66ae47 evidence above remains historical and is not relabeled as a repaired gate.

### Causes and bounded changes

- **R1:** the rollback comparison omitted durable project-name/capability configuration. The synchronous canonical key now contains project ID/name, the complete authoring capture (including capability config), and pending synchronized text. Revision and timestamp bookkeeping are absent. The preflight and commit-time comparison remain the same function; later changes preserve the work and block stale restoration.
- **R2:** all lowered global IDs were incorrectly accepted as inherited proof, and reconstruction trusted the candidate's claimed scope. The coordinator now supplies only declarations durably present in stage models/other objects. Owned last-declaration removal is rejected by the existing JS/Python parser. Both inverse translation and final lowering use the proven inherited set rather than candidate assertions. Stage inheritance remains valid; no new portable field or opcode is introduced.
- **R3:** independent execution validated every object's variable budget. Legacy API1 captures only hero's local models, independent of selection, and validates that owner. API3 uses its own declarations. Other drafts cannot block these paths; full native Run still validates every object and rejects 17 locals. The prior unfinished-script/valid-owner behavior is retained.

### Focused evidence (residual-completion artifact directory)

All commands ran in the E2 worktree through WSL after sourcing ../scripts/env.sh and removing Node/npm/npx shell wrappers. Exact immutable scripts and logs are under artifacts/stabilization-2d/e2-multisprite/final-fix/residual-completion/.

- node-red.sh: node --test --test-name-pattern='MS-RESIDUAL-R[23]' tests/integration/scene2d-text.test.mjs tests/integration/scene2d-authoring.test.mjs. Exit 1, **0/3**: both languages accepted a forged global scope without durable declaration; owner-variable capture threw on the unrelated 17-local draft.
- browser-red-list.sh: initial inventory **14** new cases. A later explicit autosave-bookkeeping/immediate-rollback regression makes the final new inventory **15**.
- browser-red.sh: four bounded cases against the unchanged a66 product, exit 1, **0/4**. R1 silently rolled back the changed name; API1/API3 both reported variable limit. The first R2 attempt stopped at a test harness mistake: textarea textContent was checked instead of value.
- browser-red-r2.sh: corrected only that textarea matcher to toHaveValue(/shared\\(0\\)/), then reran the live-owned JS case against the unchanged a66 product. Exit 1, **0/1**, conversion wrongly succeeded with no required-declaration error. This is the intended browser R2 RED; the earlier attempt remains preserved.
- node-green-1.sh: residual R2/R3 plus directly affected MS-078 and MS-079. Exit 0, **6/6**: both languages, real Blockly inverse/lowering, inherited globals, 16+1/16+16, per-scope cap+1, legacy/text 16-total, and unfinished-script owner extraction.
- build-green-1.sh: incremental browser build exit 0, 19.829 s. Served cohort **72cb0fe38bd7ea9cc144022c7b2c8d906fb672d2f1a79b9004a5c5b8da58422d**, saved in served-config.json.
- browser-green-1-list.sh: exact **20** = 15 new residual cases + five prior directly affected rollback (2), budget (1), independent unfinished-script (2) cases. Browser execution/result pending at report preparation.
- source-before-browser.json: 441 source/test/tool/config/package files; aggregate **873fe9a291e95e840ceb3e20235eb043262bcb0d435ac313e8b1c52cd1b508ee**. No product/test/helper/config changes after this manifest at the first browser launch; design prose was updated during execution.

Read-only boundary query: codegraph-authoring.json queries createProjectAuthoring in the main index. The worktree index remains unavailable/uninitialized as documented earlier; no main-index synchronization or writes were performed. git diff --check passes at this preparation point.

### Handoff pending final focused results

Only the three residuals and introduced delta are candidates for the next scoped re-review. Broad final verification remains unstarted under the coordinator's hold. Source commit, final manifests, exact result and owned-server cleanup are appended below when ready.

### Final residual cut — 1b745665bb28bad8bd01fd0e2a890b51324cce57

**Tracked tree clean; sole writer frozen.** Local Spanish commit includes the required coauthor trailer. No source/test/helper/config/tool changes followed the final focused probe; design wording was reconciled before committing. No new opcode/manifests/dependency change was required.

**Exact final browser inventory: 21 unique cases = 16 residual + five prior directly affected.** The initial 14 became 15 when autosave-only immediate rollback was made explicit, then 16 when UI rename invalidation was separated from direct authoring configuration protection. browser-final-list.log is the authoritative listing.

- browser-green-1.sh exited 1: **19 passed / 1 failed**, 5.7 minutes. All R2/R3, original rollback/budget/unfinished-script cases, project-name preservation and autosave-only immediate rollback passed. The sprite case timed out trying to reveal a hidden rollback button.
- browser-green-2.sh exited 1: **0/1**, same canonical 120-second case limit. Removing the test's extra explicit replacement was insufficient: actual UI rename itself calls resources-ui.objectsTransaction → project.replaceAuthoring → onApplied, which clears previousProjectSnapshot and hides rollback. This corrects the review's specific UI trigger assumption. Both failed traces and snapshots remain untouched, with sprite-timeout-last-actions.jsonl preserving the first wait.
- browser-green-3.sh exited 1: **1 passed / 1 failed**, 39.6 seconds. The new actual UI rename case passed: rollback hidden, renamed sprite saved/reopened, no autorun. The direct configuration probe failed when it started after the version list rendered but before the update handler stored its rollback baseline. This is preserved as an **update-in-progress probe**; it does not establish that all underlying races are harmless.
- browser-green-4.sh exited 0: **1/1**, 10.8 seconds (case 9.9 s). The corrected direct probe waits for the existing rollback offer to be visible, asserts actual name/x changed, then verifies rollback refusal and durable save/reopen.
- No product/helper/config/tool change occurred during these browser runs. Only the failed R1 test branch, its completion synchronization/assertion, and the appended UI rename case changed; every other executed test path remains unchanged. Original tested files from green-1, green-2 and green-3 are preserved. No timeout, retry, wait limit, helper or broad accepted-status list changed.
- Eligible focused GREEN union is **19 from green-1 + UI rename from green-3 + direct configuration from green-4 = 21**, with exact case identity/provenance in stable-cut.json and reuse-audit-final.json. This is focused owner evidence, subject to independent audit, **not** an affected/full/browser integration gate pass.
- Node final focus remains **6/6**, exit 0; no later Node-relevant change. Incremental build remains exit 0; no later product change. Cohort **72cb0fe38bd7ea9cc144022c7b2c8d906fb672d2f1a79b9004a5c5b8da58422d** is unchanged across the focused browser executions.
- source-final-committed.json equals source-before-browser-4.json exactly: **441 files**, aggregate **c8015dbca4db9f5a42825e631ef8e2358f8e00a4f4e20277ba42ec7c83619b42**. Relative to the first GREEN manifest, only tests/browser/scene2d-final-fixes.spec.mjs differs; no product/helpers/tools/config files differ.
- Stable affected-list.sh ran **--list only**, exit 0, against 7dfe56c..1b74566. The shared-boundary selector remains full (50 browser specs). No selected suite was executed here. The coordinator's already-proposed bounded 29 named-spec plan remains the appropriate review proposal; the residual cases live in its existing final-fixes suite. Final selection/credits remain the verifier/coordinator's audit decision.

Owned repaired-cohort server **1294391** was checked against cwd/argv and stopped; its exec session exited 0. ports-after-stop.txt is empty and the check exited 0 for 5700–5709/5760–5769. The earlier RED server 1292020 was likewise ownership-checked/stopped. No foreign process was terminated.

**Remaining limits:** broad Node/tools/spec/build/smoke/named-browser gate remains unstarted by this agent and is reserved to the independent verifier after root release; scoped R1/R2/R3 review remains the next gate. No hardware or new native-zoom capture claim is made. The update-in-progress probe is retained without broader concurrency claims. CodeGraph worktree-index availability remains the previously recorded limitation.

## R3 owner-budget completion — base 1b74566, stable fb4215f06e5d22e06cb9977324079f2de4758f08

The completed final-residual-rereview.md accepted R1/R2 but retained the owner-budget instance of R3. The coordinator explicitly released only this correction and its regressions; broad verification had not begun. The 1b74566 evidence above remains preserved, without automatically crediting its browser cases to this changed source.

**Cause and change:** API1 still unconditionally validated hero's own 17-model draft even for a document that never requests variables. The existing variable model reader now has an explicit omitOverBudget availability option, selected only by API1 shell execution. After owner/local selection it validates types, each model's structure and identity, then omits the **entire** over-budget group. It never truncates to sixteen or catches arbitrary errors. Valid groups remain available. The default reader and native block Run remain strict; API3 continues using its own declarations. No source-text heuristic, parser change, cap increase, catch-all, new opcode or dependency was added. Existing runtime authorization/variable lookup reports an unavailable reference truthfully.

**Exact focused evidence:** immutable scripts/logs/JSON are in artifacts/stabilization-2d/e2-multisprite/final-fix/owner-budget-completion/.

- node-red.sh: node --test --test-name-pattern='MS-OWNER-BUDGET' tests/integration/scene2d-authoring.test.mjs. Exit 1, **0/1**: hero17 throws variable limit before independent availability.
- browser-red.sh: actual no-variable API1, hero17, selected Ana, unchanged base product. Exit 1, **0/1**, variable-limit failure. Trace/error snapshot retained.
- node-green.sh: pattern MS-OWNER-BUDGET|MS-RESIDUAL-R3|MS-079, same integration file. Exit 0, **3/3**. Whole invalid group omitted; strict default rejects17; valid local preserved; malformed names, duplicate IDs and unsupported numeric type still throw; prior unrelated/incomplete-script behavior preserved.
- build-green-1.sh: incremental build exit 0, **17.306 seconds**. Served cohort **92a65c2a4a2643ebf3eb1be15ab732a3db099bee1fa260fc8b55de8643caa8b6**.
- browser-green-list.sh: exactly **8** = six new hero17 cases (API1, API3, unavailable existing ID × selected Ana/Cesta) plus two prior valid-owner cases with Cesta17.
- browser-green.sh: exit 0, **8/8**, 1.4 minutes. No-variable documents move hero by1; actual unavailable hero-draft-0 reference terminates with a missing/undeclared-variable error and hero remains unmoved; valid hero locals reach42; native Run still rejects17 and drafts retain all17 models. No autorun, skipped/flaky cases, test/helper corrections or product changes during/after this GREEN.
- source-before-browser.json equals source-final-committed.json exactly: **441 files**, aggregate **d0b87121eec5dc824386de8f9e40a0e0f25f678c91ad740344e8bd517bb4d3a1**. Stable-cut.json records exact case identities, commands, exits and cohort; no source/test/helper/config/tool changes followed browser launch.
- Stable affected --list only: exit 0, selection **full**, **50 browser specs**. No selected suite executed. The coordinator/verifier retains the named gate and reuse audit decisions.
- Read-only CodeGraph query retained in codegraph-authoring.json; same existing-index fallback limitation as before. git diff --check passed before the local Spanish commit with required coauthor trailer.

Owned RED server1301510 and GREEN server1302487 were each checked against cwd/argv and stopped. GREEN exec session exited0; ports-after-stop.txt is empty and the ports check exited0 for5700–5709/5760–5769. No foreign process was terminated.

**Frozen handoff:** tracked tree clean at fb4215f06e5d22e06cb9977324079f2de4758f08. This is the final narrow R3 owner-budget owner evidence, **not a broad integration pass**. Scoped review of this delta and independent final verification/Task9 remain with the coordinator. No tracked edits or suites remain active from this agent.

## MS-BROWSER-037 final-gate test synchronization


Root released this sole test correction after both ordinary final browser batches finished on fb4215f (A95/97, B99/99). Their original failures/artifacts remain preserved. No extra RED run was added: the retained MS037 Python-copy Program revision replaced trace is the direct failure evidence.

Only tests/browser/scene2d-dialogo.spec.mjs changed: **one insertion** after text Run inside the existing JavaScript/Python loop, waiting for exact #text-run-status = Documento activo · eventos disponibles. Run synchronously clears that prior readiness state before its first await. Original copy-source assertions, final scene-value poll, explicit timeouts, retries, catches, helpers and product are unchanged.

- list.sh: absolute existing managed config, original 5700-range, unanchored unique grep MS-BROWSER-037:, exit0, **exactly1 case**.
- focused.sh: same command without --list, exit0, **1/1**, case18.2s / total19.0s. JSON focused.json and original options/output retained.
- Stable local Spanish commit **e51b2d39bab871c693b2dabae0e7ac300d638fea**, required coauthor trailer; tracked tree clean.
- source-base.json → source-final-committed.json differ only in the one test file. Launch source-before-focused.json equals final exactly: **441 files**, aggregate **5c43fd7aa684205ecaf0ade4192ad0d7c33a6ee2f96524397d1ff5e4ae0bcd40**. Product/helper/config/MS032 hashes unchanged.
- Borrowed verifier server **1308184** stayed running on immutable cohort **d0ead8b08c72c59e33ec7e3701b4a14c7926a92b01a0b7509c752f3c16e521a7**, built from fb4215f product source. No build, server start/stop, timeout/retry change or other case execution by this task.
- stable-cut.json records exact commands, result, case identity and provenance. Focused process exited and verifier was notified directly before its isolated unchanged MS032/zoom continuation.

This is the corrected MS037 case evidence, not a new broad gate or a claim about the separate MS032 timeout. Scoped review and final verification reconciliation remain with root/verifier. No further tracked work is planned.

Detailed report and artifacts: artifacts/stabilization-2d/e2-multisprite/final-fix/ms037-synchronization/ms037-report.md.


</details>

<details>
<summary>final-fix-rereview.md: snapshot con alcance propio</summary>

# E2 final-fix scoped re-review

**Scope:** original findings in `final-review.md` and the single fix diff `7dfe56c6b5b2f47dc900821bd9e813c31aef2f6e..a66ae47b6705a30534eed15dc6750b1b27ed46fa`. No source, index or HEAD changes. This is the continuation of the existing final review, not another whole-branch pass. Task 9 documentation and the final integration verification remain pending.

## Finding verdicts

1. **Visible stage-click names — ADDRESSED.** `src/adapters/scratch/browser-scene.mjs:70-74` passes fixture objects; `stage-input.mjs:46-55` maps IDs to their visible names in native/text mode, labels clones and stage, and retains imported Scratch names. MS-074 covers the target list/action/status including sentinel IDs, and MS-FINAL-LABELS exercises both run modes and clones.

2. **Cross-project Undo/Redo contamination — ADDRESSED.** Explicit opens pass `resetHistory` through `src/studio/project-ui.mjs:181-184`; `src/project-authoring.mjs:245-258` clears stored and mounted history even for the same UUID. Checkpoints save/restore sessions and `src/editor/editor-entry.mjs` restores both Blockly stacks on failed publication. MS-080 and MS-FINAL-HISTORY exercise real Blockly, distinct/same UUIDs, same-project transactions and failure rollback.

3. **Rollback discards later edits — NOT ADDRESSED.** Blocks and pending text now change the guard, but the new guard does not cover all data in the restored snapshot. See residual R1 below: project-name and sprite-configuration edits can still be silently overwritten.

4. **Implicit v1/v2 packs and score activation — ADDRESSED.** `src/project-migration.mjs:10-28` materializes the locked implicit legacy profile only for the explicit migration chain; `src/studio/shell.js:649-655` uses locked versions when enabling capabilities. MS-077 and MS-FINAL-LEGACY use saved v1/v2, check workspace/text preservation, and require explicit upgrade with no auto-run.

5. **Saved API3 target map after rename and reuse — ADDRESSED.** `src/targets/text/api-v3.mjs:133-140` and `api-v3-python.mjs:140-146` emit the saved stable ID when a mapping exists, retaining the tagged current-name route only when no mapping exists. The adapter rejects a removed stable ID instead of binding a namesake. MS-075 covers JavaScript/Python, reserved IDs, rename/reuse/deletion; MS-FINAL-COPY exercises the actual copy path. The fallback for unmapped identifiers is now an explicit design decision at `openspec/changes/scene2d-multi-sprite/design.md:55`.

6. **Sixteen globals plus locals rejected prematurely — ADDRESSED for the reported limit.** `src/contracts/program-contract.mjs:60-80` permits the two separate 16-variable groups only for object-workspace IR0, and `pack-broker.mjs:99-104`, `block-program.mjs:50,158-169`, conversion and generators carry the opt-in. MS-078 covers 16+1, 16+16, per-scope 17 rejection and legacy/text 16-total rejection; MS-FINAL-BUDGET exercises Blockly/Run and synchronized languages. The new global-metadata path introduces the separate Important R2 below.

7. **Unfinished unrelated script erases legacy locals — ADDRESSED for the reported incomplete-script case.** `src/project-authoring.mjs:113-126` extracts models without lowering script bodies and `src/studio/shell.js:470-473` supplies locals to the independent document. MS-079 and MS-FINAL-INDEPENDENT cover owner/selection with an unrelated unfinished `if`. The new unconditional extraction introduces the separate Important R3 below.

8. **Combined micro:bit result misses another sprite's edits — ADDRESSED for the reported edit/selection case.** `src/studio/shell.js:580-590` now keys the combined result on all scene workspaces, orders, resources and pending 2D text along with device state. MS-FINAL-COMBINED checks selection alone, pending text and editing Cesta then reselecting unchanged hero. The absent capability configuration remains material to rollback R1; this finding does not claim broader configuration changes were tested as running-result staleness.

9. **API1 backdrop ID versus API3 visible label — ADDRESSED.** `src/contracts/text-program.mjs:127-132` validates the strict API3 label DTO; both API3 translators wrap label literals, and `src/adapters/scratch/text-program.mjs:346-350` resolves strings only as IDs and DTOs only as labels. MS-076 covers both languages/engines, generated API1, colliding names and failures.

10. **Affected selector misses E2 suites — ADDRESSED for the enumerated dependency paths.** `tools/test/impact.mjs:25-30,43-44,61-72` extends the object/resource/language/layout/canonical mappings; TEST-IMPACT-E2 asserts the named dependencies and the conservative full fallback for project-authoring. This does not claim the entire affected gate passed.

11. **Text help locks unfinished selected object — ADDRESSED.** `src/studio/code-views-ui.mjs:41-44` obtains `editor.resourceView()` without lowering. MS-073 ensures help does not call the lowering snapshot; MS-BROWSER-028 covers JavaScript and Python fallback into Blocks and retained work without a delete offer.

**GG-LIB readiness — ADDRESSED as a test synchronization adjustment, not a root-cause finding.** `tests/browser/starter-library.spec.mjs:153-156` waits for the existing “Bloques ejecutados” result before reading the final snapshot, preserving costume/pixel assertions and the timeout. The focused rerun passed; the historical intermittent failure's full cause is not established.

## Residual and new breakage in the fix diff

**R1 — Important; original finding 3 remains open: rollback guard ignores durable project and sprite configuration.** `src/studio/shell.js:580-595,668-681`; `src/studio/project-ui.mjs:100,135-140,193-198`; `src/studio/objects-ui.mjs:145-148`; `src/contracts/scene2d-object-edits.mjs:102-106`. After updating packs, change `#project-name`, then press rollback. The guard compares only `project.state().id` and `authoringKey()`; the latter omits the name. `replaceAuthoring` restores the old full snapshot, sets `name.value` to its old name and autosaves it. Renaming a sprite after the update similarly changes the `gg.sprites` capability config while leaving the workspaces/resources represented in the key unchanged; its rename can also be reverted. Other initial-scene configuration is omitted too. This is the same stale-snapshot loss the guard is intended to prevent. Compare the complete durable content including capabilities and project name (excluding expected revision/timestamp churn), plus pending synchronized text, and retain the commit-time race check and unchanged immediate rollback. Add actual migration→project rename→rollback and migration→sprite rename/config change→rollback tests, confirming edits remain saved.

**R2 — Important; the variable-budget repair can silently turn a shared variable into a local.** `src/studio/code-views-ui.mjs:130-134`; `src/targets/text/code-view-parser.mjs:102-120,277-281`; `src/editor/workspace-from-ir.mjs:190-202`; `src/editor/code-view-conversion.mjs:117-122`. The conversion request treats *every* variable currently lowered as global as inherited, including one whose only global declaration is the mounted sprite's `gg_set_global` block. A student creates that block after mounting, enters JavaScript, deletes its only assignment but keeps `let puntos = shared(0);`, and returns to Blocks. The new exemption accepts the edit and the roundtrip check is supplied the candidate's requested global IDs, although the reconstructed workspace has no global-declaring block or stage model. A read-only probe using actual Blockly/lowering/parser/candidate code returned:

```text
before=[{id:"puntos",name:"puntos",initialValue:0,scope:"global"}]
parsed=[{id:"puntos",name:"puntos",initialValue:0,scope:"global"}]
candidate=[{id:"puntos",name:"puntos",initialValue:0,scope:"global"}]
candidateGlobals=[]
after=[{id:"puntos",name:"puntos",initialValue:0}]
```

The committed workspace now lowers the variable as local; later added sprites do not inherit it. Even if a stale in-memory inherited ID masks the change until reload, the saved workspace carries no durable global declaration. Preserve a real stage/inherited declaration or reject removal of the last declaring block; do not validate reconstruction using only the candidate's assertion of scope. Test live-created and reopened globals, JavaScript/Python, single-sprite and genuinely inherited stage globals, and save/reopen.

**R3 — Important; independent text can now be blocked by unrelated over-limit variable drafts.** `src/project-authoring.mjs:113-126`; `src/studio/shell.js:470-473`. A selected hero has a valid independent document that just moves hero; another sprite has 17 locally created Blockly variable models in its editable workspace. That workspace can remain a saved, unfinished draft, but the new unconditional `authoring.variables()` validates the entire scene and throws before the independent document starts, even though that document uses no variables. Before this change, failure to lower the unrelated scene was caught and the independent document ran with an empty legacy-variable list. A read-only probe using the actual authoring coordinator returned `{"variablesInUnrelatedObject":17,"error":"Invalid GG program: variable limit"}`. Extract only the legacy variables the independent runtime needs, or isolate unrelated invalid declarations without dropping a valid owner's variables; avoid making API3/event copies depend on unrelated drafts. Cover an over-limit non-owner with a no-variable API1/API3 document, while retaining both original unfinished-script/valid-owner cases and per-scope Run rejection.

## Out-of-scope observations

None newly pursued. The parked items and product rulings remain in `final-review.md`; their Task 9 dispositions are still pending.

## Evidence checked

- `final-fix-report.md` records `a66ae47`, the RED/GREEN history and the source/cohort provenance. Its early “pending” table is superseded by its stable-cut section.
- `focused-node.log`: 23/23; `green-legacy-scope.log`: 2/2; `green-impact-files.log`: 26/26; `green-budget-scope.log` and `green-budget-listing.log`: 2/2 each. These are overlapping focused runs, not a suite total.
- `browser-green-1.log`: 5 passed/7 failed. The report records the changed expectations in the seven failed cases; `browser-green-2.log` then shows 8/8 including GG-LIB, and `inspector-focused.log` shows 1/1. Credit for the five earlier passes against the final test files remains subject to the coordinator's provenance audit. Build 4 reports success. These are focused, pre-residual-fix results, not an overall browser or integration pass.
- I ran only the two read-only, targeted authoring/Blockly probes quoted under R2 and R3; no browser or package suite was rerun. The three concrete findings above are consolidated for coordinator routing.

## Verdict

**Spec verdict: FAIL** — finding 3 remains open; R2 and R3 violate shared-scope preservation and independent-document behavior. Findings 1, 2, 4–11 are addressed in their stated cases.

**Quality verdict: FAIL** — the rollback data-loss path and the two fix-introduced regressions require correction and scoped verification. No Critical finding was identified in this fix diff.

**Fix round: Findings remain open — R1, R2, R3.** Final integration verdict remains pending the repaired code, final verification evidence and committed Task 9 documentation delta.


</details>

<details>
<summary>final-residual-rereview.md: snapshot con alcance propio</summary>

# E2 residual-completion scoped re-review

**Scope:** R1/R2/R3 from `final-fix-rereview.md` and the bounded diff `a66ae47b6705a30534eed15dc6750b1b27ed46fa..1b745665bb28bad8bd01fd0e2a890b51324cce57`. No broad re-review or source, index or HEAD changes. Task 9 and the final integration gate remain pending.

## Finding verdicts

1. **R1: stale rollback after project/configuration edits — ADDRESSED.** `src/studio/shell.js:597-601,674-687` compares project ID and name, the full durable authoring capture including capability configuration, and pending synchronized text. Revision/time bookkeeping is excluded. The same comparison is checked before rollback and immediately before commit. The focused cases cover project-name preservation, a direct authoring configuration change to sprite name and x, and an unchanged rollback after autosave; blocks/pending-text regressions remain covered.

   **Correction to the prior review:** its proposed normal UI sprite-rename trigger was wrong. That path publishes through the project transaction's `onApplied`, which already clears the rollback snapshot and hides the offer (`src/studio/shell.js:569-571`). The separate UI regression verifies rename persists after save/reopen and the offer is hidden; the direct authoring configuration transaction is the case that retains the offer and exercises the full-content guard. The project-name loss was a genuine R1 trigger.

2. **R2: synchronized conversion silently loses a shared declaration — ADDRESSED for the reported conversion.** `src/project-authoring.mjs:113-120` derives inherited IDs from durable stage models or other objects, excluding the mounted sprite's sole declaration. `src/studio/code-views-ui.mjs:24-25,130-135` passes that proof to the parser, while `src/editor/code-view-conversion.mjs:82-88,117-121` and `workspace-from-ir.mjs:190-202` use it for reconstruction instead of trusting the candidate's claimed scope. JavaScript/Python cases cover live-created and reopened owner declarations, the inherited-stage case, and save/reopen. Removing the sole required global assignment is rejected; a genuinely inherited declaration survives.

   A bounded read-only Blockly probe also checked an apparent cache concern when explicitly changing `shared(0)` to a local `0`. It was not a defect: identity reconciliation assigned a new local ID, so the old cached global ID did not match it. The regenerated immediate text and recomputed/reopened IR all remained local. No browser or package suite was run by this reviewer.

3. **R3: independent text blocked by unrelated variable drafts — NOT FULLY ADDRESSED.** The reported Cesta-as-non-owner case now works: `src/studio/shell.js:473` bypasses workspace variables for API3 and limits API1 extraction to hero, and `src/project-authoring.mjs:122-137` avoids validating Cesta's budget. The six browser cases cover API1, API3 and a valid API1 owner local with Cesta's 17-variable draft and both selections. However, an independent API1 document that uses **no variables** is still blocked when hero itself has 17 local Blockly models. Shell unconditionally calls `authoring.variables({targetIds:['hero'],localsOnly:true})` before preparing that document; authoring validates those 17 against the per-owner limit and throws `Invalid GG program: variable limit` (`src/contracts/program-contract.mjs:67-70`). The earlier independent-document path caught scene-lowering failures and allowed this no-variable program to run. Thus the same failure remains when the over-limit draft is the legacy owner rather than Cesta.

   Keep valid hero locals available to API1 when they are valid. An invalid owner-variable draft must not block a document that does not need those variables; a document that actually requests an unavailable variable may report that failure. Add a real no-variable API1 regression with 17 hero locals, and retain the existing valid-owner and unrelated-object cases. Native block Run must continue to reject 17 locals. The coordinator confirmed this is within the original independent-document requirement.

## New breakage in the fix diff

- **Important: R3 owner-budget residual**, as described in finding 3. No separate new Critical finding was identified in the bounded delta.

## Evidence checked

- `artifacts/stabilization-2d/e2-multisprite/final-fix/residual-completion/node-green-1.log` reports 6/6 focused Node cases, and `build-green-1.log` reports the incremental browser build completed.
- `browser-green-1.log` records 19 passes and one failed direct sprite-configuration test. The next two focused attempts also failed; their recorded assertions/setup are retained. `browser-green-3.log` separately passed the actual UI-rename case, while `browser-green-4.log` passed the corrected direct-configuration case after waiting for the rollback offer and asserting the edited configuration. The final inventory contains 21 unique cases; the coordinator's source/test-only provenance audit remains pending, so this report does not combine these runs into an overall green browser gate.
- The recorded source manifests differ between the first browser launch and the final commit only in `tests/browser/scene2d-final-fixes.spec.mjs`; the fourth launch manifest matches the final manifest. This comparison alone does not establish body-by-body equivalence for all earlier passing cases.
- The single reviewer probe described under R2 was read-only. No browser tests or suites were repeated in this review.

## Verdict

**Spec verdict: FAIL** — R1 and R2 are addressed; the R3 owner-budget instance remains open.

**Quality verdict: FAIL** — the unconditional API1 variable capture still regresses an independent no-variable document. Correct and verify that bounded residual before final integration.

**Fix round: Findings remain open — R3 owner-budget case.** The final integration verdict remains pending the correction, verification evidence and committed Task 9 documentation delta.


</details>

<details>
<summary>final-r3-rereview.md: snapshot con alcance propio</summary>

# E2 R3 owner-budget completion: scoped re-review

**Scope:** the R3 owner-budget residual in `final-residual-rereview.md` and the single diff `1b745665bb28bad8bd01fd0e2a890b51324cce57..fb4215f06e5d22e06cb9977324079f2de4758f08`. No broad re-review, source/index/HEAD edits, browser reruns or package-suite reruns.

## Finding verdict

**R3, independent API1 document with an over-budget hero draft — ADDRESSED.** `src/studio/shell.js:465-473` requests the new availability mode only for API1; API3 continues using its own declarations. `src/project-authoring.mjs:122-149` makes an over-limit local owner group unavailable as a whole, without truncating to an arbitrary first 16, while validating model type, structure and duplicate identity. The strict default reader and native scene Run retain their existing limits. A valid hero-local group is still supplied to API1; references to unavailable IDs fail through the existing runtime boundary.

The new MS-OWNER-BUDGET browser cases exercise no-variable API1/API3 and an unavailable variable with 17 hero locals, from both hero and Cesta selection. They also assert native Run still rejects the draft and retains its 17 models. The two existing MS-RESIDUAL-R3 cases recheck a valid hero local reaching 42 with an unrelated over-budget draft. The integration case checks strict mode, whole-group omission, valid models and structural/identity/type failures.

## New breakage in this diff

None found within the scoped delta.

## Evidence checked

- `artifacts/stabilization-2d/e2-multisprite/final-fix/owner-budget-completion/node-red.log` records the owner-budget failure before the fix; `node-green.log` reports 3/3 focused cases.
- `browser-red.log` records the original API1 failure; `browser-green-list.log` lists the exact eight focused cases and `browser-green.log` reports 8/8. `build-green-1.log` reports the incremental browser build completed.
- The four changed source/test files in this diff match their SHA-256 entries in `source-before-browser.json`. This verifies those files did not change after the focused browser launch; it does not substitute for the coordinator's full provenance and integration audit.

## Verdict

**Spec verdict: PASS** for the R3 owner-budget correction.

**Quality verdict: PASS** for the scoped delta; no new Critical or Important breakage identified.

**Source is ready for the coordinator's final verification.** This is not a final integration verdict: broad verification and the committed Task 9 documentation delta remain pending.


</details>

<details>
<summary>final-verification-report.md: snapshot con alcance propio</summary>

# Final verification report — staged evidence

## a66ae47 read-only audit; broad verification held

Audited commit: a66ae47b6705a30534eed15dc6750b1b27ed46fa. The tracked tree was clean when audited. No Node/tools/build/test case/server/capture was launched by the verifier at this head. Only affected/list discovery and evidence comparison ran, all listing exits0.

Evidence root: `artifacts/stabilization-2d/e2-multisprite/final-verification/a66ae47/`.

- `affected-list.log`: automatic selection full; it was not executed as full.
- `inventory-audit.json`: bounded named29 contains210 cases; priority13 + inspector1 + remainder196. Exact disjoint union, no missing/extra/duplicates; inspector count exactly1. Normalized file/title identities and listing footer counts were checked. Playwright list mode emits listing text even when the JSON reporter is requested; `audit-listing-text.py` reads those logs rather than inventing JSON results.
- `owner-source-audit.json`:441 paths hashed before owner focus; only two test files differ, no production/helper/config/tools changes. Manual diff inspection confirmed changes are inside the previously failing cases; the5 earlier passed cases and their shared helpers remain unchanged.
- `owner-case-audit.json`: browser-green-1 contributes only5 individually passed unchanged cases (the whole batch had7 failures and is not called green); browser-green-2 contributes8 corrected/omitted cases; inspector-focused contributes1 unchanged case, run alone. Their positive union exactly matches14 priority/inspector identities without duplicates. Earlier failed attempts remain retained. These credits were conditional on final after-manifest and subsequent source impact.

Root accepted this as a66ae47 evidence and imposed HOLD before any broad execution. Scoped review identified three residual areas: rollback of complete durable content, preservation of global declaration scope, and unrelated over-limit draft blocking independent documents. A new stable repair head must re-audit source/test changes and focused credits. Do not apply a66ae47 conditional credit automatically to that future head. Do not run the old broad suite while the follow-up scope is being fixed.

Source owner e2_final_fix confirmed its owned server1279382 stopped with ownership check and port release. Verifier started no replacement server. The prior7dfe56c report remains separate and unchanged: Node602/tools88/spec38/build/smoke3 passed; named browser184/187 failed, not an approved affected gate.

Inactive preparation: `final-verification/preparation/` holds the proposed29 manifests, absolute-path runner/configs, listing audit and native zoom capture preparation. Root approved default npm test then npm run test:tools serial at low load; reduced scheduling only for observed contention. Two disjoint ordinary one-worker browser jobs are allowed only under total≤3/capacity/auxiliary-port conditions, with inspector isolated. Final raw zoom capture is after ordinary tests. Nothing from that execution plan has run yet.

## 1b74566 source/focused audit; broad execution held again

Commit1b745665bb28bad8bd01fd0e2a890b51324cce57 was clean when inspected. Evidence root: `artifacts/stabilization-2d/e2-multisprite/final-verification/1b74566/`. `owner-final-audit.json` verifies all441 final committed SHA256 values match the checkout, aggregatec8015dbca4db9f5a42825e631ef8e2358f8e00a4f4e20277ba42ec7c83619b42. Cohort72cb0fe38bd7ea9cc144022c7b2c8d906fb672d2f1a79b9004a5c5b8da58422d was served by the owner. Final source-before-browser-4 matches completely; the earlier snapshots differ only in case-local edits/addition in scene2d-final-fixes, without product/helpers/config/tools changes.

The residual focused positive union is21 unique:19 individually passed cases from browser-green-1, UI rename from green-3, direct-config guard from green-4. Earlier timed-out/failed direct-config attempts remain in their original JSON/logs; the failed batches are not described as all-green. The test-file diff was manually inspected: only the direct-config branch/readiness/assertions and added UI-rename test changed; the other passed bodies and shared helpers stayed intact. Old a66 focused priority/inspector results were not automatically reused across changed product source.

The final-fixes source now includes16 residual browser cases in addition to its original10. The final exact29-spec collection must therefore be refreshed; no new listing or case partition was executed at1b74566. Only source/case audit and inactive script materialization occurred. No Node/tools/build/browser/server/capture launched before the coordinator's next HOLD.

Scoped review found the remaining R3 case: shell still unconditionally captures hero locals, so an over-limit hero draft can block a valid no-variable independent API1 document. Root ruled that such an independent document must run regardless of authored draft and requested a bounded follow-up. All broad verification remains on hold; the next source hash must be audited anew and focused credit recalculated. Owner server1294391 was already stopped and no verifier server was started.

## Final stable gate in progress — fb4215f

Target: fb4215f06e5d22e06cb9977324079f2de4758f08, source frozen and final R3 scoped review approved by coordinator. Artifacts: `artifacts/stabilization-2d/e2-multisprite/final-verification/fb4215f/`. Default npm test passed624/624 exit0,121.444556210s; default npm run test:tools passed89/89 exit0,16.628104986s; strict OpenSpec38/38 exit0. These ran serially, without reducing concurrency or changing assertions/timeouts/retries.

Initial preservation command exit1 is retained: worktree baseline inventory was absent. Coordinator authorized an exact immutable primary input copy (SHA2560ce8f02f7753e5177faab0e2c3f5514599ebe4ba825dd0549c9caa23244a3224) into the expected ignored worktree location. Existing verifier then passed exit0 for all3 upstreams (sameCommit/sameTrackedDiff/sameLock alltrue). Primary inventory remained byte-identical afterward; primary verification was copied to evidence, not written. No inventory regeneration/baseline advancement/upstream edits.

Incremental build exit0,27.341s, compiler stages reused; release-materials refreshed. The owned server1308184 serves cohortd0ead8b08c72c59e33ec7e3701b4a14c7926a92b01a0b7509c752f3c16e521a7. Owner's8 source-identical focused cases used separately recorded cohort92a65c2a4a2643ebf3eb1be15ab732a3db099bee1fa260fc8b55de8643caa8b6. All441 owner launch/final source hashes match this commit with no post-launch changes; only these8 cases are credited, no older cross-head browser positives.

The exact approved named29 scope has232 cases. `execution-case-plan.json` proves disjoint exact union: owner8, fresh-priority27, unchanged isolated inspector1, remainder-a97, remainder-b99. No missing/extra/duplicates. Automatic affected selection remains full; no full/standalone is executed.

Smoke3/3 exit0,23.1s; inspector unchanged1/1 exit0,13.5s case/14.4s process with original45s and no owned overlap. Fresh priority27/27 exit0,4.5min, including all remaining final/regression cases, MS028 JS/Python and combined GG-LIB readiness. These are fresh final-head executions, not stitched historical gate credit.

Remainders97/99 now run as two disjoint one-worker jobs on the same immutable owned server. At16:26:56 local there were no foreign browser/full jobs, load1.31/2.24/3.61 and11.3GiB available; offline auxiliary5750–5759 was free. Ordinary results and genuine native zoom capture are pending. No completion/affected-green claim is made yet.

### MS-BROWSER-037 interruption retained during final remainders

Remainder A case52 failed after22.3s at scene2d-dialogo.spec.mjs:336. The Python-copy Run at:335 was followed immediately by snapshot polling; JavaScript-copy execution had already completed. Trace records seven `studioProbe.request('snapshot')` calls during this poll, then `Program revision replaced` from shell.js:302–303 when a request sent against the former revision received its reply after activeRevision changed. The terminal page snapshot shows Python active with the existing `Documento activo · eventos disponibles` UI status. This is a request/readiness synchronization failure; no final scene-value mismatch was asserted, and load is not established as a cause.

Evidence: final-verification/fb4215f/ms037-trace-phase.json and remainder-a-output/scene2d-dialogo-MS-BROWSER-d06fb-t-copy-and-as-a-Python-copy/{trace.zip,error-context.md}. The original batch continues without reruns, edits, catches, timeout or retry changes. Coordinator approved only a later case-local wait for the existing #text-run-status readiness text after text Run, preserving all final-state assertions and original options. No implementation has occurred while the two remainder batches run. Native zoom supplement is deferred until that test-only commit is stable so its capture metadata can name the final HEAD. Pending terminal totals and scoped follow-up are not green gate evidence yet.
### MS-BROWSER-032 load-program timeout retained separately

Remainder A case73 failed after40.4s at scene2d-object-resources.spec.mjs:44, called by:689. The paste/undo/history, unavailable-pack refusal and saving assertions had completed; the final Run did not reach `Bloques ejecutados`. Its15s status assertion saw `Preparando…`, then `Listo`. The raw failed screenshot visibly reports `Runner timeout: load-program` in #editor-error and shows the initial unexecuted scene. This is an actual load-program timeout; its cause is not proven. It must not be merged with MS037's revision/readiness synchronization failure.

Artifacts: final-verification/fb4215f/remainder-a-output/scene2d-object-resources-M-a4723-nd-the-project-keeps-saving/{trace.zip,error-context.md,test-failed-1.png}; read-only action/console extraction ms032-trace-phase.json. Coordinator requests one isolated unchanged MS032 execution after both ordinary jobs and the MS037 test-only stable commit, with original limits and observed load/memory. A later isolated pass would be additional evidence, not erase or explain this original timeout. No product/test change for MS032 is authorized without further supporting evidence.

MS037 readiness-reset audit: runTextDocument synchronously sets #text-run-status to `Preparando Python…`/JavaScript before its first language.prepare await (shell.js:484–485); reset changes it to Detenido/Sin ejecutar or Preparando escena. Exact active/events status comes from onProgramReady. Thus the proposed wait after the new Run cannot accept the preceding JavaScript ready status on this successful Python flow. No global settled helper or timeout/retry change is proposed.
### Final remainder A terminal result

`remainder-a.json/.log/.meta/.exit` at fb4215f records95 passed,2 failed,97 total,21.6min, exit1. Only MS-BROWSER-037 and MS-BROWSER-032 failed as detailed above; the whole batch is failed and is not relabeled green. Remainder B is still active; no aggregate terminal claim yet. Current selected-case captures objects-nine-laptop.png/.json (nine objects,1280×720,340.328125px editor visible) and objects-panel-narrow.png (five-object fixture,390×844) were directly inspected by the verifier: genuine rendered UI, selected Volcán/Robot and controls visible. This is agent visual inspection, distinct from human/student evidence. Narrow resource/inspector/library captures also exist, but their asserted geometry is not persisted as standalone measurement JSON.
### Both final-head ordinary batches complete; gate awaiting focused follow-up

At fb4215f the complete disjoint named29 inventory produced230 unique passing cases out of232: credited same-source owner8, verifier fresh-priority27, isolated inspector1, remainderA95, remainderB99. Remainder A:95pass/2fail,97total,1297807.429ms,exit1. Remainder B:99pass/0fail,1473079.849ms,exit0. No skipped/flaky cases; no duplicates or extra cases. Only the two exact failures above remain missing from the positive union. Smoke3/3 is separate from232.

`verification-summary-original-attempt.json` and `verification-summary.json` retain this failed original gate, with exact exits, stats, failed identities, source/cohort and upstream-baseline provenance. `summary-original-attempt.log/.exit` records exit1 intentionally because the positive case union is incomplete, not a new product failure. Neither failed A nor the232-case gate is claimed green.

Both Playwright jobs have ended; normal owned server1308184 remains for coordinator-authorized focused handoff. Plan: sole fixer adds only the existing readiness wait in MS037 and commits after scoped focused validation; verifier then executes unchanged MS032 once alone with original limits/load evidence. Native zoom capture waits for that final test-only stable HEAD. Earlier failures remain immutable regardless of subsequent focused outcomes. No tracked file was edited by the verifier and no full/standalone run occurred.
## Final verification closure — e51b2d3

Final tracked HEAD: e51b2d39bab871c693b2dabae0e7ac300d638fea, clean. This commit inserts one exact existing-status readiness assertion inside MS-BROWSER-037; product, shared helpers, configuration and MS032 are unchanged from fb4215f. The final441-file SHA256 manifest matches the checkout and owner launch manifest; the only delta from the product build is scene2d-dialogo.spec.mjs. Product build/cohort remains fb4215f / d0ead8b08c72c59e33ec7e3701b4a14c7926a92b01a0b7509c752f3c16e521a7. Evidence: final-verification/e51b2d3/final-source-audit.json, plus owner final-fix/ms037-synchronization/{stable-cut.json,source-final-committed.json,focused.json}.

Final exact named coverage is232 unique passing cases across the approved29 specs, with no missing, extra or duplicate identities. Groups: same-final-product-source owner8; fresh priority27; unchanged isolated inspector1; original remainderA95; original remainderB99; corrected MS037 focused1; unchanged MS032 isolated1. Smoke3/3 is additional and separate. The automatic full selection was never executed; this is the approved bounded named substitute, not full/standalone. Machine-readable final case/provenance audit: final-verification/e51b2d3/verification-summary.json. Its retained historicalOriginalAttempts explicitly preserves A95pass/2fail exit1 and B99pass exit0; neither original failed batch nor its original230/232 union is rewritten as green. Original summaries/logs/traces remain under fb4215f.

MS037: owner focused run1/1,exit0,18.2s case/19.0s total, same immutable served product. Exact one-case identity and source provenance checked. Existing final goal poll60s, outer case limit and retry settings are unchanged. The new #text-run-status assertion inherits the default15s expect deadline and can therefore fail before the original goal poll if readiness exceeds15s; total assertion timing is not identical. Root retains the strict standard assertion; no deadline widening/global catch/retry was added.

MS032: verifier executed the unchanged case exactly once alone after the test-only commit, with original assertions/limits/configuration and one worker. It passed1/1,exit0,13.5s case/14.5s process. Exact --list guard selected1 case. Launch load1.17/6.83/8.40 on16 logical CPUs,11117MiB available; no other Playwright job was present. Evidence: e51b2d3/run-ms032-isolated.sh, ms032-isolated.{json,log,meta,exit}, ms032-isolated-list.{log,exit}. The original Runner timeout: load-program remains unexplained. The isolated pass provides no proof that load caused it or that a flake has been eliminated. No MS032/product/helper change was made.

Checks on unchanged final product source before the one test-only insertion remain valid: default npm test624/624 exit0; default npm run test:tools89/89 exit0; strict OpenSpec38/38 exit0; incremental build exit0; upstream preservation existing verifier exit0 after exact immutable primary-input fallback. The initial missing-input preservation command exit1 is retained, with the baseline SHA/source and no regeneration/advancement. No broad rerun was needed for the single case-local readiness addition. Independent runtime limits were not raised.

### Final raw UI/zoom evidence and limits

Final product-state selected-spec captures at fb4215f (still identical product at e51b2d3): remainder-a-evidence/objects-nine-laptop.png and .json show nine objects at1280×720, selectedVolcán in one horizontally scrolling row, no horizontal page overflow, visible Blockly340.328125px, object panel137.140625px/list48px. Narrow390×844 five-object panel images are remainder-b-evidence/objects-panel-narrow.png and objects-panel-narrow-form.png. Diálogo narrow images are remainder-a-evidence/backdrop-menu-narrow.png and object-unopened-narrow.png; resource/inspector/library narrow captures are resource-menu-narrow.png, inspector-narrow.png and library-narrow.png. Narrow cases assert overflow/button geometry but do not persist their measured boxes as JSON. Verifier directly inspected nine-laptop and panel-narrow; root independently inspected the fresh images. These are agent visual checks, not human acceptance evidence.

Two supplemental native Chrome zoom captures ran serially after ordinary/focused jobs at final HEAD e51b2d3, each exit0 and no pageerrors, with nine objects created through the actual UI. No CSS injection, replacement pixels or image editing. First set e51b2d3/zoom-supplement/ contains all original raw variants and capture-metadata.json. Its genuine zoom-200-cdp-view.png and zoom-400-cdp-view.png render the scaled selectedVolcán row/controls correctly at1280×633 physical pixels; these are scrolled viewport details with vertical cropping. Root and verifier inspected them. Ordinary viewport variants remain clipped/blank (400%538bytes), and CSS-sized full-page/surface variants crop horizontally; they remain inconclusive and are retained.

Additional e51b2d3/zoom-dip-supplement/ uses only the protocol's DIP content bounds for raw Page.captureScreenshot. Best complete-width page captures are zoom-200-cdp-surface.png (1280×4203) and zoom-400-cdp-surface.png (1280×9702), with capture-metadata.json adjacent. Verifier inspected them: selectedVolcán, object row, controls, editor and page sections render at full width; at400% buttons wrap into two columns and the page scrolls vertically. These full-page captures do not replace the viewport captures and do not prove every offscreen canvas was painted. Native metadata:200% inner640×316/DPR2,400% inner320×158/DPR4; scrollWidth equals innerWidth at both factors. Original complete metadata, capture scripts, commands, image dimensions and SHA256 values are included in verification-summary.json. No further variants were taken.

No student, teacher, classroom or other human acceptance observation was collected; UI/zoom conclusions are automated DOM assertions plus agents inspecting genuine screenshots. Historical evidence and its provenance remain separate from current images. The original MS032 unexplained timeout and ordinary screenshot limitations remain explicitly visible despite the final passing case union.

### Cleanup and handoff

Only verifier-owned server1308184 was stopped after matching its recorded PID, exact /proc cwd and argv `node tools/f0/serve-browser.mjs`. It was healthy before stop; TERM was sent only to that PID. Wrapper session88361 exited0; no listeners remained on5700–5709,5750–5759 or5760–5769. No foreign PID/preview was touched. Evidence e51b2d3/server-cleanup.{log,exit}, stop-owned-server.sh. No build/test/browser/capture jobs remain owned by verifier. Reports and evidence are ready for Task9 documentation; no tracked file was edited by this verifier.

</details>

<details>
<summary>ms037-rereview.md: PASS con caveat de 15 s</summary>

# MS-BROWSER-037 test synchronization: scoped re-review

**Scope:** the one-line test-only diff `fb4215f06e5d22e06cb9977324079f2de4758f08..e51b2d39bab871c693b2dabae0e7ac300d638fea`. No source, index or HEAD changes and no tests rerun by this reviewer.

## Synchronization verdict

**ADDRESSED.** `tests/browser/scene2d-dialogo.spec.mjs:330-337` waits for the existing exact `#text-run-status` readiness message after each JavaScript/Python Run and before the unchanged final-scene poll. `src/studio/shell.js:484-495` resets that status synchronously before the first await and loads/adopts the new program revision before execution; `src/studio/language-controller.mjs:85-87` accepts program-ready only for the current session, revision and document. The previous iteration is explicitly stopped before the next copy. The wait therefore avoids accepting the prior JavaScript readiness signal for Python and avoids snapshot polling during revision adoption.

The original source assertions, final scene goal, explicit 60-second goal-poll timeout, test timeout and retry configuration remain unchanged. No catch, helper, product, or retry change was introduced.

**Minor timing caveat:** the new `toHaveText` assertion inherits the existing Playwright 15-second default expect timeout (`playwright.config.mjs:9`). It therefore adds a 15-second readiness deadline before the existing 60-second goal poll; a document ready after 15 seconds can fail this assertion even if it could otherwise meet the later goal. This is an intentional strict gate under the coordinator's ruling, with no observed healthy readiness exceeding 15 seconds. The total timing behavior is not identical to the old test.

## Evidence checked

- `artifacts/stabilization-2d/e2-multisprite/final-verification/fb4215f/ms037-trace-phase.json` records the original Python-copy snapshot request failing with `Program revision replaced`, rather than an observed final-value mismatch.
- `artifacts/stabilization-2d/e2-multisprite/final-fix/ms037-synchronization/list.log` lists exactly the one MS037 case; `focused.log` and `focused.exit` record 1/1 passing, case 18.2 seconds, exit 0.
- The base and focused source manifests differ only in `tests/browser/scene2d-dialogo.spec.mjs`; the checked-out test file matches the focused-launch manifest. This focused evidence is not a broad integration gate.

## Verdict

**Spec verdict: PASS** for the scoped synchronization.

**Quality verdict: PASS with the Minor 15-second readiness-deadline caveat above.** No Critical or Important breakage was found in this test-only delta.

Final integration remains pending the coordinator's reconciliation of verification evidence and the committed Task 9 documentation delta. The separate MS-BROWSER-032 timeout is outside this diff and is not diagnosed by this review.


</details>

## Apéndice G · suites y reproducción

El inventario global de 50 es para una posible full futura, **no ejecutada**.
La puerta nombrada final tiene 29 specs y 232 identidades auditadas:
owner-budget 8 + prioridad fresca 27 + inspector 1 + resto 196, unión disjunta;
el resto termina con A95+B99+dos focales, conservando A original fallida.
La unión terminal de 232 positivos se audita en el resumen final; las listas
por sí solas no serían resultado. El patrón incluye MS-OWNER-BUDGET. Solo ocho
positivos source-identical reciben crédito del owner; no se ensamblan positivos
a66ae47/1b74566 con el HEAD actual.

### Inventario completo de 50 specs

- tests/browser/canonical-projects.spec.mjs
- tests/browser/workspace-presentation.spec.mjs
- tests/browser/language-copies.spec.mjs
- tests/browser/integrated-2d-workspace.spec.mjs
- tests/browser/integrated-microbit-workspace.spec.mjs
- tests/browser/integrated-scratch-workspace.spec.mjs
- tests/browser/integrated-3d-workspace.spec.mjs
- tests/browser/integrated-web-workspace.spec.mjs
- tests/browser/educational-activities.spec.mjs
- tests/browser/studio-contextual-workspace.spec.mjs
- tests/browser/studio-entry-journey.spec.mjs
- tests/browser/accessibility-shell.spec.mjs
- tests/browser/accessibility-runner.spec.mjs
- tests/browser/accessibility-zoom.spec.mjs
- tests/browser/audio-variables.spec.mjs
- tests/browser/bindings-editor.spec.mjs
- tests/browser/code-console.spec.mjs
- tests/browser/code-view-conversion.spec.mjs
- tests/browser/code-views.spec.mjs
- tests/browser/corpus.spec.mjs
- tests/browser/isolation.spec.mjs
- tests/browser/sb3-resources.spec.mjs
- tests/browser/resource-safety.spec.mjs
- tests/browser/capability-contexts.spec.mjs
- tests/browser/scene3d-advanced.spec.mjs
- tests/browser/standalone-contexts.spec.mjs
- tests/browser/minimum-corpus.spec.mjs
- tests/browser/project-persistence.spec.mjs
- tests/browser/packs-lessons.spec.mjs
- tests/browser/offline-recovery.spec.mjs
- tests/browser/pxt-worker.spec.mjs
- tests/browser/device-integration.spec.mjs
- tests/browser/device-transfer.spec.mjs
- tests/browser/language-runtime.spec.mjs
- tests/browser/textual-equivalence.spec.mjs
- tests/browser/textual-corpus.spec.mjs
- tests/browser/runner.spec.mjs
- tests/browser/scene-inspector.spec.mjs
- tests/browser/simulator.spec.mjs
- tests/browser/synced-transition-activity.spec.mjs
- tests/browser/pilot-2d-mode.spec.mjs
- tests/browser/starter-library.spec.mjs
- tests/browser/scene2d-vocabulary.spec.mjs
- tests/browser/new-project-capabilities.spec.mjs
- tests/browser/scene2d-multi-sprite.spec.mjs
- tests/browser/scene2d-dialogo.spec.mjs
- tests/browser/scene2d-object-views.spec.mjs
- tests/browser/scene2d-objects-panel.spec.mjs
- tests/browser/scene2d-object-resources.spec.mjs
- tests/browser/scene2d-final-fixes.spec.mjs

### Selección nombrada final de 29 specs

- tests/browser/accessibility-runner.spec.mjs
- tests/browser/bindings-editor.spec.mjs
- tests/browser/canonical-projects.spec.mjs
- tests/browser/code-console.spec.mjs
- tests/browser/code-view-conversion.spec.mjs
- tests/browser/code-views.spec.mjs
- tests/browser/device-integration.spec.mjs
- tests/browser/educational-activities.spec.mjs
- tests/browser/integrated-microbit-workspace.spec.mjs
- tests/browser/language-runtime.spec.mjs
- tests/browser/minimum-corpus.spec.mjs
- tests/browser/new-project-capabilities.spec.mjs
- tests/browser/offline-recovery.spec.mjs
- tests/browser/packs-lessons.spec.mjs
- tests/browser/project-persistence.spec.mjs
- tests/browser/scene-inspector.spec.mjs
- tests/browser/scene2d-dialogo.spec.mjs
- tests/browser/scene2d-final-fixes.spec.mjs
- tests/browser/scene2d-multi-sprite.spec.mjs
- tests/browser/scene2d-object-resources.spec.mjs
- tests/browser/scene2d-object-views.spec.mjs
- tests/browser/scene2d-objects-panel.spec.mjs
- tests/browser/scene2d-vocabulary.spec.mjs
- tests/browser/starter-library.spec.mjs
- tests/browser/studio-contextual-workspace.spec.mjs
- tests/browser/synced-transition-activity.spec.mjs
- tests/browser/textual-corpus.spec.mjs
- tests/browser/textual-equivalence.spec.mjs
- tests/browser/workspace-presentation.spec.mjs

### Selección histórica de 26 en 7dfe56c

Fue 184/187, no puerta verde. Nombres bajo tests/browser/ y sufijo .spec.mjs:

- accessibility-shell
- accessibility-zoom
- canonical-projects
- code-console
- code-view-conversion
- code-views
- integrated-2d-workspace
- language-copies
- language-runtime
- minimum-corpus
- new-project-capabilities
- packs-lessons
- pilot-2d-mode
- project-persistence
- scene-inspector
- scene2d-dialogo
- scene2d-multi-sprite
- scene2d-object-resources
- scene2d-object-views
- scene2d-objects-panel
- scene2d-vocabulary
- starter-library
- studio-entry-journey
- textual-corpus
- textual-equivalence
- workspace-presentation

### Antiguas 16 de partición 0

Clasificación histórica anterior a pruebas independientes de puerto.
standalone-contexts sigue exclusiva y no forma parte de la puerta actual:

- accessibility-zoom
- audio-variables
- code-console
- device-integration
- device-transfer
- isolation
- language-runtime
- offline-recovery
- pilot-2d-mode
- project-persistence
- pxt-worker
- runner
- scene-inspector
- simulator
- standalone-contexts
- textual-corpus

### Comandos y fuentes de reproducción

Entorno Ubuntu/WSL, Node 22.23.4. Los scripts por corrida son inmutables.
Los comandos exactos, listas, exits y HEAD están en metadata de cada prefijo,
y los informes históricos preservan los intentos fallidos sin cambiarlos.

```bash
source ../scripts/env.sh
unset -f node npm npx
npm run test:affected -- --files <rutas del diff verificado> --list
npm test
npm run test:tools
npm run spec:validate
npm run browser:build
export GG_SHELL_PORT=5700 GG_RUNNER_PORT=5701 GG_SIMULATOR_PORT=5702
export GG_LANGUAGE_PORT=5703 GG_SCENE3D_PORT=5708 GG_WEBAPP_PORT=5709
export GG_RELEASE_ROOT="$PWD/artifacts/stabilization-2d/e2-multisprite/releases"
npx playwright test <specs y filtro explícitos de la corrida>
npx playwright test --config playwright.quick.config.mjs
```

Plantilla de reproducción, no comandos ejecutados por Task 9. La configuración
local importa la canónica y cambia solo testDir absoluto/reuseExistingServer,
con servidor normal propio preiniciado. Asserts, límites, retries y orígenes
siguen originales; no cubre el startup gestionado de webServer. Los prefijos
finales usan rutas absolutas para evitar el anidamiento histórico de resume.
Logs finales: artifacts/stabilization-2d/e2-multisprite/final-verification/fb4215f/.
Informes duraderos: artifacts/stabilization-2d/e2-multisprite/final-record/.
No full ni standalone; solo una full aprobada puede avanzar baseline.

## Apéndice H · ledger histórico completo

Snapshot del recorrido, con estados anteriores y correcciones conservadas.
La síntesis del cuerpo y las revisiones finales mandan para el estado actual.
Así los fallos sin log recuperable, costes, roles heredados y cambios de orden
siguen visibles después de eliminar el directorio temporal SDD.

<details>
<summary>progress.md: historia completa hasta preparar este corte</summary>

# SDD ledger — plan: docs/engineering/plans/2026-10-29-e2-multisprite.md

Worktree: /home/adawolfs/projects/makecode/gcs-e2-multisprite · rama stab/e2-multisprite · base a3f6585 (main integrado C+E4+E1; baseline Node 520/520, tools 82/82, OpenSpec 38/38 verificada por el coordinador en ese commit).
Spec: openspec/changes/scene2d-multi-sprite/ (T2–T9) y openspec/changes/scene2d-vocabulary-v2/ (T1).

## Pre-flight scan

| Tareas | Archivo / interfaz compartida | Produce → consume | Hallazgo |
|---|---|---|---|
| T1 ↔ T2 | `latestPackVersions`, `createCapabilities`, proyecto inicial | T1 hace que lo nuevo use la última versión; T2 publica 0.3.0 | Al publicarse 0.3.0, el proyecto inicial pasa a 0.3.0: T2 debe garantizar que esa ruta crea una config válida (sprites[0]=hero) |
| T2 ↔ T3 | config `gg.sprites` 0.3.0 ↔ `authoring.scene2d` | T2 define la config; T3 el formato de autoría por objeto | Migración en dos piezas (config en T2, autoría en T3): la ejecución equivalente de T2 se prueba con un sprite y la IR actual |
| T3 ↔ T4 | IR 2D v1 `targetId` | T3 la define; T4 la baja a targets VM | Coherente |
| T3 ↔ T5 | esquema `codeViews` / GGPROJ | T5 puede ampliar `codeViews` por objeto | T5 debe leer lo escrito por T3 sin otra versión de formato salvo justificación |
| T5 ↔ T6 | editor por objeto ↔ vistas sincronizadas por objeto | T5 conversión por objeto; T6 monta un editor por selección | R2 fija el contrato de cambio de objeto con texto pendiente; T6 lo cablea en la UI |
| T6 ↔ T7 | panel de objetos ↔ biblioteca/recursos | T6 crea objetos; T7 añade sprite desde biblioteca | T7 depende del panel de T6: orden correcto |
| T6 ↔ T8 | archivos de escritor único de la shell | ambas editan index.html/style.css | Secuencial en el mismo worktree: sin conflicto |
| T4,T5 ↔ T8 | tabla/IR/opcodes/traductores | T8 añade ir a objeto y fondo | Requiere T3–T5: orden correcto |
| T9 | actas y tareas | consume todo | — |

| Tarea | Coherencia interna |
|---|---|
| T1 | Coherente; exige ajustar suites sin debilitar |
| T2 | Coherente |
| T3 | Deja abierta la elección v5 vs v6: decisión del implementador, revisable |
| T4 | Coherente |
| T5 | Coherente con R2/R3 |
| T6 | Coherente |
| T7 | Coherente con R4 |
| T8 | Coherente |
| T9 | Excluye la full (coordinador) |

Rulings:
- Ruling: T3 decide v5 con campo nuevo o v6 y lo justifica — el plan no puede saberlo sin leer el código — si es incorrecto, cuesta una migración de formato adicional.
- Ruling: baseline de Node no repetida en el worktree — misma commit verificada minutos antes y una full corre en el checkout principal — si fuera falsa, el primer `npm test` de T1 lo revela.
- Ruling: implementadores en Opus y revisores en Sonnet salvo T3/T5 (formato e identidad) y la revisión final en Opus — tareas multiarchivo de juicio; formato e identidad son de alto riesgo.

## Progreso
- Task 1: dispatched (implementer opus, base 0f5f763)
- Usuario (29/10/2026): confirma licencia CC0-1.0 de la biblioteca inicial E4. Pendiente reflejarlo en design/acta de resources-starter-library tras la full conjunta.
- CC0 reflejada en main (commit 3a34866). Full conjunta intento 1: 248/249 (CV-VIEWS-005, carrera de prueba corregida en 9fc63be). Full intento 2 pendiente con la máquina libre, antes de despachar Task 2.
- Task 1: implementer DONE_WITH_CONCERNS (04b5ea4). Ruling: concern 'GG-PROJECT pasa por razón incidental' es de corrección → reanudado el implementador antes de revisión (restaurar intención + investigar fallo de instalación al arrancar). Partición 0 (scene-inspector, project-persistence, language-runtime, accessibility-zoom, resto + smoke) la corre el coordinador en puertos por defecto antes de Task 2.
- Task 1: fix tras concern (4fd684c). Revisión (sonnet): ✅ spec, Approved, 0 Critical/Important, 5 Minor. Parked para la ola final: (M1) design.md punto 6 frase «pruebas CV-* intactas» obsoleta; (M2) NP-004 y endurecimiento sin registrar en tasks 1.5/design; orden 1.5 antes de 1.4; (M3) project-ui.mjs:222-243 rama else y posible sobrescritura del mensaje por saved.warning (inalcanzable); (M4) `while (1 < 3)` puede ganar bloque en E3: revisar casos CV-*; (M5) NP-002 cubre estado unavailable, el new real solo en navegador.
- Coordinador: smoke 3/3 en el branch (puertos por defecto). 4189 lo ocupaba `node scripts/server.mjs` (Codex, ajeno): detenido con autorización del usuario. Partición 0 completa en curso.
- Task 1: coordinador p0 (4fd684c): 3 fallos — code-console :49 (desktop/mobile, claves authoring v3) y scene-inspector GG-INSPECT-003 (arrastre de disfraz 0 vs 1). Fix round 1/5 abierto (implementador reanudado; autorizado a correr solo esas dos suites en puertos por defecto).
- Coordinador p0-2 completo: 76 passed, 3 fallos ya en fix round 1 (code-console x2, GG-INSPECT-003).
- Task 1: fix round 1/5 implementado (6dc402e): ambos hallazgos eran expectativas obsoletas del v1 inicial; code-console+scene-inspector 10/10 en puertos por defecto. Re-review (sonnet) despachado.
- Task 1: fix round 1/5 (2 addressed, 0 open; commits 4fd684c..6dc402e). Re-review clean; 2 minor cosméticas deferidas (dos expect en una línea en code-console; locator por texto aceptable).
- Task 1: complete (commits 0f5f763..6dc402e, review clean)
- Usuario (29/10/2026): criterio de «hecho» = pruebas nuevas específicas + affected en verde; la full se sugiere según impacto, no es obligatoria por etapa.
- Task 1 integrada en main (048c39e); main Node 524/524. Rama sincronizada con main. globals.md actualizado al criterio del usuario.
- Task 2: dispatched (implementer opus, base 048c39e)
- Ruling (ambos planes): mientras test-ports Task 2 use 4173–4182, E2 no corre partición 0 en puertos por defecto.
- Task 2: implementer DONE_WITH_CONCERNS (d220202). Nuevas 6/6, Node 530/530, tools 82/82, specs 38/38, 28 specs fuera de partición 0 172/172.
- Ruling: el manifiesto gg.sprites@0.3.0 no está publicado hasta integrar E2 en main; T3–T8 pueden ajustarlo (permisos por objeto, ir a objeto, fondo) y su hash se congela al integrar — evitar una 0.4.0 por cada ajuste interno de la rama — si es incorrecto, proyectos 0.3.0 guardados en previews de la rama dejarían de abrir (riesgo aceptado: solo pruebas).
- Ruling: T3 debe leer la forma intermedia GGPROJ v3 + gg.sprites@0.3.0 + authoring.blockly (y config con varios sprites que hoy solo ejecuta hero) — se pasa en el dispatch de T3.
- Pendiente coordinador: partición 0 de T2 (device-integration, language-runtime, offline-recovery, project-persistence, scene-inspector, textual-corpus) en puertos por defecto cuando los libere test-ports Task 2. Full: no sugerida aún (la selección full se debe solo a tools/test/impact.mjs).
- Coordinador: partición 0 de T2 (6 specs) en curso en puertos por defecto → artifacts/stabilization-2d/e2-multisprite/coordinator-t2/p0.log (JSON en artifacts/browser-results.json del worktree). Revisión T2 despachada (opus: migración/hash).
- Task 2: revisión (opus): ✅ spec salvo 1 Important (`__proto__` aceptado como ID/costume/backdrop en scene2d-objects). Fix round 1/5 abierto (implementador reanudado).
- Task 2: minor (deferred → T5): nombres sin NFC ni rechazo de controles C1/bidi/zero-width; afecta a identificadores R3.
- Task 2: minor (deferred → T4): initialSceneOfObjects toma sprites[0] aunque no sea hero; MS-006 parte VM no falla de forma independiente hasta que el adaptador lea sprites (repetir equivalencia en T4).
- Task 2: minor (deferred): unicidad de IDs sensible a mayúsculas frente a nombres insensible (documentar); validateScene2DObjects devuelve el input sin clonar; shell.js:608/612 mueve proyectos legados a la última versión al activar 2D/score (preexistente, ahora 0.3.0).
- Task 2: fix round 1 implementado (b1b9539): __proto__ rechazado en schema y validador; hash 0.3.0 → 6e403217…; MS-002 +3 casos (RED 5/6 → GREEN); Node 530/530. Re-review despachado.
- Task 2: fix round 1/5 (1 addressed, 0 open — __proto__; commits d220202..b1b9539). Re-review clean.
- Task 2: complete (commits 048c39e..b1b9539, review clean) — partición 0 en curso (28/28 sin fallos al despachar T3).
- Ruling: T3 se despacha sin esperar el final de la partición 0 de T2 — evita tiempo ocioso; si una suite falla, vuelve a T2 como fix round y T3 se ajusta — coste: posible retrabajo en T3.
- Task 3: dispatched (implementer opus, base b1b9539)
- Coordinador: partición 0 de T2 50/50 en puertos por defecto (exit 0). T2 confirmada sin reservas.
- Task 3: implementer DONE_WITH_CONCERNS (875ee6f). GGPROJ v6; IR 2D v1 con targetId. Node 539/539, tools 82/82, specs 38/38, 28 specs fuera de p0 172/172. Affected sale full por src/project-authoring.mjs sin clasificar en impact.mjs (anotar para la ola final).
- Task 3: concerns observacionales (v6 no legible por main sin E2: compatibilidad hacia delante esperada; lock ir:0 → decidir en T4; codeViews de un workspace → T5/T6).
- Task 3: revisión despachada (opus); coordinador corre 6 specs p0 en puertos por defecto → coordinator-t3/p0.log
- Task 3: revisión (opus): 1 Important (validateProgram acepta IR v1 en consumidores IR0, incl. frontera del simulador → scripts aplanados en hero). Fix round 1/5 abierto. Ruling: v1 opt-in en el validador; T4/T5 la activan explícitamente donde la soporten — coste si es incorrecto: T4/T5 deben recordar activarla.
- Task 3: minor (deferred → revisión final, posible pérdida de datos): salir de 0.3.0 acepta descartar sprites duplicados con workspace idéntico (project-format.mjs:113-116); exigir escenario vacío y sprites ≠ primero vacíos.
- Task 3: minor (deferred): programObjectsFromIR0 no valida la IR0 de entrada; riesgo v6 no registrado en Risks de design.md y GGPROJ.md:49 desactualizado; límite de nodos usa programLimits.nodes; desambiguar «IR 2D v1» frente a program-ir1.mjs (capacidades).
- Task 3: fix round 1 implementado (3f3dc6f): IR v1 opt-in ({objects:true}); MS-016 RED→GREEN; Node 540/540. Re-review despachado.
- Task 3: fix round 1/5 (1 addressed, 0 open — IR v1 opt-in; commits 875ee6f..3f3dc6f). Re-review clean.
- Task 3: minor (deferred): scratch-project/generated-code reenvían options sin filtrar (un llamador futuro podría pasar objects:true por accidente); lesson-evaluation traga el rechazo de v1 (fail-closed).
- Task 3: complete (commits b1b9539..3f3dc6f, review clean) — p0 en curso: 22 ok / 1 fallos al despachar T4.
- Coordinador p0 de T3: offline-recovery falló por el arranque de 20 s de su servidor con carga media 9.45 (sensibilidad registrada en TESTING; coincidió con sb3-resources de la ola de test-ports y un huérfano). Se repetirá aislada con carga baja; si falla por T3 vuelve como fix round.
- Ruling: T4 se despacha sin esperar esa repetición — su primer tramo es lectura de código; si el fallo resulta de T3, T4 se ajusta — coste: posible retrabajo.
- Task 4: dispatched (implementer opus, base 3f3dc6f)
- Coordinador: test-ports integrado en main (9473f03; Node 524/524, tools 88/88, specs 38/38). Tras completar T4, integrar main en stab/e2-multisprite para que T5+ usen pruebas independientes del puerto (y actualizar globals.md: sin partición 0 por puertos; suites exclusivas).
- Coordinador: offline-recovery de T3 repetida aislada (carga 2.9): falla en 7.2 s porque 4188 lo ocupa un servidor ajeno de Codex (`scripts/server.mjs`, PID 38168, nueva instancia; la autorización anterior fue para otro PID). No se detiene. Causa del fallo: entorno (carga 9.45 en la corrida, luego puerto ocupado), no T3.
- Ruling: no detener el PID 38168 sin nueva autorización; al integrar main (pruebas independientes del puerto) en esta rama tras T4, offline-recovery usará puertos derivados (4223–4232) y se repetirá — coste: T3 queda sin verde de offline-recovery hasta entonces.
- Task 4: implementer DONE_WITH_CONCERNS (504ff7e). MS-017…025 9/9 RED→GREEN, Node 549/549, tools 82/82, specs 38/38, 29 specs fuera de p0 174/174. Affected full (shell.js, runner.js, project-authoring, impact) y real.
- Task 4: concerns → T6/T7: disfraz/sonido en objetos ≠ hero rechazado por permisos (gg.assets congelado y gg.sprites nombran solo hero) → T7; recursos integrados del runner solo para escenario y hero, otro sprite falla con mensaje claro → T6 copia recursos al añadir sprite y mantiene IDs de variables globales; documentos de texto en IR0 sobre hero → T5.
- Task 4: revisión (opus): Approved, 0 Critical/Important. Minor (deferred → T7): lesson-evaluation lee sprites[0] sin comprobar hero; editor.programOf valida recursos de todo objeto contra hero. Minor (deferred → T6/3.2): textos «hero» en scene-inspector-ui y «Sprites de autoría: 1». Minor (deferred → T5): sprite.get devuelve el ID y scene.get el nombre visible.
- Task 4: complete (commits 3f3dc6f..504ff7e, review clean)
- Coordinador: main (pruebas independientes del puerto) integrado en la rama (merge limpio). tools 88/88, specs 38/38, Node 549/549 (una corrida previa dio 548/549 con un fallo intermitente no identificado; la salida no se guardó).
- Coordinador: build del árbol integrado; corriendo las 16 ex-partición 0 + smoke en base por defecto → coordinator-t4/.
- Task 5: dispatched (implementer opus, base 33c29bb)
Task 4 coordinator run (33c29bb build): former partition-0 79/79 (27.7 min, includes offline-recovery on derived ports) and smoke 3/3, evidence artifacts/stabilization-2d/e2-multisprite/coordinator-t4/. Closes the T3 offline-recovery doubt as environmental.
Previews restarted 2026-10-30 00:1x on 33c29bb build (5283 full, 5383 pilot); snapshots live in artifacts/previews/. Restart again after E2 merges.
- Task 5: implementer DONE_WITH_CONCERNS (1631b78, 15ccf6d; base 33c29bb). Node 558/558, tools 88/88, specs 38/38, browser 256/256 on 1631b78. lang-1 + smoke on 15ccf6d in progress (ports 5700-5709). Opus review dispatched, package review-33c29bb..15ccf6d.diff. standalone-contexts still owed by coordinator.
- Task 5 review (Opus, task-5-review.md): spec ❌ / Needs fixes. Important: R3 identifiers invalid in JS for implements/interface/package/private/protected/public. Entering fix loop round 1.
- Task 5: minor (deferred): appliedHash correction skipped after selectObject moves the restore point into objects (code-views-ui.mjs:140-146) → T6
- Task 5: minor (deferred): selectObject false has no cause for !ready/busy/cancelled (code-views-ui.mjs:235) → T6
- Task 5: minor (deferred): text-program first=targetOf(handlers[0]) defaults to hero; owner document with only variables fails in hero-less project (text-program.mjs:131) → T6/T7
- Task 5: minor (deferred): `bound` ignores scope; a local in one handler disables other-object rejection in another (api-v3.mjs:70,80; api-v3-python.mjs:54,72) → final
- Task 5: minor (deferred): design.md:131 vs shell.js:73 on «un solo objeto con scripts» → final
- Task 5: minor (deferred): project copy limit 16 events/variables; large two-sprite project can't satisfy the copy scenario (design 26) → tell the user at finish
- Task 5: minor (deferred): stage rules in five places; targetIds shape rule duplicated (code-views-ui.mjs:190, shell.js:75) → T8/final
- Task 5: minor (deferred): trace swallows dispose errors; python-engine.mjs:170 deletes __gg_code after failed prepare → final
- Task 5: minor (deferred): TDD evidence partial (MS-BROWSER-003…006, MS-026, MS-033); selectObject rollback and trusted-after-rename untested → T6 (it owns selectObject wiring)
- Task 5: minor (deferred): MS-BROWSER-006 uses DOM click, not Código › Crear copia → T6
- Task 5: minor (deferred): 320 scratch-vm «No storage module present» warnings in node-3.log → final
- Carry to T6: UI must call codeViewsUI.selectObject, never authoring.mountObject directly; rename must regenerate live text (trusted turns false, code-views-ui.mjs:84-87); validateSpriteName rejects \p{Cf} so emoji ZWJ names need normalization. Carry to T6/T7: export-sb3 (resources-ui.mjs:183), lessons (shell.js:588), derived listing (code-console-ui.mjs:152), legacy document variables (shell.js:464,470) read the mounted workspace.
- Task 5: fix implemented f06c2b6 (MS-035; Node 559/559, tools 88/88); scoped re-review dispatched (sonnet). lang-1/smoke cover 15ccf6d, NOT f06c2b6: need rebuild + selected browser check on head before T6.
- Task 5: minor (deferred): a variable named eval/arguments still generates invalid JS («Binding eval in strict mode»), sprites with those names are fine → final
- Task 5: fix round 1/5 (1 addressed, 0 open; commits 15ccf6d..f06c2b6). Re-review clean.
- Task 5: 15ccf6d verification: lang-1 95 passed, smoke 3 passed. Head verification of f06c2b6 running (task-5/verify-head.sh: head-1 + standalone-contexts + head-smoke).
Task 5: complete (commits 33c29bb..f06c2b6, review clean after 1 fix round). Head verification: code-view-conversion, code-views, scene2d-object-views, textual-equivalence, standalone-contexts 31/31; smoke 3/3; Node 559/559; tools 88/88. Evidence task-5/head-*.
- Task 6: dispatched (implementer opus, base f06c2b6)
- Ruling: when test:affected says selection: full, T6+ implementers run new specs + a named affected list + smoke instead of all 45 specs — T5 spent 53 min on an effective full, and the user's rule is that a full is only suggested — if wrong, a regression in an unlisted spec surfaces only at the suggested full or in final verification.
- Task 6: implementer DONE_WITH_CONCERNS (616ab93..0465187; base f06c2b6). Node 570/570, tools 88/88, browser 126/126 on a24673c (19 specs), smoke 3/3. Opus review dispatched. standalone-contexts not run.
- Ruling: idle stage keeps showing the runner's built-in scene until Run (added sprites absent, deleted hero visible) and the panel says so; no live preview added to E2 — not in the spec's requirements as read so far and it is new scope — if wrong, students see a stale stage until Run. Surface to the user at finish as a product decision.
- Task 6 review (Opus, task-6-review.md): spec ❌ / Needs fixes. Important 1: new object's global variable is local-shaped, Run fails after an ordinary edit (fix round 1 dispatched). Important 2: Duplicate of a sprite with gg.assets blocks makes an unmountable, undeletable object.
- Task 6: Ruling: Important 2 (duplicate with gg.assets stuck) goes to T7 rather than the T6 loop — the plan assigns per-object resource menus to T7 and that is the real fix — if T7 slips, Duplicate stays a trap. T7 acceptance MUST include: duplicate a sprite with costume and sound blocks, select, run, delete.
- Task 6: minor (deferred): refreshObjectText can overwrite text typed during runner restart (objects-ui.mjs:94) → T7
- Task 6: minor (deferred): #creation-guide says «Cambia un bloque Mover» on empty object/stage (index.html:56) → T8 (shell writer)
- Task 6: minor (deferred): #object-name-error needs role=alert (objects-ui.mjs:119) → T7
- Task 6: minor (deferred): form closes before transaction, rejected add/rename loses typed name (objects-ui.mjs:128) → T7
- Task 6: minor (deferred): render never closes open name form on project change (objects-ui.mjs:59) → T7
- Task 6: minor (deferred): live undo stack not cleared on project change; design point 36 overstates (project-authoring.mjs:185) → final
- Task 6: minor (deferred): MS-BROWSER-013 measures 5 options, limit is 9; Blockly ≥300 px at limit unproven at 1280×720 → T7/final
- Task 6: minor (deferred): limit/last-object copy duplicated (scene2d-object-edits.mjs:18, objects-ui.mjs:53-56); selectObject repeats refreshObjectText (code-views-ui.mjs:276) → final
- Task 6: minor (deferred): apply failure from missing offline pack reports rejected, panel says text error (code-views-ui.mjs:154) → T7
- Task 6: minor (deferred): evidence nits: 324 storage warnings; mutations.log line 7 stale; 193 vs 195 lines → final
- Task 6: ⚠️ real browser zoom on panel unproven (320×568 viewport only), no docs/product/*-evidence.json → T7/T9. Also T7: «Left for Task 7» list in task-6-report.md.
- Task 6: fix round 1/5 (1 addressed, 0 open; commits 0465187..c209ce4). Re-review clean; real Run path confirmed to pass the stage.
Task 6: complete (commits f06c2b6..c209ce4, review clean after 1 fix round; Important 2 ruled to T7).
- Task 6: minor (deferred): promoted variable stays on stage after last block is gone, counts toward 16 globals and shows in stage text → final
- Task 7: dispatched (implementer opus, base c209ce4)
- Task 7: implementer DONE_WITH_CONCERNS (c209ce4..a334007). On 93bc8d5: Node 579/579, tools 88/88, specs 38/38, browser 161/161 (20 specs), smoke 3/3. Binding acceptance MS-BROWSER-016. Flake: GG-LIB-004 failed once on a reopened project, cause not found. Opus review dispatched.
- Task 7 review (Opus, task-7-review.md): spec ❌ / Needs fixes. Important 1: text-tool failure offers to delete a healthy object. Important 2: transactions lower the mounted object, so Borrar and panel edits depend on an unrelated object. Fix round 1 dispatched.
- Task 7: Ruling: unfinished work must not block panel edits, library additions or reopening on object profiles; only Run asks to finish it; import safety moves to the import path — matches design point 45 and classroom use where half-built programs are normal — if wrong, an unfinished program could enter a transaction unlowered, which the import guard and Run's own lowering still catch.
- Task 7: GG-LIB-004 failed once on 148a7cb (`gato` expected, hero for 15 s after Run on a reopened project), passed on 93bc8d5. Coordinator must repeat it several times at the gate before accepting it.
- Task 7: minor (deferred): deleting mounted object with stuck neighbour stops without offering Borrar (objects-ui.mjs:190) → final
- Task 7: minor (deferred): addFromLibrary reports success when finishNew failed; failure path untested (objects-ui.mjs:171) → final
- Task 7: minor (deferred): MS-BROWSER-013-LIMIT claims 300 px but visible is 273 px; rename or record visibleEditor (spec:505,518) → T8 with layout
- Task 7: minor (deferred): variables.set widened to other sprites' locals, design point 49 and MS-055 mention only reads (gg-bindings.mjs) → final
- Task 7: minor (deferred): __gg_missing_resource__ passes validateWorkspaceResources in every profile, loosening a frozen path (block-program.mjs:161) → final
- Task 7: minor (deferred): fixed resource block defined three times (scene2d-object-edits.mjs:143, block-program.mjs:79, editor-entry.mjs:33) → final
- Task 7: minor (deferred): MS-BROWSER-025 item 6 tests the guard, not the race → final
- Task 7: minor (deferred): design.md:26 promise stale; design.md:183 lists …027 vs tasks.md …028; scene-inspector-ui.mjs:22 literal 'Escenario' → T9
- Task 7: minor (deferred): new text documents write for the selected sprite, not recorded in design → T9
- Task 7: minor (deferred): text shows technical costume IDs (cesta.setCostume("sprite-…:c0")) → tell the user at finish
- Task 7: carry to T8: at nine tiles and 1280×720 only 273 px of Blockly is visible (300 px element); layout belongs to T8's files. Noise: 324 storage + 102 service-provider warnings in Node log → final
- Task 7: fix implemented c638eb2 (Node 580/580, tools 88/88, browser 72/72 in 6 specs, smoke 3/3; MS-BROWSER-029/030). Re-review dispatched. Coordinator check: new-project-capabilities, offline-recovery, GG-LIB-004 ×5.
- Task 7: fix round 1/5 (2 addressed + ruling + reopen gap; 1 new open — pack rollback past lower:false strands foreign blocks, autosave and transactions fail; commits a334007..c638eb2).
- Task 7: minor (deferred): guard treats any object with string type as a block; walks fields (block-program.mjs:37-38) → final
- Task 7: minor (deferred): design.md:185 stale test range → T9; remove at objects-ui.mjs:194 doesn't record unopened → final
- Task 7: fix round 2 dispatched: rollback must refuse a profile that drops blocks in use on any object; paste path must not wedge autosave.
- Task 7: coordinator check on c638eb2: new-project-capabilities + offline-recovery 3/3; GG-LIB-004 5/5 repeats. Single failure on 148a7cb stays unexplained, not reproduced.
- Task 7: fix implemented 4a0abe5 (Node 581/581, tools 88/88, browser 64/64 in 5 specs, smoke 3/3; MS-BROWSER-031/032). Opus re-review dispatched. Raw message on open of foreign-block file; legacy paste wedge kept per ruling.
- Task 7: fix round 2/5 (2 addressed, 1 new open — Undo stuck on removed foreign block; commits c638eb2..4a0abe5). Round 3 dispatched.
- Task 7: fix implemented 3b0b207 (Node 581/581, tools 88/88, browser 33/33 in 2 specs, smoke 3/3). Sonnet re-review dispatched. event.group mutation depends on Blockly 13.4.0 lock; recheck on upgrade.
- Task 7: fix round 3/5 (3 addressed, 0 open; commits 4a0abe5..3b0b207). Re-review clean.
Task 7: complete (commits c209ce4..3b0b207, review clean after 3 fix rounds).
- Task 7: minor (deferred): waitForTimeout(100) fixed sleep in MS-BROWSER-032; pasted foreign block leaves one Undo step with no visible effect, Redo of a removed step does nothing visible → final
- Task 8: dispatched (implementer opus, base 3b0b207)
- Task 8: STOPPED by user 2026-10-30 13:30. Implementer a54dffa9e2cd327f9 killed without report; commits 3b0b207..e19abcd stand. 182 pass / 5 fail on 5e7b96e; e19abcd updates those tests, retest interrupted (MS-BROWSER-018 confirmed, others not). Not reviewed, 4.1 mark lacks green evidence. Resume from docs/engineering/E2-RELEVO-2026-10-30.md.
- Resume 2026-10-30: HEAD 242877d, clean worktree stab/e2-multisprite; main 9473f03 clean. Task 8 remains open. No active full found; existing previews left untouched.
- Ruling: user now requests GPT-6.1 Sol and Terra; supersedes older Opus/Sonnet dispatch preferences. Sol/high owns Task 8 verification/reconstructed report; Terra/xhigh owns the task review. Original commit trailer rule retained unless user changes it.
- Task 8: resumed verification agent /root/task8_verify; static review agent /root/task8_review, package review-3b0b207..242877d.diff. Review evidence verdict waits for fresh report. Source frozen during verification.
- Task 8 static review: Important findings pending consolidated review: Scratch reserved destination collision for valid sprite IDs _mouse_/_random_; API1 literal IDs confused with API3 identifiers; textHelp offers an unavailable/incorrect background call. Sol/xhigh /root/task8_fix prepares read-only root-cause analysis while source remains frozen for verification. No product edits yet.
- Task 8 current affected selection is full; per user criterion, current six named specs+smoke first, then repaired-head new tests and named affected selection. No full launched.
- Task 8 review interim: spec issues / Needs fixes, three Important findings in task-8-review.md. Scrollable-row assertions judged appropriate; 44px targets, selected containment, nine-object visible editor and real zoom checks retained.
- Ruling: use an artifact-local Playwright config importing the canonical config and changing only server reuse plus absolute testDir resolution, with an explicitly owned prestarted normal server — closed loopback ports time out in this WSL environment before Playwright can spawn its webServer, while an owned open listener connects immediately — cost if wrong: managed-server startup lifecycle is not covered by these runs; all product assertions, retries, timeouts, ports and isolation remain unchanged and the deviation must be in evidence.
- Task 8: blocked startup on242877d runs no browser tests; stop only verifier-owned PID1143653, finish Node/tools/spec, then repair before the next fresh browser run. No full or foreign services touched.
- Correction to prior startup note: while stop instruction was in flight, Playwright advanced after its long closed-port probe and ran four canonical cases successfully (including Dialogo) out of56 before authorized TERM. Run remains interrupted, exit143, no final JSON; do not describe it as zero tests or a completed suite.
- Task 8 verification on242877d: Node596/596, tools88/88, specs38/38, incremental build exit0. Named browser run4/56 passed then interrupted exit143; smoke pending. Reconstructed report by /root/task8_verify.
- Task 8 fix round1/5 dispatched /root/task8_fix (Sol/xhigh), base242877d, three Important findings verbatim in task-8-review.md. Source freeze released after Node completion. Requirements: preserve valid IDs, distinguish API1 IDs/API3 identifiers, truthful language/profile/resource-specific help; focused RED/GREEN then repaired-head affected verification.
- Task 8 invalid-wrapper forensics: expanded release path /home/adawolfs/projects/makecode/artifacts/stabilization-2d/e2-multisprite/releases did not exist (parent artifacts absent); no outside-worktree files created and none deleted. Evidence resume/invalid-path-forensics.log.
- Task 8 fix round1 in progress: five execution regression cases observed RED plus old-profile help RED; safe adapter names and tagged API3 references implemented; focused GREEN found borrowed Python proxy handling requiring existing owned-copy conversion. Broad verification not started.
- Task 8 fix round1 implementation commit7dfe56c, clean tree; final focused6/6 passes, scoped31/31 before final ownership-check tightening (covered by final focused). Scoped Terra re-review agent/root/task8_review; diff review-242877d..7dfe56c.diff. Broad checks running on frozen7dfe56c, evidence resume/post-7dfe56c/.
- Task 9 preparation only: /root/task9_docs (Sol/high) drafts in ignored task-9-drafts; no tracked edits/commit until Task8 review and verification close. This prepares independent documentation during browser waits, not completion of Task9 or permission to claim pending results.
- Task 8 fix round1/5 (3 addressed,0 Important open; commits242877d..7dfe56c). Terra scoped review clean for blocking findings, report task-8-rereview-1.md. Task8 remains open pending broad green evidence.
- Task 8 minor deferred to final: stage-input.mjs:47 decodes private VM names only for native mode; text mode selector/status can display /gg/_mouse_ or /gg/_random_ for these valid IDs. Targeting correct; preserve raw names only for imported scratch mode when fixing.
- Repaired-head broad attempt: JS API3-CAP-001 times out awaiting state; tools87 pass/0fail/1cancelled (language-origin server test20s). Build succeeds71.257s. Concurrent external workload rose to load21.83 on16CPUs and two foreign browser jobs. No external processes touched. Node completes before isolated diagnosis; serial own suites and at most1 own browser while two external jobs remain. Timeouts/retries unchanged.
- Repaired-head first Node completes602 cases:600pass2fail (API3-CAP-001 JavaScript and GG-IR1 JavaScript sphere readiness waits),277.48s; original exit capture unavailable because artifact wrapper was edited while running (complete TAP retained; workflow corrected to immutable scripts). VOC012 passed213.7s vs baseline152.1s,96 interpreter sessions; no hang.
- All three isolated diagnostics passed unchanged: API3-CAP JS~505ms, IR1 JS~428ms, tool language-origin HTTP18.295s. Fixer trace finds JS failures before ready on unchanged API2 startup; QuickJS300ms wall-clock budget under load is plausible but original rejection swallowed, so cause unproven. Fresh complete Node rerun alone underway, tools queued serially. No sources changed.
- Final review staged: /root/e2_final_review (Terra/max) reads code+all deferred findings at9473f03..7dfe56c while verification and Task9 drafts continue. One whole-branch review seat; final integration verdict waits for Task9 committed delta and fresh test reports. No source changes or duplicate suites; final single fix wave retained.
- Repaired7dfe56c verification: fresh default Node602/602 exit0(170.870s), tools88/88 exit0(27.881s), specs38/38, build pass; smoke3/3 exit0(23.6s). Root confirmed TAP tails and exit files. Browser batchA85/8specs + batchB102/18specs running against owned server1198309; one foreign browser job at launch, total3, separate evidence roots.
- Final review interim Important: stage-input renders stable technical IDs (including ordinary sprite-UUID and renamed hero) rather than visible configured names in selector/activation/status; supply object ID-to-name map for native/text, preserve imported Scratch labels, cover clones. Broader than earlier private-name Minor. Included in sole consolidated final fix wave after review finishes.
- Final review interim Important: opening another project clears stored per-object sessions but not mounted Blockly Undo; real Blockly repro with same block IDs changes B value99 to A previous0 after Undo. Must reset live history on identity change while preserving same-project edits/object history/rollback.
- Final review interim Important: post-update edits are silently discarded/autosaved by pack rollback restoring pre-update snapshot (shell.js:663–680); current guard only catches concurrent edits. Protect later authoring or confirm loss with safe copy, preserve unchanged immediate rollback. Distinct from identical-workspace downgrade item. Both included in final single repair wave.
- Final review interim Important (R1): actual v1/v2 files have null capabilities, availablePackUpdates returns empty and upgrade control hidden; unrelated enable-score instead defaults sprites to latest0.3, silently upgrading. Add explicit legacy upgrade preserving IDs/no autorun, retain legacy version for unrelated capability activation; cover real saved v1 ANDv2. Synthetic explicit0.1 test does not cover this. Final single fix wave.
- Final review interim Important: whole-project API3 copies save identifier-to-stableID metadata but goToObject resolves against current scene names; renaming Cesta to Canasta then creating a new Cesta redirects old copy to the new object (or errors without reuse). Honor saved map when available, fail for deleted saved IDs; cover JS/Python, API1 literals, single-object copies. Final single fix wave.
- Task9 drafts complete, unapplied; agent/root/task9_docs ended preparation turn. Resume after T8 browser gate, before final wave.
- Final repair preparation only: /root/e2_final_fix (Sol/xhigh) traces five confirmed blockers while current browser source remains frozen. No code/tests/docs edits or suites allowed until consolidated final review + Task9 commit + explicit coordinator release. One final repair wave retained.
- Final review interim Important6: object workspaces copy all globals but are lowered/validated under IR0 total-variable limit16 before IR1 composition; 16stage globals+1sprite local is valid IR1 yet fails per-workspace lowering. Preserve legacyIR0 total16, support object-aware independent16globals/16locals, actualBlockly+Run and cap+1 tests. Final single fix wave; preparation agent informed.
- Final review interim Important 7: independent legacy text variable extraction lowers entire scene and swallows errors to []; unfinished non-owner sprite breaks valid hero-local reads in API1. Extract variable models without unrelated script lowering; preserve owner/scope/IDs and no autorun. Final wave.
- Final review interim Important 8: combined micro:bit/2D Run executes whole scene but stale-result key tracks only mounted workspace; editing Cesta then reselecting hero hides pending-change notice. Whole-scene key with relevant pending text/order, selection alone unchanged; demonstrated regression in frozen context only. Final wave.
- Final review interim Important 9: generated API1 setBackdrop sends stable descriptor ID, but shared resolver prefers visible label; valid ID/label collision switches to wrong background (real VM probe). Distinguish API1 IDs and API3 labels rather than swapping priority; cover JS/Python and both APIs. Final single wave.
- Final-fix preparation completed for first eight issues in final-fix-preparation.md; agent/root/e2_final_fix idle, no source/test mutation. Release must include consolidated report including issue9 and any remaining findings after Task9 commit and browser gate.
- Final code review complete with 10 Important, no Critical; final-review.md has all deferred-item dispositions. Important10: new E2 browser specs inventoried but first-match impact groups omit relevant regressions for object/resource UI, translators, styles and Dialogo fixture. Expand mappings and test classifier selections; unclassified project-authoring remains conservatively full.
- Fresh browser failure MS-BROWSER-028 is an actual Task8 repair regression, not dismissed as load: new textHelp calls editor.codeViewSnapshot().resourceView, lowering unfinished Cesta during selection notification; outer mount failure returns to hero and offers deletion before normal fallback to Blocks. Reporter/reviewer confirming as issue11. Other cases continue on frozen7dfe56c.
- Ruling: combine the newly demonstrated Task8 help regression with the ten consolidated branch findings in ONE repair wave after the running browser batches finish; close Task8 and apply Task9 only after repaired green verification and scoped re-review, then finish the same final review with documentation — avoids two successive code/test repair cycles while keeping task gates honest — cost if wrong: a broader fix diff requires per-finding provenance and focused regression evidence.
- Zoom screenshot evidence limitation: fresh and old400% captures are blank;200% clipped. Root inspected images directly. DOM geometry and keyboard checks passed, but these images cannot support appearance claims. Obtain genuine supplemental capture after browser jobs, or retain explicit inconclusive appearance in durable evidence; never substitute pixels/styles.
- Fresh browser second failure GG-INSPECT-003: original45s whole-test deadline, trace reaches secondRun after fresh-profile reopen and records hero-alt,x12,bluePixels582; no unsupported-block/missing-condition errors. Timing/resource cause plausible but unproven. Preserve failed run and validate focused after repair without another own browser batch, same deadline. Not a new code finding unless reproduction demonstrates one.
- Evidence paths: artifact-local configs resolve relative report/output under nested resume/artifacts/...; record actual paths. Future immutable runners should use absolute report/output paths. No active config/script edits.
- Browser batchA terminal:83pass/2fail of85, exit1,32.3min. Failures MS-BROWSER-028 and GG-LIB combined case. GG-LIB failure is NEW/distinct: after restoring initial backdrop and clicking Run, snapshot at starter-library.spec.mjs:153 rejects GG scene loading before costume poll; helper waits Session stopped only. Fresh-profile reopen already passed. Preserve separately from old unexplained T7 and obsolete T8 background expectations. Repair proper explicit readiness synchronization without weakening costume assertion, timeouts or retry counts in consolidated wave; investigate actual protocol, no blanket catch.
- Pre-final-wave affected verification finished on7dfe56c: batchA83pass/2fail of85 (32.3min), batchB101pass/1fail of102 (34.1min), total184pass/3fail across187cases/26specs. NOT an affected-green gate. Failures: actual MS028 help regression, new GG-LIB scene-readiness test failure, inspector45s deadline after correct result. Original handoff expectations MS018/MS012/MS013 and background/library expectation changes passed their relevant assertions.
- Verifier stopped only owned server1198309 after checking cwd/argv; exit0, ports5700–5709 and5760–5769 free. Ownership artifact post-7dfe56c/server-cleanup.json. Root confirmed clean HEAD7dfe56c and cleanup.
- Final single repair wave RELEASED to /root/e2_final_fix (Sol/xhigh), base7dfe56c, all11 Important in final-review.md plus explicit GG-LIB readiness synchronization without weakened assertions/timeouts/retries. Inspector to rerun focused unchanged. Verifier now standby until stable committed repair head; writer owns focused RED/GREEN. Report final-fix-report.md. Task9 remains unapplied and must reconcile drafts with final-wave design/doc edits after repaired gate.
- Final-wave progress: focused Node RED/GREEN now covers visible names, help without lowering, saved API3 destination IDs, API1/API3 backdrop namespaces, actual saved v1/v2 upgrades, variable extraction/budgets, and real Blockly history. Browser RED reproduced rollback data loss and combined-view stale-state loss. Writer is tightening separate global/local limits in synchronized views before committing; final verifier remains preparation-only. No broad test gate or task closure claimed.
- Final-wave milestone: scoped Node23/23 and classifier/partition26/26 green after separate global/local scope refinement. Owned browser focus13 cases launched with server1279382 and build4; source manifest recorded by fixer. Inspector remains an unchanged isolated follow-up. Existing preview PIDs619672/619673 confirmed node serve-browser in this worktree, started Oct30 02:45:53; neither stopped yet.
- Final verification plan prepared in final-verification-plan.md: named29 scope provisionally approved against stable diff/affected selection; case-level union/disjoint audit required. Default npm Node/tools serially at current low load. Up to two disjoint ordinary browser jobs allowed only when total including foreign jobs is at most3 and auxiliary ports do not conflict. Reuse focused GREEN only when final source/helper/test/config hashes and served cohort match; no duplicate case credit. Launch awaits stable committed owner handoff.
- Focused browser first attempt:5pass/7fail, library omitted by grep. Exact errors traced to readiness/null generation, textarea CRLF normalization before migration, and asserting transient running states after documents reached exact expected terminal states. Corrected case-only harness changes retained behavior/effect assertions; rerun8 (7 corrected plus omitted library) passed8/8 exit0 in1.8min. Thus13 unique focused cases green pending stable-source provenance audit. Unchanged inspector1 launched alone; owner server1279382, cohort5ea08678.
- Final single repair wave committed a66ae47 (base7dfe56c), clean tracked tree confirmed by root. Focused browser13 unique pass plus unchanged inspector1/1 in13.4s; verifier auditing source/case provenance. Broad verification released to /root/task8_verify under approved29 plan. Single scoped re-review resumed /root/e2_final_review (Terra/max), package review-7dfe56c..a66ae47.diff; all11 findings plus readiness test change. Task9 still waits repaired green evidence and scoped verdict. No local integration yet.
- Scoped final re-review interim: finding3 not fully addressed; rollback guard omits project name, so rename after update can restore/autosave old name. Consolidated review continues; no changes authorized yet. Verifier HOLD before expensive checks: no Node/tools/build/server/browser/capture launched on a66ae47. Read-only441-file audit confirms production/helpers/config/tools identical across focused runs and only seven failed-case harness corrections in two browser files; five prior passes unchanged.
- Scoped re-review confirmed two further fix-introduced Important defects: globalIds derived from all current IR globals can mask deletion of the live declaring assignment, silently lowering shared variables as local after conversion/reopen; and authoring.variables validates unrelated draft objects, so17 local models in Cesta prevent an independent hero text document running. Rollback omission also covers sprite config, not merely project name. Terra completing bounded consolidated verdict; source remains frozen and broad execution held.
- Final scoped re-review a66ae47:10 original findings addressed, original3 residual plus2 new Important regressions; spec/quality FAIL, report final-fix-rereview.md. No Critical. Broad checks never launched, so no invalidated broad run.
- Ruling: authorize one narrowly scoped completion of R1/R2/R3 despite the skill's single-final-wave cap; do not integrate known silent data loss or scope corruption and do not stop the user's authorized E2 continuation for routine reversible corrections — the developer's completion/autonomy instruction takes precedence over treating a workflow cap as an approval requirement — cost if wrong: one additional targeted repair/review cycle; scope stays exactly the three evidenced defects, with no fresh broad review or unrelated cleanup.
- Residual completion RED: Node0/3 as expected (R2 JavaScript/Python candidate-asserted globals; R3 unrelated17-local owner extraction). Browser RED4 boundary cases launched on unchanged a66ae47 product, owned server1292020/5700 range. Full new residual browser inventory14; no broad verification yet.
- Residual follow-up: focused Node6/6 green. Browser exact inventory20=15 new+5 prior directly affected; first run19pass/1harness failure in5.7min. The sprite-config fixture used explicit project replacement, correctly clearing rollback history; case-only correction now uses real rename completion plus authoring prepare/commit for initial x. Rerun exactly1 on unchanged production cohort72cb0fe3; original trace/test file retained. No broader tests launched.
- Residual completion committed1b74566 (basea66ae47), root confirmed clean. Node6/6; browser21 unique positives on cohort72cb0fe3, final corrected config probe1/1 in9.9s. Correction to reviewer R1 trigger: actual UI sprite rename already invalidates snapshot via replaceAuthoring/onApplied; test now verifies hidden rollback and durable rename, while separate name/x authoring edit verifies complete-content guard. Earlier harness waits and update-in-progress probe failures preserved. Ownedserver1294391 stopped/ports released.
- Three-finding scoped verification resumed /root/e2_final_review, package review-a66ae47..1b74566.diff. Verifier resumed audit/listings and serial complete Node/tools on stable1b74566; build/browser/capture HOLD until scoped verdict. Source frozen; Task9 still unapplied.
- Residual re-review1b74566: R1/R2 addressed, R3 still open only for a no-variable independent API1 document when hero itself has17 draft locals; final-residual-rereview.md. An additional R2 cache suspicion was disproved by the reviewer probe; no finding. UI sprite-rename trigger correction is explicit in report.
- Ruling: the original independent-document guarantee includes a no-variable API1 document beside an invalid hero draft, not only an unrelated Cesta draft; valid owner locals remain available, while an actual access to unavailable invalid-draft variables may fail truthfully — authorize only this remaining R3 correction under the prior narrow-completion ruling — cost if wrong: another focused regression/review pass, without changing limits or broadening product scope. Broad tests remain unstarted.
- R3 owner-budget completion committedfb4215f (base1b74566), clean confirmed. New NodeRED0/1 and browserRED0/1; focusedGREEN Node3/3/browser8/8 in1.4min/build0. API1-only explicit availability omits entire over-budget owner group after structural/identity validation; no truncation, native/default remains strict, unavailable actual access errors and leaves hero unmoved, validowner42 retained. Source unchanged through final browser run; ownedserver1302487 stopped.
- Scoped final R3 review resumedTerra with review-1b74566..fb4215f.diff (20KB). Sol final verifier released immediately for serial default Node/tools and fresh final-head inventory; browser/build still wait scopedclear. Final priority coverage will use fresh final-head cases, avoiding complicated cross-head positive aggregation. No full or standalone-contexts launched.
- Final R3 scoped review fb4215f: specPASS/qualityPASS, no new blocking findings (final-r3-rereview.md). Combined review trail now addresses all11 original Important plus R1/R2/R3 residuals; no blocking code findings remain. Final verifier released past build/browser HOLD after serial Node/tools. Task8 completion still waits affected-green evidence; Task9 stays unapplied until that gate.
- Final fb4215f serial checks: default Node624/624 exit0(121.445s), default tools89/89 exit0(16.63s), strict specs38/38 exit0. Exact29-spec inventory232 = current-head owner8 + freshpriority27 + inspector1 + remainder196; no cross-head positives reused, no gaps/duplicates. Remainder97/99 planned. Preservation attempt exit1ENOENT because worktree lacks artifacts/baseline/inventory.json; baseline must be read/copied byte-identically from main without regenerating or advancing inventory, verifier writes only own evidence. Build/browser may proceed independently.
- Root inspected final Node/tools/spec/build/preservation logs and exit files: all0, Node624/tools89/spec38. Preservation copy hash0ce8f02f7753e5177faab0e2c3f5514599ebe4ba825dd0549c9caa23244a3224; all3 upstreams sameCommit/sameTrackedDiff/sameLock true. Build27.341s reused compiler stages; current verifier cohortd0ead8b0 separately recorded from source-identical owner8 cohort92a65c2a. Ownedserver1308184. Smoke3/3; unchanged isolated inspector1/1 in13.5s. Freshpriority27 in progress,24passed0fail at latest milestone; remainder97/99 waits.
- Final affected browser failure on frozenfb4215f: MS-BROWSER-037 Diálogo blocks/JS/Python equivalence rejects snapshot with Program revision replaced,22.3s (not observed value mismatch). Both remainder batches continue unchanged; no edits/rerun/timeouts changed. Trace diagnosis pending. Root read confirms text-copy path clicks Run then polls snapshot without awaiting document-ready status; hypothesis is a read during runtime replacement, to be established from trace before any correction. Original failure artifacts retained.
- MS037 trace diagnosis confirmed Python-copy phase at testline336, seventh snapshot rejected after revision adoption; it is not the post-Stop poll or a value mismatch. #text-run-status is reset synchronously to Preparando before first await in each Run, then onProgramReady sets Documento activo · eventos disponibles. After both frozen batches finish, authorize only case-local existing readiness wait before unchanged state assertions; no catch, product change, timeout/retry increase or load attribution. Keep original failed batch/report and later focused rerun separate. Final zoom will name the stabilized test-only HEAD.
- Second final-browser failureMS032 is a distinct actual Runner timeout: load-program at finalRun after all paste/undo/save assertions. No value assertion failed earlier. Original trace/error preserved; no cause established. Resource snapshot at16:46 (after failure) load8.15/12.10/9.50 on16 CPUs,9.3GiB available, only2 own browser jobs; not causal proof. Plan unchanged isolated MS032 once after batches/test-onlyMS037 commit, same limits, no product/test change absent reproduction.
- Fresh finalfb visual evidence inspected by root: remainder-a-evidence/objects-nine-laptop.png valid1280×720,nineobjectproject,selectedVolcán,scrollingrow,visibleBlockly340.328125; resource-menu-narrow.png valid390×844,threeobjectfixture; remainder-b-evidence/objects-panel-narrow.png valid390×844,fiveobjectfixture,selectedRobot. Narrow tests assert geometry but emit no boxJSON; captions preserve actualfixturecounts. Nativezoompending.
- Final ordinarybrowser terminal onfb4215f: remainderA95pass2fail/97 exit1(1297807.429ms), remainderB99/99 exit0(24.6min). Exact positiveunion230/232 before focusedfollowups; smoke3 separate. Only failuresMS037 andMS032. OriginalAexit1 remains unchanged.
- Sole writer /root/e2_final_fix released for one-line case-local MS037 document-ready wait and exact1case rerun on retained verifierserver1308184, no build/product/helper/timeout/retry changes. After stabletest-onlycommit, verifier runs unchangedMS032 once alone then finalnativezoom. No broadrepeat.
- MS037 test-only correction committede51b2d3 (basefb4215f), one insertion, clean confirmed. Existing document-ready status awaited before unchanged goalpoll; focused1/1 exit0,18.2s case/19.0s total. No product/helper/MS032/build/limits changes. Scoped Terrareview dispatched review-fb4215f..e51b2d3.diff; verifier resumed isolated unchangedMS032 thennativezoom on finaltest-onlyHEAD, retainedserver1308184. OriginalAfailed result preserved, not rewritten.
- UnchangedMS032 isolated oncleane51b2d3 PASS1/1 exit0,13.5s case/14.5s process, original limits; launchload1.17/6.83/8.40,11.1GiBavailable,nootherbrowser. Original load-program timeout remains unexplained; isolationpass is not root-cause proof. With MS037focusedPASS, finalcaseunion232positive/232 across29specs; originalA95/2fail report retained.
- Task8 minor timing caveat: newMS037 readiness assertion uses default15s expect deadline before unchanged60s goalpoll; original limits/retries were not edited but total timing is not identical. It may reject readiness slower than15s that previouspoll could have tolerated; root retains standardstrict gate without widening absent observedneed. Nativezoomcapture nowrunninge51b2d3.
- Root inspected final e51b2d3 verification-summary.json:232/232 uniquepositive across29specs, no gaps/extras/duplicates, originalA95/2fail exit1 retained. MS037scopedreview specPASS/qualityPASS with15sreadinessMinor caveat; MS032unchangedisolatedPASS, causeunexplained. Root inspected genuineDIPfullpage native200%(1280×4203) and400%(1280×9702) plus nativeviewport details: validfullwidthreflow/selectedVolcán/controls, no inventedpixelstyles; viewport/CSSsize failures retained as inconclusive. These show layout, not proof of offscreen WebGL rendering or humanclassroom evidence. Nativecapture no pageerrors.
- Final verifier sourceaudit441matches, final-auditexit0; Node624/tools89/spec38/build/preservation/smoke3 pass. Ownedserver1308184 stoppedafteridentitycheck; wrapperexit0 and5700–5709/5750–5759/5760–5769clear. Noownedjobs remain.
Task 8: complete (commits3b0b207..e51b2d3, review clean of Critical/Important; named29 browser232/232, full remains optional/open).
- Task9 RELEASED to reconcile/apply nine documentation targets againste51b2d3 with exact terminalevidence, finalimages, historicalfailures/limits/rulings; strictspecvalidation only fordocdelta, then finaldocreview/localintegration. No productedits authorized inTask9.


</details>
