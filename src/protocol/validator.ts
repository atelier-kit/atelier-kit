import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import { atelierPath, epicDir } from "./paths.js";
import {
  readActiveState,
  readAtelierConfig,
  readEpicState,
} from "./state.js";
import type { ActiveState, AdapterName, EpicState } from "./schema.js";

export type ValidationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  active?: ActiveState;
  state?: EpicState | null;
};

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function zodMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  }
  return (error as Error).message;
}

function planHasReviewableShape(plan: string, strictSlices = false): string[] {
  const errors: string[] = [];
  if (!/## Goal\b/.test(plan)) errors.push("plan.md missing ## Goal");
  if (!/## Slices\b/.test(plan)) errors.push("plan.md missing ## Slices");
  if (/No slices defined yet\./i.test(plan)) {
    if (strictSlices) errors.push("plan.md has no slice sections");
    return errors;
  }
  if (!/### Slice\s+\d+/i.test(plan)) errors.push("plan.md has no slice sections");
  if (!/\*\*Goal:\*\*/i.test(plan)) errors.push("each slice must include **Goal:**");
  if (!/\*\*Acceptance criteria:\*\*/i.test(plan)) {
    errors.push("each slice must include acceptance criteria");
  }
  if (!/\*\*Validation:\*\*/i.test(plan)) {
    errors.push("each slice must include validation steps");
  }
  if (!/## Risks\b/.test(plan)) errors.push("plan.md missing ## Risks");
  return errors;
}

function expectedTaskArtifacts(taskType: EpicState["tasks"][number]["type"]): string[] {
  switch (taskType) {
    case "questions":
      return ["questions.md"];
    case "repo":
      return ["research/repo.md"];
    case "tech":
      return ["research/tech.md"];
    case "business":
      return ["research/business.md"];
    case "synthesis":
      return ["synthesis.md"];
    case "design":
      return ["design.md"];
    case "planning":
      return ["plan.md"];
    case "review":
      return ["review.md"];
  }
}

function expectedSkillForStatus(status: EpicState["status"]): string[] {
  switch (status) {
    case "discovery":
      return ["questioner", "repo-analyst", "tech-analyst", "business-analyst"];
    case "synthesis":
    case "planning":
      return ["planner"];
    case "design":
      return ["designer"];
    case "review":
      return ["reviewer"];
    case "planned":
    case "done":
    case "native":
    case "idle":
    case "blocked":
      return [];
  }
}

function artifactLooksPending(content: string): boolean {
  const normalized = content.trim();
  return /^# .+\n\nPending\.?$/i.test(normalized) ||
    /^# .+\n\n_Pending\b/i.test(normalized) ||
    /\b_Pending\._/i.test(normalized);
}

function questionsLookGenericOnly(content: string): boolean {
  const lower = content.toLowerCase();
  const hasSeedRepo = lower.includes("which existing files and patterns constrain this work");
  const hasSeedTech = lower.includes("which framework or dependency constraints need verification");
  const hasSeedBusiness = lower.includes("what user-visible outcomes and edge cases define success");
  const hasExplicitNoOpen = /##\s+(no open questions|sem perguntas abertas)\b/i.test(content);
  const hasSpecificQuestionSection = /##\s+.+(questions|perguntas|unknowns|incertezas)/i.test(content) &&
    !/##\s+perguntas geradas automaticamente/i.test(content);
  return hasSeedRepo && hasSeedTech && hasSeedBusiness && !hasExplicitNoOpen && !hasSpecificQuestionSection;
}

export async function validatePlanReady(
  cwd: string,
  state: EpicState,
): Promise<string[]> {
  const errors: string[] = [];
  if (state.status !== "planned") {
    errors.push("Plan can only be finalized when status is planned");
  }
  const planPath = join(epicDir(cwd, state.epic_id), "plan.md");
  if (!(await exists(planPath))) {
    errors.push("planning requires plan.md");
  } else {
    const plan = await readFile(planPath, "utf8");
    errors.push(...planHasReviewableShape(plan, true));
  }
  if (state.slices.length === 0) {
    errors.push("planning requires at least one slice");
  }
  for (const slice of state.slices) {
    if (!slice.goal.trim()) errors.push(`slice ${slice.id} missing goal`);
    if (slice.acceptance_criteria.length === 0) {
      errors.push(`slice ${slice.id} missing acceptance criteria`);
    }
    if (slice.validation.length === 0) {
      errors.push(`slice ${slice.id} missing validation steps`);
    }
  }
  return errors;
}

function validateStateCoherence(state: EpicState): string[] {
  const errors: string[] = [];
  const expectedSkills = expectedSkillForStatus(state.status);
  if (
    expectedSkills.length > 0 &&
    (!state.active_skill || !expectedSkills.includes(state.active_skill))
  ) {
    errors.push(`${state.status} requires active_skill in [${expectedSkills.join(", ")}]`);
  }
  for (const slice of state.slices) {
    if (!slice.goal.trim()) errors.push(`slice ${slice.id} missing goal`);
    if (slice.acceptance_criteria.length === 0) {
      errors.push(`slice ${slice.id} missing acceptance criteria`);
    }
    if (slice.validation.length === 0) {
      errors.push(`slice ${slice.id} missing validation steps`);
    }
  }
  for (const task of state.tasks) {
    const expected = expectedTaskArtifacts(task.type);
    if (!expected.includes(task.artifact)) {
      errors.push(`task ${task.id} (${task.type}) must write ${expected.join(" or ")}, not ${task.artifact}`);
    }
  }
  const questions = state.tasks.find((task) => task.type === "questions");
  if (questions && questions.status !== "done") {
    const advanced = state.tasks.find((task) =>
      task.type !== "questions" &&
      (task.status === "in_progress" || task.status === "done")
    );
    if (advanced) {
      errors.push(`task ${advanced.id} cannot start before questions are done`);
    }
  }
  return errors;
}

async function validateCompletedTaskArtifacts(cwd: string, state: EpicState): Promise<string[]> {
  const errors: string[] = [];
  for (const task of state.tasks) {
    if (task.status !== "done") continue;
    const path = join(epicDir(cwd, state.epic_id), task.artifact);
    if (!(await exists(path))) {
      errors.push(`task ${task.id} is done but artifact is missing: ${task.artifact}`);
      continue;
    }
    const content = await readFile(path, "utf8");
    if (artifactLooksPending(content)) {
      errors.push(`task ${task.id} is done but artifact is still pending: ${task.artifact}`);
    }
    if (task.type === "questions" && questionsLookGenericOnly(content)) {
      errors.push("task questions is done but questions.md is still generic");
    }
  }
  return errors;
}

export async function validateProtocol(cwd: string): Promise<ValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let active: ActiveState | undefined;
  let state: EpicState | null = null;

  try {
    await readAtelierConfig(cwd);
  } catch (error) {
    errors.push(`atelier.json invalid or missing: ${zodMessage(error)}`);
  }

  try {
    active = await readActiveState(cwd);
  } catch (error) {
    errors.push(`active.json invalid or missing: ${zodMessage(error)}`);
  }

  if (!active) return { ok: false, errors, warnings, state };
  if (!active.active) {
    if (active.mode !== "native") errors.push("inactive active.json must use mode=native");
    return { ok: errors.length === 0, errors, warnings, active, state };
  }

  if (!active.active_epic) {
    errors.push("active_epic is required when active=true");
    return { ok: false, errors, warnings, active, state };
  }

  try {
    state = await readEpicState(cwd, active.active_epic);
  } catch (error) {
    errors.push(`state.json invalid or missing: ${zodMessage(error)}`);
    return { ok: false, errors, warnings, active, state };
  }

  if (active.active_phase !== state.status) {
    errors.push("active_phase must match active epic status");
  }
  if (active.active_skill !== state.active_skill) {
    errors.push("active_skill must match active epic active_skill");
  }

  errors.push(...validateStateCoherence(state));
  errors.push(...await validateCompletedTaskArtifacts(cwd, state));

  for (const artifact of state.required_artifacts) {
    const path = join(epicDir(cwd, state.epic_id), artifact);
    if (!(await exists(path))) errors.push(`required artifact missing: ${artifact}`);
  }

  const planPath = join(epicDir(cwd, state.epic_id), "plan.md");
  if (await exists(planPath) && (state.status === "planned" || state.status === "review" || state.status === "done")) {
    const plan = await readFile(planPath, "utf8");
    errors.push(...planHasReviewableShape(plan, true));
  } else if (state.status === "planning") {
    errors.push("plan.md required before finalizing planning");
  }

  return { ok: errors.length === 0, errors, warnings, active, state };
}

export async function doctorProtocol(cwd: string): Promise<ValidationReport> {
  const report = await validateProtocol(cwd);
  let adapter: AdapterName | null = null;
  try {
    adapter = (await readAtelierConfig(cwd)).adapter;
  } catch {
    adapter = null;
  }
  for (const path of [
    "protocol/workflow.yaml",
    "protocol/gates.yaml",
    "protocol/modes.yaml",
    "protocol/skills.yaml",
    "rules/core.md",
    "skills/questioner.md",
    "skills/repo-analyst.md",
    "skills/tech-analyst.md",
    "skills/business-analyst.md",
    "skills/planner.md",
    "skills/designer.md",
    "skills/reviewer.md",
    "schemas/atelier.schema.json",
    "schemas/active.schema.json",
    "schemas/epic-state.schema.json",
    "schemas/slice.schema.json",
    "schemas/gate.schema.json",
    "schemas/plan.schema.json",
  ]) {
    if (!(await exists(atelierPath(cwd, path)))) {
      report.errors.push(`installation file missing: .atelier/${path}`);
    }
  }
  if (adapter) {
    const adapterFiles: Record<AdapterName, string[]> = {
      cursor: [".cursor/rules/atelier-core.mdc"],
      "claude-code": ["CLAUDE.md", ".claude/commands/atelier.md"],
      claude: ["CLAUDE.md", ".claude/commands/atelier.md"],
      codex: ["AGENTS.md"],
      "gemini-cli": ["GEMINI.md"],
      antigravity: [".antigravity/atelier.md"],
      kiro: [".kiro/steering/atelier.md"],
      kilo: [".kilocode/rules/atelier.md"],
      cline: [".clinerules/atelier-core.md"],
      windsurf: [".windsurfrules"],
      generic: ["atelier-system-prompt.txt"],
    };
    for (const path of adapterFiles[adapter]) {
      if (!(await exists(join(cwd, path)))) {
        report.errors.push(`adapter file missing for ${adapter}: ${path}`);
      }
    }
  }
  report.ok = report.errors.length === 0;
  return report;
}
