/**
 * Manual validation: reactive-fsm core.
 * Run with: pnpm exec tsx tests/manual.ts
 */
import { createFSM } from '../src/core/machine';
import { buildToolsForGate } from '../src/core/tool-gating';
import { createLoopShield } from '../src/core/loop-shield';
import type { ToolEntry } from '../src/core/tool-gating';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ok   ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

function assertThrows(fn: () => void, label: string): void {
  try {
    fn();
    console.error(`  FAIL ${label} (expected an error, none thrown)`);
    failed++;
  } catch {
    console.log(`  ok   ${label}`);
    passed++;
  }
}

// Test 1: initial state and tools
console.log('\nTest 1: initial state and tools');

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

assert(fsm.currentState === 'IDENTITY', 'initial state is IDENTITY');
assert(fsm.allowedTools.length === 2, 'two tools available in IDENTITY');
assert(fsm.allowedTools.includes('validate_dni'), 'validate_dni is available');
assert(fsm.allowedTools.includes('check_patient'), 'check_patient is available');

// Test 2: transition changes tools
console.log('\nTest 2: transition changes allowedTools');

fsm.transitionTo('BOOKING');
assert(fsm.currentState === 'BOOKING', 'state changed to BOOKING');
assert(fsm.allowedTools.length === 2, 'two tools available in BOOKING');
assert(!fsm.allowedTools.includes('validate_dni'), 'validate_dni is gone in BOOKING');
assert(fsm.allowedTools.includes('check_availability'), 'check_availability is available');
assert(fsm.allowedTools.includes('reserve_slot'), 'reserve_slot is available');

fsm.transitionTo('PAYMENT');
assert(fsm.currentState === 'PAYMENT', 'state changed to PAYMENT');
assert(!fsm.allowedTools.includes('check_availability'), 'check_availability is gone in PAYMENT');
assert(fsm.allowedTools.includes('process_payment'), 'process_payment is available');

// Test 3: invalid state throws
console.log('\nTest 3: invalid state throws');

assertThrows(
  () => fsm.transitionTo('NONEXISTENT' as any),
  'transitionTo with an invalid state throws',
);

assertThrows(
  () => fsm._setState('NONEXISTENT' as any),
  '_setState with an invalid state throws',
);

// Test 4: loop shield
console.log('\nTest 4: loop shield');

const fsmLoop = createFSM({
  initialState: 'A',
  states: ['A', 'B'],
  tools: { A: ['t1'], B: ['t2'] },
  loopShield: { enabled: true, maxConsecutiveTools: 3 },
});

assert(!fsmLoop.isLooping, 'loop shield idle at the start');

fsmLoop._registerToolCall(); // 1
assert(!fsmLoop.isLooping, 'one tool call is not a loop');

fsmLoop._registerToolCall(); // 2
assert(!fsmLoop.isLooping, 'two tool calls are not a loop');

fsmLoop._registerToolCall(); // 3
assert(fsmLoop.isLooping, 'three tool calls trigger the loop (maxConsecutiveTools=3)');

fsmLoop._resetLoopShield();
assert(!fsmLoop.isLooping, 'reset clears the loop');

// Test 5: loop shield disabled
console.log('\nTest 5: loop shield disabled');

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
assert(!fsmNoLoop.isLooping, 'a disabled loop shield never reports looping');

// Test 6: tool gating with conditions
console.log('\nTest 6: tool gating with conditions');

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
assert(Object.keys(userTools).length === 1, 'regular user gets one tool');
assert('public_tool' in userTools, 'regular user gets public_tool');
assert(!('admin_tool' in userTools), 'regular user does not get admin_tool');

const adminTools = buildToolsForGate('IDENTITY', { role: 'admin' }, registry);
assert(Object.keys(adminTools).length === 2, 'admin gets two tools');
assert('admin_tool' in adminTools, 'admin gets admin_tool');

// Test 7: build() receives the context
console.log('\nTest 7: build() receives the context');

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
assert(capturedCtx !== null, 'build() was called');
assert((capturedCtx as any).x === 42, 'build() received the right context');
assert((result as any).spy.value === 42, 'the built tool carries the context');

// Test 8: loop shield standalone
console.log('\nTest 8: loop shield standalone');

const shield = createLoopShield({ enabled: true, maxConsecutiveTools: 2 });
assert(!shield.isLooping(), 'fresh shield is not looping');
shield.registerToolCall();
shield.registerToolCall();
assert(shield.isLooping(), 'two calls with max=2 report looping');
shield.reset();
assert(!shield.isLooping(), 'reset clears it');

console.log(`\nPassed: ${passed}  Failed: ${failed}\n`);

if (failed > 0) {
  process.exit(1);
}
