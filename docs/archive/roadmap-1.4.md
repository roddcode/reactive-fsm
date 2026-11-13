# Roadmap histórico (1.4.x)

> **Archivado.** Este documento fue la planificación local de `1.4.x`. Está superseded por [`ROADMAP.md`](../../ROADMAP.md) y por [`ADR-0001`](../decisions/0001-scope-and-positioning.md). No usar como fuente de planificación.

## Versioning

- Semver. El core es ESM-only; los cinco adaptadores eran peer dependencies opcionales.
- Hasta 1.4.1 las versiones se cortaban como mensajes de commit. Desde 1.5.0 cada release tiene tag y notas en GitHub Releases.

## 1.0.0: the first cut

- `createFSM` con estados y tools por estado: `allowedTools`, `transitionTo`.
- Loop shield para detectar llamadas repetidas.
- `buildToolsForGate` y `validateWith`.

## 1.2.0

- `onTransition`, `guard`, `prompts`, `snapshot` y restore, `toMermaid`, `context`.
- Tool registry con condiciones y schema validation.

## 1.3.0

- `fallbackState`: transición automática cuando el loop shield se activa.
- Tipos literales de estado vía `const` generic; `guard` recibe contexto.

## 1.4.0

- Loop shield modes: `consecutive` y `repeated`, más `onLoop`.
- `currentStateGroup` para `STATE:substate`.
- Async guard: `transitionToAsync`.
- `createBaseAdapter` para los cinco adaptadores.

## 1.4.1

- Imports relativos con `.js` para Node16 ESM.
- CI con build, tests y validación de paquete.
- `publint` y `are-the-types-wrong`.

## 2.0.0 candidates (histórico, no aprobado)

1. Persistence adapters (Redis, PostgreSQL) para snapshots.
2. Timeouts por estado con fallback automático.
3. Sub-máquinas y composición de FSMs.
4. Hooks de observabilidad/OpenTelemetry.
5. Build dual ESM + CJS.
6. Schema-first config.
7. Devtools: inspector de estado y replay.
8. Multi-agent handoff.
9. Simulation mode.
10. MCP adapter.

Estos candidatos quedaron fuera del alcance aprobado en `ADR-0001`. La lista se conserva solo como historia.
