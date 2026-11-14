import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../src/index';

describe('transitionToAsync contract', () => {
  it('rejects an invalid state as a promise', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: [] },
    });

    await expect(fsm.transitionToAsync('X')).rejects.toThrow('Invalid state');
  });

  it('does not throw synchronously for an invalid state', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: [] },
    });

    let promise: Promise<void> | undefined;
    expect(() => {
      promise = fsm.transitionToAsync('X');
    }).not.toThrow();

    return expect(promise).rejects.toThrow('Invalid state');
  });
});

describe('onTransition contract', () => {
  it('keeps the new state when the sync callback throws', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      onTransition: () => {
        throw new Error('boom');
      },
    });

    expect(() => fsm.transitionTo('B')).toThrow('boom');
    expect(fsm.currentState).toBe('B');
  });

  it('keeps the new state when the async callback throws', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      onTransition: () => {
        throw new Error('boom');
      },
    });

    await expect(fsm.transitionToAsync('B')).rejects.toThrow('boom');
    expect(fsm.currentState).toBe('B');
  });

  it('does not await an async onTransition callback', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let finished = false;

    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      onTransition: async () => {
        await pending;
        finished = true;
      },
    });

    await fsm.transitionToAsync('B');

    expect(fsm.currentState).toBe('B');
    expect(finished).toBe(false);

    release();
    await pending;
  });

  it('does not call onTransition when the guard blocks', () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: { A: [], B: [] },
      guard: () => false,
      onTransition,
    });

    expect(() => fsm.transitionTo('B')).toThrow('Guard blocked');
    expect(fsm.currentState).toBe('A');
    expect(onTransition).not.toHaveBeenCalled();
  });
});
