import pc from "picocolors";
import { AtelierModeSchema } from "../protocol/schema.js";
import { createEpic } from "../protocol/epic.js";

type CommandMode = "quick" | "standard" | "deep";

export async function cmdNew(
  cwd: string,
  title: string,
  opts: { mode?: string; goal?: string },
): Promise<void> {
  const parsedMode = opts.mode ? AtelierModeSchema.safeParse(opts.mode) : null;
  if (parsedMode && (!parsedMode.success || parsedMode.data === "native")) {
    console.error(pc.red(`Invalid Atelier mode: ${opts.mode}`));
    process.exitCode = 1;
    return;
  }

  try {
    const mode = parsedMode?.success ? (parsedMode.data as CommandMode) : undefined;
    const state = await createEpic(cwd, {
      title,
      goal: opts.goal,
      mode,
    });
    console.log(pc.green(`Atelier epic created: ${state.epic_id}`));
    console.log(pc.dim(`mode=${state.mode} status=${state.status} skill=${state.active_skill}`));
    console.log(pc.dim(`source of truth: .atelier/epics/${state.epic_id}/state.json`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
