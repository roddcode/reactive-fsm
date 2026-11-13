# AI SDK 7 example

This example consumes the packed `reactive-fsm` package, not `src/`.

```bash
# From the repository root
npm pack

cd examples/ai-sdk-7
npm install
npm install ../../reactive-fsm-2.0.2.tgz
npm test
```

The example runs `generateText` with `MockLanguageModelV3`, so it needs no API key. It demonstrates:

- `validate_dni` in IDENTITY;
- a transition to BOOKING;
- `check_availability` active in the next step;
- `loopShield.maxConsecutiveTools = 1` without blocking BOOKING.
