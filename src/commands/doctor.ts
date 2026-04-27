import pc from "picocolors";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { requireInitialized } from "../protocol/workspace.js";
import { validateWorkspace } from "../protocol/validator.js";

export async function cmdDoctor(cwd: string): Promise<void> {
  const checks = [
    ".atelier",
    ".atelier/atelier.json",
    ".atelier/active.json",
    ".atelier/protocol",
    ".atelier/rules",
    ".atelier/skills",
    ".atelier/schemas",
    ".atelier/epics",
  ];

  let installOk = true;
  for (const check of checks) {
    try {
      await access(join(cwd, check));
      console.log(pc.green(`✓ ${check}`));
    } catch {
      installOk = false;
      console.log(pc.red(`✗ ${check}`));
    }
  }

  try {
    await requireInitialized(cwd);
    const result = await validateWorkspace(cwd);
    if (result.ok) {
      console.log(pc.green("✓ protocol validation"));
    } else {
      console.log(pc.red("✗ protocol validation"));
      for (const error of result.errors) {
        console.log(pc.dim(`  - ${error}`));
      }
    }
    if (!result.ok) {
      process.exitCode = 1;
    }
  } catch (error) {
    installOk = false;
    console.log(pc.red("✗ protocol validation"));
    console.log(pc.dim(`  - ${error instanceof Error ? error.message : String(error)}`));
    process.exitCode = 1;
  }

  if (!installOk) {
    process.exitCode = 1;
  }
}
