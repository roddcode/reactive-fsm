# ADR-0002: Release 2.0.0 scope

- **Estado:** aceptado por el mantenedor
- **Fecha:** 2026-11-13
- **Decisor:** mantenedor
- **Relacionado:** [`ADR-0001`](0001-scope-and-positioning.md), [`checkpoint P0`](../audits/2026-11-13-v1.5.0-checkpoint.md)

## Contexto

El checkpoint P0 demostró que los cambios de estabilización modifican contratos observables:

- `config.tools` pasa a ser la autoridad del gating.
- El adaptador de Vercel cambia a `activeTools` y a un `ToolSet` estable.
- Las transiciones async obsoletas ahora producen errores.
- El runtime mínimo pasa a Node 20.

El mantenedor aprobó la dirección técnica, pero decidió publicar como **2.0.0**, no como 1.5.0, porque SemVer exige una major para cambios incompatibles en la API pública. También decidió que el tool budget siga siendo un presupuesto de admisión entre pasos, no un límite estricto por llamada.

## Decisión

1. El release **2.0.0** agrupa P0 + P1 acotado: corrección del gating, contratos del presupuesto, tipos literales de estado, tests de contrato y documentación/migración.
2. El tool budget se evalúa **entre pasos**. No se implementa un ejecutor concurrente ni un límite estricto por llamada. La limitación se documenta.
3. No se añaden funcionalidades ni adaptadores nuevos.
4. La eliminación de adaptadores no soportados y de APIs muertas (`prompts`, `schema` sin integración, `toMermaid`, `currentStateGroup`) se **pospone** a un release posterior. En 2.0.0 quedan marcados como experimentales o no integrados.
5. No se abre otra auditoría general. El siguiente paso es completar P1, validar el tarball y dejar el release listo.

## Consecuencias

- `2.0.0` es un release breaking, con guía de migración `docs/migrations/1.x-to-2.0.0.md`.
- Los consumidores que dependían del registry como autoridad o inspeccionaban `inject().tools` deben migrar.
- La reducción de superficie (adaptadores/APIs muertas) se evaluará en `2.1.0` o `3.0.0` según demanda; no bloquea 2.0.0.
- El proyecto mantiene el nombre `reactive-fsm` y el posicionamiento de política de disponibilidad de herramientas, no de framework de agentes.

## Alternativas consideradas

- **1.5.0:** rechazada por SemVer; los cambios de contrato son incompatibles.
- **2.0.0 con eliminación inmediata de adaptadores/APIs:** rechazada por alcance; el mantenedor pidió P1 acotado y no ampliar el trabajo.
- **Posponer P1:** rechazada; los tipos y los contratos del presupuesto son parte de la calidad que justifica el release.
- **Límite estricto por llamada:** rechazada; convertiría la librería en un ejecutor concurrente y ampliaría el alcance sin necesidad demostrada.
