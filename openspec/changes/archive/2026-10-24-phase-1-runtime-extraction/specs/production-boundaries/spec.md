## ADDED Requirements
### Requirement: GG-BOUNDARY-001 Owned production source
Studio MUST construir el camino productivo F1 desde src sin imports src hacia spikes. Wrappers experimentales MAY delegar a src para compatibilidad.
#### Scenario: Build and run
- **WHEN** se construye Studio desde fuentes propias
- **THEN** Blockly/IR/runner/PXT/persistencia mantienen comportamiento y orígenes anteriores
### Requirement: GG-BOUNDARY-002 Isolated internals
Studio MUST comprobar que contratos/modelos no importen Blockly/VM/PXT/DOM y que shell no importe internals de motores. Solo adaptadores autorizados conocen esos internals.
#### Scenario: Forbidden dependency
- **WHEN** se introduce import prohibido en una frontera propia
- **THEN** la comprobación falla con ruta y motivo
### Requirement: GG-BOUNDARY-003 Incremental preservation
Studio MUST conservar build incremental por contenido y cobertura conservadora de fuentes movidas, además de los cambios previos upstream.
#### Scenario: No-op and changed entry
- **WHEN** se repite build sin cambios o cambia solo un módulo propio
- **THEN** se reutilizan salidas válidas y se invalidan las etapas dependientes, sin reconstrucción forzada habitual
