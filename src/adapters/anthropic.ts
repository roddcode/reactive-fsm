import type { FSMPublic } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';
import { createBaseAdapter } from './base';

export interface AnthropicAdapter<TContext = any> {
  inject(): { tools: unknown[] };
  isLooping(): boolean;
  registerToolCall(toolName?: string): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

export function createAnthropicAdapter<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): AnthropicAdapter<TContext> {
  const base = createBaseAdapter(fsm);
  return {
    inject() {
      const toolMap = buildToolsForGate(fsm.currentState, context, registry);
      const toolsArray: Array<{ name: string; description: string; input_schema: Record<string, unknown> }> = [];
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
    isLooping: base.isLooping,
    registerToolCall: base.registerToolCall,
    resetLoopShield: base.resetLoopShield,
    refreshGate: base.refreshGate,
  };
}
