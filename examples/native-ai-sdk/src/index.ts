import assert from 'node:assert/strict';
import { generateText, isStepCount, jsonSchema } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';

type State = 'IDENTITY' | 'BOOKING';

let state: State = 'IDENTITY';

const tools = {
  validate_dni: {
    description: 'Validate the customer DNI',
    inputSchema: jsonSchema({
      type: 'object',
      properties: { dni: { type: 'string' } },
      required: ['dni'],
    }),
    execute: async ({ dni }: { dni: string }) => {
      if (!dni) throw new Error('DNI is required');
      state = 'BOOKING';
      return { valid: true };
    },
  },
  check_availability: {
    description: 'Check available slots',
    inputSchema: jsonSchema({ type: 'object', properties: {} }),
    execute: async () => ({ slots: ['10:00', '11:00'] }),
  },
};

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function toolCall(toolCallId: string, toolName: string, input = '{}') {
  return {
    content: [{ type: 'tool-call' as const, toolCallId, toolName, input }],
    finishReason: { unified: 'tool-calls' as const, raw: undefined },
    usage,
    warnings: [],
  };
}

function text(value: string) {
  return {
    content: [{ type: 'text' as const, text: value }],
    finishReason: { unified: 'stop' as const, raw: undefined },
    usage,
    warnings: [],
  };
}

let call = 0;
const model = new MockLanguageModelV3({
  doGenerate: async () => {
    call++;
    if (call === 1) return toolCall('call-1', 'validate_dni', '{"dni":"123"}');
    if (call === 2) return toolCall('call-2', 'check_availability');
    return text('done');
  },
});

const result = await generateText({
  model,
  prompt: 'Start the flow',
  tools,
  prepareStep: async () => ({
    activeTools: (state === 'IDENTITY'
      ? ['validate_dni']
      : ['check_availability']) as Array<keyof typeof tools>,
  }),
  stopWhen: isStepCount(3),
});

assert.equal(state, 'BOOKING');
assert.equal(result.text, 'done');
assert.equal(model.doGenerateCalls.length, 3);

const firstTools = (model.doGenerateCalls[0].tools ?? []).map((tool) => tool.name);
const secondTools = (model.doGenerateCalls[1].tools ?? []).map((tool) => tool.name);

assert.ok(firstTools.includes('validate_dni'));
assert.ok(!firstTools.includes('check_availability'));
assert.ok(secondTools.includes('check_availability'));
assert.ok(!secondTools.includes('validate_dni'));

console.log('native AI SDK example OK');
