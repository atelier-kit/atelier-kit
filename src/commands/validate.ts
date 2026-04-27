import pc from "picocolors";
import { requireInitialized } from "../protocol/workspace.js";
import { validateWorkspace } from "../protocol/validator.js";

export async function cmdValidate(cwd: string): Promise<void> {
  await requireInitialized(cwd);
  const { ok, errors, warnings, violations } = await validateWorkspace(cwd);
  if (ok) {
    console.log(pc.green("atelier validate: OK"));
  } else {
    console.log(pc.red("atelier validate: failed"));
  }
  for (const warning of warnings) {
    console.log(pc.yellow(`  warning: ${warning}`));
  }
  for (const violation of violations) {
    console.log(pc.red(`  violation: ${violation}`));
  }
  for (const error of errors.filter((error) => !violations.includes(error))) {
    console.log(pc.dim(`  - ${error}`));
  }
  if (!ok) {
    process.exitCode = 1;
  }
}
