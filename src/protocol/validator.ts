import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ZodError } from "zod";
import { atelierPath, epicDir } from "./paths.js";
import {
  readActiveState,
  readAtelierConfig,
  readEpicState,
} from "./state.js";
import { adapterInstalledPaths } from "../adapters/install.js";
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
      return ["researcher"];
    case "synthesis":
    case "planning":
    case "review":
      return ["planner"];
    case "design":
      return ["designer"];
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

export type PlanReadyReport = {
  errors: string[];
  warnings: string[];
};

// A pattern is "catch-all" when the framework cannot meaningfully tell whether
// a change belongs to the slice or to drift. Heuristic: any pattern that is a
// pure wildcard, or a single top-level segment followed by recursive glob
// (e.g. "src/star-star"). Anything more constrained passes.
function isCatchAllPattern(pattern: string): boolean {
  const segments = pattern.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return true;
  if (segments.length === 1 && (segments[0] === "*" || segments[0] === "**")) return true;
  const nonWildcard = segments.filter((s) => s !== "**" && s !== "*");
  return segments.includes("**") && nonWildcard.length <= 1;
}

const VAGUE_CRITERION = /\b(works?|is\s+correct|is\s+implemented|is\s+done|works?\s+correctly|complete[ds]?)\b/i;

function isCriterionVague(criterion: string): boolean {
  const trimmed = criterion.trim();
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 8) return true;
  return VAGUE_CRITERION.test(trimmed) && wordCount < 12;
}

// Names that suggest a shell-executable validation step. Order doesn't matter;
// any match means at least one entry in the slice's validation list could be
// run by `atelier review`.
const EXECUTABLE_HINT = /\b(npm|pnpm|yarn|node|bun|deno|python|pip|pytest|tox|cargo|go|rake|mvn|gradle|make|sh|bash|zsh|fish|docker|kubectl|helm|terraform|jest|vitest|mocha|playwright|cypress|tsc|eslint|prettier|ruff|mypy|black|psql|sqlite3|curl|wget|http|hurl|atelier)\b/i;

function looksExecutable(step: string): boolean {
  return EXECUTABLE_HINT.test(step);
}

/**
 * `## Risks` is "empty" when the section is missing, blank, or contains only
 * placeholder boilerplate (`_None._`, `_Pending_`, `_TBD_`, or table rows whose
 * only content is one of those markers).
 */
function risksAreEmpty(plan: string): boolean {
  const match = plan.match(/##\s+Risks\b([\s\S]*?)(?=\n##\s|\n#\s|$)/i);
  if (!match) return true;
  const body = match[1].trim();
  if (!body) return true;
  // Strip markdown emphasis and lowercase for placeholder detection.
  const stripped = body.replace(/[*_`]/g, "").toLowerCase();
  // Remove table header/separator rows so a header-only Risks table reads empty.
  const informative = stripped
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      line &&
      !/^[|:\-\s]+$/.test(line) &&
      !/^\|\s*risk\s*\|.*impact.*\|.*mitigation\s*\|?$/i.test(line),
    );
  if (informative.length === 0) return true;
  // Every remaining line is a placeholder marker → still empty.
  return informative.every((line) =>
    /\b(none|pending|tbd|todo|n\/a)\b\.?$/.test(line.replace(/\|/g, " ").trim()) ||
    /^(none|pending|tbd|todo|n\/a)\b/i.test(line.replace(/^\|+\s*/, "").trim()),
  );
}

export async function validatePlanReady(
  cwd: string,
  state: EpicState,
): Promise<PlanReadyReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (state.status !== "planned") {
    errors.push("Plan can only be finalized when status is planned");
  }
  const planPath = join(epicDir(cwd, state.epic_id), "plan.md");
  let planText: string | null = null;
  if (!(await exists(planPath))) {
    errors.push("planning requires plan.md");
  } else {
    planText = await readFile(planPath, "utf8");
    errors.push(...planHasReviewableShape(planText, true));
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
    if (slice.allowed_files.length === 0) {
      errors.push(
        `slice ${slice.id} missing allowed_files (declare which paths this slice may modify)`,
      );
    } else {
      const catchAll = slice.allowed_files.find(isCatchAllPattern);
      if (catchAll) {
        errors.push(
          `slice ${slice.id} allowed_files pattern "${catchAll}" is too broad for review; restrict to specific files or sub-paths (e.g. "src/auth/**" or "src/auth/login.ts")`,
        );
      }
    }
    for (const criterion of slice.acceptance_criteria) {
      if (isCriterionVague(criterion)) {
        warnings.push(
          `slice ${slice.id} acceptance criterion is vague: "${criterion}" — rewrite as an observable condition (≥8 words, avoid "works"/"is correct")`,
        );
      }
    }
    if (slice.validation.length > 0 && !slice.validation.some(looksExecutable)) {
      warnings.push(
        `slice ${slice.id} validation has no recognizable executable command (atelier review cannot run prose like "${slice.validation[0]}"); include at least one shell-runnable step`,
      );
    }
  }
  if (state.mode === "deep" && planText && risksAreEmpty(planText)) {
    errors.push(
      "deep mode requires a populated ## Risks section in plan.md (placeholders like _None._ or _Pending_ are not enough)",
    );
  }
  return { errors, warnings };
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
  const planExists = await exists(planPath);
  if (planExists && (state.status === "planned" || state.status === "review" || state.status === "done")) {
    const plan = await readFile(planPath, "utf8");
    errors.push(...planHasReviewableShape(plan, true));
  } else if (state.status === "planning" && !planExists) {
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
    "rules/core.md",
    "skills/researcher.md",
    "skills/designer.md",
    "skills/planner.md",
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
    for (const path of adapterInstalledPaths(adapter as AdapterName)) {
      if (!(await exists(join(cwd, path)))) {
        report.errors.push(`adapter file missing for ${adapter}: ${path}`);
      }
    }
  }
  report.ok = report.errors.length === 0;
  return report;
}
