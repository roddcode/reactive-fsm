import { describe, it, expect } from 'vitest';
import { createFSM } from '../src/index';
import { createGeminiAdapter } from '../src/adapters/gemini';
import type { ToolEntry } from '../src/index';

const registry: ToolEntry<{}>[] = [
  {
    name: 'search',
    gates: ['QUERY'],
    build: () => ({
      name: 'search',
      description: 'Search the web',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
      },
    }),
  },
  {
    name: 'summarize',
    gates: ['QUERY'],
    build: () => ({
      name: 'summarize',
      description: 'Summarize text',
      parameters: { type: 'object', properties: {} },
    }),
  },
];

describe('Gemini Adapter', () => {
  const fsm = createFSM({
    initialState: 'QUERY',
    states: ['QUERY'],
    tools: { QUERY: ['search', 'summarize'] },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const adapter = createGeminiAdapter(fsm, registry, {});

  it('formato Gemini: functionDeclarations array', () => {
    const { tools } = adapter.inject();
    expect(tools.length).toBe(1);
    const container = tools[0] as Record<string, unknown>;
    const fns = container.functionDeclarations as Array<Record<string, unknown>>;
    expect(fns.length).toBe(2);
    expect(fns[0].name).toBe('search');
    expect(fns[0].parameters).toBeDefined();
  });

  it('loop shield manual', () => {
    adapter.registerToolCall();
    adapter.registerToolCall();
    adapter.registerToolCall();
    expect(adapter.isLooping()).toBe(true);
    adapter.resetLoopShield();
    expect(adapter.isLooping()).toBe(false);
  });
});
