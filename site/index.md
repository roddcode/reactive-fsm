---
layout: home

hero:
  name: reactive-fsm
  text: State-scoped tool availability for TypeScript AI agents
  tagline: Decide which tools an LLM can see in each conversation state, with a small state machine and a per-step tool budget.
  actions:
    - theme: brand
      text: Get started
      link: /guide/tool-gating
    - theme: alt
      text: GitHub
      link: https://github.com/roddcode/reactive-fsm

features:
  - title: State-scoped tools
    details: config.tools is the authority. A tool is only advertised if the state, its registry gates and its condition allow it.
  - title: Tool budget
    details: Count consecutive tool calls between steps, with a fallback state and an onLoop callback. It is an admission budget, not a per-call lock.
  - title: AI SDK 7 adapter
    details: A maintained adapter using prepareStep and activeTools with a stable ToolSet. No mutation of the tool object.
  - title: Zero runtime dependencies
    details: The core is small and ESM-only. AI SDK 7 is only needed if you use the Vercel adapter.
---

## Install

```bash
npm install reactive-fsm
```

Requires Node 20+.

## Minimal example

```ts
import { createFSM } from 'reactive-fsm'

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING'] as const,
  tools: {
    IDENTITY: ['validate_dni'],
    BOOKING: ['check_availability'],
  },
  loopShield: { enabled: true, maxConsecutiveTools: 3 },
})

fsm.transitionTo('BOOKING')
fsm.allowedTools // ['check_availability']
```

## Where to go next

- [Tool gating with AI SDK 7](/guide/tool-gating)
- [Tool-call budgets](/guide/tool-budget)
- [Native AI SDK vs reactive-fsm](/guide/native-comparison)
- [Contracts and limitations](/guide/limitations)
- [FAQ](/faq)
