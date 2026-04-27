import pc from "picocolors";
import { runFullValidation } from "../../protocol/validator.js";

export async function cmdV2Validate(cwd: string): Promise<void> {
  const { ok, configResult, activeResult, epicResult } = await runFullValidation(cwd);

  console.log(pc.bold("Atelier Validation"));
  console.log(pc.dim("─".repeat(40)));

  if (configResult.ok) {
    console.log(pc.green("  ✓ atelier.json"));
  } else {
    console.log(pc.red("  ✗ atelier.json"));
    for (const e of configResult.errors) {
      console.log(pc.red(`      ${e}`));
    }
  }

  if (activeResult.ok) {
    console.log(pc.green("  ✓ active.json"));
  } else {
    console.log(pc.red("  ✗ active.json"));
    for (const e of activeResult.errors) {
      console.log(pc.red(`      ${e}`));
    }
  }

  if (epicResult) {
    if (epicResult.ok) {
      console.log(pc.green("  ✓ epic state.json"));
    } else {
      console.log(pc.red("  ✗ epic state.json"));
      for (const e of epicResult.errors) {
        console.log(pc.red(`      ${e}`));
      }
    }

    if (epicResult.violations.length > 0) {
      console.log(pc.yellow("\n  Protocol Violations:"));
      for (const v of epicResult.violations) {
        console.log(pc.yellow(`    ! [${v.type}] ${v.message}`));
      }
    }
  } else {
    console.log(pc.dim("  — no active epic (native mode)"));
  }

  console.log("");
  if (ok) {
    console.log(pc.green("All checks passed."));
  } else {
    console.log(pc.red("Validation failed. Run `atelier doctor` for diagnostics."));
    process.exitCode = 1;
  }
}
