export { createFSM } from './core/machine';
export type { FSMConfig, FSMInstance } from './core/machine';

export { buildToolsForGate } from './core/tool-gating';
export type { ToolEntry } from './core/tool-gating';

export { createLoopShield } from './core/loop-shield';
export type { LoopShieldConfig, LoopShieldInstance } from './core/loop-shield';

export { createVercelAdapter } from './adapters/vercel-ai';
export type {
  VercelAdapter,
  VercelInjectResult,
  VercelStepInfo,
  VercelPrepareStepParams,
} from './adapters/vercel-ai';

export { createOpenAIAdapter } from './adapters/openai';
export type {
  OpenAIAdapter,
  OpenAIInjectResult,
} from './adapters/openai';
