# Roadmap

## Purpose

`reactive-fsm` is a small policy layer for **state-scoped tool gating and tool budgets** in TypeScript AI agents. It decides which tools are advertised in each conversation state and how many consecutive tool calls are allowed between steps.

It is not an agent runtime, an authorization layer, a workflow engine or a statechart library.

## Scope

### Maintained

- The core: `createFSM`, `buildToolsForGate`, `createLoopShield`.
- The Vercel AI SDK 7 adapter.
- Node 20+, ESM-only, zero runtime dependencies.

### Experimental

- OpenAI, Anthropic, LangChain and Gemini adapters.
- They format tool definitions but are not full runtime integrations and are not covered by contract tests.

### Out of scope

- Tool execution or authorization.
- Persistence, distributed locking or transactions.
- Workflow orchestration, human-in-the-loop or multi-agent handoff.
- OpenTelemetry, dashboards or a telemetry system.
- A sixth adapter, CJS dual build or a DSL.
- A rewrite on top of XState.

## Principles

- `config.tools` is the single authority for tool availability.
- Gating is advisory: the application still authorizes and validates execution.
- One FSM instance per conversation or isolated run.
- The tool budget is an admission budget between steps, not a strict per-call limit.
- No new features without evidence from a real use case.
- Contracts are documented with their limits, not only their happy path.

## Direction

### 2.0.x — maintenance

Correctness fixes, documentation, compatibility and security. No new features.

### 2.1.0 — only with evidence

Evaluate only if a real use case demonstrates that the abstraction reduces complexity or errors:

- a documented production use case;
- a demand-driven decision on experimental adapters;
- removal of dead APIs if justified;
- a reproducible comparison against native `prepareStep`/`activeTools`.

### 3.0.0 — only if justified

A major release only for breaking changes that the evidence supports. Not for cosmetic scope reduction.

## Where work lives

| Place | Responsibility |
|---|---|
| `ROADMAP.md` | Public direction, scope and approved priorities |
| GitHub Issues | Concrete, reproducible, approved work with acceptance criteria |
| `roadmap.local.md` | Private research, hypotheses and deferred decisions (not tracked) |
| `CHANGELOG.md` | Changes actually released |
| `docs/decisions/` | Architecture and scope decisions |
| `docs/audits/` | Dated evidence and checkpoints |

## References

- [Documentation](https://roddcode.github.io/reactive-fsm/)
- [Migration guide](docs/migrations/1.x-to-2.0.0.md)
- [Scope decision](docs/decisions/0001-scope-and-positioning.md)
- [Release 2.0.0 scope](docs/decisions/0002-release-2.0.0-scope.md)
