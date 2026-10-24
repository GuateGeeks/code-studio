## ADDED Requirements
### Requirement: GG-ASSET-001 Versioned reviewed resource policy
Studio MUST admitir recursos propios mediante una política local instalada seleccionada por pack, conservando GGPROJ1/2 y GGPROJ3 sin política con sus catálogos/locks exactos. Los recursos MUST tener IDs SHA256, integridad, formatos y referencias validadas; el archivo MUST NOT aportar código ni validadores.
#### Scenario: Unknown resource policy
- **WHEN** se abre un proyecto con política, formato, hash o referencia no soportados
- **THEN** se rechaza antes del commit y conserva el proyecto y ejecución activos
### Requirement: GG-ASSET-002 Single authoring store and transactions
Studio MUST mantener un único almacén mutable de recursos e incorporarlo al prepare/commit/checkpoint de autoría. Ediciones MUST producir nuevos bytes/IDs y actualizar referencias de forma atómica; los recursos derivados MUST NOT reemplazar el original SB3.
#### Scenario: Failed participant after resource preparation
- **WHEN** falla un commit de editor o recurso
- **THEN** se restauran recursos, bloques, textos, dispositivo, identidad y borradores anteriores
### Requirement: GG-SB3-001 Bounded inert intake
Studio MUST validar inventario, rutas, cabeceras, rangos, CRC y salida real de descompresión antes de interpretar SB3. MUST limitar bytes/entradas/tiempo y permitir cancelar; MUST rechazar traversal, duplicados, cifrado, enlaces, solapamientos y ZIP64. El GGPROJ MUST continuar ZIP STORE.
#### Scenario: Lying compressed sizes
- **WHEN** un DEFLATE expande más que su cuota declarada o permitida
- **THEN** se termina el procesamiento aislado y el proyecto activo permanece intacto
### Requirement: GG-SB3-002 Complete explicit coverage
Studio MUST declarar cobertura por target, ID de bloque, opcode y extensión, incluyendo bloques sueltos y monitores. Los estados MUST distinguir gg-editable, vm-compatible y unsupported. Cualquier función desconocida MUST bloquear toda ejecución y conservar el SB3 original byte a byte como recurso inerte descargable.
#### Scenario: Unknown extension in orphan block
- **WHEN** un bloque suelto contiene un opcode de extensión aunque metadata omita extensions
- **THEN** no se carga ni ejecuta código externo y la consola/cobertura identifica la incompatibilidad
### Requirement: GG-SB3-003 Reviewed canonical VM execution
La compatibilidad MUST reconstruir una proyección canónica desde datos revisados y preparar VM/recursos inactivos antes de publicar. MUST conservar el scheduler nativo y aplicar límites de targets, bloques, hilos, clones, listas, strings y datos. MUST rechazar warp, cloud, hardware, cámara/micrófono y extensiones inicialmente.
#### Scenario: Runtime limit and Stop
- **WHEN** un proyecto revisado intenta exceder el límite dinámico o el usuario pulsa Stop
- **THEN** se cancelan scripts/audio de esa sesión, se publica un diagnóstico limitado con referencia cuando existe y no se ejecutan continuaciones antiguas
### Requirement: GG-SB3-004 Exact editable translation and export
Studio MUST ofrecer traducción editable solo si toda la autoría seleccionada está cubierta por la IR GG validada. MUST exportar SB3 únicamente desde autoría inicial validada en la intersección declarada, nunca desde estado mutable de VM; descargar original MUST ser una acción separada.
#### Scenario: Run then export
- **WHEN** se ejecuta un proyecto, cambian variables/clones/posición y después se exporta
- **THEN** el SB3 exportado conserva los valores de autoría iniciales y los formatos/operaciones no cubiertos producen error explícito
### Requirement: GG-ASSET-003 Safe media and real editing
Studio MUST validar un subconjunto SVG pasivo cerrado, PNG con límites de estructura/decodificación/píxeles y WAV PCM16 con límites de canales/frecuencia/duración. MUST rechazar contenido activo/referencias remotas. MUST ofrecer importación/reemplazo, nombre/centro de disfraz, recorte PNG y recorte/ganancia WAV verificables.
#### Scenario: Media edit fails
- **WHEN** un SVG contiene script o un recorte no es válido
- **THEN** no cambia el recurso anterior, sus referencias ni el proyecto durable
### Requirement: GG-SB3-005 Public twenty project corpus
Studio MUST publicar una matriz de veinte proyectos propios o redistribuibles, con procedencia, hashes, cobertura y resultado de ejecución/roundtrip. MUST incluir eventos, variables, bucles, mensajes con espera, clones, dos sprites, listas/coerciones, sonido/Stop, PNG/SVG, efectos y funciones/extensiones bloqueadas.
#### Scenario: Corpus consolidation
- **WHEN** se consolida F5
- **THEN** los reportes distinguen casos editables/compatibles/bloqueados, comparan comportamiento declarado y demuestran preservar/descargar originales y guardar/reabrir
### Requirement: GG-ASSET-004 Scoped UI and prepared offline
La interfaz MUST usar controles accesibles desktop/móvil, límites y errores por origen; importaciones tardías MUST NOT sustituir autoría editada entretanto. Los procesadores y decodificadores MUST ser locales y formar parte del inventario offline revisado sin relajar CSP.
#### Scenario: Edit during import
- **WHEN** termina una preparación después de una edición o cancelación
- **THEN** se descarta ese candidato y no cambia autoría, selección ni ejecución actuales
