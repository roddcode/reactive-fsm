import { describe, it, expect } from 'vitest';
import { createFSM } from '../src/index';
import { wrapWithFSM } from '../src/adapters/langchain';
import type { ToolEntry } from '../src/index';

const registry: ToolEntry<{}>[] = [
  {
    name: 'search_docs',
    gates: ['RESEARCH'],
    build: () => ({ name: 'search_docs', description: 'Search docs' }),
  },
  {
    name: 'run_code',
    gates: ['SANDBOX'],
    build: () => ({ name: 'run_code', description: 'Run code' }),
  },
];

describe('LangChain Adapter — wrapWithFSM', () => {
  const fsm = createFSM({
    initialState: 'RESEARCH',
    states: ['RESEARCH', 'SANDBOX'],
    tools: { RESEARCH: ['search_docs'], SANDBOX: ['run_code'] },
    loopShield: { enabled: true, maxConsecutiveTools: 2 },
  });

  const wrapper = wrapWithFSM(fsm, registry, {});

  it('getTools filtra por gate actual', () => {
    const tools = wrapper.getTools();
    expect(Object.keys(tools)).toEqual(['search_docs']);
  });

  it('onStateChange actualiza gate y tools', () => {
    wrapper.onStateChange('SANDBOX');
    const tools = wrapper.getTools();
    expect(Object.keys(tools)).toEqual(['run_code']);
  });

  it('loop shield via shouldStop', () => {
    expect(wrapper.shouldStop()).toBe(false);
    wrapper.onToolCall();
    wrapper.onToolCall();
    expect(wrapper.shouldStop()).toBe(true);
  });
});
