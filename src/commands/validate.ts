import pc from "picocolors";
import { PhaseSchema } from "../state/schema.js";
import { runValidatePhase, defaultSkillsRoot } from "../gates/run.js";

export async function cmdValidate(cwd: string, phase: string): Promise<void> {
  const parsed = PhaseSchema.safeParse(phase);
  if (!parsed.success) {
    console.error(pc.red(`Invalid phase: ${phase}`));
    process.exitCode = 1;
    return;
  }
  const skillsRoot = defaultSkillsRoot(cwd);
  const { ok, errors } = await runValidatePhase(cwd, parsed.data, skillsRoot);
  if (ok) {
    console.log(pc.green(`validate ${parsed.data}: OK`));
  } else {
    console.log(pc.red(`validate ${parsed.data}: failed`));
    for (const e of errors) console.log(pc.dim(`  - ${e}`));
    process.exitCode = 1;
  }
}
