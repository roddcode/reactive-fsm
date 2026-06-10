import type { FSMPublic } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';
import { createBaseAdapter } from './base';

export interface LangChainFSMWrapper<TContext = any> {
  getTools(): Record<string, unknown>;
  shouldStop(): boolean;
  onToolCall(): void;
  onStateChange(gate: string): void;
}

export function wrapWithFSM<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): LangChainFSMWrapper<TContext> {
  const base = createBaseAdapter(fsm);
  return {
    getTools() {
      return buildToolsForGate(fsm.currentState, context, registry);
    },
    shouldStop: base.isLooping,
    onToolCall: base.registerToolCall,
    onStateChange: base.refreshGate,
  };
}
