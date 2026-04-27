import pc from "picocolors";
import {
  readActiveJson,
  readEpicState,
  writeActiveJson,
  writeEpicState,
} from "../protocol/store.js";
import { nowIso } from "../protocol/defaults.js";

export async function cmdAtelierApprove(cwd: string): Promise<void> {
  const active = await readActiveJson(cwd);
  if (!active.active || !active.active_epic) {
    console.error(pc.red("No active epic"));
    process.exitCode = 1;
    return;
  }
  const epic = active.active_epic;
  const state = await readEpicState(cwd, epic);
  if (state.status !== "awaiting_approval") {
    console.error(pc.red(`Expected status awaiting_approval, got ${state.status}`));
    process.exitCode = 1;
    return;
  }
  state.approval = {
    status: "approved",
    approved_by: "human",
    approved_at: nowIso(),
    notes: null,
  };
  state.status = "approved";
  state.allowed_actions.write_project_code = false;
  await writeEpicState(cwd, epic, state);
  active.updated_at = nowIso();
  await writeActiveJson(cwd, active);
  console.log(pc.green("Plan approved. Run `atelier execute` to start execution."));
}

export async function cmdAtelierReject(cwd: string, reason: string): Promise<void> {
  const active = await readActiveJson(cwd);
  if (!active.active || !active.active_epic) {
    console.error(pc.red("No active epic"));
    process.exitCode = 1;
    return;
  }
  const epic = active.active_epic;
  const state = await readEpicState(cwd, epic);
  state.approval = {
    status: "rejected",
    approved_by: null,
    approved_at: null,
    notes: reason,
  };
  state.status = "planning";
  state.allowed_actions.write_project_code = false;
  await writeEpicState(cwd, epic, state);
  active.active_skill = "planner";
  active.active_phase = "planning";
  active.updated_at = nowIso();
  await writeActiveJson(cwd, active);
  console.log(pc.yellow("Plan rejected; returned to planning."));
}

export async function cmdAtelierExecute(cwd: string): Promise<void> {
  const active = await readActiveJson(cwd);
  if (!active.active || !active.active_epic) {
    console.error(pc.red("No active epic"));
    process.exitCode = 1;
    return;
  }
  const epic = active.active_epic;
  const state = await readEpicState(cwd, epic);
  if (state.approval.status !== "approved" || state.status !== "approved") {
    console.error(pc.red("Approve the plan first (`atelier approve`)."));
    process.exitCode = 1;
    return;
  }
  const ready = state.slices.find((s) => s.status === "ready");
  if (!ready) {
    console.error(pc.red("No slice with status ready. Add slices to state.json or mark one ready."));
    process.exitCode = 1;
    return;
  }
  state.status = "execution";
  state.current_slice = { ...ready, status: "executing" };
  state.slices = state.slices.map((s) =>
    s.id === ready.id ? { ...s, status: "executing" as const } : s,
  );
  state.allowed_actions.write_project_code = true;
  state.allowed_actions.run_tests = true;
  state.active_skill = "implementer";
  await writeEpicState(cwd, epic, state);
  active.active_phase = "execution";
  active.active_skill = "implementer";
  active.updated_at = nowIso();
  await writeActiveJson(cwd, active);
  console.log(pc.green(`Executing slice: ${ready.id}`));
}

export async function cmdAtelierNext(cwd: string): Promise<void> {
  const active = await readActiveJson(cwd);
  if (!active.active || !active.active_epic) {
    console.error(pc.red("No active epic"));
    process.exitCode = 1;
    return;
  }
  const epic = active.active_epic;
  const state = await readEpicState(cwd, epic);
  if (state.status !== "execution" || !state.current_slice) {
    console.error(pc.red("Not in execution with an active slice."));
    process.exitCode = 1;
    return;
  }
  const curId = state.current_slice.id;
  const idx = state.slices.findIndex((s) => s.id === curId);
  const next = state.slices.slice(idx + 1).find((s) => s.status === "ready");
  if (!next) {
    console.log(pc.yellow("No further ready slices."));
    return;
  }
  state.current_slice = { ...next, status: "executing" };
  state.slices = state.slices.map((s) =>
    s.id === next.id ? { ...s, status: "executing" as const } : s,
  );
  await writeEpicState(cwd, epic, state);
  active.updated_at = nowIso();
  await writeActiveJson(cwd, active);
  console.log(pc.green(`Focused slice: ${next.id}`));
}

export async function cmdAtelierDone(cwd: string): Promise<void> {
  const active = await readActiveJson(cwd);
  if (!active.active || !active.active_epic) {
    console.error(pc.red("No active epic"));
    process.exitCode = 1;
    return;
  }
  const epic = active.active_epic;
  const state = await readEpicState(cwd, epic);
  if (!state.current_slice) {
    console.error(pc.red("No current slice"));
    process.exitCode = 1;
    return;
  }
  const id = state.current_slice.id;
  state.slices = state.slices.map((s) =>
    s.id === id ? { ...s, status: "done" as const } : s,
  );
  state.current_slice = null;
  const more = state.slices.some((s) => s.status === "ready" || s.status === "executing");
  if (!more) {
    state.status = "review";
    state.allowed_actions.write_project_code = false;
    state.active_skill = "reviewer";
    active.active_phase = "review";
    active.active_skill = "reviewer";
  }
  await writeEpicState(cwd, epic, state);
  active.updated_at = nowIso();
  await writeActiveJson(cwd, active);
  console.log(pc.green(`Slice ${id} marked done.`));
}

export async function cmdAtelierPause(cwd: string): Promise<void> {
  const active = await readActiveJson(cwd);
  if (!active.active_epic) {
    console.error(pc.red("No epic to pause"));
    process.exitCode = 1;
    return;
  }
  const epic = active.active_epic;
  const state = await readEpicState(cwd, epic);
  state.status = "paused";
  state.allowed_actions.write_project_code = false;
  await writeEpicState(cwd, epic, state);
  active.active = false;
  active.mode = "native";
  active.active_phase = "paused";
  active.active_skill = null;
  active.updated_at = nowIso();
  await writeActiveJson(cwd, active);
  console.log(pc.yellow("Atelier paused (active=false). active_epic preserved for resume."));
}

export async function cmdAtelierOff(cwd: string): Promise<void> {
  const { inactiveActiveJson } = await import("../protocol/defaults.js");
  await writeActiveJson(cwd, inactiveActiveJson());
  console.log(pc.green("Atelier deactivated."));
}
