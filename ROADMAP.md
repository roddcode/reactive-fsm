# Roadmap

> **Posicionamiento:** state-scoped tool availability and tool budgets for TypeScript AI agents.
> Una política pequeña, explícita y provider-agnóstica para decidir qué herramientas se anuncian en cada estado y cuántas llamadas se permiten. No es un FSM completo, no es un runtime de agentes y no es una capa de autorización.

- **Auditoría base:** [`docs/audits/2026-11-12-v1.4.1.md`](docs/audits/2026-11-12-v1.4.1.md)
- **Checkpoint P0:** [`docs/audits/2026-11-13-v1.5.0-checkpoint.md`](docs/audits/2026-11-13-v1.5.0-checkpoint.md)
- **Decisiones:** [`ADR-0001`](docs/decisions/0001-scope-and-positioning.md), [`ADR-0002`](docs/decisions/0002-release-2.0.0-scope.md)
- **Migración:** [`1.x → 2.0.0`](docs/migrations/1.x-to-2.0.0.md)
- **Estado actual:** `1.4.1` publicada; `2.0.0` en preparación sobre `main`.
- **Foco actual:** cerrar 2.0.0. No se aprueban funcionalidades nuevas.

## Principios

1. Una sola fuente de verdad para el gating.
2. Una sola integración oficial mantenida: Vercel AI SDK 7.
3. El gating es advisory: la autorización real vive en la aplicación.
4. Nada nuevo hasta que lo anterior sea verificable.
5. Cada release se valida con build, tests, `npm pack` e instalación limpia.

## Etapa 0 — Repo hygiene (sin cambio de versión)

**Resultado:** documentación permanente, `.gitignore` correcto y CI verde.

- [x] `ci: use pnpm 10 across Node 20/22`
- [x] `docs: add v1.4.1 audit, roadmap and scope ADR`
- [x] `chore: track ROADMAP and ignore local scratch files`
- [x] `chore: require Node 20+ and drop EOL Node 18 from CI`
- [x] RFSM-05 CI verde y badge corregido.

**Criterio de salida:** CI verde en Node 20/22; `ROADMAP.md` y `docs/` visibles en GitHub; `git status` limpio. Node 18 queda fuera por EOL y porque Vitest 4 no lo soporta.

## Etapa 1 — v2.0.0 Stabilization + quality

**Resultado:** instalable con los SDK actuales, gating consistente, sin carreras async, tipos literales y presupuesto explícito.

- [x] RFSM-01 Quitar peer dependencies no usadas.
- [x] RFSM-02 Unificar `config.tools` y `registry.gates`.
- [x] RFSM-03 Reparar Vercel AI SDK 7: `prepareStep`, `activeTools`, `ToolSet`.
- [x] RFSM-04 Rechazar transiciones async obsoletas.
- [x] RFSM-05 CI verde en Node 20/22.
- [x] RFSM-06 Fallback y loop shield con semántica explícita.
- [x] RFSM-07 Tipos literales de estado en la API pública.
- [x] RFSM-08 Tests de contrato con SDKs reales y `typecheck`.
- [x] RFSM-09 README reescrito desde garantías demostradas.
- [x] RFSM-10 Adaptadores no soportados marcados como experimentales.
- [x] Corregir `activeToolNames()` para respetar `registry.gates`.
- [ ] Release `2.0.0`: changelog, migración, tarball validado, tag y publicación.

**Criterio de salida:** `npm install <tarball> ai@7` en limpio; tests adversariales de D01–D04 y del budget pasan; `pnpm validate:package` pasa; `CHANGELOG` y guía de migración listos.

## Etapa 2 — v2.1.0 Adoption (solo con evidencia)

**Resultado:** adopción real, no más superficie.

- [ ] Un caso de uso documentado con métricas de complejidad/errores.
- [ ] Evaluar la eliminación de adaptadores no soportados y APIs muertas (`prompts`, `schema` sin integración, `toMermaid`, `currentStateGroup`).
- [ ] Comparación reproducible con la solución nativa del SDK, o retirar la comparación.
- [ ] Solo entonces evaluar nuevas funcionalidades solicitadas por usuarios.

**Criterio de salida:** evidencia de que reactive-fsm reduce complejidad o errores frente a la solución nativa. Sin esa evidencia, no se amplía el alcance.

## Etapa 3 — v3.0.0 Scope reduction (solo si se justifica)

**Resultado:** una librería pequeña, especializada y honesta.

- [ ] Eliminar adaptadores no soportados y APIs muertas si la evidencia de 2.1.0 lo justifica.
- [ ] Mantener el nombre y el posicionamiento de política de herramientas; no convertirlo en framework.

## No hacer

- Sexto adaptador.
- Motor completo de workflows, persistencia integrada o dashboard.
- Detección “inteligente” de loops.
- Marketplace, playground, extensión de VSCode, port a Python.
- DSL propio, multi-agente, voz, A/B testing, self-healing, content guardrails.
- OpenTelemetry en el core.
- Build dual ESM+CJS por defecto.
- Reescribir sobre XState.
- Benchmark vs LangGraph sin medición reproducible.
- Optimizaciones de rendimiento sin problema medible.

## Protocolo de iteración

1. Un milestone = un resultado verificable, no un sprint por fechas.
2. No crear más de 5 issues P0 a la vez.
3. Cada cierre exige: CI verde, `pnpm validate:package`, `npm pack` + instalación limpia, `CHANGELOG` y README actualizados, tag y GitHub Release.
4. La auditoría no se edita: se reemplaza por otra fechada en `docs/audits/`.
5. El roadmap no se publica en npm; `files` sigue con `dist`, `README.md` y `LICENSE`.

## Historial de versiones

| Versión | Fecha | Estado | Nota |
|---|---|---|---|
| `1.4.1` | 2026-09-26 | Publicada | Última versión auditada |
| `2.0.0` | 2026-11-13 | Release candidate | P0 + P1 acotado; cambios incompatibles |
| `2.1.0` | — | Planificada | Adopción y evaluación de recortes |
| `3.0.0` | — | Solo si se justifica | Reducción de alcance |
