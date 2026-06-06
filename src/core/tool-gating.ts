export interface ToolEntry<TContext = any> {
  name: string;
  gates: string[];
  condition?: (ctx: TContext) => boolean;
  build: (ctx: TContext) => unknown;
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
