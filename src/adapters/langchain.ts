import type { FSMPublic, FSMInstance } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';

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
  const _fsm = fsm as FSMInstance;
  return {
    getTools() {
      return buildToolsForGate(_fsm.currentState, context, registry);
    },

    shouldStop() {
      return _fsm.isLooping;
    },

    onToolCall() {
      _fsm._registerToolCall();
    },

    onStateChange(gate: string) {
      _fsm._setState(gate);
      _fsm._resetLoopShield();
    },
  };
}
