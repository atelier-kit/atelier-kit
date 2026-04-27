import pc from "picocolors";
import { readActiveState, writeActiveState } from "../../protocol/io.js";

export async function cmdV2Pause(cwd: string): Promise<void> {
  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.red("No active.json found. Run `atelier init` first."));
    process.exitCode = 1;
    return;
  }

  if (!active.active) {
    console.log(pc.dim("Atelier is already inactive."));
    return;
  }

  const now = new Date().toISOString();
  await writeActiveState(cwd, {
    ...active,
    mode: "native",
    active_phase: "paused",
    updated_at: now,
  });

  console.log(pc.yellow("Atelier paused. The active epic is preserved."));
  console.log(pc.dim("Run `atelier status` to check the current state."));
}

export async function cmdV2Off(cwd: string): Promise<void> {
  let active;
  try {
    active = await readActiveState(cwd);
  } catch {
    console.log(pc.red("No active.json found. Run `atelier init` first."));
    process.exitCode = 1;
    return;
  }

  if (!active.active) {
    console.log(pc.dim("Atelier is already inactive (native mode)."));
    return;
  }

  const now = new Date().toISOString();
  await writeActiveState(cwd, {
    active: false,
    mode: "native",
    active_epic: null,
    active_phase: null,
    active_skill: null,
    updated_at: now,
  });

  console.log(pc.yellow("Atelier deactivated. All native agent behavior restored."));
  console.log(pc.dim("Epic data preserved in .atelier/epics/."));
}
