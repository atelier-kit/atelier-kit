import matter from "gray-matter";
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { z } from "zod";
import type { EpicState } from "./protocol/schema.js";

const FrontSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  phase: z.union([z.string(), z.array(z.string())]).optional(),
  reads: z.array(z.string()).optional(),
  produces: z.array(z.string()).optional(),
});

export interface SkillFront {
  name: string;
  description: string;
  phase?: string | string[];
  reads?: string[];
  produces?: string[];
}

export interface SkillFile {
  name: string;
  path: string;
  label: string;
}

export async function listSkillFiles(skillsRoot: string): Promise<SkillFile[]> {
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const found: SkillFile[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const name = basename(entry.name, ".md");
    found.push({
      name,
      path: join(skillsRoot, entry.name),
      label: entry.name,
    });
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadSkill(
  skillsRoot: string,
  folder: string,
): Promise<{ front: SkillFront; body: string; instructions: string }> {
  const p = join(skillsRoot, `${folder}.md`);
  const raw = await readFile(p, "utf8");
  const { data, content } = matter(raw);
  const parsed = FrontSchema.parse(data);
  const front: SkillFront = {
    ...parsed,
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

export function activeSkillFolder(state: Pick<EpicState, "active_skill">): string | null {
  return state.active_skill;
}
