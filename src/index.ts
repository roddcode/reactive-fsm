import { createFSM as _createFSM } from './core/machine.js';
import type { FSMConfig, FSMPublic, FSMSnapshot } from './core/machine.js';

export { _createFSM as createFSM };
export type { FSMConfig, FSMPublic, FSMSnapshot };

export { buildToolsForGate, validateWith } from './core/tool-gating.js';
export type { ToolEntry } from './core/tool-gating.js';

export { createLoopShield } from './core/loop-shield.js';
export type { LoopShieldConfig, LoopShieldInstance } from './core/loop-shield.js';

export { createVercelAdapter } from './adapters/vercel-ai.js';
export type {
  VercelAdapter,
  VercelInjectResult,
  VercelStepInfo,
  VercelPrepareStepParams,
} from './adapters/vercel-ai.js';

export { createOpenAIAdapter } from './adapters/openai.js';
export type {
  OpenAIAdapter,
  OpenAIInjectResult,
} from './adapters/openai.js';

export { createAnthropicAdapter } from './adapters/anthropic.js';
export type { AnthropicAdapter } from './adapters/anthropic.js';

export { wrapWithFSM } from './adapters/langchain.js';
export type { LangChainFSMWrapper } from './adapters/langchain.js';

export { createGeminiAdapter } from './adapters/gemini.js';
export type { GeminiAdapter } from './adapters/gemini.js';
