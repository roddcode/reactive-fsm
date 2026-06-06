export interface LoopShieldConfig {
  enabled: boolean;
  maxConsecutiveTools: number;
}

export interface LoopShieldInstance {
  registerToolCall(): void;
  isLooping(): boolean;
  reset(): void;
}

export function createLoopShield(config: LoopShieldConfig): LoopShieldInstance {
  let consecutiveToolCalls = 0;

  return {
    registerToolCall(): void {
      if (!config.enabled) return;
      consecutiveToolCalls++;
    },

    isLooping(): boolean {
      if (!config.enabled) return false;
      return consecutiveToolCalls >= config.maxConsecutiveTools;
    },

    reset(): void {
      consecutiveToolCalls = 0;
    },
  };
}
