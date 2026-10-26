# ADR-005: Packs locales y GGPROJ3 explícito

Fecha: 22 de octubre de 2026. Estado: aceptada e implementada; full F3 aprobado.

> **Sustitución parcial (25 de octubre de 2026):** [ADR-011](011-contrato-de-lenguaje-y-vistas-sincronizadas.md) sustituye la igualdad exacta de locks como condición de apertura (ver `pack-versioning-and-migrations`) y `apiVersion: 1` como único formato: cada bloque de pack declara su entrada en una tabla de lenguaje (`apiVersion: 2` en el manifiesto, o en el catálogo por `pack@versión` para las versiones publicadas) y cada contexto ofrece solo los lenguajes que sus packs declaran.

Los packs gg.sprites y gg.score son contribuciones locales de datos revisadas. El registro define bloques, categorías y lowerings a IR0; ningún archivo importado añade módulos ejecutables. El catálogo fija contenido, versión y SHA256, comprobados en Node. Las excepciones de fronteras admiten exclusivamente datos de packs/lecciones y siguen prohibiendo DOM/motores en ese nivel.

GGPROJ1/2 conservan sus esquemas exactos y no se actualizan al abrir. Activar capacidades crea GGPROJ3 con capabilities.locks/config; gg.sprites es dueño del estado inicial, sin scene duplicada. La puntuación declara su global estable gg-pack-score, evitando colisión con el ejemplo legado gg-score local. Una copia textual conserva su initialValue explícito; defaults solo completan IDs ausentes. Las migraciones score0.1↔0.2 cambian initial/initialValue sobre copias validadas, sin reescribir fuente.

El broker aplica permisos y recursos antes de mutar en el runner. Un cliente de pack captura su principal por cierre del anfitrión; el mensaje no puede elegirlo. GG.variables.get/set ahora resuelven un ID numérico único de hero o Stage, con rechazo de colisión y límite ±1e6. El API contextual conserva su dominio explícito ±1e12; no se anuncia un servicio GG.score ni lecturas ilimitadas.

Los tres starters y sus predicados son datos locales. La evaluación distingue autoría y ejecución, conserva scope, limita consultas y cancela resultados obsoletos. Progreso separado de GGPROJ, con guardia antes de escribir en IndexedDB y aborto de transacción. Sustituir por un starter protege la autoría actual antes del commit. Un checkpoint opaco restaura incluso borradores textuales temporalmente inválidos ante un fallo de commit.

Evidencia: [OpenSpec F3](../../openspec/changes/archive/2026-10-24-phase-3-packs-lessons-offline/design.md), pruebas packs/lessons/project-draft-rollback y acta F3 al consolidar.
