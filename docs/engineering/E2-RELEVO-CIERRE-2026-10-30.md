# E2 multi-sprite: relevo tras cierre local — 30/10/2026

## Instrucción para la próxima sesión

Lee este documento primero. Sustituye el estado y el orden de continuación de `E2-RELEVO-2026-10-30.md` y las entradas históricas contradictorias de `NEXT-SESSION.md` / `CURRENT-STATUS.md`. No reinicies Task 8 ni Task 9: ambas terminaron, las correcciones fueron revisadas y E2 está integrado en main local.

El último pedido del usuario fue **guardar el relevo en un archivo local**. La full se sugirió, pero **no fue autorizada ni ejecutada por ese pedido**. Si el siguiente usuario autoriza la full particionada, ese es el próximo paso; en otro caso, informa del estado y espera la elección. No conviertas una recomendación en autorización.

## Ubicación y Git

- Worktree de trabajo y evidencia: `/home/adawolfs/projects/makecode/gcs-e2-multisprite`, rama `stab/e2-multisprite`.
- Checkout principal: `/home/adawolfs/projects/makecode/guategeeks-code-studio`, rama `main`.
- Ambos HEAD al cierre: `73f9b7a097827b18bb847725b632323b6661c662`.
- Integración local por fast-forward; no push, publicación ni PR. Ambos árboles estaban limpios antes de este relevo.
- Este relevo queda **sin commit**, junto con los enlaces actualizados en `docs/engineering/NEXT-SESSION.md` y `docs/engineering/E2-RELEVO-2026-10-30.md`, solo en el worktree E2. Conservar los tres cambios; no son residuos. Main no recibe estos cambios locales automáticamente.
- Plan: `docs/engineering/plans/2026-10-29-e2-multisprite.md`; spec: `openspec/changes/scene2d-multi-sprite/`; gobierna `docs/product/STABILIZATION-PLAN-2D.md`.
- Acta principal: `docs/engineering/SCENE2D-MULTI-SPRITE-RESULTS.md`; evidencia de producto: `docs/product/scene2d-multi-sprite-evidence.json`.
- En Windows, la raíz equivalente es `\\wsl.localhost\Ubuntu\home\adawolfs\projects\makecode\gcs-e2-multisprite`.

## Trabajo completado

Task 8 se reconstruyó y verificó desde el relevo anterior. Se corrigieron defectos de ayuda/lowering, identidad y nombres de destino, Undo entre aperturas, rollback, migración de proyectos guardados, namespaces API1/API3, ámbitos y presupuestos de variables, independencia de documentos de texto y estado combinado de micro:bit. Task 9 documentó resultados, guía docente, observación y límites; revisiones finales cerraron los bloqueantes.

Cortes relevantes:

- `7dfe56c`: primera reparación de Task 8.
- `a66ae47`: reparación combinada de hallazgos; revisión todavía FAIL por residuales.
- `1b74566`: R1/R2 corregidos; R3 owner-budget todavía abierto.
- `fb4215f06e5d22e06cb9977324079f2de4758f08`: producto final probado; R3 corregido.
- `e51b2d39bab871c693b2dabae0e7ac300d638fea`: solo una espera de readiness dentro de MS037, sin cambio productivo.
- `c06135f`, `dfc3f8e`: documentación revisada. Main recibió `dfc3f8e8f3f128ea070b1d66adfb1e9d4a8047a2`; Node se repitió en main.
- `73f9b7a`: hechos documentales del cierre, revisados e integrados; producto y pruebas sin cambios respecto del main ya verificado.

## Verificación acreditada y límites de la evidencia

| Puerta | Resultado |
| --- | --- |
| Node en producto final | 624/624, sin fallos/cancelados/skipped |
| Node tras integración en main | 624/624, exit 0; 119256.927981 ms |
| Herramientas | 89/89, exit 0 |
| OpenSpec estricto | 38/38, también tras integrar documentación final |
| Build incremental | exit 0 |
| Preservación upstream | 3/3: commit, diff y lock conservados |
| Smoke | 3/3, separado de los casos siguientes |
| Navegador seleccionado | 232 casos únicos con resultado aprobado en 29 specs, unidos entre lotes y repeticiones focales |

**No hubo una sola corrida limpia de 232/232.** El lote A original conserva 95 aprobados y 2 fallidos de 97, exit 1; B aprobó 99/99. La unión final es 8 owner-budget + 27 prioridad fresca + 1 inspector + 95 A + 99 B + 1 MS037 focal + 1 MS032 aislado. Sin huecos, extras ni duplicados en la auditoría final.

- MS037: snapshot enviado durante reemplazo de revisión Python. Se añadió una espera del estado existente, con deadline estándar de **15 s**, antes del poll original de 60 s. El objetivo, límite global y retries permanecen; la nueva espera puede fallar antes por readiness.
- MS032: `Runner timeout: load-program`; pasó aislado sin cambiar la prueba. **Causa original no explicada**; no declarar flake eliminado ni carga causal demostrada.
- GG-LIB histórico intermitente sigue sin explicación; es distinto del timeout MS032 y de MS037.
- Config Playwright local al artefacto importa la canónica y cambia solo reuseExistingServer y testDir absoluto, usando un servidor normal propio prearrancado. Las sondas a puertos cerrados se atascan en este WSL. **No se verificó el ciclo de arranque gestionado por Playwright**.
- Full NO ejecutada en esta reanudación; inventario al cierre: 50 specs. OpenSpec 4.2 sigue abierta. `standalone-contexts` tampoco se ejecutó en esta reanudación.
- Capturas reales a zoom nativo 200%/400% verifican disposición/reflow, no aceptación humana ni renderizado WebGL fuera de pantalla.
- Logs RED originales carecen de procedencia exacta del árbol anterior a implementación; no inventar cumplimiento TDD retrospectivo.

## Evidencia y recuperación sin SDD

Todas las rutas siguientes son relativas al worktree E2:

- `artifacts/stabilization-2d/e2-multisprite/final-record/integration-record.json`: integración, main, hashes, previews y recibo de limpieza.
- `final-record/` bajo esa misma raíz contiene **39 Markdown respaldados**, incluidos `progress.md`, `globals.md`, `task-8-report.md`, `final-verification-report.md`, `final-fix-report.md`, `task-9-review.md` y revisiones intermedias/finales.
- `final-record/report-backup-manifest.json`: SHA-256 de cada Markdown, comprobado contra el original antes de borrar.
- `final-record/rulings.json`: **20 decisiones formales ordenadas**, incluida la decisión calificada de ambos planes; consultar junto con `progress.md` para los costes y contexto completos.
- `final-record/sdd-cleanup.json`: eliminación verificada del único directorio `.superpowers/sdd/2026-10-29-e2-multisprite`, el 30/10/2026 a las 23:33:56 UTC. **No existe ya ese workspace SDD**. No intentar reanudar agentes ni recrearlo para repetir trabajo terminado.
- `final-record/main-node.log`, `main-node.exit`, `main-closure-spec.log`, `pack-hashes.json`, `preview-health.json`: evidencia terminal del cierre.
- `final-verification/e51b2d3/verification-summary.json`, `final-source-audit.json`, `final-audit.log`: unión exacta de evidencia y auditoría final.
- `final-verification/fb4215f/verification-summary-original-attempt.json`: resultados originales, incluidos fallos. No sobrescribirlos.
- Capturas laptop/móvil: `final-verification/fb4215f/remainder-a-evidence/objects-nine-laptop.png`, `resource-menu-narrow.png`; `remainder-b-evidence/objects-panel-narrow.png`.
- Zoom nativo completo: `final-verification/e51b2d3/zoom-dip-supplement/zoom-200-cdp-surface.png` y `zoom-400-cdp-surface.png`. Los intentos iniciales vacíos/recortados permanecen como inconclusos.

Los artefactos están ignorados por Git y viven en este disco/worktree, no automáticamente en main. Abrir el acta desde el worktree E2 para resolver sus enlaces. **No usar git clean -fdx ni eliminar el worktree.**

## Previews que se deben conservar

Última comprobación: ambos PID seguían vivos tras la limpieza; anteriormente los 12 endpoints `/health` devolvieron 200 y se comprobó localhost desde Windows. Los PID son una fotografía histórica: validar identidad antes de cualquier señal.

| Perfil | URL | PID al cierre | Puertos |
| --- | --- | --- | --- |
| Completo | http://127.0.0.1:5283/ | 1352411 | 5283, 5284, 5285, 5286, 5291, 5292 |
| Piloto 2D/texto | http://127.0.0.1:5383/ | 1352412 | 5383, 5384, 5385, 5386, 5391, 5392 |

- Ambos: `node tools/f0/serve-browser.mjs`, desde worktree E2.
- Cohort completo: `c0b5d2dfc5a38af58e52b8443a6870f0e47de283dc45cda19470690add52853a`.
- Cohort piloto: `4edb9265990bd179e7e80963c5d7fbbba861257ea04e64c02bfa45472c59fd29`.
- Logs: `artifacts/previews/full-e2-closure.log` y `pilot-e2-closure.log`.
- Se construyeron sobre dfc3f8e, con producto equivalente a fb4215f; 73f9b7a solo cambió documentación. No necesitan reinicio por este relevo.
- PID viejos 619672/619673 fueron detenidos con identidad comprobada; no volver a señalarlos por número histórico.
- **PID ajeno 38168 no está autorizado**. No matar procesos por nombre ni por puerto sin comprobar propiedad y autorización.
- Servidor de verificación propio 1308184 detenido; rangos de pruebas 5700/5750/5760 quedaron liberados. Verificar ocupación actual antes de reutilizar.

## Hash congelado

`gg.sprites@0.3.0`: `1702532cb4cb424ab8a6ebf8a8813e9fe567a5255ebe45d5c558eb51e7b87cfc`.

Verificación también conservó 0.1.0 y 0.2.0; consultar `final-record/pack-hashes.json`. La decisión de permitir cambios internos de 0.3.0 hasta integración **ya terminó**: no tratar el manifiesto como mutable después del cierre.

## Operación y reglas que siguen vigentes

1. Leer AGENTS.md, este relevo, acta y TESTING.md. Comprobar Git, HEAD y procesos actuales antes de actuar; conservar cambios locales ajenos.
2. Ejecutar en Ubuntu/WSL. Desde el checkout: `source ../scripts/env.sh` y `unset -f node npm npx` para usar Node instalado (22.23.4 al cierre) sin wrappers heredados.
3. Commits locales autorizados históricamente; sin push/publicación. Sigue la regla heredada de trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` salvo nueva instrucción del usuario; no atribuirle la selección actual de agentes.
4. El usuario pidió GPT-6.1 Sol y Terra con esfuerzo elegido por el coordinador. Se usó Sol high/xhigh para implementación/verificación y Terra xhigh/max para revisiones. Usar agentes nuevos si hace falta; los anteriores terminaron. Un implementador a la vez por worktree; subagentes no crean subagentes.
5. Nunca correr otras suites durante una full. Máximo 2–3 particiones de navegador simultáneas cuando el plan lo permita; respetar suites exclusivas, en particular standalone-contexts. Revisar los comandos actuales y reservar puertos antes de iniciar.
6. No debilitar aserciones, retries ni timeouts. No tocar upstreams, reinstalar dependencias ni limpiar sus checkouts para obtener verde. node_modules está compartido por symlink.
7. Micro:bit, 3D, web y Scratch permanecen congelados salvo defecto demostrado. No ampliar E2 ni empezar E3/E5 como efecto de este relevo.
8. No equiparar Node/quick/selección afectada a full ni avanzar la baseline de impacto sin cumplir el flujo autorizado. La primera comprobación de preservación falló por baseline ausente: se copió la baseline idéntica de main, no se regeneró. SHA-256: `0ce8f02f7753e5177faab0e2c3f5514599ebe4ba825dd0549c9caa23244a3224`.
9. En el host PowerShell, no introducir `$()` dentro de comandos bash interpolados: ya hubo expansión en Windows que hizo fallar una guarda antes del merge. Para lógica compleja, escribir `.sh` literal con LF y ejecutarlo por ruta absoluta usando `wsl -d Ubuntu -- bash ...`.
10. WSL requirió escalación de sandbox en esta sesión. Distinguir un rechazo de sockets/permisos de un fallo real del servicio. Para borrar/mover en Windows, usar un solo shell nativo y validar rutas absolutas; la limpieza SDD ya terminó.

## Límites de producto y asuntos diferidos

- El escenario en reposo refleja el proyecto tras Ejecutar; editar panel/recursos reinicia el runner y detiene el programa. Seleccionar objeto/vista no ejecuta ni detiene.
- Copia de proyecto: 16 eventos y 16 variables; límites nativos de 16 globales y 16 locales por objeto permanecen. Texto conserva IDs técnicos de disfraces.
- Documentos 0.3.0 cargan escena IR v1 configurada con sus propios scripts. La independencia API1 incluye borradores ajenos inválidos; leer variables no disponibles puede fallar explícitamente.
- Se mantiene error técnico Unsupported block para bloques ajenos, atasco heredado de paste y dependencia de event.group/doClassValidation_ en Blockly 13.4.0.
- Deuda documentada de downgrade para proyectos v6 externos válidos con workspaces no vacíos idénticos; no declarar garantía universal de ausencia de descarte. La UI ordinaria no produce esas identidades copiadas.
- Sin aceptación docente, lector de pantalla humano, rendimiento escolar ni hardware acreditados.
- Pendientes de decisión: full particionada, biblioteca a 1280×720, abrir siete opcodes revisados a SB3 tras congelación.
- Después, según autorización/prioridad: cierre E0 (acta, OpenSpec/ADR-011, CodeGraph, TESTING/suite exclusiva), E3 sensores/operadores y E5 preparación de aula/instalación. No están incluidos automáticamente.

## Si se autoriza la full

Inspeccionar el flujo actual de TESTING/package scripts y coordinar exclusión con otros trabajos. Crear evidencia nueva sin sobrescribir la anterior; identificar commit, árbol, perfil, puertos y cohort. Conservar previews; usar servidores y puertos propios. Ejecutar las particiones y las suites exclusivas conforme al flujo real. Investigar fallos antes de declarar verde. Solo cerrar OpenSpec 4.2 si la evidencia lo permite; una repetición aislada no borra el resultado fallido original. Actualizar el acta y este relevo con los resultados reales.

Prompt sugerido para otra sesión, una vez autorizada: «Continúa desde /home/adawolfs/projects/makecode/gcs-e2-multisprite/docs/engineering/E2-RELEVO-CIERRE-2026-10-30.md. Ejecuta la full particionada, conserva previews y evidencia, y determina si puede cerrarse OpenSpec 4.2. Usa GPT-6.1 Sol y Terra con el esfuerzo apropiado.»
