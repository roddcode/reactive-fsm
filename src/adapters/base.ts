import type { FSMPublic, FSMInstance } from '../core/machine';

export interface BaseAdapter {
  isLooping(): boolean;
  registerToolCall(toolName?: string): void;
  resetLoopShield(): void;
  refreshGate(state: string): void;
}

export function createBaseAdapter(fsm: FSMPublic): BaseAdapter {
  const _fsm = fsm as FSMInstance;
  return {
    isLooping(): boolean {
      return _fsm.isLooping;
    },
    registerToolCall(toolName?: string): void {
      _fsm._registerToolCall(toolName);
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
