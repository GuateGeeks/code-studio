# Fuente y reconstrucción de la release

La distribución contiene source.tar.gz y un manifiesto externo que identifica
cada archivo interior por SHA-256. El manifiesto no se incluye en el tar para
evitar una referencia circular. La fuente se extrae con la herramienta propia:

    node tools/release/restore.mjs source.tar.gz source-manifest.json NUEVO_DIRECTORIO

El destino debe ser nuevo. La herramienta comprueba hash, cuotas, inventario,
rutas, cabeceras y bytes antes de escribir. No ejecuta código extraído.

La extracción contiene workspace/guategeeks-code-studio y los repositorios
hermanos necesarios. workspace/scripts/env.sh conserva la disposición del
entorno original; usar Node 22.23.4 y npm 10.9.9. Node no está incluido.
No contiene credenciales, .git, node_modules, perfiles, cachés ni proyectos
personales. workspace/.tools/pxt-core-source incluye únicamente código,
configuración, licencias y recetas seleccionados; no el archivo upstream
completo ni documentación/índices de CodeGraph.

Instalar dependencias en los tres repositorios con sus package-lock.json,
mediante npm ci --ignore-scripts --no-audit --no-fund. Esta preparación requiere
acceso a los tarballs fijados por integridad en los locks. Una prueba que use
dependencias ya instaladas mediante symlinks debe declararlo expresamente;
no constituye una instalación desconectada desde cero.

Desde xcratch-scratch-editor, preparar los módulos Scratch con:

    npm exec --workspace=@scratch/scratch-svg-renderer -- webpack --mode development
    npm exec --workspace=@scratch/scratch-render -- webpack --mode development

No usar tools/f0/prepare.sh en la extracción: su captura histórica de línea base
requiere los repositorios Git originales. Desde guategeeks-code-studio,
npm run browser:build genera las seis superficies.
npm run browser:serve crea el snapshot de release para los orígenes elegidos.
Para comparar dos raíces deben coincidir toolchain, versiones, dependencias,
precompilados y los seis orígenes. Comparar payloads y cohort; los reportes
de tiempo, caché y rutas de diagnóstico no son payloads reproducibles.

Los precompilados PXT necesarios están conservados con hashes:
- pxt-microbit/built: target, compiler, simuladores y cuatro cachés HEX;
- prebuilt/pxt-core y prebuilt/lzma: bytes de los paquetes npm originales.

Los paquetes npm PXT/LZMA instalados deben coincidir con esos bytes; no se
parchea node_modules durante la reconstrucción. release/source-lock.json
fija repositorios, revisión, árbol seleccionado, parche previo e insumos
precompilados. El archivo original PXT Core tiene URL/SHA allí registrados;
sus 212 MB no se duplican en el paquete. El código seleccionado se distribuye
en su lugar. Conservar el parche de micro:bit previo a Studio; no limpiar
los repositorios para hacer pasar una comprobación.

No se afirma reconstrucción nativa C++ desde cero: no se ha fijado ni
demostrado la cadena DAL/CODAL con imágenes Docker por digest. Los HEX se
distribuyen como precompilados verificados para las combinaciones declaradas.
Tampoco se afirma reconstrucción desde C de QuickJS/Pyodide: npm aporta
WASM/precompilados fijados. Sus fuentes de wrapper disponibles en mapas y
los avisos originales se conservan; los orígenes upstream se documentan.

Las licencias permanecen por componente. THIRD_PARTY_NOTICES.txt incluye
textos de runtimes y sus medios. SBOM.json es conservador e incluye paquetes
instalados de desarrollo/herramientas: no representa exactamente el conjunto
de módulos ejecutados en el navegador. El archivo fuente no confiere permisos
para descargar extensiones arbitrarias ni convierte código de alumnos en
código del producto.

Fuentes externas fijadas de los motores WASM (no se incluye aquí su código C
completo y no se afirma reconstrucción WASM desde cero):
- Pyodide 314.0.7:
  https://github.com/pyodide/pyodide/tree/b1e4fcc2488962f6360a97f19b9982d6fdb5d16f
- QuickJS Emscripten 0.32.0:
  https://github.com/justjake/quickjs-emscripten/tree/df4efb9ef2cb25c417ecb57986da462d11b244ed
Revisiones obtenidas de gitHead en los metadatos npm de esas versiones exactas.
Los mapas de fuentes publicados aportan los wrappers TypeScript conservados.

Los avisos transitivos usan un cierre conservador de dependencias declaradas
de los runtimes, con excepciones revisadas para el compilador PXT precompilado
y loaders exclusivos de webpack. No es un inventario exacto de módulos webpack.
Si un paquete sólo publica una declaración de licencia en README/package.json,
se conservan esos originales y se indica expresamente; no se inventa el texto
ni una variante SPDX. microee 0.0.6 declara "BSD" sin texto separado ni variante;
audio-context 1.0.3 declara MIT en README. La publicación externa requiere
mantener visible esa limitación de procedencia, no anunciar una auditoría legal.

## Preparación desde fuentes públicas

`tools/workspace/bootstrap.sh` reconstruye el mismo workspace sin el paquete
source.tar.gz: Node fijado, Xcratch y pxt-microbit en sus revisiones, el parche
previo, `release/locks/pxt-microbit.package-lock.json` (pxt-microbit no publica
lockfile), los módulos Scratch, el target con `pxt serve` y el archivo original
de PXT Core. Comprobado el 25/10/2026: en un workspace vacío, los doce
precompilados coinciden byte a byte con el lock. `pxt buildtarget` no sirve
para esto: genera URLs de CDN distintas.

El árbol de micro:bit excluye `libs/*/built`. Son salidas de `pxt serve` que el
build no usa, y sus `debug/binary.js` cambian entre ejecuciones porque dependen
de un contador global del compilador. Por eso `treeSha256` de micro:bit cambió
a `6e60cb16…` sin que cambiara ninguna fuente.
