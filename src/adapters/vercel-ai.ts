import type { FSMInstance } from '../core/machine';
import { buildToolsForGate, type ToolEntry } from '../core/tool-gating';

export interface VercelStepInfo {
  toolCalls?: Array<{ toolName: string; args?: unknown }>;
  toolResults?: Array<{ toolName: string; result?: unknown }>;
}

export interface VercelPrepareStepParams {
  steps: VercelStepInfo[];
  stepNumber: number;
}

export interface VercelInjectResult {
  tools: Record<string, unknown>;
  prepareStep?: (params: VercelPrepareStepParams) => Promise<{ toolChoice?: 'none' } | Record<string, never>>;
}

export interface VercelAdapter<TContext = any> {
  inject(): VercelInjectResult;
  refreshGate(state: string): void;
}

function syncTools(
  target: Record<string, unknown>,
  gate: string,
  ctx: unknown,
  registry: ToolEntry[],
): void {
  const fresh = buildToolsForGate(gate, ctx, registry);
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  for (const [key, value] of Object.entries(fresh)) {
    target[key] = value;
  }
}

export function createVercelAdapter<TContext = any>(
  fsm: FSMInstance,
  registry: ToolEntry<TContext>[],
  context: TContext,
): VercelAdapter<TContext> {
  const tools: Record<string, unknown> = {};
  let currentGate: string | null = null;

  return {
    inject(): VercelInjectResult {
      currentGate = fsm.currentState;
      syncTools(tools, currentGate, context, registry);

      return {
        tools,
        prepareStep: async ({ steps }: VercelPrepareStepParams) => {
          let consecutiveToolSteps = 0;
          for (let i = steps.length - 1; i >= 0; i--) {
            if ((steps[i].toolCalls?.length ?? 0) > 0) {
              consecutiveToolSteps++;
            } else {
              break;
            }
          }

          fsm._resetLoopShield();
          for (let i = 0; i < consecutiveToolSteps; i++) {
            fsm._registerToolCall();
          }

          if (fsm.isLooping) {
            return { toolChoice: 'none' as const };
          }

          if (fsm.currentState !== currentGate) {
            currentGate = fsm.currentState;
            syncTools(tools, currentGate, context, registry);
          }

          return {};
        },
      };
    },

    refreshGate(state: string): void {
      fsm._setState(state);
    },
  };
}
