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

## `onTransition` is a notification, not a veto

`onTransition` runs **after** the state has been committed. If it throws, the error propagates to the caller but the new state remains. It is not a validation hook and it does not roll back.

It is also synchronous. The runtime does not await the callback. Do not use an async function for persistence: the transition is already committed and a rejection may be unhandled. Persist in your application around the transition.

Use `guard` to block a transition. Use `onTransition` for logging, metrics or side effects that are safe after the change.

## Validation is permissive

`validateWith()` only validates schemas that expose `safeParse` (Zod/Valibot). A non-null schema without `safeParse` returns `{ ok: true }` without validating anything.

Use a supported validator or validate before calling. Do not treat `ok: true` as proof that arbitrary JSON Schema was applied.

## `allowedTools` is a view of the configuration

`allowedTools` returns the array stored in `config.tools` for the current state. Mutating it changes the effective policy without a transition. Treat it as read-only.

The same applies to the configuration object you pass to `createFSM()`: the library keeps references to its arrays. If you need dynamic policy changes, replace the configuration deliberately rather than mutating arrays in place.

## Registry types are not fully checked

`ToolEntry.gates` is a `string[]`, not a union of your states. A typo such as `BOOKNIG` compiles and simply never matches. `ToolEntry.build()` returns `unknown`; the Vercel adapter casts it to its structural tool type.

If you need stronger guarantees, validate the registry at startup or type your `build()` return with `satisfies Tool` from `ai`.

## Production integration

`reactive-fsm` is an in-memory policy object. Production systems need to own the surrounding state and guarantees.

### One instance per conversation or run

Do not share a mutable FSM instance between concurrent conversations. Create one instance per conversation, request or isolated execution. If you need to resume, rehydrate it from your own store.

### Persist state and context outside the library

`snapshot()` returns only `{ state }`. Your application should persist:

- the state returned by `snapshot()`;
- the conversation context;
- pending operations, messages and tool results;
- the budget counters if you need them across restarts.

A minimal rehydration looks like this:

```ts
const saved = await store.load(conversationId)

const fsm = createFSM({
  ...config,
  snapshot: { state: saved.state },
  context: saved.context,
})
```

The library does not know how to load or save that record.

### Distributed concurrency is your responsibility

`_revision` protects one FSM instance in memory. It is not a distributed lock and it does not coordinate multiple processes or replicas.

If two workers can handle the same conversation, use optimistic concurrency in your database (a version column), a queue keyed by conversation, or another application-level serialization mechanism.

### Tool gating is not authorization

The model only sees the tools you advertise, but your backend must still verify:

- who is allowed to execute the operation;
- whether the business rules allow it now;
- whether the arguments are valid;
- whether the operation is idempotent.

`reactive-fsm` does not wrap `execute` and does not enforce permissions.

### Retries, idempotency and compensations

Tool calls can be retried by the model or by your infrastructure. The application owns:

- idempotency keys;
- retry policies;
- outbox or saga patterns;
- compensating actions for partial failures.

The library does not provide transactions or compensations.

### Observability

Use `onTransition`, `onLoop` and your own logging/tracing around the model and tool executor. The library does not ship a telemetry system, OpenTelemetry integration or a dashboard.

### A small architecture

```text
Client
  -> Conversation service
       -> one FSM instance per conversation (state + budget)
       -> external store (state + context + pending operations)
       -> model call (activeTools from the current state)
       -> tool executor (authorization, idempotency, audit)
```

The library owns the state-to-tools policy. The service owns persistence, concurrency, authorization and recovery.

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
