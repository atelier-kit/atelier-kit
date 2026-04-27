import { readFile } from "node:fs/promises";
import { countInstructions, extractInstructions, listSkillFiles } from "../skill-loader.js";

export async function validateInstructionBudget(
  skillsRoot: string,
  max = 40,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const skills = await listSkillFiles(skillsRoot);
  for (const skill of skills) {
    let raw: string;
    try {
      raw = await readFile(skill.path, "utf8");
    } catch {
      errors.push(`Missing skill file: ${skill.label}`);
      continue;
    }
    const ix = extractInstructions(raw);
    const n = countInstructions(ix);
    if (n > max) {
      errors.push(`${skill.label}: ${n} instruction lines (max ${max})`);
    }
    if (n === 0) {
      errors.push(`${skill.label}: no numbered/bullet instructions found`);
    }
  }
  return { ok: errors.length === 0, errors };
}
