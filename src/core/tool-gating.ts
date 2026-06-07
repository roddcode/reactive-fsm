export interface ToolEntry<TContext = any> {
  name: string;
  gates: string[];
  condition?: (ctx: TContext) => boolean;
  build: (ctx: TContext) => unknown;
  schema?: unknown;
}

interface Validator {
  safeParse?: (args: unknown) => { success: boolean; data?: unknown; error?: { issues?: Array<{ message: string }> }; issues?: Array<{ message: string }> };
}

export function validateWith(
  schema: unknown,
  args: unknown,
): { ok: true; data: unknown } | { ok: false; error: string } {
  const s = schema as Validator | null | undefined;
  if (!s || typeof s.safeParse !== 'function') {
    return { ok: true, data: args };
  }
  const result = s.safeParse(args);
  if (result.success) {
    const data = 'data' in result ? result.data : 'output' in result ? (result as Record<string, unknown>).output : args;
    return { ok: true, data };
  }
  const issues = result.error?.issues ?? result.issues ?? [];
  const error = issues.map((i: { message: string }) => i.message).join(', ') || 'Validation failed';
  return { ok: false, error };
}

export function buildToolsForGate<TContext = any>(
  gate: string,
  ctx: TContext,
  registry: ToolEntry<TContext>[],
): Record<string, unknown> {
  return Object.fromEntries(
    registry
      .filter((entry) => entry.gates.includes(gate))
      .filter((entry) => entry.condition === undefined || entry.condition(ctx))
      .map((entry) => [entry.name, entry.build(ctx)]),
  );
}
