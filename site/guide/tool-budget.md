# Tool-call budgets

**Short answer:** `loopShield` counts consecutive tool calls between steps. It can stop the next step, but it is not a strict per-call lock inside a single step.

## What counts

- A tool call is registered after a step completes.
- A text-only step breaks the consecutive run and resets the counter.
- A state transition resets the counter.
- `onLoop` fires once per episode, not on every call past the threshold.

## Modes

```ts
loopShield: {
  enabled: true,
  maxConsecutiveTools: 3,
  mode: 'consecutive', // or 'repeated'
}
```

- `consecutive`: counts any consecutive tool calls.
- `repeated`: counts consecutive calls to the same tool. It requires a tool name; without one, the shield throws.

## Fallback

```ts
loopShield: {
  enabled: true,
  maxConsecutiveTools: 2,
  fallbackState: 'ESCALATION',
  onLoop: ({ consecutiveTools, maxAllowed }) => {
    console.warn(`budget reached: ${consecutiveTools}/${maxAllowed}`)
  },
}
```

When the budget trips, the FSM moves to `fallbackState`, resets the budget and fires `onLoop` once. The Vercel adapter then activates the fallback state's tools instead of returning `toolChoice: 'none'`.

If no fallback is configured, the adapter returns `toolChoice: 'none'` for the next step.

## The limitation

`prepareStep` runs **before** the next model step. It cannot prevent four parallel tool calls in the current step when only two budget slots remain.

That means:

- The budget is an admission budget between steps.
- A single step can exceed it.
- If you need a strict limit, enforce it in your `execute` function or in your execution layer.

## Adversarial cases to test

1. A step with multiple tool calls counts each call.
2. A text-only step resets the counter.
3. A state transition does not carry the previous state's calls into the new budget.
4. `onLoop` fires once per episode.
5. `repeated` without a tool name throws.
6. A fallback state activates its tools and resets the shield.

The repository tests cover these cases in `tests/loop-shield-contract.test.ts` and `tests/vercel-prepare-step.test.ts`.

## Next

- [Native AI SDK vs reactive-fsm](/guide/native-comparison)
- [Contracts and limitations](/guide/limitations)
