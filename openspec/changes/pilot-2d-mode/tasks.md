# Tasks

- [x] 1.1 Contrato `deployment-profile` (validación cerrada) y release: `contexts` en `config.json` y en la cohorte solo cuando se declara; `GG_CONTEXTS` en el servidor local y `npm run serve:pilot`.
- [x] 1.2 Selector y navegación limitados al perfil; aviso de autoría oculta conservada.
- [ ] 1.3 Pruebas: herramientas de la release (cohorte por defecto idéntica), Node del contrato y E2E con servidor propio (selector, aviso, conservación al descargar y reabrir, sin ejecución). `test:affected` y la full de E0.

Evidencia de 1.1–1.2 (29/10/2026): `tests/tools/deployment-profile.test.mjs` 3/3, release 9/9, `pilot-2d-mode.spec` 1/1 focal y 1/1 en la full intento 1. 1.3 queda abierta hasta una full aprobada.
