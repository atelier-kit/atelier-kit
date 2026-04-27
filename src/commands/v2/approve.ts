import pc from "picocolors";
import { readActiveState, readEpicState, writeEpicState, writeActiveState } from "../../protocol/io.js";

export async function cmdV2Approve(cwd: string): Promise<void> {
  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.red("No active.json found. Run `atelier init` first."));
    process.exitCode = 1;
    return;
  }

  if (!active.active || !active.active_epic) {
    console.log(pc.yellow("No active epic. Start one with `atelier new`."));
    process.exitCode = 1;
    return;
  }

  const epicId = active.active_epic;
  let state;
  try {
    state = await readEpicState(cwd, epicId);
  } catch {
    console.log(pc.red(`Could not read state for epic '${epicId}'.`));
    process.exitCode = 1;
    return;
  }

  if (state.status !== "awaiting_approval") {
    console.log(pc.yellow(`Epic '${epicId}' is in status '${state.status}', not 'awaiting_approval'.`));
    console.log(pc.dim("Move the epic to awaiting_approval first."));
    process.exitCode = 1;
    return;
  }

  if (state.slices.length === 0) {
    console.log(pc.red("Cannot approve: plan has no slices."));
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();

  const updated = {
    ...state,
    status: "approved" as const,
    approval: {
      ...state.approval,
      status: "approved" as const,
      approved_at: now,
      notes: null,
    },
  };

  await writeEpicState(cwd, epicId, updated);
  await writeActiveState(cwd, {
    ...active,
    active_phase: "approved",
    updated_at: now,
  });

  console.log(pc.green(`Plan approved for epic '${epicId}'.`));
  console.log(pc.dim("Run `atelier execute` to start execution."));
}

export async function cmdV2Reject(cwd: string, reason: string): Promise<void> {
  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.red("No active.json found. Run `atelier init` first."));
    process.exitCode = 1;
    return;
  }

  if (!active.active || !active.active_epic) {
    console.log(pc.yellow("No active epic."));
    process.exitCode = 1;
    return;
  }

  const epicId = active.active_epic;
  let state;
  try {
    state = await readEpicState(cwd, epicId);
  } catch {
    console.log(pc.red(`Could not read state for epic '${epicId}'.`));
    process.exitCode = 1;
    return;
  }

  if (state.status !== "awaiting_approval") {
    console.log(pc.yellow(`Epic '${epicId}' is in status '${state.status}', not 'awaiting_approval'.`));
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();

  const updated = {
    ...state,
    status: "planning" as const,
    approval: {
      ...state.approval,
      status: "rejected" as const,
      notes: reason,
    },
  };

  await writeEpicState(cwd, epicId, updated);
  await writeActiveState(cwd, {
    ...active,
    active_phase: "planning",
    updated_at: now,
  });

  console.log(pc.yellow(`Plan rejected for epic '${epicId}'.`));
  console.log(pc.dim(`Reason: ${reason}`));
  console.log(pc.dim("Returned to planning phase."));
}
