# reactive-fsm

[![npm](https://img.shields.io/npm/v/reactive-fsm)](https://www.npmjs.com/package/reactive-fsm)
[![CI](https://github.com/roddcode/reactive-fsm/actions/workflows/ci.yml/badge.svg)](https://github.com/roddcode/reactive-fsm/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/reactive-fsm)](https://github.com/roddcode/reactive-fsm/blob/main/LICENSE)

**State-scoped tool availability and tool budgets for TypeScript AI agents.** Define which tools an LLM can see in each conversation state, with a small state machine and a per-step tool budget. Zero runtime dependencies.

[Docs](https://roddcode.github.io/reactive-fsm/) · [Examples](https://github.com/roddcode/reactive-fsm/tree/main/examples) · [Migration](https://github.com/roddcode/reactive-fsm/blob/main/docs/migrations/1.x-to-2.0.0.md) · [Issues](https://github.com/roddcode/reactive-fsm/issues)

## Why

LLMs call tools in loops, in the wrong order, or before the data exists. `reactive-fsm` gates which tools are advertised in each state and gives you a small, explicit budget for repeated tool calls.

It is a policy layer, not an agent runtime:

- Your application still executes tools and authorizes side effects.
- Your application still decides when to transition state.
- The library keeps the state, the tool policy and the budget in one small place.

## What it does

- **State-scoped tools.** `config.tools[state]` is the authority. A registry entry is only advertised if it is allowed by the state, its `gates` and its `condition`.
- **Tool budget.** Counts consecutive tool calls between steps. It is an admission budget: multiple calls inside one step can still exceed it.
- **Async guard.** `transitionToAsync()` accepts a `Promise<boolean>` guard and rejects if the state changed while the guard was pending.
- **Vercel AI SDK 7 adapter.** Uses `prepareStep` + `activeTools` with a stable `ToolSet`. Other adapters are experimental.

## What it doesn't do

- It doesn't execute tools or authorize side effects.
- It doesn't persist conversation context; `snapshot()` stores only the current state.
- It doesn't detect semantic loops; the budget counts calls between steps.
- It isn't a full statechart engine or an agent runtime.

## Who it's for

- TypeScript teams building agents with Vercel AI SDK 7.
- Flows where the valid tool set changes by conversation state.
- Agents where the model calls tools out of order or repeats the same tool.

If you only need a per-step tool list for one provider, AI SDK's `activeTools` may be enough. If you need durable orchestration, persistence or human-in-the-loop, use LangGraph or Mastra. If you need a full statechart, use XState.

## Install

```bash
npm install reactive-fsm
```

Requires Node 20+. The package is ESM-only and has no runtime dependencies.

## Quickstart

```ts
import { createFSM } from 'reactive-fsm'

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING', 'PAYMENT'] as const,
  tools: {
    IDENTITY: ['validate_dni'],
    BOOKING: ['check_availability', 'reserve_slot'],
    PAYMENT: ['process_payment'],
  },
  loopShield: { enabled: true, maxConsecutiveTools: 3 },
})

fsm.currentState        // 'IDENTITY'
fsm.allowedTools        // ['validate_dni']

fsm.transitionTo('BOOKING')
fsm.allowedTools        // ['check_availability', 'reserve_slot']
```

Use `as const` on `states` to preserve the literal state union. Without it, `S` widens to `string`.

## With Vercel AI SDK 7

The Vercel adapter is maintained and contract-tested by this project. It is a community adapter, not affiliated with or endorsed by Vercel.

```ts
import { generateText, isStepCount, jsonSchema } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createFSM, type ToolEntry } from 'reactive-fsm'
import { createVercelAdapter } from 'reactive-fsm/adapters/vercel-ai'

interface Ctx {
  contactId: string
}

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING'] as const,
  tools: {
    IDENTITY: ['validate_dni'],
    BOOKING: ['check_availability'],
  },
})

const registry: ToolEntry<Ctx>[] = [
  {
    name: 'validate_dni',
    gates: ['IDENTITY'],
    build: () => ({
      description: 'Validate the customer DNI',
      inputSchema: jsonSchema({
        type: 'object',
        properties: { dni: { type: 'string' } },
        required: ['dni'],
      }),
      execute: async ({ dni }: { dni: string }) => {
        if (!dni) throw new Error('DNI is required')
        fsm.transitionTo('BOOKING')
        return { valid: true }
      },
    }),
  },
  {
    name: 'check_availability',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Check available slots',
      inputSchema: jsonSchema({ type: 'object', properties: {} }),
      execute: async () => ({ slots: ['10:00', '11:00'] }),
    }),
  },
]

const adapter = createVercelAdapter(fsm, registry, { contactId: 'c-1' })

const response = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hola, quiero reservar una cita',
  ...adapter.inject(), // { tools, prepareStep }
  stopWhen: isStepCount(5),
})
```

`inject().tools` contains the full `ToolSet`; `prepareStep` returns `activeTools` with only the tools allowed by the current state. The adapter does not mutate the tool set.

See the runnable example: [`examples/ai-sdk-7`](https://github.com/roddcode/reactive-fsm/tree/main/examples/ai-sdk-7).

## How gating works

For the current state, a tool is advertised only if all of these are true:

1. It appears in `config.tools[currentState]`.
2. Its `registry.gates` includes the current state.
3. Its `condition`, if present, returns `true`.

The Vercel adapter then passes that set as `activeTools` to `prepareStep`. The model never sees a tool outside the policy.

This is advisory gating: the provider may still emit an unexpected call, and your application must validate it. The library does not wrap or authorize `execute`.

## Tool budget

```ts
loopShield: {
  enabled: true,
  maxConsecutiveTools: 3,
  mode: 'consecutive', // or 'repeated'
  fallbackState: 'ESCALATION',
  onLoop: ({ consecutiveTools, maxAllowed }) => {
    console.warn(`tool budget reached: ${consecutiveTools}/${maxAllowed}`)
  },
}
```

- `consecutive` counts any consecutive tool calls.
- `repeated` counts consecutive calls to the same tool and requires a `toolName`.
- `onLoop` fires once per episode.
- The budget resets when the state changes.
- `fallbackState` moves to a safe state and resets the budget.
- Multiple tool calls inside one step can exceed the budget before the next `prepareStep`. It is not a strict per-call limit.

If you need a strict limit, enforce it in your tool `execute` or in your execution layer.

## Compatibility

| Integration | Status | Notes |
|---|---|---|
| Vercel AI SDK 7 | Maintained, contract-tested | `prepareStep` + `activeTools`; community adapter |
| OpenAI | Experimental | Formats tools; no runtime loop |
| Anthropic | Experimental | Formats tools; no runtime loop |
| LangChain | Experimental | Returns a tool map; not a `bindTools` integration |
| Google Gemini | Experimental | Targets the legacy SDK |

- Node 20+.
- ESM-only.
- No runtime dependencies.
- `ai@7` is only needed if you use the Vercel adapter.

## API

```ts
interface FSMConfig<S extends string = string> {
  initialState: S
  states: readonly S[]
  tools: Partial<Record<S, string[]>>
  loopShield?: {
    enabled: boolean
    maxConsecutiveTools: number
    mode?: 'consecutive' | 'repeated'
    fallbackState?: S
    onLoop?: (info: { consecutiveTools: number; maxAllowed: number }) => void
  }
  onTransition?: (from: S, to: S) => void
  guard?: (from: S, to: S, context: Record<string, unknown>) => boolean | Promise<boolean>
  prompts?: Partial<Record<S, string>>
  snapshot?: { state: S }
  context?: Record<string, unknown>
}

interface FSMPublic<S extends string = string> {
  currentState: S
  currentStateGroup: string
  allowedTools: string[]
  isLooping: boolean
  transitionTo(state: S): void
  transitionToAsync(state: S): Promise<void>
  snapshot(): { state: S }
  toMermaid(): string
  context: Record<string, unknown>
}
```

`prompts` is stored metadata. The runtime does not inject it automatically; your application decides how to use it.

`ToolEntry`:

```ts
interface ToolEntry<TContext = any> {
  name: string
  gates: string[]
  condition?: (ctx: TContext) => boolean
  build: (ctx: TContext) => unknown // provider-specific tool shape
}
```

For AI SDK 7, `build()` should return a `Tool` with `inputSchema` and `execute`. You can type it with `satisfies Tool` in your own code.

## Examples

- [`examples/ai-sdk-7`](https://github.com/roddcode/reactive-fsm/tree/main/examples/ai-sdk-7) — `generateText` + `MockLanguageModelV3`, state change and active tools.
- [`examples/native-ai-sdk`](https://github.com/roddcode/reactive-fsm/tree/main/examples/native-ai-sdk) — the same flow using only AI SDK 7 `prepareStep` + `activeTools`.

Both run without provider credentials.

## FAQ

### Does reactive-fsm authorize tool execution?
No. It controls which tools are advertised to the model. Your application must validate arguments and enforce permissions.

### Is it a full FSM?
It's a minimal state container with guards, not a statechart engine. Any valid state can transition to any other state unless a guard blocks it.

### Does it work with AI SDK 4?
No. The maintained adapter targets AI SDK 7.

### Does the tool budget stop parallel tool calls in the same step?
No. It is an admission budget between steps. Multiple calls inside one step can exceed it.

### Does it support streaming?
The contract test uses `generateText`; `streamText` is not covered yet.

### Does it persist conversation context?
No. `snapshot()` stores only the current state. Context and budget are reconstructed by your application.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm validate:package
pnpm docs:build
```

## License

MIT
