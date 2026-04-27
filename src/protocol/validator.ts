import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { access } from "node:fs/promises";
import { atelierDir } from "../fs-utils.js";
import {
  activeJsonPath,
  atelierJsonPath,
  epicDir,
  epicStatePath,
} from "./paths.js";
import {
  ActiveJsonSchema,
  AtelierJsonSchema,
  EpicStateSchema,
  SliceSchema,
} from "./types.js";
import {
  parsePlanSlices,
  planHasDocumentedRisks,
  planHasGoal,
  planHasSlicesSection,
  planHasValidationSteps,
  readPlanMd,
} from "./plan-parse.js";
import { pathMatchesGlob } from "./glob-match.js";
import { gitChangedFiles } from "./git-diff.js";

export type ValidateIssue = { level: "error" | "warn"; message: string };

export async function validateProtocolV2(cwd: string): Promise<{
  ok: boolean;
  issues: ValidateIssue[];
}> {
  const issues: ValidateIssue[] = [];

  let atelierRaw: string;
  try {
    atelierRaw = await readFile(atelierJsonPath(cwd), "utf8");
  } catch {
    issues.push({
      level: "error",
      message: "atelier.json missing (run `atelier init`)",
    });
    return { ok: false, issues };
  }

  const atelierParsed = AtelierJsonSchema.safeParse(JSON.parse(atelierRaw));
  if (!atelierParsed.success) {
    issues.push({
      level: "error",
      message: `atelier.json invalid: ${atelierParsed.error.message}`,
    });
  }

  let activeRaw: string;
  try {
    activeRaw = await readFile(activeJsonPath(cwd), "utf8");
  } catch {
    issues.push({
      level: "error",
      message: "active.json missing",
    });
    return { ok: false, issues };
  }

  const activeParsed = ActiveJsonSchema.safeParse(JSON.parse(activeRaw));
  if (!activeParsed.success) {
    issues.push({
      level: "error",
      message: `active.json invalid: ${activeParsed.error.message}`,
    });
    return { ok: false, issues };
  }

  const active = activeParsed.data;

  if (active.active && !active.active_epic) {
    issues.push({
      level: "error",
      message: "active=true but active_epic is null",
    });
  }

  if (!active.active) {
    const ok = issues.every((i) => i.level !== "error");
    return { ok, issues };
  }

  const epic = active.active_epic!;
  const statePath = epicStatePath(cwd, epic);
  let stateRaw: string;
  try {
    stateRaw = await readFile(statePath, "utf8");
  } catch {
    issues.push({
      level: "error",
      message: `state.json missing for epic "${epic}"`,
    });
    return { ok: false, issues };
  }

  let state: ReturnType<typeof EpicStateSchema.parse>;
  const stateParsed = EpicStateSchema.safeParse(JSON.parse(stateRaw));
  if (!stateParsed.success) {
    issues.push({
      level: "error",
      message: `state.json invalid: ${stateParsed.error.message}`,
    });
    return { ok: false, issues };
  }
  state = stateParsed.data;

  coherenceAllowedActions(state, issues);
  await requiredArtifactsExist(cwd, epic, state, issues);
  await planGates(cwd, epic, state, issues);
  executionGates(state, issues);
  sliceSchemaGates(state, issues);

  const atelierConfig = atelierParsed.success ? atelierParsed.data : null;
  if (atelierConfig?.guards.use_git_diff && atelierConfig.guards.detect_pre_approval_code_changes) {
    await prematureCodeGuard(cwd, state, issues);
  }

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues };
}

function coherenceAllowedActions(
  state: ReturnType<typeof EpicStateSchema.parse>,
  issues: ValidateIssue[],
): void {
  const s = state.status;
  const w = state.allowed_actions.write_project_code;
  if (s === "execution" && !w) {
    issues.push({
      level: "error",
      message: "status=execution requires allowed_actions.write_project_code=true",
    });
  }
  if (
    [
      "discovery",
      "synthesis",
      "design",
      "planning",
      "awaiting_approval",
      "approved",
    ].includes(s) &&
    w
  ) {
    issues.push({
      level: "error",
      message: `status=${s} should not allow write_project_code`,
    });
  }
}

async function requiredArtifactsExist(
  cwd: string,
  epic: string,
  state: ReturnType<typeof EpicStateSchema.parse>,
  issues: ValidateIssue[],
): Promise<void> {
  for (const rel of state.required_artifacts) {
    const p = join(epicDir(cwd, epic), rel);
    try {
      await access(p);
    } catch {
      issues.push({
        level: "warn",
        message: `Missing required artifact for mode: ${rel}`,
      });
    }
  }
}

async function planGates(
  cwd: string,
  epic: string,
  state: ReturnType<typeof EpicStateSchema.parse>,
  issues: ValidateIssue[],
): Promise<void> {
  const needsFullPlan = [
    "awaiting_approval",
    "approved",
    "execution",
    "review",
    "done",
  ].includes(state.status);

  const plan = await readPlanMd(cwd, epic);
  if (!plan && needsFullPlan) {
    issues.push({ level: "error", message: "plan.md missing" });
    return;
  }
  if (!plan || !needsFullPlan) return;

  if (!planHasGoal(plan)) {
    issues.push({ level: "error", message: "plan.md must have a ## Goal section" });
  }
  if (!planHasSlicesSection(plan)) {
    issues.push({ level: "error", message: "plan.md must have a ## Slices section" });
  }

  const parsedSlices = parsePlanSlices(plan);
  if (parsedSlices.length > 0) {
    for (const sl of parsedSlices) {
      if (!sl.hasGoal) {
        issues.push({
          level: "error",
          message: `Slice "${sl.title}" (${sl.id}): missing goal`,
        });
      }
      if (!sl.hasAcceptance) {
        issues.push({
          level: "error",
          message: `before_approval: slice "${sl.title}" missing acceptance criteria`,
        });
      }
      if (!sl.hasValidation) {
        issues.push({
          level: "error",
          message: `Slice "${sl.title}" missing validation steps`,
        });
      }
    }
  } else if (state.slices.length === 0 && ["awaiting_approval", "approved", "execution"].includes(state.status)) {
    issues.push({
      level: "error",
      message: "plan has no slices and state.slices is empty",
    });
  }

  if (!planHasDocumentedRisks(plan)) {
    issues.push({
      level: "error",
      message: "before_approval: risks must be documented (## Risks table)",
    });
  }
  if (!planHasValidationSteps(plan)) {
    issues.push({
      level: "error",
      message: "before_approval: validation steps must be documented",
    });
  }
}

function executionGates(
  state: ReturnType<typeof EpicStateSchema.parse>,
  issues: ValidateIssue[],
): void {
  if (state.status === "awaiting_approval" && state.approval.status === "pending") {
    issues.push({
      level: "warn",
      message:
        "before_execution gate: execution blocked until approval (expected until `atelier approve`)",
    });
  }

  if (state.status === "execution") {
    if (state.approval.status !== "approved") {
      issues.push({
        level: "error",
        message: "before_execution: approval.status must be approved",
      });
    }
    if (!state.current_slice) {
      issues.push({
        level: "error",
        message: "before_execution: current_slice required",
      });
    }
  }

  if (state.status === "approved") {
    const ready = state.slices.some((s) => s.status === "ready");
    if (!ready && !state.current_slice) {
      issues.push({
        level: "error",
        message: "before_execution: at least one slice must be ready",
      });
    }
  }
}

function sliceSchemaGates(
  state: ReturnType<typeof EpicStateSchema.parse>,
  issues: ValidateIssue[],
): void {
  const strict =
    state.status === "awaiting_approval" ||
    state.status === "approved" ||
    state.status === "execution" ||
    state.status === "review";
  if (!strict) return;

  for (const sl of state.slices) {
    const r = SliceSchema.safeParse(sl);
    if (!r.success) {
      issues.push({
        level: "error",
        message: `slice ${sl.id}: ${r.error.message}`,
      });
    }
  }
}

async function prematureCodeGuard(
  cwd: string,
  state: ReturnType<typeof EpicStateSchema.parse>,
  issues: ValidateIssue[],
): Promise<void> {
  if (state.status === "execution" && state.approval.status === "approved") {
    return;
  }

  const ref = state.guards.baseline_ref || "HEAD";
  const files = await gitChangedFiles(cwd, ref);
  if (files === null) {
    issues.push({
      level: "warn",
      message: "Git diff unavailable; skipped premature code change detection",
    });
    return;
  }

  const allowed = state.guards.allowed_pre_execution_paths;
  for (const f of files) {
    const ok = allowed.some((g) => pathMatchesGlob(f, g));
    if (!ok) {
      issues.push({
        level: "error",
        message: `Protocol violation: project file changed outside .atelier while status=${state.status}: ${f}`,
      });
    }
  }
}

export async function protocolV2Installed(cwd: string): Promise<boolean> {
  try {
    await access(join(atelierDir(cwd), "atelier.json"));
    return true;
  } catch {
    return false;
  }
}
