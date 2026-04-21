import { validateInstructionBudget } from "./instruction-budget.js";
import { validateSkillShape } from "./skill-shape.js";
import { validateQuestionsGate } from "./questions.js";
import { validateResearchGate } from "./research.js";
import { validateMarketResearchGate } from "./market-research.js";
import { validateDesignGate } from "./design.js";
import { validatePlanGate } from "./plan.js";
import { validateImplementGate } from "./implement.js";
import { join } from "node:path";
import { atelierDir } from "../fs-utils.js";
import type { Phase } from "../state/schema.js";

export type GateName =
  | "skills"
  | "questions"
  | "research"
  | "market-research"
  | "design"
  | "plan"
  | "implement";

export async function runDoctor(cwd: string, skillsRoot: string): Promise<{
  ok: boolean;
  reports: { name: string; errors: string[] }[];
}> {
  const reports: { name: string; errors: string[] }[] = [];

  const budget = await validateInstructionBudget(skillsRoot);
  reports.push({ name: "instruction-budget", errors: budget.errors });

  const shape = await validateSkillShape(skillsRoot);
  reports.push({ name: "skill-shape", errors: shape.errors });

  const q = await validateQuestionsGate(cwd);
  reports.push({ name: "questions", errors: q.errors });

  const r = await validateResearchGate(cwd);
  reports.push({ name: "research", errors: r.errors });

  const mr = await validateMarketResearchGate(cwd);
  reports.push({ name: "market-research", errors: mr.errors });

  const d = await validateDesignGate(cwd);
  reports.push({ name: "design", errors: d.errors });

  const p = await validatePlanGate(cwd);
  reports.push({ name: "plan", errors: p.errors });

  const i = await validateImplementGate(cwd);
  reports.push({ name: "implement", errors: i.errors });

  const ok = reports.every((x) => x.errors.length === 0);
  return { ok, reports };
}

export async function runValidatePhase(
  cwd: string,
  phase: Phase,
  skillsRoot: string,
): Promise<{ ok: boolean; errors: string[] }> {
  switch (phase) {
    case "questions":
      return validateQuestionsGate(cwd);
    case "research":
      return validateResearchGate(cwd);
    case "market-research":
      return validateMarketResearchGate(cwd);
    case "design":
    case "outline":
      return validateDesignGate(cwd);
    case "plan":
      return validatePlanGate(cwd);
    case "implement":
      return validateImplementGate(cwd);
    default: {
      const b = await validateInstructionBudget(skillsRoot);
      const s = await validateSkillShape(skillsRoot);
      return {
        ok: b.ok && s.ok,
        errors: [...b.errors, ...s.errors],
      };
    }
  }
}

export function defaultSkillsRoot(cwd: string): string {
  return join(atelierDir(cwd), "skills");
}
