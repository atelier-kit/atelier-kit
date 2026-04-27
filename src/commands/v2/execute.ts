import pc from "picocolors";
import { readActiveState, readEpicState, writeEpicState, writeActiveState } from "../../protocol/io.js";

export async function cmdV2Execute(cwd: string): Promise<void> {
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

  if (state.approval.status !== "approved") {
    console.log(
      pc.red(
        `Cannot execute: approval.status is '${state.approval.status}', must be 'approved'.`,
      ),
    );
    console.log(pc.dim("Run `atelier approve` first."));
    process.exitCode = 1;
    return;
  }

  if (state.status !== "approved") {
    console.log(
      pc.yellow(`Epic '${epicId}' is in status '${state.status}', expected 'approved'.`),
    );
    process.exitCode = 1;
    return;
  }

  const firstReady = state.slices.find((s) => s.status === "ready");
  if (!firstReady) {
    console.log(pc.red("No ready slices found. Ensure slices have status=ready."));
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();

  const updated = {
    ...state,
    status: "execution" as const,
    current_slice: firstReady.id,
    active_skill: "implementer",
    allowed_actions: {
      ...state.allowed_actions,
      write_project_code: true,
      run_tests: true,
    },
  };

  await writeEpicState(cwd, epicId, updated);
  await writeActiveState(cwd, {
    ...active,
    active_phase: "execution",
    active_skill: "implementer",
    updated_at: now,
  });

  console.log(pc.green(`Execution started for epic '${epicId}'.`));
  console.log(pc.dim(`  current_slice: ${firstReady.id}`));
  console.log(pc.dim(`  goal:          ${firstReady.goal}`));
  console.log(pc.dim("Project code editing is now allowed."));
}

export async function cmdV2Next(cwd: string): Promise<void> {
  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.red("No active.json found."));
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

  if (state.status !== "execution") {
    console.log(pc.yellow("Not in execution phase. Use `atelier execute` first."));
    process.exitCode = 1;
    return;
  }

  const currentIdx = state.slices.findIndex((s) => s.id === state.current_slice);
  const nextReady = state.slices
    .slice(currentIdx + 1)
    .find((s) => s.status === "ready");

  const now = new Date().toISOString();

  if (!nextReady) {
    const updated = {
      ...state,
      status: "review" as const,
      current_slice: null,
      active_skill: "reviewer",
      allowed_actions: {
        ...state.allowed_actions,
        write_project_code: false,
      },
    };
    await writeEpicState(cwd, epicId, updated);
    await writeActiveState(cwd, {
      ...active,
      active_phase: "review",
      active_skill: "reviewer",
      updated_at: now,
    });
    console.log(pc.cyan("No more ready slices. Moved to review phase."));
    return;
  }

  const updated = {
    ...state,
    current_slice: nextReady.id,
  };

  await writeEpicState(cwd, epicId, updated);
  await writeActiveState(cwd, { ...active, updated_at: now });

  console.log(pc.green(`Next slice: ${nextReady.id}`));
  console.log(pc.dim(`  goal: ${nextReady.goal}`));
}

export async function cmdV2Done(cwd: string): Promise<void> {
  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.red("No active.json found."));
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

  if (state.status !== "execution" || !state.current_slice) {
    console.log(pc.yellow("No current slice in execution. Use `atelier execute` first."));
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();

  const updatedSlices = state.slices.map((s) =>
    s.id === state.current_slice ? { ...s, status: "done" as const } : s,
  );

  const updated = {
    ...state,
    slices: updatedSlices,
  };

  await writeEpicState(cwd, epicId, updated);
  await writeActiveState(cwd, { ...active, updated_at: now });

  console.log(pc.green(`Slice '${state.current_slice}' marked as done.`));
  console.log(pc.dim("Run `atelier next` to move to the next slice or review phase."));
}
