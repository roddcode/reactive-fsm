import { describe, it, expect } from 'vitest';
import { generateText, isStepCount, jsonSchema } from 'ai';
import { MockLanguageModelV3 } from 'ai/test';
import { createFSM, createVercelAdapter } from '../src/index';
import type { ToolEntry } from '../src/index';

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 1, text: 1, reasoning: 0 },
};

function toolCall(toolCallId: string, toolName: string) {
  return {
    content: [{ type: 'tool-call' as const, toolCallId, toolName, input: '{}' }],
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

describe('Vercel AI SDK 7 — generateText integration', () => {
  it('executes a tool in state A, transitions to B, and activates B tools', async () => {
    const fsm = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING'],
      tools: {
        IDENTITY: ['validate_dni'],
        BOOKING: ['check_availability'],
      },
      // A transition resets the budget. The previous state's call must not
      // consume BOOKING's first (and only) slot.
      loopShield: { enabled: true, maxConsecutiveTools: 1 },
    });

    const registry: ToolEntry<{}>[] = [
      {
        name: 'validate_dni',
        gates: ['IDENTITY'],
        build: () => ({
          description: 'Validate the DNI',
          inputSchema: jsonSchema({ type: 'object', properties: {} }),
          execute: async () => {
            fsm.transitionTo('BOOKING');
            return { valid: true };
          },
        }),
      },
      {
        name: 'check_availability',
        gates: ['BOOKING'],
        build: () => ({
          description: 'Check availability',
          inputSchema: jsonSchema({ type: 'object', properties: {} }),
          execute: async () => ({ available: true }),
        }),
      },
    ];

    let call = 0;
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        call++;
        if (call === 1) return toolCall('call-1', 'validate_dni');
        if (call === 2) return toolCall('call-2', 'check_availability');
        return text('done');
      },
    });

    const adapter = createVercelAdapter(fsm, registry, {});
    const result = await generateText({
      model,
      prompt: 'Start the flow',
      ...adapter.inject(),
      stopWhen: isStepCount(3),
    });

    expect(fsm.currentState).toBe('BOOKING');
    expect(result.text).toBe('done');
    expect(model.doGenerateCalls).toHaveLength(3);

    const firstTools = (model.doGenerateCalls[0].tools ?? []).map((tool) => tool.name);
    const secondTools = (model.doGenerateCalls[1].tools ?? []).map((tool) => tool.name);

    expect(firstTools).toContain('validate_dni');
    expect(firstTools).not.toContain('check_availability');
    expect(secondTools).toContain('check_availability');
    expect(secondTools).not.toContain('validate_dni');
  });
});
