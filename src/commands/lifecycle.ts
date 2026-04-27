import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readActiveEpic, readActiveState, readEpicState, writeActiveState, writeEpicState } from "../protocol/state.js";
import { epicDir } from "../protocol/paths.js";
import { inactiveState } from "../protocol/templates.js";
import { firstReadySlice } from "../protocol/epic.js";
import { validateBeforeApproval } from "../protocol/validator.js";
import type { AtelierStatus, EpicState, ProtocolSlice, SkillName } from "../protocol/schema.js";

type ProtocolTask = EpicState["tasks"][number];

function inferResumeState(state: EpicState): { status: AtelierStatus; skill: SkillName } {
  if (state.approval.status === "approved") {
    const hasReadyOrActive = state.slices.some(
      (s) => s.status === "ready" || s.status === "executing",
    );
    if (hasReadyOrActive || state.current_slice) {
      return { status: "execution", skill: "implementer" };
    }
    return { status: "review", skill: "reviewer" };
  }
  if (state.approval.status === "pending" && state.slices.length > 0) {
    return { status: "awaiting_approval", skill: "planner" };
  }
  return { status: "planning", skill: "planner" };
}

async function loadRequiredActive(cwd: string): Promise<EpicState> {
  const activeEpic = await readActiveEpic(cwd);
  if (!activeEpic.state) {
    throw new Error("No active Atelier epic. Use `atelier new \"Goal\"` first.");
  }
  return activeEpic.state;
}

async function syncActive(cwd: string, state: EpicState) {
  await writeActiveState(cwd, {
    active: true,
    mode: "atelier",
    active_epic: state.epic_id,
    active_phase: state.status,
    active_skill: state.active_skill,
    updated_at: new Date().toISOString(),
  });
}

async function runLifecycle(
  cwd: string,
  action: string,
  mutate: (state: EpicState) => void | Promise<void>,
): Promise<void> {
  try {
    const state = await loadRequiredActive(cwd);
    await mutate(state);
    await writeEpicState(cwd, state);
    await syncActive(cwd, state);
    console.log(pc.green(`${action}: ${state.epic_id} status=${state.status}`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

function taskSkill(task: ProtocolTask): SkillName {
  switch (task.type) {
    case "questions":
      return "questioner";
    case "repo":
      return "repo-analyst";
    case "tech":
      return "tech-analyst";
    case "business":
      return "business-analyst";
    case "design":
      return "designer";
    case "implementation":
      return "implementer";
    case "review":
      return "reviewer";
    case "synthesis":
    case "planning":
      return "planner";
  }
}

function taskStatus(task: ProtocolTask): AtelierStatus {
  switch (task.type) {
    case "questions":
    case "repo":
    case "tech":
    case "business":
      return "discovery";
    case "synthesis":
      return "synthesis";
    case "design":
      return "design";
    case "planning":
      return "planning";
    case "implementation":
      return "execution";
    case "review":
      return "review";
  }
}

function focusTask(state: EpicState, task: ProtocolTask): void {
  task.status = "in_progress";
  state.status = taskStatus(task);
  state.active_skill = taskSkill(task);
  state.current_slice = null;
  state.allowed_actions.write_project_code = false;
  state.allowed_actions.run_tests = false;
}

function currentPlanningTask(state: EpicState): ProtocolTask | null {
  const active = state.tasks.find((task) => task.status === "in_progress");
  if (active) return active;
  return state.tasks.find((task) => {
    if (task.status !== "pending") return false;
    return taskStatus(task) === state.status && taskSkill(task) === state.active_skill;
  }) ?? null;
}

function nextPlanningTask(state: EpicState): ProtocolTask | null {
  return state.tasks.find((task) => task.status === "pending") ?? null;
}

function normalizeExecutingSlice(slice: ProtocolSlice): void {
  slice.status = "executing";
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

async function assertTaskArtifactComplete(cwd: string, state: EpicState, task: ProtocolTask): Promise<void> {
  const artifacts = task.type === "design"
    ? ["decisions.md", "design.md"]
    : [task.artifact];
  const pending: string[] = [];
  for (const artifact of artifacts) {
    const content = await readFile(join(epicDir(cwd, state.epic_id), artifact), "utf8")
      .catch(() => "");
    if (!content || artifactLooksPending(content)) pending.push(artifact);
    if (task.type === "questions" && questionsLookGenericOnly(content)) {
      pending.push(`${artifact} is still generic`);
    }
  }
  if (pending.length > 0) {
    throw new Error(`Cannot mark ${task.id} done; artifact is incomplete: ${pending.join(", ")}`);
  }
}

export async function cmdApprove(
  cwd: string,
  opts: { by?: string; notes?: string } = {},
): Promise<void> {
  await runLifecycle(cwd, "approved", async (state) => {
    const errors = await validateBeforeApproval(cwd, state);
    if (errors.length > 0) {
      throw new Error(`Cannot approve plan: before_approval gate failed.\n- ${errors.join("\n- ")}`);
    }
    state.approval = {
      status: "approved",
      approved_by: opts.by ?? "human",
      approved_at: new Date().toISOString(),
      notes: opts.notes ?? null,
    };
    state.status = "approved";
    state.active_skill = null;
    state.allowed_actions.write_project_code = false;
    state.allowed_actions.run_tests = false;
  });
}

export async function cmdReject(cwd: string, reason: string): Promise<void> {
  await runLifecycle(cwd, "rejected", (state) => {
    state.approval = {
      status: "rejected",
      approved_by: null,
      approved_at: null,
      notes: reason,
    };
    state.status = "planning";
    state.active_skill = "planner";
    state.allowed_actions.write_project_code = false;
    state.allowed_actions.run_tests = false;
  });
}

export async function cmdExecute(cwd: string): Promise<void> {
  await runLifecycle(cwd, "execution started", (state) => {
    if (state.approval.status !== "approved") {
      throw new Error("Execution requires approval.status=approved.");
    }
    const slice = firstReadySlice(state);
    if (!slice) {
      throw new Error("Execution requires at least one ready slice.");
    }
    slice.status = "executing";
    state.current_slice = slice.id;
    state.status = "execution";
    state.active_skill = "implementer";
    state.allowed_actions.write_project_code = true;
    state.allowed_actions.run_tests = true;
  });
}

export async function cmdNext(cwd: string): Promise<void> {
  await runLifecycle(cwd, "next", (state) => {
    if (state.status !== "execution") {
      const next = nextPlanningTask(state);
      if (!next) {
        if (state.status === "awaiting_approval") {
          throw new Error("Plan is awaiting approval. Use `atelier approve` or `atelier reject`.");
        }
        state.status = "planning";
        state.active_skill = "planner";
        return;
      }
      focusTask(state, next);
      return;
    }
    const current = state.slices.find((slice) => slice.id === state.current_slice);
    if (current && current.status === "executing") current.status = "needs-review";
    const next = firstReadySlice(state);
    if (!next) {
      state.status = "review";
      state.active_skill = "reviewer";
      state.current_slice = null;
      state.allowed_actions.write_project_code = false;
      state.allowed_actions.run_tests = true;
      return;
    }
    normalizeExecutingSlice(next);
    state.current_slice = next.id;
    state.active_skill = "implementer";
  });
}

export async function cmdDone(cwd: string): Promise<void> {
  await runLifecycle(cwd, "done", async (state) => {
    if (state.status === "execution" && state.current_slice) {
      const current = state.slices.find((slice) => slice.id === state.current_slice);
      if (current) current.status = "done";
      const next = firstReadySlice(state);
      if (next) {
        normalizeExecutingSlice(next);
        state.current_slice = next.id;
        state.status = "execution";
        state.active_skill = "implementer";
      } else {
        state.current_slice = null;
        state.status = "review";
        state.active_skill = "reviewer";
        state.allowed_actions.write_project_code = false;
      }
      return;
    }
    if (state.status === "review") {
      state.status = "done";
      state.active_skill = null;
      state.allowed_actions.write_project_code = false;
      state.allowed_actions.run_tests = false;
      return;
    }
    if (state.status !== "approved" && state.status !== "awaiting_approval") {
      const current = currentPlanningTask(state);
      if (!current) {
        throw new Error("No active planning task. Use `atelier next` to focus the next task.");
      }
      await assertTaskArtifactComplete(cwd, state, current);
      current.status = "done";
      if (current.type === "planning") {
        state.status = "awaiting_approval";
        state.active_skill = "planner";
        state.approval.status = "pending";
        const errors = await validateBeforeApproval(cwd, state);
        if (errors.length > 0) {
          state.status = "planning";
          state.active_skill = "planner";
          state.approval.status = "none";
          current.status = "in_progress";
          throw new Error(`Cannot finish planning: before_approval gate failed.\n- ${errors.join("\n- ")}`);
        }
        return;
      }
      const next = nextPlanningTask(state);
      if (next) {
        focusTask(state, next);
      } else {
        state.status = "planning";
        state.active_skill = "planner";
      }
      return;
    }
    throw new Error("`atelier done` cannot run while awaiting approval or approved.");
  });
}

export async function cmdPause(cwd: string): Promise<void> {
  try {
    const state = await loadRequiredActive(cwd);
    state.status = "paused";
    state.active_skill = null;
    state.allowed_actions.write_project_code = false;
    await writeEpicState(cwd, state);
    await writeActiveState(cwd, {
      active: false,
      mode: "native",
      active_epic: state.epic_id,
      active_phase: "paused",
      active_skill: null,
      updated_at: new Date().toISOString(),
    });
    console.log(pc.green(`paused: ${state.epic_id}`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdResume(cwd: string): Promise<void> {
  try {
    const active = await readActiveState(cwd);
    if (!active.active_epic) {
      throw new Error("No paused epic to resume. Use `atelier new \"<goal>\"` to start one.");
    }
    const state = await readEpicState(cwd, active.active_epic);
    if (state.status !== "paused") {
      throw new Error(`Epic ${state.epic_id} is not paused (status=${state.status}).`);
    }
    const { status, skill } = inferResumeState(state);
    state.status = status;
    state.active_skill = skill;
    await writeEpicState(cwd, state);
    await writeActiveState(cwd, {
      active: true,
      mode: "atelier",
      active_epic: state.epic_id,
      active_phase: state.status,
      active_skill: state.active_skill,
      updated_at: new Date().toISOString(),
    });
    console.log(pc.green(`Resumed Atelier epic: ${state.epic_id}`));
    console.log(pc.dim(`Status: ${state.status}`));
    console.log(pc.dim(`Active skill: ${state.active_skill}`));
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdOff(cwd: string): Promise<void> {
  await writeActiveState(cwd, inactiveState());
  console.log(pc.green("Atelier disabled; native agent behavior is active."));
}
