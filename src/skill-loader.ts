import matter from "gray-matter";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import type { ContextMeta, Phase, TaskType } from "./state/schema.js";

const FrontSchema = z.object({
  name: z.string(),
  description: z.string(),
  phase: z.union([z.string(), z.array(z.string())]).optional(),
  reads: z.array(z.string()).optional(),
  produces: z.array(z.string()).optional(),
});

export type SkillFront = z.infer<typeof FrontSchema>;

export async function loadSkill(
  skillsRoot: string,
  folder: string,
): Promise<{ front: SkillFront; body: string; instructions: string }> {
  const p = join(skillsRoot, folder, "SKILL.md");
  const raw = await readFile(p, "utf8");
  const { data, content } = matter(raw);
  const front = FrontSchema.parse(data);
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

/** Map runtime phase to skill directory name under .atelier/skills */
export function phaseToSkillFolder(phase: Phase): string | null {
  const map: Partial<Record<Phase, string>> = {
    questions: "questions",
    research: "researcher",
    design: "designer",
    outline: "designer",
    plan: "planner",
    implement: "implementer",
    review: "reviewer",
    learn: "chronicler",
  };
  return map[phase] ?? null;
}

export function taskTypeToSkillFolder(taskType: TaskType): string {
  const map: Record<TaskType, string> = {
    repo: "repo-analyst",
    tech: "tech-analyst",
    business: "business-analyst",
    synthesis: "planner",
    implementation: "implementer",
    decision: "designer",
  };
  return map[taskType];
}

export function activeSkillFolder(meta: ContextMeta): string | null {
  if (meta.workflow === "planner" && meta.planner_state === "awaiting_approval") {
    return "planner";
  }
  if (meta.workflow === "planner" && meta.current_task) {
    const task = meta.tasks.find((entry) => entry.id === meta.current_task);
    if (task) {
      return taskTypeToSkillFolder(task.type);
    }
  }
  if (
    meta.workflow === "planner" &&
    meta.current_slice &&
    meta.phase === "implement" &&
    meta.planner_state === "executing"
  ) {
    return "implementer";
  }
  return phaseToSkillFolder(meta.phase);
}
