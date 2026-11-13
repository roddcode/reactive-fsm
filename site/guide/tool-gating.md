# Tool gating with AI SDK 7

**Short answer:** use `prepareStep` and `activeTools` from AI SDK 7. `reactive-fsm` adds a small state policy and a tool budget on top of those primitives.

## The problem

A model can call a tool that does not make sense for the current step: asking for a payment before collecting identity, browsing after checkout, or repeating the same lookup because it does not know the flow advanced.

The model only knows the tools you advertise. If a tool is not in the request, the model is much less likely to call it.

## The policy

For the current state, `reactive-fsm` advertises a tool only if all three are true:

1. It appears in `config.tools[currentState]`.
2. Its `registry.gates` includes the current state.
3. Its `condition`, if present, returns `true`.

`config.tools` is the authority. The registry cannot add a tool that the state does not allow.

## AI SDK 7 integration

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

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'Hola, quiero reservar una cita',
  ...adapter.inject(),
  stopWhen: isStepCount(5),
})
```

## What the adapter does

- `inject().tools` contains the full `ToolSet` for the run.
- `prepareStep` returns `activeTools` with only the tools allowed by the current state.
- The adapter does not mutate the `tools` object.
- When the state changes during a tool execution, the next step activates the new state's tools.

This is why the `ToolSet` must contain tools from future states: AI SDK's `activeTools` can only enable a tool that already exists in the set.

## Runnable example

[`examples/ai-sdk-7`](https://github.com/roddcode/reactive-fsm/tree/main/examples/ai-sdk-7) runs the flow with `MockLanguageModelV3` and no API key.

## Next

- [Tool-call budgets](/guide/tool-budget)
- [Native AI SDK vs reactive-fsm](/guide/native-comparison)
