## Why
El camino productivo F1 aún depende de experimentos en spikes. Las fronteras probadas necesitan fuentes propias y reglas de dependencia antes de ampliar F2.
## What Changes
- Extraer contratos, editor, adaptador Scratch, shell/coordinación y target micro:bit a src con imports propios.
- Mantener URLs/orígenes y compatibilidad de imports experimentales mediante wrappers cuando sea necesario.
- Actualizar build incremental, selección de pruebas y comprobación de fronteras.
## Capabilities
### New Capabilities
- `production-boundaries`: propiedad de fuentes y dependencias F1.
### Modified Capabilities
Ninguna; semántica IR/GG/GGPROJ permanece.
## Impact
Movimientos propios sin cambios en motores/upstreams ni CSP. Pruebas originales se conservan y la regresión completa valida equivalencia.
