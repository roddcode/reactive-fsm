import assert from 'node:assert/strict';
import { generateText, isStepCount, jsonSchema } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { createFSM, createVercelAdapter } from 'reactive-fsm';
import type { ToolEntry } from 'reactive-fsm';

interface Ctx {
  contactId: string;
}

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING'] as const,
  tools: {
    IDENTITY: ['validate_dni'],
    BOOKING: ['check_availability'],
  },
  // A transition resets the budget. The previous state's call must not consume
  // BOOKING's first (and only) slot.
  loopShield: { enabled: true, maxConsecutiveTools: 1 },
});

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
        if (!dni) throw new Error('DNI is required');
        fsm.transitionTo('BOOKING');
        return { valid: true };
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
];

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

const adapter = createVercelAdapter(fsm, registry, { contactId: 'demo' });

const result = await generateText({
  model,
  prompt: 'Start the flow',
  ...adapter.inject(),
  stopWhen: isStepCount(3),
});

assert.equal(fsm.currentState, 'BOOKING');
assert.equal(result.text, 'done');
assert.equal(model.doGenerateCalls.length, 3);

const firstTools = (model.doGenerateCalls[0].tools ?? []).map((tool) => tool.name);
const secondTools = (model.doGenerateCalls[1].tools ?? []).map((tool) => tool.name);

assert.ok(firstTools.includes('validate_dni'));
assert.ok(!firstTools.includes('check_availability'));
assert.ok(secondTools.includes('check_availability'));
assert.ok(!secondTools.includes('validate_dni'));

console.log('ai-sdk-7 example OK');
