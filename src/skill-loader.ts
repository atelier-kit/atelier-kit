import matter from "gray-matter";
import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

const FrontSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export interface SkillFront {
  name: string;
  description: string;
}

export interface SkillFile {
  name: string;
  path: string;
  label: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover folder-based skills (`<root>/<name>/SKILL.md`) — the open Agent
 * Skills layout that `npx skills` and native loaders consume.
 */
export async function listSkillFiles(skillsRoot: string): Promise<SkillFile[]> {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const found: SkillFile[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const path = join(skillsRoot, entry.name, "SKILL.md");
    if (!(await fileExists(path))) continue;
    found.push({ name: entry.name, path, label: `${entry.name}/SKILL.md` });
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadSkill(
  skillsRoot: string,
  folder: string,
): Promise<{ front: SkillFront; body: string; instructions: string }> {
  const p = join(skillsRoot, folder, "SKILL.md");
  const raw = await readFile(p, "utf8");
  const { data, content } = matter(raw);
  const parsed = FrontSchema.parse(data);
  const front: SkillFront = {
    name: parsed.name ?? folder,
    description: parsed.description ?? "",
  };
  const instructions = extractInstructions(content);
  return { front, body: content, instructions };
}

export function extractInstructions(markdown: string): string {
  const m = markdown.match(
    /##\s+Instructions\b([\s\S]*?)(?=\n##\s|\n---\s*$|$)/i,
  );
  return m ? m[1].trim() : markdown;
}

export function countInstructions(instructionBlock: string): number {
  const lines = instructionBlock.split("\n");
  let n = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^\d+\.\s/.test(t) || /^[-*]\s/.test(t)) n++;
  }
  return n;
}
