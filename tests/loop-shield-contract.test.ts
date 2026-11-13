import { describe, it, expect, vi } from 'vitest';
import { createFSM, createLoopShield, createVercelAdapter } from '../src/index';
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
];

describe('loop shield contract', () => {
  it('fires onLoop once per episode, not on every call past the threshold', () => {
    const onLoop = vi.fn();
    const shield = createLoopShield({
      enabled: true,
      maxConsecutiveTools: 2,
      onLoop,
    });

    shield.registerToolCall('a');
    shield.registerToolCall('a');
    shield.registerToolCall('a');
    shield.registerToolCall('a');

    expect(onLoop).toHaveBeenCalledTimes(1);
    expect(onLoop).toHaveBeenCalledWith({ consecutiveTools: 2, maxAllowed: 2 });

    shield.reset();
    shield.registerToolCall('a');
    shield.registerToolCall('a');

    expect(onLoop).toHaveBeenCalledTimes(2);
  });

  it('requires a tool name in repeated mode', () => {
    const shield = createLoopShield({
      enabled: true,
      maxConsecutiveTools: 2,
      mode: 'repeated',
    });

    expect(() => shield.registerToolCall()).toThrow('toolName is required');
  });

  it('rejects non-positive or non-finite thresholds', () => {
    expect(() =>
      createLoopShield({ enabled: true, maxConsecutiveTools: 0 }),
    ).toThrow('positive number');
    expect(() =>
      createLoopShield({ enabled: true, maxConsecutiveTools: Number.NaN }),
    ).toThrow('positive number');
  });

  it('resets the budget on a state transition', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      loopShield: { enabled: true, maxConsecutiveTools: 2 },
    });

    fsm._registerToolCall();
    expect(fsm.isLooping).toBe(false);

    fsm.transitionTo('B');
    expect(fsm.isLooping).toBe(false);

    fsm._registerToolCall();
    expect(fsm.isLooping).toBe(false);

    fsm._registerToolCall();
    expect(fsm.isLooping).toBe(true);
  });

  it('counts a multi-call step and fires onLoop once', async () => {
    const onLoop = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: ['a'] },
      loopShield: { enabled: true, maxConsecutiveTools: 2, onLoop },
    });
    const adapter = createVercelAdapter(fsm, registry, {});

    const result = await adapter.inject().prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }, { toolName: 'a' }] }],
      stepNumber: 1,
    });

    expect(result).toEqual({ toolChoice: 'none' });
    expect(onLoop).toHaveBeenCalledTimes(1);
  });

  it('does not re-fire when prepareStep is called again for the same steps', async () => {
    const onLoop = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: ['a'] },
      loopShield: { enabled: true, maxConsecutiveTools: 2, onLoop },
    });
    const injected = createVercelAdapter(fsm, registry, {}).inject();
    const first = await injected.prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }, { toolName: 'a' }] }],
      stepNumber: 1,
    });
    const second = await injected.prepareStep({
      steps: [{ toolCalls: [{ toolName: 'a' }, { toolName: 'a' }] }],
      stepNumber: 2,
    });

    expect(first).toEqual({ toolChoice: 'none' });
    expect(second).toEqual({ toolChoice: 'none' });
    expect(onLoop).toHaveBeenCalledTimes(1);
  });
});
