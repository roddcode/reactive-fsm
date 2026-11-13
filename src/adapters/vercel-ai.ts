import type { FSMPublic, FSMInstance } from '../core/machine.js';
import type { ToolEntry } from '../core/tool-gating.js';
import { createBaseAdapter } from './base.js';

/**
 * Structural subset of the AI SDK `Tool` type. The adapter deliberately does
 * not import `ai`: the core stays dependency-free, while the returned object is
 * assignable to `ToolSet` in AI SDK 7.
 */
export interface VercelTool {
  description?: string;
  inputSchema: any;
  execute?: (...args: any[]) => any;
  [key: string]: any;
}

export type VercelToolSet = Record<string, VercelTool>;

export interface VercelStepInfo {
  toolCalls?: Array<{ toolName: string }>;
}

export interface VercelPrepareStepParams {
  steps: VercelStepInfo[];
  stepNumber: number;
}

export interface VercelPrepareStepResult {
  activeTools?: string[];
  toolChoice?: 'none';
}

export type VercelPrepareStep = (
  params: VercelPrepareStepParams,
) => Promise<VercelPrepareStepResult>;

export interface VercelInjectResult {
  tools: VercelToolSet;
  prepareStep: VercelPrepareStep;
}

export interface VercelAdapter<TContext = any> {
  inject(): VercelInjectResult;
  refreshGate(state: string): void;
}

export function createVercelAdapter<TContext = any>(
  fsm: FSMPublic,
  registry: ToolEntry<TContext>[],
  context: TContext,
): VercelAdapter<TContext> {
  const _fsm = fsm as FSMInstance;
  const base = createBaseAdapter(fsm);

  function activeToolNames(tools: VercelToolSet): string[] {
    const available = new Set(Object.keys(tools));
    const allowed = new Set(_fsm.allowedTools);
    const names = new Set<string>();

    for (const entry of registry) {
      if (!available.has(entry.name)) continue;
      if (!allowed.has(entry.name)) continue;
      if (entry.condition && !entry.condition(context)) continue;
      names.add(entry.name);
    }

    return [...names];
  }

  return {
    inject(): VercelInjectResult {
      const tools: VercelToolSet = {};

      // Build the full ToolSet once per injection. AI SDK 7 exposes only the
      // `activeTools` subset to the model, so the object stays stable while the
      // FSM state changes.
      for (const entry of registry) {
        const built = entry.build(context);
        if (built && typeof built === 'object') {
          tools[entry.name] = built as VercelTool;
        }
      }

      const prepareStep: VercelPrepareStep = async ({ steps }) => {
        // Count every tool call in the trailing run of tool-using steps.
        // A text-only step breaks the run.
        const consecutiveCalls: string[] = [];
        for (let i = steps.length - 1; i >= 0; i--) {
          const calls = steps[i].toolCalls ?? [];
          if (calls.length === 0) break;
          consecutiveCalls.unshift(...calls.map((call) => call.toolName));
        }

        _fsm._resetLoopShield();
        for (const toolName of consecutiveCalls) {
          _fsm._registerToolCall(toolName);
        }

        if (_fsm.isLooping) {
          return { toolChoice: 'none' };
        }

        return { activeTools: activeToolNames(tools) };
      };

      return { tools, prepareStep };
    },
    refreshGate: base.refreshGate,
  };
}
