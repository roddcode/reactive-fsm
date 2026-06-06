/**
 * Validación de Integración — Reactive FSM + Vercel AI SDK Adapter
 *
 * Simula un flujo de conversación multi-step completo:
 *   Greeting → Identity capture → Booking → Loop Shield trigger
 *
 * No requiere API key de OpenAI. Mockea el comportamiento del LLM.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createFSM, buildToolsForGate, createVercelAdapter } from '../src/index';
import type { ToolEntry } from '../src/index';

interface ChatContext {
  contactId: string;
  contactName: string | null;
  stepCount: number;
}

// ─── Mock tool builders ──────────────────────────────────────────────────────

const registry: ToolEntry<ChatContext>[] = [
  {
    name: 'greet_user',
    gates: ['GREETING'],
    build: (ctx) => ({
      description: `Greet user ${ctx.contactId}`,
      parameters: {},
      execute: async () => ({ greeting: `Hello ${ctx.contactId}` }),
    }),
  },
  {
    name: 'validate_dni',
    gates: ['IDENTITY'],
    build: () => ({
      description: 'Validate user DNI',
      parameters: {},
      execute: async () => ({ valid: true }),
    }),
  },
  {
    name: 'collect_name',
    gates: ['IDENTITY'],
    condition: (ctx) => ctx.contactName === null,
    build: () => ({
      description: 'Ask for and collect user name',
      parameters: {},
      execute: async () => ({ name: 'Collected' }),
    }),
  },
  {
    name: 'check_availability',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Check slot availability',
      parameters: {},
      execute: async () => ({ available: true, slots: ['10:00', '11:00'] }),
    }),
  },
  {
    name: 'reserve_slot',
    gates: ['BOOKING'],
    build: () => ({
      description: 'Reserve a time slot',
      parameters: {},
      execute: async () => ({ booked: true, slot: '10:00' }),
    }),
  },
  {
    name: 'process_payment',
    gates: ['PAYMENT'],
    build: () => ({
      description: 'Process payment',
      parameters: {},
      execute: async () => ({ paid: true }),
    }),
  },
  {
    name: 'send_receipt',
    gates: ['PAYMENT'],
    build: () => ({
      description: 'Send payment receipt',
      parameters: {},
      execute: async () => ({ sent: true }),
    }),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Simulador de flujo de conversación (mock del LLM)
// ─────────────────────────────────────────────────────────────────────────────
interface SimulatedStep {
  toolCalls: Array<{ toolName: string; args?: unknown }>;
  toolResults: Array<{ toolName: string; result?: unknown }>;
}

function simulateConversation(
  fsm: ReturnType<typeof createFSM>,
  adapter: ReturnType<typeof createVercelAdapter<ChatContext>>,
  steps: Array<{ state: string; toolNames: string[] }>,
): SimulatedStep[] {
  const history: SimulatedStep[] = [];

  for (const step of steps) {
    // External gate change (simulating DB mutation from tool execution)
    if (step.state !== fsm.currentState) {
      adapter.refreshGate(step.state);
    }

    // Build step with tool calls
    const toolCalls = step.toolNames.map((name) => ({ toolName: name }));
    const toolResults = step.toolNames.map((name) => ({
      toolName: name,
      result: { ok: true },
    }));

    history.push({ toolCalls, toolResults });
  }

  return history;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

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

  it('Step 1: Greeting gate — solo greet_user disponible', () => {
    const { tools } = adapter.inject();
    expect(Object.keys(tools)).toEqual(['greet_user']);
    expect(tools.greet_user).toHaveProperty('description');
    expect((tools.greet_user as any).description).toContain('test-1');
  });

  it('Step 2: Transición a IDENTITY — se inyectan tools de identidad', () => {
    adapter.refreshGate('IDENTITY');
    const { tools } = adapter.inject();
    expect(Object.keys(tools).sort()).toEqual(['collect_name', 'validate_dni']);
  });

  it('Step 3: collect_name oculta si el contacto ya tiene nombre', () => {
    const ctxWithName: ChatContext = { contactId: 'test-2', contactName: 'Juan', stepCount: 0 };
    const fsm2 = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING'],
      tools: { IDENTITY: ['validate_dni', 'collect_name'], BOOKING: [] },
    });
    const adapter2 = createVercelAdapter(fsm2, registry, ctxWithName);
    const { tools } = adapter2.inject();
    expect(Object.keys(tools)).toEqual(['validate_dni']);
    expect('collect_name' in tools).toBe(false);
  });

  it('Step 4: Transición a BOOKING — tools de reserva disponibles', () => {
    adapter.refreshGate('BOOKING');
    const { tools } = adapter.inject();
    expect(Object.keys(tools).sort()).toEqual(['check_availability', 'reserve_slot']);
  });

  it('Step 5: Transición a PAYMENT — tools de pago disponibles', () => {
    adapter.refreshGate('PAYMENT');
    const { tools } = adapter.inject();
    expect(Object.keys(tools).sort()).toEqual(['process_payment', 'send_receipt']);
  });
});

describe('Integration — Loop Shield en flujo multi-step', () => {
  const fsm = createFSM({
    initialState: 'BOOKING',
    states: ['BOOKING'],
    tools: { BOOKING: ['check_availability', 'reserve_slot'] },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const adapter = createVercelAdapter(fsm, registry, {
    contactId: 'test-loop',
    contactName: 'Juan',
    stepCount: 0,
  });

  it('No fuerza stop con 2 tools consecutivas', async () => {
    const { prepareStep } = adapter.inject();

    const result = await prepareStep!({
      steps: [
        { toolCalls: [{ toolName: 'check_availability' }] },
        { toolCalls: [{ toolName: 'reserve_slot' }] },
      ],
      stepNumber: 3,
    });

    expect(result).toEqual({});
  });

  it('Fuerza toolChoice:none con 3+ tools consecutivas', async () => {
    const { prepareStep } = adapter.inject();

    const result = await prepareStep!({
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

    const result = await prepareStep!({
      steps: [
        { toolCalls: [{ toolName: 't1' }] },
        {}, // paso sin tools — rompe la cadena
        { toolCalls: [{ toolName: 't2' }] },
        { toolCalls: [{ toolName: 't3' }] },
      ],
      stepNumber: 4,
    });

    expect(result).toEqual({});
  });
});

describe('Integration — Gate Refresh en flujo real', () => {
  it('Gate refresh dentro de prepareStep: detecta cambio y muta tools in-place', async () => {
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

    const { tools, prepareStep } = adapter.inject();
    expect(Object.keys(tools).sort()).toEqual(['collect_name', 'validate_dni']);

    // Simular que un tool ejecutado en el paso anterior mutó la DB
    adapter.refreshGate('BOOKING');

    // prepareStep debe detectar el cambio de gate y actualizar tools in-place
    await prepareStep!({
      steps: [],
      stepNumber: 1,
    });

    // El objeto tools mutó — ahora contiene tools de BOOKING
    expect(Object.keys(tools).sort()).toEqual(['check_availability', 'reserve_slot']);
  });
});
