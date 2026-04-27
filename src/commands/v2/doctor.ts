import pc from "picocolors";
import { access } from "node:fs/promises";
import { join } from "node:path";
import {
  atelierRoot,
  atelierConfigPath,
  activeStatePath,
  protocolDir,
  rulesDir,
  skillsDir,
  schemasDir,
} from "../../protocol/paths.js";
import { readActiveState } from "../../protocol/io.js";
import { epicStatePath } from "../../protocol/paths.js";

interface CheckResult {
  name: string;
  ok: boolean;
  message?: string;
}

async function check(name: string, p: string): Promise<CheckResult> {
  try {
    await access(p);
    return { name, ok: true };
  } catch {
    return { name, ok: false, message: `missing: ${p}` };
  }
}

export async function cmdV2Doctor(cwd: string): Promise<void> {
  console.log(pc.bold("Atelier Doctor"));
  console.log(pc.dim("─".repeat(40)));

  const checks: CheckResult[] = [];

  checks.push(await check("atelier.json", atelierConfigPath(cwd)));
  checks.push(await check("active.json", activeStatePath(cwd)));
  checks.push(await check("protocol/", protocolDir(cwd)));
  checks.push(await check("protocol/workflow.yaml", join(protocolDir(cwd), "workflow.yaml")));
  checks.push(await check("protocol/gates.yaml", join(protocolDir(cwd), "gates.yaml")));
  checks.push(await check("protocol/modes.yaml", join(protocolDir(cwd), "modes.yaml")));
  checks.push(await check("protocol/skills.yaml", join(protocolDir(cwd), "skills.yaml")));
  checks.push(await check("rules/core.md", join(rulesDir(cwd), "core.md")));
  checks.push(await check("skills/", skillsDir(cwd)));
  checks.push(await check("skills/repo-analyst.md", join(skillsDir(cwd), "repo-analyst.md")));
  checks.push(await check("skills/planner.md", join(skillsDir(cwd), "planner.md")));
  checks.push(await check("skills/implementer.md", join(skillsDir(cwd), "implementer.md")));
  checks.push(await check("schemas/", schemasDir(cwd)));
  checks.push(await check("schemas/atelier.schema.json", join(schemasDir(cwd), "atelier.schema.json")));
  checks.push(await check("schemas/active.schema.json", join(schemasDir(cwd), "active.schema.json")));
  checks.push(await check("schemas/epic-state.schema.json", join(schemasDir(cwd), "epic-state.schema.json")));

  let active;
  try {
    active = await readActiveState(cwd);
    if (active.active && active.active_epic) {
      checks.push(
        await check(
          `epics/${active.active_epic}/state.json`,
          epicStatePath(cwd, active.active_epic),
        ),
      );
    }
  } catch {
    checks.push({ name: "active.json (readable)", ok: false, message: "Could not parse active.json" });
  }

  let allOk = true;
  for (const c of checks) {
    if (c.ok) {
      console.log(pc.green(`  ✓ ${c.name}`));
    } else {
      console.log(pc.red(`  ✗ ${c.name}`));
      if (c.message) console.log(pc.dim(`      ${c.message}`));
      allOk = false;
    }
  }

  console.log("");
  if (allOk) {
    console.log(pc.green("Installation is healthy."));
  } else {
    console.log(pc.red("Installation has problems. Run `atelier init` to repair."));
    process.exitCode = 1;
  }
}
