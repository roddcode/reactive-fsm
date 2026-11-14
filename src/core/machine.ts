import { createLoopShield, type LoopShieldConfig } from './loop-shield.js';

export interface FSMSnapshot<S extends string = string> {
  state: S;
}

export interface FSMConfig<S extends string = string> {
  initialState: S;
  states: readonly S[];
  tools: Partial<Record<S, string[]>>;
  loopShield?: LoopShieldConfig;
  onTransition?: (from: S, to: S) => void;
  guard?: (from: S, to: S, context: Record<string, unknown>) => boolean | Promise<boolean>;
  prompts?: Partial<Record<S, string>>;
  snapshot?: FSMSnapshot<S>;
  context?: Record<string, unknown>;
}

export interface FSMPublic<S extends string = string> {
  readonly currentState: S;
  readonly currentStateGroup: string;
  readonly allowedTools: string[];
  readonly isLooping: boolean;
  transitionTo(state: S): void;
  transitionToAsync(state: S): Promise<void>;
  snapshot(): FSMSnapshot<S>;
  toMermaid(): string;
  context: Record<string, unknown>;
}

export interface FSMInstance<S extends string = string> extends FSMPublic<S> {
  _registerToolCall(toolName?: string): void;
  _resetLoopShield(): void;
  _getRevision(): number;
  _setState(state: S): void;
  _setStateAsync(state: S): Promise<void>;
}

export function createFSM<const S extends string = string>(
  config: FSMConfig<S>,
): FSMPublic<S> {
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

  let _currentState: string = config.snapshot?.state ?? config.initialState;
  let _revision = 0;

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
    const revision = _revision;
    if (!(await checkGuard(from, state))) {
      throw new Error(`Guard blocked transition from "${from}" to "${state}"`);
    }
    if (_revision !== revision) {
      throw new Error(
        `State changed from "${from}" to "${_currentState}" while transitioning to "${state}" (revision ${revision} -> ${_revision})`,
      );
    }
    _currentState = state;
    _revision++;
    shield.reset();
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
    _revision++;
    shield.reset();
    config.onTransition?.(from as S, state as S);
  }

  function doFallback(state: string): void {
    const from = _currentState;
    _currentState = state;
    _revision++;
    config.onTransition?.(from as S, state as S);
  }

  const instance: FSMInstance<S> = {
    get currentState(): S {
      return _currentState as S;
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

    async transitionToAsync(state: string): Promise<void> {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      await doTransitionAsync(state);
    },

    _registerToolCall(toolName?: string): void {
      shield.registerToolCall(toolName);
      if (shield.isLooping() && config.loopShield?.fallbackState) {
        const fb = config.loopShield.fallbackState;
        if (validStates.has(fb) && _currentState !== fb) {
          try {
            doFallback(fb);
          } finally {
            shield.reset();
          }
        }
      }
    },

    _resetLoopShield(): void {
      shield.reset();
    },

    _getRevision(): number {
      return _revision;
    },

    _setState(state: string): void {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      doTransition(state);
    },

    async _setStateAsync(state: string): Promise<void> {
      if (!validStates.has(state)) {
        throw new Error(`Invalid state "${state}". Valid states: ${config.states.join(', ')}`);
      }
      await doTransitionAsync(state);
    },

    snapshot(): FSMSnapshot<S> {
      return { state: _currentState as S };
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

  return instance;
}
