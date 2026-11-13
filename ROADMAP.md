# Roadmap

> **Posicionamiento:** state-scoped tool availability and tool budgets for TypeScript AI agents.
> Una política pequeña, explícita y provider-agnóstica para decidir qué herramientas se anuncian en cada estado y cuántas llamadas se permiten. No es un FSM completo, no es un runtime de agentes y no es una capa de autorización.

- **Auditoría base:** [`docs/audits/2026-11-12-v1.4.1.md`](docs/audits/2026-11-12-v1.4.1.md)
- **Decisión de alcance:** [`docs/decisions/0001-scope-and-positioning.md`](docs/decisions/0001-scope-and-positioning.md)
- **Estado actual:** `1.4.1`, commit `7b59308`, auditada el 2026-11-12.
- **Foco actual:** estabilización. No se aprueban funcionalidades nuevas.

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

**Criterio de salida:** CI verde en Node 20/22; `ROADMAP.md` y `docs/` visibles en GitHub; `git status` limpio. Node 18 queda fuera por EOL y porque Vitest 4 no lo soporta.

## Etapa 1 — v1.5.0 Stabilization

**Resultado:** instalable con los SDK actuales, gating consistente y sin carreras async.

- [ ] RFSM-01 Quitar peer dependencies no usadas.
- [ ] RFSM-02 Unificar `config.tools` y `registry.gates`.
- [ ] RFSM-03 Reparar Vercel AI SDK 7: `prepareStep`, `activeTools`, `ToolSet`.
- [ ] RFSM-04 Rechazar transiciones async obsoletas.
- [ ] RFSM-05 CI verde y badge corregido.

**Criterio de salida:** `npm install <tarball> ai@7` en limpio; los tests adversariales de D01–D04 pasan; `pnpm validate:package` pasa; `CHANGELOG` actualizado.

## Etapa 2 — v1.6.0 Quality and adoption

**Resultado:** una integración real, tipada y documentada; el resto de la superficie, honestamente marcada.

- [ ] RFSM-06 Fallback y loop shield con semántica explícita.
- [ ] RFSM-07 Tipos literales de estado en la API pública.
- [ ] RFSM-08 Tests de contrato con SDKs reales y `typecheck`.
- [ ] RFSM-09 README reescrito desde garantías demostradas.
- [ ] RFSM-10 Reducir adaptadores: Vercel oficial; OpenAI/Anthropic experimentales; LangChain/Gemini fuera de la promesa estable.

**Criterio de salida:** quickstart copiable y ejecutable; `pnpm typecheck` incluye tests; un test de `generateText` con modelo mock recorre dos estados; el README explica qué no hace la librería.

## Etapa 3 — v2.0.0 Scope reduction

**Resultado:** una librería pequeña, especializada y honesta.

- [ ] Eliminar adaptadores no soportados y APIs muertas (`prompts`, `schema` sin integración, `toMermaid` si no se corrige).
- [ ] Consolidar el tipo genérico `FSMPublic<S>`/`FSMInstance<S>`.
- [ ] Reemplazar la promesa “FSM determinista” por “state-scoped tool availability”.
- [ ] Publicar una comparación reproducible con la solución nativa del SDK, o retirar la comparación.

**Criterio de salida:** superficie pública reducida y documentada; sin features nuevas; un caso de uso real documentado.

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
| `1.5.0` | — | Planificada | Estabilización P0 |
| `1.6.0` | — | Planificada | Calidad y adopción |
| `2.0.0` | — | Planificada | Reducción de alcance |
