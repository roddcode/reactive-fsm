# Contracts and limitations

`reactive-fsm` is a small policy layer. This page states what it guarantees and what it does not.

## What it guarantees

- A state is always one of `config.states`.
- `transitionTo` rejects an invalid state.
- `transitionToAsync` rejects a transition if the state changed while the guard was pending.
- `allowedTools` returns the tools configured for the current state.
- The Vercel adapter only activates tools that are allowed by the state, `registry.gates` and `condition`.
- The tool budget resets on state transitions and fires `onLoop` once per episode.

## What it does not guarantee

### Authorization

Gating is advisory. The model may still emit a tool call outside the active set, and your application may still execute it if it does not validate the name. `reactive-fsm` does not wrap `execute` or enforce permissions.

### Persistence

`snapshot()` stores only `{ state }`. It does not store context, budget counters, messages or tool results. Your application owns persistence.

### Concurrency

The FSM is a mutable object. Use one instance per conversation. It does not serialize concurrent transitions; it rejects stale async transitions with a monotonic revision.

### Strict tool budgets

The budget is checked between steps. Multiple tool calls inside one step can exceed it. If you need a strict per-call limit, enforce it in your execution layer.

### Semantic loop detection

The budget counts calls. It does not know whether a tool succeeded, failed, or made progress. A legitimate retry can trip it; a productive loop can stay under it.

### Provider coverage

Only the Vercel AI SDK 7 adapter is maintained and contract-tested. OpenAI, Anthropic, LangChain and Gemini adapters are experimental and format tool definitions; they are not full runtime integrations.

### Streaming

The contract test uses `generateText`. `streamText` is not covered yet.

### Type precision in the Vercel adapter

`VercelTool` uses `any` for `inputSchema` and `execute` so the adapter can stay assignable to AI SDK's `ToolSet` without importing `ai` in the runtime. You can type your `build()` return with `satisfies Tool` from `ai` for more precision.

## When not to use it

- You have one provider and a small, stable tool set. Use `activeTools` directly.
- You need durable orchestration, persistence or human-in-the-loop. Use LangGraph or Mastra.
- You need full statechart semantics. Use XState.
- You need a runtime that executes and authorizes tools. This is not that runtime.

## Compatibility

- Node 20+.
- ESM-only.
- No runtime dependencies.
- AI SDK 7 only for the maintained Vercel adapter.
- `ai@4` is not supported by `2.x`.

## Next

- [FAQ](/faq)
- [Migration guide](https://github.com/roddcode/reactive-fsm/blob/main/docs/migrations/1.x-to-2.0.0.md)
