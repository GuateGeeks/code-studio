## Why
Los fundamentos F2 ejecutan JS/Python reales y conservan documentos, pero aún no permiten copiar el corpus 2D con eventos, mensajes, clones, globales, disfraces y audio. La transición requiere fuente independiente y una semántica observable común.
## What Changes
- Generadores JS/Python desde IR0 validada, source maps y creación explícita de documentos independientes.
- Hats proxy nativos de la VM que invocan callbacks del intérprete con contexto propio, sin ejecutar cuerpos Blockly a la vez.
- Operaciones contextuales atómicas para variables/expresiones, clones, mensajes con espera, disfraces y sonido.
- Recursos/configuración de la copia declarados en su fuente; vínculos por línea y Stop conservados.
- Corpus comparado por backend, incluyendo orden parcial, render y audio reales.
## Impact
Código propio src, contratos y adapters; no cambiar motores upstream ni CSP. GGPROJ2 conserva fuentes sin otra fuente de verdad. F3–F7 y evidencia física/escolar siguen su secuencia.
