import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function validateSkillShape(
  skillsRoot: string,
): Promise<{ ok: boolean; errors: string[] }> {
  const errors: string[] = [];
  const dirs = await readdir(skillsRoot, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const p = join(skillsRoot, d.name, "SKILL.md");
    const raw = await readFile(p, "utf8").catch(() => "");
    if (!raw) {
      errors.push(`Missing ${d.name}/SKILL.md`);
      continue;
    }
    const { data } = matter(raw);
    const name = (data as { name?: string }).name;
    const desc = (data as { description?: string }).description;
    if (!name) errors.push(`${d.name}: missing frontmatter name`);
    if (!desc) errors.push(`${d.name}: missing frontmatter description`);

    const reads = ((data as { reads?: string[] }).reads ?? []).join(" ").toLowerCase();
    if (d.name === "researcher") {
      if (reads.includes("brief"))
        errors.push(`researcher: reads must not reference brief.md`);
      if (raw.toLowerCase().includes("brief.md"))
        errors.push(`researcher/SKILL.md must not mention brief.md`);
    }
  }
  return { ok: errors.length === 0, errors };
}
