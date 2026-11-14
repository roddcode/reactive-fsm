import { describe, it, expect } from 'vitest';
import { createFSM, createVercelAdapter } from '../src/index';
import type { ToolEntry } from '../src/index';

describe('Vercel registry contract', () => {
  it('rejects duplicate tool names across states', () => {
    const fsm = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'PAYMENT'] as const,
      tools: {
        IDENTITY: ['charge'],
        PAYMENT: ['charge'],
      },
    });

    const registry: ToolEntry<{}>[] = [
      {
        name: 'charge',
        gates: ['IDENTITY'],
        build: () => ({
          inputSchema: { type: 'object', properties: {} },
          execute: async () => 'identity',
        }),
      },
      {
        name: 'charge',
        gates: ['PAYMENT'],
        build: () => ({
          inputSchema: { type: 'object', properties: {} },
          execute: async () => 'payment',
        }),
      },
    ];

    const adapter = createVercelAdapter(fsm, registry, {});

    expect(() => adapter.inject()).toThrow(/duplicate.*charge/i);
  });
});

describe('fallback callback errors', () => {
  it('resets the shield even when onTransition throws', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'ESC'],
      tools: { A: [], ESC: [] },
      loopShield: {
        enabled: true,
        maxConsecutiveTools: 1,
        fallbackState: 'ESC',
      },
      onTransition: () => {
        throw new Error('boom');
      },
    });

    expect(() => fsm._registerToolCall()).toThrow('boom');
    expect(fsm.currentState).toBe('ESC');
    expect(fsm.isLooping).toBe(false);
  });
});
