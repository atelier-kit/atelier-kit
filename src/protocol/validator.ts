import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { parsePlanDocument } from "./gates.js";
import { epicArtifactPath } from "./paths.js";
import { readActiveState, readAtelierConfig, readEpicState, writeEpicState } from "./workspace.js";
import type { EpicState } from "./types.js";

const execFileAsync = promisify(execFile);

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  violations: string[];
}

export async function validateWorkspace(cwd: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const violations: string[] = [];

  let config;
  let active;
  try {
    config = await readAtelierConfig(cwd);
  } catch (error) {
    return {
      ok: false,
      errors: [toMessage(error, "Invalid .atelier/atelier.json")],
      warnings,
      violations,
    };
  }

  try {
    active = await readActiveState(cwd);
  } catch (error) {
    return {
      ok: false,
      errors: [toMessage(error, "Invalid .atelier/active.json")],
      warnings,
      violations,
    };
  }

  if (!active.active) {
    if (active.mode !== "native") {
      errors.push("active.json must use mode=native when Atelier is inactive");
    }
    return { ok: errors.length === 0, errors, warnings, violations };
  }

  if (!active.active_epic) {
    errors.push("active.json must define active_epic when active=true");
    return { ok: false, errors, warnings, violations };
  }

  if (active.mode !== "atelier") {
    errors.push("active.json must use mode=atelier when Atelier is active");
  }

  let state: EpicState;
  try {
    state = await readEpicState(cwd, active.active_epic);
  } catch (error) {
    errors.push(toMessage(error, `Invalid state for epic ${active.active_epic}`));
    return { ok: false, errors, warnings, violations };
  }

  validateStateCoherence(state, errors);

  for (const artifact of state.required_artifacts) {
    const file = epicArtifactPath(cwd, active.active_epic, artifact);
    try {
      await readFile(file, "utf8");
    } catch {
      errors.push(`Missing required artifact: ${artifact}`);
    }
  }

  const planPath = epicArtifactPath(cwd, active.active_epic, "plan.md");
  let planContent = "";
  try {
    planContent = await readFile(planPath, "utf8");
  } catch {
    planContent = "";
  }

  if (planContent && shouldValidatePlan(state.status)) {
    const planCheck = parsePlanDocument(planContent);
    errors.push(...planCheck.errors);
  }

  for (const slice of state.slices) {
    if (!slice.goal.trim()) {
      errors.push(`Slice ${slice.id} is missing goal`);
    }
    if (slice.acceptance_criteria.length === 0) {
      errors.push(`Slice ${slice.id} is missing acceptance_criteria`);
    }
    if (slice.validation.length === 0) {
      errors.push(`Slice ${slice.id} is missing validation steps`);
    }
  }

  if (state.status === "execution") {
    if (state.approval.status !== "approved") {
      errors.push("execution requires approval.status=approved");
    }
    if (!state.current_slice) {
      errors.push("execution requires current_slice");
    }
  }

  if (config.guards.detect_pre_approval_code_changes) {
    const changedFiles = await diffAgainstBaseline(cwd, state.guards.baseline_ref);
    const outsideAllowed = changedFiles.filter(
      (file) => !matchesAllowed(file, state.guards.allowed_pre_execution_paths),
    );
    if (outsideAllowed.length > 0 && state.status !== "execution") {
      const violation = `Premature project code changes detected before execution: ${outsideAllowed.join(", ")}`;
      violations.push(violation);
      errors.push(violation);
    }
  }

  state.violations = violations;
  await writeEpicState(cwd, active.active_epic, state);

  return { ok: errors.length === 0, errors, warnings, violations };
}

function validateStateCoherence(state: EpicState, errors: string[]): void {
  if (state.status === "execution" && !state.allowed_actions.write_project_code) {
    errors.push("state.status=execution requires write_project_code=true");
  }
  if (state.status !== "execution" && state.allowed_actions.write_project_code) {
    errors.push("write_project_code must remain false before execution");
  }
  if (state.status === "awaiting_approval" && state.approval.status !== "pending") {
    errors.push("awaiting_approval requires approval.status=pending");
  }
  if (state.status === "approved" && state.approval.status !== "approved") {
    errors.push("approved state requires approval.status=approved");
  }
}

async function diffAgainstBaseline(cwd: string, baselineRef: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["diff", "--name-only", baselineRef, "--"], { cwd });
    return stdout
      .split(/?
/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch (error) {
    const message = toMessage(error, "git diff failed");
    if (
      /not a git repository/i.test(message)
      || /ambiguous argument/i.test(message)
      || /unknown revision/i.test(message)
    ) {
      return [];
    }
    throw error;
  }
}

function matchesAllowed(file: string, patterns: string[]): boolean {
  const normalized = file.replace(/\/g, "/");
  return patterns.some((pattern) => {
    const cleanPattern = pattern.replace(/\/g, "/");
    if (cleanPattern.endsWith("/**")) {
      const prefix = cleanPattern.slice(0, -3);
      return normalized === prefix || normalized.startsWith(`${prefix}/`);
    }
    return normalized === cleanPattern;
  });
}

function shouldValidatePlan(status: EpicState["status"]): boolean {
  return ["awaiting_approval", "approved", "execution", "review", "done"].includes(status);
}

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
