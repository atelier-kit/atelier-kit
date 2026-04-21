import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { countInstructions, extractInstructions } from "../skill-loader.js";

export async function validateInstructionBudget(
  skillsRoot: string,
  max = 40,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const dirs = await readdir(skillsRoot, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const p = join(skillsRoot, d.name, "SKILL.md");
    let raw: string;
    try {
      raw = await readFile(p, "utf8");
    } catch {
      errors.push(`Missing SKILL.md: ${d.name}`);
      continue;
    }
    const ix = extractInstructions(raw);
    const n = countInstructions(ix);
    if (n > max) {
      errors.push(`${d.name}/SKILL.md: ${n} instruction lines (max ${max})`);
    }
    if (n === 0) {
      errors.push(`${d.name}/SKILL.md: no numbered/bullet instructions found`);
    }
  }
  return { ok: errors.length === 0, errors };
}
