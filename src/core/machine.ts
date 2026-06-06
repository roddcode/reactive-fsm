import { createLoopShield, type LoopShieldConfig } from './loop-shield';

export interface FSMConfig {
  initialState: string;
  states: string[];
  tools: Record<string, string[]>;
  loopShield?: LoopShieldConfig;
}

export interface FSMInstance {
  readonly currentState: string;
  readonly allowedTools: string[];
  readonly isLooping: boolean;
  transitionTo(state: string): void;
  _registerToolCall(): void;
  _resetLoopShield(): void;
  _setState(state: string): void;
}

export function createFSM(config: FSMConfig): FSMInstance {
  const validStates = new Set(config.states);

  if (!validStates.has(config.initialState)) {
    throw new Error(`Initial state "${config.initialState}" is not in the states list`);
  }

  let _currentState = config.initialState;

  const shield = createLoopShield(
    config.loopShield ?? { enabled: false, maxConsecutiveTools: 3 },
  );

  function getAllowedTools(): string[] {
    return config.tools[_currentState] ?? [];
  }

  return {
    get currentState(): string {
      return _currentState;
    },

    get allowedTools(): string[] {
      return getAllowedTools();
    },

    get isLooping(): boolean {
      return shield.isLooping();
    },

    transitionTo(state: string): void {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      _currentState = state;
    },

    _registerToolCall(): void {
      shield.registerToolCall();
    },

    _resetLoopShield(): void {
      shield.reset();
    },

    _setState(state: string): void {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      _currentState = state;
    },
  };
}
