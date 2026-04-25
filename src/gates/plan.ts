import { readAnyArtifactMarkdown, readAnyPlanMarkdown } from "../state/plan-artifacts.js";

export async function validatePlanGate(cwd: string): Promise<{
  ok: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  const outline = await readAnyArtifactMarkdown(cwd, "outline.md");
  if (!outline) return { ok: true, errors: [] };
  const plan = await readAnyPlanMarkdown(cwd);
  if (plan === null) {
    errors.push("plan.md missing while outline.md exists");
    return { ok: false, errors };
  }
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
