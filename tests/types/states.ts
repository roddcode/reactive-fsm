import { createFSM } from '../../src/index.js';

const fsm = createFSM({
  initialState: 'A',
  states: ['A', 'B'] as const,
  tools: { A: [], B: [] },
});

fsm.transitionTo('B');

// @ts-expect-error 'TYPO' is not a valid state
fsm.transitionTo('TYPO');
