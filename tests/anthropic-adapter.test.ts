import { describe, it, expect } from 'vitest';
import { createFSM } from '../src/index';
import { createAnthropicAdapter } from '../src/adapters/anthropic';
import type { ToolEntry } from '../src/index';

const registry: ToolEntry<{}>[] = [
  {
    name: 'get_weather',
    gates: ['CHAT'],
    build: () => ({
      name: 'get_weather',
      description: 'Get current weather',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
    }),
  },
  {
    name: 'delete_account',
    gates: ['ADMIN'],
    build: () => ({
      name: 'delete_account',
      description: 'Delete user account',
      parameters: { type: 'object', properties: {} },
    }),
  },
];

describe('Anthropic Adapter', () => {
  const fsm = createFSM({
    initialState: 'CHAT',
    states: ['CHAT', 'ADMIN'],
    tools: { CHAT: ['get_weather'], ADMIN: ['delete_account'] },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const adapter = createAnthropicAdapter(fsm, registry, {});

  it('formato Anthropic: name, description, input_schema', () => {
    const { tools } = adapter.inject();
    expect(tools.length).toBe(1);
    const tool = tools[0] as Record<string, unknown>;
    expect(tool.name).toBe('get_weather');
    expect(tool.description).toBe('Get current weather');
    expect(tool.input_schema).toEqual({
      type: 'object',
      properties: { city: { type: 'string' } },
      required: ['city'],
    });
  });

  it('cambia tools al cambiar gate', () => {
    adapter.refreshGate('ADMIN');
    const { tools } = adapter.inject();
    expect(tools.length).toBe(1);
    expect((tools[0] as Record<string, unknown>).name).toBe('delete_account');
  });

  it('loop shield manual como OpenAI', () => {
    expect(adapter.isLooping()).toBe(false);
    adapter.registerToolCall();
    adapter.registerToolCall();
    adapter.registerToolCall();
    expect(adapter.isLooping()).toBe(true);
    adapter.resetLoopShield();
    expect(adapter.isLooping()).toBe(false);
  });
});
