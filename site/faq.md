# FAQ

## Does reactive-fsm authorize tool execution?

No. It controls which tools are advertised to the model. Your application must validate arguments and enforce permissions.

## Is it a full FSM?

It is a minimal state container with guards, not a statechart engine. Any valid state can transition to any other state unless a guard blocks it.

## Does it work with AI SDK 4?

No. The maintained Vercel adapter targets AI SDK 7 (`prepareStep` + `activeTools`). `ai@4` is not supported by `2.x`.

## Does the tool budget stop parallel calls in the same step?

No. It is an admission budget between steps. Multiple calls inside one step can exceed it. For a strict limit, enforce it in `execute` or in your execution layer.

## Does it persist conversation context?

No. `snapshot()` stores only the current state. Context, messages and budget counters are owned by your application.

## Does it support streaming?

The contract test uses `generateText`; `streamText` is not covered yet. The adapter uses the same `prepareStep` contract, but it has not been verified with a streaming test.

## Can I use it without Vercel AI SDK?

The core (`createFSM`, `buildToolsForGate`, `createLoopShield`) has no provider dependency. The maintained adapter is Vercel AI SDK 7. The other adapters are experimental.

## Is the Vercel adapter official?

No. It is maintained and contract-tested by this project, but it is not affiliated with or endorsed by Vercel.

## How do I migrate from 1.x?

See the [migration guide](https://github.com/roddcode/reactive-fsm/blob/main/docs/migrations/1.x-to-2.0.0.md). The main changes are `config.tools` as the authority, AI SDK 7 for the Vercel adapter, stale async transitions rejecting, and literal state types.
