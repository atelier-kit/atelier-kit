import { access } from "node:fs/promises";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  AtelierConfigSchema,
  ActiveStateSchema,
  EpicStateSchema,
  type AtelierConfig,
  type ActiveState,
  type EpicState,
  type Violation,
} from "./schema.js";
import {
  atelierConfigPath,
  activeStatePath,
  epicStatePath,
  epicDir,
  atelierRoot,
} from "./paths.js";
import { readAtelierConfig, readActiveState, readEpicState } from "./io.js";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  violations: Violation[];
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export async function validateAtelierConfig(cwd: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const p = atelierConfigPath(cwd);
  if (!(await fileExists(p))) {
    return { ok: false, errors: ["atelier.json not found"], violations: [] };
  }
  try {
    const raw = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile(p, "utf8")),
    );
    AtelierConfigSchema.parse(raw);
  } catch (e: unknown) {
    errors.push(`atelier.json is invalid: ${String(e)}`);
  }
  return { ok: errors.length === 0, errors, violations: [] };
}

export async function validateActiveState(cwd: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const p = activeStatePath(cwd);
  if (!(await fileExists(p))) {
    return { ok: false, errors: ["active.json not found"], violations: [] };
  }
  try {
    const raw = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile(p, "utf8")),
    );
    ActiveStateSchema.parse(raw);
  } catch (e: unknown) {
    errors.push(`active.json is invalid: ${String(e)}`);
  }
  return { ok: errors.length === 0, errors, violations: [] };
}

export async function validateEpicState(
  cwd: string,
  epicId: string,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const violations: Violation[] = [];
  const p = epicStatePath(cwd, epicId);

  if (!(await fileExists(p))) {
    return { ok: false, errors: [`state.json not found for epic '${epicId}'`], violations: [] };
  }

  let state: EpicState;
  try {
    const raw = JSON.parse(
      await import("node:fs/promises").then((fs) => fs.readFile(p, "utf8")),
    );
    state = EpicStateSchema.parse(raw);
  } catch (e: unknown) {
    return {
      ok: false,
      errors: [`state.json for epic '${epicId}' is invalid: ${String(e)}`],
      violations: [],
    };
  }

  // Validate approval field exists
  if (!state.approval) {
    errors.push("state.json missing 'approval' field");
  }

  // Validate execution gate
  if (state.status === "execution") {
    if (state.approval.status !== "approved") {
      errors.push(
        "before_execution gate failed: approval.status must be 'approved' to execute",
      );
    }
    if (!state.current_slice) {
      errors.push("before_execution gate failed: current_slice must be set for execution");
    }
    if (!state.allowed_actions.write_project_code) {
      errors.push(
        "before_execution gate failed: allowed_actions.write_project_code must be true during execution",
      );
    }
  }

  if (state.status === "awaiting_approval") {
    if (state.approval.status === "approved") {
      errors.push(
        "Inconsistent state: status=awaiting_approval but approval.status=approved",
      );
    }
  }

  // Validate required artifacts exist
  const epicBase = epicDir(cwd, epicId);
  for (const artifact of state.required_artifacts) {
    const artifactPath = join(epicBase, artifact);
    if (!(await fileExists(artifactPath))) {
      errors.push(`Required artifact missing: ${artifact}`);
    }
  }

  // before_approval gate: plan.md slices
  if (
    state.status === "awaiting_approval" ||
    state.status === "approved" ||
    state.status === "execution"
  ) {
    if (state.slices.length === 0) {
      errors.push("before_approval gate failed: plan must have at least one slice");
    }
    for (const slice of state.slices) {
      if (!slice.goal) {
        errors.push(`Slice '${slice.id}' missing goal`);
      }
      if (!slice.acceptance_criteria || slice.acceptance_criteria.length === 0) {
        errors.push(`Slice '${slice.id}' missing acceptance_criteria`);
      }
      if (!slice.validation || slice.validation.length === 0) {
        errors.push(`Slice '${slice.id}' missing validation steps`);
      }
    }
  }

  // Check pre-approval code changes guard
  if (
    state.status !== "execution" &&
    state.status !== "review" &&
    state.status !== "native" &&
    state.status !== "paused"
  ) {
    const codeViolations = detectPrematureCodeChanges(cwd, state.guards.baseline_ref);
    violations.push(...codeViolations);
  }

  return {
    ok: errors.length === 0 && violations.length === 0,
    errors,
    violations,
  };
}

export function detectPrematureCodeChanges(
  cwd: string,
  baselineRef: string,
): Violation[] {
  const violations: Violation[] = [];
  try {
    const output = execSync(`git diff --name-only ${baselineRef}`, {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const changedFiles = output
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    for (const file of changedFiles) {
      if (!file.startsWith(".atelier/") && !file.startsWith(".atelier\\")) {
        violations.push({
          type: "premature_code_change",
          message: `Project file modified before approval: ${file}`,
          at: new Date().toISOString(),
        });
      }
    }
  } catch {
    // git diff failed — not a git repo or no commits yet, skip
  }
  return violations;
}

export async function runFullValidation(cwd: string): Promise<{
  ok: boolean;
  configResult: ValidationResult;
  activeResult: ValidationResult;
  epicResult: ValidationResult | null;
}> {
  const configResult = await validateAtelierConfig(cwd);
  const activeResult = await validateActiveState(cwd);

  let epicResult: ValidationResult | null = null;

  if (activeResult.ok) {
    let activeState: ActiveState;
    try {
      activeState = await readActiveState(cwd);
    } catch {
      return { ok: false, configResult, activeResult, epicResult };
    }

    if (activeState.active && activeState.active_epic) {
      epicResult = await validateEpicState(cwd, activeState.active_epic);
    }
  }

  const ok =
    configResult.ok &&
    activeResult.ok &&
    (epicResult === null || epicResult.ok);

  return { ok, configResult, activeResult, epicResult };
}
