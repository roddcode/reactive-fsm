import { describe, it, expect, vi } from 'vitest';
import { createFSM } from '../src/index';

describe('transitionToAsync — stale state protection', () => {
  it('rejects a transition whose source state changed while the guard was pending', async () => {
    let release!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolve) => {
      release = resolve;
    });

    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B', 'C'],
      tools: {},
      guard: (_from, to) => (to === 'B' ? pending : true),
    });

    const first = fsm.transitionToAsync('B');
    fsm.transitionTo('C');
    release(true);

    await expect(first).rejects.toThrow(/State changed from "A" to "C"/);
    expect(fsm.currentState).toBe('C');
  });

  it('does not let two concurrent async transitions overwrite each other', async () => {
    let releaseB!: (value: boolean) => void;
    let releaseC!: (value: boolean) => void;
    const pendingB = new Promise<boolean>((resolve) => {
      releaseB = resolve;
    });
    const pendingC = new Promise<boolean>((resolve) => {
      releaseC = resolve;
    });

    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B', 'C'],
      tools: {},
      guard: (_from, to) => {
        if (to === 'B') return pendingB;
        if (to === 'C') return pendingC;
        return true;
      },
    });

    const toB = fsm.transitionToAsync('B');
    const toC = fsm.transitionToAsync('C');

    releaseC(true);
    await toC;
    expect(fsm.currentState).toBe('C');

    releaseB(true);
    await expect(toB).rejects.toThrow(/State changed from "A" to "C"/);
    expect(fsm.currentState).toBe('C');
  });

  it('rejects a stale transition after A -> B -> A (ABA)', async () => {
    let release!: (value: boolean) => void;
    let pending = true;
    const gate = new Promise<boolean>((resolve) => {
      release = resolve;
    });

    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: {},
      guard: (_from, to) => {
        if (to === 'B' && pending) {
          pending = false;
          return gate;
        }
        return true;
      },
    });

    const first = fsm.transitionToAsync('B');
    fsm.transitionTo('B');
    fsm.transitionTo('A');
    release(true);

    await expect(first).rejects.toThrow(/State changed/);
    expect(fsm.currentState).toBe('A');
  });

  it('rejects a pending transition when a fallback changes the state', async () => {
    let release!: (value: boolean) => void;
    const pending = new Promise<boolean>((resolve) => {
      release = resolve;
    });

    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B', 'ESC'],
      tools: {},
      guard: (_from, to) => (to === 'B' ? pending : true),
      loopShield: {
        enabled: true,
        maxConsecutiveTools: 1,
        fallbackState: 'ESC',
      },
    });

    const first = fsm.transitionToAsync('B');
    fsm._registerToolCall();

    expect(fsm.currentState).toBe('ESC');
    expect(fsm.isLooping).toBe(false);

    release(true);
    await expect(first).rejects.toThrow(/State changed from "A" to "ESC"/);
    expect(fsm.currentState).toBe('ESC');
  });

  it('leaves the state untouched when the async guard rejects', async () => {
    const onTransition = vi.fn();
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'B'],
      tools: {},
      guard: async () => false,
      onTransition,
    });

    await expect(fsm.transitionToAsync('B')).rejects.toThrow('Guard blocked');
    expect(fsm.currentState).toBe('A');
    expect(onTransition).not.toHaveBeenCalled();
  });
});

describe('fallbackState — shield reset', () => {
  it('resets the shield after entering the fallback state', () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A', 'ESC'],
      tools: {},
      loopShield: {
        enabled: true,
        maxConsecutiveTools: 2,
        fallbackState: 'ESC',
      },
    });

    fsm._registerToolCall();
    fsm._registerToolCall();

    expect(fsm.currentState).toBe('ESC');
    expect(fsm.isLooping).toBe(false);
  });
});
