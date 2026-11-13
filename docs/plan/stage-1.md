# Stage 1 — v1.5.0 Stabilization

> Este documento es la ejecución detallada de la Etapa 1 del [`ROADMAP.md`](../../ROADMAP.md). La evidencia base está en [`docs/audits/2026-11-12-v1.4.1.md`](../audits/2026-11-12-v1.4.1.md). La decisión de alcance está en [`ADR-0001`](../decisions/0001-scope-and-positioning.md).

- **Base:** `v1.4.1`, commit `7b59308`
- **Objetivo:** `v1.5.0`
- **Criterio global:** instalable con los SDK actuales, gating consistente, sin carreras async, CI verde, `pnpm validate:package` verde y `npm pack` instalable en limpio.

## RFSM-01 — Quitar peers no usados

**Problema:** los peers declarados bloquean la instalación con los majors actuales y los adaptadores no los importan.

**Propuesta:** eliminar `peerDependencies` y `peerDependenciesMeta`. Mantener el paquete sin dependencias de runtime. Añadir `ai@7` y `zod` solo como `devDependencies` para el test de tipos del adaptador de Vercel.

**Aceptación:**

- `npm install <tarball>` en limpio funciona sin peers.
- `npm install <tarball> ai@7` funciona sin `--legacy-peer-deps`.
- `npm install <tarball> openai@7`, `@anthropic-ai/sdk@1`, `langchain@1` funcionan.
- `pnpm validate:package` sigue verde.
- `package.json` no tiene `peerDependencies`.

## RFSM-02 — Unificar el gating

**Problema:** `config.tools` y `registry.gates` pueden contradecirse; los adaptadores ignoran `allowedTools`.

**Propuesta:** `config.tools` es la autoridad. `buildToolsForGate` acepta `allowedTools?: readonly string[]` y filtra por nombre. Todos los adaptadores pasan `fsm.allowedTools`. El adaptador de Vercel usa `activeTools` con la intersección de `allowedTools`, `gates` y `condition`.

**Aceptación:**

- Un registry con una tool gated al estado pero ausente de `config.tools` no se anuncia.
- Una tool en `config.tools` pero ausente del registry no se anuncia.
- Los cinco adaptadores respetan la intersección.
- Test adversarial de D02 pasa.

## RFSM-03 — Adaptador de Vercel para AI SDK 7

**Problema:** el adaptador entrega `prepareStep` pero asume `ai@4`; no tipa con `ai@7`; muta `tools` en lugar de usar `activeTools`.

**Propuesta:** construir un `ToolSet` estructural con todas las tools del registry; `prepareStep` devuelve `activeTools` con la intersección del estado actual. Sin mutación. Tipos estructurales (`VercelTool`, `VercelToolSet`, `VercelPrepareStep`) compatibles con `generateText` de `ai@7`; sin dependencia de runtime.

**Aceptación:**

- `generateText({ tools, prepareStep, stopWhen })` compila con `ai@7`.
- `prepareStep` devuelve `{ activeTools: [...] }` o `{ toolChoice: 'none' }`.
- Un step con varias tool calls cuenta cada llamada.
- El fallback aplica las tools del estado de emergencia y resetea el shield.
- El test de tipos con `ai@7` pasa.

## RFSM-04 — Rechazar transiciones async obsoletas

**Problema:** `transitionToAsync` captura `from`, espera el guard y escribe sin comprobar si el estado cambió.

**Propuesta:** comprobación optimista después del `await`: si `_currentState !== from`, lanzar un error claro. No introducir colas ni locks.

**Aceptación:**

- A→B pendiente, A→C, release → B rechaza y el estado final es C.
- Dos transiciones async concurrentes no se pisan.
- `onTransition` no reporta un `from` obsoleto.
- Test adversarial de D04 pasa.

## Secuencia de commits

```text
fix(deps): remove unused provider peer dependencies
fix(core): make config.tools the single gating authority
fix(core): reject stale async transitions
fix(vercel): use AI SDK 7 activeTools instead of mutating tools
test: cover gating, async races and Vercel prepareStep
chore(release): 1.5.0
```

## Checklist de release

- [ ] `pnpm build`
- [ ] `pnpm test`
- [ ] `pnpm validate:package`
- [ ] `npm pack` + instalación limpia con Node 20/22 y `ai@7`
- [ ] `CHANGELOG.md` con `1.5.0`
- [ ] `package.json` en `1.5.0`
- [ ] Tag `v1.5.0`
- [ ] Push con tags
- [ ] GitHub Release
- [ ] `npm publish` (requiere token válido; pendiente de reautenticación)
