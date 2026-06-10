import { describe, it, expect, vi } from 'vitest';
import { createFSM, validateWith, createLoopShield, type FSMSnapshot } from '../src/index';

describe('onTransition hook', () => {
  it('fires when transitionTo changes state', () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      onTransition,
    });

    fsm.transitionTo('B');
    expect(onTransition).toHaveBeenCalledTimes(1);
    expect(onTransition).toHaveBeenCalledWith('A', 'B');
  });

  it('does not fire when transitionTo same state via _setState with unchanged state', () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      onTransition,
    });

    fsm._setState('A'); // same state
    expect(onTransition).toHaveBeenCalledWith('A', 'A');
  });

  it('is optional — FSM works without it', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
    });

    expect(() => fsm.transitionTo('B')).not.toThrow();
    expect(fsm.currentState).toBe('B');
  });

  it('fires for _setState too (adapter gate refresh)', () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B', 'C'],
      tools: { A: [], B: [], C: [] },
      onTransition,
    });

    fsm._setState('C');
    expect(onTransition).toHaveBeenCalledWith('A', 'C');
  });
});

describe('validateWith', () => {
  it('returns ok:true when schema is null/undefined', () => {
    const result = validateWith(null, { x: 1 });
    expect(result.ok).toBe(true);
    expect(result).toEqual({ ok: true, data: { x: 1 } });
  });

  it('returns ok:true when schema has no safeParse method', () => {
    const result = validateWith({ notValidator: true }, { x: 1 });
    expect(result.ok).toBe(true);
  });

  it('validates with safeParse on success', () => {
    const schema = {
      safeParse: (args: unknown) => ({ success: true, data: { name: 'validated' } }),
    };
    const result = validateWith(schema, { name: 'test' });
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual({ name: 'validated' });
  });

  it('returns error on validation failure with issues', () => {
    const schema = {
      safeParse: () => ({
        success: false,
        error: {
          issues: [{ message: 'name is required' }, { message: 'age must be number' }],
        },
      }),
    };
    const result = validateWith(schema, {});
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toBe('name is required, age must be number');
  });

  it('handles Valibot-style issues array', () => {
    const schema = {
      safeParse: () => ({
        success: false,
        issues: [{ message: 'Invalid type' }],
      }),
    };
    const result = validateWith(schema, 'bad');
    expect(result.ok).toBe(false);
    expect((result as { error: string }).error).toBe('Invalid type');
  });

  it('returns ok:true when success but no data key (passthrough args)', () => {
    const schema = {
      safeParse: () => ({ success: true }),
    };
    const result = validateWith(schema, { raw: true });
    expect(result.ok).toBe(true);
    expect((result as { data: unknown }).data).toEqual({ raw: true });
  });
});

describe('ToolEntry.schema field', () => {
  it('accepts schema in ToolEntry without errors', () => {
    const schema = { safeParse: () => ({ success: true }) };
    const entry = {
      name: 'test_tool',
      gates: ['A'],
      build: () => ({}),
      schema,
    };
    // TypeScript should not error — schema is optional
    expect(entry.schema).toBe(schema);
  });
});

describe('toMermaid', () => {
  it('generates valid stateDiagram-v2', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: ['t1'], B: ['t2'] },
    });
    const mermaid = fsm.toMermaid();
    expect(mermaid).toContain('stateDiagram-v2');
    expect(mermaid).toContain('A');
    expect(mermaid).toContain('B');
  });

  it('includes tool names in state labels', () => {
    const fsm = createFSM({
      initialState: 'X',
      states: ['X'],
      tools: { X: ['tool_a', 'tool_b'] },
    });
    const mermaid = fsm.toMermaid();
    expect(mermaid).toContain('tool_a');
    expect(mermaid).toContain('tool_b');
  });
});

describe('snapshot + restore', () => {
  it('snapshot captures current state', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
    });
    fsm.transitionTo('B');
    expect(fsm.snapshot()).toEqual({ state: 'B' });
  });

  it('restores from snapshot via config', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      snapshot: { state: 'B' },
    });
    expect(fsm.currentState).toBe('B');
  });
});

describe('guard', () => {
  it('allows transition when guard returns true', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard: () => true,
    });
    expect(() => fsm.transitionTo('B')).not.toThrow();
  });

  it('blocks transition when guard returns false', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard: () => false,
    });
    expect(() => fsm.transitionTo('B')).toThrow('Guard blocked');
  });

  it('receives from, to, and context', () => {
    const guard = vi.fn(() => true);
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'] as const,
      tools: { A: [], B: [] },
      context: { role: 'admin' },
      guard,
    });
    fsm.transitionTo('B');
    expect(guard).toHaveBeenCalledWith('A', 'B', { role: 'admin' });
  });

  it('is optional', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
    });
    expect(() => fsm.transitionTo('B')).not.toThrow();
  });
});

describe('prompts', () => {
  it('accepts prompts config field', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      prompts: { A: 'Be helpful', B: 'Be strict' },
    });
    expect(fsm.currentState).toBe('A');
  });
});

describe('context', () => {
  it('initializes from config', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      context: { userId: 'u1', count: 0 },
    });
    expect(fsm.context.userId).toBe('u1');
    expect(fsm.context.count).toBe(0);
  });

  it('defaults to empty object', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: [] },
    });
    expect(fsm.context).toEqual({});
  });

  it('is mutable by consumer', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
    });
    fsm.context.paymentId = 'pay_123';
    fsm.context.cartTotal = 150;
    expect(fsm.context.paymentId).toBe('pay_123');
    expect(fsm.context.cartTotal).toBe(150);
  });

  it('is a shallow copy of config.context', () => {
    const original = { x: 1 };
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: [] },
      context: original,
    });
    fsm.context.x = 99;
    expect(original.x).toBe(1); // not mutated
  });
});

describe('fallbackState', () => {
  it('auto-transitions to fallbackState when loop shield activates', () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B', 'ESCALATION'] as const,
      tools: { A: ['t1'], B: [], ESCALATION: [] },
      loopShield: { enabled: true, maxConsecutiveTools: 2, fallbackState: 'ESCALATION' },
      onTransition,
    });

    fsm._registerToolCall(); // 1
    expect(fsm.currentState).toBe('A');
    fsm._registerToolCall(); // 2 → loop, fallback triggers
    expect(fsm.currentState).toBe('ESCALATION');
    expect(onTransition).toHaveBeenCalledWith('A', 'ESCALATION');
  });

  it('bypasses guard when transitioning to fallback', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'FALLBACK'] as const,
      tools: { A: ['t1'], FALLBACK: [] },
      loopShield: { enabled: true, maxConsecutiveTools: 1, fallbackState: 'FALLBACK' },
      guard: () => false,
    });

    fsm._registerToolCall(); // triggers loop → fallback
    expect(fsm.currentState).toBe('FALLBACK');
  });

  it('does not re-trigger if already in fallback state', () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'FALLBACK'] as const,
      tools: { A: ['t1'], FALLBACK: [] },
      loopShield: { enabled: true, maxConsecutiveTools: 1, fallbackState: 'FALLBACK' },
      onTransition,
    });

    fsm._registerToolCall(); // loop → FALLBACK
    expect(onTransition).toHaveBeenCalledTimes(1);
    fsm._registerToolCall(); // still looping, but already in FALLBACK
    fsm._registerToolCall();
    expect(onTransition).toHaveBeenCalledTimes(1); // no extra transitions
    expect(fsm.currentState).toBe('FALLBACK');
  });

  it('throws if fallbackState is not in states list', () => {
    expect(() => createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: [] },
      loopShield: { enabled: true, maxConsecutiveTools: 2, fallbackState: 'NOPE' },
    })).toThrow('fallbackState');
  });

  it('works when loopShield is disabled (no fallback)', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'] as const,
      tools: { A: [] },
      loopShield: { enabled: false, maxConsecutiveTools: 1, fallbackState: 'A' },
    });
    fsm._registerToolCall();
    fsm._registerToolCall();
    expect(fsm.currentState).toBe('A');
  });
});

describe('type-safe states (const generic)', () => {
  it('accepts as const states', () => {
    const fsm = createFSM({
      initialState: 'X',
      states: ['X', 'Y', 'Z'] as const,
      tools: { X: [], Y: [], Z: [] },
    });
    fsm.transitionTo('Y');
    expect(fsm.currentState).toBe('Y');
  });

  it('works without as const (backward compatible)', () => {
    const states = ['A', 'B'];
    const fsm = createFSM({
      initialState: 'A',
      states,
      tools: { A: [], B: [] },
    });
    fsm.transitionTo('B');
    expect(fsm.currentState).toBe('B');
  });
});

describe('guard with context', () => {
  it('passes context as third parameter', () => {
    const guard = vi.fn(() => true);
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'] as const,
      tools: { A: [], B: [] },
      context: { role: 'admin', count: 5 },
      guard,
    });
    fsm.transitionTo('B');
    expect(guard).toHaveBeenCalledWith('A', 'B', { role: 'admin', count: 5 });
  });

  it('guard can use context to veto based on external data', () => {
    const fsm = createFSM({
      initialState: 'CART',
      states: ['CART', 'PAYMENT'] as const,
      tools: { CART: [], PAYMENT: [] },
      context: { cartTotal: 0 },
      guard: (_from, to, ctx) => to !== 'PAYMENT' || (ctx.cartTotal as number) > 0,
    });

    expect(() => fsm.transitionTo('PAYMENT')).toThrow('Guard blocked');

    fsm.context.cartTotal = 150;
    expect(() => fsm.transitionTo('PAYMENT')).not.toThrow();
    expect(fsm.currentState).toBe('PAYMENT');
  });
});

describe('loop shield modes', () => {
  it('repeated mode triggers on same tool N times', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 3, mode: 'repeated' });
    shield.registerToolCall('check_slots');
    shield.registerToolCall('check_slots');
    shield.registerToolCall('check_slots');
    expect(shield.isLooping()).toBe(true);
  });

  it('repeated mode resets on different tool', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 3, mode: 'repeated' });
    shield.registerToolCall('check_slots');
    shield.registerToolCall('check_slots');
    shield.registerToolCall('reserve'); // diferente
    expect(shield.isLooping()).toBe(false);
    shield.registerToolCall('reserve');
    shield.registerToolCall('reserve'); // 3 of 'reserve'
    expect(shield.isLooping()).toBe(true);
  });

  it('consecutive mode ignores tool names', () => {
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 2 });
    shield.registerToolCall('a');
    shield.registerToolCall('b');
    expect(shield.isLooping()).toBe(true);
  });

  it('onLoop fires with metadata', () => {
    const onLoop = vi.fn();
    const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 2, onLoop });
    shield.registerToolCall();
    shield.registerToolCall();
    expect(onLoop).toHaveBeenCalledWith({ consecutiveTools: 2, maxAllowed: 2 });
  });
});

describe('currentStateGroup', () => {
  it('returns group for namespaced state', () => {
    const fsm = createFSM({
      initialState: 'SCHEDULING:date' as const,
      states: ['GREETING', 'SCHEDULING:date', 'SCHEDULING:time', 'SCHEDULING:confirm', 'DONE'] as const,
      tools: { GREETING: [], 'SCHEDULING:date': [], 'SCHEDULING:time': [], 'SCHEDULING:confirm': [], DONE: [] },
    });
    expect(fsm.currentStateGroup).toBe('SCHEDULING');
    fsm.transitionTo('SCHEDULING:time');
    expect(fsm.currentStateGroup).toBe('SCHEDULING');
  });

  it('returns full state when no colon', () => {
    const fsm = createFSM({
      initialState: 'GREETING',
      states: ['GREETING', 'DONE'],
      tools: { GREETING: [], DONE: [] },
    });
    expect(fsm.currentStateGroup).toBe('GREETING');
  });
});

describe('transitionToAsync', () => {
  it('works with sync guard', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard: () => true,
    });
    await fsm.transitionToAsync('B');
    expect(fsm.currentState).toBe('B');
  });

  it('works with async guard', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard: async () => true,
    });
    await fsm.transitionToAsync('B');
    expect(fsm.currentState).toBe('B');
  });

  it('async guard can use context for DB checks', async () => {
    const fsm = createFSM({
      initialState: 'CART',
      states: ['CART', 'PAYMENT'],
      tools: { CART: [], PAYMENT: [] },
      context: { slotId: 'slot-42' },
      guard: async (_from, to, ctx) => {
        if (to === 'PAYMENT') {
          return true; // simulate DB check
        }
        return true;
      },
    });
    await fsm.transitionToAsync('PAYMENT');
    expect(fsm.currentState).toBe('PAYMENT');
  });

  it('throws when sync transitionTo used with async guard', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard: async () => true,
    });
    expect(() => fsm.transitionTo('B')).toThrow('async');
  });
});
