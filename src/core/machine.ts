import { createLoopShield, type LoopShieldConfig } from './loop-shield';

export interface FSMSnapshot {
  state: string;
}

export interface FSMConfig<S extends string = string> {
  initialState: S;
  states: readonly S[];
  tools: Partial<Record<S, string[]>>;
  loopShield?: LoopShieldConfig;
  onTransition?: (from: S, to: S) => void;
  guard?: (from: S, to: S, context: Record<string, unknown>) => boolean | Promise<boolean>;
  prompts?: Partial<Record<S, string>>;
  snapshot?: FSMSnapshot;
  context?: Record<string, unknown>;
}

export interface FSMPublic {
  readonly currentState: string;
  readonly currentStateGroup: string;
  readonly allowedTools: string[];
  readonly isLooping: boolean;
  transitionTo(state: string): void;
  transitionToAsync(state: string): Promise<void>;
  snapshot(): FSMSnapshot;
  toMermaid(): string;
  context: Record<string, unknown>;
}

export interface FSMInstance extends FSMPublic {
  _registerToolCall(toolName?: string): void;
  _resetLoopShield(): void;
  _setState(state: string): void;
  _setStateAsync(state: string): Promise<void>;
}

export function createFSM<const S extends string = string>(
  config: FSMConfig<S>,
): FSMInstance {
  const validStates = new Set<string>(config.states);

  if (!validStates.has(config.initialState)) {
    throw new Error(`Initial state "${config.initialState}" is not in the states list`);
  }

  if (config.snapshot && !validStates.has(config.snapshot.state)) {
    throw new Error(`Snapshot state "${config.snapshot.state}" is not in the states list`);
  }

  if (config.loopShield?.fallbackState && !validStates.has(config.loopShield.fallbackState)) {
    throw new Error(`Loop shield fallbackState "${config.loopShield.fallbackState}" is not in the states list`);
  }

  let _currentState = config.snapshot?.state ?? config.initialState;

  const _context: Record<string, unknown> = config.context ? { ...config.context } : {};

  const shield = createLoopShield(
    config.loopShield ?? { enabled: false, maxConsecutiveTools: 3 },
  );

  function getGroup(state: string): string {
    const idx = state.indexOf(':');
    return idx === -1 ? state : state.slice(0, idx);
  }

  function getAllowedTools(): string[] {
    return (config.tools as Record<string, string[]>)[_currentState] ?? [];
  }

  async function checkGuard(from: string, to: string): Promise<boolean> {
    if (!config.guard) return true;
    const result = config.guard(from as S, to as S, _context);
    return result instanceof Promise ? await result : result;
  }

  async function doTransitionAsync(state: string): Promise<void> {
    const from = _currentState;
    if (!(await checkGuard(from, state))) {
      throw new Error(`Guard blocked transition from "${from}" to "${state}"`);
    }
    _currentState = state;
    config.onTransition?.(from as S, state as S);
  }

  function doTransition(state: string): void {
    const from = _currentState;
    const result = config.guard?.(from as S, state as S, _context);
    if (result instanceof Promise) {
      throw new Error(`Guard is async. Use transitionToAsync() instead of transitionTo().`);
    }
    if (result === false) {
      throw new Error(`Guard blocked transition from "${from}" to "${state}"`);
    }
    _currentState = state;
    config.onTransition?.(from as S, state as S);
  }

  function doFallback(state: string): void {
    const from = _currentState;
    _currentState = state;
    config.onTransition?.(from as S, state as S);
  }

  return {
    get currentState(): string {
      return _currentState;
    },

    get currentStateGroup(): string {
      return getGroup(_currentState);
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

    transitionToAsync(state: string): Promise<void> {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      return doTransitionAsync(state);
    },

    _registerToolCall(toolName?: string): void {
      shield.registerToolCall(toolName);
      if (shield.isLooping() && config.loopShield?.fallbackState) {
        const fb = config.loopShield.fallbackState;
        if (validStates.has(fb) && _currentState !== fb) {
          doFallback(fb);
        }
      }
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

    _setStateAsync(state: string): Promise<void> {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      return doTransitionAsync(state);
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
