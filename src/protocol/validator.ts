import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ZodError } from "zod";
import { atelierPath, epicDir } from "./paths.js";
import {
  readActiveState,
  readAtelierConfig,
  readEpicState,
} from "./state.js";
import type { ActiveState, EpicState } from "./schema.js";

const execFileAsync = promisify(execFile);

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

function planHasReviewableShape(plan: string): string[] {
  const errors: string[] = [];
  if (!/## Goal\b/.test(plan)) errors.push("plan.md missing ## Goal");
  if (!/## Slices\b/.test(plan)) errors.push("plan.md missing ## Slices");
  if (/No slices defined yet\./i.test(plan)) return errors;
  if (!/### Slice\s+\d+/i.test(plan)) errors.push("plan.md has no slice sections");
  if (!/\*\*Goal:\*\*/i.test(plan)) errors.push("each slice must include **Goal:**");
  if (!/\*\*Acceptance criteria:\*\*/i.test(plan)) {
    errors.push("each slice must include acceptance criteria");
  }
  if (!/\*\*Validation:\*\*/i.test(plan)) {
    errors.push("each slice must include validation steps");
  }
  return errors;
}

function validateStateCoherence(state: EpicState): string[] {
  const errors: string[] = [];
  const canWrite = state.allowed_actions.write_project_code;
  if (state.status === "execution") {
    if (!canWrite) errors.push("execution requires allowed_actions.write_project_code=true");
    if (state.approval.status !== "approved") errors.push("execution requires approval.status=approved");
    if (!state.current_slice) errors.push("execution requires current_slice");
  } else if (state.status === "awaiting_approval" && state.approval.status !== "approved") {
    errors.push("before_execution requires approval.status=approved");
  } else if (canWrite) {
    errors.push(`${state.status} must not allow project code writes`);
  }

  if (state.status === "approved" && state.approval.status !== "approved") {
    errors.push("status=approved requires approval.status=approved");
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

function isAllowedPreExecutionPath(file: string, allowed: string[]): boolean {
  return allowed.some((pattern) => {
    if (pattern.endsWith("/**")) return file.startsWith(pattern.slice(0, -3));
    return file === pattern;
  });
}

async function changedFiles(cwd: string, baseline: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", baseline, "--"], { cwd });
    const { stdout: untracked } = await execFileAsync("git", ["ls-files", "--others", "--exclude-standard"], { cwd });
    return [...stdout.split("\n"), ...untracked.split("\n")]
      .map((file) => file.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function validatePrematureDiff(cwd: string, state: EpicState): Promise<string[]> {
  if (state.status === "execution" && state.approval.status === "approved") return [];
  const files = await changedFiles(cwd, state.guards.baseline_ref);
  return files
    .filter((file) => !isAllowedPreExecutionPath(file, state.guards.allowed_pre_execution_paths))
    .map((file) => `premature project code change before approval: ${file}`);
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

  for (const artifact of state.required_artifacts) {
    const path = join(epicDir(cwd, state.epic_id), artifact);
    if (!(await exists(path))) errors.push(`required artifact missing: ${artifact}`);
  }

  const planPath = join(epicDir(cwd, state.epic_id), "plan.md");
  if (await exists(planPath)) {
    const plan = await readFile(planPath, "utf8");
    errors.push(...planHasReviewableShape(plan));
  } else if (state.status === "planning" || state.status === "awaiting_approval" || state.status === "approved") {
    errors.push("plan.md required before approval/execution");
  }

  if (state.status === "approved" && !state.slices.some((slice) => slice.status === "ready")) {
    errors.push("before_execution requires at least one ready slice");
  }

  errors.push(...await validatePrematureDiff(cwd, state));

  return { ok: errors.length === 0, errors, warnings, active, state };
}

export async function doctorProtocol(cwd: string): Promise<ValidationReport> {
  const report = await validateProtocol(cwd);
  for (const path of [
    "protocol/workflow.yaml",
    "protocol/gates.yaml",
    "protocol/modes.yaml",
    "protocol/skills.yaml",
    "rules/core.md",
    "skills/repo-analyst.md",
    "schemas/atelier.schema.json",
  ]) {
    if (!(await exists(atelierPath(cwd, path)))) {
      report.errors.push(`installation file missing: .atelier/${path}`);
    }
  }
  report.ok = report.errors.length === 0;
  return report;
}
