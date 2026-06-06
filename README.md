# reactive-fsm

Reactive Finite State Machine for AI agent orchestration. Zero-dependency core with conditional tool gating, loop shield, and adapters for Vercel AI SDK and OpenAI SDK.

```bash
pnpm add reactive-fsm
# o npm install reactive-fsm
```

## Concepts

| Concept | Role |
|---------|------|
| **FSM** | Manages states and which tool names are allowed at each state |
| **Tool Gating** | Registry of tool entries with runtime conditions and builders, filtered by gate |
| **Loop Shield** | Detects consecutive tool-call loops and signals the adapter to force-stop |
| **Adapters** | Translate the FSM into SDK-native format (Vercel AI SDK, OpenAI) |

---

## Quick Start

### 1. Define your FSM

```typescript
import { createFSM } from 'reactive-fsm'

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
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

### 2. Build a tool registry

```typescript
import type { ToolEntry } from 'reactive-fsm'

interface AppCtx { contactId: string; role: 'user' | 'admin' }

const registry: ToolEntry<AppCtx>[] = [
  {
    name: 'validate_dni',
    gates: ['IDENTITY'],
    build: (ctx) => ({
      description: `Validate DNI for ${ctx.contactId}`,
      parameters: {},
      execute: async () => ({ valid: true }),
    }),
  },
  {
    name: 'check_availability',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Check slot availability',
      parameters: {},
      execute: async () => ({ slots: ['10:00', '11:00'] }),
    }),
  },
  {
    name: 'reserve_slot',
    gates: ['BOOKING'],
    condition: (ctx) => ctx.contactId !== '',
    build: () => ({
      description: 'Reserve a time slot',
      parameters: {},
      execute: async () => ({ booked: true }),
    }),
  },
  {
    name: 'admin_panel',
    gates: ['IDENTITY', 'BOOKING', 'PAYMENT'],
    condition: (ctx) => ctx.role === 'admin',
    build: () => ({
      description: 'Access admin controls',
      parameters: {},
      execute: async () => ({ panel: 'open' }),
    }),
  },
]
```

### 3. Use an adapter

#### Vercel AI SDK

```typescript
import { createVercelAdapter } from 'reactive-fsm/adapters/vercel-ai'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

const adapter = createVercelAdapter(fsm, registry, appCtx)

const response = await generateText({
  model: openai('gpt-4o'),
  messages: [{ role: 'user', content: 'Quiero agendar una cita' }],
  ...adapter.inject(),   // → { tools, prepareStep }
})
```

#### OpenAI SDK

```typescript
import { createOpenAIAdapter } from 'reactive-fsm/adapters/openai'
import OpenAI from 'openai'

const openai = new OpenAI()
const adapter = createOpenAIAdapter(fsm, registry, appCtx)

const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
  { role: 'user', content: 'Quiero agendar una cita' },
]

while (true) {
  const { tools } = adapter.inject()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    tools,
    tool_choice: adapter.isLooping() ? 'none' : 'auto',
  })

  const msg = response.choices[0].message
  messages.push(msg)

  if (msg.tool_calls?.length) {
    adapter.registerToolCall()

    // Execute tools, push results to messages
    for (const tc of msg.tool_calls) {
      const result = await executeTool(tc.function.name, tc.function.arguments)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
    }

    // If a tool mutated the DB state, refresh the gate
    // adapter.refreshGate('BOOKING')
    continue
  }

  console.log(msg.content)  // final response
  break
}
```

---

## Real-World Patterns

### Booking Funnel (3 gates)

```typescript
const bookingFSM = createFSM({
  initialState: 'GREETING',
  states: ['GREETING', 'IDENTITY', 'SCHEDULING', 'CONFIRMED'],
  tools: {
    GREETING: ['greet', 'show_catalog'],
    IDENTITY: ['collect_name', 'collect_dni', 'show_catalog'],
    SCHEDULING: ['check_slots', 'book_appointment'],
    CONFIRMED: ['send_confirmation'],
  },
  loopShield: { enabled: true, maxConsecutiveTools: 3 },
})

// Flow: GREETING → user shows interest → IDENTITY → collects data → SCHEDULING → booked → CONFIRMED
```

### Payment Gate (block everything except payment)

```typescript
const paymentFSM = createFSM({
  initialState: 'SHOPPING',
  states: ['SHOPPING', 'PAYMENT', 'CONFIRMED'],
  tools: {
    SHOPPING: ['browse', 'add_to_cart', 'checkout'],
    PAYMENT: ['process_payment', 'cancel_order'],  // only these two
    CONFIRMED: ['send_receipt'],
  },
})

// When entering PAYMENT, the adapter removes all shopping tools.
// The LLM can ONLY call process_payment or cancel_order.
```

### Conditional Tool: Admin vs User

```typescript
const registry: ToolEntry<{ role: 'user' | 'admin' }>[] = [
  { name: 'view_profile', gates: ['DASHBOARD'], build: () => ({ /* ... */ }) },
  {
    name: 'delete_user',
    gates: ['DASHBOARD'],
    condition: (ctx) => ctx.role === 'admin',
    build: () => ({ /* ... */ }),
  },
]

// Regular user → only view_profile
// Admin → view_profile + delete_user
```

---

## API Reference

### `createFSM(config)`

```typescript
interface FSMConfig {
  initialState: string
  states: string[]
  tools: Record<string, string[]>       // state → tool names
  loopShield?: LoopShieldConfig
}

interface FSMInstance {
  readonly currentState: string
  readonly allowedTools: string[]
  readonly isLooping: boolean
  transitionTo(state: string): void
}
```

### `buildToolsForGate(gate, ctx, registry)`

```typescript
interface ToolEntry<TContext = any> {
  name: string
  gates: string[]
  condition?: (ctx: TContext) => boolean    // optional runtime filter
  build: (ctx: TContext) => unknown          // returns the tool definition
}

function buildToolsForGate<TContext>(
  gate: string,
  ctx: TContext,
  registry: ToolEntry<TContext>[]
): Record<string, unknown>
```

### `createVercelAdapter(fsm, registry, context)`

```typescript
const adapter = createVercelAdapter(fsm, registry, context)

const { tools, prepareStep } = adapter.inject()
adapter.refreshGate('PAYMENT')   // external gate change (e.g., after DB mutation)
```

`prepareStep` automatically handles loop shield detection by counting consecutive tool steps from the history. When `maxConsecutiveTools` is exceeded, it returns `{ toolChoice: 'none' }`.

### `createOpenAIAdapter(fsm, registry, context)`

```typescript
const adapter = createOpenAIAdapter(fsm, registry, context)

const { tools } = adapter.inject()         // → { tools: OpenAI-formatted array }
adapter.isLooping()                         // → boolean (check before each API call)
adapter.registerToolCall()                  // → track tool call for loop shield
adapter.resetLoopShield()                   // → reset counter
adapter.refreshGate('PAYMENT')              // → external gate change
```

Since the OpenAI SDK is stateless, the consumer controls the orchestration loop. Use `isLooping()` to decide `tool_choice` and `registerToolCall()` after each API call that invoked tools.

### `createLoopShield(config)`

```typescript
interface LoopShieldConfig {
  enabled: boolean
  maxConsecutiveTools: number
}

const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 3 })
shield.registerToolCall()
shield.isLooping()   // boolean
shield.reset()
```

---

## Architecture

```
src/
├── core/
│   ├── machine.ts          # createFSM() — state management
│   ├── tool-gating.ts      # buildToolsForGate() — conditional tool injection
│   └── loop-shield.ts      # createLoopShield() — cognitive loop detection
├── adapters/
│   ├── vercel-ai.ts        # createVercelAdapter() — Vercel AI SDK
│   └── openai.ts           # createOpenAIAdapter() — OpenAI SDK
└── index.ts
```

- **Core has zero npm dependencies.** Only TypeScript types.
- **Adapters are optional.** `ai` and `openai` are optional peerDependencies.
- **`ToolEntry<TContext>`** is fully generic — you define your own context shape.

---

## Loop Shield

The loop shield prevents LLMs from entering infinite tool-calling loops.

- **Vercel adapter**: `prepareStep` counts consecutive tool steps from history and forces `toolChoice: 'none'` when `maxConsecutiveTools` is exceeded.
- **OpenAI adapter**: the consumer checks `isLooping()` before each API call and sets `tool_choice: 'none'` when it returns `true`. Calls `registerToolCall()` after each tool-invoking response.

---

## License

MIT
