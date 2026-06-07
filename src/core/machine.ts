import { createLoopShield, type LoopShieldConfig } from './loop-shield';

export interface FSMSnapshot {
  state: string;
}

export interface FSMConfig {
  initialState: string;
  states: string[];
  tools: Record<string, string[]>;
  loopShield?: LoopShieldConfig;
  onTransition?: (from: string, to: string) => void;
  guard?: (from: string, to: string) => boolean;
  prompts?: Record<string, string>;
  snapshot?: FSMSnapshot;
  context?: Record<string, unknown>;
}

export interface FSMPublic {
  readonly currentState: string;
  readonly allowedTools: string[];
  readonly isLooping: boolean;
  transitionTo(state: string): void;
  snapshot(): FSMSnapshot;
  toMermaid(): string;
  context: Record<string, unknown>;
}

export interface FSMInstance extends FSMPublic {
  _registerToolCall(): void;
  _resetLoopShield(): void;
  _setState(state: string): void;
}

export function createFSM(config: FSMConfig): FSMInstance {
  const validStates = new Set(config.states);

  if (!validStates.has(config.initialState)) {
    throw new Error(`Initial state "${config.initialState}" is not in the states list`);
  }

  if (config.snapshot && !validStates.has(config.snapshot.state)) {
    throw new Error(`Snapshot state "${config.snapshot.state}" is not in the states list`);
  }

  let _currentState = config.snapshot?.state ?? config.initialState;

  const _context: Record<string, unknown> = config.context ? { ...config.context } : {};

  const shield = createLoopShield(
    config.loopShield ?? { enabled: false, maxConsecutiveTools: 3 },
  );

  function getAllowedTools(): string[] {
    return config.tools[_currentState] ?? [];
  }

  function doTransition(state: string): void {
    const from = _currentState;
    if (config.guard && !config.guard(from, state)) {
      throw new Error(`Guard blocked transition from "${from}" to "${state}"`);
    }
    _currentState = state;
    config.onTransition?.(from, state);
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
      doTransition(state);
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
      doTransition(state);
    },

    snapshot(): FSMSnapshot {
      return { state: _currentState };
    },

    toMermaid(): string {
      const lines: string[] = ['stateDiagram-v2'];
      for (const state of config.states) {
        const tools = (config.tools[state] ?? []).join('<br/>');
        const label = tools ? `${state}<br/><i>${tools}</i>` : state;
        lines.push(`    ${state}: ${label}`);
      }
      for (const state of config.states) {
        lines.push(`    [*] --> ${state}`);
        lines.push(`    ${state} --> [*]`);
      }
      return lines.join('\n');
    },

    context: _context,
  };
}
