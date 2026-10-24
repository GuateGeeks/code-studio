# ADR010 · Accesibilidad y fuente correspondiente

Estado: aceptado para la implementación; evidencia de consolidación en docs/phase-7/RESULTS.md.

El producto integrado adopta AGPL-3.0-only y conserva las licencias de cada dependencia y medio. Cada release local ofrece LICENSE, THIRD_PARTY_NOTICES.txt, SBOM.json, source.tar.gz y source-manifest.json. El SBOM declara su alcance conservador de paquetes instalados, incluidos herramientas/desarrollo.

El paquete de fuentes usa una lista cerrada y metadatos deterministas. Se comprueban hashes, rutas y cuotas antes de restaurarlo a un destino nuevo. Los parches previos upstream y los insumos PXT precompilados tienen procedencia y hashes. No se afirma un rebuild nativo C++/WASM completo. La reproducción compara dos árboles extraídos con la misma toolchain, dependencias fijadas y seis orígenes; cualquier dependencia instalada reutilizada se declara.

El archivo fuente se identifica mediante manifiesto externo para evitar autorreferencia. Los seis materiales pertenecen al shell/cohort autenticado y se conservan una sola vez en las exportaciones autónomas. El servidor local permite únicamente los archivos declarados y no ejecuta código extraído. No se amplía CSP.

La accesibilidad usa teclado nativo de Blockly, enlaces de salto, conservación de foco/caret y controles semánticos locales al runner. La activación de objetos mantiene hats nativos, identidad de clon y revocación de sesión. Tab/Escape y atajos del navegador no se consumen como teclas del programa. El zoom de navegador se verifica mediante una extensión de prueba propia en un perfil temporal; la extensión no forma parte del runtime del producto.

Las pruebas automatizadas no sustituyen una revisión humana con tecnologías de asistencia, un piloto escolar ni una placa física. Esas aceptaciones se mantienen pendientes en la matriz pública.
