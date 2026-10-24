## Why
F1 requiere seleccionar e inspeccionar el objeto del corte 2D y construir desde toolbox todas las operaciones ya soportadas.
## What Changes
- Inspector de lectura con selector Escena/hero, estado inicial separado de última lectura de ejecución.
- Lecturas GG validadas y descartadas al cambiar sesión/revisión, sin polling.
- Toolbox completa del subconjunto existente (clon, disfraz, audio, globales).
## Capabilities
### New Capabilities
- `scene-inspection`: selección e inspección de lectura acotadas.
### Modified Capabilities
Ninguna; no se amplían operaciones GG ni IR.
## Impact
Modelo propio src, controlador shell/editor y pruebas. Conserva archivo, autoría y runner. Extracción de paquetes en cambio separado.
