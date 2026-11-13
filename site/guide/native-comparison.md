# Native AI SDK vs reactive-fsm

**Short answer:** if your flow has two states and one provider, `prepareStep` + `activeTools` may be enough. `reactive-fsm` is for flows where the tool policy, guards and budget are easier to reason about as a separate, testable unit.

Both examples run the same IDENTITY → BOOKING flow with `MockLanguageModelV3` and no API key.

## Native AI SDK 7

```ts
let state: 'IDENTITY' | 'BOOKING' = 'IDENTITY'

const tools = {
  validate_dni: {
    inputSchema: jsonSchema({ type: 'object', properties: { dni: { type: 'string' } } }),
    execute: async () => {
      state = 'BOOKING'
      return { valid: true }
    },
  },
  check_availability: {
    inputSchema: jsonSchema({ type: 'object', properties: {} }),
    execute: async () => ({ slots: ['10:00'] }),
  },
}

await generateText({
  model,
  tools,
  prepareStep: async () => ({
    activeTools: state === 'IDENTITY'
      ? ['validate_dni']
      : ['check_availability'],
  }),
  stopWhen: isStepCount(3),
})
```

The state, the policy and the budget live in the application. There is no extra dependency.

## With reactive-fsm

```ts
const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING'] as const,
  tools: {
    IDENTITY: ['validate_dni'],
    BOOKING: ['check_availability'],
  },
  loopShield: { enabled: true, maxConsecutiveTools: 1 },
})

const adapter = createVercelAdapter(fsm, registry, context)

await generateText({
  model,
  ...adapter.inject(),
  stopWhen: isStepCount(3),
})
```

The policy is declarative, the state is explicit, and the budget is part of the same object. The cost is one dependency and one more abstraction.

## Tradeoffs

| Concern | Native AI SDK | reactive-fsm |
|---|---|---|
| Two or three states | Simple | Slightly more setup |
| Many states and conditions | Policy spreads through the app | One config + registry |
| Tool budget | You implement it | Built in, with tests |
| Async guards | You implement them | `transitionToAsync` |
| Snapshot | You implement it | State only |
| Provider lock-in | AI SDK | AI SDK for the maintained adapter |
| Runtime dependencies | AI SDK only | Zero for the core |

## When to use the native version

- You have one provider and a small, stable tool set.
- The state is a local variable and does not need guards or snapshots.
- You do not need a tool budget.

## When reactive-fsm helps

- The valid tool set changes across several states.
- You want the policy in one place, separate from the model call.
- You need a budget, fallback state or async guards with tests.
- You want the same policy to survive a provider change.

## Runnable examples

- [`examples/native-ai-sdk`](https://github.com/roddcode/reactive-fsm/tree/main/examples/native-ai-sdk)
- [`examples/ai-sdk-7`](https://github.com/roddcode/reactive-fsm/tree/main/examples/ai-sdk-7)

If the native version is enough for your case, use it. The library only earns its place when the policy is complex enough to justify a separate abstraction.

## Next

- [Contracts and limitations](/guide/limitations)
- [FAQ](/faq)
