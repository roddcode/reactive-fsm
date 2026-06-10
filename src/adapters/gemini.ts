import type { FSMPublic } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';
import { createBaseAdapter } from './base';

export interface GeminiAdapter<TContext = any> {
  inject(): { tools: Array<{ functionDeclarations: unknown[] }> };
  isLooping(): boolean;
  registerToolCall(toolName?: string): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

export function createGeminiAdapter<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): GeminiAdapter<TContext> {
  const base = createBaseAdapter(fsm);
  return {
    inject() {
      const toolMap = buildToolsForGate(fsm.currentState, context, registry);
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
    isLooping: base.isLooping,
    registerToolCall: base.registerToolCall,
    resetLoopShield: base.resetLoopShield,
    refreshGate: base.refreshGate,
  };
}
