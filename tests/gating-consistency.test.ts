import { describe, it, expect } from 'vitest';
import {
  createFSM,
  createVercelAdapter,
  createOpenAIAdapter,
  createAnthropicAdapter,
  createGeminiAdapter,
  wrapWithFSM,
} from '../src/index';
import type { ToolEntry } from '../src/index';

const registry: ToolEntry<{}>[] = [
  {
    name: 'charge',
    gates: ['A'],
    build: () => ({
      name: 'charge',
      description: 'Charge the customer',
      parameters: { type: 'object', properties: {} },
      type: 'function',
      function: {
        name: 'charge',
        description: 'Charge the customer',
        parameters: { type: 'object', properties: {} },
      },
    }),
  },
];

describe('gating consistency — config.tools is authoritative', () => {
  it('Vercel exposes the full ToolSet but activates nothing when config.tools is empty', async () => {
    const fsm = createFSM({ initialState: 'A', states: ['A'], tools: { A: [] } });
    const adapter = createVercelAdapter(fsm, registry, {});
    const injected = adapter.inject();

    expect(Object.keys(injected.tools)).toContain('charge');
    const result = await injected.prepareStep({ steps: [], stepNumber: 0 });
    expect(result.activeTools).toEqual([]);
  });

  it('OpenAI filters a registry tool absent from config.tools', () => {
    const fsm = createFSM({ initialState: 'A', states: ['A'], tools: { A: [] } });
    const adapter = createOpenAIAdapter(fsm, registry, {});
    expect(adapter.inject().tools).toEqual([]);
  });

  it('Anthropic filters a registry tool absent from config.tools', () => {
    const fsm = createFSM({ initialState: 'A', states: ['A'], tools: { A: [] } });
    const adapter = createAnthropicAdapter(fsm, registry, {});
    expect(adapter.inject().tools).toEqual([]);
  });

  it('Gemini filters a registry tool absent from config.tools', () => {
    const fsm = createFSM({ initialState: 'A', states: ['A'], tools: { A: [] } });
    const adapter = createGeminiAdapter(fsm, registry, {});
    expect(adapter.inject().tools[0].functionDeclarations).toEqual([]);
  });

  it('LangChain filters a registry tool absent from config.tools', () => {
    const fsm = createFSM({ initialState: 'A', states: ['A'], tools: { A: [] } });
    const wrapper = wrapWithFSM(fsm, registry, {});
    expect(wrapper.getTools()).toEqual({});
  });

  it('Vercel activates only the intersection of config.tools and registry gates', async () => {
    const fsm = createFSM({
      initialState: 'A',
      states: ['A'],
      tools: { A: ['charge'] },
    });
    const adapter = createVercelAdapter(fsm, registry, {});
    const result = await adapter.inject().prepareStep({ steps: [], stepNumber: 0 });
    expect(result.activeTools).toEqual(['charge']);
  });

  it('does not activate a tool whose registry gates exclude the current state', async () => {
    const fsm = createFSM({
      initialState: 'B',
      states: ['A', 'B'],
      tools: { A: [], B: ['charge'] },
    });
    const adapter = createVercelAdapter(fsm, registry, {});
    const result = await adapter.inject().prepareStep({ steps: [], stepNumber: 0 });
    expect(result.activeTools).toEqual([]);
  });
});
