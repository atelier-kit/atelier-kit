import pc from "picocolors";
import { runDoctor, defaultSkillsRoot } from "../gates/run.js";

export async function cmdDoctor(cwd: string): Promise<void> {
  const skillsRoot = defaultSkillsRoot(cwd);
  const { ok, reports } = await runDoctor(cwd, skillsRoot);
  for (const r of reports) {
    if (r.errors.length === 0) {
      console.log(pc.green(`✓ ${r.name}`));
    } else {
      console.log(pc.red(`✗ ${r.name}`));
      for (const e of r.errors) console.log(pc.dim(`  - ${e}`));
    }
  }
  if (!ok) {
    process.exitCode = 1;
  }
}
