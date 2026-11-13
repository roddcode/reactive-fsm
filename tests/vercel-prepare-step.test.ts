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
    name: 'b',
    gates: ['B'],
    build: () => ({
      description: 'Tool B',
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

  it('does not count a previous-state call after a transition', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: ['a'], B: ['b'] },
      loopShield: { enabled: true, maxConsecutiveTools: 1 },
    });
    const adapter = createVercelAdapter(fsm, registry, {});
    const injected = adapter.inject();

    const first = await injected.prepareStep({ steps: [], stepNumber: 0 });
    expect(first).toEqual({ activeTools: ['a'] });

    fsm.transitionTo('B');

    const second = await injected.prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }] }],
      stepNumber: 1,
    });

    expect(second).toEqual({ activeTools: ['b'] });
  });

  it('still enforces the budget when the state does not change', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: ['a'] },
      loopShield: { enabled: true, maxConsecutiveTools: 1 },
    });
    const adapter = createVercelAdapter(fsm, registry, {});
    const injected = adapter.inject();

    await injected.prepareStep({ steps: [], stepNumber: 0 });

    const second = await injected.prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }] }],
      stepNumber: 1,
    });

    expect(second).toEqual({ toolChoice: 'none' });
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
