import { beforeEach, describe, it, expect, vi } from 'vitest';
import { createFSM } from '../src/core/machine';
import { buildToolsForGate } from '../src/core/tool-gating';
import { createLoopShield } from '../src/core/loop-shield';
import { createVercelAdapter } from '../src/adapters/vercel-ai';
import type { ToolEntry } from '../src/core/tool-gating';

// Test 1: State Transition
describe('createFSM — State Transition', () => {
  const fsm = createFSM({
    initialState: 'IDENTITY',
    states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
    tools: {
      IDENTITY: ['validate_dni'],
      BOOKING: ['check_availability', 'reserve_slot'],
      PAYMENT: ['process_payment'],
    },
  });

  it('should start at the initial state', () => {
    expect(fsm.currentState).toBe('IDENTITY');
  });

  it('should expose allowed tools for the initial state', () => {
    expect(fsm.allowedTools).toEqual(['validate_dni']);
  });

  it('should transition to a new state and update allowedTools', () => {
    fsm.transitionTo('BOOKING');
    expect(fsm.currentState).toBe('BOOKING');
    expect(fsm.allowedTools).toEqual(['check_availability', 'reserve_slot']);
  });

  it('should transition to PAYMENT and update allowedTools', () => {
    fsm.transitionTo('PAYMENT');
    expect(fsm.currentState).toBe('PAYMENT');
    expect(fsm.allowedTools).toEqual(['process_payment']);
  });

  it('should throw when transitioning to an invalid state', () => {
    expect(() => fsm.transitionTo('NONEXISTENT' as any)).toThrow();
  });
});

// Test 2: Conditional Gating
describe('buildToolsForGate — Conditional Gating', () => {
  interface MyContext {
    isAdmin: boolean;
  }

  const registry: ToolEntry<MyContext>[] = [
    {
      name: 'public_tool',
      gates: ['IDENTITY', 'BOOKING'],
      build: (ctx) => ({ description: 'Public tool', execute: () => {} }),
    },
    {
      name: 'admin_tool',
      gates: ['IDENTITY', 'BOOKING'],
      condition: (ctx) => ctx.isAdmin,
      build: (ctx) => ({ description: 'Admin tool', execute: () => {} }),
    },
  ];

  it('should include tools without conditions', () => {
    const tools = buildToolsForGate('IDENTITY', { isAdmin: false }, registry);
    expect(Object.keys(tools)).toContain('public_tool');
  });

  it('should exclude tools whose condition returns false', () => {
    const tools = buildToolsForGate('IDENTITY', { isAdmin: false }, registry);
    expect(Object.keys(tools)).not.toContain('admin_tool');
  });

  it('should include tools whose condition returns true', () => {
    const tools = buildToolsForGate('IDENTITY', { isAdmin: true }, registry);
    expect(Object.keys(tools)).toContain('admin_tool');
  });

  it('should only return tools active for the given gate', () => {
    const registry2: ToolEntry<{}>[] = [
      { name: 't1', gates: ['IDENTITY'], build: () => ({}) },
      { name: 't2', gates: ['BOOKING'], build: () => ({}) },
    ];
    const tools = buildToolsForGate('IDENTITY', {}, registry2);
    expect(Object.keys(tools)).toEqual(['t1']);
  });

  it('should call build() with the provided context', () => {
    const buildSpy = vi.fn((ctx: { x: number }) => ({ value: ctx.x }));
    const registry3: ToolEntry<{ x: number }>[] = [
      { name: 'spy_tool', gates: ['BOOKING'], build: buildSpy },
    ];
    buildToolsForGate('BOOKING', { x: 42 }, registry3);
    expect(buildSpy).toHaveBeenCalledWith({ x: 42 });
  });
});

// Test 3: Loop Shield
describe('Loop Shield', () => {
  it('should not trigger when under maxConsecutiveTools', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 3 });
    shield.registerToolCall();
    shield.registerToolCall();
    expect(shield.isLooping()).toBe(false);
  });

  it('should trigger when reaching maxConsecutiveTools', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 3 });
    shield.registerToolCall();
    shield.registerToolCall();
    shield.registerToolCall();
    expect(shield.isLooping()).toBe(true);
  });

  it('should remain looping after triggered', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 2 });
    shield.registerToolCall();
    shield.registerToolCall();
    expect(shield.isLooping()).toBe(true);
    shield.registerToolCall();
    expect(shield.isLooping()).toBe(true);
  });

  it('should reset the counter', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 2 });
    shield.registerToolCall();
    shield.registerToolCall();
    expect(shield.isLooping()).toBe(true);
    shield.reset();
    expect(shield.isLooping()).toBe(false);
  });

  it('should never trigger when disabled', () => {
    const shield = createLoopShield({ enabled: false, maxConsecutiveTools: 1 });
    shield.registerToolCall();
    shield.registerToolCall();
    shield.registerToolCall();
    expect(shield.isLooping()).toBe(false);
  });

  it('should be integrated with createFSM loopShield config', () => {
    const fsm = createFSM({
      initialState: 'S1',
      states: ['S1', 'S2'],
      tools: { S1: ['t1'], S2: ['t2'] },
      loopShield: { enabled: true, maxConsecutiveTools: 3 },
    });

    expect(fsm.isLooping).toBe(false);
    fsm._registerToolCall();
    fsm._registerToolCall();
    expect(fsm.isLooping).toBe(false);
    fsm._registerToolCall();
    expect(fsm.isLooping).toBe(true);
  });
});

// Test 4: Loop Shield with Adapter
describe('createVercelAdapter — AI SDK 7 prepareStep', () => {
  interface Ctx {
    contactId: string;
  }

  const registry: ToolEntry<Ctx>[] = [
    {
      name: 'validate_dni',
      gates: ['IDENTITY'],
      build: (ctx) => ({
        description: `Validate DNI for ${ctx.contactId}`,
        inputSchema: { type: 'object', properties: {} },
        execute: () => {},
      }),
    },
    {
      name: 'check_availability',
      gates: ['BOOKING'],
      build: () => ({
        description: 'Check availability',
        inputSchema: { type: 'object', properties: {} },
        execute: () => {},
      }),
    },
    {
      name: 'reserve_slot',
      gates: ['BOOKING'],
      build: () => ({
        description: 'Reserve slot',
        inputSchema: { type: 'object', properties: {} },
        execute: () => {},
      }),
    },
    {
      name: 'process_payment',
      gates: ['PAYMENT'],
      build: () => ({
        description: 'Process payment',
        inputSchema: { type: 'object', properties: {} },
        execute: () => {},
      }),
    },
  ];

  let fsm: ReturnType<typeof createFSM>;
  let adapter: ReturnType<typeof createVercelAdapter<Ctx>>;

  beforeEach(() => {
    fsm = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
      tools: {
        IDENTITY: ['validate_dni'],
        BOOKING: ['check_availability', 'reserve_slot'],
        PAYMENT: ['process_payment'],
      },
      loopShield: { enabled: true, maxConsecutiveTools: 3 },
    });
    adapter = createVercelAdapter(fsm, registry, { contactId: '123' });
  });

  async function activeTools(): Promise<string[]> {
    const injected = adapter.inject();
    const result = await injected.prepareStep({ steps: [], stepNumber: 0 });
    return (result.activeTools ?? []).sort();
  }

  it('exposes all registry tools but activates only the current gate', async () => {
    const injected = adapter.inject();
    expect(Object.keys(injected.tools).sort()).toEqual([
      'check_availability',
      'process_payment',
      'reserve_slot',
      'validate_dni',
    ]);
    expect(await activeTools()).toEqual(['validate_dni']);
  });

  it('activates the new gate after FSM transition', async () => {
    fsm.transitionTo('BOOKING');
    expect(await activeTools()).toEqual(['check_availability', 'reserve_slot']);
  });

  it('does not force toolChoice:none under maxConsecutiveTools', async () => {
    const result = await adapter.inject().prepareStep({
      steps: [
        { toolCalls: [{ toolName: 't1' }] },
        { toolCalls: [{ toolName: 't2' }] },
      ],
      stepNumber: 3,
    });
    expect(result).toEqual({ activeTools: ['validate_dni'] });
  });

  it('forces toolChoice:none when maxConsecutiveTools reached', async () => {
    const result = await adapter.inject().prepareStep({
      steps: [
        {},
        { toolCalls: [{ toolName: 't1' }] },
        { toolCalls: [{ toolName: 't2' }] },
        { toolCalls: [{ toolName: 't3' }] },
      ],
      stepNumber: 4,
    });
    expect(result).toEqual({ toolChoice: 'none' as const });
  });

  it('activates the refreshed gate', async () => {
    adapter.refreshGate('PAYMENT');
    expect(await activeTools()).toEqual(['process_payment']);
  });
});

// Test 5: Gate Refresh
describe('Gate Refresh', () => {
  it('should update allowedTools when the gate is refreshed externally', () => {
    const fsm = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING'],
      tools: {
        IDENTITY: ['validate_dni'],
        BOOKING: ['check_availability', 'reserve_slot'],
      },
    });

    expect(fsm.allowedTools).toEqual(['validate_dni']);

    // Simulate external state mutation (e.g., DB change detected by adapter)
    fsm._setState('BOOKING');
    expect(fsm.currentState).toBe('BOOKING');
    expect(fsm.allowedTools).toEqual(['check_availability', 'reserve_slot']);
  });
});

// Test 6: buildToolsForGate with empty registry
describe('buildToolsForGate — edge cases', () => {
  it('should return empty object for gate with no matching tools', () => {
    const registry: ToolEntry<{}>[] = [
      { name: 't1', gates: ['IDENTITY'], build: () => ({}) },
    ];
    const tools = buildToolsForGate('BOOKING', {}, registry);
    expect(tools).toEqual({});
  });

  it('should return empty object for empty registry', () => {
    const tools = buildToolsForGate('IDENTITY', {}, []);
    expect(tools).toEqual({});
  });
});
