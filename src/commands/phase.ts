import pc from "picocolors";
import { PhaseSchema, type Phase } from "../state/schema.js";
import { setPhase } from "../state/context.js";
import { refreshFallbackAdapters } from "../adapters/index.js";

export async function cmdPhase(cwd: string, phase: string): Promise<void> {
  const parsed = PhaseSchema.safeParse(phase);
  if (!parsed.success) {
    console.error(pc.red(`Invalid phase: ${phase}`));
    process.exitCode = 1;
    return;
  }
  await setPhase(cwd, parsed.data);
  await refreshFallbackAdapters(cwd);
  console.log(pc.green(`Phase set to ${parsed.data}`));
}
