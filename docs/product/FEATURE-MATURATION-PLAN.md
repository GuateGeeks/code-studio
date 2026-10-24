# Plan de maduración por feature

24 de octubre de 2026, Guatemala. Plan de implementación posterior al rework visual (`studio-visual-workspace-rework`, puerta completa aprobada el 24/10). No modifica código ni contratos: propone cambios OpenSpec, su orden, criterios de aceptación y decisiones pendientes. Cada cambio se redacta y aprueba por separado antes de implementarse.

> **Actualización del 24/10/2026:** el usuario aprobó vistas sincronizadas bloques↔texto, API legible sin `GG` visible y packs como tabla de lenguaje ([ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)). Están propuestos en `openspec/changes/` los tres cambios de la Ola 0 (`repo-baseline-and-spec-consolidation`, `pack-versioning-and-migrations`, `test-gate-scaling`) y dos de la Ola 1 (`block-language-contract`, `synced-code-views`); la hoja de ruta está resumida en `PRODUCT.md` como propuesta. Sustituyen a `text-api-v2-idiomatic` y `text-compare-view` (F5), resuelven la decisión D9 y cambian el orden de la Ola 1.

**Fuentes integradas**

- Estado del producto: `PRODUCT.md`, `DESIGN.md`, ADR 001–010, resultados E1–E4 y [rework visual](VISUAL-REWORK-RESULTS.md), [revisión transversal E4](E4-CROSS-CONTEXT-REVIEW.md), [plan de acción](PLAN-DE-ACCION-2026-10-22.md).
- [Evaluación Code.org vs GuateGeeks](../../../docs/architecture/EVALUACION-CODEORG-VS-GUATEGEEKS-2026-10-23.md): recomendación A+C, backlog P0-1…P2-15 y experimentos 1–3.
- [Plan de implementación raíz](../../../docs/architecture/IMPLEMENTATION-PLAN.md) y [contexto de plataforma](../../../docs/exports/plataforma-aprendizaje-contexto-y-plan.md): objetivos originales (Xcratch, micro:bit, 3D tipo CoSpaces, apps web, extensiones).
- Referencias locales: `xcratch-scratch-editor` (scratch-gui, scratch-vm, scratch-paint), `pxt-microbit` (libs `core`, `radio`, `music`, `servo`, `datalogger`…), `raspberrypi-blockly`, `3d-assets` (modelos curados con licencias).
- Inspección del código actual (`src/`, 13,7 k líneas propias) hecha para este plan. Las afirmaciones marcadas **[CÓDIGO]** se comprobaron en el árbol; **[EVIDENCIA PREVIA]** procede de actas; **[PROPUESTO]** es diseño futuro.

---

## 1. Diagnóstico: el producto es ancho y poco profundo

E1–E4 y el rework resolvieron la *presentación* y el *patrón común* de los seis contextos. Lo que separa a Code Studio de Scratch y MakeCode ya no es la composición, sino la **expresividad de cada contexto** y el **contenido**. Hallazgos verificados en el código:

| # | Hallazgo | Localización | Consecuencia |
|---|---|---|---|
| H1 | **2D tiene un único sprite `hero`** fijado en el formato y en la shell | `src/project-format.mjs:8` (`projectInitialScene.spriteId:'hero'`), `src/studio/shell.js:467`, `lessons.mjs:31` | No se puede hacer el proyecto típico de Scratch (dos personajes que interactúan). Es la brecha estructural más grande |
| H2 | **Vocabulario 2D de ~16 bloques**: un único bloque de movimiento («mover N pasos»), sin «por siempre», sin aritmética, sin sensores, sin decir/pensar, sin mostrar/ocultar | `src/packs/gg.sprites/manifest.mjs:16-24`, `src/editor/block-program.mjs` (solo `controls_repeat_ext`, `controls_if`, `logic_compare`, `math_number`, `math_change`) | No hay juegos: sin bucle principal ni colisiones. La VM ya ejecuta 84 opcodes (matriz F5) que el editor no expone |
| H3 | **La copia editable de Scratch importado depende de ese subconjunto mínimo** | `docs/phase-5/OPCODE-MATRIX.md` (84 opcodes VM) frente a IR0 | Casi ningún SB3 real es convertible; la cobertura crece sola si crece el vocabulario 2D |
| H4 | **micro:bit tiene 12 bloques** (3 eventos, 6 de pantalla, 3 de control); sin sensores, música, radio, variables ni matemáticas; la matriz de LED se escribe como «25 bits» en un campo de texto | `src/packs/gg.microbit/blocks.mjs` | PXT ya compila esas APIs (libs `core`, `music`, `radio`): ampliar es sobre todo traducción bloque→Static TypeScript |
| H5 | **Bloques 3D/web con campos de texto libre**: objetivos, valores y condiciones se escriben a mano (`$var.counter`, `$event.values.web-input`); sin bloques de valor (reporters) | `src/contracts/operations.mjs` (`capabilityBlockDefinitions`), `program-ir1.mjs` (`fieldExpr`) | Un principiante no puede componer expresiones; los errores tipográficos son el modo de fallo principal |
| H6 | 3D: seis tipos de entidad (esfera, caja, suelo, modelo GLB, luz hemisférica/puntual), siete operaciones; sin colisiones, animación ni editor de escena | `src/contracts/scene3d-program.mjs`, `operations.mjs` | Lejos de la referencia CoSpaces del objetivo original |
| H7 | Web: botón, formulario, campo, lista; siete operaciones; sin persistencia local, imagen ni selección | `src/contracts/webapp-program.mjs` | El criterio original «formulario y lista persistente» (Fase 5 del contexto) no se cumple |
| H8 | **Editor de texto = `<textarea>`**: sin resaltado, números de línea, autocompletado ni marcadores de error | `src/studio/index.html:75,131` | MakeCode ofrece Monaco con cajón de fragmentos; la transición a texto es la promesa central del producto |
| H9 | **Código derivado poco idiomático**: `await ctx.move(...)`, `GG.ref("…")`, `await ctx.compare("EQ", …)` | `src/generated-program-source.mjs:36-55` | Leer el código no enseña JavaScript/Python reconocible (hallazgo P1 «código API2» del kit) |
| H10 | **GGPROJ exige que los locks del proyecto sean idénticos al catálogo**; los permisos se otorgan solo a `version==='0.1.0'` | `src/project-format.mjs:85`, `operations.mjs` (`resolveOperationProfile`) | **Cualquier ampliación de un pack deja sin abrir los proyectos guardados.** Es prerrequisito técnico de todo lo demás |
| H11 | 3 actividades, todas 2D/texto; checks binarios; sin CNB, unidades ni autoría docente | `src/assets/lessons/catalog.mjs` | Coincide con la evaluación Code.org (P1-7, P1-8, P1-10, P1-11) |
| H12 | Repositorio sin commits, 22 cambios OpenSpec completos sin archivar y `openspec/specs/` vacío | `git log`, `openspec/` | Cada cambio nuevo se valida contra deltas acumulados en vez de especificaciones consolidadas |

**Conclusión:** madurar significa, en este orden, (1) poder versionar packs sin romper proyectos, (2) dar profundidad expresiva a 2D y texto, que son la entrada y el puente del aprendizaje, (3) convertir esa profundidad en actividades graduadas validadas en aula, y (4) llevar el mismo patrón a micro:bit, 3D y web. La arquitectura (seis orígenes, IR validada, adaptadores, offline) se conserva; la evaluación Code.org ya descartó reescribirla.

---

## 2. Escala de madurez

| Nivel | Nombre | Significado verificable |
|---|---|---|
| N0 | Demostración | Funciona en un caso fijo o en el corpus de prueba |
| N1 | Verificado | Contratos, adaptador y pruebas automatizadas; Stop, guardado y aislamiento correctos |
| N2 | Comprensible | Copy en español, errores con causa y acción, estados claros, teclado/zoom automatizados |
| N3 | Expresivo | Permite construir los **proyectos canónicos** del contexto (§3) sin trucos ni texto libre donde debería haber un menú |
| N4 | Validado | Observado con docentes/estudiantes, en equipos escolares o placa física, con umbrales acordados antes |

### Matriz actual y objetivo

| Feature | Hoy | Objetivo piloto (alpha.2) | Objetivo posterior | Referencia principal |
|---|---|---|---|---|
| F1 Entrada y continuidad | N2 | N3 + N4 (Exp. 1) | — | Code.org (actividad primero), kit (Flujo 3) |
| F2 Espacio de trabajo (shell) | N2 | N2 + N4 parcial | — | Scratch + MakeCode (ya adoptado) |
| F3 Contexto 2D | N1–N2 | **N3** + N4 | — | Scratch |
| F4 Recursos (disfraces, fondos, sonidos) | N1 | N3 | — | Scratch (biblioteca, editor de pintura) |
| F5 Texto (lectura, copia, editor, consola) | N1–N2 | **N3** | N4 | MakeCode (Monaco, cajón, Python/JS) |
| F6 micro:bit | N1–N2 | **N3** + N4 físico | Modo en vivo (P2-14) | MakeCode micro:bit |
| F7 Scratch importado | N2 | N3 (cobertura medida) | — | Scratch 3 |
| F8 3D | N1–N2 | N3 «lite» | Editor de escena completo | CoSpaces/Delightex |
| F9 Aplicaciones web | N1–N2 | N3 «lite» | — | Code.org App Lab (modo diseño) |
| F10 Actividades y progresión | N1–N2 | **N3** + N4 | Autoría docente | Code.org Lab2, MakeCode tutoriales |
| F11 Offline y distribución | N1 | N4 (Exp. 2) | — | Propio (diferencial) |
| F12 Accesibilidad e idioma | N2 | N4 (lector humano) | i18n | Blockly keyboard nav, WCAG |
| F13 Extensiones (packs) | N1 | N2 (versionado y SDK) | Terceros revisados | MakeCode extensions, Xcratch |
| F14 Docente y Sócrates | N0 | Contrato v0 (documento) | Entrega/recibo | Code.org (`keepWorking/completed`) |

---

## 3. Proyectos canónicos (definición operativa de N3)

N3 no se declara por número de bloques: se declara cuando estos proyectos se construyen **solo con bloques y menús**, se guardan, reabren, se leen como JS/Python y pasan como fixtures E2E. Son proyectos propios, inspirados en tipos de actividad comunes; no se copia contenido de Code.org (CC BY-NC-SA) ni de Scratch/MakeCode.

| Contexto | Proyectos canónicos | Exige |
|---|---|---|
| 2D | **Atrapa la fruta** (fruta cae, cesta con flechas, puntos al tocar); **Laberinto** (flechas, tocar pared → volver al inicio); **Diálogo** (dos personajes, decir, mensajes, cambio de fondo) | Multi-sprite, por siempre, tocando, aleatorio, ir a x/y, decir, mensajes, fondos, mostrar/ocultar |
| Texto | Reescribir «Atrapa la fruta» en JavaScript y en Python desde la copia | API v2 idiomática, editor con autocompletado, errores con línea |
| micro:bit | **Dado** (agitar → número aleatorio); **Termómetro** (temperatura en pantalla); **Piedra, papel o tijera**; **Mensajes por radio** (dos placas simuladas); **Melodía** con botones | Gestos, sensores, aleatorio, variables, música, radio, editor de matriz 5×5 |
| Scratch importado | Corpus propio de ≥20 SB3 de principiante: ≥80 % ejecutables y ≥50 % convertibles a copia editable | Vocabulario 2D v2 + multi-sprite |
| 3D | **Recolecta las esferas** (clic → desaparece, puntos, texto flotante); **Sistema solar** (jerarquía, giro por siempre) | Menús de entidades, reporters, por siempre, colisión/clic, animación, mostrar/ocultar |
| Web | **Lista de tareas persistente**; **Calculadora de propinas** | Menús de componentes, valor de campo, operaciones numéricas y de texto, almacenamiento local |

---

## 4. Invariantes (no se negocian en ningún cambio)

Proceden de ADR 001–010, `PRODUCT.md` y la evaluación:

1. Sin ejecución automática al abrir, editar, copiar, consultar o cambiar de contexto; un único Detener sobre el resultado activo.
2. Texto→bloques solo dentro del subconjunto bloqueable y por acción explícita (ADR-011); el código fuera de él se explica y puede guardarse como copia independiente, que se conserva.
3. Uso sin cuenta y offline con cohortes verificadas; ningún cambio introduce red obligatoria ni telemetría remota.
4. Seis orígenes aislados; los proyectos importados no conceden permisos ni descargan código.
5. Solo los adaptadores conocen internals de Scratch/PXT/Babylon; QuickJS/Pyodide viven en `src/targets/text`.
6. Todo GGPROJ previamente válido sigue abriéndose (con migración declarada y probada) y conserva IDs de bloques.
7. Los checks acreditan condiciones del programa, no comprensión.
8. Identidad visual de `DESIGN.md`; un único escritor para `index.html`, `style.css`, `contextual-workspace.mjs` y tokens.
9. Upstreams preservados (`artifacts/baseline/verification.json`); nuevas dependencias solo con beneficio verificable frente a capacidades nativas.

---

## 5. Plan por feature

Cada ficha indica estado, qué tomar de cada referencia, brechas, cambios OpenSpec propuestos (nombre provisional, tamaño S/M/L como en la evaluación) y aceptación.

### F0 · Plataforma de ingeniería (prerrequisito)

**Estado:** puerta completa ~49 min (400 Node, 63 herramientas, 177 E2E); sin commits; 22 cambios sin archivar; `openspec/specs/` vacío; locks rígidos (H10).

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| **`repo-baseline-and-spec-consolidation`** (propuesto) | S | Commit inicial y etiquetas `0.1.0-alpha.1` y `e4-visual-rework`; archivar los cambios completos y consolidar `openspec/specs/` con `openspec-archive-change`/`openspec-sync-specs` | `git rev-parse` corresponde a la huella de `src/`; `spec:validate` sobre specs consolidadas; ninguna acta histórica reescrita |
| **`pack-versioning-and-migrations`** (propuesto) | M | **GGPROJ v4**: un proyecto declara `packId@version`; el catálogo instala varias versiones o migra hacia adelante con migraciones declarativas por pack (`migrations:[]` ya existe en los manifiestos); los permisos de operaciones dejan de estar fijados a `0.1.0`; lectura v1–v3 intacta | Un GGPROJ con `gg.sprites@0.1.0` abre en un catálogo con `@0.2.0`, migra sin perder IDs ni comportamiento y no ejecuta; un pack desconocido conserva datos y bloquea solo su contexto |
| **`test-gate-scaling`** (propuesto) | S–M | Partición de E2E por contexto en `test:affected`, workers en paralelo con puertos asignados, fixtures de proyectos canónicos | Full < 30 min en la misma máquina, o justificación medida |

### F1 · Entrada y continuidad

**Estado:** entrada guiada (continuar/crear/actividad/abrir), autosave con copia actual y anterior, GGPROJ atómico, recuperación sin ejecutar [EVIDENCIA PREVIA]. Falta un modelo de guardado comprensible (P0-3) y la entrada «actividad primero» (Flujo 1).

- **Scratch:** «Archivo → Guardar en tu computadora» es explícito pero sin estado. **Code.org:** guardado automático en servidor, sin modelo local. **Lo propio:** el diferencial es local + portable; hay que hacerlo legible.
- **Brechas:** no se distingue «guardado en este navegador» de «copia descargada hace N min»; no hay aviso de proyecto sin descargar antes de borrar datos en equipos compartidos.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `project-continuity-model` | S–M | Indicador con tres estados (en este equipo · copia descargada hace N · sin descargar desde el último cambio); acción única «Llevar o entregar» (por ahora solo descarga); recordatorio al cerrar si nunca se descargó | E2E de estados y recuperación; en Exp. 1 la persona explica dónde está su trabajo |
| `activity-first-entry` | M | Entrada «Empezar una actividad» con consigna y predicción arriba, un solo Ejecutar/Detener y Comprobar; «Seguir creando libremente» al terminar; detrás de una opción para comparar ramas en Exp. 1 | Rama 1 y Rama 2 disponibles sin cambiar contratos; progreso separado de GGPROJ |

### F2 · Espacio de trabajo

**Estado:** N2 tras el rework (cabecera de 48 px, programa izquierda, transporte y resultado derecha, consulta con pestañas reales, vista ampliada, barra móvil). Límites declarados: escena micro:bit pequeña a 1280×720, hoja del runner con estilos previos.

- **Scratch:** escenario con modo pantalla completa y modo escenario pequeño; **lista de sprites bajo el escenario** (se necesitará con F3). **MakeCode:** controles del simulador (reiniciar, silenciar, pantalla completa, cámara lenta).
- **Brechas para madurar:** panel de objetos 2D bajo el resultado (depende de multi-sprite); controles del simulador en micro:bit (silencio, cámara lenta); armonizar la hoja del runner aislado con los tokens.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `workspace-object-pane` | M | Panel de objetos (sprites y escenario) en la consulta o bajo el resultado, al estilo Scratch; selección de objeto = qué scripts se editan | Seleccionar objeto no ejecuta; «Editando: Cesta» visible; teclado APG |
| `runner-sheet-tokens` | S | Foco, radio y escala de texto del runner alineados a `DESIGN.md` | Detector sin hallazgos en la hoja aislada |

### F3 · Contexto 2D (prioridad máxima)

**Estado:** Blockly → IR0 validada → Scratch VM; un sprite `hero`, dos disfraces, un sonido de ejemplo; ~16 bloques (H1, H2).

- **Scratch (referencia directa):** categorías Movimiento, Apariencia, Sonido, Eventos, Control, Sensores, Operadores, Variables, Mis bloques; lista de sprites; escenario con fondos; monitores de variables. La VM local **ya ejecuta** los opcodes correspondientes (matriz F5: 12 de movimiento, 11 de apariencia, 17 de operadores, 13 de datos…).
- **MakeCode Arcade (secundaria):** sprites con «tipo» y eventos de solapamiento; útil como inspiración para colisiones legibles.
- **Code.org:** progresión por conceptos en Sprite Lab; no se copia contenido.

**Estrategia:** cada bloque nuevo se añade **en cuatro capas a la vez** (definición Blockly en pack → IR0.2 validada → proyección a opcode VM ya admitido → generadores JS/Python de F5), con un caso del corpus de equivalencia. Así crecen a la vez el editor, la lectura textual y la cobertura de copia Scratch (F7).

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `scene2d-multi-sprite` | L | Lista de sprites y escenario con fondos; scripts por objeto; IR con `targetId` por script; adaptador con varios targets VM; inspector, código derivado y actividades por objeto; migración GGPROJ que convierte `hero` en el primer sprite | GGPROJ v1–v4 con `hero` abren idénticos; dos sprites con scripts propios se ejecutan, se detienen y se reabren; IDs conservados |
| `scene2d-vocabulary-motion-looks-control` | L | Movimiento: girar, apuntar en dirección, ir a x/y, ir a objeto/aleatorio, deslizar, rebotar en el borde, fijar/cambiar x/y. Apariencia: decir/pensar (por segundos), mostrar/ocultar, tamaño, siguiente disfraz, fondo. Control: **por siempre**, repetir hasta, esperar hasta, si/si no, detener todo/este script | «Diálogo» completo; corpus de equivalencia bloques/JS/Python por bloque nuevo |
| `scene2d-vocabulary-sensing-operators` | M–L | Sensores: tocando objeto/borde, tecla presionada, posición del ratón, distancia, temporizador. Operadores: + − × ÷, aleatorio entre, y/o/no, unir, longitud, módulo, redondeo. Variables: cambiar en, mostrar/ocultar monitor | «Atrapa la fruta» y «Laberinto» completos |
| `scene2d-procedures-lists` | M | Mis bloques (sin retorno, con parámetros), listas básicas (añadir, elemento, longitud) | Proyecto con un bloque propio reutilizado en dos sprites; listas en código derivado |

**Riesgos:** semántica de `por siempre` + Stop (ya resuelta en F0 para el corpus); igualdad de tipos JS/Python frente a Scratch (coerción texto/número) — declarar reglas en ADR 004; límites de IR (128 nodos, 16 scripts en IR1) a revisar para proyectos multi-sprite.

### F4 · Recursos

**Estado:** importación de imagen/audio validada (PNG/SVG/WAV/GLB), recorte de imagen, menús de recursos en bloques (`gg.assets`) [CÓDIGO]. Sin biblioteca inicial ni editor de dibujo.

- **Scratch:** biblioteca de sprites/fondos/sonidos y editor de pintura (scratch-paint, React + paper.js). Las bibliotecas de Scratch tienen licencias propias: **no se copian**. **Workspace:** `3d-assets` ya mantiene un catálogo curado con licencias, índices y atribuciones; el mismo proceso sirve para 2D.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `resources-starter-library` | M | Biblioteca local propia o CC0 (≈20 sprites, 8 fondos, 10 sonidos) con atribución y hashes, incluida en la cohorte offline; requerida por los proyectos canónicos | Añadir de la biblioteca funciona sin red; `THIRD_PARTY_NOTICES` actualizado |
| `resources-paint-editor` | M–L | Editor de disfraces mínimo propio (pincel, relleno, borrador, formas, texto) sobre canvas; **evaluar antes** reutilizar scratch-paint en un origen aislado y decidir con datos (peso, dependencias React) | Disfraz dibujado → guardado → reabierto con hash estable; teclado básico |

### F5 · Texto (lectura, copia, editor, consola)

**Estado:** lectura derivada de solo lectura, copias JS (QuickJS) y Python (Pyodide) independientes, consola ligada a sesión con «Ver bloque»/«Ir a línea», errores explicados tras el rework [EVIDENCIA PREVIA]; editor `<textarea>` (H8); código poco idiomático (H9); sin `input()`.

- **MakeCode:** Monaco con resaltado, autocompletado, firma de funciones y **cajón de fragmentos** que se arrastran al código; el JS/Python generado es idiomático (`basic.showIcon(...)`). **Code.org Python Lab:** Pyodide en worker, `input()` mediante service worker, pruebas unitarias. **Flujo 4 de la evaluación:** comparación bloques/copia y predicción «¿qué pasa con tus bloques?».

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| **`block-language-contract`** (propuesto) | L | Tabla de lenguaje por bloque en el manifiesto de pack (bloque, JS, Python, bajada por contexto, espacio de nombres), reglas bloqueables verificadas, API v3 legible sin `GG`/`ctx`/`gg_*`, generadores genéricos; migra los packs actuales sin cambiar comportamiento | Lectura sin `GG.`, `ctx` ni `gg_` en los seis contextos; copias API1/API2 intactas; corpus equivalente |
| `text-editor-codemirror` | M | CodeMirror 6 en el shell (solo edición; la ejecución sigue en el origen del lenguaje): resaltado, números de línea, marcadores de error, autocompletado y firma de la API GG, navegación por teclado accesible; mismo `id`/etiqueta | Accesibilidad automatizada sin regresión; tamaño añadido medido; offline incluido en la cohorte |
| `text-snippet-drawer` | S–M | Cajón de fragmentos por categoría (mismas categorías que los bloques) que inserta código en el cursor | Insertar con teclado; el fragmento ejecuta |
| **`synced-code-views`** (propuesto) | L | Bloques · JavaScript · Python como vistas del mismo programa; editar texto y volver a bloques conservando IDs; rechazo con línea y tres salidas (seguir, volver, guardar como copia); 2D JS → 2D Python → micro:bit TS → 3D/web; revisión 2 de la actividad de transición | Ida y vuelta del 100 % del corpus; E2E de rechazo, Deshacer y reapertura; Exp. 1 compara con la copia independiente |
| *(diferido)* `python-input-poc` | M | Patrón SW de Python Lab en el origen del lenguaje | Solo si una actividad lo exige (P2-12); Stop fiable y cohorte intacta |

### F6 · micro:bit

**Estado:** bloques o TypeScript independiente; simulación conjunta con la escena; compilación PXT en worker, HEX y transferencia USB explícita con dapjs [EVIDENCIA PREVIA]; 12 bloques (H4); **sin prueba física**.

- **MakeCode micro:bit (referencia directa):** Básico, Entrada (botones, gestos, acelerómetro, luz, temperatura, brújula, pines, logo), Música, LED, Radio, Bucles, Lógica, Variables, Matemáticas; **campo de imagen 5×5 clicable**; simulador con varias placas para radio; controles de silencio y cámara lenta. Todas esas APIs están en `pxt-microbit/libs` y PXT las compila ya: GG solo traduce bloques a Static TypeScript.
- **Code.org Maker:** modo «atado» por Firmata (sensores en vivo). Se pospone (P2-14).

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `microbit-vocabulary-input-music` | L | Entrada (gestos, acelerómetro, luz, temperatura, brújula, pines tocados), música (tono, melodía, tempo), variables, matemáticas (aleatorio, operaciones), lógica; **campo matriz 5×5 visual** (sustituye «25 bits» con migración) | «Dado», «Termómetro», «Piedra, papel o tijera» y «Melodía» compilan a HEX y corren en el simulador |
| `microbit-radio-multiboard` | M | Radio (enviar/recibir número y texto, grupo) y simulador con dos placas | «Mensajes por radio» en simulación |
| `microbit-ts-language-service` | M | Autocompletado y diagnóstico TypeScript usando el servicio de lenguaje de PXT dentro del worker existente, sobre el editor de F5 | Errores con línea; sin red |
| `microbit-physical-validation` (E5) | M + externo | Placa V1 y V2 real: HEX, USB, ejecución sin cable, cada proyecto canónico | Acta con placa, firmware, navegador y resultado; la simulación no sustituye esta evidencia |

### F7 · Scratch importado

**Estado:** original de solo lectura con SHA-256, cobertura `gg-editable`/`vm-compatible`/`unsupported`, ejecución VM, copia editable solo con cobertura total, estado y siguiente acción junto a la importación [EVIDENCIA PREVIA]. Cobertura convertible muy baja por H3.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `scratch-import-corpus-metrics` | S | Corpus propio de ≥20 SB3 de principiante con licencia clara; informe de cobertura por proyecto y opcode como prueba de herramientas | Métrica publicada en cada puerta |
| `scratch-import-multisprite-copy` | M | Copia editable multi-sprite y con fondos tras F3; explicación por bloque no convertible («este bloque aún no existe en GG») | ≥50 % del corpus convertible; ≥80 % ejecutable; original intacto |

### F8 · 3D

**Estado:** Babylon aislado, seis tipos de entidad, siete operaciones, objetos iniciales editables por formulario, GLB validado, exportación autónoma JS/Python [EVIDENCIA PREVIA]; bloques con texto libre (H5, H6).

- **CoSpaces/Delightex (referencia del objetivo original):** biblioteca de objetos arrastrables, selección y *gizmos* en la escena, bloques con menús de objetos, eventos de clic y colisión, animaciones predefinidas, texto/bocadillos, cámara que sigue. **Workspace:** `3d-assets` aporta modelos GLB curados con licencia.
- **Decisión de alcance:** el piloto apunta a **N3 «lite»** (bloques tipados y eventos); el editor de escena completo queda para después del Exp. 1.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `capability-typed-blocks` | L | **Compartido por 3D y web; parte de los tipos y menús llega con la tabla de `block-language-contract`, este cambio aporta los bloques de valor:** menús de objetivos generados desde el estado inicial, campos numéricos/color/booleanos reales, bloques de valor (variable, evento, comparación, aritmética, unir) como `input_value`; IR1.1 con expresiones anidadas; migración de los campos `$var.`/`$event.` existentes | Ningún campo de texto libre para IDs, variables ni eventos; proyectos guardados migran con IDs |
| `scene3d-vocabulary-v2` | M–L | Por siempre, girar, mirar a, mostrar/ocultar, animar hacia (interpolación cerca del renderer), texto flotante, evento de colisión entre colisionables y temporizador | «Recolecta las esferas» y «Sistema solar» |
| `scene3d-object-library` | M | Biblioteca local de modelos de `3d-assets` (subconjunto con licencia compatible, en la cohorte) | Añadir un modelo sin red; atribución visible |
| *(posterior)* `scene3d-scene-editor` | L | Selección en la escena y gizmos mover/rotar/escalar mediante mensajes validados del origen 3D al shell; aplica al estado inicial, nunca al runtime | Sin ejecución al editar; seis orígenes intactos |

### F9 · Aplicaciones web

**Estado:** DOM nativo aislado, componentes iniciales por formulario, envío nativo, exportación autónoma [EVIDENCIA PREVIA]; texto libre en bloques (H5); sin persistencia (H7).

- **Code.org App Lab/Web Lab 2:** modo diseño con componentes arrastrables y propiedades, `onEvent(id, "click")`, almacenamiento de datos. HTML libre sigue fuera de alcance (protege seguridad y simplicidad; reevaluar si se valida el segmento de bachillerato).

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| *(compartido)* `capability-typed-blocks` | — | Ver F8 | — |
| `webapp-vocabulary-v2` | M–L | Componentes: título, párrafo, imagen (recurso local), casilla, selector, número; operaciones: leer valor numérico, quitar elemento, contar elementos; **almacenamiento local por proyecto** en el origen web (clave aislada, cuota) | «Lista de tareas persistente» y «Calculadora de propinas»; reabrir conserva datos de la app sin mezclarlos con la autoría |
| *(posterior)* `webapp-design-mode` | M | Ordenar componentes arrastrando en la vista de diseño, con equivalente por teclado | Sin ejecución al diseñar |

### F10 · Actividades y progresión

**Estado:** 3 actividades v2 (objetivo, predicción, pistas graduadas, reflexión, variante), tutorial por pasos tras el rework, progreso local separado de GGPROJ; checks binarios; sin CNB, unidades ni autoría (H11). Guion de observación E3 sin ejecutar.

- **Code.org Lab2:** `validations[]` ordenadas con mensaje por condición parcial y `next`; niveles de predicción; modelo framework → categoría → estándar ↔ lección; unidades y lecciones. **MakeCode:** tutoriales Markdown por pasos con pistas y bloques resaltados. Se adopta el **patrón**, con implementación y contenido propios.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `activities-schema-v3` | M | `validations[]` ordenadas con mensaje por condición parcial (1/3, 2/3, 3/3), condiciones desconocidas omitidas, nuevos checks para el vocabulario v2 (sprite tocó, variable en rango, bloque usado dentro de por siempre…), `context` de destino, `standards[]` opcional; lectores v1/v2 intactos | «Un juego de tres puntos» muestra feedback graduado sin cambiar sus checks v2 |
| `activity-units` | M | Unidad → actividades con «Continuar», progreso local extendido y exportable | Se retoma la siguiente actividad tras cerrar el navegador, sin red |
| `curriculum-cnb-catalog` | M + experto | `cnb.json` (área → competencia → indicador) como catálogo estático; vínculo desde actividades | Indicadores revisados por especialista curricular |
| Contenido (no es un cambio de código) | L + humano | Unidad 2D (8–10 actividades: secuencia, eventos, bucles, condicionales, variables, mensajes, clones, colisiones); unidad de transición a texto (3); micro:bit (4); 3D (2); web (2). Cada actividad con predicción, pistas, variante y revisión docente | Revisión docente registrada por actividad |
| *(posterior)* `teacher-activity-authoring` | M–L | Formulario que produce una actividad v3 validada y exportable como pack local (P1-10) | Un docente crea una variante sin editar código |

### F11 · Offline y distribución

**Estado:** cohortes de seis orígenes con hashes, segunda visita fría y rollback en Chromium/WSL [EVIDENCIA PREVIA]; 76 MB sin comprimir (Pyodide 13 MB); sin despliegue real HTTPS ni equipos escolares.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `deployment-six-origins` | M | Hosting estático con seis subdominios HTTPS, CSP y cabeceras por origen, guía reproducible | Exp. 2 pasos 1–3 aprobados con umbrales fijados antes |
| `offline-optional-cohorts` | M | Preparación por partes: núcleo 2D obligatorio; Python, 3D y micro:bit opcionales con tamaño visible; bytes **comprimidos** medidos | La preparación núcleo cabe en la ventana de conexión acordada |

Las bibliotecas de F4/F8 y CodeMirror (F5) entran en las cohortes; cada cambio que añada peso registra los bytes.

### F12 · Accesibilidad e idioma

**Estado:** roles, foco, teclado de Blockly, zoom 200/400 % y movimiento reducido automatizados [EVIDENCIA PREVIA]; sin lector de pantalla humano; cadenas fijadas en español dentro del código.

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `accessibility-human-review` | M + humano | Sesión con NVDA o lector equivalente y una persona usuaria experta; tema de alto contraste para Blockly (`@blockly/theme-highcontrast` u otro propio) | Acta humana; hallazgos críticos corregidos |
| `ui-strings-catalog` | M | Externalizar cadenas de la shell y de los bloques a un catálogo `es` sin cambiar el texto; habilita idiomas mayas si se decide (pregunta 5 de la evaluación) | Diff visual nulo; prueba de claves faltantes |

### F13 · Extensiones (packs)

**Estado:** packs declarativos con lock y hash, sin código remoto, SDK documentado (`docs/sdk/EXTENSIONS.md`) [EVIDENCIA PREVIA]. Versionado rígido (H10).

- **MakeCode/Xcratch:** extensiones de terceros por URL/GitHub. **Decisión vigente:** sin marketplace ni código remoto.
- **ADR-011:** el manifiesto `apiVersion: 2` convierte cada pack en una tabla de lenguaje (bloque, JS, Python, bajada a opcode VM / plantilla Static TypeScript / operación de capacidad). Un pack aporta todas sus vistas sin tocar el núcleo (`block-language-contract`).
- Tras `pack-versioning-and-migrations`, publicar una plantilla de pack y un ejemplo propio (p. ej. `gg.pen` con lápiz 2D, que la VM soporta) como validación del SDK.

### F14 · Docente y Sócrates

**Estado:** sin ciclo docente; Sócrates ND. **Code.org:** entrega, `review_state ∈ {keepWorking, completed}`, rúbricas de 4 niveles, secciones de imagen/palabra para niños pequeños (referencia para Sócrates).

| Cambio | Tamaño | Alcance | Aceptación |
|---|---|---|---|
| `delivery-package` | M | Paquete de entrega local (GGPROJ + `activityId@rev` + huella + hora), apertura con huella visible y sin ejecutar | Recorrido sin red ni datos personales en Code Studio |
| `socrates-contract-v0` (documento) | M + equipo Sócrates | Exp. 3: identidad delegada opaca, asignación, entrega, recibo, `review_state`, cola offline | Firmado con Sócrates; Code Studio sigue estático |

---

## 6. Secuencia por olas

Los tamaños son relativos; no se prometen fechas. Una ola termina con su puerta completa, revisión visual de los estados nuevos (`gg-ui-verification`) y acta de resultados.

```
Ola 0  Higiene ─────────────► Ola 1  Núcleo 2D + texto ─────► Ola 2  Aprendizaje + Exp. 1
  baseline/specs                multi-sprite                    schema v3, unidades
  pack-versioning               vocabulario 2D v2               contenido 2D/texto
  test-gate-scaling             contrato de lenguaje (API v3)   activity-first (rama 2)
                                vistas sincronizadas 2D, CM6    ▼
                                continuidad, biblioteca
                                                                Exp. 1 en aula
                     ┌──────────────────────────────────────────┘
                     ▼
Ola 3  Contextos de capacidad (pistas paralelas)        Ola 4  Distribución y acceso
  micro:bit v2 + radio + E5 físico                         despliegue + Exp. 2
  capability-typed-blocks → 3D v2, web v2                  cohortes opcionales
  Scratch import multi-sprite                              lector humano, cadenas
                                                         Ola 5  Docente y Sócrates
                                                           delivery-package, contrato v0, autoría
```

| Ola | Contenido | Dependencias | Salida |
|---|---|---|---|
| **0 · Higiene** | `repo-baseline-and-spec-consolidation`, `pack-versioning-and-migrations`, `test-gate-scaling` | Ninguna | Commit/tag; specs consolidadas; un pack `@0.2.0` abre proyectos `@0.1.0` |
| **1 · Núcleo 2D y texto** | `block-language-contract` → `scene2d-multi-sprite` → `scene2d-vocabulary-*` (ya como entradas de la tabla) → `synced-code-views` (2D JavaScript y Python); en paralelo `text-editor-codemirror`, `project-continuity-model`, `resources-starter-library`, `workspace-object-pane` | Ola 0 | Proyectos canónicos 2D y texto como E2E; F3 y F5 en N3 |
| **2 · Aprendizaje** | `activities-schema-v3`, `activity-units`, `activity-first-entry`, contenido 2D/texto, `curriculum-cnb-catalog`; **Exp. 1** (incluye modo sincronizado frente a copia independiente) | Ola 1; decisión D1; docente disponible | Exp. 1 ejecutado con umbrales previos; F1 y F10 en N3, 2D en N4 |
| **3 · Capacidades** | Pista A: micro:bit (`vocabulary`, `radio`, `ts-language-service`, E5). Pista B: `capability-typed-blocks` → `scene3d-vocabulary-v2`, `webapp-vocabulary-v2`, `scene3d-object-library`. Pista C: `scratch-import-*` | Ola 0 (versionado); Pista C tras Ola 1 | Proyectos canónicos de micro:bit, 3D, web y corpus Scratch |
| **4 · Distribución y acceso** | `deployment-six-origins`, `offline-optional-cohorts`, `accessibility-human-review`, `ui-strings-catalog`; **Exp. 2** | Puede empezar al cerrar Ola 1; equipos prestados (D2) | Promesa offline publicable; política de dispositivos |
| **5 · Docente y Sócrates** | `delivery-package`, `socrates-contract-v0`, `teacher-activity-authoring`, `resources-paint-editor`, `scene3d-scene-editor`, `webapp-design-mode` | Exp. 1; contrato con Sócrates; schema v3 | Exp. 3; alcance E6 decidido |

**Paralelismo:** la regla de un único escritor de la shell obliga a serializar los cambios de interfaz (multi-sprite, panel de objetos, CodeMirror, entrada por actividad). Contratos, adaptadores, generadores, packs de micro:bit y contenido sí avanzan en paralelo. Propuesta: una sesión coordinadora para la shell más hasta tres pistas (contratos/adaptadores, micro:bit, contenido con personas), cada una con archivos asignados y su propio `test:affected`.

**Primer paso recomendado:** Ola 0 completa. `pack-versioning-and-migrations` es lo único que bloquea técnicamente todas las demás olas; sin él, el primer bloque nuevo deja sin abrir los proyectos guardados.

---

## 7. Decisiones que necesito del usuario

| # | Decisión | Por qué bloquea | Valor por defecto si no se decide |
|---|---|---|---|
| D1 | **Segmento y grado del piloto** (p. ej. 4.º–6.º primaria o 1.º–3.º básico) | Profundidad del vocabulario, nivel lector del copy y del contenido de la Ola 2 | Contenido para 10–14 años con lectura acompañada |
| D2 | Equipos escolares y conectividad del piloto | Umbrales del Exp. 2 y alcance de Python/3D offline | Portátil de gama baja con Chromium; Python opcional |
| D3 | ¿Habrá uso comercial? | Limita inspirarse en materiales CC BY-NC-SA | Tratar como comercial: solo contenido propio |
| D4 | ¿Idiomas mayas? | Decide si `ui-strings-catalog` entra en la Ola 1 o la 4 | Ola 4, sin traducciones |
| D5 | Aprobar **multi-sprite** y GGPROJ v4 | Es el cambio de formato más grande desde F1 | Recomendado: sí |
| D6 | Aprobar **CodeMirror 6** como dependencia | Primera dependencia de UI nueva desde F0 | Recomendado: sí, con tamaño medido |
| D7 | 3D: ¿editor de escena tipo CoSpaces en el piloto o después? | Una L adicional en la Ola 3 | Después del Exp. 1 |
| D8 | ¿Archivar los 22 cambios OpenSpec completos? | Consolidar specs antes de abrir ~25 cambios nuevos | Recomendado: sí, conservando las actas |
| D9 | ~~¿Vistas sincronizadas bloques↔texto y API sin `GG`?~~ | — | **Resuelta el 24/10/2026: sí** (ADR-011) |

---

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Migraciones de pack/GGPROJ rompen proyectos de estudiantes | Fixtures de todas las versiones de GGPROJ y packs en cada puerta; migraciones puras y probadas en Node; apertura atómica ya existente |
| Supuestos de `hero` dispersos (formato, shell, actividades, generadores, inspector) | CodeGraph antes de `scene2d-multi-sprite`; inventario de usos; migración en un solo cambio |
| Equivalencia bloques/JS/Python con vocabulario mayor (coerción, aleatorio, división) | Reglas en ADR 004 ampliado; corpus de equivalencia por bloque; aleatorio con semilla en pruebas |
| La puerta completa crece con cada contexto | `test-gate-scaling` en Ola 0; affected por contexto |
| El contenido es el cuello de botella real (evaluación §1) | Pista de contenido desde la Ola 1; proyectos canónicos reutilizados como actividades; autoría docente en Ola 5 |
| Peso offline (bibliotecas, CodeMirror, modelos 3D) | Bytes comprimidos registrados por cambio; cohortes opcionales |
| Ampliar sin validar con personas | Exp. 1 al cerrar la Ola 2, antes de la Ola 3 completa; umbrales acordados antes |

---

## 9. Qué no se hará (con razón)

- Ejecución automática al editar, y conversión a bloques de código fuera del subconjunto bloqueable (ADR-011).
- Migrar a Code.org, copiar su contenido, Codebridge, su component-library o su tutor de IA (evaluación §9–§10).
- Montar scratch-gui completo o el editor PXT en la shell (ADR 001/003); solo se reutilizan motores y, si se justifica, scratch-paint aislado.
- HTML/CSS libre en apps web mientras el público sea principiante.
- Cuentas, backend o telemetría remota en Code Studio; la integración académica pertenece a Sócrates.
- Modo micro:bit en vivo (Firmata) e IA educativa hasta que exista necesidad validada (P2-14, P2-15).
