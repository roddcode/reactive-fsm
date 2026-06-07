import type { FSMPublic, FSMInstance } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';

export interface GeminiAdapter<TContext = any> {
  inject(): { tools: Array<{ functionDeclarations: unknown[] }> };
  isLooping(): boolean;
  registerToolCall(): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

export function createGeminiAdapter<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): GeminiAdapter<TContext> {
  const _fsm = fsm as FSMInstance;
  return {
    inject() {
      const toolMap = buildToolsForGate(_fsm.currentState, context, registry);
      const declarations: unknown[] = [];
      for (const t of Object.values(toolMap)) {
        const tool = t as Record<string, unknown>;
        declarations.push({
          name: (tool.name as string) ?? '',
          description: (tool.description as string) ?? '',
          parameters: (tool.parameters as Record<string, unknown>) ?? { type: 'object', properties: {} },
        });
      }
      return { tools: [{ functionDeclarations: declarations }] };
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
