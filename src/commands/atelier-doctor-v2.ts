import pc from "picocolors";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";
import { validateProtocolV2, protocolV2Installed } from "../protocol/validator.js";

export async function cmdAtelierDoctorV2(cwd: string): Promise<void> {
  const reports: { name: string; errors: string[] }[] = [];

  const layout = ["atelier.json", "active.json", "protocol/workflow.yaml", "rules/core.md"];
  const layoutErrors: string[] = [];
  for (const rel of layout) {
    try {
      await access(join(atelierDir(cwd), rel));
    } catch {
      layoutErrors.push(`missing ${rel}`);
    }
  }
  reports.push({ name: "layout", errors: layoutErrors });

  if (await protocolV2Installed(cwd)) {
    const v = await validateProtocolV2(cwd);
    reports.push({
      name: "protocol",
      errors: v.issues.filter((i) => i.level === "error").map((i) => i.message),
    });
  }

  for (const r of reports) {
    if (r.errors.length === 0) console.log(pc.green(`✓ ${r.name}`));
    else {
      console.log(pc.red(`✗ ${r.name}`));
      for (const e of r.errors) console.log(pc.dim(`  - ${e}`));
    }
  }
  if (!reports.every((x) => x.errors.length === 0)) process.exitCode = 1;
}
