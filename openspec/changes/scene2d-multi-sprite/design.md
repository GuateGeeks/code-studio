# Design

## Context

- **Supuestos de sprite único:** unos 30 archivos los contienen (inventario del 24/10). Los centrales son `projectInitialScene`, `gg.sprites@0.1.0`, `program-contract.mjs` (`resourceOwnerId='hero'`), `scratch-project.mjs` (target `hero`), `browser-scene.mjs`, `gg-bindings.mjs`, `text-program.mjs`, la API v3 y el inspector.
- **Recursos:** ya tienen `ownerId` (`resources.mjs:99`).
- **Formato:** `pack-versioning-and-migrations` permite publicar `gg.sprites@0.3.0` con migración, sin dejar sin abrir los proyectos guardados. `0.2.0` ya existe (vocabulario E1, 29/10/2026): añade bloques de un sprite, estructuras de control del núcleo ofrecidas por su caja y `localPackCompatibility` (0.2.0 satisface dependencias de 0.1.0). `0.3.0` deberá declarar si satisface dependencias de 0.1.0/0.2.0 o publicar dependientes nuevos.

## Decisions

1. **Configuración en el pack, no en la raíz de GGPROJ.** `capabilities.config['gg.sprites']` pasa de `{initialScene}` a `{stage: {backdrop}, sprites: [...]}`. `authoring.blockly` se convierte en `authoring.scene2d: {stage: <workspace>, sprites: {<id>: <workspace>}}` dentro de GGPROJ v4.
2. **Un workspace Blockly por objeto, montado bajo demanda.** Solo el objeto seleccionado tiene editor montado; los demás se guardan serializados. Se conserva un único editor (regla del único escritor).
3. **IR 2D v1.** Los scripts llevan `targetId`. El adaptador crea un target VM por sprite con sus disfraces y sonidos (`ownerId`). Los mensajes y las variables globales se comparten en el escenario (semántica Scratch).
4. **API v3 por objeto.** El vocabulario de sprite se convierte en métodos sobre el identificador de cada sprite. Los traductores reciben el mapa identificador → `targetId` en `runtime`, igual que `variableIds`.
5. **Migración 0.2.0 → 0.3.0** registrada en el catálogo (la cadena desde 0.1.0 pasa por 0.2.0, que no transforma bloques): `initialScene` se convierte en `sprites[0]` (id `hero`) y `authoring.blockly` en `scene2d.sprites.hero`, con los mismos IDs de bloques.

## Risks / Trade-offs

- [Supuestos de `hero` dispersos] → CodeGraph e inventario antes de tocar; una búsqueda de `'hero'` literal como prueba de herramientas al cerrar.
- [Rendimiento con 8 sprites en equipos lentos] → medir en el Exp. 2; límite configurable.
- [Actividades atadas a `hero`] → los checks ganan `targetId` opcional (por defecto `hero`) en el esquema de actividades.

## Migration Plan

Pack 0.3.0 y migración → IR v1 y adaptador → editor por objeto y panel → API v3 por objeto → inspector, actividades y copia Scratch. Proyectos canónicos «Diálogo» como fixture. Cada paso, con `test:affected`; al final, una puerta completa.

## Open Questions

- ¿Biblioteca de sprites en este cambio o en `resources-starter-library`? Propuesta: en su propio cambio; aquí se añaden sprites duplicando o con los recursos del proyecto.
