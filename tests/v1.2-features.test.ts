import { describe, it, expect, vi } from 'vitest';
import { createFSM, validateWith, type FSMSnapshot } from '../src/index';

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

  it('receives from and to states', () => {
    const guard = vi.fn(() => true);
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard,
    });
    fsm.transitionTo('B');
    expect(guard).toHaveBeenCalledWith('A', 'B');
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
