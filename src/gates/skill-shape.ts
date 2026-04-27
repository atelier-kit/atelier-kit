import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { listSkillFiles } from "../skill-loader.js";

export async function validateSkillShape(
  skillsRoot: string,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const legacyPath = join(skillsRoot, entry.name, "SKILL.md");
    const legacy = await readFile(legacyPath, "utf8").catch(() => null);
    if (legacy !== null) {
      errors.push(`Legacy skill directory is not supported: ${entry.name}/SKILL.md`);
    }
  }

  const skills = await listSkillFiles(skillsRoot);
  for (const skill of skills) {
    const raw = await readFile(skill.path, "utf8").catch(() => "");
    if (!raw) {
      errors.push(`Missing skill file: ${skill.label}`);
      continue;
    }
    const { data } = matter(raw);
    const name = (data as { name?: string }).name;
    if (name && name !== skill.name) {
      errors.push(`${skill.label}: frontmatter name "${name}" does not match file "${skill.name}"`);
    }

    const reads = ((data as { reads?: string[] }).reads ?? []).join(" ").toLowerCase();
    if (skill.name === "researcher") {
      if (reads.includes("brief"))
        errors.push(`researcher: reads must not reference brief.md`);
      if (raw.toLowerCase().includes("brief.md"))
        errors.push(`${skill.label} must not mention brief.md`);
    }
  }
  return { ok: errors.length === 0, errors };
}
