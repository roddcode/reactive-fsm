/**
 * Validación Manual — Reactive FSM Core
 * Ejecutar con: npx tsx tests/manual.ts
 */
import { createFSM } from '../src/core/machine';
import { buildToolsForGate } from '../src/core/tool-gating';
import { createLoopShield } from '../src/core/loop-shield';
import type { ToolEntry } from '../src/core/tool-gating';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    failed++;
  }
}

function assertThrows(fn: () => void, label: string): void {
  try {
    fn();
    console.error(`  ❌ ${label} — esperaba error, no lanzó`);
    failed++;
  } catch {
    console.log(`  ✅ ${label} — error lanzado correctamente`);
    passed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 1 — Estado inicial y tools
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 1: Core — Estado inicial y transiciones ──');

const fsm = createFSM({
  initialState: 'IDENTITY',
  states: ['IDENTITY', 'BOOKING', 'PAYMENT'],
  tools: {
    IDENTITY: ['validate_dni', 'check_patient'],
    BOOKING: ['check_availability', 'reserve_slot'],
    PAYMENT: ['process_payment', 'send_receipt'],
  },
  loopShield: { enabled: true, maxConsecutiveTools: 3 },
});

assert(fsm.currentState === 'IDENTITY', 'Estado inicial es IDENTITY');
assert(fsm.allowedTools.length === 2, '2 tools disponibles en IDENTITY');
assert(fsm.allowedTools.includes('validate_dni'), 'validate_dni está disponible');
assert(fsm.allowedTools.includes('check_patient'), 'check_patient está disponible');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 2 — Transición cambia tools
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 2: Transición cambia allowedTools ──');

fsm.transitionTo('BOOKING');
assert(fsm.currentState === 'BOOKING', 'Estado cambió a BOOKING');
assert(fsm.allowedTools.length === 2, '2 tools disponibles en BOOKING');
assert(!fsm.allowedTools.includes('validate_dni'), 'validate_dni NO está en BOOKING');
assert(fsm.allowedTools.includes('check_availability'), 'check_availability sí está');
assert(fsm.allowedTools.includes('reserve_slot'), 'reserve_slot sí está');

fsm.transitionTo('PAYMENT');
assert(fsm.currentState === 'PAYMENT', 'Estado cambió a PAYMENT');
assert(!fsm.allowedTools.includes('check_availability'), 'check_availability NO está en PAYMENT');
assert(fsm.allowedTools.includes('process_payment'), 'process_payment sí está');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 3 — Estado inválido lanza error
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 3: Estado inválido ──');

assertThrows(
  () => fsm.transitionTo('NONEXISTENT' as any),
  'transitionTo a estado inválido lanza error',
);

assertThrows(
  () => fsm._setState('NONEXISTENT' as any),
  '_setState a estado inválido lanza error',
);

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 4 — Loop Shield
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 4: Loop Shield ──');

const fsmLoop = createFSM({
  initialState: 'A',
  states: ['A', 'B'],
  tools: { A: ['t1'], B: ['t2'] },
  loopShield: { enabled: true, maxConsecutiveTools: 3 },
});

assert(!fsmLoop.isLooping, 'Loop shield inactivo al inicio');

fsmLoop._registerToolCall(); // 1
assert(!fsmLoop.isLooping, '1 tool call → no hay loop');

fsmLoop._registerToolCall(); // 2
assert(!fsmLoop.isLooping, '2 tool calls → no hay loop');

fsmLoop._registerToolCall(); // 3
assert(fsmLoop.isLooping, '3 tool calls → LOOP DETECTADO (maxConsecutiveTools=3)');

fsmLoop._resetLoopShield();
assert(!fsmLoop.isLooping, 'Después de reset → no hay loop');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 5 — Loop Shield deshabilitado
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 5: Loop Shield deshabilitado ──');

const fsmNoLoop = createFSM({
  initialState: 'A',
  states: ['A', 'B'],
  tools: { A: ['t1'], B: ['t2'] },
  loopShield: { enabled: false, maxConsecutiveTools: 2 },
});

fsmNoLoop._registerToolCall();
fsmNoLoop._registerToolCall();
fsmNoLoop._registerToolCall();
fsmNoLoop._registerToolCall();
assert(!fsmNoLoop.isLooping, 'Loop shield deshabilitado nunca reporta loop');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 6 — Tool Gating con condiciones
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 6: Tool Gating con condiciones ──');

interface Ctx { role: 'user' | 'admin' }
const registry: ToolEntry<Ctx>[] = [
  {
    name: 'public_tool',
    gates: ['IDENTITY'],
    build: () => ({ execute: () => 'public' }),
  },
  {
    name: 'admin_tool',
    gates: ['IDENTITY'],
    condition: (ctx) => ctx.role === 'admin',
    build: () => ({ execute: () => 'admin' }),
  },
];

const userTools = buildToolsForGate('IDENTITY', { role: 'user' }, registry);
assert(Object.keys(userTools).length === 1, 'Usuario normal: solo 1 tool');
assert('public_tool' in userTools, 'Usuario normal tiene public_tool');
assert(!('admin_tool' in userTools), 'Usuario normal NO tiene admin_tool');

const adminTools = buildToolsForGate('IDENTITY', { role: 'admin' }, registry);
assert(Object.keys(adminTools).length === 2, 'Admin: 2 tools');
assert('admin_tool' in adminTools, 'Admin tiene admin_tool');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 7 — Build tools llama a build() con el contexto
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 7: build() recibe el contexto ──');

let capturedCtx: any = null;
const spyRegistry: ToolEntry<{ x: number }>[] = [
  {
    name: 'spy',
    gates: ['BOOKING'],
    build: (ctx) => {
      capturedCtx = ctx;
      return { value: ctx.x };
    },
  },
];

const result = buildToolsForGate('BOOKING', { x: 42 }, spyRegistry);
assert(capturedCtx !== null, 'build() fue llamado');
assert((capturedCtx as any).x === 42, 'build() recibió el contexto correcto');
assert((result as any).spy.value === 42, 'El tool construido usa el contexto');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA 8 — LoopShield standalone
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n── Prueba 8: LoopShield standalone ──');

const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 2 });
assert(!shield.isLooping(), 'Recién creado → no looping');
shield.registerToolCall();
shield.registerToolCall();
assert(shield.isLooping(), '2 calls con max=2 → looping');
shield.reset();
assert(!shield.isLooping(), 'Reset → no looping');

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADO
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`);
console.log(`  Pasaron: ${passed}  |  Fallaron: ${failed}`);
console.log(`${'═'.repeat(50)}\n`);

if (failed > 0) {
  process.exit(1);
}
