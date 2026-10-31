# Seguridad

Si encuentras una vulnerabilidad en GuateGeeks Code Studio, no abras un issue público. Usa el [reporte privado de GitHub](https://github.com/GuateGeeks/code-studio/security/advisories/new) e incluye los pasos para reproducirla.

## Alcance

- Los proyectos y nombres de estudiantes se guardan en el navegador de cada equipo; no hay cuentas ni servidor.
- La selección de estudiante evita mezclas, pero no es un control de acceso.
- Los juegos se ejecutan en un iframe de origen opaco, sin acceso al almacenamiento ni al editor.
- Las fallas de PXT o del simulador deben reportarse también en sus proyectos de origen.
