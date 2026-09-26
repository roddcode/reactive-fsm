import type { FSMPublic } from '../core/machine.js';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating.js';
import { createBaseAdapter } from './base.js';

export interface OpenAIInjectResult {
  tools: unknown[];
}

export interface OpenAIAdapter<TContext = any> {
  inject(): OpenAIInjectResult;
  isLooping(): boolean;
  registerToolCall(toolName?: string): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

export function createOpenAIAdapter<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): OpenAIAdapter<TContext> {
  const base = createBaseAdapter(fsm);
  return {
    inject(): OpenAIInjectResult {
      const toolMap = buildToolsForGate(fsm.currentState, context, registry);
      return { tools: Object.values(toolMap) };
    },
    isLooping: base.isLooping,
    registerToolCall: base.registerToolCall,
    resetLoopShield: base.resetLoopShield,
    refreshGate: base.refreshGate,
  };
}
