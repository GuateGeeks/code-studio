## Why
F1 está consolidada. La transición textual necesita documentos independientes persistentes y runtimes reales aislados antes de ampliar capacidades y equivalencia completa.
## What Changes
- GGPROJ v2 opcional para documentos JavaScript/Python, conservando lectura/exportación v1 sin documentos.
- Nuevo origen textual con iframe anfitrión y workers QuickJS/Pyodide locales por ejecución.
- Preflight de sintaxis/runtime antes de sustituir escena; puente GG enumerado al mismo adaptador VM.
- Editor textual, mensajes por línea y Stop común.
## Capabilities
### New Capabilities
- `text-language-foundations`: documentos y ejecución textual inicial.
### Modified Capabilities
Ninguna archivada; se amplía de forma explícita formato/diagnósticos sin redefinir las entregas históricas.
## Impact
Dependencias propias fijadas, nuevo rol/origen estático, modelo v2, UI y pruebas. No modifica motores upstream ni CSP del shell/runner2D. No declara cerrada toda F2: eventos/clones/audio y copia completa del corpus van en corte posterior.
