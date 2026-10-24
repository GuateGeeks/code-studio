# Resultados: API v3 legible para 2D (block-language-contract, fase 1)

24 de octubre de 2026, Guatemala. Primera fase del cambio OpenSpec `block-language-contract` ([ADR-011](../adr/011-contrato-de-lenguaje-y-vistas-sincronizadas.md)). El cambio sigue abierto: faltan la tabla de lenguaje en los packs (sección 3) y la API v3 para 3D/web (2.1b).

## Qué ve ahora el estudiante

La lectura derivada y las copias de 2D usan la API v3, sin `GG`, `ctx`, `await` ni nombres generados:

```js
let score = 0;

onStart(() => {
  score = 0;
  for (let i = 0; i < 3; i++) {
    score += 1;
    if (score < 2) {
      hero.move(4);
    } else {
      hero.move(7);
    }
  }
});
```

```python
score = 0

@on_start
def al_iniciar():
    global score
    score = 0
    for i in range(3):
        score += 1
```

## Cómo funciona

- **Traducción en el origen del lenguaje** (decisión de la tarea 1.2):
  - JavaScript: `src/targets/text/api-v3.mjs`, con acorn y ediciones en la misma línea.
  - Python: `src/targets/text/api-v3-python.mjs`, con `ast` en Pyodide, compilando el árbol transformado.
  - Ambos traducen la API v3 a la API1 existente antes de ejecutar, así que sesión, Stop, variables atómicas y límites no cambian.
  - No hay dependencias nuevas.
  - El vocabulario (`api-v3-vocabulary.mjs`) no tiene dependencias, porque el worker de Python se sirve sin empaquetar.
- **Generador:** `generateApi3ProgramSource` produce el código legible desde la IR 2D.
- **Nombres de variables:** se derivan de forma determinista y válida en ambos lenguajes (`api3Identifier`).
- **Metadatos de la copia:** las copias declaran `runtime.api: 'api3'` y llevan `runtime.variableIds` (identificador → ID estable). El texto nunca contiene los IDs.
- **Formato:** el proyecto se guarda como GGPROJ v4 cuando una copia declara su API. v4 admite la forma v3 (con capacidades) y la forma v2 (sin capacidades).
- **Compatibilidad:** las copias API1/API2 existentes no se traducen y siguen funcionando. El código que nombra `GG` directamente pasa sin cambios.
- **Errores:** se explican en español con su línea. Por ejemplo, «Las acciones del programa van dentro de un evento…», «hero no tiene la acción fly» o «Usa puntos directamente en una acción…».

## Pruebas

- **`tests/integration/api-v3.test.mjs`, 7 pruebas:**
  - lectura sin `GG`, `ctx`, `await` ni `gg_` en todo el corpus;
  - **equivalencia exacta con API1** (configuración, manejadores y secuencia de llamadas) en todo el corpus, para JavaScript (QuickJS) y Python (Pyodide);
  - errores con línea en ambos lenguajes;
  - metadatos de copia;
  - programa de la actividad de puntuación (variable del pack).
- **Otras:** `GG-COMPAT-007` (proyecto sin capacidades con copia v3) y `tests/tools/python-worker-imports.test.mjs` (el worker Python solo alcanza imports relativos).
- **E2E actualizadas** a la API v3 sin relajar aserciones: `textual-equivalence`, `textual-corpus`, `educational-activities` y `packs-lessons`, que ahora espera GGPROJ v4 con `runtime.api`.
- **Primera puerta en serie:** 27 fallos, todos causados por esta fase y corregidos:
  - el worker de Python importaba `acorn`;
  - un proyecto sin capacidades no podía guardar una copia v3;
  - quedaban aserciones del texto API1.

  Foco posterior: 60/60.
- Puerta final: **aprobada** el 24/10/2026, 22:56:57Z–23:24:58Z (`node tools/test/run.mjs full --partitions 2`, `artifacts/test-gate/full-p2-3.log`): 415 Node, 73 herramientas, 3 smoke y **200 E2E** (p0 85 en 21,3 min + p1 115 en 24,1 min), OpenSpec estricto 35/35 y tres upstreams preservados. Fuentes estables; la referencia de impacto avanzó. Antes, tres corridas completas cayeron cada una en una sola prueba distinta por tiempo agotado bajo carga externa: `GG-OFFLINE`, `GG-SB3-005` y `GG-ASSET-003`. La última aprobó con otras sesiones de Claude en pausa.

## Límites

- 3D y web siguen mostrando API2; la API v3 para esos contextos es la tarea 2.1b.
- Las acciones solo se admiten dentro de eventos; en funciones propias se rechazan con su línea hasta que existan «Mis bloques».
- La tabla de lenguaje en los manifiestos de los packs (extensibilidad) aún no existe; el vocabulario v3 vive en un módulo propio.
