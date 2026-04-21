import pc from "picocolors";
import { PhaseSchema } from "../state/schema.js";
import { readContext, writeContext } from "../state/context.js";
import { refreshFallbackAdapters } from "../adapters/index.js";

export async function cmdReturn(
  cwd: string,
  toPhase: string,
  reason: string,
): Promise<void> {
  const parsed = PhaseSchema.safeParse(toPhase);
  if (!parsed.success) {
    console.error(pc.red(`Invalid phase: ${toPhase}`));
    process.exitCode = 1;
    return;
  }
  const { meta, body } = await readContext(cwd);
  const from = meta.phase;
  const at = new Date().toISOString();
  await writeContext(
    cwd,
    {
      ...meta,
      phase: parsed.data,
      returns: [...meta.returns, { from, to: parsed.data, reason, at }],
    },
    body,
  );
  await refreshFallbackAdapters(cwd);
  console.log(pc.green(`Returned ${from} → ${parsed.data}`));
}
