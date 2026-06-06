/**
 * Tests para el adapter de OpenAI SDK
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createFSM, createOpenAIAdapter } from '../src/index';
import type { ToolEntry } from '../src/index';

interface TestCtx {
  contactId: string;
  role: 'user' | 'admin';
}

const registry: ToolEntry<TestCtx>[] = [
  {
    name: 'validate_dni',
    gates: ['IDENTITY', 'BOOKING'],
    build: (ctx) => ({
      type: 'function' as const,
      function: {
        name: 'validate_dni',
        description: `Validate DNI for ${ctx.contactId}`,
        parameters: { type: 'object', properties: {} },
      },
    }),
  },
  {
    name: 'check_availability',
    gates: ['BOOKING'],
    build: () => ({
      type: 'function' as const,
      function: {
        name: 'check_availability',
        description: 'Check slot availability',
        parameters: { type: 'object', properties: {} },
      },
    }),
  },
  {
    name: 'reserve_slot',
    gates: ['BOOKING'],
    build: () => ({
      type: 'function' as const,
      function: {
        name: 'reserve_slot',
        description: 'Reserve a time slot',
        parameters: { type: 'object', properties: {} },
      },
    }),
  },
  {
    name: 'admin_panel',
    gates: ['IDENTITY', 'BOOKING'],
    condition: (ctx) => ctx.role === 'admin',
    build: () => ({
      type: 'function' as const,
      function: {
        name: 'admin_panel',
        description: 'Access admin panel',
        parameters: { type: 'object', properties: {} },
      },
    }),
  },
];

describe('OpenAI Adapter — Tool Injection', () => {
  const ctx: TestCtx = { contactId: 'test-1', role: 'user' };

  const fsm = createFSM({
    initialState: 'IDENTITY',
    states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
    tools: {
      IDENTITY: ['validate_dni', 'admin_panel'],
      BOOKING: ['validate_dni', 'check_availability', 'reserve_slot', 'admin_panel'],
      PAYMENT: [],
    },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const adapter = createOpenAIAdapter(fsm, registry, ctx);

  it('retorna tools como array en formato OpenAI', () => {
    const { tools } = adapter.inject();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    const tool = tools[0] as any;
    expect(tool.type).toBe('function');
    expect(tool.function).toBeDefined();
    expect(tool.function.name).toBeDefined();
  });

  it('inyecta solo tools del gate actual (IDENTITY)', () => {
    const { tools } = adapter.inject();
    const names = tools.map((t: any) => t.function.name);
    expect(names).toContain('validate_dni');
    expect(names).not.toContain('check_availability');
  });

  it('respeta condiciones — admin_panel no se inyecta para user', () => {
    const { tools } = adapter.inject();
    const names = tools.map((t: any) => t.function.name);
    expect(names).not.toContain('admin_panel');
  });

  it('admin_panel sí se inyecta para admin', () => {
    const adminCtx: TestCtx = { contactId: 'test-2', role: 'admin' };
    const adminAdapter = createOpenAIAdapter(fsm, registry, adminCtx);
    const { tools } = adminAdapter.inject();
    const names = tools.map((t: any) => t.function.name);
    expect(names).toContain('admin_panel');
  });

  it('cambia tools al hacer refreshGate', () => {
    adapter.refreshGate('BOOKING');
    const { tools } = adapter.inject();
    const names = tools.map((t: any) => t.function.name).sort();
    expect(names).toEqual(['check_availability', 'reserve_slot', 'validate_dni']);
  });

  it('refrescar a un gate sin tools devuelve array vacío', () => {
    adapter.refreshGate('PAYMENT');
    const { tools } = adapter.inject();
    expect(tools).toEqual([]);
  });
});

describe('OpenAI Adapter — Loop Shield', () => {
  const fsm = createFSM({
    initialState: 'BOOKING',
    states: ['BOOKING'],
    tools: { BOOKING: ['check_availability', 'reserve_slot'] },
    loopShield: { enabled: true, maxConsecutiveTools: 3 },
  });

  const adapter = createOpenAIAdapter(fsm, registry, {
    contactId: 'loop-test',
    role: 'user',
  });

  it('no reporta loop al inicio', () => {
    expect(adapter.isLooping()).toBe(false);
  });

  it('no reporta loop con 2 tool calls', () => {
    adapter.registerToolCall();
    adapter.registerToolCall();
    expect(adapter.isLooping()).toBe(false);
  });

  it('reporta loop con 3 tool calls (maxConsecutiveTools=3)', () => {
    adapter.registerToolCall(); // tercera
    expect(adapter.isLooping()).toBe(true);
  });

  it('reset limpia el contador', () => {
    adapter.resetLoopShield();
    expect(adapter.isLooping()).toBe(false);
  });

  it('no reporta loop con shield deshabilitado', () => {
    const fsmNoLoop = createFSM({
      initialState: 'BOOKING',
      states: ['BOOKING'],
      tools: { BOOKING: ['check_availability'] },
      loopShield: { enabled: false, maxConsecutiveTools: 2 },
    });
    const noLoopAdapter = createOpenAIAdapter(fsmNoLoop, registry, {
      contactId: 'x',
      role: 'user',
    });
    noLoopAdapter.registerToolCall();
    noLoopAdapter.registerToolCall();
    noLoopAdapter.registerToolCall();
    expect(noLoopAdapter.isLooping()).toBe(false);
  });
});

describe('OpenAI Adapter — Flujo conversacional simulado', () => {
  it('simula un ciclo completo de tool calls estilo OpenAI SDK', async () => {
    const fsm = createFSM({
      initialState: 'IDENTITY',
      states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
      tools: {
        IDENTITY: ['validate_dni'],
        BOOKING: ['check_availability', 'reserve_slot'],
        PAYMENT: [],
      },
      loopShield: { enabled: true, maxConsecutiveTools: 3 },
    });

    const adapter = createOpenAIAdapter(fsm, registry, {
      contactId: 'flow-test',
      role: 'user',
    });

    // Turno 1: IDENTITY gate → validar DNI
    {
      const { tools } = adapter.inject();
      const names = tools.map((t: any) => t.function.name);
      expect(names).toEqual(['validate_dni']);

      // Simular que el LLM llamó validate_dni
      adapter.registerToolCall();
      expect(adapter.isLooping()).toBe(false);

      // La tool mutó el estado en DB → refreshGate
      adapter.refreshGate('BOOKING');
    }

    // Turno 2: BOOKING gate → tools de reserva
    {
      const { tools } = adapter.inject();
      const names = tools.map((t: any) => t.function.name).sort();
      expect(names).toEqual(['check_availability', 'reserve_slot', 'validate_dni']);

      // Simular que el LLM llamó check_availability y reserve_slot
      adapter.registerToolCall(); // 2
      adapter.registerToolCall(); // 3 → LOOP!
      expect(adapter.isLooping()).toBe(true);

      // El consumidor ve isLooping=true y setea tool_choice:'none'
    }

    // Turno 3: Sin tools (tool_choice:'none') → respuesta final
    {
      // Verificamos que el gate sigue siendo BOOKING
      fsm.transitionTo('BOOKING');
      const { tools } = adapter.inject();
      expect(tools.length).toBeGreaterThan(0); // tools siguen definidas, pero el consumidor no las usa
    }
  });
});
