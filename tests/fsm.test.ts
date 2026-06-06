import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../src/core/machine';
import { buildToolsForGate } from '../src/core/tool-gating';
import { createLoopShield } from '../src/core/loop-shield';
import { createVercelAdapter } from '../src/adapters/vercel-ai';
import type { ToolEntry } from '../src/core/tool-gating';

// ─── Test 1: State Transition ────────────────────────────────────────────────

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

// ─── Test 2: Conditional Gating ──────────────────────────────────────────────

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

// ─── Test 3: Loop Shield ─────────────────────────────────────────────────────

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

// ─── Test 4: Loop Shield with Adapter ────────────────────────────────────────

describe('createVercelAdapter — Loop Shield via prepareStep', () => {
  interface Ctx {
    contactId: string;
  }

  const fsm = createFSM({
    initialState: 'IDENTITY',
    states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
    tools: {
      IDENTITY: ['validate_dni'],
      BOOKING: ['check_availability', 'reserve_slot'],
      PAYMENT: ['process_payment'],
    },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const registry: ToolEntry<Ctx>[] = [
    {
      name: 'validate_dni',
      gates: ['IDENTITY'],
      build: (ctx) => ({ description: `Validate DNI for ${ctx.contactId}`, execute: () => {} }),
    },
    {
      name: 'check_availability',
      gates: ['BOOKING'],
      build: () => ({ description: 'Check availability', execute: () => {} }),
    },
    {
      name: 'reserve_slot',
      gates: ['BOOKING'],
      build: () => ({ description: 'Reserve slot', execute: () => {} }),
    },
    {
      name: 'process_payment',
      gates: ['PAYMENT'],
      build: () => ({ description: 'Process payment', execute: () => {} }),
    },
  ];

  const adapter = createVercelAdapter(fsm, registry, { contactId: '123' });

  it('should inject tools for the current FSM gate', () => {
    const injected = adapter.inject();
    expect(Object.keys(injected.tools)).toEqual(['validate_dni']);
  });

  it('should inject updated tools after FSM transition', () => {
    fsm.transitionTo('BOOKING');
    const injected = adapter.inject();
    expect(Object.keys(injected.tools)).toEqual(['check_availability', 'reserve_slot']);
  });

  it('should NOT force toolChoice:none when under maxConsecutiveTools', async () => {
    // Simulate prepareStep with 2 tool calls
    const injected = adapter.inject();
    const result = await injected.prepareStep!({
      steps: [
        { toolCalls: [{ toolName: 't1' }] },
        { toolCalls: [{ toolName: 't2' }] },
      ],
      stepNumber: 3,
    });
    // Should not force stop yet (only 2 consecutive tools so far)
    expect(result).toEqual({});
  });

  it('should force toolChoice:none when maxConsecutiveTools reached', async () => {
    // Reset the FSM loop shield first
    fsm._resetLoopShield();
    // Simulate 3 consecutive tool calls reaching step 4
    const injected = adapter.inject();
    const result = await injected.prepareStep!({
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

  it('should inject gate refresh when state changed externally', async () => {
    // The adapter provides an onStateChange hook for gate refresh
    // Simulate external state change
    adapter.refreshGate('PAYMENT');
    const injected = adapter.inject();
    expect(Object.keys(injected.tools)).toEqual(['process_payment']);
  });
});

// ─── Test 5: Gate Refresh ────────────────────────────────────────────────────

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

// ─── Test 6: buildToolsForGate with empty registry ───────────────────────────

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
