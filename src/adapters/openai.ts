import type { FSMPublic } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';
import { createBaseAdapter } from './base';

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
