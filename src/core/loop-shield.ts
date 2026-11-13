export interface LoopShieldConfig {
  enabled: boolean;
  maxConsecutiveTools: number;
  fallbackState?: string;
  mode?: 'consecutive' | 'repeated';
  onLoop?: (info: { consecutiveTools: number; maxAllowed: number }) => void;
}

export interface LoopShieldInstance {
  registerToolCall(toolName?: string): void;
  isLooping(): boolean;
  reset(): void;
}

export function createLoopShield(config: LoopShieldConfig): LoopShieldInstance {
  if (
    config.enabled &&
    (!Number.isFinite(config.maxConsecutiveTools) || config.maxConsecutiveTools <= 0)
  ) {
    throw new Error('maxConsecutiveTools must be a positive number');
  }

  let consecutiveToolCalls = 0;
  let lastToolName: string | null = null;
  let sameToolCount = 0;
  let fired = false;
  const mode = config.mode ?? 'consecutive';

  function checkLoop(): boolean {
    if (mode === 'repeated') {
      return sameToolCount >= config.maxConsecutiveTools;
    }
    return consecutiveToolCalls >= config.maxConsecutiveTools;
  }

  return {
    registerToolCall(toolName?: string): void {
      if (!config.enabled) return;

      if (mode === 'repeated' && toolName === undefined) {
        throw new Error('toolName is required when loopShield.mode is "repeated"');
      }

      consecutiveToolCalls++;

      if (mode === 'repeated' && toolName !== undefined) {
        if (toolName === lastToolName) {
          sameToolCount++;
        } else {
          lastToolName = toolName;
          sameToolCount = 1;
        }
      }

      if (checkLoop() && !fired) {
        fired = true;
        config.onLoop?.({ consecutiveTools: consecutiveToolCalls, maxAllowed: config.maxConsecutiveTools });
      }
    },

    isLooping(): boolean {
      if (!config.enabled) return false;
      return checkLoop();
    },

    reset(): void {
      consecutiveToolCalls = 0;
      lastToolName = null;
      sameToolCount = 0;
      fired = false;
    },
  };
}
