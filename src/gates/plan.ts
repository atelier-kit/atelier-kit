import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";
import { readAnyArtifactMarkdown, readAnyPlanMarkdown } from "../state/plan-artifacts.js";

export async function validatePlanGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const base = atelierDir(cwd);
  let outline = "";
  let plan = "";
  try {
    outline =
      (await readAnyArtifactMarkdown(cwd, "outline.md")) ??
      (await readFile(join(base, "artifacts", "outline.md"), "utf8"));
  } catch {
    return { ok: true, errors: [] };
  }
  const fromPlan = await readAnyPlanMarkdown(cwd);
  if (fromPlan == null) {
    errors.push("plan.md missing while outline.md exists");
    return { ok: false, errors };
  }
  plan = fromPlan;
  if (plan.includes("_TBD_")) {
    return { ok: true, errors: [] };
  }

  const sigs = outline.match(/`[^`]+`/g) ?? [];
  for (const line of plan.split("\n")) {
    if (!/^[-*]\s/.test(line.trim()) && !/^\d+\./.test(line.trim())) continue;
    if (!sigs.some((s) => line.includes(s.replace(/`/g, "")))) {
      if (/slice/i.test(line) && /:/.test(line)) continue;
    }
  }
  return { ok: errors.length === 0, errors };
}
