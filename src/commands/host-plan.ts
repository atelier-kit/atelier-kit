import pc from "picocolors";
import { refreshAdapter } from "../adapters/index.js";
import { createEpic } from "../protocol/epic.js";
import {
  readActiveEpic,
  readAtelierConfig,
  writeActiveState,
  writeEpicState,
} from "../protocol/state.js";
import { validatePlanReady } from "../protocol/validator.js";
import { exportActivePlan } from "./export-plan.js";

export async function cmdHostPlanStart(cwd: string, goal: string): Promise<void> {
  try {
    const state = await createEpic(cwd, { title: goal, goal, mode: "standard" });
    await refreshAdapter(cwd);
    console.log(
      pc.green(
        `Host plan started for "${goal}" status=${state.status} skill=${state.active_skill}`,
      ),
    );
    console.log(
      pc.dim(
        "Use the host's native plan mode and Atelier skills to fill `.atelier/epics/<epic>/` artifacts.",
      ),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}

export async function cmdHostPlanFinalize(cwd: string): Promise<void> {
  try {
    const { active, state } = await readActiveEpic(cwd);
    if (!active.active || !state) {
      throw new Error("No active Atelier epic to finalize.");
    }
    state.status = "planned";
    state.active_skill = null;
    const errors = await validatePlanReady(cwd, state);
    if (errors.length > 0) {
      state.status = "planning";
      state.active_skill = "planner";
      throw new Error(`Cannot finalize host plan: plan gate failed.\n- ${errors.join("\n- ")}`);
    }
    await writeEpicState(cwd, state);
    await writeActiveState(cwd, {
      active: true,
      mode: "atelier",
      active_epic: state.epic_id,
      active_phase: state.status,
      active_skill: state.active_skill,
      updated_at: new Date().toISOString(),
    });
    const config = await readAtelierConfig(cwd);
    const mirror = await exportActivePlan(cwd, { adapter: config.adapter, ifPlanned: true });
    await refreshAdapter(cwd);
    console.log(
      pc.green(
        `Host plan finalized: ${state.epic_id} status=${state.status}`,
      ),
    );
    console.log(
      pc.dim(`Native plan mirror: ${mirror.path}`),
    );
  } catch (error) {
    console.error(pc.red((error as Error).message));
    process.exitCode = 1;
  }
}
