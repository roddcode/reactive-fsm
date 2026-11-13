# Native AI SDK 7 example

The same IDENTITY → BOOKING flow as `examples/ai-sdk-7`, but without `reactive-fsm`. It uses only AI SDK 7 `prepareStep` and `activeTools`.

```bash
cd examples/native-ai-sdk
npm install
npm test
```

It runs with `MockLanguageModelV3`, so it needs no API key. Use it as the baseline for the comparison guide.
