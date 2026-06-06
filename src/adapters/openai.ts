import type { FSMInstance } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';

export interface OpenAIInjectResult {
  tools: unknown[];
}

export interface OpenAIAdapter<TContext = any> {
  inject(): OpenAIInjectResult;
  isLooping(): boolean;
  registerToolCall(): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

export function createOpenAIAdapter<TContext = any>(
  fsm: FSMInstance,
  registry: ToolEntry<TContext>[],
  context: TContext,
): OpenAIAdapter<TContext> {
  return {
    inject(): OpenAIInjectResult {
      const toolMap = buildToolsForGate(fsm.currentState, context, registry);
      return { tools: Object.values(toolMap) };
    },

    isLooping(): boolean {
      return fsm.isLooping;
    },

    registerToolCall(): void {
      fsm._registerToolCall();
    },

    resetLoopShield(): void {
      fsm._resetLoopShield();
    },

    refreshGate(state: string): void {
      fsm._setState(state);
    },
  };
}
