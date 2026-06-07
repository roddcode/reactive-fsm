import type { FSMPublic, FSMInstance } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';

export interface AnthropicAdapter<TContext = any> {
  inject(): { tools: unknown[] };
  isLooping(): boolean;
  registerToolCall(): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export function createAnthropicAdapter<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): AnthropicAdapter<TContext> {
  const _fsm = fsm as FSMInstance;
  return {
    inject() {
      const toolMap = buildToolsForGate(_fsm.currentState, context, registry);
      const toolsArray: AnthropicTool[] = [];
      for (const t of Object.values(toolMap)) {
        const tool = t as Record<string, unknown>;
        toolsArray.push({
          name: (tool.name as string) ?? '',
          description: (tool.description as string) ?? '',
          input_schema: (tool.parameters as Record<string, unknown>) ?? { type: 'object', properties: {} },
        });
      }
      return { tools: toolsArray };
    },

    isLooping(): boolean {
      return _fsm.isLooping;
    },

    registerToolCall(): void {
      _fsm._registerToolCall();
    },

    resetLoopShield(): void {
      _fsm._resetLoopShield();
    },

    refreshGate(state: string): void {
      _fsm._setState(state);
      _fsm._resetLoopShield();
    },
  };
}
