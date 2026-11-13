import { generateText, isStepCount, jsonSchema } from 'ai';
import { createFSM, createVercelAdapter } from '../../src/index.js';
import type { ToolEntry } from '../../src/index.js';

interface Ctx {
  contactId: string;
}

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING'],
  tools: {
    IDENTITY: ['validate_dni'],
    BOOKING: ['check_availability'],
  },
});

const registry: ToolEntry<Ctx>[] = [
  {
    name: 'validate_dni',
    gates: ['IDENTITY'],
    build: () => ({
      description: 'Validate a DNI',
      inputSchema: jsonSchema({
        type: 'object',
        properties: { dni: { type: 'string' } },
        required: ['dni'],
      }),
      execute: async ({ dni }: { dni: string }) => ({ valid: dni.length > 0 }),
    }),
  },
  {
    name: 'check_availability',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Check slot availability',
      inputSchema: jsonSchema({
        type: 'object',
        properties: { date: { type: 'string' } },
        required: ['date'],
      }),
      execute: async ({ date }: { date: string }) => ({ available: Boolean(date) }),
    }),
  },
];

const adapter = createVercelAdapter(fsm, registry, { contactId: 'test-1' });
const injected = adapter.inject();

// This must compile with ai@7. The adapter's structural ToolSet is assignable
// to generateText's ToolSet, and prepareStep returns activeTools/toolChoice.
await generateText({
  model: {} as never,
  prompt: 'Validate the user',
  ...injected,
  stopWhen: isStepCount(3),
});
