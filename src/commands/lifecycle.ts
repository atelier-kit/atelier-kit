import pc from "picocolors";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { readActiveEpic, readAtelierConfig, writeActiveState, writeEpicState } from "../protocol/state.js";
import { epicDir } from "../protocol/paths.js";
import { inactiveState } from "../protocol/templates.js";
import { validatePlanReady } from "../protocol/validator.js";
import { exportActivePlan } from "./export-plan.js";
import { refreshFallbackAdapters } from "../adapters/index.js";
import type { AtelierStatus, EpicState, SkillName } from "../protocol/schema.js";

type ProtocolTask = EpicState["tasks"][number];

async function loadRequiredActive(cwd: string): Promise<EpicState> {
  const activeEpic = await readActiveEpic(cwd);
  if (!activeEpic.state) {
    throw new Error("No active Atelier epic. Use `atelier new \"Goal\"` first.");
  }
  return activeEpic.state;
}

async function syncActive(cwd: string, state: EpicState): Promise<void> {
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
): Promise<boolean> {
  try {
    const state = await loadRequiredActive(cwd);
    await mutate(state);
    await writeEpicState(cwd, state);
    await syncActive(cwd, state);
    console.log(pc.green(`${action}: ${state.epic_id} status=${state.status}`));
    return true;
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
    return false;
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

export async function cmdNext(cwd: string): Promise<void> {
  const ok = await runLifecycle(cwd, "next", (state) => {
    if (state.status === "planned") {
      throw new Error("Plan is already exported. Let the native agent implement it, then run `atelier review`.");
    }
    const next = nextPlanningTask(state);
    if (!next) {
      state.status = "planning";
      state.active_skill = "planner";
      return;
    }
    focusTask(state, next);
  });
  if (ok) await refreshFallbackAdapters(cwd).catch(() => {});
}

export async function cmdDone(cwd: string): Promise<void> {
  let shouldExportPlan = false;
  const ok = await runLifecycle(cwd, "done", async (state) => {
    if (state.status === "review") {
      state.status = "done";
      state.active_skill = null;
      return;
    }
    if (state.status === "planned") {
      throw new Error("Plan is already exported. Let the native agent implement it, then run `atelier review`.");
    }
    const current = currentPlanningTask(state);
    if (!current) {
      throw new Error("No active planning task. Use `atelier next` to focus the next task.");
    }
    await assertTaskArtifactComplete(cwd, state, current);
    current.status = "done";
    if (current.type === "planning") {
      state.status = "planned";
      state.active_skill = null;
      const errors = await validatePlanReady(cwd, state);
      if (errors.length > 0) {
        state.status = "planning";
        state.active_skill = "planner";
        current.status = "in_progress";
        throw new Error(`Cannot finish planning: plan gate failed.\n- ${errors.join("\n- ")}`);
      }
      shouldExportPlan = true;
      return;
    }
    const next = nextPlanningTask(state);
    if (next) {
      focusTask(state, next);
    } else {
      state.status = "planning";
      state.active_skill = "planner";
    }
  });
  if (!ok) return;
  if (shouldExportPlan) {
    try {
      const config = await readAtelierConfig(cwd);
      const { path } = await exportActivePlan(cwd, { adapter: config.adapter, ifPlanned: true });
      console.log(pc.dim(`Plan mirror exported: ${path}`));
    } catch (error) {
      console.error(pc.red(`Plan mirror export failed: ${(error as Error).message}`));
      process.exitCode = 1;
    }
  }
  await refreshFallbackAdapters(cwd).catch(() => {});
}

export async function cmdOff(cwd: string): Promise<void> {
  await writeActiveState(cwd, inactiveState());
  await refreshFallbackAdapters(cwd).catch(() => {});
  console.log(pc.green("Atelier disabled; native agent behavior is active."));
}
