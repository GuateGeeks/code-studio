# Design

## Context

- **Supuestos de sprite único:** unos 30 archivos los contienen (inventario del 24/10). Los centrales son `projectInitialScene`, `gg.sprites@0.1.0`, `program-contract.mjs` (`resourceOwnerId='hero'`), `scratch-project.mjs` (target `hero`), `browser-scene.mjs`, `gg-bindings.mjs`, `text-program.mjs`, la API v3 y el inspector.
- **Recursos:** ya tienen `ownerId` (`resources.mjs:99`).
- **Formato:** `pack-versioning-and-migrations` permite publicar `gg.sprites@0.3.0` con migración, sin dejar sin abrir los proyectos guardados. `0.2.0` ya existe (vocabulario E1, 29/10/2026): añade bloques de un sprite, estructuras de control del núcleo ofrecidas por su caja y `localPackCompatibility` (0.2.0 satisface dependencias de 0.1.0). `0.3.0` deberá declarar si satisface dependencias de 0.1.0/0.2.0 o publicar dependientes nuevos.

## Decisions

1. **Configuración en el pack, no en la raíz de GGPROJ.** `capabilities.config['gg.sprites']` pasa de `{initialScene}` a `{stage: {backdrop}, sprites: [...]}`. `authoring.blockly` se convierte en `authoring.scene2d: {stage: <workspace>, sprites: {<id>: <workspace>}}` en GGPROJ v6 (punto 12; el texto original decía v4, que ya existía con otro significado).
2. **Un workspace Blockly por objeto, montado bajo demanda.** Solo el objeto seleccionado tiene editor montado; los demás se guardan serializados. Se conserva un único editor (regla del único escritor).
3. **IR 2D v1.** Los scripts llevan `targetId`. El adaptador crea un target VM por sprite con sus disfraces y sonidos (`ownerId`). Los mensajes y las variables globales se comparten en el escenario (semántica Scratch).
4. **API v3 por objeto.** El vocabulario de sprite se convierte en métodos sobre el identificador de cada sprite. Los traductores reciben el mapa identificador → `targetId` en `runtime`, igual que `variableIds`.
5. **Migración 0.2.0 → 0.3.0** registrada en el catálogo (la cadena desde 0.1.0 pasa por 0.2.0, que no transforma bloques): `initialScene` se convierte en `sprites[0]` (id `hero`) y `authoring.blockly` en `scene2d.sprites.hero`, con los mismos IDs de bloques.

### Decisiones de E2 · paquete y migración (29/10/2026, tareas 1.1–1.2)

6. **Inventario.** CodeGraph (índice del checkout principal, solo lectura) y búsquedas de `'hero'`, `projectInitialScene`, `initialScene`, `sprites[0]`, `targets[1]` y `ownerId`: 35 archivos de `src/` nombran `hero`. Detalle por consumidor y tarea en `artifacts/stabilization-2d/e2-multisprite/inventory.md`. Resumen:
   - **Configuración (T2):** manifiestos `gg.sprites`, `resolveCapabilities(...).initialScene`, migraciones de packs.
   - **Formato (T3):** `projectInitialScene` y `scene` de GGPROJ v1/v2 (se mantienen), `authoring.blockly` único, `migrateProject`.
   - **IR y adaptador (T3/T4):** `program-contract` (`resourceOwnerId='hero'`), `scratch-project` (target `hero`), `browser-scene`, `gg-bindings`, `text-program`, `language-runtime`, `pack-broker` (`permissions.sprites = ['hero']`).
   - **Texto (T5):** `scene2DVocabularyFromTables`, `generated-program-source`, `api-v3`/`api-v3-python`/`api3-names` (`hero` reservado), `code-view-parser`, `code-views-feasibility`, motores QuickJS/Pyodide (objetivo `hero`), ejemplos y ayuda.
   - **Interfaz y actividades (T6/T7):** inspector y `scene-inspection` (`sprites[0]`, un sprite), recursos y biblioteca (`starterOwners`, dueño `hero`), menús de `gg.assets`, `lessons`/`lesson-evaluation` y su catálogo, botón de prueba `GG.sprite.move('hero')`.
   - **Sin cambio:** lectura de recursos legados (dueño por índice), menú fijo del bloque 0.1.0 y copia SB3 (contexto congelado; R5).
7. **`gg.sprites@0.3.0`.** Manifiesto `apiVersion: 2` con la misma tabla (`spriteLanguage02`), bloques, reglas, caja, recursos y permisos que 0.2.0 (prueba MS-001). Hash `6e403217…` (recalculado el 29/10/2026 en la ronda de corrección 1 al prohibir `__proto__`; antes `6237b1c5…`). Solo cambia la configuración: `{stage: {backdrop}, sprites: [{id, name, x, y, direction, size, visible, costume}]}`, con 1–8 sprites (`scene2DObjectLimits`). El esquema genérico del manifiesto valida forma y rangos: x ±240, y ±180, dirección ±180, tamaño 0–1000 (los límites de la IR). IDs, disfraces y fondo con la sintaxis de dueño de recursos (`resources.mjs`), sin `__proto__`, `prototype` ni `constructor`. Los IDs de sprite, además, sin `stage` (dueño del escenario). El validador instalado `scene2d-objects-v1` (`src/contracts/scene2d-objects.mjs`) añade lo que el esquema no expresa: IDs únicos, nombres únicos sin distinguir mayúsculas (de ellos saldrá el identificador textual, R3), sin espacios alrededor ni caracteres de control, ≤ 32 caracteres. Los disfraces y el fondo no se comprueban todavía contra los recursos del dueño. Hoy la escena inicial no se lee de la configuración, y un estudiante puede borrar un disfraz. Esa comprobación llegará con los menús por objeto (T7). `defaults` = escenario `stage` + `hero` en el estado de siempre.
8. **Migración 0.2.0 → 0.3.0.** Registro del catálogo con un campo nuevo, `config`, que nombra una transformación revisada e instalada (`packConfigMigrations` en `pack-migrations.mjs`). Un registro solo puede nombrar código instalado, como los validadores de configuración; un archivo nunca trae el suyo. `scene2d-objects-from-initial-scene-v1` es pura. Convierte `initialScene` en `sprites[0]` con el mismo ID (`hero`), nombre `hero`, el mismo estado y disfraz, y `visible: true`, que es como el adaptador siempre lo crea. El fondo es `stage`. Sin transformación de bloques: IDs, tipos, shadows y posiciones intactos. La cadena 0.1.0 → 0.2.0 → 0.3.0 la resuelve `findMigrationChain`; `migrateCapabilities` aplica la transformación paso a paso y valida contra la versión instalada. No se declara la inversa; «Revertir» restaura la instantánea. Alternativa descartada: una transformación declarativa genérica de configuración (mover/envolver campos). Un único caso no la justifica.
9. **Compatibilidad de dependencias.** `localPackCompatibility` añade `0.3.0` satisface `0.1.0`. `gg.score`, `gg.microbit`, `gg.assets@0.1.0` y `gg.sb3@0.2.0` dependen de 0.1.0 por el vocabulario, las operaciones y los recursos, que 0.3.0 conserva. Ninguno lee la configuración de `gg.sprites`. No se declara `0.2.0`, porque ningún paquete depende de esa versión. Alternativa descartada: publicar versiones nuevas de cuatro paquetes, uno de ellos congelado.
10. **0.3.0 es la última versión.** `latestPackVersions['gg.sprites'] = '0.3.0'` ya en esta tarea. Por R1, el proyecto inicial, «Crear mi primera escena», actividades y plantillas crean 0.3.0 con `sprites[0] = hero` sin otro cambio de código. Ejecutan igual porque ningún consumidor lee todavía la escena de la configuración: el adaptador crea `hero` como siempre. `resolveCapabilities(...).initialScene` se deriva de `sprites[0]` para los lectores de un solo sprite. Los archivos v1/v2 siguen en 0.1.0. «Actualizar packs» lleva 0.1.0/0.2.0 a 0.3.0 sin ejecutar. Hasta T4, una configuración 0.3.0 con más de un sprite (solo construible a mano, sin interfaz) valida, pero ejecuta solo `hero`. Su autoría por objeto la define T3: un GGPROJ v3 con 0.3.0 y `authoring.blockly` es la forma intermedia que T3 debe seguir leyendo. Pruebas: MS-001…006 (`tests/integration/scene2d-objects.test.mjs`). Ajustadas a la nueva verdad, sin debilitar: NP-001/002, GG-PACK-001/002, VOC-001/002/003, y en navegador NP-BROWSER-001, E1-01/E1-04/E1-05, inspector, persistencia, runtime de lenguajes, equivalencia textual y actividades (la escena del proyecto nuevo se comprueba en `sprites[0]`). Las pruebas E1 de Node fijan el perfil 0.2.0 exacto.
11. **Hash de 0.3.0 hasta integrar E2.** 0.3.0 no está publicado fuera de esta rama. T4/T5 pueden necesitar permisos por objeto (hoy `permissions.sprites = ['hero']`) y T8 añade «ir a objeto» y «fondo» a su tabla. Esas tareas pueden cambiar el manifiesto 0.3.0 y recalcular su hash antes de integrar la etapa. Desde la integración en main queda congelado como los demás. Por eso ninguna fixture guardada fija hoy el hash de 0.3.0: las pruebas lo obtienen del catálogo.

### Decisiones de E2 · formato e IR (29/10/2026, tareas 1.3–1.4)

12. **GGPROJ v6, no v5.** `authoring.scene2d` estrena la versión 6, en lugar de ampliar v5 bajo la capacidad 0.3.0. Razones:
    - **Política del repositorio.** Cada campo nuevo de autoría estrena versión y se escribe solo cuando hace falta. v4 llegó con `runtime.api` y v5 con `codeViews`. Hoy cada versión describe por sí sola qué propiedades tiene `authoring`.
    - **Lectores anteriores.** Comparan las propiedades exactas antes que los packs. Un v5 con `scene2d` en una versión anterior de Code Studio fallaría con «propiedades ausentes o no permitidas». Un v6 se explica: «GGPROJ v6 es de una versión más reciente de Code Studio».
    - **Alternativa descartada: v5 + capacidad.** Haría que la forma de v5 dependiera de la versión de un pack. El lector tendría que validar los packs para saber qué propiedades esperar.

    Forma de v6: `authoring = {scene2d, deviceSource, textDocuments, selectedTextDocumentId}`, más `codeViews` solo si hay vistas. Lleva capacidades obligatorias y no tiene `scene` ni `authoring.blockly`. Exige `gg.sprites` con objetos 2D (0.3.0). Las claves de `scene2d.sprites` son exactamente los IDs de `config['gg.sprites'].sprites`, y cada workspace (escenario incluido) tiene el límite de siempre (64 KiB, solo `blocks`/`variables`). El lector valida la sintaxis de cada clave antes de usarla: `isScene2DSpriteId` (`scene2d-objects.mjs`), compartida con la IR. `jsonTree` ya rechaza `__proto__`, `prototype` y `constructor` en cualquier nivel. Un workspace vacío es `{}`, que es lo que guarda Blockly. v1–v5 no cambian, y un v1–v5 con `scene2d` sigue rechazándose por propiedades.

    Escritura (`createProject`):
    - Con 0.3.0, siempre v6. `blockly` es el workspace del editor único, el del primer sprite (el mismo que `resolveCapabilities().initialScene`), y `scene2d` lleva todos los objetos.
    - Si el perfil tiene varios sprites y solo llega `blockly`, falla nombrando los que faltan. Nunca se descartan scripts en silencio.
    - Salir de 0.3.0 (perfil sin objetos) vuelve a un solo workspace solo si el escenario está vacío y ningún otro sprite tiene scripts. Si no, falla («descartaría los scripts de otros objetos»).

    Lectura auxiliar: `projectBlocklyWorkspace(document)`.
13. **Migración de la autoría.**
    - **«Actualizar packs».** `migrateProject` llega a 0.3.0 y mueve `authoring.blockly` a `scene2d.sprites.hero` como v6, con los mismos IDs, shadows y posiciones. El escenario y el resto de sprites empiezan vacíos. El resumen, el texto, las vistas y los recursos no cambian. Las transformaciones de bloques de migraciones futuras se aplican a cada workspace de `scene2d`.
    - **Promoción de v1/v2.** `upgradeProject` a 0.3.0 da la misma forma.
    - **Forma intermedia (T2).** Un GGPROJ v3–v5 con 0.3.0 y `authoring.blockly` se sigue abriendo sin cambios: abrir no migra. Su workspace es el del primer sprite (`scene2DAuthoringFromBlockly`, pura) y se guarda como v6 en el siguiente guardado.
    - **Coordinador de autoría.** Hasta el editor por objeto (3.1), `project-authoring` guarda serializados el escenario y los demás sprites, y monta en el editor único el workspace del primer sprite. `capture()` devuelve `scene2d` con ese workspace actualizado, y los puntos de restauración incluyen los objetos.

    Pruebas MS-007…012 (`tests/integration/scene2d-authoring.test.mjs`). Ajustadas a la nueva verdad (los proyectos nuevos son v6), sin debilitar:
    - **Node:** NP-002, GG-PACK-002, GG-COMPAT-004/005/006 y GGPROJ5. Las comprobaciones de v3/v4/v5 fijan `gg.sprites@0.2.0` y añaden su variante v6.
    - **Navegador:** new-project-capabilities, packs-lessons, textual-equivalence, capability-contexts, integrated-microbit-workspace, resource-safety y language-copies. En la partición 0: device-integration, scene-inspector, offline-recovery, code-console, language-runtime y project-persistence.
14. **IR 2D v1.**
    - **Forma.** `{version: 1, sprites: [<id>…], variables?, scripts: [{targetId, event, sourceBlockId, body, …}]}`. `targetId` es un sprite de `sprites` (1–8, IDs únicos con la sintaxis de objeto) o `stage`.
    - **Límites por objeto (`scene2DProgramLimits`).** Los de IR0: 16 scripts, 300 nodos, profundidad 8 y 16 variables locales. El escenario guarda las globales, hasta 16. El tamaño total es nueve presupuestos IR0.
    - **Variables.** Una global es `scope: 'global'` sin dueño. Una local lleva `targetId` de su sprite. Usar una local desde otro objeto, el escenario incluido, se rechaza.
    - **Escenario.** Como en Scratch, no se mueve, no habla, no cambia de tamaño ni se clona: solo control, variables, sonido, mensajes y detener, con los eventos inicio, tecla, clic y mensaje. Sus fondos llegarán con sus bloques (3.2).
    - **Recursos.** Disfraces y sonidos se comprueban contra el dueño de cada script. Sin vista de recursos, solo `hero` tiene los integrados.
    - **IDs de bloque.** `sourceBlockId` es único en todo el programa, no por objeto. Es la opción más estricta y se puede relajar más tarde sin romper nada. Duplicar un sprite (3.1) deberá generar IDs nuevos, como Scratch.
    - **Errores.** Llevan `sourceBlockId` y, en v1, `targetId`.
    - **Activación explícita (ronda de corrección 1, 29/10/2026).** `validateProgram` solo acepta la v1 con `{objects: true}`. Por defecto sigue aceptando solo `version: 0`, así que los consumidores que solo entienden IR0 la rechazan: el adaptador Scratch y con él la frontera del simulador (`browser-scene` → `toScratchProject`), el broker, los generadores, `code-view-identity` y el export SB3. Sin esto, `toScratchProject` metía en `hero`, sin aviso, los scripts del escenario y de otros sprites. T4/T5 activarán la v1 donde la soporten. Prueba MS-016.
    - **IR0.** Queda intacta para 0.1.0/0.2.0 y para el adaptador actual. `programObjectsFromIR0` la eleva a v1 con todo en `hero`, sin cambiar nodos, IDs ni orden.
    - **Lock.** El de motores (`ir: 0`) no cambia: la IR no se guarda en GGPROJ. Subirlo (con el adaptador) queda para T4, cuando el adaptador consuma v1.

    Pruebas MS-013…015.

## Risks / Trade-offs

- [Supuestos de `hero` dispersos] → CodeGraph e inventario antes de tocar; una búsqueda de `'hero'` literal como prueba de herramientas al cerrar.
- [Rendimiento con 8 sprites en equipos lentos] → medir en el Exp. 2; límite configurable.
- [Actividades atadas a `hero`] → los checks ganan `targetId` opcional (por defecto `hero`) en el esquema de actividades.

## Migration Plan

Pack 0.3.0 y migración → IR v1 y adaptador → editor por objeto y panel → API v3 por objeto → inspector, actividades y copia Scratch. Proyectos canónicos «Diálogo» como fixture. Cada paso, con `test:affected`; al final, una puerta completa.

## Open Questions

- ¿Biblioteca de sprites en este cambio o en `resources-starter-library`? Propuesta: en su propio cambio; aquí se añaden sprites duplicando o con los recursos del proyecto.
