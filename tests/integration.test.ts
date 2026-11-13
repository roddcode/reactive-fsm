/**
 * Integration test: reactive-fsm + Vercel AI SDK adapter.
 *
 * The adapter targets AI SDK 7. `inject()` returns the full ToolSet and a
 * `prepareStep` that activates only the tools allowed by the current FSM state.
 * No provider API key is needed; the LLM behavior is simulated.
 */
import { beforeEach, describe, it, expect } from 'vitest';
import { createFSM, createVercelAdapter } from '../src/index';
import type { ToolEntry } from '../src/index';

interface ChatContext {
  contactId: string;
  contactName: string | null;
  stepCount: number;
}

const registry: ToolEntry<ChatContext>[] = [
  {
    name: 'greet_user',
    gates: ['GREETING'],
    build: (ctx) => ({
      description: `Greet user ${ctx.contactId}`,
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ greeting: `Hello ${ctx.contactId}` }),
    }),
  },
  {
    name: 'validate_dni',
    gates: ['IDENTITY'],
    build: () => ({
      description: 'Validate user DNI',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ valid: true }),
    }),
  },
  {
    name: 'collect_name',
    gates: ['IDENTITY'],
    condition: (ctx) => ctx.contactName === null,
    build: () => ({
      description: 'Ask for and collect user name',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ name: 'Collected' }),
    }),
  },
  {
    name: 'check_availability',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Check slot availability',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ available: true, slots: ['10:00', '11:00'] }),
    }),
  },
  {
    name: 'reserve_slot',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Reserve a time slot',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ booked: true, slot: '10:00' }),
    }),
  },
  {
    name: 'process_payment',
    gates: ['PAYMENT'],
    build: () => ({
      description: 'Process payment',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ paid: true }),
    }),
  },
  {
    name: 'send_receipt',
    gates: ['PAYMENT'],
    build: () => ({
      description: 'Send payment receipt',
      inputSchema: { type: 'object', properties: {} },
      execute: async () => ({ sent: true }),
    }),
  },
];

async function activeTools(
  adapter: ReturnType<typeof createVercelAdapter<ChatContext>>,
): Promise<string[]> {
  const injected = adapter.inject();
  const result = await injected.prepareStep({ steps: [], stepNumber: 0 });
  return (result.activeTools ?? []).sort();
}

describe('Integration — Conversational Flow', () => {
  const fsm = createFSM({
    initialState: 'GREETING',
    states: ['GREETING', 'IDENTITY', 'BOOKING', 'PAYMENT'],
    tools: {
      GREETING: ['greet_user'],
      IDENTITY: ['validate_dni', 'collect_name'],
      BOOKING: ['check_availability', 'reserve_slot'],
      PAYMENT: ['process_payment', 'send_receipt'],
    },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const ctx: ChatContext = { contactId: 'test-1', contactName: null, stepCount: 0 };
  const adapter = createVercelAdapter(fsm, registry, ctx);

  it('Step 1: Greeting gate — solo greet_user activo', async () => {
    const injected = adapter.inject();
    expect(injected.tools.greet_user).toHaveProperty('description');
    expect((injected.tools.greet_user as any).description).toContain('test-1');
    expect(await activeTools(adapter)).toEqual(['greet_user']);
  });

  it('Step 2: Transición a IDENTITY — se activan las tools de identidad', async () => {
    adapter.refreshGate('IDENTITY');
    expect(await activeTools(adapter)).toEqual(['collect_name', 'validate_dni']);
  });

  it('Step 3: collect_name se oculta si el contacto ya tiene nombre', async () => {
    const ctxWithName: ChatContext = { contactId: 'test-2', contactName: 'Juan', stepCount: 0 };
    const fsm2 = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING'],
      tools: { IDENTITY: ['validate_dni', 'collect_name'], BOOKING: [] },
    });
    const adapter2 = createVercelAdapter(fsm2, registry, ctxWithName);
    expect(await activeTools(adapter2)).toEqual(['validate_dni']);
  });

  it('Step 4: Transición a BOOKING — tools de reserva activas', async () => {
    adapter.refreshGate('BOOKING');
    expect(await activeTools(adapter)).toEqual(['check_availability', 'reserve_slot']);
  });

  it('Step 5: Transición a PAYMENT — tools de pago activas', async () => {
    adapter.refreshGate('PAYMENT');
    expect(await activeTools(adapter)).toEqual(['process_payment', 'send_receipt']);
  });
});

describe('Integration — Loop Shield en flujo multi-step', () => {
  let fsm: ReturnType<typeof createFSM>;
  let adapter: ReturnType<typeof createVercelAdapter<ChatContext>>;

  beforeEach(() => {
    fsm = createFSM({
      initialState: 'BOOKING',
      states: ['BOOKING'],
      tools: { BOOKING: ['check_availability', 'reserve_slot'] },
      loopShield: { enabled: true, maxConsecutiveTools: 3 },
    });
    adapter = createVercelAdapter(fsm, registry, {
      contactId: 'test-loop',
      contactName: 'Juan',
      stepCount: 0,
    });
  });

  it('No fuerza stop con 2 tool calls consecutivas', async () => {
    const { prepareStep } = adapter.inject();
    const result = await prepareStep({
      steps: [
        { toolCalls: [{ toolName: 'check_availability' }] },
        { toolCalls: [{ toolName: 'reserve_slot' }] },
      ],
      stepNumber: 3,
    });

    expect(result).toEqual({ activeTools: ['check_availability', 'reserve_slot'] });
  });

  it('Fuerza toolChoice:none con 3+ tool calls consecutivas', async () => {
    const { prepareStep } = adapter.inject();
    const result = await prepareStep({
      steps: [
        {},
        { toolCalls: [{ toolName: 'check_availability' }] },
        { toolCalls: [{ toolName: 'reserve_slot' }] },
        { toolCalls: [{ toolName: 'check_availability' }] },
      ],
      stepNumber: 4,
    });

    expect(result).toEqual({ toolChoice: 'none' as const });
  });

  it('No fuerza stop si hubo un paso sin tools en el medio', async () => {
    const { prepareStep } = adapter.inject();
    const result = await prepareStep({
      steps: [
        { toolCalls: [{ toolName: 't1' }] },
        {},
        { toolCalls: [{ toolName: 't2' }] },
        { toolCalls: [{ toolName: 't3' }] },
      ],
      stepNumber: 4,
    });

    expect(result).toEqual({ activeTools: ['check_availability', 'reserve_slot'] });
  });
});

describe('Integration — Gate Refresh en flujo real', () => {
  it('prepareStep activa las tools del gate refrescado', async () => {
    const fsm = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING'],
      tools: {
        IDENTITY: ['validate_dni', 'collect_name'],
        BOOKING: ['check_availability', 'reserve_slot'],
      },
    });

    const adapter = createVercelAdapter(fsm, registry, {
      contactId: 'test-inline-refresh',
      contactName: null,
      stepCount: 0,
    });

    const { prepareStep } = adapter.inject();
    const before = await prepareStep({ steps: [], stepNumber: 1 });
    expect(before).toEqual({ activeTools: ['validate_dni', 'collect_name'] });

    adapter.refreshGate('BOOKING');

    const after = await prepareStep({ steps: [], stepNumber: 2 });
    expect(after).toEqual({ activeTools: ['check_availability', 'reserve_slot'] });
  });
});
