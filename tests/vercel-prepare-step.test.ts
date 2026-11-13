import { describe, it, expect } from 'vitest';
import { createFSM, createVercelAdapter } from '../src/index';
import type { ToolEntry } from '../src/index';

const registry: ToolEntry<{}>[] = [
  {
    name: 'a',
    gates: ['A'],
    build: () => ({
      description: 'Tool A',
      inputSchema: { type: 'object', properties: {} },
      execute: () => {},
    }),
  },
  {
    name: 'esc',
    gates: ['ESC'],
    build: () => ({
      description: 'Escalation tool',
      inputSchema: { type: 'object', properties: {} },
      execute: () => {},
    }),
  },
];

describe('createVercelAdapter — AI SDK 7 prepareStep', () => {
  it('counts every tool call in a multi-call step', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: ['a'] },
      loopShield: { enabled: true, maxConsecutiveTools: 2 },
    });
    const adapter = createVercelAdapter(fsm, registry, {});

    const result = await adapter.inject().prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }, { toolName: 'a' }] }],
      stepNumber: 1,
    });

    expect(result).toEqual({ toolChoice: 'none' });
  });

  it('activates fallback tools and resets the shield', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'ESC'],
      tools: { A: ['a'], ESC: ['esc'] },
      loopShield: {
        enabled: true,
        maxConsecutiveTools: 1,
        fallbackState: 'ESC',
      },
    });
    const adapter = createVercelAdapter(fsm, registry, {});

    const result = await adapter.inject().prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }] }],
      stepNumber: 1,
    });

    expect(fsm.currentState).toBe('ESC');
    expect(fsm.isLooping).toBe(false);
    expect(result).toEqual({ activeTools: ['esc'] });
  });
});
