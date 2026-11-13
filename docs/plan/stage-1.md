# Stage 1 — v2.0.0 Stabilization + quality

> Ejecución detallada de la Etapa 1 del [`ROADMAP.md`](../../ROADMAP.md). Evidencia base: [`docs/audits/2026-11-12-v1.4.1.md`](../audits/2026-11-12-v1.4.1.md) y [`checkpoint P0`](../audits/2026-11-13-v1.5.0-checkpoint.md). Decisión de release: [`ADR-0002`](../decisions/0002-release-2.0.0-scope.md).

- **Base:** `v1.4.1`, commit `7b59308`
- **Objetivo:** `v2.0.0`
- **Criterio global:** instalable con los SDK actuales, gating consistente, sin carreras async, tipos literales, budget explícito, CI verde y tarball validado.

## P0 — Correcciones de contrato

### RFSM-01 — Quitar peers no usados

Eliminar `peerDependencies` y `peerDependenciesMeta`. Mantener cero dependencias de runtime. `ai@7` y `zod` solo como `devDependencies`.

**Aceptación:** instalación limpia con `ai@7`, `openai@7`, `@anthropic-ai/sdk@1` y `langchain@1`; `pnpm validate:package` verde.

### RFSM-02 — Unificar el gating

`config.tools` es la autoridad. `buildToolsForGate` filtra por `allowedTools`. El adaptador de Vercel cruza `config.tools`, `registry.gates`, `condition` y estado actual.

**Aceptación:** una tool fuera de `config.tools` o fuera de `gates` no se activa; test adversarial de D02 y del caso `gates` contradictorio.

### RFSM-03 — Vercel AI SDK 7

`inject()` devuelve un `ToolSet` estable; `prepareStep` devuelve `activeTools`. Sin mutación. Test con `generateText` + `MockLanguageModelV3` que cruza A → B.

**Aceptación:** typecheck contra `ai@7`; el segundo step ve las tools de B; el fallback activa las tools del estado de emergencia.

### RFSM-04 — Transiciones async obsoletas

Revisión monotónica: si el estado cambió mientras el guard estaba pendiente, la transición rechaza. Cubre A → B → A.

**Aceptación:** stale, concurrente, fallback y ABA; el estado final es determinista.

## P1 — Calidad acotada

### RFSM-06 — Contrato del tool budget

- `onLoop` se dispara una vez por episodio.
- `mode: 'repeated'` exige `toolName`.
- `maxConsecutiveTools` debe ser positivo.
- El contador se resetea al cambiar de estado.
- El adaptador de Vercel cuenta cada step completado una vez.

**Aceptación:** tests de `onLoop` único, `repeated` sin nombre, threshold inválido, reset por transición y multi-call step.

### RFSM-07 — Tipos literales

`FSMPublic<S>` y `FSMInstance<S>` genéricos. `createFSM` devuelve `FSMPublic<S>`; `transitionTo(state: S)`.

**Aceptación:** `as const` en `states`; `@ts-expect-error` en un typo; `pnpm typecheck` verde.

### RFSM-08 — Tests de contrato

`pnpm typecheck` con `ai@7`; `generateText` + `MockLanguageModelV3`; tests de gating en los cinco adaptadores; tests adversariales de concurrencia y budget.

**Aceptación:** suite completa verde; el typecheck falla si el hook de Vercel o el tipo de tools se rompe.

### RFSM-09 — Documentación y migración

README con quickstart de AI SDK 7, posicionamiento advisory, límites del budget y guía `1.x → 2.0.0`.

**Aceptación:** el quickstart compila; la migración enumera cada cambio incompatible; el README dice qué no hace la librería.

### RFSM-10 — Adaptadores

Vercel es el adaptador oficial. OpenAI, Anthropic, LangChain y Gemini quedan marcados como experimentales; no se añaden adaptadores nuevos.

**Aceptación:** README y exports coinciden; los adaptadores experimentales no se presentan como integraciones completas.

## Secuencia de commits

```text
fix(deps): remove unused provider peer dependencies
fix(core): reject stale async transitions
fix(vercel): use AI SDK 7 activeTools
fix(core): make config.tools the single gating authority
fix(vercel): honor registry gates in activeTools
fix(core): make the tool budget contract explicit
feat(types)!: preserve literal state unions in the public API
docs: align README with verified behavior
docs: add P0 checkpoint
docs: add 2.0.0 migration guide and release scope
chore(release): 2.0.0
```

## Checklist de release

- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm typecheck`
- [ ] `pnpm validate:package`
- [ ] `npm pack` + instalación limpia con Node 20/22, con y sin `ai@7`
- [ ] `CHANGELOG.md` con `2.0.0`
- [ ] `package.json` en `2.0.0`
- [ ] Guía `docs/migrations/1.x-to-2.0.0.md`
- [ ] Tag `v2.0.0`
- [ ] Push con tags
- [ ] GitHub Release
- [ ] `npm publish` (requiere token válido; pendiente de reautenticación)
