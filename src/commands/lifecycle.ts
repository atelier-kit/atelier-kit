import pc from "picocolors";
import { readActiveEpic, writeActiveState, writeEpicState } from "../protocol/state.js";
import { inactiveState } from "../protocol/templates.js";
import { firstReadySlice } from "../protocol/epic.js";
import { validateBeforeApproval } from "../protocol/validator.js";
import type { EpicState } from "../protocol/schema.js";

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
  await runLifecycle(cwd, "next slice", (state) => {
    if (state.status !== "execution") {
      throw new Error("`atelier next` is only available during execution.");
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
    next.status = "executing";
    state.current_slice = next.id;
    state.active_skill = "implementer";
  });
}

export async function cmdDone(cwd: string): Promise<void> {
  await runLifecycle(cwd, "done", (state) => {
    if (state.status === "execution" && state.current_slice) {
      const current = state.slices.find((slice) => slice.id === state.current_slice);
      if (current) current.status = "done";
      const next = firstReadySlice(state);
      if (next) {
        next.status = "executing";
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
    throw new Error("`atelier done` requires execution or review state.");
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

export async function cmdOff(cwd: string): Promise<void> {
  await writeActiveState(cwd, inactiveState());
  console.log(pc.green("Atelier disabled; native agent behavior is active."));
}
