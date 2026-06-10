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
  let consecutiveToolCalls = 0;
  let lastToolName: string | null = null;
  let sameToolCount = 0;
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
      consecutiveToolCalls++;

      if (mode === 'repeated' && toolName !== undefined) {
        if (toolName === lastToolName) {
          sameToolCount++;
        } else {
          lastToolName = toolName;
          sameToolCount = 1;
        }
      }

      if (checkLoop()) {
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
    },
  };
}
